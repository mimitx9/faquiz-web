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

    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://api.facourse.com/fai'
      : 'http://localhost:7071/fai';

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
    const currentTargetId = currentTargetUserIdRef.current;
    const isConversationOpen = openConversationsRef.current.has(targetId) || currentTargetId === targetId;
    
    // Kiểm tra xem message này đã được xử lý để tăng unreadCount chưa
    // Tránh tăng trùng khi nhận từ nhiều nguồn (channel + notification)
    const messageKey = `${targetId}-${message.id}`;
    const alreadyProcessed = processedUnreadMessagesRef.current.has(messageKey);
    
    
    setConversations((prev) => {
      const existing = prev.find((conv) => conv.targetUserId === targetId);
      if (existing) {
        // Chỉ tăng unreadCount nếu conversation chưa mở và message chưa được xử lý
        let newUnreadCount = existing.unreadCount;
        if (!isConversationOpen && !alreadyProcessed) {
          newUnreadCount = existing.unreadCount + 1;
          // Đánh dấu message đã được xử lý
          processedUnreadMessagesRef.current.add(messageKey);
        }
        
        return prev.map((conv) =>
          conv.targetUserId === targetId
            ? {
                ...conv,
                lastMessage: message,
                unreadCount: newUnreadCount,
              }
            : conv
        );
      } else {
        // Tạo conversation mới - cần lấy thông tin target user
        // Tạm thời dùng thông tin từ message, sau này có thể fetch từ API
        let newUnreadCount = 0;
        if (!isConversationOpen && !alreadyProcessed) {
          newUnreadCount = 1;
          // Đánh dấu message đã được xử lý
          processedUnreadMessagesRef.current.add(messageKey);
        }
        
        return [
          ...prev,
          {
            targetUserId: targetId,
            targetUsername: message.userId === user.userId ? `User ${targetId}` : message.username,
            targetFullName: message.userId === user.userId ? `User ${targetId}` : message.fullName,
            targetAvatar: message.userId === user.userId ? undefined : message.avatar,
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

    // Xác định targetUserId từ message
    // Nếu message từ user khác, targetUserId là userId của message
    // Nếu message từ chính mình, targetUserId là currentTargetUserId
    const targetId = data.userId === user.userId 
      ? (currentTargetUserIdRef.current || data.userId)
      : data.userId;
    
    // Bỏ qua nếu target là chính mình
    if (targetId === user.userId) return;

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
    const hasSimilarMessage = conversationMessages.some((msg) => 
      msg.userId === data.userId && 
      msg.type === data.type &&
      msg.message === data.message &&
      msg.media === data.media &&
      Math.abs(msg.timestamp - data.timestamp) < 3000 // Trong vòng 3 giây
    );
    
    const isDuplicate = isDuplicateById || isDuplicateByTempId || hasSimilarMessage;
    
    // Tin nhắn từ user khác - cập nhật activity và conversation
    if (data.userId !== user.userId) {
      // Thêm user vào onlineUsersList với thông tin từ message
      updateUserActivity(data.userId, {
        username: data.username,
        fullName: data.fullName,
        avatar: data.avatar ?? null,
      });
      updateConversationInternal(data);
    }
    
    // Cập nhật messages
    if (currentTargetUserIdRef.current === targetId) {
      setMessages((prev) => {
        // Kiểm tra duplicate trong state hiện tại
        const isDuplicateInState = prev.some((msg) => {
          if (msg.id === data.id) return true;
          // Kiểm tra temp ID duplicate
          if (msg.id.startsWith('temp-') && data.userId === user.userId) {
            const isSameContent = msg.type === data.type && 
              msg.message === data.message && 
              msg.media === data.media;
            const isSameTimestamp = Math.abs(msg.timestamp - data.timestamp) < 3000;
            return isSameContent && isSameTimestamp;
          }
          return false;
        });
        
        if (isDuplicateInState) {
          // Nếu là duplicate nhưng có temp ID, thay thế temp message bằng message thật từ server
          if (data.userId === user.userId) {
            const updated = prev.map((msg) => {
              // Tìm temp message tương ứng và thay thế bằng message thật
              if (msg.id.startsWith('temp-') && msg.userId === data.userId) {
                const isSameContent = msg.type === data.type && 
                  msg.message === data.message && 
                  msg.media === data.media;
                const isSameTimestamp = Math.abs(msg.timestamp - data.timestamp) < 3000;
                if (isSameContent && isSameTimestamp) {
                  return data; // Thay thế temp message bằng message thật
                }
              }
              return msg;
            }).sort((a, b) => a.timestamp - b.timestamp);
            messagesByConversationRef.current.set(targetId, updated);
            return updated;
          }
          return prev;
        }
        
        const updated = [...prev, data].sort((a, b) => a.timestamp - b.timestamp);
        messagesByConversationRef.current.set(targetId, updated);
        // Tăng count nếu tin nhắn mới và chưa có tin nhắn tương tự
        if (!isDuplicate) {
          const currentCount = messageCountByConversationRef.current.get(targetId) || 0;
          messageCountByConversationRef.current.set(targetId, currentCount + 1);
        }
        return updated;
      });
    } else {
      // Vẫn lưu vào cache để khi mở conversation sẽ có tin nhắn
      if (!isDuplicate) {
        // Nếu có temp message, thay thế bằng message thật
        let updatedMessages = conversationMessages;
        if (data.userId === user.userId) {
          updatedMessages = conversationMessages.map((msg) => {
            if (msg.id.startsWith('temp-') && msg.userId === data.userId) {
              const isSameContent = msg.type === data.type && 
                msg.message === data.message && 
                msg.media === data.media;
              const isSameTimestamp = Math.abs(msg.timestamp - data.timestamp) < 3000;
              if (isSameContent && isSameTimestamp) {
                return data; // Thay thế temp message bằng message thật
              }
            }
            return msg;
          });
          // Nếu không tìm thấy temp message để thay thế, thêm message mới
          if (updatedMessages.length === conversationMessages.length) {
            updatedMessages = [...conversationMessages, data];
          }
        } else {
          updatedMessages = [...conversationMessages, data];
        }
        
        const updated = updatedMessages.sort((a, b) => a.timestamp - b.timestamp);
        messagesByConversationRef.current.set(targetId, updated);
        // Tăng count nếu chưa có tin nhắn tương tự
        if (!hasSimilarMessage) {
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
                
                // Nếu lastMessage từ state mới hơn, giữ lại unreadCount và lastMessage từ state
                if (existingLastMsgTime > apiLastMsgTime) {
                  merged.set(existingConv.targetUserId, {
                    ...apiConv,
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

      // Tránh gửi duplicate
      if (sendingMessagesRef.current.has(tempId)) {
        return;
      }
      sendingMessagesRef.current.add(tempId);

      // Optimistic update: thêm tin nhắn vào messages ngay lập tức (KHÔNG CHỜ API)
      // Không tăng count ở đây vì sẽ tăng khi nhận được từ WebSocket
      if (currentTargetUserId === targetId) {
        setMessages((prev) => {
          // Tránh duplicate
          if (prev.some((msg) => msg.id === tempId)) {
            return prev;
          }
          const updated = [...prev, messageData].sort((a, b) => a.timestamp - b.timestamp);
          // Lưu vào cache
          messagesByConversationRef.current.set(targetId, updated);
          return updated;
        });
      }

      // Optimistic update: cập nhật conversation ngay lập tức (KHÔNG CHỜ API)
      // Để floating button cập nhật ngay và sắp xếp lại theo tin nhắn mới nhất
      updateConversationInternal(messageData, false, targetId);

      // Chỉ gửi qua WebSocket nếu available
      // Backend sẽ tự động lưu vào DB khi nhận WebSocket message
      if (wsRef.current && wsRef.current.isConnected()) {
        const roomID = getChatRoomID(user.userId, targetId);
        wsRef.current.sendMessage(roomID, targetId, messageData);
        // Xóa temp ID sau khi gửi thành công qua WebSocket
        sendingMessagesRef.current.delete(tempId);
      } else {
        // Fallback: gửi qua REST API nếu WebSocket không available
        // Đảm bảo message được gửi ngay cả khi WebSocket disconnect
        (async () => {
          try {
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

            // Cập nhật ID thật từ server (thay thế temp ID)
            if (currentTargetUserId === targetId) {
              setMessages((prev) => {
                if (prev.some((msg) => msg.id === tempId)) {
                  const updated = prev.map((msg) =>
                    msg.id === tempId ? finalMessageData : msg
                  ).sort((a, b) => a.timestamp - b.timestamp);
                  messagesByConversationRef.current.set(targetId, updated);
                  return updated;
                }
                // Nếu không tìm thấy temp message, thêm message mới
                const updated = [...prev, finalMessageData].sort((a, b) => a.timestamp - b.timestamp);
                messagesByConversationRef.current.set(targetId, updated);
                return updated;
              });
            } else {
              // Cập nhật cache ngay cả khi không phải conversation hiện tại
              const cachedMessages = messagesByConversationRef.current.get(targetId) || [];
              const updated = cachedMessages.map((msg) =>
                msg.id === tempId ? finalMessageData : msg
              );
              if (!updated.some((msg) => msg.id === finalMessageId)) {
                updated.push(finalMessageData);
              }
              messagesByConversationRef.current.set(targetId, updated.sort((a, b) => a.timestamp - b.timestamp));
            }

            // Cập nhật lại conversation với ID thật từ server
            updateConversationInternal(finalMessageData, false, targetId);
          } catch (error) {
            // Nếu gửi qua REST API thất bại, giữ lại temp message để user biết
            console.error('Failed to send message via REST API:', error);
            // Không rollback để giữ UX mượt mà
          } finally {
            sendingMessagesRef.current.delete(tempId);
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
      if (currentTargetUserId === targetId) {
        setMessages((prev) => {
          // Tránh duplicate
          if (prev.some((msg) => msg.id === tempId)) {
            return prev;
          }
          const updated = [...prev, iconData].sort((a, b) => a.timestamp - b.timestamp);
          // Lưu vào cache
          messagesByConversationRef.current.set(targetId, updated);
          return updated;
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

            if (currentTargetUserId === targetId) {
              setMessages((prev) => {
                if (prev.some((msg) => msg.id === tempId)) {
                  const updated = prev.map((msg) =>
                    msg.id === tempId ? finalIconData : msg
                  ).sort((a, b) => a.timestamp - b.timestamp);
                  messagesByConversationRef.current.set(targetId, updated);
                  return updated;
                }
                // Nếu không tìm thấy temp message, thêm message mới
                const updated = [...prev, finalIconData].sort((a, b) => a.timestamp - b.timestamp);
                messagesByConversationRef.current.set(targetId, updated);
                return updated;
              });
            } else {
              // Cập nhật cache ngay cả khi không phải conversation hiện tại
              const cachedMessages = messagesByConversationRef.current.get(targetId) || [];
              const updated = cachedMessages.map((msg) =>
                msg.id === tempId ? finalIconData : msg
              );
              if (!updated.some((msg) => msg.id === finalIconId)) {
                updated.push(finalIconData);
              }
              messagesByConversationRef.current.set(targetId, updated.sort((a, b) => a.timestamp - b.timestamp));
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
      if (currentTargetUserId === targetId) {
        setMessages((prev) => {
          // Tránh duplicate
          if (prev.some((msg) => msg.id === tempId)) {
            return prev;
          }
          const updated = [...prev, stickerData].sort((a, b) => a.timestamp - b.timestamp);
          // Lưu vào cache
          messagesByConversationRef.current.set(targetId, updated);
          return updated;
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

            if (currentTargetUserId === targetId) {
              setMessages((prev) => {
                if (prev.some((msg) => msg.id === tempId)) {
                  const updated = prev.map((msg) =>
                    msg.id === tempId ? finalStickerData : msg
                  ).sort((a, b) => a.timestamp - b.timestamp);
                  messagesByConversationRef.current.set(targetId, updated);
                  return updated;
                }
                // Nếu không tìm thấy temp message, thêm message mới
                const updated = [...prev, finalStickerData].sort((a, b) => a.timestamp - b.timestamp);
                messagesByConversationRef.current.set(targetId, updated);
                return updated;
              });
            } else {
              // Cập nhật cache ngay cả khi không phải conversation hiện tại
              const cachedMessages = messagesByConversationRef.current.get(targetId) || [];
              const updated = cachedMessages.map((msg) =>
                msg.id === tempId ? finalStickerData : msg
              );
              if (!updated.some((msg) => msg.id === finalStickerId)) {
                updated.push(finalStickerData);
              }
              messagesByConversationRef.current.set(targetId, updated.sort((a, b) => a.timestamp - b.timestamp));
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
      // Không tăng count ở đây vì sẽ tăng khi nhận được từ Pusher
      if (currentTargetUserId === targetId) {
        setMessages((prev) => {
          // Tránh duplicate
          if (prev.some((msg) => msg.id === tempId)) {
            return prev;
          }
          const updated = [...prev, imageData].sort((a, b) => a.timestamp - b.timestamp);
          // Lưu vào cache
          messagesByConversationRef.current.set(targetId, updated);
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

