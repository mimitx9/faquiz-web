'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import ThemeToggle from '@/components/ui/ThemeToggle';

interface QuizHeaderProps {
  totalQuestions?: number; // Số lượng câu hỏi để tính thời gian
  onTimerExpired?: () => void; // Callback khi hết giờ
  isPanelOpen?: boolean; // Panel có đang mở không
}

const QuizHeader: React.FC<QuizHeaderProps> = ({ totalQuestions, onTimerExpired, isPanelOpen = false }) => {
  const router = useRouter();
  const { user, isInitialized, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Menu dropdown cho tablet/mobile
  const [isTimerEnabled, setIsTimerEnabled] = useState(false);
  const [isPracticeEnabled, setIsPracticeEnabled] = useState(false); // Ôn thi on/off
  const [remainingTime, setRemainingTime] = useState<number>(0); // Thời gian còn lại (giây)
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const onTimerExpiredRef = useRef(onTimerExpired); // Lưu callback mới nhất

  const isPaid = user?.faQuizInfo?.isPaid === true;

  // Cập nhật ref khi callback thay đổi (không trigger re-render)
  useEffect(() => {
    onTimerExpiredRef.current = onTimerExpired;
  }, [onTimerExpired]);

  // Load timer setting from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTimerSetting = localStorage.getItem('timer_enabled');
      const enabled = savedTimerSetting === 'true';
      setIsTimerEnabled(enabled);
      // Load practice (Ôn thi) setting
      const savedPracticeSetting = localStorage.getItem('practice_enabled');
      const practice = savedPracticeSetting === 'true';
      setIsPracticeEnabled(practice);
    }
  }, []);

  // Khởi tạo và quản lý đồng hồ đếm ngược
  useEffect(() => {
    // Clear interval cũ trước khi tạo mới
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (isTimerEnabled && totalQuestions && totalQuestions > 0) {
      const totalTimeSeconds = totalQuestions * 15; // Số câu x 15 giây
      setRemainingTime(totalTimeSeconds);

      // Bắt đầu đếm ngược
      timerIntervalRef.current = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            // Hết giờ
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
            }
            // Sử dụng ref để gọi callback mới nhất
            if (onTimerExpiredRef.current) {
              onTimerExpiredRef.current();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Reset timer khi tắt hoặc không có câu hỏi
      setRemainingTime(0);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isTimerEnabled, totalQuestions]); // Loại bỏ onTimerExpired khỏi dependency

  // Format thời gian từ giây sang MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Close dropdown when clicking outside
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
    // Nếu đã thanh toán thì không làm gì cả
    if (isPaid) {
      return;
    }
    // Nếu chưa đăng nhập thì redirect đến trang login
    if (isInitialized && !user) {
      router.push('/login');
    } else {
      router.push('/upgrade');
    }
  };

  const handleTimerToggle = () => {
    const newValue = !isTimerEnabled;
    setIsTimerEnabled(newValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem('timer_enabled', String(newValue));
    }
  };

  const handlePracticeToggle = () => {
    const newValue = !isPracticeEnabled;
    setIsPracticeEnabled(newValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem('practice_enabled', String(newValue));
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsDropdownOpen(false);
    router.push('/login');
  };

  const handleAvatarClick = () => {
    // Nếu đã đăng nhập thì mở dropdown
    if (user) {
      setIsDropdownOpen(!isDropdownOpen);
    } else {
      // Nếu chưa đăng nhập thì redirect đến trang login
      router.push('/login');
    }
  };

  // Calculate remaining days
  const calculateRemainingDays = (): number | null => {
    if (!user?.faQuizInfo?.expireTime) return null;
    const expireTime = user.faQuizInfo.expireTime * 1000; // Convert to milliseconds if it's unix timestamp
    const now = Date.now();
    const diffTime = expireTime - now;
    if (diffTime <= 0) return 0;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const remainingDays = calculateRemainingDays();

  return (
    <header className={`flex items-center px-4 md:px-8 fixed top-0 left-0 right-0 z-50 bg-white dark:bg-black transition-all duration-300 ${isPanelOpen ? 'h-0 overflow-hidden' : 'h-20'}`}>
      {/* Desktop Layout */}
      {/* Cột 1: Logo - Desktop */}
      <div className="hidden lg:flex items-center w-1/3">
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

      {/* Cột 2: Đồng hồ đếm ngược (hiển thị khi timer enabled và đã có câu hỏi) - Desktop */}
      <div className="hidden lg:flex w-1/3 items-center justify-center">
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

      {/* Cột 3: Nút Nâng Cấp/PRO và Avatar - Desktop */}
      <div className="hidden lg:flex items-center justify-end space-x-8 w-1/3">
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
            className="cursor-pointer transition-opacity bg-white dark:bg-gray-800 rounded-full flex items-center border-2 border-gray-100 dark:border-gray-700"
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
            <div
              className="absolute right-0 top-full mt-2 p-2 w-56 z-50 border-2 border-gray-100 dark:border-gray-800 rounded-2xl bg-white dark:bg-black shadow-lg"
            >
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
                    onClick={handleTimerToggle}
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
                    onClick={handlePracticeToggle}
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

      {/* Tablet/Mobile Layout */}
      <div className="flex lg:hidden items-center justify-between w-full">
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
            className="cursor-pointer transition-opacity bg-white dark:bg-gray-800 rounded-full flex items-center border-2 border-gray-100 dark:border-gray-700"
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
            <div
              className="absolute right-0 top-full mt-2 p-2 w-56 z-50 border-2 border-gray-100 dark:border-gray-800 rounded-2xl bg-white dark:bg-black shadow-lg"
            >
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
                    onClick={handleTimerToggle}
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
                    onClick={handlePracticeToggle}
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

export default QuizHeader;
