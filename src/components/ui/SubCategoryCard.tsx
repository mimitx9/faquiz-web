'use client';

import React from 'react';
import { SubCategoriesSlide } from '@/types';

interface SubCategoryCardProps {
  subCategory: SubCategoriesSlide & { backgroundColor?: string };
  onClick?: () => void;
}

const SubCategoryCard: React.FC<SubCategoryCardProps> = ({ subCategory, onClick }) => {
  // Lấy màu từ backgroundColor của category, nếu không có thì dùng màu mặc định
  const bulletColor = subCategory.backgroundColor || '#3B82F6';
  
  // Kiểm tra isPayment - chỉ hiển thị PRO khi isPayment là true
  const isPayment = subCategory.isPayment === true;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm p-4 w-[200px] h-[280px] cursor-pointer hover:shadow-md transition-shadow flex flex-col flex-shrink-0"
    >
      {/* Top line với bullet và title */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: bulletColor }}
        />
        <h3 
          className="line-clamp-2 flex-1"
          style={{ color: bulletColor }}
        >
          {subCategory.title}
        </h3>
      </div>
      
      {/* Badge Free hoặc PRO */}
      {subCategory.isPayment !== undefined && (
        <div className="mb-2">
          {isPayment ? (
            // PRO badge - giống nút "Nâng Cấp"
            <button
              className="rounded-full px-3 py-1 text-xs font-medium transition-opacity hover:opacity-80"
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
              className="rounded-full px-3 py-1 text-xs font-medium"
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
      <p className="text-sm text-black font-bold mt-auto">
        {subCategory.categoryTitle}
      </p>
    </div>
  );
};

export default SubCategoryCard;
