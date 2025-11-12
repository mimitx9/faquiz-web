'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Danh sách các hostname được phép (từ next.config.js)
const ALLOWED_HOSTNAMES = [
  'drive.google.com',
  '*.googleusercontent.com',
  'storage.googleapis.com',
  'facourse.com',
  '*.cloudfront.net',
];

export default function Avatar({ 
  src, 
  alt, 
  name, 
  size = 'md', 
  className = '' 
}: AvatarProps) {
  const router = useRouter();
  const { user, isInitialized } = useAuth();
  const [imageError, setImageError] = useState(false);

  const handleClick = () => {
    // Nếu chưa đăng nhập thì redirect đến trang login
    if (isInitialized && !user) {
      router.push('/login');
    }
    // Nếu đã đăng nhập có thể thêm logic khác ở đây (ví dụ: mở menu profile)
  };
  
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-6 h-6 text-xs';
      case 'lg':
        return 'w-12 h-12 text-lg';
      default: // md
        return 'w-8 h-8 text-sm';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Kiểm tra xem URL có hợp lệ và được phép không
  const isValidImageUrl = useMemo(() => {
    if (!src) return false;
    
    try {
      const url = new URL(src);
      const hostname = url.hostname.toLowerCase();
      
      // Kiểm tra xem hostname có trong danh sách được phép không
      const isAllowed = ALLOWED_HOSTNAMES.some(allowed => {
        if (allowed.startsWith('*.')) {
          // Xử lý wildcard như *.googleusercontent.com hoặc *.cloudfront.net
          const domain = allowed.slice(2); // Bỏ '*.'
          return hostname === domain || hostname.endsWith('.' + domain);
        }
        // Match chính xác hoặc subdomain
        return hostname === allowed || hostname.endsWith('.' + allowed);
      });
      
      return isAllowed;
    } catch (error) {
      // URL không hợp lệ
      return false;
    }
  }, [src]);

  const sizeClasses = getSizeClasses();
  const initials = name ? getInitials(name) : 'U';

  // Chỉ hiển thị image nếu URL hợp lệ, được phép và chưa có lỗi
  if (src && isValidImageUrl && !imageError) {
    const sizeMap = {
      sm: 24,
      md: 32,
      lg: 48,
    };

    return (
      <div 
        className={`${sizeClasses} rounded-full overflow-hidden cursor-pointer relative ${className}`}
        onClick={handleClick}
      >
        <Image
          src={src}
          alt={alt || name || 'User avatar'}
          fill
          className="object-cover"
          onError={() => setImageError(true)}
          sizes={`${sizeMap[size]}px`}
          quality={90}
        />
      </div>
    );
  }

  // Fallback: hiển thị initials
  return (
    <div 
      className={`${sizeClasses} rounded-full bg-gray-600 flex items-center justify-center text-white font-medium cursor-pointer ${className}`}
      onClick={handleClick}
    >
      {initials}
    </div>
  );
}
