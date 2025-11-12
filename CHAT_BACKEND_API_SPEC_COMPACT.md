# Chat Backend API Specification - 1-1 Chat

## Tổng quan

Backend API cho tính năng chat real-time 1-1 với Pusher, hỗ trợ:
- **1-1 Chat**: Chat giữa 2 users
- **Admin Support**: Admin có thể chat với bất kỳ user nào

**Base URL:** 
- Development: `http://localhost:7071/fai`
- Production: `https://api.facourse.com/fai`

---

## Database Schema

### Bảng: `chat_messages`
```sql
CREATE TABLE chat_messages (
  id VARCHAR(255) PRIMARY KEY,
  user_id INT NOT NULL,                    -- Người gửi
  target_user_id INT NOT NULL,             -- Người nhận
  message TEXT,
  timestamp BIGINT NOT NULL,
  type VARCHAR(20) NOT NULL,               -- 'message' | 'icon'
  icon VARCHAR(50),
  username VARCHAR(255),
  full_name VARCHAR(255),
  avatar VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_target (user_id, target_user_id),
  INDEX idx_target_user (target_user_id, timestamp),
  INDEX idx_timestamp (timestamp)
);
```

### Bảng: `chat_read_status` (Optional)
```sql
CREATE TABLE chat_read_status (
  user_id INT NOT NULL,
  target_user_id INT NOT NULL,
  last_read_timestamp BIGINT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, target_user_id),
  INDEX idx_target_user (target_user_id)
);
```

### Bảng: `users` (Cần thêm field)
```sql
ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'; -- 'user' | 'admin'
CREATE INDEX idx_user_role ON users(role);
```

---

## API Endpoints

### 1. Lưu tin nhắn

**POST** `/v1/chat/messages`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "id": "string",
  "userId": number,
  "targetUserId": number,
  "username": "string",
  "fullName": "string",
  "avatar": "string | null",
  "message": "string",
  "timestamp": number,
  "type": "message" | "icon",
  "icon": "string | null"
}
```

**Response:**
```json
{
  "meta": { "code": 200, "message": "Success" },
  "data": { "id": "string", "saved": true }
}
```

**Authorization:**
- User phải là một trong 2 participants (user_id hoặc target_user_id)
- Admin có thể gửi tin nhắn cho bất kỳ user nào

---

### 2. Lấy tin nhắn cũ

**GET** `/v1/chat/messages`

**Query:**
```
targetUserId: number (required)
limit?: number          // Default: 50, Max: 100
beforeTimestamp?: number // Pagination
```

**Response:**
```json
{
  "meta": { "code": 200, "message": "Success" },
  "data": {
    "messages": [
      {
        "id": "string",
        "userId": number,
        "username": "string",
        "fullName": "string",
        "avatar": "string | null",
        "message": "string",
        "timestamp": number,
        "type": "message" | "icon",
        "icon": "string | null"
      }
    ],
    "hasMore": boolean
  }
}
```

**Authorization:**
- User chỉ có thể xem tin nhắn giữa mình và targetUserId
- Admin có thể xem tin nhắn với bất kỳ user nào
- Trả về tin nhắn đã sắp xếp theo timestamp tăng dần (cũ nhất trước)

---

### 3. Lấy danh sách conversations

**GET** `/v1/chat/conversations`

**Query:**
```
limit?: number  // Default: 20
```

**Response:**
```json
{
  "meta": { "code": 200, "message": "Success" },
  "data": {
    "conversations": [
      {
        "targetUserId": number,
        "targetUsername": "string",
        "targetFullName": "string",
        "targetAvatar": "string | null",
        "lastMessage": {
          "id": "string",
          "userId": number,
          "username": "string",
          "fullName": "string",
          "avatar": "string | null",
          "message": "string",
          "timestamp": number,
          "type": "message" | "icon",
          "icon": "string | null"
        },
        "unreadCount": number
      }
    ]
  }
}
```

**Lưu ý:**
- Sắp xếp theo timestamp của tin nhắn cuối cùng (mới nhất trước)
- `unreadCount` là số tin nhắn chưa đọc từ targetUserId

---

### 4. Đánh dấu đã đọc

**POST** `/v1/chat/messages/read`

**Body:**
```json
{
  "targetUserId": number
}
```

**Response:**
```json
{
  "meta": { "code": 200, "message": "Success" },
  "data": { "marked": true }
}
```

---

### 5. Admin: Lấy tất cả conversations

**GET** `/v1/chat/admin/conversations`

**Query:**
```
limit?: number
status?: "all" | "unread" | "recent"
```

**Authorization:** Chỉ admin (role='admin')

**Response:**
```json
{
  "meta": { "code": 200, "message": "Success" },
  "data": {
    "conversations": [
      {
        "userId": number,
        "username": "string",
        "fullName": "string",
        "avatar": "string | null",
        "lastMessage": {
          "id": "string",
          "userId": number,
          "username": "string",
          "fullName": "string",
          "avatar": "string | null",
          "message": "string",
          "timestamp": number,
          "type": "message" | "icon",
          "icon": "string | null"
        },
        "unreadCount": number,
        "totalMessages": number
      }
    ],
    "total": number
  }
}
```

---

## Pusher Channels

### Channel Naming

- **Private Chat:** `private-chat-{minUserId}-{maxUserId}`
  - Ví dụ: User 5 và User 10 → `private-chat-5-10`
- **Notifications:** `notifications-{userId}`
  - Ví dụ: User 5 → `notifications-5`

### Events

- **Private Channel:** 
  - `new-message` - Tin nhắn mới
  - `new-icon` - Icon mới
- **Notification Channel:**
  - `new-message-notification` - Thông báo tin nhắn mới

### Authorization

- **Private Channel:** Verify user là một trong 2 participants
- **Notification Channel:** Verify user subscribe vào channel của chính họ

---

## Authorization Rules

### Private Chat (User thường)
- User chỉ có thể xem/gửi tin nhắn với users mà họ đã chat
- User không thể xem tin nhắn giữa 2 users khác

### Admin
- Admin có thể xem tất cả conversations
- Admin có thể chat với bất kỳ user nào
- Admin có thể xem tin nhắn với bất kỳ user nào
- Admin endpoints chỉ dành cho role='admin'

---

## Error Response Format

```json
{
  "meta": {
    "code": 400 | 401 | 403 | 404 | 500,
    "message": "Error message"
  },
  "data": null
}
```

**HTTP Status Codes:**
- `200`: Success
- `400`: Bad Request (thiếu params, invalid data)
- `401`: Unauthorized (chưa đăng nhập hoặc token invalid)
- `403`: Forbidden (không có quyền truy cập)
- `404`: Not Found
- `500`: Internal Server Error

---

## Security

1. **Authentication:** Tất cả endpoints cần Bearer token
2. **Authorization:** 
   - Validate quyền truy cập từ token (không tin frontend)
   - Verify user là participant trước khi cho phép xem/gửi tin nhắn
   - Admin bypass các kiểm tra quyền thông thường
3. **Input Validation:** Validate và sanitize tất cả input data
4. **SQL Injection:** Sử dụng parameterized queries
5. **Rate Limiting:** Implement rate limiting cho các endpoints
6. **Channel Auth:** Verify user là participant trước khi authorize Pusher channels

---

## Integration Notes

### Next.js Server (`/api/pusher/message`)

Sau khi trigger Pusher event thành công, gọi backend API để lưu message:

```typescript
await fetch(`${BACKEND_URL}/v1/chat/messages`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': authHeader,
  },
  body: JSON.stringify({
    id: data.id,
    userId: data.userId,
    targetUserId: targetUserId,
    username: data.username,
    fullName: data.fullName,
    avatar: data.avatar,
    message: data.message,
    timestamp: data.timestamp,
    type: data.type,
    icon: data.icon,
  }),
});
```

### Frontend (`useChat.tsx`)

Sau khi `pusher:subscription_succeeded`, fetch historical messages:

```typescript
channel.bind('pusher:subscription_succeeded', async () => {
  const response = await fetch(
    `${BACKEND_URL}/v1/chat/messages?targetUserId=${targetUserId}&limit=50`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  if (response.ok) {
    const result = await response.json();
    const historicalMessages = result.data.messages || [];
    
    // Merge với messages hiện tại, đảm bảo không duplicate và đã sắp xếp
    setMessages((prev) => {
      const allMessages = [...prev, ...historicalMessages];
      const uniqueMessages = Array.from(
        new Map(allMessages.map(msg => [msg.id, msg])).values()
      );
      return uniqueMessages.sort((a, b) => a.timestamp - b.timestamp);
    });
  }
});
```

---

## Testing Checklist

### Basic Functionality
- [ ] Lưu tin nhắn thành công
- [ ] Lưu icon thành công
- [ ] Fetch historical messages với pagination
- [ ] Fetch historical messages khi chưa có tin nhắn nào
- [ ] Authorization (user không thể xem tin nhắn của người khác)
- [ ] Authentication (401 khi không có token)
- [ ] Merge messages không bị duplicate
- [ ] Sắp xếp messages theo timestamp
- [ ] Test với nhiều users cùng lúc
- [ ] Test performance với số lượng messages lớn

### Admin Functionality
- [ ] Admin có thể xem tất cả conversations
- [ ] Admin có thể chat với bất kỳ user nào
- [ ] Admin có thể xem tin nhắn với bất kỳ user nào
- [ ] User thường không thể gọi admin endpoints
- [ ] Admin có thể đánh dấu đã đọc tin nhắn từ bất kỳ user nào
- [ ] Admin conversations API với filter (all/unread/recent)
- [ ] Admin có thể xem unreadCount chính xác
- [ ] Admin có thể xem totalMessages trong conversation

### Security Tests
- [ ] Test user không thể giả mạo role admin
- [ ] Test backend validate role từ token (không tin frontend)
- [ ] Test rate limiting hoạt động đúng
- [ ] Test SQL injection protection
- [ ] Test XSS protection trong messages
- [ ] Test channel authorization (user không thể subscribe vào channel của người khác)
