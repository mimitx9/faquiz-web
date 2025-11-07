'use client';

import React from 'react';
import { useTheme } from '@/hooks/useTheme';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none"
      style={{
        backgroundColor: isDark ? '#000000' : '#E5E7EB',
      }}
      aria-label={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
    >
      {/* Circular Switch */}
      <span
        className={`inline-block h-4 w-4 transform rounded-full transition-transform duration-300 shadow-sm ${
          isDark ? 'translate-x-1' : 'translate-x-6'
        }`}
        style={{
          background: isDark
            ? 'linear-gradient(135deg, #ffffff 0%, #e5e7eb 100%)'
            : 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
        }}
      />
    </button>
  );
};

export default ThemeToggle;

