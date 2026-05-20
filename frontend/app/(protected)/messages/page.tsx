import React from 'react';
import { Metadata } from 'next';
import { ChatInbox } from '@/features/chat/components/ChatInbox';

export const metadata: Metadata = {
  title: 'Messages | NexusCare',
  description: 'Chat with your doctors and service providers.',
};

export default function MessagesPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 h-full">
      <div className="flex flex-col h-full space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">
            Connect with healthcare professionals and service providers.
          </p>
        </div>
        <React.Suspense fallback={<div>Loading chats...</div>}>
          <ChatInbox />
        </React.Suspense>
      </div>
    </div>
  );
}
