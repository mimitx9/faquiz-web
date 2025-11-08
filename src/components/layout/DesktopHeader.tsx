'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ThemeToggle from '@/components/ui/ThemeToggle';

interface DesktopHeaderProps {
  totalQuestions?: number;
  onTimerExpired?: () => void;
  isPanelOpen?: boolean;
  isTimerEnabled: boolean;
  isPracticeEnabled: boolean;
  onTimerToggle: () => void;
  onPracticeToggle: () => void;
  remainingTime: number;
  formatTime: (seconds: number) => string;
}

const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  totalQuestions,
  onTimerExpired,
  isPanelOpen = false,
  isTimerEnabled,
  isPracticeEnabled,
  onTimerToggle,
  onPracticeToggle,
  remainingTime,
  formatTime,
}) => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isPaid = user?.faQuizInfo?.isPaid === true;

  // Close dropdown when clicking outside - logic đơn giản cho desktop
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleUpgradeClick = () => {
    if (isPaid) {
      return;
    }
    if (!user) {
      router.push('/login');
    } else {
      router.push('/upgrade');
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsDropdownOpen(false);
    router.push('/login');
  };

  const handleAvatarClick = () => {
    if (user) {
      setIsDropdownOpen(!isDropdownOpen);
    } else {
      router.push('/login');
    }
  };

  // Calculate remaining days
  const calculateRemainingDays = (): number | null => {
    if (!user?.faQuizInfo?.expireTime) return null;
    const expireTime = user.faQuizInfo.expireTime * 1000;
    const now = Date.now();
    const diffTime = expireTime - now;
    if (diffTime <= 0) return 0;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const remainingDays = calculateRemainingDays();

  return (
    <header className={`hidden lg:flex items-center px-4 md:px-8 fixed top-0 left-0 right-0 z-50 bg-white dark:bg-black transition-all duration-300 ${isPanelOpen ? 'h-0 overflow-hidden' : 'h-20'}`}>
      {/* Cột 1: Logo */}
      <div className="flex items-center w-1/3">
        <button 
          onClick={() => {
            window.location.href = '/';
          }}
          className="flex items-center relative h-8 w-auto cursor-pointer"
        >
          <Image 
            src="/logos/logos.png" 
            alt="FA Quiz" 
            width={120}
            height={48}
            className="h-10 w-auto"
            priority
            quality={95}
            sizes="120px"
          />
        </button>
      </div>

      {/* Cột 2: Đồng hồ đếm ngược */}
      <div className="flex w-1/3 items-center justify-center">
        {isTimerEnabled && totalQuestions && totalQuestions > 0 && remainingTime > 0 && (
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5"
              style={{ color: '#FFBB00' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span
              className="text-xl font-semibold"
              style={{ color: '#FFBB00' }}
            >
              {formatTime(remainingTime)}
            </span>
          </div>
        )}
      </div>

      {/* Cột 3: Nút Nâng Cấp/PRO và Avatar */}
      <div className="flex items-center justify-end space-x-8 w-1/3">
        <Link
          href="/giai-phau-3d"
          className="text-sm font-medium duration-300 transition-all text-gray-400 dark:text-[#FFBB00]/50 tracking-wide hover:scale-110 hover:text-[#8D7EF7] dark:hover:text-[#FFBB00]"
        >
          GIẢI PHẪU 3D
        </Link>
        <Link
          href="/fa-quiz-ung-dung-trac-nghiem-y-khoa-hang-dau-2025"
          className="text-sm font-medium duration-300 transition-all text-gray-400 dark:text-[#FFBB00]/50 tracking-wide hover:scale-110 hover:text-[#8D7EF7] dark:hover:text-[#FFBB00]"
        >
          TẢI APP
        </Link>
        <button
          onClick={handleUpgradeClick}
          className={`rounded-full text-sm font-semibold tracking-wide px-5 py-2 transition-all duration-300 hover:scale-110 ${
            isPaid ? 'cursor-default' : 'hover:!bg-[#FFBB00] hover:!text-white'
          }`}
          style={{
            backgroundColor: '#FFBB001A',
            color: '#FFBB00',
            border: 'none'
          }}
        >
          {isPaid ? 'PRO' : 'NÂNG CẤP'}
        </button>
        
        {/* Avatar with dropdown menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={handleAvatarClick}
            className="cursor-pointer transition-opacity bg-white dark:bg-white/10 rounded-full flex items-center border-2 border-gray-100 dark:border-white/10"
          >
            {user && user.avatar ? (
              <Image
                src={user.avatar}
                alt={user.fullName || user.username || 'User'}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover"
                sizes="32px"
                quality={90}
              />
            ) : (
              <Image
                src="/logos/header/avatar-default.svg"
                alt="Avatar"
                width={32}
                height={32}
                className="w-8 h-8 opacity-30"
                priority
                quality={100}
                sizes="32px"
              />
            )}
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 p-2 w-56 z-50 border-2 border-gray-100 dark:border-gray-800 rounded-2xl bg-white dark:bg-black shadow-lg">
              <div className="py-2">
                {/* Thông tin Pro/Upgrade */}
                {isPaid ? (
                  <div className="flex items-center justify-between px-4 py-2">
                    <span className="font-medium text-sm dark:text-white" 
                        style={{ color: '#FFBB00' }}>Pro</span>
                    {remainingDays !== null && (
                      <span
                        className="text-sm font-medium dark:text-white"
                        style={{ color: '#FFBB00' }}
                      >
                        {remainingDays > 999 ? 'Vĩnh viễn' : `Còn ${remainingDays} ngày`}
                      </span>
                    )}
                  </div>
                ) : (
                  <Link
                    href="/upgrade"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center px-4 py-2 text-black dark:text-white transition-colors"
                  >
                    <span className="font-medium text-sm" style={{ color: '#FFBB00' }}>Nâng cấp Pro</span>
                  </Link>
                )}

                {/* Config đếm giờ */}
                <div className="flex items-center justify-between px-4 py-2 text-black dark:text-white transition-colors">
                  <span className="text-sm">Đếm giờ</span>
                  <button
                    onClick={onTimerToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isTimerEnabled ? '' : 'bg-gray-200 dark:bg-white/20'
                    }`}
                    style={{
                      backgroundColor: isTimerEnabled ? '#8D7EF7' : undefined,
                    }}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isTimerEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Ôn thi on/off */}
                <div className="flex items-center justify-between px-4 py-2 text-black dark:text-white transition-colors">
                  <span className="text-sm">Ôn thi</span>
                  <button
                    onClick={onPracticeToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isPracticeEnabled ? '' : 'bg-gray-200 dark:bg-white/20'
                    }`}
                    style={{
                      backgroundColor: isPracticeEnabled ? '#8D7EF7' : undefined,
                    }}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isPracticeEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Dark/Light mode toggle */}
                <div className="flex items-center justify-between px-4 py-2 text-black dark:text-white transition-colors">
                  <span className="text-sm">Cú đêm</span>
                  <ThemeToggle />
                </div>

                {/* Đăng xuất */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-4 py-2 text-gray-400 dark:text-gray-500 text-left hover:text-black dark:hover:text-white transition-colors"
                >
                  <span className="text-sm">Đăng xuất</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default DesktopHeader;

