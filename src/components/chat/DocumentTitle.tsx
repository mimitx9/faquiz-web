'use client';

import { useEffect } from 'react';
import { useChatContext } from './ChatProvider';

const DEFAULT_TITLE = 'FA Quiz - Trắc nghiệm Y khoa cục súc';

export default function DocumentTitle() {
  const { conversations } = useChatContext();

  useEffect(() => {
    // Tính tổng số tin nhắn chưa đọc từ tất cả conversations
    const totalUnreadCount = conversations.reduce(
      (sum, conv) => sum + (conv.unreadCount || 0),
      0
    );

    // Cập nhật document.title
    if (totalUnreadCount > 0) {
      document.title = `(${totalUnreadCount}) tin nhắn mới - ${DEFAULT_TITLE}`;
    } else {
      document.title = DEFAULT_TITLE;
    }

    // Cleanup: reset về title mặc định khi unmount
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [conversations]);

  return null; // Component này không render gì
}

