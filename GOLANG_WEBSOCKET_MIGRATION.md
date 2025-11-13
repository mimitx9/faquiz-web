# Migration từ Pusher sang Golang WebSocket - Phân tích chi tiết

## Tổng quan

Bạn đang dùng **Golang backend**, đây là lợi thế lớn! Golang rất phù hợp cho WebSocket server với performance cao và concurrent tốt.

---

## 📊 Mức độ thay đổi

### ✅ **Không phải chuyển đổi nhiều** - Ước tính: **2-3 ngày**

**Lý do:**
1. ✅ Logic business đã có sẵn ở backend (API endpoints)
2. ✅ Frontend chỉ cần thay thế Pusher client → WebSocket client
3. ✅ Next.js API routes có thể xóa hoặc giữ làm fallback
4. ✅ Golang có thư viện WebSocket tốt (`gorilla/websocket`)

---

## 🔍 Phân tích code hiện tại

### 1. Frontend (`src/hooks/useChat.tsx`)

**Hiện tại:**
- Sử dụng `pusher-js` library
- Khởi tạo: `new Pusher(key, { authEndpoint, ... })`
- Subscribe channels: `pusher.subscribe(channelName)`
- Bind events: `channel.bind('new-message', handler)`
- Trigger events: `fetch('/api/pusher/message')`

**Cần thay đổi:**
- Thay `pusher-js` → `socket.io-client` hoặc native `WebSocket`
- Thay `pusher.subscribe()` → `socket.emit('join-room', roomId)`
- Thay `channel.bind()` → `socket.on('new-message', handler)`
- Thay `fetch('/api/pusher/message')` → `socket.emit('send-message', data)`

**Ước tính:** ~200-300 dòng code cần sửa trong `useChat.tsx`

### 2. Next.js API Routes

**Hiện tại:**
- `/api/pusher/auth` - Xác thực Pusher channels
- `/api/pusher/message` - Trigger Pusher events

**Cần thay đổi:**
- ❌ **Có thể xóa hoàn toàn** hoặc giữ làm fallback
- ✅ WebSocket authentication sẽ làm trực tiếp ở Golang backend

**Ước tính:** Có thể xóa 2 files này

### 3. Golang Backend (Cần implement mới)

**Cần implement:**
- WebSocket server endpoint
- Connection management (join/leave rooms)
- Message broadcasting
- Presence tracking (online users)
- Typing indicators

**Ước tính:** ~500-800 dòng code Golang mới

---

## 🏗️ Kiến trúc mới

```
Frontend (Next.js)
    ↓ WebSocket (WSS)
Golang Backend WebSocket Server
    ↓
Database (MySQL/PostgreSQL)
```

**Flow:**
1. Frontend kết nối WebSocket đến Golang backend
2. Authenticate bằng JWT token (trong query params hoặc headers)
3. Join room: `socket.emit('join-room', { roomId: 'chat-5-10' })`
4. Send message: `socket.emit('send-message', data)`
5. Backend lưu vào DB và broadcast đến room
6. Frontend nhận: `socket.on('new-message', handler)`

---

## 📝 Implementation Plan

### Phase 1: Golang WebSocket Server (1-2 ngày)

#### 1.1 Setup dependencies
```bash
go get github.com/gorilla/websocket
go get github.com/gin-gonic/gin  # Nếu dùng Gin
# hoặc
go get github.com/labstack/echo/v4  # Nếu dùng Echo
```

#### 1.2 WebSocket Server Structure
```
backend/
  ├── websocket/
  │   ├── server.go          # WebSocket server main
  │   ├── hub.go             # Connection hub (quản lý rooms)
  │   ├── client.go          # Client connection wrapper
  │   └── message.go         # Message types và handlers
  └── handlers/
      └── chat.go            # Chat handlers
```

#### 1.3 Core Components

**Hub (quản lý rooms và clients):**
- Map `roomId → []*Client` để lưu clients trong mỗi room
- Broadcast message đến tất cả clients trong room
- Handle join/leave room

**Client (mỗi WebSocket connection):**
- Wrapper cho `*websocket.Conn`
- User ID, room subscriptions
- Send/receive messages

**Message Types:**
- `join-room`: Join vào một chat room
- `leave-room`: Rời khỏi room
- `send-message`: Gửi tin nhắn
- `typing`: Typing indicator
- `new-message`: Broadcast tin nhắn mới
- `user-online`: User online/offline

### Phase 2: Frontend Migration (1 ngày)

#### 2.1 Thay thế Pusher client

**Option A: Socket.IO Client (Khuyến nghị)**
- Tương tự Pusher API
- Có reconnection tự động
- Dễ migrate

**Option B: Native WebSocket**
- Nhẹ hơn
- Phải tự implement reconnection

#### 2.2 Update `useChat.tsx`

**Thay đổi chính:**
```typescript
// Trước (Pusher)
const pusher = new Pusher(key, { ... });
const channel = pusher.subscribe(channelName);
channel.bind('new-message', handler);

// Sau (Socket.IO)
const socket = io(wsUrl, { auth: { token } });
socket.emit('join-room', roomId);
socket.on('new-message', handler);
```

### Phase 3: Testing & Migration (0.5-1 ngày)

- Test với một conversation
- Migrate từng phần
- Giữ Pusher làm fallback trong thời gian transition

---

## 💻 Code mẫu Golang

### 1. WebSocket Server với Gin

```go
package websocket

import (
    "encoding/json"
    "log"
    "net/http"
    "sync"
    
    "github.com/gin-gonic/gin"
    "github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool {
        // TODO: Validate origin trong production
        return true
    },
}

// Message types
type Message struct {
    Type      string      `json:"type"`      // "join-room", "send-message", "typing", etc.
    RoomID    string      `json:"roomId,omitempty"`
    Data      interface{} `json:"data,omitempty"`
    UserID    int         `json:"userId,omitempty"`
    TargetID  int         `json:"targetId,omitempty"`
}

type ChatMessage struct {
    ID        string `json:"id"`
    UserID    int    `json:"userId"`
    Username  string `json:"username"`
    FullName  string `json:"fullName"`
    Avatar    string `json:"avatar,omitempty"`
    Message   string `json:"message"`
    Timestamp int64  `json:"timestamp"`
    Type      string `json:"type"` // "message", "icon", "sticker", "image"
    Media     string `json:"media,omitempty"`
    Audio     string `json:"audio,omitempty"`
}

// Client represents a WebSocket connection
type Client struct {
    conn     *websocket.Conn
    userID   int
    rooms    map[string]bool // Set of room IDs
    send     chan []byte
    hub      *Hub
    mu       sync.Mutex
}

func (c *Client) readPump() {
    defer func() {
        c.hub.unregister <- c
        c.conn.Close()
    }()
    
    for {
        _, messageBytes, err := c.conn.ReadMessage()
        if err != nil {
            if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
                log.Printf("WebSocket error: %v", err)
            }
            break
        }
        
        var msg Message
        if err := json.Unmarshal(messageBytes, &msg); err != nil {
            log.Printf("Error unmarshaling message: %v", err)
            continue
        }
        
        c.handleMessage(&msg)
    }
}

func (c *Client) writePump() {
    defer c.conn.Close()
    
    for {
        select {
        case message, ok := <-c.send:
            if !ok {
                c.conn.WriteMessage(websocket.CloseMessage, []byte{})
                return
            }
            
            if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
                log.Printf("Error writing message: %v", err)
                return
            }
        }
    }
}

func (c *Client) handleMessage(msg *Message) {
    switch msg.Type {
    case "join-room":
        c.joinRoom(msg.RoomID)
    case "leave-room":
        c.leaveRoom(msg.RoomID)
    case "send-message":
        c.handleSendMessage(msg)
    case "typing":
        c.handleTyping(msg)
    }
}

func (c *Client) joinRoom(roomID string) {
    c.mu.Lock()
    c.rooms[roomID] = true
    c.mu.Unlock()
    
    c.hub.joinRoom <- &RoomAction{
        client: c,
        roomID: roomID,
    }
}

func (c *Client) leaveRoom(roomID string) {
    c.mu.Lock()
    delete(c.rooms, roomID)
    c.mu.Unlock()
    
    c.hub.leaveRoom <- &RoomAction{
        client: c,
        roomID: roomID,
    }
}

func (c *Client) handleSendMessage(msg *Message) {
    // Parse message data
    dataBytes, _ := json.Marshal(msg.Data)
    var chatMsg ChatMessage
    json.Unmarshal(dataBytes, &chatMsg)
    
    // TODO: Lưu vào database
    // db.SaveMessage(&chatMsg)
    
    // Broadcast đến room
    roomID := getChatRoomID(chatMsg.UserID, msg.TargetID)
    broadcastMsg := Message{
        Type:   "new-message",
        RoomID: roomID,
        Data:   chatMsg,
    }
    
    c.hub.broadcast <- &broadcastMsg
}

func (c *Client) handleTyping(msg *Message) {
    typingMsg := Message{
        Type:     "typing",
        RoomID:   msg.RoomID,
        UserID:   c.userID,
        Data:     msg.Data, // { isTyping: true/false }
    }
    
    c.hub.broadcast <- &typingMsg
}

// Hub manages all WebSocket connections
type Hub struct {
    clients    map[*Client]bool
    rooms      map[string]map[*Client]bool // roomID -> clients
    register   chan *Client
    unregister chan *Client
    joinRoom   chan *RoomAction
    leaveRoom  chan *RoomAction
    broadcast  chan *Message
    mu         sync.RWMutex
}

type RoomAction struct {
    client *Client
    roomID string
}

func NewHub() *Hub {
    return &Hub{
        clients:    make(map[*Client]bool),
        rooms:      make(map[string]map[*Client]bool),
        register:   make(chan *Client),
        unregister: make(chan *Client),
        joinRoom:   make(chan *RoomAction),
        leaveRoom:  make(chan *RoomAction),
        broadcast:  make(chan *Message),
    }
}

func (h *Hub) run() {
    for {
        select {
        case client := <-h.register:
            h.mu.Lock()
            h.clients[client] = true
            h.mu.Unlock()
            
        case client := <-h.unregister:
            h.mu.Lock()
            if _, ok := h.clients[client]; ok {
                delete(h.clients, client)
                // Remove from all rooms
                for roomID := range client.rooms {
                    if room, ok := h.rooms[roomID]; ok {
                        delete(room, client)
                        if len(room) == 0 {
                            delete(h.rooms, roomID)
                        }
                    }
                }
                close(client.send)
            }
            h.mu.Unlock()
            
        case action := <-h.joinRoom:
            h.mu.Lock()
            if h.rooms[action.roomID] == nil {
                h.rooms[action.roomID] = make(map[*Client]bool)
            }
            h.rooms[action.roomID][action.client] = true
            h.mu.Unlock()
            
        case action := <-h.leaveRoom:
            h.mu.Lock()
            if room, ok := h.rooms[action.roomID]; ok {
                delete(room, action.client)
                if len(room) == 0 {
                    delete(h.rooms, action.roomID)
                }
            }
            h.mu.Unlock()
            
        case message := <-h.broadcast:
            h.mu.RLock()
            room, ok := h.rooms[message.RoomID]
            if !ok {
                h.mu.RUnlock()
                continue
            }
            
            messageBytes, _ := json.Marshal(message)
            for client := range room {
                select {
                case client.send <- messageBytes:
                default:
                    close(client.send)
                    delete(room, client)
                }
            }
            h.mu.RUnlock()
        }
    }
}

// Handler function
func HandleWebSocket(hub *Hub) gin.HandlerFunc {
    return func(c *gin.Context) {
        // Authenticate từ token
        token := c.Query("token")
        if token == "" {
            token = c.GetHeader("Authorization")
            if len(token) > 7 && token[:7] == "Bearer " {
                token = token[7:]
            }
        }
        
        // TODO: Verify JWT token và lấy userID
        userID := verifyTokenAndGetUserID(token)
        if userID == 0 {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
            return
        }
        
        // Upgrade connection
        conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
        if err != nil {
            log.Printf("WebSocket upgrade error: %v", err)
            return
        }
        
        // Create client
        client := &Client{
            conn:   conn,
            userID: userID,
            rooms:  make(map[string]bool),
            send:   make(chan []byte, 256),
            hub:    hub,
        }
        
        client.hub.register <- client
        
        // Start goroutines
        go client.writePump()
        go client.readPump()
    }
}

// Helper functions
func getChatRoomID(userID1, userID2 int) string {
    if userID1 > userID2 {
        userID1, userID2 = userID2, userID1
    }
    return fmt.Sprintf("chat-%d-%d", userID1, userID2)
}

func verifyTokenAndGetUserID(token string) int {
    // TODO: Implement JWT verification
    // Parse token và return userID
    return 0
}
```

### 2. Main server setup

```go
package main

import (
    "github.com/gin-gonic/gin"
    "your-project/websocket"
)

func main() {
    r := gin.Default()
    
    // Create hub
    hub := websocket.NewHub()
    go hub.Run()
    
    // WebSocket endpoint
    r.GET("/ws", websocket.HandleWebSocket(hub))
    
    // Health check
    r.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "ok"})
    })
    
    r.Run(":8080")
}
```

### 3. Frontend Integration (Socket.IO Client)

```typescript
// Install: npm install socket.io-client

import { io, Socket } from 'socket.io-client';

// In useChat.tsx
const socketRef = useRef<Socket | null>(null);

useEffect(() => {
  if (!user || !isInitialized) return;
  
  const token = localStorage.getItem('auth_token');
  const wsUrl = process.env.NODE_ENV === 'production'
    ? 'wss://api.facourse.com/ws'
    : 'ws://localhost:7071/ws';
  
  const socket = io(wsUrl, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });
  
  socketRef.current = socket;
  
  socket.on('connect', () => {
    setIsConnected(true);
    setError(null);
  });
  
  socket.on('disconnect', () => {
    setIsConnected(false);
  });
  
  socket.on('error', (err) => {
    setError('Lỗi kết nối chat');
    setIsConnected(false);
  });
  
  // Listen for new messages
  socket.on('new-message', (data: ChatMessage) => {
    handleNewMessage(data);
  });
  
  socket.on('typing', (data: { userId: number; isTyping: boolean }) => {
    handleTyping(data);
  });
  
  return () => {
    socket.disconnect();
    socketRef.current = null;
  };
}, [user, isInitialized]);

// Join room
const joinRoom = (targetUserId: number) => {
  if (!socketRef.current || !user) return;
  
  const roomId = getChatRoomID(user.userId, targetUserId);
  socketRef.current.emit('join-room', { roomId });
};

// Send message
const sendMessage = (message: string, targetUserId: number) => {
  if (!socketRef.current || !user) return;
  
  const roomId = getChatRoomID(user.userId, targetUserId);
  socketRef.current.emit('send-message', {
    roomId,
    targetId: targetUserId,
    data: {
      id: generateTempId(),
      userId: user.userId,
      username: user.username,
      fullName: user.fullName,
      avatar: user.avatar,
      message,
      timestamp: Date.now(),
      type: 'message',
    },
  });
};
```

---

## 📋 Checklist Migration

### Backend (Golang)
- [ ] Setup `gorilla/websocket` dependency
- [ ] Implement Hub (room management)
- [ ] Implement Client (connection wrapper)
- [ ] Implement message handlers
- [ ] Add JWT authentication
- [ ] Integrate với database (lưu messages)
- [ ] Add presence tracking (online users)
- [ ] Add typing indicators
- [ ] Setup reverse proxy (nginx) với SSL
- [ ] Load testing

### Frontend
- [ ] Install `socket.io-client`
- [ ] Replace Pusher client với Socket.IO client
- [ ] Update `useChat.tsx`:
  - [ ] Connection logic
  - [ ] Join/leave room
  - [ ] Send message
  - [ ] Receive message
  - [ ] Typing indicators
  - [ ] Presence tracking
- [ ] Update `ChatBoxInstance.tsx`:
  - [ ] Remove Pusher API calls
  - [ ] Use Socket.IO events
- [ ] Remove Next.js API routes (`/api/pusher/*`)
- [ ] Testing

### Infrastructure
- [ ] Setup WebSocket endpoint trên backend
- [ ] Configure nginx reverse proxy (WSS)
- [ ] SSL/TLS certificates
- [ ] Monitoring và logging
- [ ] Rate limiting

---

## ⚠️ Lưu ý quan trọng

### 1. **Authentication**
- Verify JWT token khi connect WebSocket
- Validate user có quyền join room không

### 2. **Scaling**
- Nếu cần scale horizontal, dùng Redis pub/sub
- Hoặc dùng message queue (RabbitMQ, Kafka)

### 3. **Error Handling**
- Implement reconnection logic ở frontend
- Handle connection drops gracefully
- Retry failed messages

### 4. **Performance**
- Golang WebSocket rất nhanh, có thể handle hàng nghìn connections
- Monitor memory usage và connection count

### 5. **Security**
- Validate origin trong production
- Rate limiting để tránh abuse
- Sanitize message content

---

## 🎯 Kết luận

**Mức độ thay đổi: TRUNG BÌNH** (~2-3 ngày)

**Lý do không phải chuyển đổi nhiều:**
1. ✅ Logic business đã có sẵn ở backend
2. ✅ Frontend chỉ cần thay thế client library
3. ✅ Golang rất phù hợp cho WebSocket server
4. ✅ Có thể migrate từng phần, giữ Pusher làm fallback

**Khuyến nghị:**
- ✅ **Nên migrate** vì:
  - Kiểm soát hoàn toàn
  - Chi phí thấp khi scale
  - Latency tốt hơn
  - Golang performance cao

**Timeline:**
- Week 1: Implement Golang WebSocket server
- Week 2: Migrate frontend và test
- Week 3: Production deployment và monitoring

