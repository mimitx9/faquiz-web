'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { SubCategoriesSlide } from '@/types';
import { useAuth } from '@/hooks/useAuth';

interface SubCategoryListItemProps {
  subCategory: SubCategoriesSlide;
  backgroundColor?: string;
  onClick?: () => void;
}

const SubCategoryListItem: React.FC<SubCategoryListItemProps> = ({
  subCategory,
  backgroundColor,
  onClick,
}) => {
  const router = useRouter();
  const { user, isInitialized } = useAuth();
  
  // Parse thông tin từ title hoặc label
  // Format có thể là: "2025 - Tổng quan về ngành RHM" hoặc tương tự
  const titleParts = subCategory.title.split(' - ');
  // Chỉ lấy year nếu nó là số 4 chữ số (ví dụ: 2025)
  const potentialYear = titleParts.length > 1 ? titleParts[0].trim() : null;
  const year = potentialYear && /^\d{4}$/.test(potentialYear) ? potentialYear : null;
  const title = year ? titleParts.slice(1).join(' - ') : subCategory.title;

  // Parse số câu hỏi từ label
  const questionCount = subCategory.label?.find((l) => l.includes('câu')) || null;
  
  // Kiểm tra xem có phải PRO không từ isPayment
  const isPro = subCategory.isPayment === true;

  const handleClick = () => {
    // Nếu là đề PRO và chưa đăng nhập thì redirect đến trang login
    if (isPro && isInitialized && !user) {
      router.push('/login');
      return;
    }
    // Nếu không phải PRO hoặc đã đăng nhập thì gọi onClick callback
    onClick?.();
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-2xl p-6 cursor-pointer transition-all mb-4 border-2 border-gray-100 transition-all duration-200 hover:scale-105"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {/* {year && (
            <span className="text-sm font-semibold text-gray-700 mb-1 block">{year}</span>
          )} */}
          <h3 className="text-lg font-medium text-gray-900 line-clamp-2">
            {title}
          </h3>
          {/* {questionCount && (
            <p className="text-sm text-gray-500">{questionCount}</p>
          )} */}
        </div>
        {subCategory.isPayment !== undefined && (
          <>
            {isPro ? (
              <button
                className="rounded-full px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-80 flex-shrink-0"
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
              <button
                className="rounded-full px-3 py-1 text-xs font-semibold flex-shrink-0"
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
          </>
        )}
      </div>
    </div>
  );
};

export default SubCategoryListItem;

