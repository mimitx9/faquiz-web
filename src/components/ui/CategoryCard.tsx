'use client';

import React, { useState } from 'react';
import { CategoriesSlide } from '@/types';

interface CategoryCardProps {
  category: CategoriesSlide;
  onClick?: () => void;
  isSelected?: boolean;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, onClick, isSelected }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const imageUrl = category.iconUrl || category.icon;

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('Failed to load image:', imageUrl);
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  // Tính toán opacity:
  // - Nếu isSelected là undefined: opacity 100% (bình thường, không có category nào được chọn)
  // - Nếu isSelected là true: opacity 100% (card được chọn)
  // - Nếu isSelected là false: opacity 50% (card chưa chọn trong split-screen)
  const opacity = isSelected === undefined ? 1 : (isSelected ? 1 : 0.5);

  return (
    <div
      onClick={onClick}
      className={`rounded-lg shadow-sm w-full min-w-[200px] aspect-[200/280] cursor-pointer hover:shadow-md transition-all overflow-hidden ${
        isSelected ? 'ring-2 ring-offset-2' : ''
      }`}
      style={{
        backgroundColor: category.backgroundColor,
        opacity: opacity,
      }}
    >
      {/* Image */}
      {imageUrl && !imageError && (
        <div className="relative w-full h-full">
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
          )}
          <img
            src={imageUrl}
            alt={category.title || ''}
            className={`w-full h-full object-cover ${imageLoading ? 'hidden' : ''}`}
            onError={handleImageError}
            onLoad={handleImageLoad}
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {imageError && (
        <div className="w-full h-full flex items-center justify-center bg-white/20">
          <svg
            className="w-12 h-12 text-white/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}
    </div>
  );
};

export default CategoryCard;
