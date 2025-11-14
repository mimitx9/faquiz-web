'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useChatContext } from '@/components/chat/ChatProvider';
import { useAuth } from '@/hooks/useAuth';
import Avatar from '@/components/common/Avatar';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import QuizHeader from '@/components/layout/QuizHeader';
import StickerPicker, { getStickerUrl } from '@/components/ui/StickerPicker';
import { chatApiService } from '@/lib/api';

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

export default function MessagesPage() {
  const { user, isInitialized } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    conversations,
    onlineUsersList,
    isUserOnline,
    isConnected,
    sendMessage,
    sendIcon,
    sendSticker,
    sendImage,
    updateImageMessageWithRealUrl,
    error,
    getMessagesForUser,
    getTypingForUser,
    notifyTyping,
    setCurrentTargetUserId,
    setOpenConversation,
    isLoadingConversations,
  } = useChatContext();

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const previousSelectedUserIdRef = useRef<number | null>(null);

  // Lấy userId từ URL query params
  useEffect(() => {
    const userIdParam = searchParams.get('userId');
    if (userIdParam) {
      const userId = parseInt(userIdParam, 10);
      if (!isNaN(userId)) {
        setSelectedUserId(userId);
      }
    }
  }, [searchParams]);

  // Cập nhật messages khi chọn user khác
  useEffect(() => {
    // Đóng conversation cũ nếu có
    if (previousSelectedUserIdRef.current && previousSelectedUserIdRef.current !== selectedUserId) {
      setOpenConversation(previousSelectedUserIdRef.current, false);
    }
    
    if (selectedUserId) {
      setCurrentTargetUserId(selectedUserId);
      setOpenConversation(selectedUserId, true);
      const userMessages = getMessagesForUser(selectedUserId);
      setMessages(userMessages);
      setIsTyping(getTypingForUser(selectedUserId));
    } else {
      // Khi không có conversation nào được chọn, đóng tất cả conversations
      // để đảm bảo unreadCount được tăng khi nhận tin nhắn mới
      setCurrentTargetUserId(null);
    }
    
    // Lưu selectedUserId hiện tại để lần sau có thể đóng conversation cũ
    previousSelectedUserIdRef.current = selectedUserId;
  }, [selectedUserId, setCurrentTargetUserId, setOpenConversation, getMessagesForUser, getTypingForUser]);

  // Theo dõi messages và typing state từ context
  useEffect(() => {
    if (!selectedUserId) return;
    
    const updateMessages = () => {
      const newMessages = getMessagesForUser(selectedUserId);
      const newTyping = getTypingForUser(selectedUserId);
      setMessages(newMessages);
      setIsTyping(newTyping);
    };
    
    updateMessages();
    const interval = setInterval(updateMessages, 200);
    
    return () => clearInterval(interval);
  }, [selectedUserId, getMessagesForUser, getTypingForUser]);

  // Scroll to bottom khi có tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Xử lý typing indicator và auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputMessage(value);

    // Auto-resize textarea với max 2 dòng
    e.target.style.height = 'auto';
    const lineHeight = parseInt(getComputedStyle(e.target).lineHeight) || 24;
    const maxHeight = lineHeight * 2; // 2 dòng
    const scrollHeight = e.target.scrollHeight;
    
    if (scrollHeight <= maxHeight) {
      e.target.style.height = `${scrollHeight}px`;
      e.target.style.overflowY = 'hidden';
    } else {
      e.target.style.height = `${maxHeight}px`;
      e.target.style.overflowY = 'auto';
    }
    
    if (!selectedUserId || !isConnected) return;
    
    // Clear timeout cũ
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Nếu input trống, tắt typing ngay lập tức
    if (!value.trim()) {
      if (lastTypingSentRef.current) {
        notifyTyping(false, selectedUserId);
        lastTypingSentRef.current = false;
      }
      return;
    }

    // Nếu có text, gửi typing start
    if (!lastTypingSentRef.current) {
      notifyTyping(true, selectedUserId);
      lastTypingSentRef.current = true;
    }

    // Gửi typing stop sau 2 giây không gõ
    typingTimeoutRef.current = setTimeout(() => {
      if (lastTypingSentRef.current) {
        notifyTyping(false, selectedUserId);
        lastTypingSentRef.current = false;
      }
    }, 2000);
  };

  // Gửi tin nhắn
  const handleSendMessage = async () => {
    // Gửi ảnh nếu có
    if (selectedImage) {
      const { file, previewUrl } = selectedImage;
      
      // Gửi typing stop trước khi gửi ảnh
      if (lastTypingSentRef.current) {
        notifyTyping(false, selectedUserId);
        lastTypingSentRef.current = false;
      }
      
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      try {
        // Upload ảnh lên server
        const response = await chatApiService.uploadImage(file);
        const uploadedUrl = response.data.urlFile;
        
        // Gửi ảnh qua chat
        await sendImage(uploadedUrl, selectedUserId);
        
        // Xóa preview và revoke blob URL
        setSelectedImage(null);
        URL.revokeObjectURL(previewUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
        setSelectedImage(null);
        URL.revokeObjectURL(previewUrl);
      }
      return;
    }
    
    if (!selectedUserId || !inputMessage.trim()) return;
    
    // Gửi typing stop trước khi gửi tin nhắn
    if (lastTypingSentRef.current) {
      notifyTyping(false, selectedUserId);
      lastTypingSentRef.current = false;
    }
    
    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    
    await sendMessage(inputMessage.trim(), selectedUserId);
    setInputMessage('');
    setShowStickerPicker(false);
    
    // Reset textarea height về 1 dòng
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const lineHeight = parseInt(getComputedStyle(inputRef.current).lineHeight) || 24;
      inputRef.current.style.height = `${lineHeight}px`;
      inputRef.current.style.overflowY = 'hidden';
    }
  };

  // Gửi emoji
  const handleSelectEmoji = (emoji: string) => {
    if (!selectedUserId) return;
    sendIcon(emoji, selectedUserId);
    setShowStickerPicker(false);
  };

  // Gửi sticker
  const handleSelectSticker = (stickerId: string) => {
    if (!selectedUserId) return;
    sendSticker(stickerId, selectedUserId);
    setShowStickerPicker(false);
  };

  // Gửi ảnh
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUserId) return;

    const previewUrl = URL.createObjectURL(file);
    setSelectedImage({ file, previewUrl });

    try {
      // Upload ảnh lên server
      const response = await chatApiService.uploadImage(file);
      const uploadedUrl = response.data.urlFile;
      
      // Gửi ảnh qua chat
      await sendImage(uploadedUrl, selectedUserId);
      
      // Xóa preview và revoke blob URL
      setSelectedImage(null);
      URL.revokeObjectURL(previewUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      setSelectedImage(null);
      URL.revokeObjectURL(previewUrl);
    }
  };

  // Format thời gian
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Hôm qua';
    } else if (days < 7) {
      return date.toLocaleDateString('vi-VN', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    }
  };


  // Redirect nếu chưa đăng nhập
  useEffect(() => {
    if (isInitialized && !user) {
      router.push('/login');
    }
  }, [isInitialized, user, router]);

  if (!isInitialized) {
    return null;
  }

  if (!user) {
    return null;
  }

  const selectedConversation = conversations.find(c => c.targetUserId === selectedUserId);
  const filteredConversations = conversations.filter(c =>
    c.targetFullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.targetUsername.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen bg-white dark:bg-gray-900 overflow-hidden">
      <QuizHeader />
      <div className="h-[calc(100vh-5rem)] flex mt-20">
        {/* Sidebar - Danh sách conversations */}
        <div
          className={cn(
            'bg-white dark:bg-gray-900 transition-all duration-300 flex flex-col',
            leftCollapsed ? 'w-0 overflow-hidden' : 'w-80'
          )}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setLeftCollapsed(true)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoadingConversations ? (
              <div className="p-4 text-center text-gray-500">Đang tải...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchQuery ? 'Không tìm thấy cuộc trò chuyện' : 'Chưa có cuộc trò chuyện nào'}
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.targetUserId}
                  onClick={() => {
                    setSelectedUserId(conversation.targetUserId);
                    router.push(`/messages?userId=${conversation.targetUserId}`);
                  }}
                  className={cn(
                    'p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800',
                    selectedUserId === conversation.targetUserId && 'bg-blue-50 dark:bg-blue-900/20'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar
                        src={conversation.targetAvatar || undefined}
                        name={conversation.targetFullName}
                        size="lg"
                      />
                      {isUserOnline(conversation.targetUserId) && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {conversation.targetFullName}
                        </h3>
                        {conversation.lastMessage && (
                          <span className="text-xs text-gray-500 ml-2">
                            {formatTime(conversation.lastMessage.timestamp)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {conversation.lastMessage?.type === 'sticker' ? 'Sticker' :
                           conversation.lastMessage?.type === 'icon' ? conversation.lastMessage.message :
                           conversation.lastMessage?.type === 'image' ? 'Hình ảnh' :
                           conversation.lastMessage?.message || 'Chưa có tin nhắn'}
                        </p>
                        {conversation.unreadCount > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Nút mở lại sidebar khi đã collapse */}
        {leftCollapsed && (
          <button
            onClick={() => setLeftCollapsed(false)}
            className="absolute left-0 top-20 p-2 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-h-0">
          {selectedUserId && selectedConversation ? (
            <>
              {/* Header */}
              <div className="p-4 bg-white dark:bg-gray-900">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={selectedConversation.targetAvatar || undefined}
                    name={selectedConversation.targetFullName}
                    size="lg"
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {selectedConversation.targetFullName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {isUserOnline(selectedUserId) ? 'Đang hoạt động' : 'Không hoạt động'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-3 space-y-1 bg-white dark:bg-gray-800 min-h-0"
              >
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 py-8">
                    <p className="text-sm">Chat càng nhiều, info càng rõ</p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, index) => {
                      const isMyMessage = msg.userId === user.userId;
                      const isSticker = msg.type === 'sticker' && msg.media && msg.media.includes('/') && msg.media.includes('.webp');
                      const isImage = msg.type === 'image';
                      const isTextMessage = msg.type !== 'icon' && !isSticker && !isImage;
                      
                      // Tính toán border radius cho tin nhắn text (giống ChatBoxInstance)
                      let borderRadiusClasses = 'rounded-2xl'; // Mặc định cho sticker/emoji
                      
                      if (isTextMessage) {
                        // Xác định nhóm tin nhắn TEXT liên tiếp từ cùng một người
                        const prevTextMsg = (() => {
                          for (let i = index - 1; i >= 0; i--) {
                            const prevMsg = messages[i];
                            if (prevMsg.userId !== msg.userId) break;
                            const prevIsSticker = prevMsg.type === 'sticker' && prevMsg.media && prevMsg.media.includes('/') && prevMsg.media.includes('.webp');
                            const prevIsImage = prevMsg.type === 'image';
                            if (prevMsg.userId === msg.userId && (prevMsg.type === 'icon' || prevIsSticker || prevIsImage)) break;
                            if (prevMsg.userId === msg.userId && prevMsg.type !== 'icon' && !prevIsSticker && !prevIsImage) {
                              return prevMsg;
                            }
                          }
                          return null;
                        })();
                        
                        const nextTextMsg = (() => {
                          for (let i = index + 1; i < messages.length; i++) {
                            const nextMsg = messages[i];
                            if (nextMsg.userId !== msg.userId) break;
                            const nextIsSticker = nextMsg.type === 'sticker' && nextMsg.media && nextMsg.media.includes('/') && nextMsg.media.includes('.webp');
                            const nextIsImage = nextMsg.type === 'image';
                            if (nextMsg.userId === msg.userId && (nextMsg.type === 'icon' || nextIsSticker || nextIsImage)) break;
                            if (nextMsg.userId === msg.userId && nextMsg.type !== 'icon' && !nextIsSticker && !nextIsImage) {
                              return nextMsg;
                            }
                          }
                          return null;
                        })();
                        
                        const isFirstInGroup = !prevTextMsg;
                        const isLastInGroup = !nextTextMsg;
                        
                        // Tính số lượng bubble TEXT trong nhóm
                        let groupSize = 1;
                        if (!isFirstInGroup || !isLastInGroup) {
                          let startIndex = index;
                          while (startIndex > 0) {
                            const prevMsg = messages[startIndex - 1];
                            if (prevMsg.userId !== msg.userId) break;
                            const prevIsSticker = prevMsg.type === 'sticker' && prevMsg.media && prevMsg.media.includes('/') && prevMsg.media.includes('.webp');
                            const prevIsImage = prevMsg.type === 'image';
                            if (prevMsg.userId === msg.userId && (prevMsg.type === 'icon' || prevIsSticker || prevIsImage)) break;
                            if (prevMsg.userId === msg.userId && prevMsg.type !== 'icon' && !prevIsSticker && !prevIsImage) {
                              startIndex--;
                            } else break;
                          }
                          
                          let endIndex = index;
                          while (endIndex < messages.length - 1) {
                            const nextMsg = messages[endIndex + 1];
                            if (nextMsg.userId !== msg.userId) break;
                            const nextIsSticker = nextMsg.type === 'sticker' && nextMsg.media && nextMsg.media.includes('/') && nextMsg.media.includes('.webp');
                            const nextIsImage = nextMsg.type === 'image';
                            if (nextMsg.userId === msg.userId && (nextMsg.type === 'icon' || nextIsSticker || nextIsImage)) break;
                            if (nextMsg.userId === msg.userId && nextMsg.type !== 'icon' && !nextIsSticker && !nextIsImage) {
                              endIndex++;
                            } else break;
                          }
                          
                          groupSize = 0;
                          for (let i = startIndex; i <= endIndex; i++) {
                            const msgMedia = messages[i]?.media;
                            const msgIsSticker = messages[i]?.type === 'sticker' && msgMedia && typeof msgMedia === 'string' && msgMedia.includes('/') && msgMedia.includes('.webp');
                            const msgIsImage = messages[i]?.type === 'image';
                            if (messages[i]?.userId === msg.userId && messages[i]?.type !== 'icon' && !msgIsSticker && !msgIsImage) {
                              groupSize++;
                            }
                          }
                        }
                        
                        const isGroupStart = isFirstInGroup;
                        const isGroupEnd = isLastInGroup;
                        const isGroupMiddle = groupSize > 2 && !isGroupStart && !isGroupEnd;
                        
                        if (groupSize === 1) {
                          borderRadiusClasses = 'rounded-2xl';
                        } else if (groupSize === 2) {
                          if (isGroupStart) {
                            borderRadiusClasses = isMyMessage ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl rounded-bl-sm';
                          } else {
                            borderRadiusClasses = isMyMessage ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl rounded-tl-sm';
                          }
                        } else {
                          if (isGroupStart) {
                            borderRadiusClasses = isMyMessage ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl rounded-bl-sm';
                          } else if (isGroupMiddle) {
                            borderRadiusClasses = isMyMessage ? 'rounded-2xl rounded-tr-sm rounded-br-sm' : 'rounded-2xl rounded-tl-sm rounded-bl-sm';
                          } else {
                            borderRadiusClasses = isMyMessage ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl rounded-tl-sm';
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
                          {!isMyMessage && (
                            <Avatar
                              src={msg.avatar || undefined}
                              name={msg.fullName}
                              size="sm"
                              className="flex-shrink-0 w-6 h-6"
                            />
                          )}
                          <div
                            className={cn(
                              'flex flex-col max-w-[75%] relative',
                              isMyMessage && 'items-end'
                            )}
                          >
                            {msg.type === 'image' && msg.media ? (
                              <div className="relative rounded-2xl overflow-hidden max-w-[200px] cursor-pointer hover:opacity-90 transition-opacity">
                                <Image
                                  src={msg.media}
                                  alt="Ảnh"
                                  width={200}
                                  height={200}
                                  className="w-full h-auto object-contain"
                                  style={{ width: 'auto', height: 'auto' }}
                                  unoptimized
                                />
                              </div>
                            ) : msg.type === 'sticker' && msg.media ? (
                              <div className={cn(
                                "relative flex items-center gap-2",
                                isMyMessage ? "flex-row-reverse" : ""
                              )}>
                                <Image
                                  src={getStickerUrl(msg.media)}
                                  alt="Sticker"
                                  width={120}
                                  height={120}
                                  className="w-[120px] h-[120px] object-contain"
                                  unoptimized
                                />
                              </div>
                            ) : msg.type === 'icon' && msg.media ? (
                              <div className="text-3xl relative">
                                {msg.media}
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
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input area */}
              <div className="p-4 relative flex-shrink-0 bg-white dark:bg-gray-900">
                <div className={cn(
                  "w-full max-w-sm mx-auto rounded-3xl px-4 py-3 flex items-center transition-all duration-200",
                  isFocused 
                    ? "bg-transparent dark:bg-gray-100" 
                    : "bg-gray-100 dark:bg-gray-700"
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
                    className="mr-3 p-1 opacity-50 hover:opacity-100 hover:scale-110 transition-all flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
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
                  
                  {/* Image preview trong input box */}
                  {selectedImage && (
                    <div className="relative mr-2 flex-shrink-0">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-600">
                        <Image
                          src={selectedImage.previewUrl}
                          alt="Preview"
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      </div>
                      <button
                        onClick={() => {
                          setSelectedImage(null);
                          URL.revokeObjectURL(selectedImage.previewUrl);
                        }}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 flex items-center justify-center transition-colors z-10"
                        aria-label="Hủy ảnh"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  )}
                  
                  <textarea
                    ref={inputRef}
                    value={inputMessage}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="Chat đi..."
                    disabled={!isConnected}
                    rows={1}
                    className="flex-1 bg-transparent text-md text-gray-800 dark:text-gray-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed resize-none overflow-y-auto max-h-[3rem] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                    style={{ minHeight: '1.5rem', lineHeight: '1.5rem', fontFamily: 'Roboto, sans-serif' }}
                  />
                  <button
                    onClick={() => {
                      setShowStickerPicker(!showStickerPicker);
                    }}
                    disabled={!isConnected}
                    className="hover:scale-110 opacity-50 hover:opacity-100 transition-all flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Chọn sticker"
                  >
                    <Image
                      src="/sticker.svg"
                      alt="Sticker"
                      width={17}
                      height={17}
                    />
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={(!inputMessage.trim() && !selectedImage) || !isConnected}
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

                {/* Sticker Picker */}
                {showStickerPicker && (
                  <div className="mt-2">
                    <StickerPicker
                      onSelectSticker={handleSelectSticker}
                      onSelectEmoji={handleSelectEmoji}
                      emojiList={EMOJI_ICONS}
                      onClose={() => setShowStickerPicker(false)}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Chọn một cuộc trò chuyện</h3>
                <p>Chọn một cuộc trò chuyện từ danh sách để bắt đầu nhắn tin</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
