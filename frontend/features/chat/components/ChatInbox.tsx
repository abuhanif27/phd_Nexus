'use client';

import React from 'react';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { ChatProvider, useChat } from '../context/ChatContext';

const ChatLayout: React.FC = () => {
  const { activeConversation } = useChat();

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[500px] border rounded-lg overflow-hidden bg-background shadow-md">
      <div className={`w-full md:w-80 md:flex-shrink-0 border-r ${activeConversation ? 'hidden md:block' : ''}`}>
        <ConversationList />
      </div>
      <div className={`flex-1 flex-col ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
        <ChatWindow />
      </div>
    </div>
  );
};

export const ChatInbox: React.FC = () => {
  return (
    <ChatProvider>
      <ChatLayout />
    </ChatProvider>
  );
};
