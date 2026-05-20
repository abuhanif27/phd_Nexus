'use client';

import React from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils/cn';

interface MessageBubbleProps {
  content: string;
  timestamp: string;
  isMe: boolean;
  senderEmail: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ content, timestamp, isMe, senderEmail }) => {
  return (
    <div className={cn("flex flex-col mb-4", isMe ? "items-end" : "items-start")}>
      <div className={cn(
        "max-w-[70%] px-4 py-2 rounded-2xl text-sm",
        isMe 
          ? "bg-primary text-primary-foreground rounded-tr-none" 
          : "bg-muted text-muted-foreground rounded-tl-none"
      )}>
        {content}
      </div>
      <div className="flex items-center mt-1 space-x-2 text-[10px] text-muted-foreground">
        {!isMe && <span>{senderEmail}</span>}
        <span>{format(new Date(timestamp), 'HH:mm')}</span>
      </div>
    </div>
  );
};
