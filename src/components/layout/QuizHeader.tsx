'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/common/Avatar';
import { useAuth } from '@/hooks/useAuth';

const QuizHeader: React.FC = () => {
  const router = useRouter();
  const { user, isInitialized } = useAuth();

  const handleUpgradeClick = () => {
    // Nếu chưa đăng nhập thì redirect đến trang login
    if (isInitialized && !user) {
      router.push('/login');
    } else {
      router.push('/upgrade');
    }
  };

  return (
    <header className="h-20 flex items-center px-8 fixed top-0 left-0 right-0 z-50 bg-white">
      {/* Cột 1: Logo */}
      <div className="flex items-center w-1/3">
        <Link href="/" className="flex items-center relative h-8 w-auto">
          <Image 
            src="/logos/logos.png" 
            alt="FA Quiz" 
            width={120}
            height={32}
            className="h-8 w-auto"
            priority
            quality={90}
          />
        </Link>
      </div>

      {/* Cột 2: Trống */}
      <div className="w-1/3"></div>

      {/* Cột 3: Nút Nâng Cấp và Avatar */}
      <div className="flex items-center justify-end space-x-4 w-1/3">
        <button
          onClick={handleUpgradeClick}
          className="rounded-full px-4 py-2 transition-opacity hover:opacity-80"
          style={{
            backgroundColor: '#FFBB001A',
            color: '#FFBB00',
            border: 'none'
          }}
        >
          Nâng Cấp
        </button>
        <Avatar
          src={user?.avatar || '/logos/header/avatar-default.svg'}
          alt={user?.fullName || user?.username || 'User'}
          name={user?.fullName || user?.username || 'User'}
          size="md"
        />
      </div>
    </header>
  );
};

export default QuizHeader;
