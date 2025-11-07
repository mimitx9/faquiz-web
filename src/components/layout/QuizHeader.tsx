'use client';

import React, { useState, useEffect, useRef } from 'react';
import DesktopHeader from './DesktopHeader';
import MobileHeader from './MobileHeader';

interface QuizHeaderProps {
  totalQuestions?: number; // Số lượng câu hỏi để tính thời gian
  onTimerExpired?: () => void; // Callback khi hết giờ
  isPanelOpen?: boolean; // Panel có đang mở không
}

const QuizHeader: React.FC<QuizHeaderProps> = ({ totalQuestions, onTimerExpired, isPanelOpen = false }) => {
  const [isTimerEnabled, setIsTimerEnabled] = useState(false);
  const [isPracticeEnabled, setIsPracticeEnabled] = useState(false); // Ôn thi on/off
  const [remainingTime, setRemainingTime] = useState<number>(0); // Thời gian còn lại (giây)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const onTimerExpiredRef = useRef(onTimerExpired); // Lưu callback mới nhất

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

  return (
    <>
      <DesktopHeader
        totalQuestions={totalQuestions}
        onTimerExpired={onTimerExpired}
        isPanelOpen={isPanelOpen}
        isTimerEnabled={isTimerEnabled}
        isPracticeEnabled={isPracticeEnabled}
        onTimerToggle={handleTimerToggle}
        onPracticeToggle={handlePracticeToggle}
        remainingTime={remainingTime}
        formatTime={formatTime}
      />
      <MobileHeader
        isPanelOpen={isPanelOpen}
        isTimerEnabled={isTimerEnabled}
        isPracticeEnabled={isPracticeEnabled}
        onTimerToggle={handleTimerToggle}
        onPracticeToggle={handlePracticeToggle}
      />
    </>
  );
};

export default QuizHeader;
