import { NextRequest, NextResponse } from 'next/server';
import Pusher from 'pusher';

// ChatMessage interface - duplicate từ useChat để tránh import issue
interface ChatMessage {
  id: string;
  userId: number;
  username: string;
  fullName: string;
  avatar?: string;
  message: string;
  timestamp: number;
  type: 'message' | 'icon' | 'sticker';
  icon?: string;
}

// Khởi tạo Pusher server instance
const pusher = new Pusher({
  appId: '1260049',
  key: '0db27f32f5c4cd52cb2b',
  secret: 'b740aeb3386449ca57ad',
  cluster: 'ap1',
  useTLS: true,
});

export async function POST(request: NextRequest) {
  try {
    // Kiểm tra authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Vui lòng đăng nhập để sử dụng tính năng chat' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, data, channelName, targetUserId } = body;

    if (!type || !data) {
      return NextResponse.json(
        { error: 'Thiếu thông tin type hoặc data' },
        { status: 400 }
      );
    }

    // Sử dụng channelName từ request, fallback về private-chat nếu không có (backward compatibility)
    const targetChannel = channelName || 'private-chat';

    // Validate channel name - chỉ cho phép private channel
    if (!targetChannel.startsWith('private-')) {
      return NextResponse.json(
        { error: 'Chỉ cho phép private channel' },
        { status: 403 }
      );
    }

    if (type === 'message') {
      // Broadcast tin nhắn mới
      console.log('[Pusher API] Triggering message event:', {
        channel: targetChannel,
        from: (data as ChatMessage).userId,
        to: targetUserId,
        message: (data as ChatMessage).message?.substring(0, 50),
      });
      await pusher.trigger(targetChannel, 'new-message', data as ChatMessage);
      console.log('[Pusher API] Message event đã được trigger thành công');
      
      // Gửi notification đến notification channel của người nhận (nếu có targetUserId)
      if (targetUserId) {
        const notificationChannel = `notifications-${targetUserId}`;
        console.log('[Pusher API] Gửi notification đến:', notificationChannel);
        await pusher.trigger(notificationChannel, 'new-message-notification', {
          fromUserId: (data as ChatMessage).userId,
          channelName: targetChannel,
          message: data as ChatMessage,
        });
        console.log('[Pusher API] Notification đã được gửi thành công');
      }
    } else if (type === 'icon') {
      // Broadcast icon mới
      console.log('[Pusher API] Triggering icon event:', {
        channel: targetChannel,
        from: (data as ChatMessage).userId,
        to: targetUserId,
        icon: (data as ChatMessage).icon,
      });
      await pusher.trigger(targetChannel, 'new-icon', data as ChatMessage);
      console.log('[Pusher API] Icon event đã được trigger thành công');
      
      // Gửi notification đến notification channel của người nhận (nếu có targetUserId)
      if (targetUserId) {
        const notificationChannel = `notifications-${targetUserId}`;
        console.log('[Pusher API] Gửi notification đến:', notificationChannel);
        await pusher.trigger(notificationChannel, 'new-message-notification', {
          fromUserId: (data as ChatMessage).userId,
          channelName: targetChannel,
          message: data as ChatMessage,
        });
        console.log('[Pusher API] Notification đã được gửi thành công');
      }
    } else if (type === 'sticker') {
      // Broadcast sticker mới
      console.log('[Pusher API] Triggering sticker event:', {
        channel: targetChannel,
        from: (data as ChatMessage).userId,
        to: targetUserId,
        stickerId: (data as ChatMessage).icon,
      });
      await pusher.trigger(targetChannel, 'new-sticker', data as ChatMessage);
      console.log('[Pusher API] Sticker event đã được trigger thành công');
      
      // Gửi notification đến notification channel của người nhận (nếu có targetUserId)
      if (targetUserId) {
        const notificationChannel = `notifications-${targetUserId}`;
        console.log('[Pusher API] Gửi notification đến:', notificationChannel);
        await pusher.trigger(notificationChannel, 'new-message-notification', {
          fromUserId: (data as ChatMessage).userId,
          channelName: targetChannel,
          message: data as ChatMessage,
        });
        console.log('[Pusher API] Notification đã được gửi thành công');
      }
    } else if (type === 'typing') {
      // Broadcast typing indicator
      const typingData = data as { userId: number; isTyping: boolean };
      console.log('[Pusher API] Triggering typing event:', {
        channel: targetChannel,
        from: typingData.userId,
        to: targetUserId,
        isTyping: typingData.isTyping,
      });
      await pusher.trigger(targetChannel, 'typing', typingData);
      console.log('[Pusher API] Typing event đã được trigger thành công');
    } else {
      return NextResponse.json(
        { error: 'Type không hợp lệ' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Pusher message error:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi khi gửi tin nhắn' },
      { status: 500 }
    );
  }
}

