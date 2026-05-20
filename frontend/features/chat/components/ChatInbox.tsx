'use client';

import React from 'react';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { ChatProvider } from '../context/ChatContext';

export const ChatInbox: React.FC = () => {
  return (
    <ChatProvider>
      <div className="flex h-[calc(100vh-12rem)] min-h-[500px] border rounded-lg overflow-hidden bg-background shadow-md">
        <div className="w-80 flex-shrink-0 border-r">
          <ConversationList />
        </div>
        <div className="flex-1">
          <ChatWindow />
        </div>
      </div>
    </ChatProvider>
  );
};
