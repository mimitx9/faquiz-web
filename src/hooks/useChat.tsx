'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Pusher from 'pusher-js';
import { useAuth } from './useAuth';
import { chatApiService } from '@/lib/api';

export interface ChatMessage {
  id: string;
  userId: number;
  username: string;
  fullName: string;
  avatar?: string | null;
  message: string;
  timestamp: number;
  type: 'message' | 'icon' | 'sticker';
  icon?: string | null; // Emoji hoặc icon name nếu type là 'icon', hoặc sticker ID nếu type là 'sticker'
}

export interface ChatConversation {
  targetUserId: number;
  targetUsername: string;
  targetFullName: string;
  targetAvatar?: string | null;
  lastMessage?: ChatMessage;
  unreadCount: number;
}

interface OnlineUser {
  userId: number;
  username: string;
  fullName: string;
  avatar?: string | null;
  onlineSince?: number; // Timestamp khi user online
}

export interface UseChatReturn {
  messages: ChatMessage[];
  isConnected: boolean;
  sendMessage: (message: string, targetUserId?: number) => void;
  sendIcon: (icon: string, targetUserId?: number) => void;
  sendSticker: (stickerId: string, targetUserId?: number) => void;
  error: string | null;
  currentTargetUserId: number | null;
  setCurrentTargetUserId: (userId: number | null) => void;
  conversations: ChatConversation[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isTyping: boolean; // Người khác đang gõ
  notifyTyping: (isTyping: boolean, targetUserId?: number) => void; // Thông báo mình đang gõ
  onlineUsers: Set<number>; // Danh sách user IDs đang online
  onlineUsersList: OnlineUser[]; // Danh sách đầy đủ users đang online với thông tin
  isUserOnline: (userId: number) => boolean; // Kiểm tra user có online không
  getMessagesForUser: (targetUserId: number) => ChatMessage[]; // Lấy messages cho một user cụ thể
  getTypingForUser: (targetUserId: number) => boolean; // Lấy typing state cho một user cụ thể
  getMessageCountForUser: (targetUserId: number) => number; // Lấy message count cho một user cụ thể
  setOpenConversation: (userId: number, isOpen: boolean) => void; // Cập nhật trạng thái conversation đang mở
}

// Helper function để tạo channel name cho chat 1-1
// Sắp xếp userId để đảm bảo cùng một channel cho cả 2 người
function getChatChannelName(userId1: number, userId2: number): string {
  const [minId, maxId] = [userId1, userId2].sort((a, b) => a - b);
  return `private-chat-${minId}-${maxId}`;
}

export const useChat = (targetUserId?: number | null): UseChatReturn => {
  const { user, isInitialized } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTargetUserId, setCurrentTargetUserId] = useState<number | null>(targetUserId || null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false); // Người khác đang gõ
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set()); // Danh sách user IDs đang online
  const [onlineUsersList, setOnlineUsersList] = useState<OnlineUser[]>([]); // Danh sách đầy đủ users đang online
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);
  const channelsRef = useRef<Map<string, any>>(new Map());
  const notificationChannelRef = useRef<any>(null);
  const presenceChannelRef = useRef<any>(null);
  // Lưu messages theo conversation để không bị mất khi chuyển conversation
  const messagesByConversationRef = useRef<Map<number, ChatMessage[]>>(new Map());
  // Lưu message count theo conversation (từ API response)
  const messageCountByConversationRef = useRef<Map<number, number>>(new Map());
  // Lưu trạng thái đã load messages từ API để tránh load lại không cần thiết
  const loadedConversationsRef = useRef<Set<number>>(new Set());
  // Lưu trạng thái đang gửi message để tránh duplicate
  const sendingMessagesRef = useRef<Set<string>>(new Set());
  // Typing indicator timeout - lưu theo từng conversation
  const typingTimeoutByConversationRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const typingSentRef = useRef<boolean>(false);
  // Ref để lưu currentTargetUserId để dùng trong closure
  const currentTargetUserIdRef = useRef<number | null>(currentTargetUserId);
  // Lưu typing state theo từng conversation
  const typingByConversationRef = useRef<Map<number, boolean>>(new Map());
  // Lưu danh sách các conversation đang mở (để kiểm tra unread count)
  const openConversationsRef = useRef<Set<number>>(new Set());

  // Khởi tạo Pusher connection
  useEffect(() => {
    if (!isInitialized || !user) {
      return;
    }

    // Khởi tạo Pusher client
    const pusher = new Pusher('0db27f32f5c4cd52cb2b', {
      cluster: 'ap1',
      authEndpoint: '/api/pusher/auth',
      auth: {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      },
    });

    pusherRef.current = pusher;

    // Kết nối thành công
    pusher.connection.bind('connected', () => {
      setIsConnected(true);
      setError(null);
    });

    // Lỗi kết nối
    pusher.connection.bind('error', (err: any) => {
      console.error('Pusher connection error:', err);
      setError('Lỗi kết nối chat. Vui lòng thử lại.');
      setIsConnected(false);
    });

    // Ngắt kết nối
    pusher.connection.bind('disconnected', () => {
      setIsConnected(false);
    });

    // Cleanup
    return () => {
      // Unsubscribe presence channel
      if (presenceChannelRef.current) {
        presenceChannelRef.current.unbind_all();
        pusher.unsubscribe('presence-online-users');
        presenceChannelRef.current = null;
      }
      
      // Unsubscribe notification channel
      if (notificationChannelRef.current) {
        notificationChannelRef.current.unbind_all();
        pusher.unsubscribe(`notifications-${user?.userId}`);
        notificationChannelRef.current = null;
      }
      
      // Unsubscribe tất cả channels
      channelsRef.current.forEach((channel, channelName) => {
        channel.unbind_all();
        pusher.unsubscribe(channelName);
      });
      channelsRef.current.clear();
      
      if (pusherRef.current) {
        pusherRef.current.disconnect();
      }
    };
  }, [user, isInitialized]);

  // Helper function để cập nhật conversation (khai báo trước để tránh circular dependency)
  const updateConversationInternal = useCallback((message: ChatMessage, isFromNotification: boolean = false) => {
    if (!user) return;

    // Xác định targetUserId: nếu message từ user hiện tại thì target là currentTargetUserId, ngược lại là userId của message
    const targetId = message.userId === user.userId 
      ? (currentTargetUserId || message.userId) 
      : message.userId;
    
    // Bỏ qua nếu target là chính mình
    if (targetId === user.userId) return;
    
    // Kiểm tra xem conversation này có đang mở không
    const isConversationOpen = openConversationsRef.current.has(targetId) || currentTargetUserId === targetId;
    
    setConversations((prev) => {
      const existing = prev.find((conv) => conv.targetUserId === targetId);
      if (existing) {
        return prev.map((conv) =>
          conv.targetUserId === targetId
            ? {
                ...conv,
                lastMessage: message,
                unreadCount:
                  isConversationOpen
                    ? 0
                    : conv.unreadCount + 1,
              }
            : conv
        );
      } else {
        // Tạo conversation mới - cần lấy thông tin target user
        // Tạm thời dùng thông tin từ message, sau này có thể fetch từ API
        return [
          ...prev,
          {
            targetUserId: targetId,
            targetUsername: message.userId === user.userId ? `User ${targetId}` : message.username,
            targetFullName: message.userId === user.userId ? `User ${targetId}` : message.fullName,
            targetAvatar: message.userId === user.userId ? undefined : message.avatar,
            lastMessage: message,
            unreadCount: isConversationOpen ? 0 : 1,
          },
        ];
      }
    });
  }, [user, currentTargetUserId]);

  // Helper function để subscribe vào một channel
  const subscribeToChannel = useCallback((targetUserId: number) => {
    if (!pusherRef.current || !user || !targetUserId || targetUserId === user.userId) {
      return null;
    }

    const channelName = getChatChannelName(user.userId, targetUserId);
    
    // Nếu đã subscribe rồi thì trả về channel hiện có
    if (channelsRef.current.has(channelName)) {
      return channelsRef.current.get(channelName);
    }

    // Subscribe vào private channel
    console.log('[Chat] Đang subscribe vào channel:', channelName, {
      currentUser: user.userId,
      targetUser: targetUserId,
    });
    const channel = pusherRef.current.subscribe(channelName);
    channelsRef.current.set(channelName, channel);

    // Lắng nghe tin nhắn mới - handler chung cho tất cả channels
    const handleNewMessage = (data: ChatMessage) => {
      console.log('[Chat] Nhận được tin nhắn mới:', {
        from: data.userId,
        currentUser: user.userId,
        channel: channelName,
        message: data.message?.substring(0, 50),
        currentTargetUserId,
      });
      
      // Kiểm tra xem tin nhắn đã tồn tại chưa
      const conversationMessages = messagesByConversationRef.current.get(targetUserId) || [];
      const isDuplicate = conversationMessages.some((msg) => msg.id === data.id);
      
      // Kiểm tra xem có tin nhắn với cùng userId và timestamp gần giống không (để tránh tăng count trùng khi nhận từ Pusher sau khi đã gửi)
      const hasSimilarMessage = conversationMessages.some((msg) => 
        msg.userId === data.userId && 
        Math.abs(msg.timestamp - data.timestamp) < 5000 // Trong vòng 5 giây
      );
      
      // Tin nhắn phải từ user khác (không phải chính mình)
      if (data.userId === user.userId) {
        // Tin nhắn từ chính mình - chỉ hiển thị nếu đang ở đúng conversation
        if (currentTargetUserId === targetUserId) {
          setMessages((prev) => {
            if (prev.some((msg) => msg.id === data.id)) {
              console.log('[Chat] Tin nhắn đã tồn tại, bỏ qua:', data.id);
              return prev;
            }
            console.log('[Chat] Thêm tin nhắn của mình vào danh sách');
            const updated = [...prev, data].sort((a, b) => a.timestamp - b.timestamp);
            // Lưu vào cache
            messagesByConversationRef.current.set(targetUserId, updated);
            // Tăng count nếu tin nhắn mới và chưa có tin nhắn tương tự
            if (!isDuplicate && !hasSimilarMessage) {
              const currentCount = messageCountByConversationRef.current.get(targetUserId) || 0;
              messageCountByConversationRef.current.set(targetUserId, currentCount + 1);
            }
            return updated;
          });
        } else if (!isDuplicate && !hasSimilarMessage) {
          // Tăng count ngay cả khi không ở conversation hiện tại
          const currentCount = messageCountByConversationRef.current.get(targetUserId) || 0;
          messageCountByConversationRef.current.set(targetUserId, currentCount + 1);
        }
      } else {
        // Tin nhắn từ user khác - luôn cập nhật conversation và hiển thị nếu đang ở đúng conversation
        updateConversationInternal(data);
        
        if (currentTargetUserId === targetUserId) {
          setMessages((prev) => {
            if (prev.some((msg) => msg.id === data.id)) {
              console.log('[Chat] Tin nhắn đã tồn tại, bỏ qua:', data.id);
              return prev;
            }
            console.log('[Chat] Thêm tin nhắn từ user khác vào danh sách');
            const updated = [...prev, data].sort((a, b) => a.timestamp - b.timestamp);
            // Lưu vào cache
            messagesByConversationRef.current.set(targetUserId, updated);
            // Tăng count nếu tin nhắn mới và chưa có tin nhắn tương tự
            if (!isDuplicate && !hasSimilarMessage) {
              const currentCount = messageCountByConversationRef.current.get(targetUserId) || 0;
              messageCountByConversationRef.current.set(targetUserId, currentCount + 1);
            }
            return updated;
          });
        } else {
          console.log('[Chat] Tin nhắn từ user khác nhưng không phải conversation hiện tại - đã cập nhật conversation list');
          // Vẫn lưu vào cache để khi mở conversation sẽ có tin nhắn
          if (!isDuplicate) {
            const updated = [...conversationMessages, data].sort((a, b) => a.timestamp - b.timestamp);
            messagesByConversationRef.current.set(targetUserId, updated);
            // Tăng count nếu chưa có tin nhắn tương tự
            if (!hasSimilarMessage) {
              const currentCount = messageCountByConversationRef.current.get(targetUserId) || 0;
              messageCountByConversationRef.current.set(targetUserId, currentCount + 1);
            }
            console.log('[Chat] Đã lưu tin nhắn vào cache cho conversation:', targetUserId);
          }
        }
      }
    };

    const handleNewIcon = (data: ChatMessage) => {
      const conversationMessages = messagesByConversationRef.current.get(targetUserId) || [];
      const isDuplicate = conversationMessages.some((msg) => msg.id === data.id);
      
      if (data.userId === user.userId) {
        if (currentTargetUserId === targetUserId) {
          setMessages((prev) => {
            if (prev.some((msg) => msg.id === data.id)) {
              return prev;
            }
            const updated = [...prev, data].sort((a, b) => a.timestamp - b.timestamp);
            messagesByConversationRef.current.set(targetUserId, updated);
            // Tăng count nếu icon mới
            if (!isDuplicate) {
              const currentCount = messageCountByConversationRef.current.get(targetUserId) || 0;
              messageCountByConversationRef.current.set(targetUserId, currentCount + 1);
            }
            return updated;
          });
        } else if (!isDuplicate) {
          const currentCount = messageCountByConversationRef.current.get(targetUserId) || 0;
          messageCountByConversationRef.current.set(targetUserId, currentCount + 1);
        }
      } else {
        updateConversationInternal(data);
        if (currentTargetUserId === targetUserId) {
          setMessages((prev) => {
            if (prev.some((msg) => msg.id === data.id)) {
              return prev;
            }
            const updated = [...prev, data].sort((a, b) => a.timestamp - b.timestamp);
            messagesByConversationRef.current.set(targetUserId, updated);
            // Tăng count nếu icon mới
            if (!isDuplicate) {
              const currentCount = messageCountByConversationRef.current.get(targetUserId) || 0;
              messageCountByConversationRef.current.set(targetUserId, currentCount + 1);
            }
            return updated;
          });
        } else if (!isDuplicate) {
          const updated = [...conversationMessages, data].sort((a, b) => a.timestamp - b.timestamp);
          messagesByConversationRef.current.set(targetUserId, updated);
          const currentCount = messageCountByConversationRef.current.get(targetUserId) || 0;
          messageCountByConversationRef.current.set(targetUserId, currentCount + 1);
        }
      }
    };

    const handleNewSticker = (data: ChatMessage) => {
      const conversationMessages = messagesByConversationRef.current.get(targetUserId) || [];
      const isDuplicate = conversationMessages.some((msg) => msg.id === data.id);
      
      if (data.userId === user.userId) {
        if (currentTargetUserId === targetUserId) {
          setMessages((prev) => {
            if (prev.some((msg) => msg.id === data.id)) {
              return prev;
            }
            console.log('[Chat] Thêm sticker của mình vào danh sách');
            const updated = [...prev, data].sort((a, b) => a.timestamp - b.timestamp);
            // Lưu vào cache
            messagesByConversationRef.current.set(targetUserId, updated);
            // Tăng count nếu sticker mới
            if (!isDuplicate) {
              const currentCount = messageCountByConversationRef.current.get(targetUserId) || 0;
              messageCountByConversationRef.current.set(targetUserId, currentCount + 1);
            }
            return updated;
          });
        } else if (!isDuplicate) {
          const currentCount = messageCountByConversationRef.current.get(targetUserId) || 0;
          messageCountByConversationRef.current.set(targetUserId, currentCount + 1);
        }
      } else {
        updateConversationInternal(data);
        if (currentTargetUserId === targetUserId) {
          setMessages((prev) => {
            if (prev.some((msg) => msg.id === data.id)) {
              return prev;
            }
            console.log('[Chat] Thêm sticker từ user khác vào danh sách');
            const updated = [...prev, data].sort((a, b) => a.timestamp - b.timestamp);
            // Lưu vào cache
            messagesByConversationRef.current.set(targetUserId, updated);
            // Tăng count nếu sticker mới
            if (!isDuplicate) {
              const currentCount = messageCountByConversationRef.current.get(targetUserId) || 0;
              messageCountByConversationRef.current.set(targetUserId, currentCount + 1);
            }
            return updated;
          });
        } else {
          console.log('[Chat] Sticker từ user khác nhưng không phải conversation hiện tại - đã cập nhật conversation list');
          // Vẫn lưu vào cache để khi mở conversation sẽ có sticker
          if (!isDuplicate) {
            const updated = [...conversationMessages, data].sort((a, b) => a.timestamp - b.timestamp);
            messagesByConversationRef.current.set(targetUserId, updated);
            // Tăng count
            const currentCount = messageCountByConversationRef.current.get(targetUserId) || 0;
            messageCountByConversationRef.current.set(targetUserId, currentCount + 1);
            console.log('[Chat] Đã lưu sticker vào cache cho conversation:', targetUserId);
          }
        }
      }
    };

    channel.bind('new-message', handleNewMessage);
    channel.bind('new-icon', handleNewIcon);
    channel.bind('new-sticker', handleNewSticker);

    // Lắng nghe typing indicator
    const handleTyping = (data: { userId: number; isTyping: boolean }) => {
      // Chỉ xử lý nếu là typing từ user khác (không phải chính mình)
      if (data.userId === user.userId) {
        console.log('[Chat] Bỏ qua typing event từ chính mình');
        return;
      }
      
      console.log('[Chat] Nhận được typing event:', {
        from: data.userId,
        currentUser: user.userId,
        isTyping: data.isTyping,
        targetUserId,
        channelName,
      });
      
      // Luôn cập nhật typing state cho conversation này vào ref
      typingByConversationRef.current.set(targetUserId, data.isTyping);
      console.log('[Chat] Đã cập nhật typing state cho conversation:', targetUserId, data.isTyping);
      
      // Clear timeout cũ cho conversation này nếu có
      const existingTimeout = typingTimeoutByConversationRef.current.get(targetUserId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        typingTimeoutByConversationRef.current.delete(targetUserId);
      }
      
      // Nếu đang typing, tự động tắt sau 3 giây
      if (data.isTyping) {
        const timeout = setTimeout(() => {
          console.log('[Chat] Tự động tắt typing indicator sau 3 giây cho conversation:', targetUserId);
          typingByConversationRef.current.set(targetUserId, false);
          typingTimeoutByConversationRef.current.delete(targetUserId);
          
          // Nếu đây là conversation hiện tại, cập nhật state để trigger re-render
          const currentTarget = currentTargetUserIdRef.current;
          if (currentTarget === targetUserId) {
            setIsTyping(false);
          }
        }, 3000);
        typingTimeoutByConversationRef.current.set(targetUserId, timeout);
      } else {
        // Nếu không typing nữa, xóa khỏi ref
        typingByConversationRef.current.set(targetUserId, false);
      }
      
      // Cập nhật state cho conversation hiện tại để trigger re-render
      const currentTarget = currentTargetUserIdRef.current;
      if (currentTarget === targetUserId) {
        setIsTyping(data.isTyping);
      }
    };

    channel.bind('typing', handleTyping);

    // Subscription thành công
    channel.bind('pusher:subscription_succeeded', () => {
      console.log('[Chat] Đã subscribe thành công vào channel:', channelName, {
        currentUser: user.userId,
        targetUser: targetUserId,
      });
    });

    // Subscription lỗi
    channel.bind('pusher:subscription_error', (err: any) => {
      console.error('[Chat] Subscription error:', err, {
        channel: channelName,
        currentUser: user.userId,
        targetUser: targetUserId,
      });
      setError('Không thể kết nối vào kênh chat. Vui lòng đăng nhập lại.');
    });

    return channel;
  }, [user, currentTargetUserId, updateConversationInternal]);

  // Subscribe vào channel khi có targetUserId và load messages từ API
  useEffect(() => {
    if (!pusherRef.current || !user) {
      return;
    }

    if (!currentTargetUserId || currentTargetUserId === user.userId) {
      // Clear messages nếu không có target hoặc target là chính mình
      if (!currentTargetUserId || (user && currentTargetUserId === user.userId)) {
        setMessages([]);
        channelRef.current = null;
      }
      return;
    }

    // Subscribe vào channel
    const channel = subscribeToChannel(currentTargetUserId);
    channelRef.current = channel;
    
    // Load messages từ API nếu chưa load
    const loadMessages = async () => {
      // Kiểm tra cache trước
      const cachedMessages = messagesByConversationRef.current.get(currentTargetUserId);
      if (cachedMessages && cachedMessages.length > 0 && loadedConversationsRef.current.has(currentTargetUserId)) {
        console.log('[Chat] Load tin nhắn từ cache cho conversation:', currentTargetUserId, cachedMessages.length);
        setMessages(cachedMessages);
        return;
      }

      // Load từ API
      try {
        setIsLoadingMessages(true);
        const response = await chatApiService.getMessages({ 
          targetUserId: currentTargetUserId,
          limit: 50 
        });
        
        if (response.data?.messages) {
          const apiMessages = response.data.messages;
          const messageCount = response.data.count ?? apiMessages.length;
          console.log('[Chat] Đã load messages từ API:', apiMessages.length, 'count:', messageCount);
          
          // Lưu vào cache
          messagesByConversationRef.current.set(currentTargetUserId, apiMessages);
          messageCountByConversationRef.current.set(currentTargetUserId, messageCount);
          loadedConversationsRef.current.add(currentTargetUserId);
          
          // Hiển thị messages
          setMessages(apiMessages);
        }
      } catch (error) {
        console.error('[Chat] Lỗi khi load messages:', error);
        // Nếu có cache, vẫn hiển thị cache
        if (cachedMessages && cachedMessages.length > 0) {
          setMessages(cachedMessages);
        }
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadMessages();

    // Đánh dấu đã đọc khi mở conversation
    const markAsRead = async () => {
      try {
        await chatApiService.markAsRead({ targetUserId: currentTargetUserId });
        // Cập nhật unreadCount trong conversations
        setConversations((prev) =>
          prev.map((conv) =>
            conv.targetUserId === currentTargetUserId
              ? { ...conv, unreadCount: 0 }
              : conv
          )
        );
      } catch (error) {
        console.error('[Chat] Lỗi khi đánh dấu đã đọc:', error);
        // Không hiển thị lỗi để không làm gián đoạn UX
      }
    };

    markAsRead();
  }, [user, currentTargetUserId, subscribeToChannel]);

  // Subscribe vào presence channel để track online users
  useEffect(() => {
    if (!pusherRef.current || !user || !isConnected) {
      return;
    }

    // Nếu đã subscribe rồi thì không subscribe lại
    if (presenceChannelRef.current) {
      return;
    }

    console.log('[Chat] Đang subscribe vào presence channel: presence-online-users');
    const presenceChannel = pusherRef.current.subscribe('presence-online-users');
    presenceChannelRef.current = presenceChannel;

    // Khi subscription thành công, lấy danh sách users đang online
    presenceChannel.bind('pusher:subscription_succeeded', (members: any) => {
      console.log('[Chat] Presence subscription succeeded, online users:', members);
      const onlineUserIds = new Set<number>();
      const onlineUsersData: OnlineUser[] = [];
      
      // members là object với key là user_id và value là user_info
      Object.keys(members.members || {}).forEach((userIdStr) => {
        const userId = parseInt(userIdStr, 10);
        if (!isNaN(userId) && userId !== user.userId) {
          onlineUserIds.add(userId);
          
          // Lấy thông tin đầy đủ của user từ members
          const memberInfo = members.members[userIdStr];
          if (memberInfo) {
            onlineUsersData.push({
              userId: userId,
              username: memberInfo.username || '',
              fullName: memberInfo.fullName || memberInfo.name || `User ${userId}`,
              avatar: memberInfo.avatar || null,
              onlineSince: memberInfo.onlineSince || Date.now(), // Lưu timestamp khi user online
            });
          }
        }
      });
      
      setOnlineUsers(onlineUserIds);
      setOnlineUsersList(onlineUsersData);
      console.log('[Chat] Đã cập nhật danh sách online users:', Array.from(onlineUserIds), onlineUsersData.length);
    });

    // Khi có user mới online
    presenceChannel.bind('pusher:member_added', (member: any) => {
      console.log('[Chat] User online:', member);
      const userId = parseInt(member.id, 10);
      if (!isNaN(userId) && userId !== user.userId) {
        setOnlineUsers((prev) => {
          const updated = new Set(prev);
          updated.add(userId);
          return updated;
        });
        
        // Thêm thông tin user vào danh sách
        setOnlineUsersList((prev) => {
          // Kiểm tra xem user đã có trong danh sách chưa
          if (prev.some(u => u.userId === userId)) {
            return prev;
          }
          
          const userInfo = member.info || {};
          return [...prev, {
            userId: userId,
            username: userInfo.username || '',
            fullName: userInfo.fullName || userInfo.name || `User ${userId}`,
            avatar: userInfo.avatar || null,
            onlineSince: userInfo.onlineSince || Date.now(), // Lưu timestamp khi user online
          }];
        });
        
        console.log('[Chat] User đã online:', userId);
      }
    });

    // Khi có user offline
    presenceChannel.bind('pusher:member_removed', (member: any) => {
      console.log('[Chat] User offline:', member);
      const userId = parseInt(member.id, 10);
      if (!isNaN(userId)) {
        setOnlineUsers((prev) => {
          const updated = new Set(prev);
          updated.delete(userId);
          return updated;
        });
        
        // Xóa user khỏi danh sách
        setOnlineUsersList((prev) => prev.filter(u => u.userId !== userId));
        
        console.log('[Chat] User đã offline:', userId);
      }
    });

    // Subscription lỗi
    presenceChannel.bind('pusher:subscription_error', (err: any) => {
      console.error('[Chat] Lỗi subscribe presence channel:', err);
    });

    return () => {
      presenceChannel.unbind_all();
      pusherRef.current?.unsubscribe('presence-online-users');
      presenceChannelRef.current = null;
    };
  }, [user, isConnected]);

  // Subscribe vào notification channel của user
  useEffect(() => {
    if (!pusherRef.current || !user || !isConnected) {
      return;
    }

    const notificationChannelName = `notifications-${user.userId}`;
    
    // Nếu đã subscribe rồi thì không subscribe lại
    if (notificationChannelRef.current) {
      return;
    }

    console.log('[Chat] Đang subscribe vào notification channel:', notificationChannelName);
    const notificationChannel = pusherRef.current.subscribe(notificationChannelName);
    notificationChannelRef.current = notificationChannel;
    
    // Lắng nghe notification về tin nhắn mới
    const handleNotification = (data: { fromUserId: number; channelName: string; message: ChatMessage }) => {
      console.log('[Chat] Nhận được notification về tin nhắn mới:', data);
      
      // Tự động subscribe vào private channel nếu chưa subscribe
      if (!channelsRef.current.has(data.channelName)) {
        console.log('[Chat] Tự động subscribe vào channel từ notification:', data.channelName);
        subscribeToChannel(data.fromUserId);
      }
      
      // Cập nhật conversation (đánh dấu là từ notification)
      updateConversationInternal(data.message, true);
      
      // Lưu tin nhắn vào messages của conversation này
      const conversationMessages = messagesByConversationRef.current.get(data.fromUserId) || [];
      if (!conversationMessages.some((msg) => msg.id === data.message.id)) {
        const updatedMessages = [...conversationMessages, data.message].sort((a, b) => a.timestamp - b.timestamp);
        messagesByConversationRef.current.set(data.fromUserId, updatedMessages);
        console.log('[Chat] Đã lưu tin nhắn từ notification vào conversation:', data.fromUserId);
      }
      
      // Thêm tin nhắn vào messages ngay lập tức (từ notification)
      // Nếu đang ở đúng conversation hoặc chưa có conversation nào được chọn
      if (currentTargetUserId === data.fromUserId || !currentTargetUserId) {
        setMessages((prev) => {
          // Tránh duplicate messages
          if (prev.some((msg) => msg.id === data.message.id)) {
            console.log('[Chat] Tin nhắn từ notification đã tồn tại, bỏ qua:', data.message.id);
            return prev;
          }
          console.log('[Chat] Thêm tin nhắn từ notification vào danh sách');
          return [...prev, data.message].sort((a, b) => a.timestamp - b.timestamp);
        });
        
        // Tự động mở conversation nếu chưa có conversation nào được chọn
        if (!currentTargetUserId) {
          console.log('[Chat] Tự động mở conversation với user:', data.fromUserId);
          setCurrentTargetUserId(data.fromUserId);
        }
      } else {
        console.log('[Chat] Tin nhắn từ notification nhưng đang ở conversation khác - chỉ cập nhật conversation list');
      }
    };
    
    notificationChannel.bind('new-message-notification', handleNotification);
    
    notificationChannel.bind('pusher:subscription_succeeded', () => {
      console.log('[Chat] Đã subscribe thành công vào notification channel');
    });
    
    notificationChannel.bind('pusher:subscription_error', (err: any) => {
      console.error('[Chat] Lỗi subscribe notification channel:', err);
    });

    return () => {
      notificationChannel.unbind('new-message-notification', handleNotification);
      notificationChannel.unbind_all();
      pusherRef.current?.unsubscribe(notificationChannelName);
      notificationChannelRef.current = null;
    };
  }, [user, isConnected, subscribeToChannel, updateConversationInternal]);

  // Load conversations từ API khi khởi tạo
  useEffect(() => {
    if (!isInitialized || !user) {
      return;
    }

    const loadConversations = async () => {
      try {
        setIsLoadingConversations(true);
        const response = await chatApiService.getConversations({ limit: 20 });
        if (response.data?.conversations) {
          const conversations = response.data.conversations.map((conv) => ({
            ...conv,
            targetAvatar: conv.targetAvatar ?? undefined,
            lastMessage: conv.lastMessage
              ? {
                  ...conv.lastMessage,
                  avatar: conv.lastMessage.avatar ?? undefined,
                  icon: conv.lastMessage.icon ?? undefined,
                }
              : undefined,
          }));
          setConversations(conversations);
          console.log('[Chat] Đã load conversations từ API:', conversations.length);
        }
      } catch (error) {
        console.error('[Chat] Lỗi khi load conversations:', error);
        // Không set error để không làm gián đoạn UX
      } finally {
        setIsLoadingConversations(false);
      }
    };

    loadConversations();
  }, [user, isInitialized]);

  // Tự động subscribe vào channels của các conversations đã có
  useEffect(() => {
    if (!pusherRef.current || !user || !isConnected) {
      return;
    }

    // Subscribe vào tất cả các channels của conversations
    conversations.forEach((conv) => {
      if (conv.targetUserId !== user.userId) {
        subscribeToChannel(conv.targetUserId);
      }
    });
  }, [user, isConnected, conversations, subscribeToChannel]);

  // Helper function để cập nhật conversation (public API)
  const updateConversation = useCallback((message: ChatMessage) => {
    // Nếu tin nhắn từ user khác và chưa có conversation, tự động subscribe vào channel
    if (message.userId !== user?.userId && pusherRef.current && user) {
      const targetId = message.userId;
      const channelName = getChatChannelName(user.userId, targetId);
      if (!channelsRef.current.has(channelName)) {
        console.log('[Chat] Tự động subscribe vào channel khi nhận tin nhắn từ user mới:', channelName);
        subscribeToChannel(targetId);
      }
    }
    
    updateConversationInternal(message);
  }, [user, subscribeToChannel, updateConversationInternal]);

  // Gửi tin nhắn
  const sendMessage = useCallback(
    async (message: string, targetUserIdParam?: number) => {
      if (!user || !message.trim()) {
        return;
      }

      const targetId = targetUserIdParam || currentTargetUserId;
      if (!targetId || targetId === user.userId) {
        setError('Vui lòng chọn người để chat');
        return;
      }

      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const messageData: ChatMessage = {
        id: tempId,
        userId: user.userId,
        username: user.username,
        fullName: user.fullName || user.username,
        avatar: user.avatar || null,
        message: message.trim(),
        timestamp: Date.now(),
        type: 'message',
        icon: null,
      };

      // Tránh gửi duplicate
      if (sendingMessagesRef.current.has(tempId)) {
        return;
      }
      sendingMessagesRef.current.add(tempId);

      // Optimistic update: thêm tin nhắn vào messages ngay lập tức (KHÔNG CHỜ API)
      // Không tăng count ở đây vì sẽ tăng khi nhận được từ Pusher
      if (currentTargetUserId === targetId) {
        setMessages((prev) => {
          // Tránh duplicate
          if (prev.some((msg) => msg.id === tempId)) {
            return prev;
          }
          console.log('[Chat] Thêm tin nhắn của mình vào danh sách (optimistic update)');
          const updated = [...prev, messageData].sort((a, b) => a.timestamp - b.timestamp);
          // Lưu vào cache
          messagesByConversationRef.current.set(targetId, updated);
          return updated;
        });
      }

      // Gửi API trong background (không block UI)
      (async () => {
        try {
          // Gọi API để lưu message vào database
          const response = await chatApiService.sendMessage({
            targetUserId: targetId,
            username: user.username,
            fullName: user.fullName || user.username,
            avatar: user.avatar || null,
            message: message.trim(),
            timestamp: messageData.timestamp,
            type: 'message',
            icon: null,
          });

          const finalMessageId = response.data?.id || tempId;
          const finalMessageData = { ...messageData, id: finalMessageId };

          // Cập nhật ID thật từ server (thay thế temp ID)
          if (currentTargetUserId === targetId) {
            setMessages((prev) => {
              const updated = prev.map((msg) =>
                msg.id === tempId ? finalMessageData : msg
              );
              messagesByConversationRef.current.set(targetId, updated);
              return updated;
            });
          }
          // Tăng count khi tin nhắn đã được lưu thành công
          // (sẽ được nhận lại từ Pusher và xử lý trong handleNewMessage)
          const currentCount = messageCountByConversationRef.current.get(targetId) || 0;
          messageCountByConversationRef.current.set(targetId, currentCount + 1);

          console.log('[Chat] Tin nhắn đã được lưu thành công:', finalMessageId);

          // Trigger Pusher event để người nhận nhận được tin nhắn real-time
          const token = localStorage.getItem('auth_token');
          const channelName = getChatChannelName(user.userId, targetId);
          
          try {
            await fetch('/api/pusher/message', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                type: 'message',
                data: finalMessageData,
                channelName,
                targetUserId: targetId,
              }),
            });
            console.log('[Chat] Pusher event đã được trigger');
          } catch (pusherError) {
            console.error('[Chat] Lỗi khi trigger Pusher event:', pusherError);
            // Không throw error để không làm gián đoạn UX
          }

          // Cập nhật conversation
          updateConversationInternal(finalMessageData);
          
          // Tự động tắt typing indicator sau khi gửi tin nhắn
          if (typingSentRef.current) {
            typingSentRef.current = false;
          }
        } catch (error) {
          console.error('[Chat] Lỗi khi gửi tin nhắn:', error);
          // Không rollback để giữ UX mượt mà - tin nhắn vẫn hiển thị
          // User có thể thấy tin nhắn đã gửi ngay cả khi API fail
        } finally {
          sendingMessagesRef.current.delete(tempId);
        }
      })();
    },
    [user, currentTargetUserId, updateConversationInternal]
  );

  // Gửi icon
  const sendIcon = useCallback(
    async (icon: string, targetUserIdParam?: number) => {
      if (!user) {
        return;
      }

      const targetId = targetUserIdParam || currentTargetUserId;
      if (!targetId || targetId === user.userId) {
        setError('Vui lòng chọn người để chat');
        return;
      }

      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const iconData: ChatMessage = {
        id: tempId,
        userId: user.userId,
        username: user.username,
        fullName: user.fullName || user.username,
        avatar: user.avatar || null,
        message: '',
        timestamp: Date.now(),
        type: 'icon',
        icon,
      };

      // Tránh gửi duplicate
      if (sendingMessagesRef.current.has(tempId)) {
        return;
      }
      sendingMessagesRef.current.add(tempId);

      // Optimistic update: thêm icon vào messages ngay lập tức (KHÔNG CHỜ API)
      // Không tăng count ở đây vì sẽ tăng khi nhận được từ Pusher
      if (currentTargetUserId === targetId) {
        setMessages((prev) => {
          // Tránh duplicate
          if (prev.some((msg) => msg.id === tempId)) {
            return prev;
          }
          console.log('[Chat] Thêm icon của mình vào danh sách (optimistic update)');
          const updated = [...prev, iconData].sort((a, b) => a.timestamp - b.timestamp);
          // Lưu vào cache
          messagesByConversationRef.current.set(targetId, updated);
          return updated;
        });
      }

      // Gửi API trong background (không block UI)
      (async () => {
        try {
          // Gọi API để lưu icon vào database
          const response = await chatApiService.sendMessage({
            targetUserId: targetId,
            username: user.username,
            fullName: user.fullName || user.username,
            avatar: user.avatar || null,
            message: '',
            timestamp: iconData.timestamp,
            type: 'icon',
            icon: icon,
          });

          const finalIconId = response.data?.id || tempId;
          const finalIconData = { ...iconData, id: finalIconId };

          // Cập nhật ID thật từ server (thay thế temp ID)
          if (currentTargetUserId === targetId) {
            setMessages((prev) => {
              const updated = prev.map((msg) =>
                msg.id === tempId ? finalIconData : msg
              );
              messagesByConversationRef.current.set(targetId, updated);
              return updated;
            });
          }
          // Tăng count khi icon đã được lưu thành công
          const currentCount = messageCountByConversationRef.current.get(targetId) || 0;
          messageCountByConversationRef.current.set(targetId, currentCount + 1);

          console.log('[Chat] Icon đã được lưu thành công:', finalIconId);

          // Trigger Pusher event để người nhận nhận được icon real-time
          const token = localStorage.getItem('auth_token');
          const channelName = getChatChannelName(user.userId, targetId);
          
          try {
            await fetch('/api/pusher/message', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                type: 'icon',
                data: finalIconData,
                channelName,
                targetUserId: targetId,
              }),
            });
            console.log('[Chat] Pusher event đã được trigger cho icon');
          } catch (pusherError) {
            console.error('[Chat] Lỗi khi trigger Pusher event:', pusherError);
            // Không throw error để không làm gián đoạn UX
          }

          // Cập nhật conversation
          updateConversationInternal(finalIconData);
          
          // Tự động tắt typing indicator sau khi gửi icon
          if (typingSentRef.current) {
            typingSentRef.current = false;
          }
        } catch (error) {
          console.error('[Chat] Lỗi khi gửi icon:', error);
          // Không rollback để giữ UX mượt mà - icon vẫn hiển thị
        } finally {
          sendingMessagesRef.current.delete(tempId);
        }
      })();
    },
    [user, currentTargetUserId, updateConversationInternal]
  );

  // Gửi sticker
  const sendSticker = useCallback(
    async (stickerId: string, targetUserIdParam?: number) => {
      if (!user) {
        return;
      }

      const targetId = targetUserIdParam || currentTargetUserId;
      if (!targetId || targetId === user.userId) {
        setError('Vui lòng chọn người để chat');
        return;
      }

      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const stickerData: ChatMessage = {
        id: tempId,
        userId: user.userId,
        username: user.username,
        fullName: user.fullName || user.username,
        avatar: user.avatar || null,
        message: '',
        timestamp: Date.now(),
        type: 'sticker',
        icon: stickerId,
      };

      // Tránh gửi duplicate
      if (sendingMessagesRef.current.has(tempId)) {
        return;
      }
      sendingMessagesRef.current.add(tempId);

      // Optimistic update: thêm sticker vào messages ngay lập tức (KHÔNG CHỜ API)
      // Không tăng count ở đây vì sẽ tăng khi nhận được từ Pusher
      if (currentTargetUserId === targetId) {
        setMessages((prev) => {
          // Tránh duplicate
          if (prev.some((msg) => msg.id === tempId)) {
            return prev;
          }
          console.log('[Chat] Thêm sticker của mình vào danh sách (optimistic update)');
          const updated = [...prev, stickerData].sort((a, b) => a.timestamp - b.timestamp);
          // Lưu vào cache
          messagesByConversationRef.current.set(targetId, updated);
          return updated;
        });
      }

      // Gửi API trong background (không block UI)
      (async () => {
        try {
          // Gọi API để lưu sticker vào database
          const response = await chatApiService.sendMessage({
            targetUserId: targetId,
            username: user.username,
            fullName: user.fullName || user.username,
            avatar: user.avatar || null,
            message: '',
            timestamp: stickerData.timestamp,
            type: 'sticker',
            icon: stickerId,
          });

          const finalStickerId = response.data?.id || tempId;
          const finalStickerData = { ...stickerData, id: finalStickerId };

          // Cập nhật ID thật từ server (thay thế temp ID)
          if (currentTargetUserId === targetId) {
            setMessages((prev) => {
              const updated = prev.map((msg) =>
                msg.id === tempId ? finalStickerData : msg
              );
              messagesByConversationRef.current.set(targetId, updated);
              return updated;
            });
          }
          // Tăng count khi sticker đã được lưu thành công
          const currentCount = messageCountByConversationRef.current.get(targetId) || 0;
          messageCountByConversationRef.current.set(targetId, currentCount + 1);

          console.log('[Chat] Sticker đã được lưu thành công:', finalStickerId);

          // Trigger Pusher event để người nhận nhận được sticker real-time
          const token = localStorage.getItem('auth_token');
          const channelName = getChatChannelName(user.userId, targetId);
          
          try {
            await fetch('/api/pusher/message', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                type: 'sticker',
                data: finalStickerData,
                channelName,
                targetUserId: targetId,
              }),
            });
            console.log('[Chat] Pusher event đã được trigger cho sticker');
          } catch (pusherError) {
            console.error('[Chat] Lỗi khi trigger Pusher event:', pusherError);
            // Không throw error để không làm gián đoạn UX
          }

          // Cập nhật conversation
          updateConversationInternal(finalStickerData);
          
          // Tự động tắt typing indicator sau khi gửi sticker
          if (typingSentRef.current) {
            typingSentRef.current = false;
          }
        } catch (error) {
          console.error('[Chat] Lỗi khi gửi sticker:', error);
          // Không rollback để giữ UX mượt mà - sticker vẫn hiển thị
        } finally {
          sendingMessagesRef.current.delete(tempId);
        }
      })();
    },
    [user, currentTargetUserId, updateConversationInternal]
  );

  // Hàm để thông báo typing indicator
  const notifyTyping = useCallback(
    async (typing: boolean) => {
      if (!user || !currentTargetUserId || currentTargetUserId === user.userId) {
        console.log('[Chat] Bỏ qua notifyTyping vì không có user hoặc targetUserId:', {
          hasUser: !!user,
          currentTargetUserId,
          isSelf: currentTargetUserId === user?.userId,
        });
        return;
      }

      // Chỉ gửi typing event nếu trạng thái thay đổi
      if (typing === typingSentRef.current) {
        console.log('[Chat] Bỏ qua notifyTyping vì trạng thái không thay đổi:', typing);
        return;
      }

      console.log('[Chat] Gửi typing indicator:', {
        typing,
        from: user.userId,
        to: currentTargetUserId,
      });

      typingSentRef.current = typing;

      const channelName = getChatChannelName(user.userId, currentTargetUserId);
      const token = localStorage.getItem('auth_token');

      try {
        const response = await fetch('/api/pusher/message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: 'typing',
            data: {
              userId: user.userId,
              isTyping: typing,
            },
            channelName,
            targetUserId: currentTargetUserId,
          }),
        });
        
        if (response.ok) {
          console.log('[Chat] Typing indicator đã được gửi thành công');
        } else {
          console.error('[Chat] Lỗi khi gửi typing indicator:', await response.text());
        }
      } catch (error) {
        console.error('[Chat] Lỗi khi gửi typing indicator:', error);
      }
    },
    [user, currentTargetUserId]
  );

  // Cập nhật ref khi currentTargetUserId thay đổi
  useEffect(() => {
    currentTargetUserIdRef.current = currentTargetUserId;
    
    // Cập nhật danh sách conversation đang mở
    if (currentTargetUserId) {
      openConversationsRef.current.add(currentTargetUserId);
    }
  }, [currentTargetUserId]);

  // Reset typing indicator khi đổi conversation
  useEffect(() => {
    // Reset typing indicator khi đổi conversation
    console.log('[Chat] Đổi conversation, cập nhật typing indicator:', currentTargetUserId);
    
    // Lấy typing state từ ref cho conversation mới
    if (currentTargetUserId) {
      const typingState = typingByConversationRef.current.get(currentTargetUserId) || false;
      setIsTyping(typingState);
      console.log('[Chat] Typing state cho conversation mới:', currentTargetUserId, typingState);
    } else {
      setIsTyping(false);
    }
    
    typingSentRef.current = false;
    
    return () => {
      // Cleanup không cần thiết vì đã dùng Map để lưu theo conversation
    };
  }, [currentTargetUserId]);

  // Helper function để kiểm tra user có online không
  const isUserOnline = useCallback((userId: number) => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  // Helper function để lấy messages cho một user cụ thể
  const getMessagesForUser = useCallback((targetUserId: number) => {
    return messagesByConversationRef.current.get(targetUserId) || [];
  }, []);

  // Helper function để lấy typing state cho một user cụ thể
  const getTypingForUser = useCallback((targetUserId: number) => {
    const typingState = typingByConversationRef.current.get(targetUserId) || false;
    return typingState;
  }, []);

  // Helper function để lấy message count cho một user cụ thể
  const getMessageCountForUser = useCallback((targetUserId: number) => {
    return messageCountByConversationRef.current.get(targetUserId) || 0;
  }, []);

  // Helper function để cập nhật trạng thái conversation đang mở
  const setOpenConversation = useCallback((userId: number, isOpen: boolean) => {
    if (isOpen) {
      openConversationsRef.current.add(userId);
      // Nếu conversation đang mở, reset unread count
      setConversations((prev) =>
        prev.map((conv) =>
          conv.targetUserId === userId ? { ...conv, unreadCount: 0 } : conv
        )
      );
    } else {
      openConversationsRef.current.delete(userId);
    }
  }, []);

  return {
    messages,
    isConnected,
    sendMessage,
    sendIcon,
    sendSticker,
    error,
    currentTargetUserId,
    setCurrentTargetUserId,
    conversations,
    isLoadingConversations,
    isLoadingMessages,
    isTyping,
    notifyTyping,
    onlineUsers,
    onlineUsersList,
    isUserOnline,
    getMessagesForUser,
    getTypingForUser,
    getMessageCountForUser,
    setOpenConversation,
  };
};

