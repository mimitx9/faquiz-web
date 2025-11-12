# Chat Backend API Specification

## Tổng quan

Backend cần implement các API endpoints để hỗ trợ tính năng chat real-time với Pusher. Backend đặt ở `localhost:7071` (development) hoặc `https://api.facourse.com/fai` (production).

## Flow hoạt động

1. **Page loads** → Frontend kết nối với Pusher
2. **Subscribe to channel** → Frontend subscribe vào private channel `private-chat-{minUserId}-{maxUserId}`
3. **Bind to pusher:subscription_succeeded** → Khi subscription thành công
4. **Bind to new_message event** → Lắng nghe tin nhắn mới từ Pusher
5. **Fetch historical messages** → Gọi API backend để lấy tin nhắn cũ sau khi subscription thành công
6. **Merge messages** → Gộp tin nhắn cũ với tin nhắn mới, đảm bảo không duplicate và đã sắp xếp

## API Endpoints cần implement

### 1. Lưu tin nhắn vào database

**Endpoint:** `POST /fai/v1/chat/messages`

**Mô tả:** API này được gọi từ Next.js server (`/api/pusher/message`) sau khi trigger Pusher event thành công. Backend cần lưu tin nhắn vào database để có thể retrieve lại sau.

**Request Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "id": "string",                    // Message ID (unique)
  "userId": number,                  // ID của người gửi
  "targetUserId": number,            // ID của người nhận
  "username": "string",              // Username của người gửi
  "fullName": "string",              // Tên đầy đủ của người gửi
  "avatar": "string | null",         // URL avatar (optional)
  "message": "string",               // Nội dung tin nhắn (có thể rỗng nếu type là 'icon')
  "timestamp": number,               // Unix timestamp (milliseconds)
  "type": "message" | "icon",        // Loại tin nhắn
  "icon": "string | null"            // Icon name nếu type là 'icon'
}
```

**Response:**
```json
{
  "meta": {
    "code": 200,
    "message": "Success"
  },
  "data": {
    "id": "string",
    "saved": true
  }
}
```

**Lưu ý:**
- Backend cần validate user có quyền gửi tin nhắn cho targetUserId
- Lưu tin nhắn vào database với các trường: id, userId, targetUserId, message, timestamp, type, icon
- Có thể cần lưu thêm metadata: username, fullName, avatar để hiển thị nhanh

---

### 2. Lấy danh sách tin nhắn cũ (Historical Messages)

**Endpoint:** `GET /fai/v1/chat/messages`

**Mô tả:** API này được gọi từ frontend sau khi subscription thành công để lấy các tin nhắn đã lưu trong database.

**Request Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
```
targetUserId: number (required)  // ID của người chat cùng
limit?: number (optional)        // Số lượng tin nhắn tối đa (default: 50, max: 100)
beforeTimestamp?: number (optional) // Lấy tin nhắn trước timestamp này (cho pagination)
```

**Response:**
```json
{
  "meta": {
    "code": 200,
    "message": "Success"
  },
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
    "hasMore": boolean  // Có còn tin nhắn cũ hơn không (cho pagination)
  }
}
```

**Lưu ý:**
- Backend cần validate user có quyền xem tin nhắn với targetUserId
- Trả về tin nhắn đã được sắp xếp theo timestamp tăng dần (tin nhắn cũ nhất trước)
- Chỉ trả về tin nhắn giữa currentUser và targetUserId
- Nếu có `beforeTimestamp`, chỉ trả về tin nhắn có timestamp < beforeTimestamp

---

### 3. Lấy danh sách conversations (Optional nhưng khuyến nghị)

**Endpoint:** `GET /fai/v1/chat/conversations`

**Mô tả:** API này lấy danh sách các cuộc trò chuyện của user, bao gồm tin nhắn cuối cùng và số tin nhắn chưa đọc.

**Request Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
```
limit?: number (optional)  // Số lượng conversations tối đa (default: 20)
```

**Response:**
```json
{
  "meta": {
    "code": 200,
    "message": "Success"
  },
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
- Sắp xếp conversations theo timestamp của tin nhắn cuối cùng (mới nhất trước)
- `unreadCount` là số tin nhắn chưa đọc từ targetUserId (có thể cần implement logic đánh dấu đã đọc)

---

### 4. Đánh dấu tin nhắn đã đọc (Optional)

**Endpoint:** `POST /fai/v1/chat/messages/read`

**Mô tả:** Đánh dấu các tin nhắn từ một user là đã đọc.

**Request Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "targetUserId": number  // ID của người gửi tin nhắn
}
```

**Response:**
```json
{
  "meta": {
    "code": 200,
    "message": "Success"
  },
  "data": {
    "marked": true
  }
}
```

---

## Database Schema đề xuất

### Bảng: `chat_messages`

```sql
CREATE TABLE chat_messages (
  id VARCHAR(255) PRIMARY KEY,
  user_id INT NOT NULL,
  target_user_id INT NOT NULL,
  message TEXT,
  timestamp BIGINT NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'message' hoặc 'icon'
  icon VARCHAR(50),
  username VARCHAR(255),
  full_name VARCHAR(255),
  avatar VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_target (user_id, target_user_id),
  INDEX idx_timestamp (timestamp),
  INDEX idx_target_user (target_user_id, timestamp)
);
```

### Bảng: `chat_read_status` (Optional - cho tính năng đánh dấu đã đọc)

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

---

## Integration với Next.js Server

Hiện tại, Next.js server (`/api/pusher/message/route.ts`) đang:
1. Nhận request từ frontend
2. Trigger Pusher event
3. Gửi notification

**Cần thêm:** Sau khi trigger Pusher event thành công, gọi API backend để lưu tin nhắn:

```typescript
// Sau khi trigger Pusher event thành công
if (response.ok) {
  // Lưu tin nhắn vào database qua backend API
  const backendUrl = process.env.NODE_ENV === 'production' 
    ? 'https://api.facourse.com/fai' 
    : 'http://localhost:7071/fai';
  
  await fetch(`${backendUrl}/v1/chat/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader, // Pass through từ request
    },
    body: JSON.stringify({
      ...data,
      targetUserId,
    }),
  }).catch(err => {
    // Log error nhưng không fail request vì Pusher đã trigger thành công
    console.error('Failed to save message to database:', err);
  });
}
```

---

## Frontend Integration

Frontend sẽ cần thêm logic để fetch historical messages sau khi subscription thành công:

```typescript
// Trong useChat.tsx, sau khi bind 'pusher:subscription_succeeded'
channel.bind('pusher:subscription_succeeded', async () => {
  console.log('[Chat] Đã subscribe thành công, đang fetch historical messages...');
  
  try {
    const BASE_URL = process.env.NODE_ENV === 'production' 
      ? 'https://api.facourse.com/fai' 
      : 'http://localhost:7071/fai';
    
    const token = localStorage.getItem('auth_token');
    const response = await fetch(
      `${BASE_URL}/v1/chat/messages?targetUserId=${targetUserId}&limit=50`,
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
        // Remove duplicates by id
        const uniqueMessages = Array.from(
          new Map(allMessages.map(msg => [msg.id, msg])).values()
        );
        // Sort by timestamp
        return uniqueMessages.sort((a, b) => a.timestamp - b.timestamp);
      });
    }
  } catch (error) {
    console.error('[Chat] Lỗi khi fetch historical messages:', error);
  }
});
```

---

## Error Handling

Tất cả các API endpoints cần trả về error response theo format:

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
- `403`: Forbidden (không có quyền truy cập conversation này)
- `404`: Not Found
- `500`: Internal Server Error

---

## Admin Support - User chat với Admin

### Yêu cầu đặc biệt cho Admin

Khi user chat với admin, cần xem xét các trường hợp sau:

1. **Admin có thể chat với bất kỳ user nào** - Không cần validate quyền đặc biệt
2. **Admin có thể xem tất cả conversations** - Cần API riêng để admin xem danh sách tất cả conversations
3. **Admin có thể có nhiều conversations cùng lúc** - Cần UI/UX phù hợp để admin quản lý
4. **Channel naming vẫn giữ nguyên** - `private-chat-{minUserId}-{maxUserId}` vẫn hoạt động tốt với admin

### Cập nhật Database Schema

Cần thêm field `role` vào bảng users (nếu chưa có):

```sql
-- Nếu chưa có, thêm vào bảng users
ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'; -- 'user' hoặc 'admin'
CREATE INDEX idx_user_role ON users(role);
```

### Cập nhật API Endpoints cho Admin

#### 5. Lấy tất cả conversations (Admin only)

**Endpoint:** `GET /fai/v1/chat/admin/conversations`

**Mô tả:** API này chỉ dành cho admin, trả về tất cả conversations của tất cả users.

**Request Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
```
limit?: number (optional)  // Số lượng conversations tối đa (default: 50)
status?: 'all' | 'unread' | 'recent' (optional)  // Lọc theo trạng thái
```

**Response:**
```json
{
  "meta": {
    "code": 200,
    "message": "Success"
  },
  "data": {
    "conversations": [
      {
        "userId": number,              // ID của user (không phải admin)
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
        "totalMessages": number        // Tổng số tin nhắn trong conversation
      }
    ],
    "total": number                    // Tổng số conversations
  }
}
```

**Lưu ý:**
- Chỉ admin mới có quyền gọi API này
- Trả về conversations sắp xếp theo timestamp của tin nhắn cuối cùng (mới nhất trước)
- `unreadCount` là số tin nhắn chưa đọc từ user (admin chưa đọc)

---

#### 6. Lấy tin nhắn với user cụ thể (Admin)

**Endpoint:** `GET /fai/v1/chat/messages`

**Cập nhật:** API này đã có ở trên, nhưng cần cập nhật authorization logic:

- **User thường:** Chỉ có thể xem tin nhắn với `targetUserId` mà họ đã chat
- **Admin:** Có thể xem tin nhắn với bất kỳ `targetUserId` nào

**Authorization Logic:**
```sql
-- Pseudo code
IF currentUser.role = 'admin' THEN
  -- Admin có thể xem tin nhắn với bất kỳ user nào
  SELECT * FROM chat_messages 
  WHERE (user_id = currentUserId AND target_user_id = targetUserId)
     OR (user_id = targetUserId AND target_user_id = currentUserId)
ELSE
  -- User thường chỉ xem được tin nhắn của chính mình
  SELECT * FROM chat_messages 
  WHERE (user_id = currentUserId AND target_user_id = targetUserId)
     OR (user_id = targetUserId AND target_user_id = currentUserId)
  -- Và đảm bảo currentUserId là một trong hai user
END IF
```

---

#### 7. Đánh dấu đã đọc (Admin)

**Endpoint:** `POST /fai/v1/chat/messages/read`

**Cập nhật:** API này đã có, nhưng cần đảm bảo admin có thể đánh dấu đã đọc tin nhắn từ bất kỳ user nào.

---

### Cập nhật Authorization Logic

Tất cả các API endpoints cần kiểm tra role:

```typescript
// Pseudo code cho authorization
function canAccessConversation(currentUser, targetUserId) {
  // Admin có thể truy cập bất kỳ conversation nào
  if (currentUser.role === 'admin') {
    return true;
  }
  
  // User thường chỉ có thể truy cập conversation của chính mình
  return currentUser.userId === targetUserId || 
         conversationExists(currentUser.userId, targetUserId);
}

function canSendMessage(currentUser, targetUserId) {
  // Admin có thể gửi tin nhắn cho bất kỳ user nào
  if (currentUser.role === 'admin') {
    return true;
  }
  
  // User thường có thể gửi tin nhắn cho bất kỳ user nào (trừ chính mình)
  return currentUser.userId !== targetUserId;
}
```

---

### Frontend Integration cho Admin

Frontend cần detect admin role và hiển thị UI phù hợp:

```typescript
// Trong useChat.tsx hoặc component khác
const { user } = useAuth();
const isAdmin = user?.role === 'admin';

// Nếu là admin, có thể cần:
// 1. Hiển thị danh sách tất cả users đang chat
// 2. Có search/filter để tìm user
// 3. Hiển thị số tin nhắn chưa đọc tổng cộng
// 4. Có thể cần UI riêng cho admin dashboard
```

---

## Group Chat Support

### Tổng quan

Thiết kế hiện tại chỉ hỗ trợ 1-1 chat. Để support group chat, cần mở rộng với các thay đổi sau:

### 1. Channel Naming cho Group Chat

**1-1 Chat (hiện tại):**
- Channel: `private-chat-{minUserId}-{maxUserId}`
- Type: `private`

**Group Chat (mới):**
- Channel: `group-chat-{groupId}`
- Type: `group` hoặc `presence` (nếu cần hiển thị online members)

### 2. Cập nhật Database Schema

#### Bảng: `chat_groups`

```sql
CREATE TABLE chat_groups (
  id INT PRIMARY KEY AUTO_INCREMENT,
  group_id VARCHAR(255) UNIQUE NOT NULL,  -- Unique group identifier
  name VARCHAR(255) NOT NULL,             -- Tên group
  description TEXT,                       -- Mô tả group
  avatar VARCHAR(500),                    -- Avatar của group
  created_by INT NOT NULL,                -- User tạo group
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  INDEX idx_created_by (created_by),
  INDEX idx_group_id (group_id)
);
```

#### Bảng: `chat_group_members`

```sql
CREATE TABLE chat_group_members (
  id INT PRIMARY KEY AUTO_INCREMENT,
  group_id VARCHAR(255) NOT NULL,
  user_id INT NOT NULL,
  role VARCHAR(20) DEFAULT 'member',     -- 'admin', 'moderator', 'member'
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP NULL,                 -- NULL nếu vẫn trong group
  is_active BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (group_id, user_id),
  INDEX idx_user_id (user_id),
  INDEX idx_group_id (group_id),
  FOREIGN KEY (group_id) REFERENCES chat_groups(group_id) ON DELETE CASCADE
);
```

#### Cập nhật bảng: `chat_messages`

```sql
-- Thêm các trường mới cho group chat
ALTER TABLE chat_messages 
  ADD COLUMN chat_type VARCHAR(20) DEFAULT 'private',  -- 'private' hoặc 'group'
  ADD COLUMN group_id VARCHAR(255) NULL,                -- NULL nếu là private chat
  MODIFY COLUMN target_user_id INT NULL;               -- NULL nếu là group chat

-- Thêm indexes
CREATE INDEX idx_chat_type_group (chat_type, group_id);
CREATE INDEX idx_group_timestamp (group_id, timestamp);

-- Note: Với group chat:
-- - user_id: người gửi
-- - target_user_id: NULL (không áp dụng cho group)
-- - group_id: ID của group
-- - chat_type: 'group'
```

#### Cập nhật bảng: `chat_read_status` cho Group

```sql
-- Thêm support cho group read status
ALTER TABLE chat_read_status
  ADD COLUMN group_id VARCHAR(255) NULL,
  ADD COLUMN chat_type VARCHAR(20) DEFAULT 'private';

-- Update primary key để support cả private và group
ALTER TABLE chat_read_status DROP PRIMARY KEY;
ALTER TABLE chat_read_status 
  ADD PRIMARY KEY (user_id, target_user_id, group_id, chat_type);

CREATE INDEX idx_group_read (group_id, user_id);
```

### 3. API Endpoints mới cho Group Chat

#### 8. Tạo Group

**Endpoint:** `POST /fai/v1/chat/groups`

**Request Body:**
```json
{
  "name": "string",                    // Tên group (required)
  "description": "string",             // Mô tả (optional)
  "avatar": "string | null",           // URL avatar (optional)
  "memberIds": [number]                // Danh sách user IDs để thêm vào group (optional)
}
```

**Response:**
```json
{
  "meta": {
    "code": 200,
    "message": "Success"
  },
  "data": {
    "groupId": "string",
    "name": "string",
    "description": "string",
    "avatar": "string | null",
    "createdBy": number,
    "createdAt": number,
    "members": [
      {
        "userId": number,
        "username": "string",
        "fullName": "string",
        "avatar": "string | null",
        "role": "admin" | "moderator" | "member",
        "joinedAt": number
      }
    ]
  }
}
```

---

#### 9. Lấy danh sách Groups của User

**Endpoint:** `GET /fai/v1/chat/groups`

**Query Parameters:**
```
limit?: number (optional)  // Default: 20
```

**Response:**
```json
{
  "meta": {
    "code": 200,
    "message": "Success"
  },
  "data": {
    "groups": [
      {
        "groupId": "string",
        "name": "string",
        "description": "string",
        "avatar": "string | null",
        "memberCount": number,
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
        "myRole": "admin" | "moderator" | "member"
      }
    ]
  }
}
```

---

#### 10. Lấy thông tin Group

**Endpoint:** `GET /fai/v1/chat/groups/{groupId}`

**Response:**
```json
{
  "meta": {
    "code": 200,
    "message": "Success"
  },
  "data": {
    "groupId": "string",
    "name": "string",
    "description": "string",
    "avatar": "string | null",
    "createdBy": number,
    "createdAt": number,
    "members": [
      {
        "userId": number,
        "username": "string",
        "fullName": "string",
        "avatar": "string | null",
        "role": "admin" | "moderator" | "member",
        "joinedAt": number
      }
    ],
    "memberCount": number,
    "myRole": "admin" | "moderator" | "member"
  }
}
```

---

#### 11. Thêm/Xóa Members trong Group

**Endpoint:** `POST /fai/v1/chat/groups/{groupId}/members`

**Request Body:**
```json
{
  "action": "add" | "remove",
  "userIds": [number]  // Danh sách user IDs
}
```

**Response:**
```json
{
  "meta": {
    "code": 200,
    "message": "Success"
  },
  "data": {
    "groupId": "string",
    "added": [number],    // User IDs đã thêm (nếu action = "add")
    "removed": [number]   // User IDs đã xóa (nếu action = "remove")
  }
}
```

**Lưu ý:**
- Chỉ admin/moderator mới có quyền thêm/xóa members
- Không thể xóa admin khỏi group

---

#### 12. Rời Group

**Endpoint:** `POST /fai/v1/chat/groups/{groupId}/leave`

**Response:**
```json
{
  "meta": {
    "code": 200,
    "message": "Success"
  },
  "data": {
    "left": true
  }
}
```

---

#### 13. Cập nhật thông tin Group

**Endpoint:** `PUT /fai/v1/chat/groups/{groupId}`

**Request Body:**
```json
{
  "name": "string",        // Optional
  "description": "string", // Optional
  "avatar": "string | null" // Optional
}
```

**Lưu ý:** Chỉ admin mới có quyền cập nhật

---

#### 14. Xóa Group

**Endpoint:** `DELETE /fai/v1/chat/groups/{groupId}`

**Lưu ý:** Chỉ admin mới có quyền xóa group

---

### 4. Cập nhật API Messages cho Group Chat

#### Cập nhật: `POST /fai/v1/chat/messages`

**Request Body (cập nhật):**
```json
{
  "id": "string",
  "userId": number,
  "targetUserId": number | null,      // NULL nếu là group chat
  "groupId": "string | null",          // NULL nếu là private chat
  "chatType": "private" | "group",    // Loại chat
  "username": "string",
  "fullName": "string",
  "avatar": "string | null",
  "message": "string",
  "timestamp": number,
  "type": "message" | "icon",
  "icon": "string | null"
}
```

**Authorization Logic:**
```sql
-- Pseudo code
IF chatType = 'group' THEN
  -- Kiểm tra user có trong group không
  IF EXISTS (
    SELECT 1 FROM chat_group_members 
    WHERE group_id = groupId 
      AND user_id = currentUserId 
      AND is_active = TRUE
      AND left_at IS NULL
  ) THEN
    -- Lưu message với group_id
    INSERT INTO chat_messages (..., group_id, chat_type, target_user_id = NULL)
  ELSE
    RETURN 403 Forbidden
  END IF
ELSE
  -- Private chat logic như cũ
  INSERT INTO chat_messages (..., target_user_id, chat_type = 'private', group_id = NULL)
END IF
```

---

#### Cập nhật: `GET /fai/v1/chat/messages`

**Query Parameters (cập nhật):**
```
targetUserId?: number (optional)  // Required nếu chatType = 'private'
groupId?: string (optional)        // Required nếu chatType = 'group'
chatType: "private" | "group" (required)
limit?: number (optional)
beforeTimestamp?: number (optional)
```

**Response:** Giữ nguyên format, nhưng có thể có messages từ nhiều users (nếu là group)

---

### 5. Pusher Integration cho Group Chat

#### Cập nhật: `/api/pusher/auth/route.ts`

Cần support cả private và group channels:

```typescript
const isPrivateChannel = channel_name.startsWith('private-chat-');
const isGroupChannel = channel_name.startsWith('group-chat-');
const isNotificationChannel = channel_name.startsWith('notifications-');

if (!isPrivateChannel && !isGroupChannel && !isNotificationChannel) {
  return NextResponse.json(
    { error: 'Chỉ cho phép private, group hoặc notification channel' },
    { status: 403 }
  );
}

// Với group channel, cần verify user là member
if (isGroupChannel) {
  const groupId = channel_name.replace('group-chat-', '');
  // TODO: Verify user là member của group này
  // Có thể gọi backend API để verify
  const auth = pusher.authorizeChannel(socket_id, channel_name);
  return NextResponse.json(auth);
}
```

#### Cập nhật: `/api/pusher/message/route.ts`

Cần support trigger cho group channels:

```typescript
if (chatType === 'group') {
  const groupChannel = `group-chat-${groupId}`;
  await pusher.trigger(groupChannel, 'new-message', data);
  
  // Gửi notification đến tất cả members (trừ người gửi)
  // Có thể cần query danh sách members từ backend
} else {
  // Private chat logic như cũ
}
```

---

### 6. Frontend Integration cho Group Chat

#### Cập nhật `useChat.tsx`

Cần thêm support cho group chat:

```typescript
// Thêm vào interface
interface UseChatReturn {
  // ... existing fields
  currentGroupId: string | null;
  setCurrentGroupId: (groupId: string | null) => void;
  groups: ChatGroup[];
  createGroup: (name: string, memberIds?: number[]) => Promise<string>;
  joinGroup: (groupId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
}

// Helper function cho group channel
function getGroupChannelName(groupId: string): string {
  return `group-chat-${groupId}`;
}

// Subscribe vào group channel
const subscribeToGroupChannel = useCallback((groupId: string) => {
  const channelName = getGroupChannelName(groupId);
  const channel = pusherRef.current.subscribe(channelName);
  
  channel.bind('new-message', (data: ChatMessage) => {
    // Handle group message
    if (currentGroupId === groupId) {
      setMessages((prev) => {
        if (prev.some((msg) => msg.id === data.id)) return prev;
        return [...prev, data].sort((a, b) => a.timestamp - b.timestamp);
      });
    }
  });
  
  channel.bind('pusher:subscription_succeeded', async () => {
    // Fetch historical messages cho group
    const response = await fetch(
      `${BASE_URL}/v1/chat/messages?groupId=${groupId}&chatType=group&limit=50`
    );
    // ... handle response
  });
  
  return channel;
}, [currentGroupId]);
```

---

### 7. Authorization Logic cho Group Chat

```typescript
// Pseudo code
function canAccessGroup(currentUser, groupId) {
  // Kiểm tra user có trong group không
  return EXISTS (
    SELECT 1 FROM chat_group_members 
    WHERE group_id = groupId 
      AND user_id = currentUser.userId 
      AND is_active = TRUE
      AND left_at IS NULL
  );
}

function canSendGroupMessage(currentUser, groupId) {
  // User phải là member của group
  return canAccessGroup(currentUser, groupId);
}

function canManageGroup(currentUser, groupId) {
  // Chỉ admin/moderator mới có quyền quản lý
  const member = GET_MEMBER(currentUser.userId, groupId);
  return member.role === 'admin' || member.role === 'moderator';
}
```

---

### 8. Notification cho Group Chat

Với group chat, cần gửi notification đến tất cả members (trừ người gửi):

```typescript
// Trong /api/pusher/message/route.ts
if (chatType === 'group' && groupId) {
  // Trigger group channel
  await pusher.trigger(`group-chat-${groupId}`, 'new-message', data);
  
  // Gửi notification đến từng member (trừ người gửi)
  // Cần query danh sách members từ backend
  const members = await getGroupMembers(groupId);
  members.forEach(member => {
    if (member.userId !== data.userId) {
      const notificationChannel = `notifications-${member.userId}`;
      await pusher.trigger(notificationChannel, 'new-group-message', {
        groupId,
        groupName: group.name,
        message: data,
      });
    }
  });
}
```

---

### 9. Read Status cho Group Chat

Group chat cần read status riêng vì có nhiều members:

```sql
-- Mỗi member có read status riêng
INSERT INTO chat_read_status (user_id, group_id, chat_type, last_read_timestamp)
VALUES (userId, groupId, 'group', timestamp)
ON DUPLICATE KEY UPDATE last_read_timestamp = timestamp;
```

---

## Security Considerations

1. **Authentication:** Tất cả endpoints cần validate Bearer token
2. **Authorization:** 
   - **User thường:** Chỉ có thể xem tin nhắn của chính mình
   - **Admin:** Có thể xem tin nhắn với bất kỳ user nào
   - **Group Chat:** User chỉ có thể xem/gửi tin nhắn trong groups mà họ là member
   - Validate `targetUserId` để đảm bảo user có quyền chat với người đó
   - Validate `groupId` và membership trước khi cho phép truy cập group
   - **Quan trọng:** Backend phải validate role từ token, không tin tưởng frontend
3. **Rate Limiting:** Có thể cần implement rate limiting cho các API endpoints
4. **Input Validation:** Validate và sanitize tất cả input data
5. **SQL Injection:** Sử dụng parameterized queries
6. **Admin Endpoints:** Tất cả admin endpoints phải kiểm tra role === 'admin' trước khi xử lý
7. **Group Management:** 
   - Chỉ admin/moderator mới có quyền thêm/xóa members
   - Không thể xóa admin khỏi group
   - Verify membership trước khi subscribe vào group channel
8. **Channel Authorization:** 
   - Private channels: Verify user là một trong hai participants
   - Group channels: Verify user là member của group

---

## Testing Checklist

### Basic Functionality
- [ ] Test lưu tin nhắn thành công
- [ ] Test lưu icon thành công
- [ ] Test fetch historical messages với pagination
- [ ] Test fetch historical messages khi chưa có tin nhắn nào
- [ ] Test authorization (user không thể xem tin nhắn của người khác)
- [ ] Test authentication (401 khi không có token)
- [ ] Test merge messages không bị duplicate
- [ ] Test sắp xếp messages theo timestamp
- [ ] Test với nhiều users cùng lúc
- [ ] Test performance với số lượng messages lớn

### Admin Functionality
- [ ] Test admin có thể xem tất cả conversations
- [ ] Test admin có thể chat với bất kỳ user nào
- [ ] Test admin có thể xem tin nhắn với bất kỳ user nào
- [ ] Test user thường không thể gọi admin endpoints
- [ ] Test admin có thể đánh dấu đã đọc tin nhắn từ bất kỳ user nào
- [ ] Test admin conversations API với filter (all/unread/recent)
- [ ] Test admin có thể xem unreadCount chính xác
- [ ] Test admin có thể xem totalMessages trong conversation

### Security Tests
- [ ] Test user không thể giả mạo role admin
- [ ] Test backend validate role từ token (không tin frontend)
- [ ] Test rate limiting hoạt động đúng
- [ ] Test SQL injection protection
- [ ] Test XSS protection trong messages

### Group Chat Tests
- [ ] Test tạo group thành công
- [ ] Test thêm/xóa members trong group
- [ ] Test user không phải member không thể xem tin nhắn group
- [ ] Test user không phải member không thể subscribe vào group channel
- [ ] Test gửi tin nhắn trong group
- [ ] Test fetch historical messages cho group
- [ ] Test notification đến tất cả members khi có tin nhắn mới
- [ ] Test read status cho group chat
- [ ] Test admin/moderator có quyền quản lý group
- [ ] Test member thường không thể quản lý group
- [ ] Test không thể xóa admin khỏi group
- [ ] Test rời group thành công
- [ ] Test xóa group (chỉ admin)
- [ ] Test performance với group có nhiều members (50+)
- [ ] Test performance với group có nhiều messages (1000+)

