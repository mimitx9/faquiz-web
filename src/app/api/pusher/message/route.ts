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
  type: 'message' | 'icon' | 'sticker' | 'image';
  icon?: string;
  image?: string; // Image URL nếu type là 'image'
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
      await pusher.trigger(targetChannel, 'new-message', data as ChatMessage);
      
      // Gửi notification đến notification channel của người nhận (nếu có targetUserId)
      if (targetUserId) {
        const notificationChannel = `notifications-${targetUserId}`;
        await pusher.trigger(notificationChannel, 'new-message-notification', {
          fromUserId: (data as ChatMessage).userId,
          channelName: targetChannel,
          message: data as ChatMessage,
        });
      }
    } else if (type === 'icon') {
      // Broadcast icon mới
      await pusher.trigger(targetChannel, 'new-icon', data as ChatMessage);
      
      // Gửi notification đến notification channel của người nhận (nếu có targetUserId)
      if (targetUserId) {
        const notificationChannel = `notifications-${targetUserId}`;
        await pusher.trigger(notificationChannel, 'new-message-notification', {
          fromUserId: (data as ChatMessage).userId,
          channelName: targetChannel,
          message: data as ChatMessage,
        });
      }
    } else if (type === 'sticker') {
      // Broadcast sticker mới
      await pusher.trigger(targetChannel, 'new-sticker', data as ChatMessage);
      
      // Gửi notification đến notification channel của người nhận (nếu có targetUserId)
      if (targetUserId) {
        const notificationChannel = `notifications-${targetUserId}`;
        await pusher.trigger(notificationChannel, 'new-message-notification', {
          fromUserId: (data as ChatMessage).userId,
          channelName: targetChannel,
          message: data as ChatMessage,
        });
      }
    } else if (type === 'image') {
      // Broadcast ảnh mới
      await pusher.trigger(targetChannel, 'new-image', data as ChatMessage);
      
      // Gửi notification đến notification channel của người nhận (nếu có targetUserId)
      if (targetUserId) {
        const notificationChannel = `notifications-${targetUserId}`;
        await pusher.trigger(notificationChannel, 'new-message-notification', {
          fromUserId: (data as ChatMessage).userId,
          channelName: targetChannel,
          message: data as ChatMessage,
        });
      }
    } else if (type === 'typing') {
      // Broadcast typing indicator
      const typingData = data as { userId: number; isTyping: boolean };
      await pusher.trigger(targetChannel, 'typing', typingData);
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

