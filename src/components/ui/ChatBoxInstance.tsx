'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useChatContext } from '@/components/chat/ChatProvider';
import { useAuth } from '@/hooks/useAuth';
import Avatar from '@/components/common/Avatar';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import StickerPicker, { getStickerUrl } from './StickerPicker';
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
    sendImage,
    updateImageMessageWithRealUrl,
    error,
    getMessagesForUser,
    getTypingForUser,
    getMessageCountForUser,
    getHasMoreForUser,
    isLoadingMore,
    loadMoreMessages,
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
  const [zoomedImage, setZoomedImage] = useState<string | null>(null); // URL ảnh đang được zoom
  const [imageRotation, setImageRotation] = useState<number>(0); // Góc xoay của ảnh (độ)
  // Image preview state (giống Facebook Messenger)
  const [selectedImage, setSelectedImage] = useState<{ file: File; previewUrl: string } | null>(null);
  // Sticker preview state
  const [selectedStickers, setSelectedStickers] = useState<string[]>([]); // 4 sticker được chọn để preview
  const [selectedStickerIndex, setSelectedStickerIndex] = useState<number>(-1); // Index của sticker được chọn
  const [isRecording, setIsRecording] = useState(false); // Đang ghi âm
  const [recordingTime, setRecordingTime] = useState(0); // Thời gian ghi âm (giây)
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null); // Audio đã ghi
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickerPickerRef = useRef<HTMLDivElement>(null);
  const stickerButtonRef = useRef<HTMLButtonElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<boolean>(false);
  const boxChatRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isLoadingMoreRef = useRef<boolean>(false);
  const [stickerPickerPosition, setStickerPickerPosition] = useState<{ bottom: number; left: number; width: number } | null>(null);
  // Map để lưu mapping giữa blob URL và real URL (để có thể zoom ngay cả khi blob URL đã bị revoke)
  const blobUrlToRealUrlMapRef = useRef<Map<string, string>>(new Map());
  // Refs cho ghi âm
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null); // Ref cho audio element để phát lại

  // Track xem đã scroll lần đầu khi mở boxchat chưa
  const hasScrolledToBottomRef = useRef<boolean>(false);
  const lastTargetUserIdRef = useRef<number | null>(null);
  
  // Scroll xuống dưới cùng khi mở boxchat lần đầu hoặc khi messages được load
  useEffect(() => {
    // Reset flag khi targetUserId thay đổi (mở boxchat mới)
    if (lastTargetUserIdRef.current !== targetUserId) {
      hasScrolledToBottomRef.current = false;
      lastTargetUserIdRef.current = targetUserId;
    }
    
    // Chỉ scroll nếu chưa scroll lần đầu và có messages
    if (!hasScrolledToBottomRef.current && messages.length > 0) {
      // Đợi một chút để đảm bảo DOM đã render xong
      const timer = setTimeout(() => {
        if (messagesContainerRef.current) {
          const container = messagesContainerRef.current;
          // Scroll xuống dưới cùng ngay lập tức (không smooth để nhanh hơn)
          container.scrollTop = container.scrollHeight;
          hasScrolledToBottomRef.current = true;
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [targetUserId, messages.length]); // Chạy khi mở boxchat mới hoặc khi messages được load
  
  // Auto scroll to bottom khi có tin nhắn mới hoặc typing indicator
  // Chỉ scroll nếu không đang load more (để giữ scroll position khi load more)
  useEffect(() => {
    if (!isLoadingMoreRef.current && !isLoadingMore) {
      // Nếu đã scroll lần đầu, dùng smooth scroll
      // Nếu chưa scroll lần đầu, scroll ngay lập tức (đã xử lý ở useEffect trên)
      if (hasScrolledToBottomRef.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else if (messagesContainerRef.current && messages.length > 0) {
        // Fallback: nếu chưa scroll lần đầu và có messages, scroll ngay
        const container = messagesContainerRef.current;
        container.scrollTop = container.scrollHeight;
        hasScrolledToBottomRef.current = true;
      }
    }
  }, [messages, isTyping, isLoadingMore]);

  // Scroll detection để load more khi scroll lên
  useEffect(() => {
    const messagesContainer = messagesContainerRef.current;
    if (!messagesContainer) return;

    const handleScroll = () => {
      // Kiểm tra nếu scroll gần đầu danh sách (trong vòng 100px)
      const scrollTop = messagesContainer.scrollTop;
      const hasMore = getHasMoreForUser(targetUserId);
      
      if (scrollTop < 100 && hasMore && !isLoadingMore && !isLoadingMoreRef.current) {
        isLoadingMoreRef.current = true;
        loadMoreMessages(targetUserId).finally(() => {
          isLoadingMoreRef.current = false;
        });
      }
    };

    messagesContainer.addEventListener('scroll', handleScroll);
    return () => {
      messagesContainer.removeEventListener('scroll', handleScroll);
    };
  }, [targetUserId, getHasMoreForUser, isLoadingMore, loadMoreMessages]);

  // Giữ nguyên scroll position khi load more (prepend messages)
  // Lưu scroll position trước khi load và restore sau khi messages được prepend
  const scrollHeightBeforeLoadRef = useRef<number>(0);
  const scrollTopBeforeLoadRef = useRef<number>(0);
  
  useEffect(() => {
    if (isLoadingMore && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      scrollHeightBeforeLoadRef.current = container.scrollHeight;
      scrollTopBeforeLoadRef.current = container.scrollTop;
    }
  }, [isLoadingMore]);

  useEffect(() => {
    // Sau khi load more xong và messages đã được cập nhật
    if (!isLoadingMore && scrollHeightBeforeLoadRef.current > 0 && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const newScrollHeight = container.scrollHeight;
      const heightDiff = newScrollHeight - scrollHeightBeforeLoadRef.current;
      
      // Restore scroll position với offset bằng height diff
      if (heightDiff > 0) {
        container.scrollTop = scrollTopBeforeLoadRef.current + heightDiff;
      }
      
      // Reset refs
      scrollHeightBeforeLoadRef.current = 0;
      scrollTopBeforeLoadRef.current = 0;
    }
  }, [messages, isLoadingMore]);

  // Tính toán vị trí của StickerPicker dựa trên button sticker
  useEffect(() => {
    if (showStickerPicker && stickerButtonRef.current) {
      const updatePosition = () => {
        if (stickerButtonRef.current) {
          const rect = stickerButtonRef.current.getBoundingClientRect();
          const pickerHeight = 480; // Chiều cao cố định 480px
          const pickerWidth = 340; // Chiều rộng cố định 340px
          const margin = 8; // mb-2 = 0.5rem = 8px
          
          // Tính toán left để lệch về bên trái của button sticker
          // Đặt StickerPicker sao cho cạnh phải của nó gần với cạnh trái của button
          const offset = 16; // Khoảng cách từ button
          const leftPosition = Math.max(16, rect.left - pickerWidth + offset);
          
          setStickerPickerPosition({
            bottom: window.innerHeight - rect.top + margin,
            left: leftPosition,
            width: pickerWidth,
          });
        }
      };

      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);

      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    } else {
      setStickerPickerPosition(null);
    }
  }, [showStickerPicker]);

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

  // Xử lý phím Escape để đóng modal zoom ảnh
  useEffect(() => {
    if (!zoomedImage) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setZoomedImage(null);
        setImageRotation(0);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [zoomedImage]);

  // Xử lý phím Escape để đóng box chat
  useEffect(() => {
    // Chỉ đóng box chat nếu không có modal zoom ảnh đang mở
    if (zoomedImage) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Chỉ đóng nếu box chat đang được focus hoặc textarea đang được focus
        if (boxChatRef.current?.contains(document.activeElement) || 
            inputRef.current === document.activeElement) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [zoomedImage, onClose]);

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

  // Kiểm tra nếu textarea đã được focus khi mount (do autofocus)
  useEffect(() => {
    // Sử dụng requestAnimationFrame để đảm bảo autofocus đã xảy ra
    requestAnimationFrame(() => {
      if (inputRef.current === document.activeElement) {
        setIsFocused(true);
      }
    });
  }, []);

  // Xử lý paste ảnh từ clipboard (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePasteEvent = (e: ClipboardEvent) => {
      // Chỉ xử lý khi boxchat đang focus (isFocused = true)
      if (!isFocused && document.activeElement !== inputRef.current) {
        return;
      }

      // Kiểm tra xem có ảnh trong clipboard không
      const items = e.clipboardData?.items;
      if (!items) return;

      // Tìm item là ảnh
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault(); // Ngăn paste text vào textarea
          
          const blob = item.getAsFile();
          if (!blob) return;

          // Tạo File object từ blob
          const file = new File([blob], `pasted-image-${Date.now()}.png`, { type: blob.type || 'image/png' });

          // Cleanup ảnh preview cũ nếu có (sử dụng setSelectedImage callback để lấy giá trị mới nhất)
          setSelectedImage((prev) => {
            if (prev) {
              URL.revokeObjectURL(prev.previewUrl);
            }
            // Tạo preview URL để hiển thị ở input area
            const previewUrl = URL.createObjectURL(file);
            return { file, previewUrl };
          });
          
          break; // Chỉ xử lý ảnh đầu tiên
        }
      }
    };

    // Lắng nghe paste event trên document để bắt được khi user paste vào bất kỳ đâu trong boxchat
    document.addEventListener('paste', handlePasteEvent);

    return () => {
      document.removeEventListener('paste', handlePasteEvent);
    };
  }, [isFocused]); // Chỉ cần isFocused trong dependency

  // Chỉ hiển thị cho user đã đăng nhập
  if (!isInitialized || !user) {
    return null;
  }

  // Ref để ngăn gửi message nhiều lần
  const isSendingRef = useRef<boolean>(false);
  
  const handleSendMessage = () => {
    // Ngăn gửi nhiều lần
    if (isSendingRef.current) {
      return;
    }
    
    // Gửi ảnh nếu có
    if (selectedImage) {
      handleSendImagePreview();
      return;
    }
    
    if (inputMessage.trim()) {
      // Đánh dấu đang gửi
      isSendingRef.current = true;
      
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
      
      const messageToSend = inputMessage.trim();
      setInputMessage(''); // Clear input ngay để tránh gửi lại
      setShowStickerPicker(false);
      
      // Reset textarea height về 1 dòng
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
        const lineHeight = parseInt(getComputedStyle(inputRef.current).lineHeight) || 24;
        inputRef.current.style.height = `${lineHeight}px`;
        inputRef.current.style.overflowY = 'hidden';
      }
      
      // Gửi message
      sendMessage(messageToSend, targetUserId);
      
      // Reset flag sau khi gửi xong (đợi một chút để tránh race condition)
      setTimeout(() => {
        isSendingRef.current = false;
      }, 500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

  // Hàm lấy 4 sticker từ category để preview, đảm bảo sticker được chọn nằm trong đó
  const getPreviewStickers = (stickerId: string): string[] => {
    // stickerId format: "category/filename" (ví dụ: "bts/10.thumb128.webp")
    const [category] = stickerId.split('/');
    
    // Hardcode một số stickers cho mỗi category (giống như trong StickerPicker)
    const stickerMap: Record<string, string[]> = {
      bts: Array.from({ length: 20 }, (_, i) => `bts/${i + 5}.thumb128.webp`),
      cat: Array.from({ length: 24 }, (_, i) => `cat/${i}-1.thumb128.webp`),
      wechat: Array.from({ length: 20 }, (_, i) => `wechat/${i + 5}.thumb128.webp`),
      wonyoung: Array.from({ length: 34 }, (_, i) => `wonyoung/${i + 1}.thumb128.webp`),
      xuka: Array.from({ length: 23 }, (_, i) => `xuka/${i + 1}.thumb128.webp`),
    };
    
    const stickers = stickerMap[category] || [];
    
    // Tìm index của sticker được chọn trong danh sách
    const selectedIndex = stickers.findIndex(s => s === stickerId);
    
    if (selectedIndex === -1) {
      // Nếu không tìm thấy, trả về 4 sticker đầu tiên
      return stickers.slice(0, 4);
    }
    
    // Đảm bảo sticker được chọn nằm trong preview
    // Nếu sticker ở đầu danh sách (index 0-2), lấy 4 sticker đầu tiên
    // Nếu sticker ở giữa hoặc cuối, lấy 4 sticker với sticker được chọn ở vị trí thứ 2 (index 1)
    if (selectedIndex <= 2) {
      return stickers.slice(0, 4);
    } else if (selectedIndex >= stickers.length - 2) {
      // Nếu sticker ở cuối danh sách, lấy 4 sticker cuối cùng
      return stickers.slice(-4);
    } else {
      // Lấy 4 sticker với sticker được chọn ở vị trí thứ 2 (index 1 trong preview)
      const startIndex = selectedIndex - 1;
      return stickers.slice(startIndex, startIndex + 4);
    }
  };

  const handleStickerClick = (stickerId: string) => {
    // Hiển thị preview thay vì gửi ngay
    const previewStickers = getPreviewStickers(stickerId);
    setSelectedStickers(previewStickers);
    // Tìm index của sticker được chọn trong preview
    const index = previewStickers.findIndex(s => s === stickerId);
    setSelectedStickerIndex(index >= 0 ? index : 0);
    setShowStickerPicker(false);
  };

  // Hàm đóng preview sticker
  const handleCloseStickerPreview = () => {
    // Dừng recording nếu đang ghi âm
    if (isRecording) {
      stopRecording();
    }
    // Clear timeout nếu có
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    // Reset tất cả state
    setSelectedStickers([]);
    setSelectedStickerIndex(-1);
    setRecordedAudio(null);
    setRecordingTime(0);
    recordingStickerIdRef.current = null;
    recordedAudioBlobRef.current = null;
    mouseDownTimeRef.current = null;
    hasClickedRef.current = false;
    recordingStartTimeRef.current = null;
    isWaitingForStopCallbackRef.current = false;
  };

  // Ref để lưu blob URL đã được gửi (để không revoke trong cleanup)
  const sentBlobUrlsRef = useRef<Set<string>>(new Set());
  
  // Cleanup khi unmount: chỉ revoke blob URL nếu chưa được gửi
  useEffect(() => {
    return () => {
      if (selectedImage && !sentBlobUrlsRef.current.has(selectedImage.previewUrl)) {
        URL.revokeObjectURL(selectedImage.previewUrl);
      }
    };
  }, [selectedImage]);

  // Hàm gửi sticker (có thể có audio)
  const handleSendSticker = async (stickerId: string, audioBlob?: Blob) => {
    if (audioBlob) {
      // Upload audio trước
      try {
        const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });
        const response = await chatApiService.uploadAudio(audioFile);
        const audioUrl = response.data.urlFile;
        
        // Gửi sticker với audio
        sendStickerWithAudio(stickerId, audioUrl);
      } catch {
        sendSticker(stickerId, targetUserId);
      }
    } else {
      // Gửi sticker không có audio
      sendSticker(stickerId, targetUserId);
    }
    
    // Reset preview
    handleCloseStickerPreview();
  };

  // Hàm gửi sticker với audio
  const sendStickerWithAudio = async (stickerId: string, audioUrl: string) => {
    sendSticker(stickerId, targetUserId, audioUrl);
  };

  // Ref để lưu stickerId và audio blob khi recording
  const recordingStickerIdRef = useRef<string | null>(null);
  const recordedAudioBlobRef = useRef<Blob | null>(null);
  const mouseDownTimeRef = useRef<number | null>(null); // Thời điểm bắt đầu mouseDown
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Timeout để phân biệt click và hold
  const hasClickedRef = useRef<boolean>(false); // Đánh dấu đã click để gửi sticker
  const recordingStartTimeRef = useRef<number | null>(null); // Thời điểm bắt đầu recording
  const isWaitingForStopCallbackRef = useRef<boolean>(false); // Đánh dấu đang chờ onstop callback hoàn thành

  // Hàm bắt đầu ghi âm
  const startRecording = async (stickerId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recordingStickerIdRef.current = stickerId;
      recordingStartTimeRef.current = Date.now();
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        setRecordedAudio(audioBlob);
        recordedAudioBlobRef.current = audioBlob;
        stream.getTracks().forEach(track => track.stop());
        
        const currentStickerId = recordingStickerIdRef.current;
        
        // Luôn gửi sticker khi đã bắt đầu recording
        // Nếu có audio (size > 0), gửi kèm audio
        if (currentStickerId) {
          setTimeout(() => {
            if (recordedAudioBlobRef.current && recordedAudioBlobRef.current.size > 0) {
              // Có audio được ghi → gửi kèm audio
              handleSendSticker(currentStickerId, recordedAudioBlobRef.current);
            } else {
              // Không có audio hoặc size = 0 → gửi không có audio
              handleSendSticker(currentStickerId);
            }
            recordedAudioBlobRef.current = null;
            recordingStickerIdRef.current = null;
            recordingStartTimeRef.current = null;
            // Reset flag chờ onstop callback
            isWaitingForStopCallbackRef.current = false;
          }, 200);
        } else {
          // Reset state nếu không có stickerId
          recordedAudioBlobRef.current = null;
          recordingStickerIdRef.current = null;
          recordingStartTimeRef.current = null;
          // Reset flag chờ onstop callback
          isWaitingForStopCallbackRef.current = false;
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      // Sử dụng timeslice 100ms để đảm bảo data được thu thập ngay cả khi recording ngắn
      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      
      // Tự động dừng sau 60 giây
      recordingTimeoutRef.current = setTimeout(() => {
        stopRecording();
      }, 60000);
      
      // Cập nhật thời gian ghi âm mỗi 100ms để progress chạy mượt
      recordingIntervalRef.current = setInterval(() => {
        const startTime = recordingStartTimeRef.current;
        if (startTime) {
          const elapsedMs = Date.now() - startTime;
          const elapsedSeconds = elapsedMs / 1000;
          if (elapsedSeconds >= 60) {
            stopRecording();
            setRecordingTime(60);
          } else {
            // Cập nhật với giá trị chính xác theo milliseconds để progress mượt
            setRecordingTime(elapsedSeconds);
          }
        }
      }, 100);
    } catch {
      alert('Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.');
    }
  };

  // Hàm dừng ghi âm
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Đánh dấu đang chờ onstop callback
      isWaitingForStopCallbackRef.current = true;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      // Reset recording time
      setRecordingTime(0);
    }
  };

  // Cleanup khi unmount
  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  // Hàm mở ảnh zoom và reset góc xoay
  const handleOpenZoom = (imageUrl: string, messageId?: string) => {
    // Nếu URL là blob URL, tìm URL thật từ nhiều nguồn
    let finalUrl = imageUrl;
    if (imageUrl.startsWith('blob:')) {
      // 1. Tìm trong mapping ref trước (nhanh nhất và đáng tin cậy nhất)
      const mappedUrl = blobUrlToRealUrlMapRef.current.get(imageUrl);
      if (mappedUrl) {
        finalUrl = mappedUrl;
      } else {
        // 2. Tìm trong local state (messages)
        let updatedMessage = messages.find(
          (msg) =>
            msg.type === 'image' &&
            (messageId ? msg.id === messageId : msg.media === imageUrl) &&
            msg.media &&
            !msg.media.startsWith('blob:')
        );
        
        // 3. Nếu không tìm thấy trong local state, tìm trong useChat context
        if (!updatedMessage) {
          const currentMessages = getMessagesForUser(targetUserId);
          updatedMessage = currentMessages.find(
            (msg) =>
              msg.type === 'image' &&
              (messageId ? msg.id === messageId : msg.media === imageUrl) &&
              msg.media &&
              !msg.media.startsWith('blob:')
          );
        }
        
        if (updatedMessage?.media) {
          finalUrl = updatedMessage.media;
          // Lưu vào mapping để lần sau không cần tìm lại
          blobUrlToRealUrlMapRef.current.set(imageUrl, finalUrl);
        } else {
          // 4. Nếu vẫn không tìm thấy, thử đợi một chút rồi tìm lại (có thể đang trong quá trình upload)
          setTimeout(() => {
            const retryMessages = getMessagesForUser(targetUserId);
            const retryMessage = retryMessages.find(
              (msg) =>
                msg.type === 'image' &&
                (messageId ? msg.id === messageId : true) &&
                msg.media &&
                !msg.media.startsWith('blob:') &&
                msg.userId === user?.userId
            );
            if (retryMessage?.media) {
              blobUrlToRealUrlMapRef.current.set(imageUrl, retryMessage.media);
              setZoomedImage(retryMessage.media);
              setImageRotation(0);
            }
          }, 500);
          return; // Return sớm, sẽ set zoom sau khi tìm thấy
        }
      }
    }
    
    setZoomedImage(finalUrl);
    setImageRotation(0);
  };

  // Hàm xoay ảnh 90 độ
  const handleRotateImage = () => {
    setImageRotation((prev) => (prev + 90) % 360);
  };

  // Hàm đóng modal và reset góc xoay
  const handleCloseZoom = () => {
    setZoomedImage(null);
    setImageRotation(0);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Cleanup ảnh preview cũ nếu có
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage.previewUrl);
    }

    // Tạo preview URL để hiển thị ở input area (giống Facebook Messenger)
    const previewUrl = URL.createObjectURL(file);
    
    // Lưu vào state để hiển thị preview, không gửi ngay
    setSelectedImage({ file, previewUrl });
    
    // Reset input để có thể chọn lại cùng file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  // Hàm hủy ảnh preview
  const handleCancelImage = () => {
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage.previewUrl);
      setSelectedImage(null);
    }
  };

  // Hàm gửi ảnh từ preview
  const handleSendImagePreview = async () => {
    if (!selectedImage) return;

    const { file, previewUrl } = selectedImage;

    // Gửi typing stop trước khi gửi ảnh
    if (lastTypingSentRef.current) {
      notifyTyping(false);
      lastTypingSentRef.current = false;
    }
    
    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Lưu text message để gửi sau
    const textToSend = inputMessage.trim();

    // Đánh dấu blob URL đã được gửi TRƯỚC KHI clear selectedImage
    // Để cleanup effect không revoke blob URL
    sentBlobUrlsRef.current.add(previewUrl);
    
    // Optimistic update: hiển thị ảnh ngay với blob URL, upload trong background
    // Đảm bảo currentTargetUserId được set để optimistic update hoạt động
    setCurrentTargetUserId(targetUserId);
    
    // Hiển thị ảnh ngay lập tức với blob URL (optimistic update)
    // sendImage với blob URL sẽ chỉ hiển thị optimistic update, không gửi qua WebSocket
    sendImage(previewUrl, targetUserId);
    
    // Đợi một chút để message được thêm vào cache và sync vào local state
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Force sync messages ngay lập tức để đảm bảo hiển thị
    const newMessages = getMessagesForUser(targetUserId);
    setMessages(newMessages);
    
    // Clear state SAU KHI đã gửi và sync (blob URL đã được đánh dấu nên không bị revoke)
    setSelectedImage(null);
    setInputMessage('');
    setShowStickerPicker(false);
    
    // Reset textarea height về 1 dòng
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const lineHeight = parseInt(getComputedStyle(inputRef.current).lineHeight) || 24;
      inputRef.current.style.height = `${lineHeight}px`;
      inputRef.current.style.overflowY = 'hidden';
    }

    // Upload ảnh lên server trong background và cập nhật với URL thật sau
    (async () => {
      try {
        // Upload ảnh lên server
        const response = await chatApiService.uploadImage(file);
        const uploadedUrl = response.data.urlFile;

        // Lưu mapping blob URL -> real URL để có thể zoom ngay cả khi blob URL đã bị revoke
        blobUrlToRealUrlMapRef.current.set(previewUrl, uploadedUrl);

        // Đợi một chút để message được thêm vào state
        await new Promise(resolve => setTimeout(resolve, 300));

        // Cập nhật message với blob URL thành URL thật và gửi qua WebSocket
        // Hàm này sẽ tìm message với blob URL, cập nhật thành URL thật, và gửi qua WebSocket với cùng temp ID
        await updateImageMessageWithRealUrl(previewUrl, uploadedUrl, targetUserId);

        // Revoke preview URL sau khi đã cập nhật message (đợi lâu hơn để đảm bảo)
        setTimeout(() => {
          const currentMessages = getMessagesForUser(targetUserId);
          const stillHasBlobUrl = currentMessages.some(
            (msg) =>
              msg.type === 'image' &&
              msg.media === previewUrl &&
              msg.userId === user?.userId
          );
          
          // Chỉ revoke nếu không còn message nào dùng blob URL này
          if (!stillHasBlobUrl) {
            URL.revokeObjectURL(previewUrl);
            sentBlobUrlsRef.current.delete(previewUrl);
          }
        }, 5000); // Tăng thời gian chờ lên 5 giây để đảm bảo message đã được cập nhật và render xong
      } catch (error) {
        // Nếu upload thất bại, giữ lại blob URL để hiển thị
        console.error('Failed to upload image:', error);
        // Không revoke blob URL để user vẫn thấy ảnh
      }
    })();

    // Gửi text message nếu có (gửi riêng sau ảnh)
    if (textToSend) {
      sendMessage(textToSend, targetUserId);
    }
  };

  const getTargetName = () => {
    const conv = conversations.find((c) => c.targetUserId === targetUserId);
    // Nếu có conversation và targetFullName không phải là placeholder
    if (conv && conv.targetFullName && conv.targetFullName !== `User ${targetUserId}` && !conv.targetFullName.startsWith('User ')) {
      return conv.targetFullName;
    }
    // Nếu không có conversation hoặc có placeholder name, tìm trong onlineUsersList
    const onlineUser = onlineUsersList.find((u) => u.userId === targetUserId);
    if (onlineUser?.fullName) {
      return onlineUser.fullName;
    }
    // Fallback về conversation nếu có
    if (conv?.targetFullName) {
      return conv.targetFullName;
    }
    // Cuối cùng fallback về User ${targetUserId}
    return `User ${targetUserId}`;
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
  const boxWidth = 340;
  const boxGap = 20;
  const rightOffset = `calc(1rem + 80px + ${(totalBoxes - 1 - index) * (boxWidth + boxGap)}px)`;
  
  // Z-index: box sau có z-index cao hơn để không bị đè
  const zIndex = 50 + index;

  // Handler để focus vào textarea khi click vào boxchat
  const handleBoxChatClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Chỉ focus nếu click không phải vào các phần tử tương tác (buttons, links, inputs, etc.)
    const target = e.target as HTMLElement;
    const isInteractiveElement = 
      target.tagName === 'BUTTON' ||
      target.tagName === 'A' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('textarea');
    
    if (!isInteractiveElement && inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div
      ref={boxChatRef}
      onClick={handleBoxChatClick}
      className={cn(
        'fixed bottom-0',
        'bg-white dark:bg-gray-900',
        'rounded-t-2xl',
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
      <div className="flex items-center justify-between p-4 flex-shrink-0">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative">
            <div
              className={cn(
                'w-3 h-3 rounded-full absolute -bottom-0 -right-0 border-2 border-white dark:border-gray-800 z-10',
                isConnected ? 'bg-green-500' : 'bg-red-500'
              )}
            />
            {getTargetAvatar() ? (
              <Avatar
                src={getTargetAvatar() || undefined}
                name={getTargetName()}
                size="sm"
                className="w-10 h-10"
              />
            ) : (
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-md"
                style={{ backgroundColor: getRandomColor(getTargetName()) }}
              >
                {getFirstLetter(getTargetName())}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-600 dark:text-white truncate">
              {getTargetName().length > 20 ? `${getTargetName().substring(0, 20)}...` : getTargetName()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/messages?userId=${targetUserId}`)}
            className="transition-colors"
            title="Mở rộng chat"
          >
            <Image
              src="/expand.svg"
              alt="Expand"
              width={12}
              height={12}
              className="dark:invert"
            />
          </button>
          <button
            onClick={onClose}
            className="ransition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
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
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-3 space-y-1"
        >
          {/* Loading indicator khi load more */}
          {isLoadingMore && (
            <div className="flex justify-center py-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">Đang tải...</div>
            </div>
          )}
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <p className="text-sm">Chat tìm bạn học cùng cho bớt nản</p>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => {
                const isMyMessage = msg.userId === user.userId;
                const isSticker = msg.type === 'sticker' && msg.media && msg.media.includes('/') && msg.media.includes('.webp');
                const isImage = msg.type === 'image';
                const isTextMessage = msg.type !== 'icon' && !isSticker && !isImage;
                
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
                      const prevIsSticker = prevMsg.type === 'sticker' && prevMsg.media && prevMsg.media.includes('/') && prevMsg.media.includes('.webp');
                      const prevIsImage = prevMsg.type === 'image';
                      if (prevMsg.userId === msg.userId && (prevMsg.type === 'icon' || prevIsSticker || prevIsImage)) {
                        // Gặp sticker/emoji/ảnh thì dừng lại, không tiếp tục tìm
                        break;
                      }
                      if (prevMsg.userId === msg.userId && prevMsg.type !== 'icon' && !prevIsSticker && !prevIsImage) {
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
                      const nextIsSticker = nextMsg.type === 'sticker' && nextMsg.media && nextMsg.media.includes('/') && nextMsg.media.includes('.webp');
                      const nextIsImage = nextMsg.type === 'image';
                      if (nextMsg.userId === msg.userId && (nextMsg.type === 'icon' || nextIsSticker || nextIsImage)) {
                        // Gặp sticker/emoji/ảnh thì dừng lại, không tiếp tục tìm
                        break;
                      }
                      if (nextMsg.userId === msg.userId && nextMsg.type !== 'icon' && !nextIsSticker && !nextIsImage) {
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
                      const prevIsSticker = prevMsg.type === 'sticker' && prevMsg.media && prevMsg.media.includes('/') && prevMsg.media.includes('.webp');
                      const prevIsImage = prevMsg.type === 'image';
                      if (prevMsg.userId === msg.userId && (prevMsg.type === 'icon' || prevIsSticker || prevIsImage)) {
                        // Gặp sticker/emoji/ảnh thì dừng lại
                        break;
                      }
                      if (prevMsg.userId === msg.userId && prevMsg.type !== 'icon' && !prevIsSticker && !prevIsImage) {
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
                      const nextIsSticker = nextMsg.type === 'sticker' && nextMsg.media && nextMsg.media.includes('/') && nextMsg.media.includes('.webp');
                      const nextIsImage = nextMsg.type === 'image';
                      if (nextMsg.userId === msg.userId && (nextMsg.type === 'icon' || nextIsSticker || nextIsImage)) {
                        // Gặp sticker/emoji/ảnh thì dừng lại
                        break;
                      }
                      if (nextMsg.userId === msg.userId && nextMsg.type !== 'icon' && !nextIsSticker && !nextIsImage) {
                        endIndex++;
                      } else {
                        break;
                      }
                    }
                    
                    // Đếm số lượng tin nhắn TEXT trong khoảng này
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
                      {/* Kiểm tra ảnh trước */}
                      {msg.type === 'image' && msg.media ? (
                        <div 
                          className="relative rounded-2xl overflow-hidden max-w-[200px] cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => handleOpenZoom(msg.media!, msg.id)}
                        >
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
                          {/* Thứ tự trong DOM: sticker trước, icon sau */}
                          {/* Đối với người gửi (flex-row-reverse): icon ở bên trái sticker */}
                          {/* Đối với người nhận (không flex-row-reverse): icon ở bên phải sticker */}
                          <Image
                            src={getStickerUrl(msg.media)}
                            alt="Sticker"
                            width={120}
                            height={120}
                            className="w-[120px] h-[120px] object-contain"
                            unoptimized // Vì là animated webp
                          />
                          {msg.audio && (
                            <button
                              onClick={() => {
                                const audioUrl = msg.audio;
                                if (!audioUrl) {
                                  return;
                                }
                                
                                if (audioRef.current) {
                                  if (audioRef.current.paused) {
                                    audioRef.current.src = audioUrl;
                                    audioRef.current.play().catch(() => {});
                                  } else {
                                    audioRef.current.pause();
                                    audioRef.current.currentTime = 0;
                                  }
                                } else {
                                  const audio = new Audio(audioUrl);
                                  audioRef.current = audio;
                                  audio.play().catch(() => {});
                                  audio.onended = () => {
                                    audioRef.current = null;
                                  };
                                  audio.onerror = () => {};
                                }
                              }}
                              className="flex-shrink-0 p-1.5 rounded-full bg-white hover:bg-gray-50 transition-colors"
                              aria-label="Phát audio"
                            >
                              <Image
                                src="/loa.svg"
                                alt="Loa"
                                width={16}
                                height={16}
                                className={cn(
                                  "w-4 h-4",
                                  isMyMessage && "rotate-180"
                                )}
                              />
                            </button>
                          )}
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
          
          {/* Sticker preview với audio recording */}
          {selectedStickers.length > 0 && (
            <div className="mb-3 relative">
              {/* Nút đóng preview */}
              <button
                onClick={handleCloseStickerPreview}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center transition-colors z-10"
                aria-label="Đóng preview"
              >
                <X className="w-3 h-3 text-gray-600 dark:text-gray-300" />
              </button>
              
              {/* Text hướng dẫn */}
              <p className="text-xs text-center mb-2" style={{ color: '#8D7EF7' }}>
                Giữ Sticker để thu âm
              </p>
              
              {/* Hàng sticker preview */}
              <div className="flex gap-2 justify-center items-center">
                {selectedStickers.map((stickerId, index) => {
                  const isSelected = index === selectedStickerIndex;
                  const isCurrentRecording = isRecording && isSelected;
                  
                  return (
                    <div
                      key={stickerId}
                      className={cn(
                        "relative cursor-pointer transition-all",
                        isSelected ? "scale-110" : "opacity-50"
                      )}
                      onClick={(e) => {
                        // Click vào sticker → gửi ngay không có audio
                        // Ngăn onClick khi đang recording hoặc đang chờ onstop callback
                        if (!isRecording && !hasClickedRef.current && !isWaitingForStopCallbackRef.current) {
                          e.preventDefault();
                          e.stopPropagation();
                          hasClickedRef.current = true;
                          // Clear timeout nếu có để không bắt đầu recording
                          if (clickTimeoutRef.current) {
                            clearTimeout(clickTimeoutRef.current);
                            clickTimeoutRef.current = null;
                          }
                          handleSendSticker(stickerId);
                        }
                      }}
                      onMouseDown={(e) => {
                        if (!isRecording && !hasClickedRef.current) {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedStickerIndex(index);
                          mouseDownTimeRef.current = Date.now();
                          hasClickedRef.current = false; // Reset flag khi bắt đầu mouseDown
                          
                          // Đợi 150ms để phân biệt click và hold
                          clickTimeoutRef.current = setTimeout(() => {
                            // Nếu giữ lâu hơn 150ms và chưa click, bắt đầu ghi âm
                            if (mouseDownTimeRef.current !== null && !hasClickedRef.current) {
                              startRecording(stickerId);
                            }
                          }, 150);
                        }
                      }}
                      onMouseUp={(e) => {
                        mouseDownTimeRef.current = null;
                        
                        if (clickTimeoutRef.current) {
                          clearTimeout(clickTimeoutRef.current);
                          clickTimeoutRef.current = null;
                        }
                        
                        // Nếu đang ghi âm, dừng lại và gửi
                        if (isRecording && isSelected) {
                          e.preventDefault();
                          stopRecording();
                        }
                        // Reset flag sau một chút để tránh conflict
                        setTimeout(() => {
                          hasClickedRef.current = false;
                        }, 100);
                      }}
                      onMouseLeave={(e) => {
                        mouseDownTimeRef.current = null;
                        hasClickedRef.current = false;
                        if (clickTimeoutRef.current) {
                          clearTimeout(clickTimeoutRef.current);
                          clickTimeoutRef.current = null;
                        }
                        
                        if (isRecording && isSelected) {
                          e.preventDefault();
                          stopRecording();
                        }
                      }}
                      onTouchStart={(e) => {
                        if (!isRecording && !hasClickedRef.current) {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedStickerIndex(index);
                          mouseDownTimeRef.current = Date.now();
                          hasClickedRef.current = false; // Reset flag khi bắt đầu touchStart
                          
                          // Đợi 150ms để phân biệt tap và hold
                          clickTimeoutRef.current = setTimeout(() => {
                            if (mouseDownTimeRef.current !== null && !hasClickedRef.current) {
                              startRecording(stickerId);
                            }
                          }, 150);
                        }
                      }}
                      onTouchEnd={(e) => {
                        mouseDownTimeRef.current = null;
                        
                        if (clickTimeoutRef.current) {
                          clearTimeout(clickTimeoutRef.current);
                          clickTimeoutRef.current = null;
                        }
                        
                        if (isRecording && isSelected) {
                          e.preventDefault();
                          stopRecording();
                        }
                        // Reset flag sau một chút để tránh conflict
                        setTimeout(() => {
                          hasClickedRef.current = false;
                        }, 100);
                      }}
                    >
                      {/* Sticker image */}
                      <div
                        className={cn(
                          "w-16 h-16 rounded-lg overflow-hidden",
                          isSelected ? "" : "bg-white opacity-50"
                        )}
                      >
                        <Image
                          src={getStickerUrl(stickerId)}
                          alt="Sticker"
                          width={64}
                          height={64}
                          className="w-full h-full object-contain"
                          unoptimized
                        />
                      </div>
                      
                      {/* Loading overlay khi đang ghi âm - không có background, đè lên sticker */}
                      {isCurrentRecording && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          {/* Circular progress với microphone icon */}
                          <div className="relative w-12 h-12">
                            <svg
                              className="w-12 h-12 transform -rotate-90"
                              viewBox="0 0 48 48"
                            >
                              {/* Background circle */}
                              <circle
                                cx="24"
                                cy="24"
                                r="20"
                                fill="none"
                                stroke="rgba(141, 126, 247, 0.2)"
                                strokeWidth="3"
                              />
                              {/* Progress circle - màu tím */}
                              <circle
                                cx="24"
                                cy="24"
                                r="20"
                                fill="none"
                                stroke="#8D7EF7"
                                strokeWidth="3"
                                strokeDasharray={`${2 * Math.PI * 20}`}
                                strokeDashoffset={`${2 * Math.PI * 20 * (1 - Math.min(recordingTime / 60, 1))}`}
                                strokeLinecap="round"
                              />
                            </svg>
                            {/* Microphone icon ở giữa */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                style={{ color: '#8D7EF7' }}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          <div className={cn(
            "w-full max-w-sm mx-auto rounded-3xl px-4 py-3 flex items-center transition-all duration-200 border-2 border-gray-100 dark:border-white/10",
            isFocused 
              ? "bg-transparent" 
              : "bg-gray-100 dark:bg-gray-900"
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
              className="mr-3 p-1 opacity-30 hover:opacity-100 hover:scale-110 transition-all flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Chọn ảnh"
            >
              <svg
                className="w-4 h-4 text-gray-600 dark:text-white/100"
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
            
            {/* Image preview trong input box (giống Facebook Messenger) */}
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
                {/* Nút đóng preview */}
                <button
                  onClick={handleCancelImage}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 flex items-center justify-center transition-colors z-10 border border-white dark:border-gray-800"
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
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onPaste={(e) => {
                // Xử lý paste trong textarea
                // Nếu là ảnh, ngăn paste text vào textarea (sẽ được xử lý bởi useEffect paste handler)
                const items = e.clipboardData?.items;
                if (items) {
                  for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                      e.preventDefault();
                      // Logic xử lý ảnh sẽ được thực hiện trong useEffect paste handler
                      return;
                    }
                  }
                }
              }}
              placeholder="Chat đi..."
              disabled={!isConnected}
              autoFocus
              rows={1}
              className="flex-1 bg-transparent text-md text-gray-800 dark:text-gray-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed resize-none overflow-y-auto max-h-[3rem] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              style={{ minHeight: '1.5rem', lineHeight: '1.5rem'}}
            />
            <button
              ref={stickerButtonRef}
              data-sticker-button
              onClick={() => {
                setShowStickerPicker(!showStickerPicker);
              }}
              disabled={!isConnected}
              className="hover:scale-110 opacity-30 hover:opacity-100 transition-all flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Chọn sticker"
            >
              <svg 
                width="17" 
                height="19" 
                viewBox="0 0 19 21" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="text-gray-600 dark:text-white"
              >
                <path 
                  d="M17.75 11.75C17.75 16.4444 13.9444 20.25 9.25 20.25C4.55558 20.25 0.75 16.4444 0.75 11.75C0.75 5.25 7.25 0.75 9.25 0.75C11.25 0.75 17.75 5.25 17.75 11.75Z" 
                  stroke="currentColor" 
                  strokeWidth="1.5"
                />
                <circle 
                  cx="6.75" 
                  cy="9.75" 
                  r="1" 
                  fill="currentColor"
                />
                <circle 
                  cx="11.75" 
                  cy="9.75" 
                  r="1" 
                  fill="currentColor"
                />
                <path 
                  d="M7.75878 13.6652C8.33559 13.8908 9.76112 14.0967 10.8488 13.1154" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinecap="round"
                />
              </svg>
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
        </div>
      </div>

      {/* Modal zoom ảnh */}
      {zoomedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 dark:bg-opacity-95 z-[100] flex items-center justify-center p-4"
          onClick={handleCloseZoom}
        >
          <div
            className="relative w-full h-full max-w-7xl max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                transform: `rotate(${imageRotation}deg)`,
                transition: 'transform 0.3s ease-in-out',
              }}
              className="relative w-full h-full flex items-center justify-center"
            >
              <Image
                src={zoomedImage}
                alt="Ảnh phóng to"
                fill
                className="object-contain"
                quality={100}
                sizes="100vw"
                unoptimized
              />
            </div>
            {/* Container các nút điều khiển ở phía dưới */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4 z-[101]">
              {/* Nút xoay ảnh */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRotateImage();
                }}
                className="text-white hover:text-gray-300 transition-colors bg-black bg-opacity-50 rounded-full p-3"
                aria-label="Xoay ảnh"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
              {/* Nút đóng */}
              <button
                onClick={handleCloseZoom}
                className="text-white hover:text-gray-300 transition-colors bg-black bg-opacity-50 rounded-full p-3"
                aria-label="Đóng"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Render StickerPicker qua Portal để nằm ngoài ChatBoxInstance */}
      {showStickerPicker && stickerPickerPosition && typeof window !== 'undefined' && createPortal(
        <div ref={stickerPickerRef}>
          <StickerPicker
            onSelectSticker={handleStickerClick}
            onSelectEmoji={handleEmojiClick}
            emojiList={EMOJI_ICONS}
            onClose={() => setShowStickerPicker(false)}
            position={{
              bottom: stickerPickerPosition.bottom,
              left: stickerPickerPosition.left,
            }}
          />
        </div>,
        document.body
      )}
    </div>
  );
}

