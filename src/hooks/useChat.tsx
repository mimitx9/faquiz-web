'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { chatApiService } from '@/lib/api';
import { ChatWebSocket } from '@/lib/websocket';

export interface ChatMessage {
  id: string;
  userId: number;
  username: string;
  fullName: string;
  avatar?: string | null;
  message: string;
  timestamp: number;
  type: 'message' | 'icon' | 'sticker' | 'image';
  media?: string | null; // Media URL/ID cho icon/sticker/image
  audio?: string | null; // Audio URL nếu sticker có audio
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
  sendSticker: (stickerId: string, targetUserId?: number, audioUrl?: string | null) => void;
  sendImage: (imageUrl: string, targetUserId?: number) => void;
  updateImageMessageWithRealUrl: (blobUrl: string, realUrl: string, targetUserId: number) => Promise<void>;
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
  getHasMoreForUser: (targetUserId: number) => boolean; // Lấy hasMore cho một user cụ thể
  isLoadingMore: boolean; // Đang load more messages
  hasMoreMessages: boolean; // Còn messages để load không (cho currentTargetUserId)
  loadMoreMessages: (targetUserId: number) => Promise<void>; // Load more messages
  setOpenConversation: (userId: number, isOpen: boolean) => void; // Cập nhật trạng thái conversation đang mở
}

// Helper function để tạo room ID cho chat 1-1 (WebSocket format)
// Sắp xếp userId để đảm bảo cùng một room cho cả 2 người
function getChatRoomID(userId1: number, userId2: number): string {
  const [minId, maxId] = [userId1, userId2].sort((a, b) => a - b);
  return `chat-${minId}-${maxId}`;
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
  const [isLoadingMore, setIsLoadingMore] = useState(false); // Đang load more messages
  const [isTyping, setIsTyping] = useState(false); // Người khác đang gõ
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set()); // Danh sách user IDs đang online
  const [onlineUsersList, setOnlineUsersList] = useState<OnlineUser[]>([]); // Danh sách đầy đủ users đang online
  const wsRef = useRef<ChatWebSocket | null>(null);
  const joinedRoomsRef = useRef<Set<string>>(new Set());
  // Lưu messages theo conversation để không bị mất khi chuyển conversation
  const messagesByConversationRef = useRef<Map<number, ChatMessage[]>>(new Map());
  // Lưu message count theo conversation (từ API response)
  const messageCountByConversationRef = useRef<Map<number, number>>(new Map());
  // Lưu hasMore theo conversation (còn messages để load không)
  const hasMoreByConversationRef = useRef<Map<number, boolean>>(new Map());
  // Lưu trạng thái đã load messages từ API để tránh load lại không cần thiết
  const loadedConversationsRef = useRef<Set<number>>(new Set());
  // Lưu trạng thái đang gửi message để tránh duplicate
  const sendingMessagesRef = useRef<Set<string>>(new Set());
  // Lưu các message ID đã được xử lý từ WebSocket để tránh xử lý lại từ notification
  const processedMessageIdsRef = useRef<Set<string>>(new Set());
  // Lưu các message đang được xử lý (theo content + timestamp) để tránh xử lý đồng thời
  const processingMessagesRef = useRef<Set<string>>(new Set());
  // Typing indicator timeout - lưu theo từng conversation
  const typingTimeoutByConversationRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const typingSentRef = useRef<boolean>(false);
  // Ref để lưu currentTargetUserId để dùng trong closure
  const currentTargetUserIdRef = useRef<number | null>(currentTargetUserId);
  // Lưu typing state theo từng conversation
  const typingByConversationRef = useRef<Map<number, boolean>>(new Map());
  // Lưu danh sách các conversation đang mở (để kiểm tra unread count)
  const openConversationsRef = useRef<Set<number>>(new Set());
  // Lưu các message ID đã được xử lý để tăng unreadCount (tránh tăng trùng khi nhận từ nhiều nguồn)
  const processedUnreadMessagesRef = useRef<Set<string>>(new Set());
  // Lưu trạng thái đã reconnect để force reload messages khi reconnect
  const wasDisconnectedRef = useRef<boolean>(false);
  // Ref để lưu onlineUsersList để truy cập trong callback
  const onlineUsersListRef = useRef<OnlineUser[]>([]);

  // Khởi tạo WebSocket connection
  useEffect(() => {
    if (!isInitialized || !user) {
      return;
    }

    const token = localStorage.getItem('auth_token');
    if (!token) {
      setError('Vui lòng đăng nhập để sử dụng tính năng chat');
      return;
    }

    // const baseUrl = process.env.NODE_ENV === 'production'
    //   ? 'https://api.facourse.com/fai'
    //   : 'http://localhost:7071/fai';
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://api.facourse.com/fai'
      : 'https://api.facourse.com/fai';

    const ws = new ChatWebSocket(baseUrl, token);
    wsRef.current = ws;

    // Set event handlers
    ws.setHandlers({
      onConnected: () => {
        setIsConnected(true);
        setError(null);
        // Presence room sẽ được join tự động trong WebSocket.onopen
        
        // Nếu đã disconnect trước đó, force reload messages để sync lại
        if (wasDisconnectedRef.current) {
          wasDisconnectedRef.current = false;
          // Force reload messages cho conversation đang mở
          if (currentTargetUserIdRef.current) {
            const targetId = currentTargetUserIdRef.current;
            // Clear cache để force reload từ API
            loadedConversationsRef.current.delete(targetId);
            // Trigger reload bằng cách set lại messages
            const loadMessagesAfterReconnect = async () => {
              try {
                setIsLoadingMessages(true);
                const response = await chatApiService.getMessages({ 
                  targetUserId: targetId,
                  limit: 50 
                });
                
                if (response.data?.messages) {
                  const apiMessages = response.data.messages;
                  const messageCount = response.data.count ?? apiMessages.length;
                  const hasMore = response.data.hasMore ?? false;
                  
                  // Backend trả về từ mới nhất (index 0) đến cũ nhất (index cuối)
                  const reversedMessages = [...apiMessages].reverse();
                  const sortedMessages = reversedMessages.sort((a, b) => a.timestamp - b.timestamp);
                  
                  // Lưu vào cache
                  messagesByConversationRef.current.set(targetId, sortedMessages);
                  messageCountByConversationRef.current.set(targetId, messageCount);
                  hasMoreByConversationRef.current.set(targetId, hasMore);
                  loadedConversationsRef.current.add(targetId);
                  
                  // Hiển thị messages
                  setMessages(sortedMessages);
                }
              } catch {
                // Silent fail
              } finally {
                setIsLoadingMessages(false);
              }
            };
            
            // Đợi một chút để đảm bảo WebSocket đã join room
            setTimeout(() => {
              loadMessagesAfterReconnect();
            }, 500);
          }
        }
      },
      onDisconnected: () => {
        setIsConnected(false);
        wasDisconnectedRef.current = true;
      },
      onError: (data) => {
        setError(data.message || 'Lỗi kết nối chat. Vui lòng thử lại.');
        setIsConnected(false);
      },
      onNewMessage: (data: ChatMessage) => {
        // Xử lý tin nhắn mới từ WebSocket (tất cả loại: message, icon, sticker, image)
        handleNewMessageFromWebSocket(data);
      },
      onTyping: (data: { userId: number; isTyping: boolean; roomId?: string | null }) => {
        // Xử lý typing indicator từ WebSocket
        handleTypingFromWebSocket(data);
      },
      onNotification: (data: { fromUserId: number; channelName: string; message: ChatMessage }) => {
        // Xử lý notification khi nhận tin nhắn mới từ conversation khác
        handleNotificationFromWebSocket(data);
      },
      onPresenceList: (data: { members: Record<string, { userId: number; username: string; fullName: string; avatar?: string | null; onlineSince: number }> }) => {
        const membersList: OnlineUser[] = Object.values(data.members || {})
          .filter((member) => member.userId !== user?.userId)
          .map((member) => ({
            userId: member.userId,
            username: member.username,
            fullName: member.fullName,
            avatar: (member.avatar && member.avatar.trim() !== '') ? member.avatar : undefined,
            onlineSince: member.onlineSince,
          }));
        setOnlineUsersList(membersList);
        setOnlineUsers(new Set(membersList.map(u => u.userId)));
      },
      onUserOnline: (data: { userId: number; info: { userId: number; username: string; fullName: string; avatar?: string | null; onlineSince: number } }) => {
        // Thêm user mới vào onlineUsersList khi họ online
        if (data.userId === user?.userId) return; // Bỏ qua chính mình
        
        setOnlineUsersList((prev) => {
          // Kiểm tra xem user đã có trong danh sách chưa
          if (prev.some(u => u.userId === data.userId)) {
            // Cập nhật thông tin nếu đã có
            return prev.map(u => 
              u.userId === data.userId 
                ? {
                    userId: data.info.userId,
                    username: data.info.username,
                    fullName: data.info.fullName,
                    avatar: (data.info.avatar && data.info.avatar.trim() !== '') ? data.info.avatar : undefined,
                    onlineSince: data.info.onlineSince,
                  }
                : u
            );
          }
          // Thêm mới nếu chưa có
          return [...prev, {
            userId: data.info.userId,
            username: data.info.username,
            fullName: data.info.fullName,
            avatar: (data.info.avatar && data.info.avatar.trim() !== '') ? data.info.avatar : undefined,
            onlineSince: data.info.onlineSince,
          }];
        });
        
        setOnlineUsers((prev) => {
          const updated = new Set(prev);
          updated.add(data.userId);
          return updated;
        });
      },
      onUserOffline: (data: { userId: number }) => {
        // Xóa user khỏi onlineUsersList khi họ offline
        if (data.userId === user?.userId) return; // Bỏ qua chính mình
        
        setOnlineUsersList((prev) => prev.filter(u => u.userId !== data.userId));
        setOnlineUsers((prev) => {
          const updated = new Set(prev);
          updated.delete(data.userId);
          return updated;
        });
      },
    });

    // Kết nối WebSocket
    ws.connect();

    // Cleanup
    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
      joinedRoomsRef.current.clear();
    };
  }, [user, isInitialized]); // Re-run khi user hoặc isInitialized thay đổi

  // Helper function để thêm hoặc cập nhật user vào onlineUsersList khi có hoạt động
  const updateUserActivity = useCallback((userId: number, userInfo?: { username?: string; fullName?: string; avatar?: string | null }) => {
    setOnlineUsersList((prev) => {
      const existingUser = prev.find(u => u.userId === userId);
      
      if (existingUser) {
        // Cập nhật onlineSince và thông tin user nếu có
        return prev.map((u) => {
          if (u.userId === userId) {
            // Cập nhật avatar: luôn ưu tiên userInfo.avatar nếu có và không rỗng
            // Nếu userInfo.avatar không có hoặc rỗng, giữ nguyên avatar hiện tại
            const newAvatar = (userInfo?.avatar && userInfo.avatar.trim() !== '') 
              ? userInfo.avatar 
              : u.avatar;
            // Cập nhật username và fullName: ưu tiên userInfo nếu có, nếu không thì giữ nguyên
            const newUsername = userInfo?.username || u.username;
            const newFullName = userInfo?.fullName || u.fullName;
            return { 
              ...u, 
              onlineSince: Date.now(),
              avatar: newAvatar,
              username: newUsername,
              fullName: newFullName,
            };
          }
          return u;
        });
      } else {
        // Thêm user mới vào danh sách nếu chưa có
        // Lấy thông tin từ userInfo hoặc từ conversations
        const conversation = conversations.find(conv => conv.targetUserId === userId);
        const avatarValue = userInfo?.avatar ?? conversation?.targetAvatar ?? undefined;
        const newUser: OnlineUser = {
          userId,
          username: userInfo?.username || conversation?.targetUsername || `User ${userId}`,
          fullName: userInfo?.fullName || conversation?.targetFullName || `User ${userId}`,
          avatar: (avatarValue && avatarValue.trim() !== '') ? avatarValue : undefined,
          onlineSince: Date.now(),
        };
        return [...prev, newUser];
      }
    });
  }, [conversations]);

  // Helper function để cập nhật conversation (khai báo trước để tránh circular dependency)
  const updateConversationInternal = useCallback((message: ChatMessage, isFromNotification: boolean = false, explicitTargetId?: number) => {
    if (!user) return;

    // Xác định targetUserId: 
    // - Nếu có explicitTargetId (khi gửi tin nhắn), dùng nó
    // - Nếu message từ user hiện tại thì target là currentTargetUserId, ngược lại là userId của message
    const targetId = explicitTargetId !== undefined
      ? explicitTargetId
      : (message.userId === user.userId 
          ? (currentTargetUserIdRef.current || message.userId) 
          : message.userId);
    
    // Bỏ qua nếu target là chính mình
    if (targetId === user.userId) return;
    
    // Kiểm tra xem conversation này có đang mở không
    // Dùng ref để luôn có giá trị mới nhất, đặc biệt quan trọng khi nhận notification
    // Chỉ đánh dấu là "đang mở" nếu currentTargetUserId trùng với targetId
    // hoặc conversation được đánh dấu là "đang mở" trong openConversationsRef
    const currentTargetId = currentTargetUserIdRef.current;
    // Ưu tiên kiểm tra currentTargetId trước (chính xác hơn)
    const isConversationOpen = currentTargetId === targetId || openConversationsRef.current.has(targetId);
    
    // Kiểm tra xem message này đã được xử lý để tăng unreadCount chưa
    // Tránh tăng trùng khi nhận từ nhiều nguồn (channel + notification)
    const messageKey = `${targetId}-${message.id}`;
    const alreadyProcessed = processedUnreadMessagesRef.current.has(messageKey);
    
    // Kiểm tra xem message có phải từ chính user không
    // Nếu message từ chính user, không bao giờ tăng unreadCount
    const isFromCurrentUser = message.userId === user.userId;
    
    
    setConversations((prev) => {
      const existing = prev.find((conv) => conv.targetUserId === targetId);
      if (existing) {
        // Chỉ tăng unreadCount nếu:
        // 1. Message KHÔNG phải từ chính user (isFromCurrentUser === false)
        // 2. Conversation chưa mở
        // 3. Message chưa được xử lý
        let newUnreadCount = existing.unreadCount;
        if (!isFromCurrentUser && !isConversationOpen && !alreadyProcessed) {
          newUnreadCount = existing.unreadCount + 1;
          // Đánh dấu message đã được xử lý
          processedUnreadMessagesRef.current.add(messageKey);
        }
        
        // Kiểm tra và cập nhật targetFullName nếu đang là "User ${targetId}"
        const needsUpdate = existing.targetFullName === `User ${targetId}` || existing.targetFullName.startsWith('User ');
        let updatedTargetFullName = existing.targetFullName;
        let updatedTargetUsername = existing.targetUsername;
        let updatedTargetAvatar = existing.targetAvatar;
        
        if (needsUpdate) {
          // Tìm thông tin từ onlineUsersList
          const targetUser = onlineUsersListRef.current.find(u => u.userId === targetId);
          if (targetUser) {
            updatedTargetFullName = targetUser.fullName;
            updatedTargetUsername = targetUser.username;
            updatedTargetAvatar = targetUser.avatar ?? undefined;
          } else if (message.userId !== user.userId) {
            // Nếu message từ user khác, dùng thông tin từ message
            updatedTargetFullName = message.fullName;
            updatedTargetUsername = message.username;
            updatedTargetAvatar = message.avatar ?? undefined;
          }
        }
        
        return prev.map((conv) =>
          conv.targetUserId === targetId
            ? {
                ...conv,
                targetFullName: updatedTargetFullName,
                targetUsername: updatedTargetUsername,
                targetAvatar: updatedTargetAvatar,
                lastMessage: message,
                unreadCount: newUnreadCount,
              }
            : conv
        );
      } else {
        // Tạo conversation mới - cần lấy thông tin target user
        // Chỉ tăng unreadCount nếu message KHÔNG phải từ chính user
        let newUnreadCount = 0;
        if (!isFromCurrentUser && !isConversationOpen && !alreadyProcessed) {
          newUnreadCount = 1;
          // Đánh dấu message đã được xử lý
          processedUnreadMessagesRef.current.add(messageKey);
        }
        
        // Lấy thông tin target user từ onlineUsersList hoặc conversations hiện có
        let targetUsername = `User ${targetId}`;
        let targetFullName = `User ${targetId}`;
        let targetAvatar: string | null | undefined = undefined;
        
        if (message.userId === user.userId) {
          // Tin nhắn từ user hiện tại - tìm thông tin target user
          // Ưu tiên tìm trong onlineUsersList trước
          const targetUser = onlineUsersListRef.current.find(u => u.userId === targetId);
          if (targetUser) {
            targetUsername = targetUser.username;
            targetFullName = targetUser.fullName;
            targetAvatar = targetUser.avatar ?? undefined;
          } else {
            // Nếu không có trong onlineUsersList, tìm trong conversations hiện có
            const existingConv = prev.find(conv => conv.targetUserId === targetId);
            if (existingConv) {
              targetUsername = existingConv.targetUsername;
              targetFullName = existingConv.targetFullName;
              targetAvatar = existingConv.targetAvatar ?? undefined;
            }
          }
        } else {
          // Tin nhắn từ user khác - dùng thông tin từ message
          targetUsername = message.username;
          targetFullName = message.fullName;
          targetAvatar = message.avatar ?? undefined;
        }
        
        return [
          ...prev,
          {
            targetUserId: targetId,
            targetUsername,
            targetFullName,
            targetAvatar,
            lastMessage: message,
            unreadCount: newUnreadCount,
          },
        ];
      }
    });
  }, [user]);

  // Handler tổng quát cho tất cả loại message từ WebSocket
  const handleNewMessageFromWebSocket = useCallback((data: ChatMessage) => {
    if (!user) return;

    // Kiểm tra xem message đã được xử lý chưa (tránh xử lý lại từ notification)
    const messageKey = `${data.id}-${data.timestamp}`;
    if (processedMessageIdsRef.current.has(messageKey)) {
      return; // Đã xử lý rồi, bỏ qua
    }

    // Xác định targetUserId từ message
    // Nếu message từ user khác, targetUserId là userId của message
    // Nếu message từ chính mình, targetUserId là currentTargetUserId
    const targetId = data.userId === user.userId 
      ? (currentTargetUserIdRef.current || data.userId)
      : data.userId;
    
    // Bỏ qua nếu target là chính mình
    if (targetId === user.userId) return;
    
    // Đánh dấu message đã được xử lý
    processedMessageIdsRef.current.add(messageKey);

    // Kiểm tra xem tin nhắn đã tồn tại chưa
    const conversationMessages = messagesByConversationRef.current.get(targetId) || [];
    
    // Kiểm tra duplicate theo ID
    const isDuplicateById = conversationMessages.some((msg) => msg.id === data.id);
    
    // Kiểm tra duplicate theo temp ID (khi gửi tin nhắn lần đầu, có temp ID từ optimistic update)
    // Nếu message từ chính mình và có temp message với cùng content/timestamp, đây là duplicate
    const isDuplicateByTempId = data.userId === user.userId && conversationMessages.some((msg) => {
      // Kiểm tra nếu có temp message (ID bắt đầu bằng "temp-") với cùng userId, content và timestamp gần giống
      if (msg.id.startsWith('temp-') && msg.userId === data.userId) {
        // So sánh content/timestamp để xác định đây là cùng một message
        const isSameContent = msg.type === data.type && 
          msg.message === data.message && 
          msg.media === data.media;
        const isSameTimestamp = Math.abs(msg.timestamp - data.timestamp) < 3000; // Trong vòng 3 giây
        return isSameContent && isSameTimestamp;
      }
      return false;
    });
    
    // Kiểm tra xem có tin nhắn với cùng userId và timestamp gần giống không (để tránh duplicate từ nhiều nguồn)
    // Đối với image, không so sánh media URL vì có thể khác nhau (blob URL vs real URL)
    // Nếu một trong hai message có blob URL, không kiểm tra timestamp (có thể upload mất nhiều thời gian)
    // QUAN TRỌNG: Nếu có message với cùng timestamp (chính xác) và cùng userId, đây có thể là duplicate từ backend
    // Chỉ giữ lại message có content dài hơn hoặc message đầu tiên
    const hasSimilarMessage = conversationMessages.some((msg) => {
      const isSameUserAndType = msg.userId === data.userId && msg.type === data.type;
      const isSameMessage = msg.message === data.message;
      const isSameMedia = data.type === 'image' || msg.media === data.media; // Đối với image, không so sánh media URL
      const hasBlobUrl = data.type === 'image' && (msg.media?.startsWith('blob:') || data.media?.startsWith('blob:'));
      const isSameTimestamp = Math.abs(msg.timestamp - data.timestamp) < 3000; // Trong vòng 3 giây
      const isExactTimestamp = msg.timestamp === data.timestamp; // Cùng timestamp chính xác
      
      // Nếu là image và có blob URL, không kiểm tra timestamp
      if (data.type === 'image' && hasBlobUrl) {
        return isSameUserAndType && isSameMessage;
      }
      
      // Nếu cùng timestamp chính xác và cùng user, kiểm tra xem có phải duplicate không
      // Nếu message mới có content ngắn hơn và message cũ có content dài hơn, có thể là duplicate
      if (isExactTimestamp && isSameUserAndType && msg.message && data.message) {
        // Nếu message cũ chứa message mới (hoặc ngược lại), đây có thể là duplicate
        const oldContainsNew = msg.message.includes(data.message);
        const newContainsOld = data.message.includes(msg.message);
        if (oldContainsNew || newContainsOld) {
          // Giữ lại message dài hơn
          if (msg.message.length >= data.message.length) {
            return true; // Message cũ dài hơn, bỏ qua message mới
          }
          // Message mới dài hơn, sẽ thay thế message cũ (xử lý ở dưới)
        }
      }
      
      return isSameUserAndType && isSameMessage && isSameMedia && isSameTimestamp;
    });
    
    const isDuplicate = isDuplicateById || isDuplicateByTempId || hasSimilarMessage;
    
    // Cập nhật activity và conversation cho cả tin nhắn từ user khác và từ chính mình
    // (cần cập nhật conversation để cập nhật lastMessage, nhưng chỉ tăng unreadCount cho tin nhắn từ user khác)
    if (data.userId !== user.userId) {
      // Thêm user vào onlineUsersList với thông tin từ message
      updateUserActivity(data.userId, {
        username: data.username,
        fullName: data.fullName,
        avatar: data.avatar ?? null,
      });
    }
    // Cập nhật conversation cho cả tin nhắn từ chính mình và từ user khác
    // (để cập nhật lastMessage, nhưng unreadCount chỉ tăng cho tin nhắn từ user khác)
    updateConversationInternal(data);
    
    // Cập nhật messages
    if (currentTargetUserIdRef.current === targetId) {
      setMessages((prev) => {
        // Kiểm tra duplicate theo ID thật
        const hasExactId = prev.some((msg) => msg.id === data.id);
        if (hasExactId) {
          // Đã có message với ID này, không thêm nữa
          return prev;
        }
        
        // Nếu message từ chính mình, luôn tìm và thay thế temp message nếu có
        if (data.userId === user.userId) {
          let foundTempMessage = false;
          const updated = prev.map((msg) => {
            // Tìm temp message hoặc message với blob URL tương ứng và thay thế bằng message thật
            if ((msg.id.startsWith('temp-') || msg.media?.startsWith('blob:')) && msg.userId === data.userId) {
              const isSameContent = msg.type === data.type && 
                msg.message === data.message;
              // Đối với image, không so sánh media URL vì có thể khác nhau (blob URL vs real URL)
              const isSameMedia = data.type === 'image' || msg.media === data.media;
              const isSameTimestamp = Math.abs(msg.timestamp - data.timestamp) < 5000; // Tăng lên 5 giây để chắc chắn
              if (isSameContent && isSameMedia && isSameTimestamp) {
                foundTempMessage = true;
                return data; // Thay thế temp/blob message bằng message thật
              }
            }
            return msg;
          }).sort((a, b) => a.timestamp - b.timestamp);
          
          if (foundTempMessage) {
            // Đã thay thế temp message, cập nhật cache và return
            messagesByConversationRef.current.set(targetId, updated);
            return updated;
          }
          
          // Nếu không tìm thấy temp message để thay thế, kiểm tra xem có duplicate không
          // (có thể temp message đã bị xóa hoặc chưa được thêm vào state)
          const hasSimilarMessage = prev.some((msg) => {
            const isSameUserAndType = msg.userId === data.userId && msg.type === data.type;
            const isSameMessage = msg.message === data.message;
            const isSameMedia = data.type === 'image' || msg.media === data.media;
            const hasBlobUrl = data.type === 'image' && (msg.media?.startsWith('blob:') || data.media?.startsWith('blob:'));
            const isSameTimestamp = Math.abs(msg.timestamp - data.timestamp) < 5000;
            
            if (data.type === 'image' && hasBlobUrl) {
              return isSameUserAndType && isSameMessage;
            }
            
            return isSameUserAndType && isSameMessage && isSameMedia && isSameTimestamp;
          });
          
          if (hasSimilarMessage) {
            // Có message tương tự, không thêm nữa
            return prev;
          }
          
          // Không có duplicate, thêm message mới
          const finalUpdated = [...prev, data].sort((a, b) => a.timestamp - b.timestamp);
          messagesByConversationRef.current.set(targetId, finalUpdated);
          // Tăng count vì đã thêm message mới (đã kiểm tra duplicate ở trên)
          const currentCount = messageCountByConversationRef.current.get(targetId) || 0;
          messageCountByConversationRef.current.set(targetId, currentCount + 1);
          return finalUpdated;
        }
        
        // Message từ user khác, kiểm tra duplicate trước khi thêm
        let shouldReplace = false;
        let messageToReplace: ChatMessage | null = null;
        const hasSimilarMessage = prev.some((msg) => {
          const isSameUserAndType = msg.userId === data.userId && msg.type === data.type;
          const isSameMessage = msg.message === data.message;
          const isSameMedia = data.type === 'image' || msg.media === data.media;
          const isSameTimestamp = Math.abs(msg.timestamp - data.timestamp) < 5000;
          const isExactTimestamp = msg.timestamp === data.timestamp;
          
          // Nếu cùng timestamp chính xác và cùng user, kiểm tra xem có phải duplicate không
          if (isExactTimestamp && isSameUserAndType && msg.message && data.message) {
            // Nếu message cũ chứa message mới (hoặc ngược lại), đây có thể là duplicate
            const oldContainsNew = msg.message.includes(data.message);
            const newContainsOld = data.message.includes(msg.message);
            if (oldContainsNew || newContainsOld) {
              // Giữ lại message dài hơn
              if (data.message.length > msg.message.length) {
                // Message mới dài hơn, sẽ thay thế message cũ
                shouldReplace = true;
                messageToReplace = msg;
                return false; // Không phải duplicate, nhưng sẽ thay thế
              } else {
                // Message cũ dài hơn, bỏ qua message mới
                return true;
              }
            }
          }
          
          return isSameUserAndType && isSameMessage && isSameMedia && isSameTimestamp;
        });
        
        if (hasSimilarMessage) {
          // Có message tương tự, không thêm nữa
          return prev;
        }
        
        // Nếu cần thay thế message cũ bằng message mới (message mới dài hơn)
        if (shouldReplace && messageToReplace) {
          const updated = prev.map((msg) => 
            msg.id === messageToReplace!.id ? data : msg
          ).sort((a, b) => a.timestamp - b.timestamp);
          messagesByConversationRef.current.set(targetId, updated);
          return updated;
        }
        
        const updated = [...prev, data].sort((a, b) => a.timestamp - b.timestamp);
        messagesByConversationRef.current.set(targetId, updated);
        // Tăng count vì đã thêm message mới (đã kiểm tra duplicate ở trên)
        const currentCount = messageCountByConversationRef.current.get(targetId) || 0;
        messageCountByConversationRef.current.set(targetId, currentCount + 1);
        return updated;
      });
    } else {
      // Vẫn lưu vào cache để khi mở conversation sẽ có tin nhắn
      // Kiểm tra duplicate theo ID thật trước
      const hasExactId = conversationMessages.some((msg) => msg.id === data.id);
      if (hasExactId) {
        // Đã có message với ID này, không thêm nữa
        return;
      }
      
      // Nếu message từ chính mình, luôn tìm và thay thế temp message nếu có
      if (data.userId === user.userId) {
        let foundTempMessage = false;
        let updatedMessages = conversationMessages.map((msg) => {
          // Tìm temp message hoặc message với blob URL tương ứng và thay thế bằng message thật
          if ((msg.id.startsWith('temp-') || msg.media?.startsWith('blob:')) && msg.userId === data.userId) {
            const isSameContent = msg.type === data.type && 
              msg.message === data.message;
            // Đối với image, không so sánh media URL vì có thể khác nhau (blob URL vs real URL)
            const isSameMedia = data.type === 'image' || msg.media === data.media;
            const isSameTimestamp = Math.abs(msg.timestamp - data.timestamp) < 5000; // Tăng lên 5 giây để chắc chắn
            if (isSameContent && isSameMedia && isSameTimestamp) {
              foundTempMessage = true;
              return data; // Thay thế temp/blob message bằng message thật
            }
          }
          return msg;
        });
        
        if (!foundTempMessage) {
          // Nếu không tìm thấy temp message để thay thế, kiểm tra xem có duplicate không
          const hasSimilarMessage = conversationMessages.some((msg) => {
            const isSameUserAndType = msg.userId === data.userId && msg.type === data.type;
            const isSameMessage = msg.message === data.message;
            const isSameMedia = data.type === 'image' || msg.media === data.media;
            const hasBlobUrl = data.type === 'image' && (msg.media?.startsWith('blob:') || data.media?.startsWith('blob:'));
            const isSameTimestamp = Math.abs(msg.timestamp - data.timestamp) < 5000;
            
            if (data.type === 'image' && hasBlobUrl) {
              return isSameUserAndType && isSameMessage;
            }
            
            return isSameUserAndType && isSameMessage && isSameMedia && isSameTimestamp;
          });
          
          if (!hasSimilarMessage) {
            // Không có duplicate, thêm message mới
            updatedMessages = [...conversationMessages, data];
          } else {
            // Có duplicate, không thêm
            return;
          }
        }
        
        const updated = updatedMessages.sort((a, b) => a.timestamp - b.timestamp);
        messagesByConversationRef.current.set(targetId, updated);
        // Tăng count nếu đã thay thế temp message hoặc thêm message mới
        if (foundTempMessage || !conversationMessages.some((msg) => {
          const isSameUserAndType = msg.userId === data.userId && msg.type === data.type;
          const isSameMessage = msg.message === data.message;
          const isSameMedia = data.type === 'image' || msg.media === data.media;
          const hasBlobUrl = data.type === 'image' && (msg.media?.startsWith('blob:') || data.media?.startsWith('blob:'));
          const isSameTimestamp = Math.abs(msg.timestamp - data.timestamp) < 5000;
          
          if (data.type === 'image' && hasBlobUrl) {
            return isSameUserAndType && isSameMessage;
          }
          
          return isSameUserAndType && isSameMessage && isSameMedia && isSameTimestamp;
        })) {
          const currentCount = messageCountByConversationRef.current.get(targetId) || 0;
          messageCountByConversationRef.current.set(targetId, currentCount + 1);
        }
      } else {
        // Message từ user khác, kiểm tra duplicate trước khi thêm
        const hasSimilarMessage = conversationMessages.some((msg) => {
          const isSameUserAndType = msg.userId === data.userId && msg.type === data.type;
          const isSameMessage = msg.message === data.message;
          const isSameMedia = data.type === 'image' || msg.media === data.media;
          const isSameTimestamp = Math.abs(msg.timestamp - data.timestamp) < 5000;
          
          return isSameUserAndType && isSameMessage && isSameMedia && isSameTimestamp;
        });
        
        if (!hasSimilarMessage) {
          const updated = [...conversationMessages, data].sort((a, b) => a.timestamp - b.timestamp);
          messagesByConversationRef.current.set(targetId, updated);
          // Tăng count nếu chưa có tin nhắn tương tự
          const currentCount = messageCountByConversationRef.current.get(targetId) || 0;
          messageCountByConversationRef.current.set(targetId, currentCount + 1);
        }
      }
    }
  }, [user, updateConversationInternal, updateUserActivity]);

  // Handler cho typing indicator từ WebSocket
  const handleTypingFromWebSocket = useCallback((data: { userId: number; isTyping: boolean; roomId?: string | null }) => {
    if (!user) {
      return;
    }

    if (data.userId === user.userId) {
      return;
    }
    
    let targetId: number | null = null;
    if (data.roomId) {
      const match = data.roomId.match(/^chat-(\d+)-(\d+)$/);
      if (match) {
        const [, id1, id2] = match;
        const userId1 = parseInt(id1, 10);
        const userId2 = parseInt(id2, 10);
        targetId = userId1 === user.userId ? userId2 : userId1;
      }
    }
    
    if (!targetId) {
      targetId = currentTargetUserIdRef.current || data.userId;
    }
    
    if (!targetId || targetId === user.userId) {
      return;
    }
    
    if (data.isTyping) {
      updateUserActivity(data.userId);
    }
    
    typingByConversationRef.current.set(targetId, data.isTyping);
    
    const existingTimeout = typingTimeoutByConversationRef.current.get(targetId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      typingTimeoutByConversationRef.current.delete(targetId);
    }
    
    const currentTarget = currentTargetUserIdRef.current;
    if (currentTarget === targetId) {
      setIsTyping(data.isTyping);
    }
    
    if (data.isTyping) {
      const timeout = setTimeout(() => {
        typingByConversationRef.current.set(targetId, false);
        typingTimeoutByConversationRef.current.delete(targetId);
        
        const currentTarget = currentTargetUserIdRef.current;
        if (currentTarget === targetId) {
          setIsTyping(false);
        }
      }, 3000);
      typingTimeoutByConversationRef.current.set(targetId, timeout);
    } else {
      if (currentTarget === targetId) {
        setIsTyping(false);
      }
    }
  }, [user, updateUserActivity]);

  // Helper function để subscribe vào một room (WebSocket)
  const subscribeToRoom = useCallback((targetUserId: number) => {
    if (!wsRef.current || !user || !targetUserId || targetUserId === user.userId) {
      return;
    }

    const roomID = getChatRoomID(user.userId, targetUserId);
    
    if (joinedRoomsRef.current.has(roomID)) {
      return;
    }

    wsRef.current.joinRoom(user.userId, targetUserId);
    joinedRoomsRef.current.add(roomID);
  }, [user]);

  // Handler cho notification từ WebSocket
  const handleNotificationFromWebSocket = useCallback((data: { fromUserId: number; channelName: string; message: ChatMessage }) => {
    if (!user) return;

    const fromUserId = data.fromUserId;
    const message = data.message;
    const channelName = data.channelName;

    // Bỏ qua nếu notification từ chính mình
    if (fromUserId === user.userId) return;
    
    // Kiểm tra xem message đã được xử lý từ onNewMessage chưa
    const messageKey = `${message.id}-${message.timestamp}`;
    if (processedMessageIdsRef.current.has(messageKey)) {
      return; // Đã xử lý từ onNewMessage rồi, bỏ qua notification
    }
    
    // Đánh dấu message đã được xử lý
    processedMessageIdsRef.current.add(messageKey);

    if (channelName && !joinedRoomsRef.current.has(channelName)) {
      subscribeToRoom(fromUserId);
    }

    // Cập nhật conversation với tin nhắn mới (đánh dấu là từ notification)
    updateConversationInternal(message, true, fromUserId);

    // Thêm user vào onlineUsersList khi nhận notification (user đang online và có hoạt động)
    updateUserActivity(fromUserId, {
      username: message.username,
      fullName: message.fullName,
      avatar: message.avatar ?? null,
    });

    // Lưu message vào cache để khi mở conversation sẽ có tin nhắn
    const conversationMessages = messagesByConversationRef.current.get(fromUserId) || [];
    const isDuplicate = conversationMessages.some((msg) => msg.id === message.id);
    
    if (!isDuplicate) {
      const updated = [...conversationMessages, message].sort((a, b) => a.timestamp - b.timestamp);
      messagesByConversationRef.current.set(fromUserId, updated);
      
      // Tăng count nếu chưa có tin nhắn tương tự
      const hasSimilarMessage = conversationMessages.some((msg) => 
        msg.userId === message.userId && 
        Math.abs(msg.timestamp - message.timestamp) < 5000
      );
      
      if (!hasSimilarMessage) {
        const currentCount = messageCountByConversationRef.current.get(fromUserId) || 0;
        messageCountByConversationRef.current.set(fromUserId, currentCount + 1);
      }
    }
  }, [user, subscribeToRoom, updateConversationInternal, updateUserActivity]);

  // DEPRECATED: subscribeToChannel đã được thay thế bằng subscribeToRoom
  // Giữ lại để tránh lỗi compile, nhưng sẽ không được sử dụng
  const subscribeToChannel = useCallback((targetUserId: number) => {
    // Redirect to subscribeToRoom
    subscribeToRoom(targetUserId);
    return null;
  }, [subscribeToRoom]);
  
  // DEPRECATED: getChatChannelName đã được thay thế bằng getChatRoomID
  function getChatChannelName(userId1: number, userId2: number): string {
    return getChatRoomID(userId1, userId2);
  }
  

  // Subscribe vào room khi có targetUserId và load messages từ API
  useEffect(() => {
    if (!wsRef.current || !user || !isConnected) {
      return;
    }

    if (!currentTargetUserId || currentTargetUserId === user.userId) {
      // Clear messages nếu không có target hoặc target là chính mình
      if (!currentTargetUserId || (user && currentTargetUserId === user.userId)) {
        setMessages([]);
      }
      return;
    }

    // Subscribe vào room qua WebSocket
    subscribeToRoom(currentTargetUserId);
    
    // Load messages từ API nếu chưa load
    const loadMessages = async () => {
      // Kiểm tra cache trước
      const cachedMessages = messagesByConversationRef.current.get(currentTargetUserId);
      if (cachedMessages && cachedMessages.length > 0 && loadedConversationsRef.current.has(currentTargetUserId)) {
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
          const hasMore = response.data.hasMore ?? false;
          
          // Backend trả về từ mới nhất (index 0) đến cũ nhất (index cuối)
          // Reverse để có thứ tự từ cũ nhất đến mới nhất, sau đó sort để đảm bảo đúng thứ tự
          const reversedMessages = [...apiMessages].reverse();
          const sortedMessages = reversedMessages.sort((a, b) => a.timestamp - b.timestamp);
          
          // Lưu vào cache
          messagesByConversationRef.current.set(currentTargetUserId, sortedMessages);
          messageCountByConversationRef.current.set(currentTargetUserId, messageCount);
          hasMoreByConversationRef.current.set(currentTargetUserId, hasMore);
          loadedConversationsRef.current.add(currentTargetUserId);
          
          // Hiển thị messages
          setMessages(sortedMessages);
        }
      } catch {
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
      } catch {
        // Silent fail
      }
    };

    markAsRead();
  }, [user, currentTargetUserId, subscribeToRoom, isConnected]);

  // NOTE: WebSocket backend không có presence channel
  // Online users sẽ được track qua các hoạt động khác (gửi tin nhắn, typing)
  // Hoặc có thể implement riêng nếu backend hỗ trợ

  // NOTE: WebSocket backend không có notification channel
  // Messages sẽ được nhận trực tiếp qua WebSocket khi đã join room

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
          const apiConversations = response.data.conversations.map((conv) => ({
            ...conv,
            targetAvatar: conv.targetAvatar ?? undefined,
            lastMessage: conv.lastMessage
              ? {
                  ...conv.lastMessage,
                  avatar: conv.lastMessage.avatar ?? undefined,
                  media: conv.lastMessage.media ?? undefined,
                }
              : undefined,
          }));
          
          // Merge với conversations hiện có để giữ lại unreadCount đã cập nhật từ real-time
          setConversations((prev) => {
            const merged = new Map<number, ChatConversation>();
            
            // Thêm conversations từ API trước
            apiConversations.forEach((conv) => {
              merged.set(conv.targetUserId, conv);
            });
            
            // Merge với conversations hiện có, ưu tiên giữ lại unreadCount và lastMessage mới hơn
            prev.forEach((existingConv) => {
              const apiConv = merged.get(existingConv.targetUserId);
              if (apiConv) {
                // Nếu có conversation từ API, so sánh lastMessage timestamp
                const existingLastMsgTime = existingConv.lastMessage?.timestamp || 0;
                const apiLastMsgTime = apiConv.lastMessage?.timestamp || 0;
                
                // Kiểm tra nếu existingConv có targetFullName là "User ${targetId}" và apiConv có fullName hợp lệ
                const existingHasPlaceholder = existingConv.targetFullName === `User ${existingConv.targetUserId}` || existingConv.targetFullName.startsWith('User ');
                const apiHasValidName = apiConv.targetFullName && apiConv.targetFullName !== `User ${apiConv.targetUserId}` && !apiConv.targetFullName.startsWith('User ');
                
                // Nếu lastMessage từ state mới hơn, giữ lại unreadCount và lastMessage từ state
                if (existingLastMsgTime > apiLastMsgTime) {
                  merged.set(existingConv.targetUserId, {
                    ...apiConv,
                    // Ưu tiên dùng targetFullName từ API nếu nó hợp lệ và existing đang là placeholder
                    targetFullName: (existingHasPlaceholder && apiHasValidName) ? apiConv.targetFullName : existingConv.targetFullName,
                    targetUsername: (existingHasPlaceholder && apiHasValidName) ? apiConv.targetUsername : existingConv.targetUsername,
                    targetAvatar: (existingHasPlaceholder && apiHasValidName) ? apiConv.targetAvatar : existingConv.targetAvatar,
                    lastMessage: existingConv.lastMessage,
                    unreadCount: existingConv.unreadCount,
                  });
                } else {
                  // Nếu lastMessage từ API mới hơn, nhưng vẫn giữ unreadCount từ state nếu nó lớn hơn
                  merged.set(existingConv.targetUserId, {
                    ...apiConv,
                    unreadCount: Math.max(apiConv.unreadCount, existingConv.unreadCount),
                  });
                }
              } else {
                // Conversation không có trong API nhưng có trong state (có thể là conversation mới từ notification)
                // Giữ lại conversation từ state
                merged.set(existingConv.targetUserId, existingConv);
              }
            });
            
            return Array.from(merged.values());
          });
          
          // KHÔNG thêm users từ conversations vào onlineUsersList
          // onlineUsersList được quản lý hoàn toàn bởi WebSocket presence channel:
          // - Khởi tạo từ presence-list event khi connect
          // - Thêm user từ user-online event khi có user mới online
          // - Xóa user từ user-offline event khi user offline
          
        }
      } catch {
        // Silent fail
      } finally {
        setIsLoadingConversations(false);
      }
    };

    loadConversations();
  }, [user, isInitialized]);

  // Cập nhật ref mỗi khi onlineUsersList thay đổi
  useEffect(() => {
    onlineUsersListRef.current = onlineUsersList;
  }, [onlineUsersList]);

  // Tự động cập nhật conversations khi onlineUsersList thay đổi (để cập nhật fullName)
  useEffect(() => {
    setConversations((prev) => {
      let hasChanges = false;
      const updated = prev.map((conv) => {
        // Kiểm tra nếu conversation đang có targetFullName là "User ${targetId}"
        const needsUpdate = conv.targetFullName === `User ${conv.targetUserId}` || conv.targetFullName.startsWith('User ');
        if (needsUpdate) {
          const targetUser = onlineUsersList.find(u => u.userId === conv.targetUserId);
          if (targetUser) {
            hasChanges = true;
            return {
              ...conv,
              targetFullName: targetUser.fullName,
              targetUsername: targetUser.username,
              targetAvatar: targetUser.avatar ?? conv.targetAvatar,
            };
          }
        }
        return conv;
      });
      
      return hasChanges ? updated : prev;
    });
  }, [onlineUsersList]);

  // Tự động subscribe vào rooms của các conversations đã có
  useEffect(() => {
    if (!wsRef.current || !user || !isConnected) {
      return;
    }

    // Subscribe vào tất cả các rooms của conversations
    conversations.forEach((conv) => {
      if (conv.targetUserId !== user.userId) {
        subscribeToRoom(conv.targetUserId);
      }
    });
  }, [user, isConnected, conversations, subscribeToRoom]);

  // KHÔNG cần cleanup tự động nữa vì backend sẽ tự động gửi user-offline event
  // khi user thực sự offline qua WebSocket presence channel

  // Helper function để cập nhật conversation (public API)
  const updateConversation = useCallback((message: ChatMessage) => {
    // Nếu tin nhắn từ user khác và chưa có conversation, tự động subscribe vào room
    if (message.userId !== user?.userId && wsRef.current && user) {
      const targetId = message.userId;
      const roomID = getChatRoomID(user.userId, targetId);
      if (!joinedRoomsRef.current.has(roomID)) {
        subscribeToRoom(targetId);
      }
    }
    
    updateConversationInternal(message);
  }, [user, subscribeToRoom, updateConversationInternal]);

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

      // Tạo key để kiểm tra duplicate dựa trên content và targetId
      // Tránh gửi cùng một message nhiều lần trong thời gian ngắn
      const messageKey = `${targetId}-${message.trim()}-${Date.now()}`;
      const processingKey = `${targetId}-${message.trim()}`;
      
      // Kiểm tra xem có đang xử lý message tương tự không (trong vòng 2 giây)
      if (processingMessagesRef.current.has(processingKey)) {
        return; // Đang xử lý message tương tự, bỏ qua
      }
      
      // Đánh dấu đang xử lý
      processingMessagesRef.current.add(processingKey);
      
      // Tự động xóa sau 2 giây để cho phép gửi lại message tương tự sau đó
      setTimeout(() => {
        processingMessagesRef.current.delete(processingKey);
      }, 2000);

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
        media: null,
        // Thêm targetUserId để backend biết gửi cho ai (nếu backend cần)
        // Backend có thể lấy từ roomId nhưng thêm vào để chắc chắn
      } as any; // Type assertion vì ChatMessage interface có thể không có targetUserId
      
      // Thêm targetUserId vào messageData để backend biết
      (messageData as any).targetUserId = targetId;

      // Tránh gửi duplicate theo tempId
      if (sendingMessagesRef.current.has(tempId)) {
        processingMessagesRef.current.delete(processingKey);
        return;
      }
      sendingMessagesRef.current.add(tempId);

      // Optimistic update: thêm tin nhắn vào messages ngay lập tức (KHÔNG CHỜ API)
      // Không tăng count ở đây vì sẽ tăng khi nhận được từ WebSocket
      // Luôn cập nhật cache để các component khác (như messenger page) có thể lấy được tin nhắn mới
      const cachedMessages = messagesByConversationRef.current.get(targetId) || [];
      const updatedCachedMessages = [...cachedMessages, messageData].sort((a, b) => a.timestamp - b.timestamp);
      messagesByConversationRef.current.set(targetId, updatedCachedMessages);
      
      // Chỉ cập nhật state nếu đây là conversation hiện tại
      if (currentTargetUserId === targetId) {
        setMessages((prev) => {
          // Tránh duplicate
          if (prev.some((msg) => msg.id === tempId)) {
            return prev;
          }
          return updatedCachedMessages;
        });
      }

      // Optimistic update: cập nhật conversation ngay lập tức (KHÔNG CHỜ API)
      // Để floating button cập nhật ngay và sắp xếp lại theo tin nhắn mới nhất
      updateConversationInternal(messageData, false, targetId);

      // Đánh dấu message đã được gửi để tránh gửi lại
      const sentMessageKey = `${targetId}-${message.trim()}-${messageData.timestamp}`;
      
      // Chỉ gửi qua WebSocket nếu available
      // Backend sẽ tự động lưu vào DB khi nhận WebSocket message
      if (wsRef.current && wsRef.current.isConnected()) {
        const roomID = getChatRoomID(user.userId, targetId);
        wsRef.current.sendMessage(roomID, targetId, messageData);
        // Xóa temp ID và processing key sau khi gửi thành công qua WebSocket
        sendingMessagesRef.current.delete(tempId);
        processingMessagesRef.current.delete(processingKey);
      } else {
        // Fallback: gửi qua REST API nếu WebSocket không available
        // Đảm bảo message được gửi ngay cả khi WebSocket disconnect
        (async () => {
          try {
            // Kiểm tra lại xem message đã được gửi chưa (tránh race condition)
            if (!sendingMessagesRef.current.has(tempId)) {
              processingMessagesRef.current.delete(processingKey);
              return;
            }
            
            const response = await chatApiService.sendMessage({
              targetUserId: targetId,
              username: user.username,
              fullName: user.fullName || user.username,
              avatar: user.avatar || null,
              message: message.trim(),
              timestamp: messageData.timestamp,
              type: 'message',
              media: null,
            });

            const finalMessageId = response.data?.id || tempId;
            const finalMessageData = { ...messageData, id: finalMessageId };

            // Cập nhật cache trước (luôn cập nhật cache để các component khác có thể lấy được)
            const cachedMessages = messagesByConversationRef.current.get(targetId) || [];
            let updatedCachedMessages: ChatMessage[];
            if (cachedMessages.some((msg) => msg.id === tempId)) {
              // Thay thế temp message bằng message thật
              updatedCachedMessages = cachedMessages.map((msg) =>
                msg.id === tempId ? finalMessageData : msg
              ).sort((a, b) => a.timestamp - b.timestamp);
            } else {
              // Nếu không tìm thấy temp message, thêm message mới
              updatedCachedMessages = [...cachedMessages, finalMessageData].sort((a, b) => a.timestamp - b.timestamp);
            }
            messagesByConversationRef.current.set(targetId, updatedCachedMessages);

            // Cập nhật state nếu đây là conversation hiện tại
            if (currentTargetUserId === targetId) {
              setMessages(updatedCachedMessages);
            }

            // Cập nhật lại conversation với ID thật từ server
            updateConversationInternal(finalMessageData, false, targetId);
          } catch (error) {
            // Nếu gửi qua REST API thất bại, giữ lại temp message để user biết
            console.error('Failed to send message via REST API:', error);
            // Không rollback để giữ UX mượt mà
          } finally {
            sendingMessagesRef.current.delete(tempId);
            processingMessagesRef.current.delete(processingKey);
          }
        })();
      }
      
      // Tự động tắt typing indicator sau khi gửi tin nhắn
      if (typingSentRef.current) {
        typingSentRef.current = false;
      }
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
        media: icon,
      };

      // Tránh gửi duplicate
      if (sendingMessagesRef.current.has(tempId)) {
        return;
      }
      sendingMessagesRef.current.add(tempId);

      // Optimistic update: thêm icon vào messages ngay lập tức (KHÔNG CHỜ API)
      // Không tăng count ở đây vì sẽ tăng khi nhận được từ Pusher
      // Luôn cập nhật cache để các component khác (như messenger page) có thể lấy được tin nhắn mới
      const cachedMessages = messagesByConversationRef.current.get(targetId) || [];
      const updatedCachedMessages = [...cachedMessages, iconData].sort((a, b) => a.timestamp - b.timestamp);
      messagesByConversationRef.current.set(targetId, updatedCachedMessages);
      
      // Chỉ cập nhật state nếu đây là conversation hiện tại
      if (currentTargetUserId === targetId) {
        setMessages((prev) => {
          // Tránh duplicate
          if (prev.some((msg) => msg.id === tempId)) {
            return prev;
          }
          return updatedCachedMessages;
        });
      }

      // Optimistic update: cập nhật conversation ngay lập tức (KHÔNG CHỜ API)
      // Để floating button cập nhật ngay và sắp xếp lại theo tin nhắn mới nhất
      updateConversationInternal(iconData, false, targetId);

      // Thêm targetUserId vào iconData để backend biết
      (iconData as any).targetUserId = targetId;

      // Chỉ gửi qua WebSocket nếu available
      // Backend sẽ tự động lưu vào DB khi nhận WebSocket message
      if (wsRef.current && wsRef.current.isConnected()) {
        const roomID = getChatRoomID(user.userId, targetId);
        wsRef.current.sendMessage(roomID, targetId, iconData);
        sendingMessagesRef.current.delete(tempId);
      } else {
        // Fallback: chỉ gửi qua REST API nếu WebSocket không available
        (async () => {
          try {
            const response = await chatApiService.sendMessage({
              targetUserId: targetId,
              username: user.username,
              fullName: user.fullName || user.username,
              avatar: user.avatar || null,
              message: '',
              timestamp: iconData.timestamp,
              type: 'icon',
              media: icon,
            });

            const finalIconId = response.data?.id || tempId;
            const finalIconData = { ...iconData, id: finalIconId };

            // Cập nhật cache trước (luôn cập nhật cache để các component khác có thể lấy được)
            const cachedMessages = messagesByConversationRef.current.get(targetId) || [];
            let updatedCachedMessages: ChatMessage[];
            if (cachedMessages.some((msg) => msg.id === tempId)) {
              // Thay thế temp message bằng message thật
              updatedCachedMessages = cachedMessages.map((msg) =>
                msg.id === tempId ? finalIconData : msg
              ).sort((a, b) => a.timestamp - b.timestamp);
            } else {
              // Nếu không tìm thấy temp message, thêm message mới
              updatedCachedMessages = [...cachedMessages, finalIconData].sort((a, b) => a.timestamp - b.timestamp);
            }
            messagesByConversationRef.current.set(targetId, updatedCachedMessages);

            // Cập nhật state nếu đây là conversation hiện tại
            if (currentTargetUserId === targetId) {
              setMessages(updatedCachedMessages);
            }

            updateConversationInternal(finalIconData, false, targetId);
          } catch {
            // Không rollback để giữ UX mượt mà
          } finally {
            sendingMessagesRef.current.delete(tempId);
          }
        })();
      }
      
      // Tự động tắt typing indicator sau khi gửi icon
      if (typingSentRef.current) {
        typingSentRef.current = false;
      }
    },
    [user, currentTargetUserId, updateConversationInternal]
  );

  // Gửi sticker
  const sendSticker = useCallback(
    async (stickerId: string, targetUserIdParam?: number, audioUrl?: string | null) => {
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
        media: stickerId,
        audio: audioUrl || null,
      };

      // Tránh gửi duplicate
      if (sendingMessagesRef.current.has(tempId)) {
        return;
      }
      sendingMessagesRef.current.add(tempId);

      // Optimistic update: thêm sticker vào messages ngay lập tức (KHÔNG CHỜ API)
      // Không tăng count ở đây vì sẽ tăng khi nhận được từ Pusher
      // Luôn cập nhật cache để các component khác (như messenger page) có thể lấy được tin nhắn mới
      const cachedMessages = messagesByConversationRef.current.get(targetId) || [];
      const updatedCachedMessages = [...cachedMessages, stickerData].sort((a, b) => a.timestamp - b.timestamp);
      messagesByConversationRef.current.set(targetId, updatedCachedMessages);
      
      // Chỉ cập nhật state nếu đây là conversation hiện tại
      if (currentTargetUserId === targetId) {
        setMessages((prev) => {
          // Tránh duplicate
          if (prev.some((msg) => msg.id === tempId)) {
            return prev;
          }
          return updatedCachedMessages;
        });
      }

      // Optimistic update: cập nhật conversation ngay lập tức (KHÔNG CHỜ API)
      // Để floating button cập nhật ngay và sắp xếp lại theo tin nhắn mới nhất
      updateConversationInternal(stickerData, false, targetId);

      // Thêm targetUserId vào stickerData để backend biết
      (stickerData as any).targetUserId = targetId;

      // Chỉ gửi qua WebSocket nếu available
      // Backend sẽ tự động lưu vào DB khi nhận WebSocket message
      if (wsRef.current && wsRef.current.isConnected()) {
        const roomID = getChatRoomID(user.userId, targetId);
        wsRef.current.sendMessage(roomID, targetId, stickerData);
        sendingMessagesRef.current.delete(tempId);
      } else {
        // Fallback: chỉ gửi qua REST API nếu WebSocket không available
        (async () => {
          try {
            const response = await chatApiService.sendMessage({
              targetUserId: targetId,
              username: user.username,
              fullName: user.fullName || user.username,
              avatar: user.avatar || null,
              message: '',
              timestamp: stickerData.timestamp,
              type: 'sticker',
              media: stickerId,
              audio: audioUrl || null,
            });

            const finalStickerId = response.data?.id || tempId;
            const finalStickerData = { ...stickerData, id: finalStickerId };

            // Cập nhật cache trước (luôn cập nhật cache để các component khác có thể lấy được)
            const cachedMessages = messagesByConversationRef.current.get(targetId) || [];
            let updatedCachedMessages: ChatMessage[];
            if (cachedMessages.some((msg) => msg.id === tempId)) {
              // Thay thế temp message bằng message thật
              updatedCachedMessages = cachedMessages.map((msg) =>
                msg.id === tempId ? finalStickerData : msg
              ).sort((a, b) => a.timestamp - b.timestamp);
            } else {
              // Nếu không tìm thấy temp message, thêm message mới
              updatedCachedMessages = [...cachedMessages, finalStickerData].sort((a, b) => a.timestamp - b.timestamp);
            }
            messagesByConversationRef.current.set(targetId, updatedCachedMessages);

            // Cập nhật state nếu đây là conversation hiện tại
            if (currentTargetUserId === targetId) {
              setMessages(updatedCachedMessages);
            }

            updateConversationInternal(finalStickerData, false, targetId);
          } catch {
            // Không rollback để giữ UX mượt mà
          } finally {
            sendingMessagesRef.current.delete(tempId);
          }
        })();
      }
      
      // Tự động tắt typing indicator sau khi gửi sticker
      if (typingSentRef.current) {
        typingSentRef.current = false;
      }
    },
    [user, currentTargetUserId, updateConversationInternal]
  );

  // Hàm helper để cập nhật message với blob URL thành URL thật và gửi qua WebSocket
  const updateImageMessageWithRealUrl = useCallback(
    async (blobUrl: string, realUrl: string, targetUserId: number) => {
      if (!user) return;

      // Tìm message với blob URL trong cache
      const conversationMessages = messagesByConversationRef.current.get(targetUserId) || [];
      const blobMessage = conversationMessages.find(
        (msg) =>
          msg.type === 'image' &&
          msg.media === blobUrl &&
          msg.userId === user.userId
      );

      if (!blobMessage) return;

      // Tạo message mới với URL thật và cùng temp ID
      const updatedMessage: ChatMessage = {
        ...blobMessage,
        media: realUrl,
      };

      // Cập nhật cache
      const updatedCache = conversationMessages.map((msg) =>
        msg.id === blobMessage.id ? updatedMessage : msg
      );
      messagesByConversationRef.current.set(targetUserId, updatedCache);

      // Cập nhật state nếu đang ở conversation này
      if (currentTargetUserId === targetUserId) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === blobMessage.id ? updatedMessage : msg))
        );
      }

      // Cập nhật conversation
      updateConversationInternal(updatedMessage, false, targetUserId);

      // Gửi qua WebSocket với cùng temp ID
      (updatedMessage as any).targetUserId = targetUserId;
      if (wsRef.current && wsRef.current.isConnected()) {
        const roomID = getChatRoomID(user.userId, targetUserId);
        wsRef.current.sendMessage(roomID, targetUserId, updatedMessage);
      } else {
        // Fallback: gửi qua REST API nếu WebSocket không available
        try {
          const response = await chatApiService.sendMessage({
            targetUserId: targetUserId,
            username: user.username,
            fullName: user.fullName || user.username,
            avatar: user.avatar || null,
            message: '',
            timestamp: updatedMessage.timestamp,
            type: 'image',
            media: realUrl,
          });

          const finalImageId = response.data?.id || blobMessage.id;
          const finalImageData = { ...updatedMessage, id: finalImageId };

          // Cập nhật cache với ID thật từ server
          const finalCache = updatedCache.map((msg) =>
            msg.id === blobMessage.id ? finalImageData : msg
          );
          messagesByConversationRef.current.set(targetUserId, finalCache);

          // Cập nhật state nếu đang ở conversation này
          if (currentTargetUserId === targetUserId) {
            setMessages((prev) =>
              prev.map((msg) => (msg.id === blobMessage.id ? finalImageData : msg))
            );
          }

          updateConversationInternal(finalImageData, false, targetUserId);
        } catch {
          // Silent fail
        }
      }
    },
    [user, currentTargetUserId, updateConversationInternal]
  );

  // Gửi ảnh
  const sendImage = useCallback(
    async (imageUrl: string, targetUserIdParam?: number) => {
      if (!user) {
        return;
      }

      const targetId = targetUserIdParam || currentTargetUserId;
      if (!targetId || targetId === user.userId) {
        setError('Vui lòng chọn người để chat');
        return;
      }

      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const imageData: ChatMessage = {
        id: tempId,
        userId: user.userId,
        username: user.username,
        fullName: user.fullName || user.username,
        avatar: user.avatar || null,
        message: '',
        timestamp: Date.now(),
        type: 'image',
        media: imageUrl,
      };

      // Tránh gửi duplicate
      if (sendingMessagesRef.current.has(tempId)) {
        return;
      }
      sendingMessagesRef.current.add(tempId);

      // Optimistic update: thêm ảnh vào messages ngay lập tức (KHÔNG CHỜ API)
      // Luôn lưu vào cache để ChatBoxInstance có thể lấy được ngay
      const conversationMessages = messagesByConversationRef.current.get(targetId) || [];
      const isDuplicateInCache = conversationMessages.some((msg) => msg.id === tempId);
      
      if (!isDuplicateInCache) {
        const updatedCache = [...conversationMessages, imageData].sort((a, b) => a.timestamp - b.timestamp);
        messagesByConversationRef.current.set(targetId, updatedCache);
      }
      
      // Cập nhật state nếu đang ở conversation này
      if (currentTargetUserId === targetId) {
        setMessages((prev) => {
          // Tránh duplicate
          if (prev.some((msg) => msg.id === tempId)) {
            return prev;
          }
          const updated = [...prev, imageData].sort((a, b) => a.timestamp - b.timestamp);
          return updated;
        });
      }

      // Optimistic update: cập nhật conversation ngay lập tức (KHÔNG CHỜ API)
      // Để floating button cập nhật ngay và sắp xếp lại theo tin nhắn mới nhất
      updateConversationInternal(imageData, false, targetId);

      // Kiểm tra xem imageUrl có phải là blob URL không (preview URL)
      const isBlobUrl = imageUrl.startsWith('blob:');

      // Nếu là blob URL, không gọi API sendMessage ngay
      // Sẽ được gọi sau khi upload xong trong handleImageSelect
      if (isBlobUrl) {
        sendingMessagesRef.current.delete(tempId);
        return;
      }

      // Thêm targetUserId vào imageData để backend biết
      (imageData as any).targetUserId = targetId;

      // Chỉ gửi qua WebSocket nếu available
      // Backend sẽ tự động lưu vào DB khi nhận WebSocket message
      if (wsRef.current && wsRef.current.isConnected()) {
        const roomID = getChatRoomID(user.userId, targetId);
        wsRef.current.sendMessage(roomID, targetId, imageData);
        sendingMessagesRef.current.delete(tempId);
      } else {
        // Fallback: chỉ gửi qua REST API nếu WebSocket không available
        (async () => {
          try {
            const response = await chatApiService.sendMessage({
              targetUserId: targetId,
              username: user.username,
              fullName: user.fullName || user.username,
              avatar: user.avatar || null,
              message: '',
              timestamp: imageData.timestamp,
              type: 'image',
              media: imageUrl,
            });

            const finalImageId = response.data?.id || tempId;
            const finalImageData = { ...imageData, id: finalImageId };

            if (currentTargetUserId === targetId) {
              setMessages((prev) => {
                if (prev.some((msg) => msg.id === tempId)) {
                  const updated = prev.map((msg) =>
                    msg.id === tempId ? finalImageData : msg
                  ).sort((a, b) => a.timestamp - b.timestamp);
                  messagesByConversationRef.current.set(targetId, updated);
                  return updated;
                }
                // Nếu không tìm thấy temp message, thêm message mới
                const updated = [...prev, finalImageData].sort((a, b) => a.timestamp - b.timestamp);
                messagesByConversationRef.current.set(targetId, updated);
                return updated;
              });
            } else {
              // Cập nhật cache ngay cả khi không phải conversation hiện tại
              const cachedMessages = messagesByConversationRef.current.get(targetId) || [];
              const updated = cachedMessages.map((msg) =>
                msg.id === tempId ? finalImageData : msg
              );
              if (!updated.some((msg) => msg.id === finalImageId)) {
                updated.push(finalImageData);
              }
              messagesByConversationRef.current.set(targetId, updated.sort((a, b) => a.timestamp - b.timestamp));
            }

            updateConversationInternal(finalImageData, false, targetId);
          } catch {
            // Không rollback để giữ UX mượt mà
          } finally {
            sendingMessagesRef.current.delete(tempId);
          }
        })();
      }
      
      // Tự động tắt typing indicator sau khi gửi ảnh
      if (typingSentRef.current) {
        typingSentRef.current = false;
      }
    },
    [user, currentTargetUserId, updateConversationInternal]
  );

  // Hàm để thông báo typing indicator
  const notifyTyping = useCallback(
    async (typing: boolean) => {
      if (!user || !currentTargetUserId || currentTargetUserId === user.userId) {
        return;
      }

      // Chỉ gửi typing event nếu trạng thái thay đổi
      if (typing === typingSentRef.current) {
        return;
      }

      typingSentRef.current = typing;

      // Gửi typing indicator qua WebSocket
      if (wsRef.current && wsRef.current.isConnected()) {
        const roomID = getChatRoomID(user.userId, currentTargetUserId);
        wsRef.current.sendTyping(roomID, typing);
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
    // Lấy typing state từ ref cho conversation mới
    if (currentTargetUserId) {
      const typingState = typingByConversationRef.current.get(currentTargetUserId) || false;
      setIsTyping(typingState);
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

  // Helper function để lấy hasMore cho một user cụ thể
  const getHasMoreForUser = useCallback((targetUserId: number) => {
    return hasMoreByConversationRef.current.get(targetUserId) ?? false;
  }, []);

  // Function để load more messages khi scroll lên
  const loadMoreMessages = useCallback(async (targetUserId: number) => {
    if (!user || isLoadingMore) {
      return;
    }

    const currentMessages = messagesByConversationRef.current.get(targetUserId) || [];
    if (currentMessages.length === 0) {
      return;
    }

    // Lấy timestamp của message cũ nhất (đầu danh sách)
    const oldestMessage = currentMessages[0];
    if (!oldestMessage) {
      return;
    }

    // Kiểm tra còn messages để load không
    const hasMore = hasMoreByConversationRef.current.get(targetUserId);
    if (!hasMore) {
      return;
    }

    try {
      setIsLoadingMore(true);
      const response = await chatApiService.getMessages({
        targetUserId: targetUserId,
        limit: 50,
        beforeTimestamp: oldestMessage.timestamp,
      });

      if (response.data?.messages && response.data.messages.length > 0) {
        const apiMessages = response.data.messages;
        const hasMore = response.data.hasMore ?? false;

        // Backend trả về từ mới nhất (index 0) đến cũ nhất (index cuối)
        // Reverse để có thứ tự từ cũ nhất đến mới nhất
        const reversedMessages = [...apiMessages].reverse();
        
        // Prepend messages mới vào đầu danh sách (messages cũ hơn)
        const updatedMessages = [...reversedMessages, ...currentMessages].sort((a, b) => a.timestamp - b.timestamp);
        
        // Lưu vào cache
        messagesByConversationRef.current.set(targetUserId, updatedMessages);
        hasMoreByConversationRef.current.set(targetUserId, hasMore);

        // Cập nhật messages nếu đang ở conversation này
        if (currentTargetUserId === targetUserId) {
          setMessages(updatedMessages);
        }
      } else {
        // Không còn messages để load
        hasMoreByConversationRef.current.set(targetUserId, false);
      }
    } catch {
      // Silent fail
    } finally {
      setIsLoadingMore(false);
    }
  }, [user, isLoadingMore, currentTargetUserId]);

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
      // Nếu đóng conversation và currentTargetUserId đang trỏ đến nó, reset về null
      // Điều này đảm bảo khi có tin nhắn mới, unreadCount sẽ được tăng đúng
      if (currentTargetUserIdRef.current === userId) {
        setCurrentTargetUserId(null);
      }
    }
  }, [setCurrentTargetUserId]);

  // Tính hasMoreMessages cho currentTargetUserId
  const hasMoreMessages = currentTargetUserId 
    ? (hasMoreByConversationRef.current.get(currentTargetUserId) ?? false)
    : false;

  return {
    messages,
    isConnected,
    sendMessage,
    sendIcon,
    sendSticker,
    sendImage,
    updateImageMessageWithRealUrl,
    error,
    currentTargetUserId,
    setCurrentTargetUserId,
    conversations,
    isLoadingConversations,
    isLoadingMessages,
    isLoadingMore,
    hasMoreMessages,
    loadMoreMessages,
    isTyping,
    notifyTyping,
    onlineUsers,
    onlineUsersList,
    isUserOnline,
    getMessagesForUser,
    getTypingForUser,
    getMessageCountForUser,
    getHasMoreForUser,
    setOpenConversation,
  };
};

