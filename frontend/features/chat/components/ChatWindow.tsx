'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuthStore } from '@/features/auth/store';
import { MessageBubble } from './MessageBubble';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

export const ChatWindow: React.FC = () => {
  const { activeConversation, messages, sendMessage, onlineUsers, fetchMoreMessages } = useChat();
  const { user } = useAuthStore();
  const [content, setContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  useEffect(() => {
    if (scrollRef.current && !hasScrolledToBottom) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setHasScrolledToBottom(true);
    } else if (scrollRef.current) {
      // If we are already at the bottom, stay at the bottom when new messages arrive
      const isAtBottom = scrollRef.current.scrollHeight - scrollRef.current.scrollTop <= scrollRef.current.clientHeight + 100;
      if (isAtBottom) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [messages, hasScrolledToBottom]);

  // Reset scroll state when conversation changes
  useEffect(() => {
    setHasScrolledToBottom(false);
  }, [activeConversation?.id]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      sendMessage(content);
      setContent('');
    }
  };

  if (!activeConversation) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/20">
        <p className="text-muted-foreground">Select a conversation to start chatting</p>
      </div>
    );
  }

  const otherParticipant = activeConversation.participants.find((p: any) => p.id !== user?.id);
  const isOnline = otherParticipant ? onlineUsers.has(otherParticipant.id) : false;

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center p-4 border-b shadow-sm">
        <div className="relative mr-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold">
            {(otherParticipant?.full_name || otherParticipant?.email || "?")[0].toUpperCase()}
          </div>
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
          )}
        </div>
        <div>
          <h3 className="font-semibold text-sm">{otherParticipant?.full_name || otherParticipant?.email}</h3>
          <p className="text-[10px] text-muted-foreground">
            {isOnline ? "Active now" : "Offline"}
          </p>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto space-y-2 scroll-smooth"
      >
        <div className="flex justify-center py-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-[10px] h-6"
            onClick={fetchMoreMessages}
          >
            Load older messages
          </Button>
        </div>
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            content={msg.content}
            timestamp={msg.timestamp}
            isMe={msg.sender === user?.id}
            senderEmail={msg.sender_name || msg.sender_email}
          />
        ))}
      </div>

      <form onSubmit={handleSend} className="p-4 border-t flex space-x-2">
        <Input
          placeholder="Type a message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={!content.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
};
