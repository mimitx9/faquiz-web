'use client';

import React from 'react';
import { useChatContext } from '@/components/chat/ChatProvider';
import ChatBoxInstance from './ChatBoxInstance';

interface ChatBoxProps {
  className?: string;
}

export default function ChatBox({ className }: ChatBoxProps) {
  const { openChatUserIds, closeChat } = useChatContext();

  return (
    <>
      {openChatUserIds.map((userId, index) => (
        <ChatBoxInstance
          key={userId}
          targetUserId={userId}
          index={index}
          totalBoxes={openChatUserIds.length}
          onClose={() => closeChat(userId)}
        />
      ))}
    </>
  );
}
