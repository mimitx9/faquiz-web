# Phân tích chênh lệch giữa Messages trong DB và Pusher Statistics

## Vấn đề
- **Database**: 200 messages
- **Pusher Dashboard**: 5,171 "Total messages sent today"
- **Tỷ lệ**: ~25.85:1

## Nguyên nhân

### 1. Mỗi Message trigger 2 Pusher Events

Mỗi khi gửi một message (text, icon, sticker, image), hệ thống trigger **2 Pusher events**:

#### a) Event vào Channel chính
```59:61:src/app/api/pusher/message/route.ts
    if (type === 'message') {
      // Broadcast tin nhắn mới
      await pusher.trigger(targetChannel, 'new-message', data as ChatMessage);
```

#### b) Event vào Notification Channel
```63:71:src/app/api/pusher/message/route.ts
      // Gửi notification đến notification channel của người nhận (nếu có targetUserId)
      if (targetUserId) {
        const notificationChannel = `notifications-${targetUserId}`;
        await pusher.trigger(notificationChannel, 'new-message-notification', {
          fromUserId: (data as ChatMessage).userId,
          channelName: targetChannel,
          message: data as ChatMessage,
        });
      }
```

**Kết quả**: 200 messages × 2 events = **400 Pusher events**

### 2. Typing Indicator Events

Typing indicator được gửi qua Pusher mỗi khi:
- User bắt đầu gõ → `isTyping: true`
- User ngừng gõ (sau 2 giây) → `isTyping: false`

```111:114:src/app/api/pusher/message/route.ts
    } else if (type === 'typing') {
      // Broadcast typing indicator
      const typingData = data as { userId: number; isTyping: boolean };
      await pusher.trigger(targetChannel, 'typing', typingData);
```

**Logic gửi typing:**
```366:378:src/components/ui/ChatBoxInstance.tsx
    // Nếu có text, gửi typing start
    if (!lastTypingSentRef.current) {
      notifyTyping(true);
      lastTypingSentRef.current = true;
    }

    // Gửi typing stop sau 2 giây không gõ
    typingTimeoutRef.current = setTimeout(() => {
      if (lastTypingSentRef.current) {
        notifyTyping(false);
        lastTypingSentRef.current = false;
      }
    }, 2000);
```

**Vấn đề**: 
- Mỗi message có thể có nhiều typing events (start + stop)
- Nếu user gõ nhiều lần trước khi gửi, sẽ có nhiều typing events
- Typing events được đếm vào "Total messages sent" trong Pusher Dashboard

### 3. Các loại Message Types

Hệ thống hỗ trợ 4 loại message, mỗi loại đều trigger 2 events:

1. **`message`** - Text message
2. **`icon`** - Emoji
3. **`sticker`** - Sticker với audio (optional)
4. **`image`** - Hình ảnh

Tất cả đều có cùng pattern: 1 event vào channel chính + 1 event vào notification channel.

## Tính toán chi tiết

### Giả định:
- 200 messages trong DB
- Mỗi message = 2 Pusher events (channel + notification) = **400 events**
- Typing events: Giả sử trung bình mỗi message có 3 typing events (start + stop + có thể có thêm)
  - 200 messages × 3 typing events = **600 typing events**

**Tổng**: 400 + 600 = **1,000 events** (vẫn chưa đủ 5,171)

### Các khả năng khác:

1. **Typing events nhiều hơn dự kiến**: 
   - User có thể gõ nhiều lần trước khi gửi
   - Mỗi lần gõ có thể trigger typing start/stop
   - Có thể có ~20-25 typing events cho mỗi message thực tế

2. **Duplicate events**: 
   - Có thể có retry logic hoặc duplicate triggers
   - Network issues có thể gây ra retry

3. **Historical data**: 
   - Pusher Dashboard có thể đếm cả các events từ trước đó trong ngày
   - Không chỉ tính từ khi bắt đầu tracking

4. **Multiple channels**: 
   - Nếu có nhiều conversations, mỗi conversation có channel riêng
   - Typing events được gửi vào từng channel riêng

## Giải pháp đề xuất

### 1. Tách biệt Typing Events khỏi Message Events

**Hiện tại**: Typing events được đếm cùng với message events trong Pusher Dashboard

**Đề xuất**: 
- Sử dụng event name khác cho typing (ví dụ: `typing-indicator` thay vì `typing`)
- Hoặc sử dụng channel riêng cho typing events
- Hoặc không track typing events trong statistics

### 2. Giảm số lượng Typing Events

**Hiện tại**: Typing events được gửi mỗi khi user gõ

**Đề xuất**:
- Throttle typing events (chỉ gửi mỗi 500ms-1s thay vì mỗi lần gõ)
- Debounce typing events (chỉ gửi sau khi user ngừng gõ 500ms)

### 3. Tối ưu Notification Events

**Hiện tại**: Mỗi message trigger 2 events (channel + notification)

**Đề xuất**:
- Chỉ gửi notification event khi cần thiết (ví dụ: user offline)
- Hoặc combine notification vào message event

### 4. Tracking riêng biệt

**Đề xuất**:
- Tạo custom tracking cho messages thực tế (chỉ đếm khi lưu vào DB)
- Không dựa vào Pusher Dashboard để đếm messages
- Sử dụng analytics riêng để track message statistics

## Kết luận

**Nguyên nhân chính**: 
- Mỗi message trigger **2 Pusher events** (channel + notification)
- **Typing events** được đếm vào "Total messages sent" và có thể rất nhiều
- Pusher Dashboard đếm **tất cả events** chứ không chỉ messages thực tế

**Khuyến nghị**: 
- Sử dụng database để đếm messages thực tế
- Pusher Dashboard chỉ dùng để monitor system health, không dùng để đếm messages
- Nếu cần tracking chính xác, implement custom analytics

