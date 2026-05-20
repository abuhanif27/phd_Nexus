'use client';

import React from 'react';
import { useChat } from '../context/ChatContext';
import { useAuthStore } from '@/features/auth/store';
import { cn } from '@/lib/utils/cn';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export const ConversationList: React.FC = () => {
  const { conversations, activeConversation, setActiveConversation, onlineUsers, fetchMessages } = useChat();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSelect = (conv: any) => {
    setActiveConversation(conv);
    fetchMessages(conv.id);
  };

  const filteredConversations = React.useMemo(() => {
    if (!Array.isArray(conversations)) return [];
    if (!searchQuery.trim()) return conversations;
    
    return conversations.filter(conv => {
      const otherParticipant = conv.participants.find((p: any) => p && p.id !== user?.id);
      const name = (otherParticipant?.full_name || otherParticipant?.email || '').toLowerCase();
      return name.includes(searchQuery.toLowerCase());
    });
  }, [conversations, searchQuery, user]);

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b space-y-4">
        <h2 className="text-xl font-bold">Chats</h2>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search conversations..." 
            className="pl-9 h-9 bg-muted/50 border-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {searchQuery ? "No matching chats" : "No conversations yet"}
          </div>
        ) : (
          filteredConversations.map((conv) => {
            if (!conv || !Array.isArray(conv.participants)) return null;
            const otherParticipant = conv.participants.find((p: any) => p && p.id !== user?.id);
            const isOnline = otherParticipant ? onlineUsers.has(otherParticipant.id) : false;
            const lastMsg = conv.last_message;

            return (
              <button
                key={conv.id}
                onClick={() => handleSelect(conv)}
                className={cn(
                  "flex items-center w-full p-4 space-x-3 transition-colors hover:bg-muted/50 text-left",
                  activeConversation?.id === conv.id && "bg-muted"
                )}
              >
                <div className="relative">
                  <Avatar>
                    <AvatarFallback>{(otherParticipant?.full_name || otherParticipant?.email || "?")[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{otherParticipant?.full_name || otherParticipant?.email}</span>
                    {lastMsg && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {lastMsg ? lastMsg.content : "No messages yet"}
                  </p>
                </div>
                {conv.unread_count > 0 && (
                  <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-primary rounded-full">
                    {conv.unread_count}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
