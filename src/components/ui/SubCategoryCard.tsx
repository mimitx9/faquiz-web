'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SubCategoriesSlide } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';

interface SubCategoryCardProps {
  subCategory: SubCategoriesSlide & { backgroundColor?: string };
  onClick?: () => void;
}

const SubCategoryCard: React.FC<SubCategoryCardProps> = ({ subCategory, onClick }) => {
  const router = useRouter();
  const { user, isInitialized } = useAuth();
  const { theme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  
  // Lấy màu từ backgroundColor của category, nếu không có thì dùng màu mặc định
  const bulletColor = subCategory.backgroundColor || '#3B82F6';
  
  // Helper function để chuyển hex color thành rgba với opacity
  const hexToRgba = (hex: string, opacity: number) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return hex;
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };
  
  // Opacity thay đổi theo theme: 0.2 cho dark mode, 0.05 cho light mode
  const borderOpacity = theme === 'dark' ? 0.2 : 0.05;
  const borderColor = hexToRgba(bulletColor, borderOpacity);
  
  // Kiểm tra isPayment - chỉ hiển thị PRO khi isPayment là true
  const isPayment = subCategory.isPayment === true;

  const handleClick = () => {
    // Nếu là đề PRO và chưa đăng nhập thì redirect đến trang login
    if (isPayment && isInitialized && !user) {
      router.push('/login');
      return;
    }
    // Nếu không phải PRO hoặc đã đăng nhập thì gọi onClick callback
    onClick?.();
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="rounded-3xl border-2 p-8 w-full aspect-[200/280] cursor-pointer hover:scale-105 transition-all overflow-hidden flex flex-col relative"
      style={{ 
        borderColor: isHovered ? 'transparent' : borderColor,
        backgroundColor: isHovered ? borderColor : 'transparent'
      }}
    >
      {/* Top line với bullet và title */}
      <div className="flex items-center gap-2 my-4">
        <h3 
          className="line-clamp-2 flex-1 text-lg font-medium"
          style={{ color: bulletColor }}
        >
          {subCategory.categoryTitle}
        </h3>
      </div>
      
      {/* Badge Free hoặc PRO */}
      {subCategory.isPayment !== undefined && (
        <div className="absolute top-4 right-4">
          {isPayment ? (
            // PRO badge - giống nút "Nâng Cấp"
            <button
              className="rounded-full px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-80"
              style={{
                backgroundColor: '#FFBB001A',
                color: '#FFBB00',
                border: 'none'
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              PRO
            </button>
          ) : (
            // Free badge
            <button
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                backgroundColor: 'rgba(141, 126, 247, 0.1)', // #8D7EF7 với opacity 10%
                color: '#8D7EF7',
                border: 'none'
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              Free
            </button>
          )}
        </div>
      )}
      
      {/* Bottom text - số câu hỏi nếu có */}
      {subCategory.label && subCategory.label.length > 0 && (
        <p className="text-xs text-gray-500">
          {subCategory.label.join(', ')}
        </p>
      )}
      
      {/* categoryTitle ở đáy - màu đen bold */}
      <p className="text-2xl text-gray-800 dark:text-white font-semibold mt-auto line-clamp-4">
        {subCategory.title}
      </p>
    </div>
  );
};

export default SubCategoryCard;
