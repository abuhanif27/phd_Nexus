import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/features/auth/store';
import { apiClient } from '@/lib/api/axios';
import { env } from '@/env';
import { useSearchParams } from 'next/navigation';

interface Message {
  id: number;
  conversation: number;
  sender: number;
  sender_email: string;
  sender_name?: string;
  content: string;
  timestamp: string;
  is_read: boolean;
}

interface Conversation {
  id: number;
  participants: Array<{ id: number; email: string; role: string; full_name?: string }>;
  last_message: Message | null;
  unread_count: number;
  updated_at: string;
}

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  onlineUsers: Set<number>;
  setActiveConversation: (conv: Conversation | null) => void;
  sendMessage: (content: string) => void;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: number) => Promise<void>;
  fetchMoreMessages: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, accessToken: token } = useAuthStore();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const socketRef = useRef<WebSocket | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const response = await apiClient.get('/api/chat/conversations/');
      const data: any = response.data;
      const results = data.results || data;
      if (Array.isArray(results)) {
        setConversations(results);
        
        // Auto-select based on query param
        const convId = searchParams?.get('id');
        const userId = searchParams?.get('user');
        
        if (convId) {
          const found = results.find(c => c.id === Number(convId));
          if (found) {
            setActiveConversation(found);
            // Fetch messages for it
            const msgResponse = await apiClient.get(`/api/chat/conversations/${found.id}/messages/`);
            const msgData: any = msgResponse.data;
            setMessages(msgData.results?.reverse() || msgData.reverse() || []);
            setNextPage(msgData.next || null);
          }
        } else if (userId) {
          const found = results.find(c => c.participants.some((p: any) => p.id === Number(userId)));
          if (found) {
            setActiveConversation(found);
            const msgResponse = await apiClient.get(`/api/chat/conversations/${found.id}/messages/`);
            const msgData: any = msgResponse.data;
            setMessages(msgData.results?.reverse() || msgData.reverse() || []);
            setNextPage(msgData.next || null);
          }
        }
      } else {
        console.error('Conversations data is not an array:', results);
        setConversations([]);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      setConversations([]);
    }
  }, [token, searchParams]);

  const fetchMessages = useCallback(async (conversationId: number) => {
    if (!token) return;
    try {
      const response = await apiClient.get(`/api/chat/conversations/${conversationId}/messages/`);
      const data: any = response.data;
      setMessages(data.results?.reverse() || data.reverse() || []);
      setNextPage(data.next || null);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }, [token]);

  const fetchMoreMessages = useCallback(async () => {
    if (!token || !nextPage) return;
    try {
      const response = await apiClient.get(nextPage);
      const data: any = response.data;
      const olderMessages = data.results?.reverse() || [];
      setMessages((prev) => [...olderMessages, ...prev]);
      setNextPage(data.next || null);
    } catch (error) {
      console.error('Failed to fetch more messages:', error);
    }
  }, [token, nextPage]);

  useEffect(() => {
    if (user && token) {
      fetchConversations();
      
      let socket: WebSocket | null = null;
      let reconnectTimer: NodeJS.Timeout;

      const connect = () => {
        let baseUrl = env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
        baseUrl = baseUrl.replace(/\/+$/, '');
        
        // If we are on a network IP but API is localhost, adjust automatically
        if (typeof window !== 'undefined') {
          const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          const apiIsLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
          
          if (!isLocalhost && apiIsLocalhost) {
            baseUrl = `http://${window.location.hostname}:8000`;
            console.log('Adjusted API Base URL for network access:', baseUrl);
          }
        }

        const wsUrlBase = baseUrl.replace('http', 'ws');
        const wsUrl = `${wsUrlBase}/ws/chat/?token=${token}`;
        
        console.log('Connecting to WebSocket:', wsUrl);
        socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          console.log('WebSocket Connected');
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'status_update') {
              setOnlineUsers((prev) => {
                const next = new Set(prev);
                if (data.status === 'online') next.add(data.user_id);
                else next.delete(data.user_id);
                return next;
              });
            } else if (data.type === 'new_message') {
              const newMessage = data.message;
              
              setActiveConversation((currentActive) => {
                if (currentActive?.id === newMessage.conversation) {
                  setMessages((prev) => {
                    if (prev.some(m => m.id === newMessage.id)) return prev;
                    return [...prev, newMessage];
                  });
                }
                return currentActive;
              });

              setConversations((prev) => {
                if (!Array.isArray(prev)) return [];
                const exists = prev.some(c => c.id === newMessage.conversation);
                if (!exists) {
                  // If it's a new conversation from someone else, we might need to fetch it
                  fetchConversations();
                  return prev;
                }
                return prev.map(c => c.id === newMessage.conversation 
                  ? { ...c, last_message: newMessage, updated_at: newMessage.timestamp } 
                  : c
                ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
              });
            }
          } catch (e) {
            console.error('Failed to parse WS message:', e);
          }
        };

        socket.onclose = (e) => {
          console.log('WebSocket Disconnected:', {
            code: e.code,
            reason: e.reason,
            wasClean: e.wasClean
          });
          socketRef.current = null;
          // Reconnect after 3 seconds
          reconnectTimer = setTimeout(connect, 3000);
        };

        socket.onerror = (err) => {
          console.error('WebSocket Error URL:', socket?.url);
          console.error('WebSocket Error ReadyState:', socket?.readyState);
          console.error('WebSocket Error Event:', err);
          
          if (socket?.readyState !== WebSocket.CLOSED && socket?.readyState !== WebSocket.CLOSING) {
            socket?.close();
          }
        };
      };

      connect();

      return () => {
        if (socket) socket.close();
        clearTimeout(reconnectTimer);
      };
    }
  }, [user, token, fetchConversations]);

  const sendMessage = (content: string) => {
    if (activeConversation && content.trim()) {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'chat_message',
          conversation_id: activeConversation.id,
          content: content.trim(),
        }));
      } else {
        console.error('Cannot send message: WebSocket is not open');
        // Fallback or retry?
      }
    }
  };

  return (
    <ChatContext.Provider value={{
      conversations,
      activeConversation,
      messages,
      onlineUsers,
      setActiveConversation,
      sendMessage,
      fetchConversations,
      fetchMessages,
      fetchMoreMessages,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

