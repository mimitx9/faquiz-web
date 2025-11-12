'use client';

import React, { useState, useEffect } from 'react';
import { useChatContext } from '@/components/chat/ChatProvider';
import { useAuth } from '@/hooks/useAuth';
import Avatar from '@/components/common/Avatar';
import { X, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

export default function OnlineUsersFloating() {
  const { user, isInitialized } = useAuth();
  const pathname = usePathname();
  const { onlineUsersList, openChat, closeAllChats, conversations, openChatUserIds } = useChatContext();
  const [isVisible, setIsVisible] = useState(true);
  const [hoveredUserId, setHoveredUserId] = useState<number | null>(null);
  const [hiddenUserIds, setHiddenUserIds] = useState<Set<number>>(new Set());
  const [showMenu, setShowMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Chỉ hiển thị cho user đã đăng nhập
  if (!isInitialized || !user) {
    return null;
  }

  // Ẩn floating button khi ở trang /messages
  if (pathname === '/messages') {
    return null;
  }

  // Lọc ra các user chưa bị ẩn và lấy tối đa 4 người đang online
  // Không cần bỏ user đang được chọn vì giờ có thể mở nhiều box chat cùng lúc
  const displayUsers = onlineUsersList
    .filter(onlineUser => 
      !hiddenUserIds.has(onlineUser.userId)
    )
    .map(onlineUser => {
      const conversation = conversations.find(conv => conv.targetUserId === onlineUser.userId);
      return {
        ...onlineUser,
        unreadCount: conversation?.unreadCount || 0,
        lastMessage: conversation?.lastMessage,
        // Thêm timestamp để sắp xếp: ưu tiên lastMessage timestamp, nếu không có thì dùng onlineSince
        sortTimestamp: conversation?.lastMessage?.timestamp || onlineUser.onlineSince || 0
      };
    })
    // Sắp xếp theo thời gian tin nhắn gần nhất: tin nhắn mới nhất ở dưới cùng
    .sort((a, b) => {
      // Ưu tiên sắp xếp theo sortTimestamp (lastMessage timestamp hoặc onlineSince)
      // Timestamp lớn hơn (mới hơn) sẽ ở dưới cùng
      if (a.sortTimestamp !== b.sortTimestamp) {
        return b.sortTimestamp - a.sortTimestamp;
      }
      
      // Nếu sortTimestamp bằng nhau, ưu tiên người có lastMessage
      if (a.lastMessage && !b.lastMessage) {
        return -1; // a xuống dưới
      }
      if (!a.lastMessage && b.lastMessage) {
        return 1; // b xuống dưới
      }
      
      // Nếu cả hai đều có hoặc không có lastMessage, giữ nguyên thứ tự
      return 0;
    })
    .slice(0, 4); // Lấy tối đa 4 người sau khi sắp xếp

  // Nếu không có ai online hoặc đã bị ẩn thì không hiển thị
  if (displayUsers.length === 0 || !isVisible) {
    return null;
  }

  const handleAvatarClick = (userId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    // Mở ChatBox với user này (có thể mở tối đa 3 box)
    openChat(userId);
  };

  const handleCloseSingle = (userId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setHiddenUserIds(prev => new Set(prev).add(userId));
    setHoveredUserId(null);
  };

  const handleCloseAll = () => {
    closeAllChats();
    setIsVisible(false);
    setShowMenu(false);
  };

  const formatMessage = (message: any) => {
    if (!message) return '';
    if (message.type === 'icon' && message.icon) {
      return message.icon;
    }
    return message.message || '';
  };

  const getMessagePreview = (lastMessage: any, userId: number) => {
    if (!lastMessage) return '';
    const isFromMe = lastMessage.userId === user?.userId;
    const messageText = formatMessage(lastMessage);
    if (isFromMe) {
      return `Bạn: ${messageText}`;
    }
    return messageText;
  };

  // Helper function để format thời gian online
  const getOnlineTimeText = (onlineSince?: number): string => {
    if (!onlineSince) return '';
    
    const now = Date.now();
    const diffMs = now - onlineSince;
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) {
      return 'Vừa online';
    } else if (diffMinutes < 60) {
      return `Đã online ${diffMinutes} phút trước`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      return `Đã online ${hours} giờ trước`;
    }
  };

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-40',
        'flex flex-col items-end gap-2',
        'transition-all duration-300'
      )}
      style={{ transform: 'scale(0.8)' }}
    >
      {/* Nút 3 chấm menu */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className={cn(
            'w-10 h-10 rounded-full',
            'bg-white dark:bg-gray-800',
            'hover:bg-gray-100 dark:hover:bg-gray-700',
            'active:bg-gray-200 dark:active:bg-gray-600',
            'flex items-center justify-center',
            'transition-all duration-200',
            'shadow-lg border border-gray-200 dark:border-gray-700',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          )}
          title="Menu"
        >
          <MoreHorizontal className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>

        {/* Menu dropdown */}
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <div
              className={cn(
                'absolute bottom-full right-0 mb-2',
                'bg-white dark:bg-gray-800',
                'rounded-lg shadow-xl',
                'border border-gray-200 dark:border-gray-700',
                'min-w-[200px]',
                'z-50'
              )}
            >
              <button
                onClick={handleCloseAll}
                className={cn(
                  'w-full px-4 py-3 text-left',
                  'text-gray-700 dark:text-gray-200',
                  'hover:bg-gray-100 dark:hover:bg-gray-700',
                  'transition-colors duration-150',
                  'flex items-center gap-2'
                )}
              >
                <X className="w-4 h-4" />
                <span>Đóng tất cả đoạn chat</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Floating avatars - hiển thị theo chiều dọc */}
      <div className="flex flex-col gap-3">
        {displayUsers.map((onlineUser, index) => {
          const isHovered = hoveredUserId === onlineUser.userId;
          const messagePreview = getMessagePreview(onlineUser.lastMessage, onlineUser.userId);
          
          return (
            <div
              key={onlineUser.userId}
              className="relative"
              style={{ zIndex: displayUsers.length - index }}
              onMouseEnter={() => setHoveredUserId(onlineUser.userId)}
              onMouseLeave={() => setHoveredUserId(null)}
            >
              {/* Message bubble khi hover */}
              {isHovered && (
                <div
                  className={cn(
                    'absolute right-full mr-3 top-1/2 -translate-y-1/2',
                    'bg-white dark:bg-gray-800',
                    'rounded-lg shadow-lg',
                    'px-3 py-2',
                    'max-w-[200px]',
                    'border border-gray-200 dark:border-gray-700',
                    'z-50'
                  )}
                >
                  {messagePreview ? (
                    <div className="text-sm text-gray-700 dark:text-gray-200 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                      {messagePreview.length > 30 
                        ? `${messagePreview.substring(0, 30)}...` 
                        : messagePreview}
                    </div>
                  ) : null}
                  {/* Hiển thị thời gian online */}
                  {onlineUser.onlineSince && (
                    <div className={cn(
                      'text-xs text-gray-500 dark:text-gray-400 mt-1',
                      messagePreview ? 'border-t border-gray-200 dark:border-gray-700 pt-1' : ''
                    )}>
                      {getOnlineTimeText(onlineUser.onlineSince)}
                    </div>
                  )}
                  {/* Arrow pointer */}
                  <div
                    className={cn(
                      'absolute left-full top-1/2 -translate-y-1/2',
                      'w-0 h-0',
                      'border-t-[8px] border-t-transparent',
                      'border-b-[8px] border-b-transparent',
                      'border-l-[8px] border-l-white dark:border-l-gray-800'
                    )}
                  />
                </div>
              )}

              <div className="relative">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAvatarClick(onlineUser.userId, e);
                  }}
                  className="relative transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full"
                  title={onlineUser.fullName}
                  type="button"
                >
                  <div className="relative w-14 h-14 sm:w-16 sm:h-16">
                    <div className="w-full h-full rounded-full overflow-hidden border-2 border-white dark:border-gray-800 shadow-lg flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                      <div className="scale-[1.3] pointer-events-none">
                        <div className="w-12 h-12 rounded-full overflow-hidden pointer-events-none">
                          <Avatar
                            src={onlineUser.avatar || undefined}
                            name={onlineUser.fullName}
                            size="lg"
                          />
                        </div>
                      </div>
                    </div>
                    {/* Online indicator dot - màu xanh */}
                    <div className="absolute bottom-0 right-0 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                    {/* Badge số tin nhắn chưa đọc */}
                    {onlineUser.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold px-1 border-2 border-white dark:border-gray-800">
                        {onlineUser.unreadCount > 9 ? '9+' : onlineUser.unreadCount}
                      </div>
                    )}
                  </div>
                </button>

                {/* Nút X khi hover vào icon */}
                {isHovered && (
                  <button
                    onClick={(e) => handleCloseSingle(onlineUser.userId, e)}
                    className={cn(
                      'absolute -top-1 -right-1',
                      'w-5 h-5 rounded-full',
                      'bg-gray-100 dark:bg-gray-700',
                      'hover:bg-gray-200 dark:hover:bg-gray-600',
                      'active:bg-gray-300 dark:active:bg-gray-500',
                      'flex items-center justify-center',
                      'transition-all duration-200',
                      'shadow-md border border-gray-200 dark:border-gray-600',
                      'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
                      'z-10'
                    )}
                    title="Đóng"
                    type="button"
                  >
                    <X className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
