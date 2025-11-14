/**
 * WebSocket Client cho Chat System
 * Thay thế Pusher để kết nối với Golang WebSocket Server
 * Hỗ trợ Protobuf Binary Messages để tối ưu performance
 */

// Dynamic import protobufjs để tránh lỗi SSR và giảm bundle size
// Sử dụng type any để tránh type error khi protobuf chưa load
let protobuf: any = null;

// Load protobufjs chỉ khi cần (browser only)
// Không block code nếu không load được
if (typeof window !== 'undefined') {
  import('protobufjs')
    .then((pb) => {
      protobuf = pb;
    })
    .catch(() => {
      protobuf = null;
    });
}

export interface WebSocketMessage {
  type: string;
  roomId?: string | null;
  data?: any;
}

export interface PresenceMember {
  userId: number;
  username: string;
  fullName: string;
  avatar?: string | null;
  onlineSince: number;
}

export interface WebSocketEventHandlers {
  onNewMessage?: (data: any) => void;
  onTyping?: (data: { userId: number; isTyping: boolean; roomId?: string | null }) => void;
  onJoinedRoom?: (data: { roomID: string; status: string }) => void;
  onLeftRoom?: (data: { roomID: string; status: string }) => void;
  onError?: (data: { message: string }) => void;
  onPong?: (data: { timestamp: number }) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onNotification?: (data: { fromUserId: number; channelName: string; message: any }) => void;
  onPresenceList?: (data: { members: Record<string, PresenceMember> }) => void;
  onUserOnline?: (data: { userId: number; info: PresenceMember }) => void;
  onUserOffline?: (data: { userId: number }) => void;
}

export class ChatWebSocket {
  private ws: WebSocket | null = null;
  private token: string;
  private baseUrl: string;
  private handlers: WebSocketEventHandlers = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // 1 giây
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private isManualClose = false;
  private joinedRooms = new Set<string>();
  private protoRoot: any = null; // Protobuf root definition (any để tránh type error khi protobuf chưa load)
  private protoLoadPromise: Promise<void> | null = null; // Promise để đảm bảo chỉ load proto một lần

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  private getWebSocketUrl(baseUrl: string): string {
    // Chuyển đổi HTTP URL sang WebSocket URL
    // http:// -> ws://
    // https:// -> wss://
    let wsUrl = baseUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
    return `${wsUrl}/faquiz/v1/chat/ws?token=${this.token}`;
  }

  /**
   * Load proto definition từ file
   * Cache để không phải load lại nhiều lần
   * Có thể force reload bằng cách set protoRoot = null trước khi gọi
   */
  private async loadProto(forceReload: boolean = false): Promise<void> {
    if (this.protoRoot && !forceReload) {
      return; // Đã load rồi
    }

    // Nếu force reload, reset protoRoot và promise
    if (forceReload) {
      this.protoRoot = null;
      this.protoLoadPromise = null;
    }

    if (this.protoLoadPromise && !forceReload) {
      return this.protoLoadPromise; // Đang load, đợi promise hiện tại
    }

    this.protoLoadPromise = (async () => {
      try {
        // Đợi protobufjs load nếu chưa có
        if (!protobuf) {
          try {
            protobuf = await import('protobufjs');
          } catch {
            this.protoRoot = null;
            return;
          }
        }

        if (!protobuf) {
          this.protoRoot = null;
          return;
        }

        // Load proto definition từ HTTP URL (public folder)
        // Thêm timestamp để cache busting và đảm bảo load proto mới nhất
        const protoPath = '/proto/websocket/chat.proto';
        const cacheBuster = `?v=${Date.now()}`;
        
        try {
          this.protoRoot = await protobuf.load(protoPath + cacheBuster);
        } catch {
          this.protoRoot = null;
        }
      } catch {
        this.protoRoot = null;
      }
    })();

    return this.protoLoadPromise;
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.isManualClose = false;
    const wsUrl = this.getWebSocketUrl(this.baseUrl);
    
    // Load proto definition (async, không block connection)
    this.loadProto(true).catch(() => {});
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      // QUAN TRỌNG: Set binary type để nhận binary messages (protobuf)
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.handlers.onConnected?.();
        
        // Bắt đầu ping interval (mỗi 30 giây)
        this.startPingInterval();
        
        // Join presence room để nhận danh sách users online
        this.joinPresence();
        
        // Rejoin các rooms đã join trước đó
        this.joinedRooms.forEach((roomId) => {
          this.joinRoomById(roomId);
        });
      };

      this.ws.onmessage = (event) => {
        try {
          if (event.data instanceof ArrayBuffer) {
            // Binary message - protobuf
            this.handleBinaryMessage(event.data);
          }
        } catch (error) {
          // Silent fail - chỉ xử lý binary messages
        }
      };

      this.ws.onerror = () => {
        this.handlers.onError?.({ message: 'WebSocket connection error' });
      };

      this.ws.onclose = () => {
        this.handlers.onDisconnected?.();
        this.stopPingInterval();
        
        // Tự động reconnect nếu không phải manual close
        if (!this.isManualClose) {
          this.scheduleReconnect();
        }
      };
    } catch {
      this.handlers.onError?.({ message: 'Failed to create WebSocket connection' });
      if (!this.isManualClose) {
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.handlers.onError?.({ message: 'Không thể kết nối. Vui lòng thử lại sau.' });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  private startPingInterval() {
    this.stopPingInterval();
    this.pingInterval = setInterval(() => {
      this.ping();
    }, 30000); // Ping mỗi 30 giây
  }

  private stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private ping() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: 'ping',
        roomId: null,
        data: null,
      });
    }
  }


  /**
   * Xử lý binary message (protobuf)
   */
  private handleBinaryMessage(buffer: ArrayBuffer) {
    if (!this.protoRoot || !protobuf) {
      return;
    }

    try {
      const WebSocketChatMessage = this.protoRoot.lookupType('websocket.chat.WebSocketChatMessage');
      const bufferArray = new Uint8Array(buffer);
      
      let message: any;
      try {
        message = WebSocketChatMessage.decode(bufferArray);
      } catch {
        return;
      }
      
      // Convert to plain object
      let obj: any;
      try {
        obj = WebSocketChatMessage.toObject(message, {
          longs: String,      // Convert int64 to string
          enums: String,      // Convert enums to string
          bytes: String,      // Convert bytes to string
          defaults: true,     // Include default values
          arrays: true,        // Include empty arrays
          objects: true,      // Include empty objects
        });
      } catch {
        obj = {
          type: message.type || '',
          roomId: message.roomId || null,
        };
        
        if (message.newMessage) {
          try {
            const ChatMessage = this.protoRoot.lookupType('websocket.chat.ChatMessage');
            const rawMessage = message.newMessage;
            
            if (rawMessage && typeof rawMessage.toObject === 'function') {
              const chatMessageObj = ChatMessage.toObject(rawMessage, {
                longs: String,
                enums: String,
                bytes: String,
                defaults: true,
                arrays: true,
                objects: true,
              });
              obj.newMessage = chatMessageObj;
            } else {
              obj.newMessage = rawMessage;
            }
          } catch {
            try {
              const MessageDto = this.protoRoot.lookupType('websocket.chat.MessageDto');
              const rawMessage = message.newMessage;
              if (rawMessage && typeof rawMessage.toObject === 'function') {
                obj.newMessage = MessageDto.toObject(rawMessage, {
                  longs: String,
                  enums: String,
                  bytes: String,
                  defaults: true,
                  arrays: true,
                  objects: true,
                });
              } else {
                obj.newMessage = rawMessage;
              }
            } catch {
              obj.newMessage = null;
            }
          }
        }
        
        if (message.typingIndicator) obj.typingIndicator = message.typingIndicator;
        if (message.joinedRoom) obj.joinedRoom = message.joinedRoom;
        if (message.leftRoom) obj.leftRoom = message.leftRoom;
        if (message.error) obj.error = message.error;
        if (message.pong) obj.pong = message.pong;
        if (message.presenceList) obj.presenceList = message.presenceList;
        if (message.userOnline) obj.userOnline = message.userOnline;
        if (message.userOffline) obj.userOffline = message.userOffline;
        if (message.newMessageNotification) obj.newMessageNotification = message.newMessageNotification;
      }
      
      // Helper function để xử lý avatar đúng cách (dùng chung cho cả presence-list và user-online)
      const processAvatar = (avatar: any): string | null => {
        if (avatar === null || avatar === undefined) return null;
        if (typeof avatar === 'string') {
          const trimmed = avatar.trim();
          return trimmed !== '' ? trimmed : null;
        }
        return null;
      };

      // Convert protobuf message to WebSocketMessage format
      const wsMessage: WebSocketMessage = {
        type: obj.type || '',
        roomId: obj.roomId || null,
        data: null,
      };

      // Map protobuf oneof data to WebSocketMessage.data
      if (obj.newMessage) {
        wsMessage.type = 'new-message';
        try {
          // newMessage giờ là ChatMessage trực tiếp (không còn NewMessageData wrapper)
          const messageData = obj.newMessage;
          if (!messageData) {
            return;
          }
          
          let chatMessageObj = messageData;
          if (message.newMessage && typeof message.newMessage.toObject === 'function') {
            try {
              const ChatMessage = this.protoRoot.lookupType('websocket.chat.ChatMessage');
              chatMessageObj = ChatMessage.toObject(message.newMessage, {
                longs: String,
                enums: String,
                bytes: String,
                defaults: true,
                arrays: true,
                objects: true,
              });
            } catch {
              // Sử dụng messageData đã được decode từ toObject
            }
          }
          
          wsMessage.data = this.convertChatMessage(chatMessageObj);
        } catch {
          return;
        }
      } else if (obj.typingIndicator) {
        wsMessage.type = 'typing';
        wsMessage.data = {
          userId: parseInt(obj.typingIndicator.userId || '0', 10),
          isTyping: obj.typingIndicator.isTyping || false,
        };
      } else if (obj.joinedRoom) {
        wsMessage.type = 'joined-room';
        wsMessage.data = {
          roomID: obj.joinedRoom.roomId || obj.joinedRoom.roomID || '',
          status: obj.joinedRoom.status || '',
        };
      } else if (obj.leftRoom) {
        wsMessage.type = 'left-room';
        wsMessage.data = {
          roomID: obj.leftRoom.roomId || obj.leftRoom.roomID || '',
          status: obj.leftRoom.status || '',
        };
      } else if (obj.error) {
        wsMessage.type = 'error';
        wsMessage.data = {
          message: obj.error.message || '',
        };
      } else if (obj.pong) {
        wsMessage.type = 'pong';
        wsMessage.data = {
          timestamp: parseInt(obj.pong.timestamp || '0', 10),
        };
      } else if (obj.presenceList) {
        wsMessage.type = 'presence-list';
        
        let membersObj: any = null;
        try {
          if (message.presenceList && message.presenceList.members) {
            const PresenceListData = this.protoRoot.lookupType('websocket.chat.PresenceListData');
            const presenceListObj = PresenceListData.toObject(message.presenceList, {
              longs: String,
              enums: String,
              bytes: String,
              defaults: false,
              arrays: true,
              objects: true,
            });
            membersObj = presenceListObj.members;
          }
        } catch {
          membersObj = obj.presenceList.members;
        }
        
        const members: Record<string, PresenceMember> = {};
        if (membersObj) {
          if (Array.isArray(membersObj)) {
            membersObj.forEach((item: any) => {
              if (Array.isArray(item) && item.length === 2) {
                const [key, member] = item;
                members[key] = {
                  userId: parseInt(member.userId || '0', 10),
                  username: member.username || '',
                  fullName: member.fullName || '',
                  avatar: processAvatar(member.avatar),
                  onlineSince: parseInt(member.onlineSince || '0', 10),
                };
              } else if (typeof item === 'object' && item !== null) {
                const key = item.userId?.toString() || '';
                members[key] = {
                  userId: parseInt(item.userId || '0', 10),
                  username: item.username || '',
                  fullName: item.fullName || '',
                  avatar: processAvatar(item.avatar),
                  onlineSince: parseInt(item.onlineSince || '0', 10),
                };
              }
            });
          } else if (typeof membersObj === 'object') {
            Object.keys(membersObj).forEach((key) => {
              const member = membersObj[key];
              members[key] = {
                userId: parseInt(member.userId || '0', 10),
                username: member.username || '',
                fullName: member.fullName || '',
                avatar: processAvatar(member.avatar),
                onlineSince: parseInt(member.onlineSince || '0', 10),
              };
            });
          }
        }
        wsMessage.data = { members };
      } else if (obj.userOnline) {
        wsMessage.type = 'user-online';
        
        let userInfo: any = null;
        try {
          if (message.userOnline && message.userOnline.info) {
            const UserInfo = this.protoRoot.lookupType('websocket.chat.UserInfo');
            userInfo = UserInfo.toObject(message.userOnline.info, {
              longs: String,
              enums: String,
              bytes: String,
              defaults: false,
              arrays: true,
              objects: true,
            });
          }
        } catch {
          userInfo = obj.userOnline.info;
        }
        
        const finalInfo = userInfo || obj.userOnline.info;
        wsMessage.data = {
          userId: parseInt(obj.userOnline.userId || '0', 10),
          info: {
            userId: parseInt(finalInfo?.userId || '0', 10),
            username: finalInfo?.username || '',
            fullName: finalInfo?.fullName || '',
            avatar: processAvatar(finalInfo?.avatar),
            onlineSince: parseInt(finalInfo?.onlineSince || '0', 10),
          },
        };
      } else if (obj.userOffline) {
        wsMessage.type = 'user-offline';
        wsMessage.data = {
          userId: parseInt(obj.userOffline.userId || '0', 10),
        };
      } else if (obj.newMessageNotification) {
        wsMessage.type = 'new-message-notification';
        try {
          // obj.newMessageNotification.message đã được convert thành plain object bởi toObject() với objects: true
          let chatMessageObj = obj.newMessageNotification.message;
          
          // Nếu message vẫn là protobuf message object (chưa được convert), convert nó
          if (message.newMessageNotification && message.newMessageNotification.message && typeof message.newMessageNotification.message.toObject === 'function') {
            try {
              const ChatMessage = this.protoRoot.lookupType('websocket.chat.ChatMessage');
              chatMessageObj = ChatMessage.toObject(message.newMessageNotification.message, {
                longs: String,
                enums: String,
                bytes: String,
                defaults: true,
                arrays: true,
                objects: true,
              });
            } catch {
              // Sử dụng obj đã được decode từ toObject
            }
          }
          
          wsMessage.data = {
            fromUserId: parseInt(obj.newMessageNotification.fromUserId || '0', 10),
            channelName: obj.newMessageNotification.channelName || '',
            message: this.convertChatMessage(chatMessageObj),
          };
        } catch {
          return;
        }
      }

      this.handleMessage(wsMessage);
    } catch {
      // Silent fail - không làm gián đoạn các message khác
    }
  }

  /**
   * Convert protobuf ChatMessage to WebSocket ChatMessage format
   */
  private convertChatMessage(protoMessage: any): any {
    return {
      id: protoMessage.id || '',
      userId: parseInt(protoMessage.userId || '0', 10),
      username: protoMessage.username || '',
      fullName: protoMessage.fullName || '',
      avatar: protoMessage.avatar || null,
      message: protoMessage.message || '',
      timestamp: parseInt(protoMessage.timestamp || '0', 10),
      type: protoMessage.type || 'message',
      media: protoMessage.media || null,
      audio: protoMessage.audio || null,
    };
  }

  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'new-message':
        this.handlers.onNewMessage?.(message.data);
        break;
      case 'typing':
        this.handlers.onTyping?.({
          ...message.data,
          roomId: message.roomId || null,
        });
        break;
      case 'joined-room':
        this.handlers.onJoinedRoom?.(message.data);
        break;
      case 'left-room':
        this.handlers.onLeftRoom?.(message.data);
        break;
      case 'error':
        this.handlers.onError?.(message.data);
        break;
      case 'pong':
        this.handlers.onPong?.(message.data);
        break;
      case 'new-message-notification':
        this.handlers.onNotification?.(message.data);
        break;
      case 'presence-list':
        this.handlers.onPresenceList?.(message.data);
        break;
      case 'user-online':
        this.handlers.onUserOnline?.(message.data);
        break;
      case 'user-offline':
        this.handlers.onUserOffline?.(message.data);
        break;
    }
  }

  setHandlers(handlers: WebSocketEventHandlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  joinRoom(userID1: number, userID2: number) {
    const roomID = this.getRoomID(userID1, userID2);
    this.joinRoomById(roomID);
  }

  joinRoomById(roomID: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.joinedRooms.add(roomID);
      return;
    }

    this.send({
      type: 'join-room',
      roomId: roomID,
      data: null,
    });
    
    this.joinedRooms.add(roomID);
  }

  joinPresence() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.send({
      type: 'join-presence',
      roomId: null,
      data: null,
    });
  }

  leaveRoom(userID1: number, userID2: number) {
    const roomID = this.getRoomID(userID1, userID2);
    this.leaveRoomById(roomID);
  }

  leaveRoomById(roomID: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.joinedRooms.delete(roomID);
      return;
    }

    this.send({
      type: 'leave-room',
      roomId: roomID,
      data: null,
    });
    
    this.joinedRooms.delete(roomID);
  }

  sendTyping(roomID: string, isTyping: boolean) {
    this.send({
      type: 'typing',
      roomId: roomID,
      data: { isTyping },
    });
  }

  sendMessage(roomID: string, targetUserId: number, messageData: any) {
    // Đảm bảo targetUserId có trong messageData để backend có thể validate
    // Nếu messageData không có targetUserId (undefined/null), thêm vào từ parameter
    const dataWithTargetUserId = {
      ...messageData,
      targetUserId: messageData.targetUserId !== undefined && messageData.targetUserId !== null 
        ? messageData.targetUserId 
        : targetUserId,
    };
    
    this.send({
      type: 'send-message',
      roomId: roomID,
      data: dataWithTargetUserId, // Gửi messageData với targetUserId đảm bảo có
    });
  }

  private send(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (this.protoRoot) {
        const binary = this.encodeProtobufMessage(message);
        if (binary) {
          this.ws.send(binary);
          return;
        }
      }
    }
  }

  /**
   * Encode WebSocketMessage thành protobuf binary
   * Tất cả message types đều phải được encode thành protobuf
   */
  private encodeProtobufMessage(message: WebSocketMessage): Uint8Array | null {
    if (!this.protoRoot || !protobuf) {
      return null;
    }

    try {
      const WebSocketChatRequest = this.protoRoot.lookupType('websocket.chat.WebSocketChatRequest');
      
      const payload: any = {
        type: message.type,
        roomId: message.roomId || '',
      };

      // Set oneof data based on type - TẤT CẢ types đều phải có trong proto
      // Với empty messages, cần tạo instance từ type definition để đảm bảo encode đúng
      if (message.type === 'send-message' && message.data) {
        // Convert int64 fields sang số nguyên (protobufjs cần number hoặc Long, không phải string)
        // targetUserId là REQUIRED - phải có giá trị hợp lệ
        const targetUserId = message.data.targetUserId;
        if (!targetUserId || targetUserId === 0) {
          return null;
        }
        
        const timestamp = message.data.timestamp || Date.now();
        
        const targetUserIdNum = typeof targetUserId === 'string' ? parseInt(targetUserId, 10) : Number(targetUserId);
        const timestampNum = typeof timestamp === 'string' ? parseInt(timestamp, 10) : Number(timestamp);
        
        if (isNaN(targetUserIdNum) || targetUserIdNum === 0) {
          return null;
        }
        
        payload.sendMessage = {
          id: message.data.id || '',
          targetUserId: targetUserIdNum, // int64 trong proto cần number hoặc Long - REQUIRED
          username: message.data.username || '',
          fullName: message.data.fullName || '',
          avatar: message.data.avatar || '',
          message: message.data.message || '',
          timestamp: timestampNum, // int64 trong proto cần number hoặc Long
          type: message.data.type || 'message',
          media: message.data.media || '',
          audio: message.data.audio || '',
        };
      } else if (message.type === 'typing') {
        // Luôn set typing field, ngay cả khi message.data không có
        // Đảm bảo isTyping có giá trị boolean hợp lệ
        const isTyping = message.data?.isTyping ?? false;
        payload.typing = {
          isTyping: Boolean(isTyping),
        };
      } else if (message.type === 'ping') {
        // Empty message - chỉ cần set field name, không cần data
        payload.ping = {};
      } else if (message.type === 'join-presence') {
        // Empty message - chỉ cần set field name, không cần data
        payload.joinPresence = {};
      } else if (message.type === 'join-room') {
        // Empty message - chỉ cần set field name, không cần data
        payload.joinRoom = {};
      } else if (message.type === 'leave-room') {
        // Empty message - chỉ cần set field name, không cần data
        payload.leaveRoom = {};
      } else {
        return null;
      }

      const errMsg = WebSocketChatRequest.verify(payload);
      if (errMsg) {
        return null;
      }

      const protoMessage = WebSocketChatRequest.create(payload);
      const buffer = WebSocketChatRequest.encode(protoMessage).finish();
      
      return buffer;
    } catch {
      return null;
    }
  }

  getRoomID(userID1: number, userID2: number): string {
    const min = Math.min(userID1, userID2);
    const max = Math.max(userID1, userID2);
    return `chat-${min}-${max}`;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  disconnect() {
    this.isManualClose = true;
    this.stopPingInterval();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.joinedRooms.clear();
  }
}

