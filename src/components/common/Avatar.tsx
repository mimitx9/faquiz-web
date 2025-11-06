'use client';

import React, { useState } from 'react';
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
