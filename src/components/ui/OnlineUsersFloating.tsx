'use client';

import React, { useState, useEffect } from 'react';
import { useChatContext } from '@/components/chat/ChatProvider';
import { useAuth } from '@/hooks/useAuth';
import Avatar from '@/components/common/Avatar';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

export default function OnlineUsersFloating() {
  const { user, isInitialized } = useAuth();
  const pathname = usePathname();
  const { onlineUsersList, openChat, closeAllChats, conversations, openChatUserIds } = useChatContext();
  const [isVisible, setIsVisible] = useState(true);
  const [hoveredUserId, setHoveredUserId] = useState<number | null>(null);
  const [hiddenUserIds, setHiddenUserIds] = useState<Set<number>>(new Set());
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Debug: Log onlineUsersList để kiểm tra (phải đặt trước các điều kiện return)
  useEffect(() => {
    console.log('[OnlineUsersFloating] onlineUsersList:', onlineUsersList);
    console.log('[OnlineUsersFloating] onlineUsersList length:', onlineUsersList.length);
    console.log('[OnlineUsersFloating] hiddenUserIds:', Array.from(hiddenUserIds));
    console.log('[OnlineUsersFloating] isVisible:', isVisible);
  }, [onlineUsersList, hiddenUserIds, isVisible]);

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
  // Nếu user có trong onlineUsersList thì họ đang online (đã được sync với WebSocket)
  const displayUsers = onlineUsersList
    .filter(onlineUser => 
      !hiddenUserIds.has(onlineUser.userId)
    )
    .map(onlineUser => {
      const conversation = conversations.find(conv => conv.targetUserId === onlineUser.userId);
      return {
        ...onlineUser,
        // Avatar từ onlineUser là nguồn chính, không phụ thuộc vào conversation
        // onlineUser.avatar sẽ được cập nhật từ message khi user gửi tin nhắn
        avatar: onlineUser.avatar || undefined,
        // Cập nhật thông tin từ conversation nếu thiếu
        username: onlineUser.username || conversation?.targetUsername || onlineUser.username,
        fullName: onlineUser.fullName || conversation?.targetFullName || onlineUser.fullName,
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

  // Helper function để tạo màu nền random dựa trên tên user (consistent cho cùng một user)
  const getRandomColor = (name: string): string => {
    // Tạo hash từ tên để có màu consistent
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Danh sách màu đẹp và dễ nhìn
    const colors = [
      '#FF6B6B', // Đỏ
      '#4ECDC4', // Xanh ngọc
      '#45B7D1', // Xanh dương
      '#FFA07A', // Cam nhạt
      '#98D8C8', // Xanh lá nhạt
      '#F7DC6F', // Vàng
      '#BB8FCE', // Tím nhạt
      '#85C1E2', // Xanh nhạt
      '#F8B739', // Vàng cam
      '#52BE80', // Xanh lá
      '#E74C3C', // Đỏ đậm
      '#3498DB', // Xanh dương đậm
      '#9B59B6', // Tím
      '#E67E22', // Cam đậm
      '#1ABC9C', // Xanh ngọc đậm
    ];
    
    // Chọn màu dựa trên hash
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Helper function để lấy ký tự đầu tiên
  const getFirstLetter = (name: string): string => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
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
      {/* Floating avatars - hiển thị theo chiều dọc */}
      <div className="flex flex-col gap-3">
        {displayUsers.map((onlineUser, index) => {
          const isHovered = hoveredUserId === onlineUser.userId;
          
          return (
            <div
              key={onlineUser.userId}
              className="relative"
              style={{ zIndex: displayUsers.length - index }}
              onMouseEnter={() => setHoveredUserId(onlineUser.userId)}
              onMouseLeave={() => setHoveredUserId(null)}
            >
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
                    <div className="w-full h-full rounded-full overflow-hidden shadow-lg flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                      {onlineUser.avatar ? (
                        <div className="w-full h-full">
                          <Avatar
                            src={onlineUser.avatar}
                            name={onlineUser.fullName}
                            size="lg"
                            className="!w-full !h-full"
                          />
                        </div>
                      ) : (
                        <div 
                          className="w-full h-full rounded-full flex items-center justify-center text-white font-bold text-xl sm:text-2xl pointer-events-none"
                          style={{ backgroundColor: getRandomColor(onlineUser.fullName || 'User') }}
                        >
                          {getFirstLetter(onlineUser.fullName || 'User')}
                        </div>
                      )}
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
