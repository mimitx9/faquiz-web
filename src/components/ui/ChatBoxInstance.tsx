'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChatContext } from '@/components/chat/ChatProvider';
import { useAuth } from '@/hooks/useAuth';
import Avatar from '@/components/common/Avatar';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import StickerPicker, { getStickerUrl } from './StickerPicker';

// Danh sách emoji icons phổ biến
const EMOJI_ICONS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
  '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
  '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
  '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
  '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖',
  '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡',
  '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰',
  '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶',
  '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮',
  '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴',
  '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠',
  '❤️', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎',
  '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘',
  '💝', '💟', '☮️', '✝️', '☪️', '🕉', '☸️', '✡️',
  '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉',
  '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑',
  '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴',
  '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚',
  '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲',
  '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕',
  '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷',
  '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❓',
  '❕', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️',
  '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹',
  '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤',
  '🏧', '🚾', '♿', '🅿️', '🈳', '🈂️', '🛂', '🛃',
  '🛄', '🛅', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦',
  '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🔢',
];

interface ChatBoxInstanceProps {
  targetUserId: number;
  index: number;
  totalBoxes: number;
  onClose: () => void;
}

export default function ChatBoxInstance({ targetUserId, index, totalBoxes, onClose }: ChatBoxInstanceProps) {
  const { user, isInitialized } = useAuth();
  const router = useRouter();
  const { 
    conversations, 
    onlineUsersList,
    isUserOnline,
    isConnected,
    sendMessage,
    sendIcon,
    sendSticker,
    error,
    getMessagesForUser,
    getTypingForUser,
    getMessageCountForUser,
    notifyTyping,
    setCurrentTargetUserId,
    setOpenConversation,
  } = useChatContext();
  
  // Lấy messages và typing state từ context
  const [messages, setMessages] = useState(() => getMessagesForUser(targetUserId));
  const [isTyping, setIsTyping] = useState(() => getTypingForUser(targetUserId));
  
  // Đảm bảo channel được subscribe khi mount
  // useChat hook sẽ tự động subscribe vào tất cả channels của conversations
  // Nên chỉ cần đảm bảo conversation đã có trong list
  // Tạm thời set currentTargetUserId để trigger subscription và load messages
  useEffect(() => {
    // Set currentTargetUserId để trigger subscription và load messages từ API nếu cần
    setCurrentTargetUserId(targetUserId);
    // Đánh dấu conversation này đang mở
    setOpenConversation(targetUserId, true);
    
    // Cleanup: đánh dấu conversation đã đóng khi unmount
    return () => {
      setOpenConversation(targetUserId, false);
    };
  }, [targetUserId, setCurrentTargetUserId, setOpenConversation]);
  
  // Theo dõi messages và typing state từ context
  useEffect(() => {
    const updateMessages = () => {
      const newMessages = getMessagesForUser(targetUserId);
      const newTyping = getTypingForUser(targetUserId);
      setMessages(newMessages);
      setIsTyping(newTyping);
    };
    
    // Update ngay lập tức
    updateMessages();
    
    // Update định kỳ để catch real-time updates
    const interval = setInterval(updateMessages, 200);
    
    return () => clearInterval(interval);
  }, [targetUserId, getMessagesForUser, getTypingForUser]);

  const [inputMessage, setInputMessage] = useState('');
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickerPickerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<boolean>(false);
  const boxChatRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom khi có tin nhắn mới hoặc typing indicator
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Đóng sticker picker khi click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Đóng sticker picker
      if (
        showStickerPicker &&
        stickerPickerRef.current &&
        !stickerPickerRef.current.contains(target) &&
        !target.closest('[data-sticker-button]')
      ) {
        setShowStickerPicker(false);
      }
    };

    if (showStickerPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStickerPicker]);

  // Cleanup typing timeout khi unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (lastTypingSentRef.current && notifyTyping) {
        notifyTyping(false);
        lastTypingSentRef.current = false;
      }
    };
  }, [notifyTyping]);

  // Xử lý focus cho boxchat
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      if (boxChatRef.current?.contains(e.target as Node)) {
        setIsFocused(true);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      if (!boxChatRef.current?.contains(e.relatedTarget as Node)) {
        setIsFocused(false);
      }
    };

    const boxChat = boxChatRef.current;
    if (boxChat) {
      boxChat.addEventListener('focusin', handleFocusIn);
      boxChat.addEventListener('focusout', handleFocusOut);
    }

    return () => {
      if (boxChat) {
        boxChat.removeEventListener('focusin', handleFocusIn);
        boxChat.removeEventListener('focusout', handleFocusOut);
      }
    };
  }, []);

  // Chỉ hiển thị cho user đã đăng nhập
  if (!isInitialized || !user) {
    return null;
  }

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      // Gửi typing stop trước khi gửi tin nhắn
      if (lastTypingSentRef.current) {
        notifyTyping(false);
        lastTypingSentRef.current = false;
      }
      
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      
      sendMessage(inputMessage, targetUserId);
      setInputMessage('');
      setShowStickerPicker(false);
      
      // Reset textarea height về 1 dòng
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
        const lineHeight = parseInt(getComputedStyle(inputRef.current).lineHeight) || 24;
        inputRef.current.style.height = `${lineHeight}px`;
        inputRef.current.style.overflowY = 'hidden';
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Xử lý typing indicator khi user gõ và auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputMessage(value);

    // Auto-resize textarea với max 2 dòng
    e.target.style.height = 'auto';
    const lineHeight = parseInt(getComputedStyle(e.target).lineHeight) || 24;
    const maxHeight = lineHeight * 2; // 2 dòng
    const scrollHeight = e.target.scrollHeight;
    
    // Giới hạn ở 2 dòng
    if (scrollHeight <= maxHeight) {
      e.target.style.height = `${scrollHeight}px`;
      e.target.style.overflowY = 'hidden';
    } else {
      e.target.style.height = `${maxHeight}px`;
      e.target.style.overflowY = 'auto';
    }

    if (!isConnected) {
      return;
    }

    // Clear timeout cũ
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Nếu input trống, tắt typing ngay lập tức
    if (!value.trim()) {
      if (lastTypingSentRef.current) {
        notifyTyping(false);
        lastTypingSentRef.current = false;
      }
      return;
    }

    // Nếu có text, gửi typing start
    if (!lastTypingSentRef.current) {
      notifyTyping(true);
      lastTypingSentRef.current = true;
    }

    // Gửi typing stop sau 2 giây không gõ
    typingTimeoutRef.current = setTimeout(() => {
      if (lastTypingSentRef.current) {
        notifyTyping(false);
        lastTypingSentRef.current = false;
      }
    }, 2000);
  };

  const handleEmojiClick = (emoji: string) => {
    sendIcon(emoji, targetUserId);
  };

  const handleStickerClick = (stickerId: string) => {
    sendSticker(stickerId, targetUserId);
    setShowStickerPicker(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      // TODO: Implement image upload functionality
      // For now, just reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getTargetName = () => {
    const conv = conversations.find((c) => c.targetUserId === targetUserId);
    return conv ? conv.targetFullName : `User ${targetUserId}`;
  };

  const getTargetAvatar = () => {
    // Ưu tiên lấy từ conversation
    const conv = conversations.find((c) => c.targetUserId === targetUserId);
    if (conv?.targetAvatar) {
      return conv.targetAvatar;
    }
    // Nếu không có trong conversation, lấy từ onlineUsersList
    const onlineUser = onlineUsersList.find((u) => u.userId === targetUserId);
    return onlineUser?.avatar || null;
  };

  // Tính opacity và blur dựa trên số tin nhắn
  // Blur: chia thành 5 mốc từ 0 đến 5 dựa trên 50 tin nhắn
  // - 0 tin nhắn: blur = 5
  // - 50 tin nhắn: blur = 0
  // - Mỗi mốc = 10 tin nhắn (50/5 = 10)
  // Opacity: chia thành mốc từ 50% đến 100% dựa trên 50 tin nhắn
  // - 0 tin nhắn: opacity = 50% (0.5)
  // - 50 tin nhắn: opacity = 100% (1.0)
  // - Mỗi 1 tin nhắn tăng 1% opacity (50% / 50 = 1% mỗi tin nhắn)
  const messageCount = getMessageCountForUser(targetUserId);
  
  // Tính blur: từ 5 (0 tin nhắn) xuống 0 (50 tin nhắn)
  // Mỗi 10 tin nhắn giảm 1 mốc blur
  const blurAmount = Math.max(5 - Math.floor(messageCount / 10), 0);
  
  // Tính opacity: từ 50% (0 tin nhắn) lên 100% (50 tin nhắn)
  // Mỗi 1 tin nhắn tăng 1% opacity
  const opacity = Math.min(0.5 + (messageCount * 0.01), 1.0);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) {
      return 'Vừa xong';
    } else if (minutes < 60) {
      return `${minutes} phút trước`;
    } else if (hours < 24) {
      return `${hours} giờ trước`;
    } else {
      return date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  // Tính toán vị trí của box chat dựa trên index
  // Các box sẽ được đặt cạnh nhau từ phải sang trái
  // Kích thước box chat: 320px width (giống Facebook Messenger)
  // Khoảng cách giữa các box: 340px (320px width + 20px gap)
  const boxWidth = 320;
  const boxGap = 20;
  const rightOffset = `calc(1rem + 80px + ${(totalBoxes - 1 - index) * (boxWidth + boxGap)}px)`;
  
  // Z-index: box sau có z-index cao hơn để không bị đè
  const zIndex = 50 + index;

  return (
    <div
      ref={boxChatRef}
      className={cn(
        'fixed bottom-0',
        'bg-white dark:bg-gray-800',
        'rounded-t-lg',
        'flex flex-col',
        'h-[420px]',
        'shadow-2xl',
        'transition-all duration-200'
      )}
      style={{
        right: rightOffset,
        width: `${boxWidth}px`,
        zIndex: zIndex,
        maxWidth: 'calc(100vw - 2rem)',
      }}
      tabIndex={-1}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative">
            <div
              className={cn(
                'w-2 h-2 rounded-full absolute -top-0.5 -right-0.5 border border-white dark:border-gray-800 z-10',
                isConnected ? 'bg-green-500' : 'bg-red-500'
              )}
            />
            <div 
              style={{
                opacity: opacity,
                filter: `blur(${blurAmount}px)`,
                transition: 'opacity 0.3s ease, filter 0.3s ease',
              }}
            >
              <Avatar
                src={getTargetAvatar() || undefined}
                name={getTargetName()}
                size="sm"
                className="w-8 h-8"
              />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div 
              className="text-xs font-semibold text-gray-900 dark:text-white truncate"
              style={{
                opacity: opacity,
                filter: `blur(${blurAmount}px)`,
                transition: 'opacity 0.3s ease, filter 0.3s ease',
              }}
            >
              {getTargetName()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => router.push(`/messages?userId=${targetUserId}`)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Mở rộng chat"
          >
            <Image
              src="/expand.svg"
              alt="Expand"
              width={17}
              height={17}
              className="dark:invert"
            />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 flex-shrink-0">
          <p className="text-[10px] text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <p className="text-xs">Chưa có tin nhắn nào. Hãy bắt đầu chat!</p>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => {
                // Áp dụng blur/opacity cho avatar trong messages dựa trên tổng số tin nhắn hiện tại
                // Giống như header, tất cả avatars sẽ có cùng blur/opacity dựa trên tổng số tin nhắn
                const msgBlurAmount = blurAmount;
                const msgOpacity = opacity;
                
                const isMyMessage = msg.userId === user.userId;
                const isSticker = msg.type === 'sticker' || (msg.icon && msg.icon.includes('/') && msg.icon.includes('.webp'));
                const isTextMessage = msg.type !== 'icon' && !isSticker;
                
                // Chỉ áp dụng border radius logic cho tin nhắn text
                let borderRadiusClasses = 'rounded-2xl'; // Mặc định cho sticker/emoji
                
                if (isTextMessage) {
                  // Xác định nhóm tin nhắn TEXT liên tiếp từ cùng một người
                  // Sticker/emoji sẽ tách nhóm text
                  const prevTextMsg = (() => {
                    for (let i = index - 1; i >= 0; i--) {
                      const prevMsg = messages[i];
                      if (prevMsg.userId !== msg.userId) {
                        break;
                      }
                      const prevIsSticker = prevMsg.type === 'sticker' || (prevMsg.icon && prevMsg.icon.includes('/') && prevMsg.icon.includes('.webp'));
                      if (prevMsg.userId === msg.userId && (prevMsg.type === 'icon' || prevIsSticker)) {
                        // Gặp sticker/emoji thì dừng lại, không tiếp tục tìm
                        break;
                      }
                      if (prevMsg.userId === msg.userId && prevMsg.type !== 'icon' && !prevIsSticker) {
                        return prevMsg;
                      }
                    }
                    return null;
                  })();
                  
                  const nextTextMsg = (() => {
                    for (let i = index + 1; i < messages.length; i++) {
                      const nextMsg = messages[i];
                      if (nextMsg.userId !== msg.userId) {
                        break;
                      }
                      const nextIsSticker = nextMsg.type === 'sticker' || (nextMsg.icon && nextMsg.icon.includes('/') && nextMsg.icon.includes('.webp'));
                      if (nextMsg.userId === msg.userId && (nextMsg.type === 'icon' || nextIsSticker)) {
                        // Gặp sticker/emoji thì dừng lại, không tiếp tục tìm
                        break;
                      }
                      if (nextMsg.userId === msg.userId && nextMsg.type !== 'icon' && !nextIsSticker) {
                        return nextMsg;
                      }
                    }
                    return null;
                  })();
                  
                  const isFirstInGroup = !prevTextMsg;
                  const isLastInGroup = !nextTextMsg;
                  
                  // Tính số lượng bubble TEXT trong nhóm (chỉ tính các text liên tiếp, không có sticker ở giữa)
                  let groupSize = 1;
                  if (!isFirstInGroup || !isLastInGroup) {
                    // Tìm điểm bắt đầu của nhóm TEXT (dừng khi gặp sticker hoặc người khác)
                    let startIndex = index;
                    while (startIndex > 0) {
                      const prevMsg = messages[startIndex - 1];
                      if (prevMsg.userId !== msg.userId) {
                        break;
                      }
                      const prevIsSticker = prevMsg.type === 'sticker' || (prevMsg.icon && prevMsg.icon.includes('/') && prevMsg.icon.includes('.webp'));
                      if (prevMsg.userId === msg.userId && (prevMsg.type === 'icon' || prevIsSticker)) {
                        // Gặp sticker/emoji thì dừng lại
                        break;
                      }
                      if (prevMsg.userId === msg.userId && prevMsg.type !== 'icon' && !prevIsSticker) {
                        startIndex--;
                      } else {
                        break;
                      }
                    }
                    
                    // Tìm điểm kết thúc của nhóm TEXT (dừng khi gặp sticker hoặc người khác)
                    let endIndex = index;
                    while (endIndex < messages.length - 1) {
                      const nextMsg = messages[endIndex + 1];
                      if (nextMsg.userId !== msg.userId) {
                        break;
                      }
                      const nextIsSticker = nextMsg.type === 'sticker' || (nextMsg.icon && nextMsg.icon.includes('/') && nextMsg.icon.includes('.webp'));
                      if (nextMsg.userId === msg.userId && (nextMsg.type === 'icon' || nextIsSticker)) {
                        // Gặp sticker/emoji thì dừng lại
                        break;
                      }
                      if (nextMsg.userId === msg.userId && nextMsg.type !== 'icon' && !nextIsSticker) {
                        endIndex++;
                      } else {
                        break;
                      }
                    }
                    
                    // Đếm số lượng tin nhắn TEXT trong khoảng này
                    groupSize = 0;
                    for (let i = startIndex; i <= endIndex; i++) {
                      const msgIcon = messages[i]?.icon;
                      const msgIsSticker = messages[i]?.type === 'sticker' || (msgIcon && typeof msgIcon === 'string' && msgIcon.includes('/') && msgIcon.includes('.webp'));
                      if (messages[i]?.userId === msg.userId && messages[i]?.type !== 'icon' && !msgIsSticker) {
                        groupSize++;
                      }
                    }
                  }
                  
                  // Xác định vị trí trong nhóm
                  const isGroupStart = isFirstInGroup;
                  const isGroupEnd = isLastInGroup;
                  const isGroupMiddle = groupSize > 2 && !isGroupStart && !isGroupEnd;
                  
                  // Tính toán border radius dựa trên vị trí trong nhóm
                  if (groupSize === 1) {
                    // 1 bubble: bo tròn cả 4 góc
                    borderRadiusClasses = 'rounded-2xl';
                  } else if (groupSize === 2) {
                    // 2 bubble: bubble đầu bo tròn nhỏ góc dưới, bubble thứ 2 bo tròn nhỏ góc trên
                    if (isGroupStart) {
                      // Bubble đầu: bo tròn nhỏ góc dưới bên trái (hoặc phải nếu là tin nhắn của mình)
                      borderRadiusClasses = isMyMessage 
                        ? 'rounded-2xl rounded-br-sm' 
                        : 'rounded-2xl rounded-bl-sm';
                    } else {
                      // Bubble thứ 2: bo tròn nhỏ góc trên bên trái (hoặc phải nếu là tin nhắn của mình)
                      borderRadiusClasses = isMyMessage 
                        ? 'rounded-2xl rounded-tr-sm' 
                        : 'rounded-2xl rounded-tl-sm';
                    }
                  } else {
                    // 3+ bubble
                    if (isGroupStart) {
                      // Bubble đầu: bo tròn nhỏ góc dưới bên trái (hoặc phải)
                      borderRadiusClasses = isMyMessage 
                        ? 'rounded-2xl rounded-br-sm' 
                        : 'rounded-2xl rounded-bl-sm';
                    } else if (isGroupMiddle) {
                      // Bubble giữa: bo tròn nhỏ cả 2 góc bên trái (hoặc phải)
                      borderRadiusClasses = isMyMessage 
                        ? 'rounded-2xl rounded-tr-sm rounded-br-sm' 
                        : 'rounded-2xl rounded-tl-sm rounded-bl-sm';
                    } else {
                      // Bubble cuối: bo tròn nhỏ góc trên bên trái (hoặc phải)
                      borderRadiusClasses = isMyMessage 
                        ? 'rounded-2xl rounded-tr-sm' 
                        : 'rounded-2xl rounded-tl-sm';
                    }
                  }
                }
                
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-2 group relative',
                      isMyMessage && 'flex-row-reverse'
                    )}
                  >
                    {/* Chỉ hiển thị avatar cho tin nhắn của người khác */}
                    {!isMyMessage && (
                      <div
                        style={{
                          opacity: msgOpacity,
                          filter: `blur(${msgBlurAmount}px)`,
                          transition: 'opacity 0.3s ease, filter 0.3s ease',
                        }}
                      >
                        <Avatar
                          src={msg.avatar || undefined}
                          name={msg.fullName}
                          size="sm"
                          className="flex-shrink-0 w-6 h-6"
                        />
                      </div>
                    )}
                    <div
                      className={cn(
                        'flex flex-col max-w-[75%] relative',
                        isMyMessage && 'items-end'
                      )}
                    >
                      {/* Kiểm tra sticker trước (nếu icon là đường dẫn sticker) */}
                      {(msg.type === 'sticker' || (msg.icon && msg.icon.includes('/') && msg.icon.includes('.webp'))) && msg.icon ? (
                        <div className="relative">
                          <Image
                            src={getStickerUrl(msg.icon)}
                            alt="Sticker"
                            width={120}
                            height={120}
                            className="w-[120px] h-[120px] object-contain"
                            unoptimized // Vì là animated webp
                          />
                        </div>
                      ) : msg.type === 'icon' && msg.icon ? (
                        <div className="text-3xl relative">
                          {msg.icon}
                        </div>
                      ) : (
                        <div
                          className={cn(
                            'px-3 py-1.5 relative',
                            borderRadiusClasses,
                            isMyMessage
                              ? 'text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                          )}
                          style={isMyMessage ? { backgroundColor: '#8D7EF7' } : undefined}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {msg.message}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {/* Typing indicator */}
              {isTyping && (
                <div className="flex gap-2" key="typing-indicator">
                  <div className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.4s' }} />
                      <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1.4s' }} />
                      <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1.4s' }} />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 relative flex-shrink-0">
          {showStickerPicker && (
            <div ref={stickerPickerRef}>
              <StickerPicker
                onSelectSticker={handleStickerClick}
                onSelectEmoji={handleEmojiClick}
                emojiList={EMOJI_ICONS}
                onClose={() => setShowStickerPicker(false)}
              />
            </div>
          )}
          <div className={cn(
            "w-full max-w-sm mx-auto rounded-3xl p-4 flex items-center transition-all duration-200",
            isFocused 
              ? "bg-gray-100 dark:bg-gray-100 border-2 border-gray-100 dark:border-gray-100" 
              : "bg-gray-200 dark:bg-gray-700"
          )}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              disabled={!isConnected}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!isConnected}
              className="mr-3 p-1 opacity-50 hover:opacity-100 transition-all flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Chọn ảnh"
            >
              <svg
                className="w-4 h-4 text-gray-600 dark:text-white/30"
                width="19"
                height="13"
                viewBox="0 0 19 13"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M1 12L4.78955 7.11073C5.60707 6.05598 7.2086 6.08248 7.99077 7.16371L9.90958 9.81618C10.6961 10.9034 12.3249 10.902 13.1376 9.83413C13.9379 8.78234 15.5359 8.7619 16.3363 9.81369L18 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle
                  cx="15"
                  cy="3"
                  r="2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </button>
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Nhập tin nhắn..."
              disabled={!isConnected}
              rows={1}
              className="flex-1 bg-transparent text-lg text-gray-800 dark:text-gray-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed resize-none overflow-y-auto max-h-[3rem] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              style={{ minHeight: '1.5rem', lineHeight: '1.5rem' }}
            />
            <button
              data-sticker-button
              onClick={() => {
                setShowStickerPicker(!showStickerPicker);
              }}
              disabled={!isConnected}
              className="mr-2 p-1 opacity-50 hover:opacity-100 transition-all flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Chọn sticker"
            >
              <Image
                src="/sticker.svg"
                alt="Sticker"
                width={16}
                height={16}
                className="w-4 h-4 opacity-50 dark:opacity-30"
              />
            </button>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || !isConnected}
              className="ml-2 p-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              aria-label="Gửi"
            >
              <svg
                className="w-4 h-4"
                width="20"
                height="18"
                viewBox="0 0 20 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M17.5436 0.892072C19.0975 0.879563 20.0714 2.56646 19.2837 3.90592L11.7367 16.738C10.8525 18.2414 8.60201 17.9717 8.09803 16.3021L7.03905 12.7937C6.6797 11.6032 7.09208 10.3144 8.07577 9.55366L12.4962 6.13506C12.7265 5.95691 12.5179 5.59555 12.2484 5.70597L7.08027 7.82378C5.92829 8.29584 4.60446 8.00736 3.75333 7.09879L1.2057 4.37923C0.0141876 3.1073 0.906414 1.026 2.6492 1.01197L17.5436 0.892072Z"
                  fill="#8D7EF7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

