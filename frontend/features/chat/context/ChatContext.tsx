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
  const wsConnected = useRef(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const activeConvRef = useRef<Conversation | null>(null);

  // Keep ref in sync with state
  useEffect(() => { activeConvRef.current = activeConversation; }, [activeConversation]);

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const response = await apiClient.get('/api/chat/conversations/');
      const data: any = response.data;
      const results = data.results || data;
      if (Array.isArray(results)) {
        setConversations(results);
        
        const convId = searchParams?.get('id');
        const userId = searchParams?.get('user');
        
        if (convId) {
          const found = results.find((c: Conversation) => c.id === Number(convId));
          if (found) {
            setActiveConversation(found);
            const msgResponse = await apiClient.get(`/api/chat/conversations/${found.id}/messages/`);
            const msgData: any = msgResponse.data;
            setMessages(msgData.results?.reverse() || (Array.isArray(msgData) ? msgData.reverse() : []));
            setNextPage(msgData.next || null);
            apiClient.post(`/api/chat/conversations/${found.id}/mark_as_read/`).catch(() => {});
            window.dispatchEvent(new Event('chat:read'));
          }
        } else if (userId) {
          const found = results.find((c: Conversation) => c.participants.some((p: any) => p.id === Number(userId)));
          if (found) {
            setActiveConversation(found);
            const msgResponse = await apiClient.get(`/api/chat/conversations/${found.id}/messages/`);
            const msgData: any = msgResponse.data;
            setMessages(msgData.results?.reverse() || (Array.isArray(msgData) ? msgData.reverse() : []));
            setNextPage(msgData.next || null);
            apiClient.post(`/api/chat/conversations/${found.id}/mark_as_read/`).catch(() => {});
            window.dispatchEvent(new Event('chat:read'));
          }
        }
      } else {
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
      setMessages(data.results?.reverse() || (Array.isArray(data) ? data.reverse() : []));
      setNextPage(data.next || null);
      // Mark messages as read
      apiClient.post(`/api/chat/conversations/${conversationId}/mark_as_read/`).catch(() => {});
      window.dispatchEvent(new Event('chat:read'));
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

  // Poll for new messages when WebSocket is not connected
  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      if (wsConnected.current) return; // WS reconnected, skip polling
      const conv = activeConvRef.current;
      if (!conv || !token) return;
      try {
        const response = await apiClient.get(`/api/chat/conversations/${conv.id}/messages/`);
        const data: any = response.data;
        const fetched: Message[] = data.results?.reverse() || (Array.isArray(data) ? data.reverse() : []);
        setMessages((prev) => {
          if (fetched.length === 0) return prev;
          // Merge: keep any messages not in fetched, add new ones
          const ids = new Set(prev.map(m => m.id));
          const newMsgs = fetched.filter(m => !ids.has(m.id));
          if (newMsgs.length === 0) return prev;
          return [...prev, ...newMsgs];
        });
      } catch { /* ignore polling errors */ }
    }, 3000);
  }, [token]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!user || !token) return;

    fetchConversations();

    let socket: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;

    const connect = () => {
      let baseUrl = env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      baseUrl = baseUrl.replace(/\/+$/, '');

      if (typeof window !== 'undefined') {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const apiIsLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
        if (!isLocalhost && apiIsLocalhost) {
          baseUrl = `http://${window.location.hostname}:8000`;
        }
      }

      const wsUrlBase = baseUrl.replace('http', 'ws');
      const wsUrl = `${wsUrlBase}/ws/chat/?token=${token}`;

      try {
        socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          wsConnected.current = true;
          reconnectAttempts = 0;
          stopPolling();
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

        socket.onclose = () => {
          wsConnected.current = false;
          socketRef.current = null;
          // Start polling as fallback
          startPolling();
          // Attempt reconnect with backoff
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            const delay = Math.min(3000 * reconnectAttempts, 15000);
            reconnectTimer = setTimeout(connect, delay);
          }
        };

        socket.onerror = () => {
          // Will trigger onclose, which handles fallback
          if (socket?.readyState !== WebSocket.CLOSED && socket?.readyState !== WebSocket.CLOSING) {
            socket?.close();
          }
        };
      } catch {
        // WebSocket constructor failed (e.g. invalid URL)
        wsConnected.current = false;
        startPolling();
      }
    };

    connect();

    return () => {
      if (socket) socket.close();
      clearTimeout(reconnectTimer);
      stopPolling();
    };
  }, [user, token, fetchConversations, startPolling, stopPolling]);

  // Send message via WebSocket or HTTP fallback
  const sendMessage = useCallback((content: string) => {
    if (!activeConversation || !content.trim()) return;

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'chat_message',
        conversation_id: activeConversation.id,
        content: content.trim(),
      }));
    } else {
      // HTTP fallback
      apiClient.post(`/api/chat/conversations/${activeConversation.id}/send/`, {
        content: content.trim(),
      }).then((response) => {
        const newMessage = response.data;
        setMessages((prev) => {
          if (prev.some(m => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
        setConversations((prev) =>
          prev.map(c => c.id === activeConversation.id
            ? { ...c, last_message: newMessage, updated_at: newMessage.timestamp }
            : c
          ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        );
      }).catch((err) => {
        console.error('Failed to send message:', err);
      });
    }
  }, [activeConversation]);

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
