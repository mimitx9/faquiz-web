'use client';

import React, { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { useChat, UseChatReturn } from '@/hooks/useChat';
import ChatBox from '@/components/ui/ChatBox';
import DocumentTitle from './DocumentTitle';

interface ChatContextType extends UseChatReturn {
  openChatUserIds: number[];
  openChat: (userId: number) => void;
  closeChat: (userId: number) => void;
  closeAllChats: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children?: ReactNode;
}

const MAX_CHAT_BOXES = 3;

export default function ChatProvider({ children }: ChatProviderProps) {
  const chatData = useChat();
  const [openChatUserIds, setOpenChatUserIds] = useState<number[]>([]);

  const openChat = useCallback((userId: number) => {
    setOpenChatUserIds((prev) => {
      // Nếu đã mở rồi thì không làm gì
      if (prev.includes(userId)) {
        return prev;
      }
      
      // Nếu chưa đủ 3 box thì thêm vào
      if (prev.length < MAX_CHAT_BOXES) {
        return [...prev, userId];
      }
      
      // Nếu đã đủ 3 box thì thay thế box đầu tiên (cũ nhất)
      return [prev[1], prev[2], userId];
    });
  }, []);

  const closeChat = useCallback((userId: number) => {
    setOpenChatUserIds((prev) => prev.filter((id) => id !== userId));
  }, []);

  const closeAllChats = useCallback(() => {
    setOpenChatUserIds([]);
  }, []);

  const contextValue: ChatContextType = {
    ...chatData,
    openChatUserIds,
    openChat,
    closeChat,
    closeAllChats,
  };

  return (
    <ChatContext.Provider value={contextValue}>
      <DocumentTitle />
      {children}
      <ChatBox />
    </ChatContext.Provider>
  );
}
