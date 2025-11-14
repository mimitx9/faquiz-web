# Backend ChatMessage Proto Verification

## ✅ Backend Proto Definition ĐÚNG

Backend proto definition đã được verify và **KHỚP** với frontend:

### Proto File: `proto/websocket/chat.proto`

```protobuf
message ChatMessage {
  string id = 1;             // Message ID
  int64 userId = 2;          // User ID
  string username = 3;       // Username
  string fullName = 4;       // Full name
  string avatar = 5;         // Avatar URL
  string message = 6;        // Message content
  int64 timestamp = 7;       // Timestamp
  string type = 8;           // Message type: "message", "icon", "sticker", "image"
  string media = 9;          // Media URL/ID
  string audio = 10;         // Audio URL
}
```

### Generated Go Code: `proto/websocket/chat/chat.pb.go`

```go
type ChatMessage struct {
    Id        string `protobuf:"bytes,1,opt,name=id,proto3" json:"id,omitempty"`
    UserId    int64  `protobuf:"varint,2,opt,name=userId,proto3" json:"userId,omitempty"`
    Username  string `protobuf:"bytes,3,opt,name=username,proto3" json:"username,omitempty"`
    FullName  string `protobuf:"bytes,4,opt,name=fullName,proto3" json:"fullName,omitempty"`
    Avatar    string `protobuf:"bytes,5,opt,name=avatar,proto3" json:"avatar,omitempty"`
    Message   string `protobuf:"bytes,6,opt,name=message,proto3" json:"message,omitempty"`
    Timestamp int64  `protobuf:"varint,7,opt,name=timestamp,proto3" json:"timestamp,omitempty"`
    Type      string `protobuf:"bytes,8,opt,name=type,proto3" json:"type,omitempty"`
    Media     string `protobuf:"bytes,9,opt,name=media,proto3" json:"media,omitempty"`
    Audio     string `protobuf:"bytes,10,opt,name=audio,proto3" json:"audio,omitempty"`
}
```

**✅ Tất cả field numbers đều đúng: 1-10**

## 🔍 Phân tích Hex Dump

Từ hex dump frontend cung cấp:

```
0a 0b 6e 65 77 2d 6d 65 73 73 61 67 65  // Field 1 (type): "new-message"
12 10 63 68 61 74 2d 36 36 36 30 31 2d 39 34 34 37 30  // Field 2 (roomId)
1a a1 01  // Field 3 (newMessage), wire type 2, length 161 bytes
  0a 26 74 65 6d 70 2d...  // Field 1 (id trong ChatMessage)
  10 86 e2 05  // Field 2 (userId), wire type 0 (varint), value 94470
  1a 0a 30 39 33 34 36 31 33 39 34 39  // Field 3 (username)
  22 0a 74 75 e1 ba a5 6e 20 61 6e  // Field 4 (fullName)
```

**Phân tích:**
- ✅ Field 1 (id): `0a 26` = field 1, wire type 2, length 38
- ✅ Field 2 (userId): `10 86 e2 05` = field 2, wire type 0 (varint), value 94470
- ✅ Field 3 (username): `1a 0a` = field 3, wire type 2, length 10
- ✅ Field 4 (fullName): `22 0a` = field 4, wire type 2, length 10

**Tất cả field numbers và wire types đều ĐÚNG!**

## ⚠️ Vấn đề có thể xảy ra

Lỗi "invalid wire type 4" có thể do:

1. **Frontend đang dùng proto definition cũ** - Field numbers không khớp
2. **Frontend decode sai** - Có thể đang decode với proto definition khác
3. **Proto library version mismatch** - Protobufjs hoặc @bufbuild/protobuf version khác nhau

## ✅ Giải pháp cho Frontend

### 1. Verify Proto File

Đảm bảo frontend đang sử dụng **chính xác** proto file từ backend:

```bash
# Copy proto file từ backend
cp proto/websocket/chat.proto frontend/src/proto/websocket/chat.proto
```

### 2. Regenerate Frontend Code

**Với protobufjs:**

```typescript
// Load proto file mới
this.root = await protobuf.load('/proto/websocket/chat.proto');
```

**Với @bufbuild/protobuf:**

```bash
protoc --es_out=./src/proto --es_opt=target=ts proto/websocket/chat.proto
```

### 3. Verify Field Numbers

Sau khi regenerate, verify field numbers:

```typescript
const ChatMessage = this.root.lookupType('websocket.chat.ChatMessage');
const fields = ChatMessage.fields;

// Verify field numbers
console.log('Field 1 (id):', fields.id.id);        // Should be 1
console.log('Field 2 (userId):', fields.userId.id); // Should be 2
console.log('Field 3 (username):', fields.username.id); // Should be 3
console.log('Field 4 (fullName):', fields.fullName.id); // Should be 4
console.log('Field 5 (avatar):', fields.avatar.id); // Should be 5
console.log('Field 6 (message):', fields.message.id); // Should be 6
console.log('Field 7 (timestamp):', fields.timestamp.id); // Should be 7
console.log('Field 8 (type):', fields.type.id); // Should be 8
console.log('Field 9 (media):', fields.media.id); // Should be 9
console.log('Field 10 (audio):', fields.audio.id); // Should be 10
```

### 4. Test Decode

Test decode với message từ backend:

```typescript
const buffer = new Uint8Array([...]); // Binary từ server
const WebSocketChatMessage = this.root.lookupType('websocket.chat.WebSocketChatMessage');
const message = WebSocketChatMessage.decode(buffer);

console.log('Type:', message.type); // Should be "new-message"
console.log('RoomId:', message.roomId);
console.log('NewMessage:', message.newMessage);
```

## 🔧 Backend đã sửa

Backend đã được sửa để chỉ set optional fields khi có giá trị:

```go
// Chỉ set optional fields nếu chúng có giá trị (không phải nil và không phải empty string)
if dto.Avatar != nil && *dto.Avatar != "" {
    pb.Avatar = *dto.Avatar
}
if dto.Media != nil && *dto.Media != "" {
    pb.Media = *dto.Media
}
if dto.Audio != nil && *dto.Audio != "" {
    pb.Audio = *dto.Audio
}
```

## 📋 Checklist cho Frontend

- [ ] Copy proto file từ backend: `proto/websocket/chat.proto`
- [ ] Regenerate frontend proto code
- [ ] Verify field numbers (1-10) sau khi regenerate
- [ ] Test decode `new-message` từ server
- [ ] Kiểm tra protobuf library version (protobufjs hoặc @bufbuild/protobuf)
- [ ] Đảm bảo không có proto definition cũ nào còn sót lại

## 🐛 Debug Tips

1. **Log hex dump** khi nhận message từ server
2. **Phân tích từng field** trong hex dump để tìm field gây lỗi
3. **So sánh proto definition** giữa frontend và backend
4. **Test với message đơn giản** (chỉ có required fields) trước
5. **Kiểm tra version** của protobuf library

## 📝 Kết luận

**Backend proto definition ĐÚNG và đã được verify.** Vấn đề có thể là:

- Frontend đang dùng proto definition cũ
- Frontend chưa regenerate proto code sau khi cập nhật proto file
- Proto library version mismatch

**Giải pháp:** Frontend cần verify và regenerate proto code với proto file mới nhất từ backend.
