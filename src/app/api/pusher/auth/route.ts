import { NextRequest, NextResponse } from 'next/server';
import Pusher from 'pusher';

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

    // Pusher gửi dữ liệu dưới dạng URL-encoded string (application/x-www-form-urlencoded)
    // Đọc text và parse như URL-encoded
    const text = await request.text();
    const params = new URLSearchParams(text);
    const socket_id = params.get('socket_id');
    const channel_name = params.get('channel_name');

    if (!socket_id || !channel_name) {
      return NextResponse.json(
        { error: 'Thiếu thông tin socket_id hoặc channel_name' },
        { status: 400 }
      );
    }

    // Cho phép private channel, presence channel và notification channel (public)
    const isPrivateChannel = channel_name.startsWith('private-');
    const isPresenceChannel = channel_name.startsWith('presence-');
    const isNotificationChannel = channel_name.startsWith('notifications-');
    
    if (!isPrivateChannel && !isPresenceChannel && !isNotificationChannel) {
      return NextResponse.json(
        { error: 'Chỉ cho phép private channel, presence channel hoặc notification channel' },
        { status: 403 }
      );
    }

    // Với notification channel, chỉ cho phép user subscribe vào channel của chính họ
    if (isNotificationChannel) {
      // Lấy userId từ channel name: notifications-{userId}
      const channelUserId = channel_name.replace('notifications-', '');
      // TODO: Verify user có quyền subscribe vào channel này (cần lấy userId từ token)
      // Tạm thời cho phép tất cả (sẽ cải thiện sau)
    }

    // Authenticate presence channel với user info
    if (isPresenceChannel) {
      try {
        const token = authHeader.replace('Bearer ', '');
        
        // Lấy user info từ API backend
        const backendUrl = process.env.NODE_ENV === 'production' 
          ? 'https://api.facourse.com/fai' 
          : 'https://api.facourse.com/fai';
        const profileResponse = await fetch(`${backendUrl}/v1/user/profile-quiz`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'site': 'BATTLE',
          },
        });
        
        if (!profileResponse.ok) {
          return NextResponse.json(
            { error: 'Không thể xác thực user' },
            { status: 401 }
          );
        }
        
        const profileData = await profileResponse.json();
        // API trả về format: { meta: {...}, data: User } hoặc User trực tiếp
        const user = profileData.data || profileData;
        
        // Tạo user info cho Pusher presence channel
        const userInfo = {
          user_id: String(user.userId || user.id),
          user_info: {
            userId: user.userId || user.id,
            username: user.username || '',
            fullName: user.fullName || user.name || '',
            avatar: user.avatar || null,
            onlineSince: Date.now(), // Timestamp khi user online
          }
        };
        
        const auth = pusher.authorizeChannel(socket_id, channel_name, userInfo);
        return NextResponse.json(auth);
      } catch (error: any) {
        console.error('Presence auth error:', error);
        return NextResponse.json(
          { error: 'Lỗi khi xác thực presence channel: ' + (error.message || 'Unknown error') },
          { status: 500 }
        );
      }
    }

    // Authenticate channel (chỉ cần cho private channel, public channel không cần)
    if (isPrivateChannel) {
      const auth = pusher.authorizeChannel(socket_id, channel_name);
      return NextResponse.json(auth);
    } else {
      // Public channel không cần authentication, nhưng vẫn cần trả về response
      return NextResponse.json({});
    }
  } catch (error: any) {
    console.error('Pusher auth error:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi khi xác thực Pusher' },
      { status: 500 }
    );
  }
}

