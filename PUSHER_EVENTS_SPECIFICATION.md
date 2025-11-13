# Pusher Events Specification - Mapping sang Golang WebSocket

Tài liệu này mô tả chi tiết cơ chế Pusher hiện tại để bạn có thể tạo các event Golang WebSocket tương ứng.

---

## 📡 Channels (Rooms)

### 1. Private Chat Channels
**Format:** `private-chat-{minUserId}-{maxUserId}`

**Ví dụ:** User 5 và User 10 → `private-chat-5-10`

**Mục đích:** 
- Channel riêng cho mỗi conversation 1-1
- Chỉ 2 users trong conversation mới có thể subscribe

**Golang tương ứng:**
```go
// Room ID format: "chat-{minUserId}-{maxUserId}"
func getChatRoomID(userID1, userID2 int) string {
    if userID1 > userID2 {
        userID1, userID2 = userID2, userID1
    }
    return fmt.Sprintf("chat-%d-%d", userID1, userID2)
}
```

---

### 2. Presence Channel
**Format:** `presence-online-users`

**Mục đích:**
- Track tất cả users đang online
- Broadcast khi user online/offline
- Lưu thông tin user (userId, username, fullName, avatar, onlineSince)

**Golang tương ứng:**
```go
// Room ID: "presence-online-users"
// Tất cả users đều join vào room này khi connect
```

---

### 3. Notification Channels
**Format:** `notifications-{userId}`

**Ví dụ:** User 5 → `notifications-5`

**Mục đích:**
- Mỗi user có notification channel riêng
- Nhận notification khi có tin nhắn mới từ conversation khác
- Dùng để trigger auto-subscribe vào private channel

**Golang tương ứng:**
```go
// Room ID format: "notifications-{userId}"
func getNotificationRoomID(userID int) string {
    return fmt.Sprintf("notifications-%d", userID)
}
```

---

## 🔔 Events - Private Chat Channels

### Event: `new-message`
**Trigger:** Khi gửi tin nhắn text

**Payload:**
```typescript
{
  id: string,
  userId: number,
  username: string,
  fullName: string,
  avatar?: string | null,
  message: string,
  timestamp: number,
  type: 'message',
  media: null
}
```

**Flow:**
1. Frontend gọi API `/api/pusher/message` với `type: 'message'`
2. Next.js trigger Pusher event `new-message` vào private channel
3. Frontend listen `channel.bind('new-message', handler)`
4. Handler xử lý và hiển thị tin nhắn

**Golang tương ứng:**
```go
// Client emit
socket.Emit("send-message", map[string]interface{}{
    "roomId": "chat-5-10",
    "targetId": 10,
    "data": ChatMessage{
        ID: "msg-123",
        UserID: 5,
        Username: "user5",
        FullName: "User 5",
        Avatar: "avatar-url",
        Message: "Hello",
        Timestamp: 1234567890,
        Type: "message",
    },
})

// Server broadcast
hub.BroadcastToRoom("chat-5-10", "new-message", messageData)
```

---

### Event: `new-icon`
**Trigger:** Khi gửi emoji/icon

**Payload:**
```typescript
{
  id: string,
  userId: number,
  username: string,
  fullName: string,
  avatar?: string | null,
  message: '',
  timestamp: number,
  type: 'icon',
  media: string  // Emoji string, ví dụ: "😀"
}
```

**Flow:** Tương tự `new-message`, nhưng `type: 'icon'` và `media` chứa emoji

**Golang tương ứng:**
```go
// Client emit
socket.Emit("send-message", map[string]interface{}{
    "roomId": "chat-5-10",
    "targetId": 10,
    "data": ChatMessage{
        Type: "icon",
        Media: "😀",
        // ... other fields
    },
})

// Server broadcast
hub.BroadcastToRoom("chat-5-10", "new-icon", messageData)
```

---

### Event: `new-sticker`
**Trigger:** Khi gửi sticker

**Payload:**
```typescript
{
  id: string,
  userId: number,
  username: string,
  fullName: string,
  avatar?: string | null,
  message: '',
  timestamp: number,
  type: 'sticker',
  media: string,  // Sticker ID, ví dụ: "bts/10.thumb128.webp"
  audio?: string | null  // Audio URL nếu có
}
```

**Flow:** Tương tự `new-message`, nhưng `type: 'sticker'` và có thể có `audio`

**Golang tương ứng:**
```go
// Client emit
socket.Emit("send-message", map[string]interface{}{
    "roomId": "chat-5-10",
    "targetId": 10,
    "data": ChatMessage{
        Type: "sticker",
        Media: "bts/10.thumb128.webp",
        Audio: "https://...", // optional
        // ... other fields
    },
})

// Server broadcast
hub.BroadcastToRoom("chat-5-10", "new-sticker", messageData)
```

---

### Event: `new-image`
**Trigger:** Khi gửi ảnh

**Payload:**
```typescript
{
  id: string,
  userId: number,
  username: string,
  fullName: string,
  avatar?: string | null,
  message: '',
  timestamp: number,
  type: 'image',
  media: string  // Image URL
}
```

**Flow:** Tương tự `new-message`, nhưng `type: 'image'`

**Golang tương ứng:**
```go
// Client emit
socket.Emit("send-message", map[string]interface{}{
    "roomId": "chat-5-10",
    "targetId": 10,
    "data": ChatMessage{
        Type: "image",
        Media: "https://...",
        // ... other fields
    },
})

// Server broadcast
hub.BroadcastToRoom("chat-5-10", "new-image", messageData)
```

---

### Event: `typing`
**Trigger:** Khi user đang gõ hoặc ngừng gõ

**Payload:**
```typescript
{
  userId: number,
  isTyping: boolean
}
```

**Flow:**
1. User bắt đầu gõ → Frontend gọi `/api/pusher/message` với `type: 'typing'`, `isTyping: true`
2. User ngừng gõ (sau 2 giây) → Frontend gọi với `isTyping: false`
3. Server broadcast `typing` event vào private channel
4. Người nhận listen và hiển thị typing indicator

**Logic frontend:**
- Gửi `isTyping: true` khi user bắt đầu gõ
- Tự động gửi `isTyping: false` sau 2 giây không gõ
- Tự động tắt typing indicator sau 3 giây nếu không nhận được update

**Golang tương ứng:**
```go
// Client emit
socket.Emit("typing", map[string]interface{}{
    "roomId": "chat-5-10",
    "userId": 5,
    "isTyping": true,
})

// Server broadcast
hub.BroadcastToRoom("chat-5-10", "typing", typingData)
```

---

## 🔔 Events - Presence Channel

### Event: `pusher:subscription_succeeded`
**Trigger:** Khi subscribe thành công vào presence channel

**Payload:**
```typescript
{
  members: {
    [userId: string]: {
      userId: number,
      username: string,
      fullName: string,
      avatar?: string | null,
      onlineSince: number  // Timestamp
    }
  }
}
```

**Mục đích:**
- Lấy danh sách tất cả users đang online khi connect
- Initialize `onlineUsers` và `onlineUsersList`

**Golang tương ứng:**
```go
// Khi client join presence room
socket.Emit("join-presence", nil)

// Server gửi danh sách online users
socket.Emit("presence-list", map[string]interface{}{
    "members": map[string]interface{}{
        "5": UserInfo{...},
        "10": UserInfo{...},
    },
})
```

---

### Event: `pusher:member_added`
**Trigger:** Khi có user mới online

**Payload:**
```typescript
{
  id: string,  // userId
  info: {
    userId: number,
    username: string,
    fullName: string,
    avatar?: string | null,
    onlineSince: number
  }
}
```

**Mục đích:**
- Thông báo user mới online
- Thêm vào `onlineUsers` và `onlineUsersList`

**Golang tương ứng:**
```go
// Server broadcast khi user join presence room
hub.BroadcastToRoom("presence-online-users", "user-online", map[string]interface{}{
    "userId": 5,
    "info": UserInfo{
        UserID: 5,
        Username: "user5",
        FullName: "User 5",
        Avatar: "avatar-url",
        OnlineSince: 1234567890,
    },
})
```

---

### Event: `pusher:member_removed`
**Trigger:** Khi user offline

**Payload:**
```typescript
{
  id: string  // userId
}
```

**Mục đích:**
- Thông báo user offline
- Xóa khỏi `onlineUsers` và `onlineUsersList`

**Golang tương ứng:**
```go
// Server broadcast khi user leave presence room
hub.BroadcastToRoom("presence-online-users", "user-offline", map[string]interface{}{
    "userId": 5,
})
```

---

## 🔔 Events - Notification Channels

### Event: `new-message-notification`
**Trigger:** Khi có tin nhắn mới từ conversation khác

**Payload:**
```typescript
{
  fromUserId: number,
  channelName: string,  // private-chat-5-10
  message: ChatMessage  // Full message object
}
```

**Mục đích:**
- Thông báo user có tin nhắn mới từ conversation khác
- Trigger auto-subscribe vào private channel nếu chưa subscribe
- Cập nhật conversation list và unread count

**Flow:**
1. User A gửi tin nhắn cho User B
2. Server trigger `new-message` vào private channel
3. Server trigger `new-message-notification` vào `notifications-{userIdB}`
4. User B nhận notification và auto-subscribe vào private channel nếu chưa subscribe

**Golang tương ứng:**
```go
// Khi có message mới, broadcast vào 2 nơi:
// 1. Private channel
hub.BroadcastToRoom("chat-5-10", "new-message", messageData)

// 2. Notification channel của người nhận
hub.BroadcastToRoom("notifications-10", "new-message-notification", map[string]interface{}{
    "fromUserId": 5,
    "channelName": "chat-5-10",
    "message": messageData,
})
```

---

## 🔐 Authentication Flow

### Pusher Authentication
**Endpoint:** `/api/pusher/auth`

**Request:**
- Method: POST
- Headers: `Authorization: Bearer {token}`
- Body: URL-encoded `socket_id` và `channel_name`

**Response:**
```json
{
  "auth": "pusher-key:signature",
  "channel_data": "..." // Cho presence channel
}
```

**Golang tương ứng:**
```go
// Khi client connect WebSocket
// 1. Client gửi token trong query params hoặc headers
ws, err := upgrader.Upgrade(w, r, nil)

// 2. Server verify token và lấy userId
token := r.URL.Query().Get("token")
userID := verifyTokenAndGetUserID(token)

// 3. Tạo client và join rooms
client := NewClient(ws, userID)
hub.Register(client)
```

---

## 📋 Complete Event Flow

### Flow 1: Gửi tin nhắn text

```
1. Frontend: User gõ và nhấn Send
   ↓
2. Frontend: Optimistic update (hiển thị ngay)
   ↓
3. Frontend: Gọi API backend để lưu vào DB
   POST /v1/chat/messages
   ↓
4. Frontend: Gọi Next.js API để trigger Pusher
   POST /api/pusher/message
   Body: { type: 'message', data: {...}, channelName: 'private-chat-5-10' }
   ↓
5. Next.js: Trigger Pusher events
   - pusher.trigger('private-chat-5-10', 'new-message', data)
   - pusher.trigger('notifications-10', 'new-message-notification', {...})
   ↓
6. Pusher: Broadcast đến clients đang subscribe
   ↓
7. Frontend: Nhận events và cập nhật UI
   - channel.bind('new-message') → Hiển thị tin nhắn
   - notificationChannel.bind('new-message-notification') → Cập nhật conversation list
```

**Golang tương ứng:**
```
1. Frontend: User gõ và nhấn Send
   ↓
2. Frontend: Optimistic update (hiển thị ngay)
   ↓
3. Frontend: Gọi API backend để lưu vào DB
   POST /v1/chat/messages
   ↓
4. Frontend: Emit WebSocket event
   socket.Emit("send-message", { roomId: "chat-5-10", data: {...} })
   ↓
5. Golang Server: Nhận event và broadcast
   - Lưu vào DB (nếu chưa lưu)
   - hub.BroadcastToRoom("chat-5-10", "new-message", data)
   - hub.BroadcastToRoom("notifications-10", "new-message-notification", {...})
   ↓
6. Frontend: Nhận events và cập nhật UI
   - socket.On("new-message") → Hiển thị tin nhắn
   - socket.On("new-message-notification") → Cập nhật conversation list
```

---

### Flow 2: Typing Indicator

```
1. Frontend: User bắt đầu gõ
   ↓
2. Frontend: Gọi Next.js API
   POST /api/pusher/message
   Body: { type: 'typing', data: { userId: 5, isTyping: true }, channelName: 'private-chat-5-10' }
   ↓
3. Next.js: Trigger Pusher event
   pusher.trigger('private-chat-5-10', 'typing', { userId: 5, isTyping: true })
   ↓
4. Pusher: Broadcast đến clients trong channel
   ↓
5. Frontend: Nhận event và hiển thị typing indicator
   channel.bind('typing') → setIsTyping(true)
   ↓
6. Frontend: Tự động tắt sau 3 giây nếu không có update
```

**Golang tương ứng:**
```
1. Frontend: User bắt đầu gõ
   ↓
2. Frontend: Emit WebSocket event
   socket.Emit("typing", { roomId: "chat-5-10", userId: 5, isTyping: true })
   ↓
3. Golang Server: Broadcast đến room
   hub.BroadcastToRoom("chat-5-10", "typing", { userId: 5, isTyping: true })
   ↓
4. Frontend: Nhận event và hiển thị typing indicator
   socket.On("typing") → setIsTyping(true)
   ↓
5. Frontend: Tự động tắt sau 3 giây nếu không có update
```

---

### Flow 3: Presence Tracking

```
1. Frontend: User connect
   ↓
2. Frontend: Subscribe vào presence channel
   pusher.subscribe('presence-online-users')
   ↓
3. Pusher: Gửi subscription_succeeded với danh sách members
   ↓
4. Frontend: Initialize onlineUsers và onlineUsersList
   ↓
5. Khi user khác online:
   - Pusher: member_added event
   - Frontend: Thêm vào onlineUsers
   ↓
6. Khi user khác offline:
   - Pusher: member_removed event
   - Frontend: Xóa khỏi onlineUsers
```

**Golang tương ứng:**
```
1. Frontend: User connect WebSocket
   ↓
2. Frontend: Emit join-presence
   socket.Emit("join-presence", nil)
   ↓
3. Golang Server: Gửi danh sách online users
   socket.Emit("presence-list", { members: {...} })
   ↓
4. Frontend: Initialize onlineUsers và onlineUsersList
   ↓
5. Khi user khác online:
   - Golang: Broadcast user-online event
   - Frontend: socket.On("user-online") → Thêm vào onlineUsers
   ↓
6. Khi user khác offline:
   - Golang: Broadcast user-offline event
   - Frontend: socket.On("user-offline") → Xóa khỏi onlineUsers
```

---

## 📊 Event Summary Table

| Event Name | Channel Type | Trigger | Payload | Purpose |
|------------|--------------|---------|---------|---------|
| `new-message` | Private | Send text | ChatMessage | Broadcast tin nhắn text |
| `new-icon` | Private | Send emoji | ChatMessage | Broadcast emoji |
| `new-sticker` | Private | Send sticker | ChatMessage | Broadcast sticker |
| `new-image` | Private | Send image | ChatMessage | Broadcast ảnh |
| `typing` | Private | User typing | {userId, isTyping} | Typing indicator |
| `new-message-notification` | Notification | New message | {fromUserId, channelName, message} | Notify new message |
| `pusher:subscription_succeeded` | Presence | Subscribe success | {members} | Init online users |
| `pusher:member_added` | Presence | User online | {id, info} | User online |
| `pusher:member_removed` | Presence | User offline | {id} | User offline |

---

## 🎯 Golang WebSocket Events Mapping

### Client → Server Events (Emit)

```go
// 1. Join chat room
socket.Emit("join-room", map[string]interface{}{
    "roomId": "chat-5-10",
})

// 2. Leave chat room
socket.Emit("leave-room", map[string]interface{}{
    "roomId": "chat-5-10",
})

// 3. Send message
socket.Emit("send-message", map[string]interface{}{
    "roomId": "chat-5-10",
    "targetId": 10,
    "data": ChatMessage{...},
})

// 4. Typing indicator
socket.Emit("typing", map[string]interface{}{
    "roomId": "chat-5-10",
    "userId": 5,
    "isTyping": true,
})

// 5. Join presence room
socket.Emit("join-presence", nil)
```

### Server → Client Events (Broadcast)

```go
// 1. New message
socket.Emit("new-message", ChatMessage{...})

// 2. New icon
socket.Emit("new-icon", ChatMessage{...})

// 3. New sticker
socket.Emit("new-sticker", ChatMessage{...})

// 4. New image
socket.Emit("new-image", ChatMessage{...})

// 5. Typing indicator
socket.Emit("typing", map[string]interface{}{
    "userId": 5,
    "isTyping": true,
})

// 6. New message notification
socket.Emit("new-message-notification", map[string]interface{}{
    "fromUserId": 5,
    "channelName": "chat-5-10",
    "message": ChatMessage{...},
})

// 7. Presence list (khi join presence)
socket.Emit("presence-list", map[string]interface{}{
    "members": map[string]UserInfo{...},
})

// 8. User online
socket.Emit("user-online", map[string]interface{}{
    "userId": 5,
    "info": UserInfo{...},
})

// 9. User offline
socket.Emit("user-offline", map[string]interface{}{
    "userId": 5,
})
```

---

## 🔧 Implementation Notes

### 1. Room Management
- Mỗi conversation có room riêng: `chat-{minId}-{maxId}`
- Presence room: `presence-online-users` (tất cả users)
- Notification room: `notifications-{userId}` (mỗi user)

### 2. Message Deduplication
- Frontend check duplicate bằng message ID
- Check timestamp gần giống (< 5 giây) để tránh duplicate khi nhận từ nhiều nguồn

### 3. Optimistic Updates
- Frontend hiển thị tin nhắn ngay (optimistic)
- Sau đó gọi API để lưu vào DB
- Nhận lại từ WebSocket để sync với server

### 4. Typing Indicator Logic
- Gửi `isTyping: true` khi bắt đầu gõ
- Tự động gửi `isTyping: false` sau 2 giây không gõ
- Tự động tắt indicator sau 3 giây nếu không có update

### 5. Presence Sync
- Sync với presence room mỗi 30 giây
- Chỉ giữ lại users có trong presence room
- Update `onlineSince` khi user có hoạt động (gửi tin nhắn, typing)

---

## ✅ Checklist cho Golang Implementation

- [ ] Implement room management (chat rooms, presence room, notification rooms)
- [ ] Implement authentication (verify JWT token khi connect)
- [ ] Implement join/leave room handlers
- [ ] Implement send-message handler (lưu DB + broadcast)
- [ ] Implement typing handler (broadcast only)
- [ ] Implement presence tracking (join/leave presence room)
- [ ] Broadcast new-message events
- [ ] Broadcast new-icon events
- [ ] Broadcast new-sticker events
- [ ] Broadcast new-image events
- [ ] Broadcast typing events
- [ ] Broadcast new-message-notification events
- [ ] Broadcast user-online/user-offline events
- [ ] Send presence-list khi join presence room
- [ ] Handle duplicate messages (check ID và timestamp)
- [ ] Implement reconnection logic ở frontend

