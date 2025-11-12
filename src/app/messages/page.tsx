'use client';

import React from 'react';
import QuizHeader from '@/components/layout/QuizHeader';

export default function MessagesPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <QuizHeader />
      <div className="h-[calc(100vh-5rem)] flex items-center justify-center pt-20">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Trang đang phát triển
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Tính năng này sẽ sớm được ra mắt
          </p>
        </div>
      </div>
    </div>
  );
}

/* 
// Code cũ đã được comment lại
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useChatContext } from '@/components/chat/ChatProvider';
import { useAuth } from '@/hooks/useAuth';
import Avatar from '@/components/common/Avatar';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Smile, X, Search, ImageIcon } from 'lucide-react';
import QuizHeader from '@/components/layout/QuizHeader';
import StickerPicker, { getStickerUrl } from '@/components/ui/StickerPicker';

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
    error,
    getMessagesForUser,
    getTypingForUser,
    notifyTyping,
    setCurrentTargetUserId,
    setOpenConversation,
    isLoadingConversations,
  } = useChatContext();

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [infoSearchQuery, setInfoSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<boolean>(false);

  // ... rest of the code ...
}
*/
