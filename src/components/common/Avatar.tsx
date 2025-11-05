'use client';

import React, { useState } from 'react';
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

  const sizeClasses = getSizeClasses();
  const initials = name ? getInitials(name) : 'U';

  // Nếu có src và chưa lỗi thì hiển thị image
  if (src && !imageError) {
    return (
      <img
        src={src}
        alt={alt || name || 'User avatar'}
        className={`${sizeClasses} rounded-full object-cover cursor-pointer ${className}`}
        onClick={handleClick}
        onError={() => setImageError(true)}
      />
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
