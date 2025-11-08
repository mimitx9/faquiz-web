'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ThemeToggle from '@/components/ui/ThemeToggle';

interface MobileHeaderProps {
  isPanelOpen?: boolean;
  isTimerEnabled: boolean;
  isPracticeEnabled: boolean;
  onTimerToggle: () => void;
  onPracticeToggle: () => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  isPanelOpen = false,
  isTimerEnabled,
  isPracticeEnabled,
  onTimerToggle,
  onPracticeToggle,
}) => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isPaid = user?.faQuizInfo?.isPaid === true;

  // Close dropdown when clicking outside - logic riêng cho mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isDropdownOpen || isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, isMenuOpen]);

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
    <header className={`flex lg:hidden items-center px-4 md:px-8 fixed top-0 left-0 right-0 z-50 bg-white dark:bg-black transition-all duration-300 ${isPanelOpen ? 'h-0 overflow-hidden' : 'h-20'}`}>
      <div className="flex items-center justify-between w-full">
        {/* Menu Icon - Left */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-gray-700 dark:text-gray-300 hover:text-[#8D7EF7] dark:hover:text-[#FFBB00] transition-colors"
            aria-label="Menu"
          >
            <svg className="text-gray-300" width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="18" height="4" rx="2" fill="currentColor"></rect><rect y="10" width="12" height="4" rx="2" fill="currentColor"></rect></svg>
          </button>

          {/* Menu Dropdown */}
          {isMenuOpen && (
            <div className="absolute left-0 top-full mt-2 p-2 w-56 z-50 border-2 border-gray-100 dark:border-gray-800 rounded-2xl bg-white dark:bg-black shadow-lg">
              <div className="py-2">
                <Link
                  href="/giai-phau-3d"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center px-4 py-3 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <span className="text-sm font-medium">Giải phẫu 3D</span>
                </Link>
                <Link
                  href="/fa-quiz-ung-dung-trac-nghiem-y-khoa-hang-dau-2025"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center px-4 py-3 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <span className="text-sm font-medium">Tải app</span>
                </Link>
                <button
                  onClick={() => {
                    handleUpgradeClick();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center px-4 py-3 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
                >
                  <span className="text-sm font-medium">Nâng cấp</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Logo - Center (Tablet: logos.png, Mobile: favicon.png) */}
        <div className="flex items-center justify-center flex-1">
          <button 
            onClick={() => {
              window.location.href = '/';
            }}
            className="flex items-center relative h-8 w-auto cursor-pointer"
          >
            {/* Mobile: favicon.png */}
            <Image 
              src="/logos/favicon.png" 
              alt="FA Quiz" 
              width={32}
              height={32}
              className="h-8 w-8 md:hidden lg:hidden"
              priority
              quality={95}
              sizes="32px"
            />
            {/* Tablet: logos.png */}
            <Image 
              src="/logos/logos.png" 
              alt="FA Quiz" 
              width={120}
              height={48}
              className="h-10 w-auto hidden md:block lg:hidden"
              priority
              quality={95}
              sizes="120px"
            />
          </button>
        </div>

        {/* Avatar - Right */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={handleAvatarClick}
            className="cursor-pointer transition-opacity bg-white dark:bg-white/20 rounded-full flex items-center border-2 border-gray-100 dark:border-white/10"
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

export default MobileHeader;

