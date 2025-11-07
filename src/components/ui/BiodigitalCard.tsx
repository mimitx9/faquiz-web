'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { BiodigitalCategory } from '@/lib/api';
import { getRandomGradientColor, hexToRgba } from '@/lib/utils';

interface BiodigitalCardProps {
  category: BiodigitalCategory;
  onClick?: () => void;
}

const BiodigitalCard: React.FC<BiodigitalCardProps> = ({ category, onClick }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const hasImage = category.image && category.image.trim() !== '';
  const gradientColor = getRandomGradientColor(category.title);

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const gradientColorWithOpacity = hexToRgba(gradientColor, 0.25);

  return (
    <div
      onClick={onClick}
      className="rounded-3xl w-full min-w-[200px] aspect-[200/280] cursor-pointer hover:scale-105 transition-all overflow-hidden relative"
      style={{
        background: hasImage && !imageError
          ? undefined
          : `linear-gradient(to bottom, transparent, ${gradientColorWithOpacity})`,
      }}
    >
      {/* Image */}
      {hasImage && !imageError && (
        <div className="relative w-full h-full">
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
          )}
          <Image
            src={category.image}
            alt={category.title || ''}
            fill
            className={`object-cover ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
            onError={handleImageError}
            onLoadingComplete={handleImageLoad}
            referrerPolicy="no-referrer"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            quality={90}
            loading="lazy"
          />
        </div>
      )}

      {/* Gradient background với title khi không có image hoặc image lỗi */}
      {(!hasImage || imageError) && (
        <div className="w-full h-full flex items-end justify-center p-10">
          <h2 className="text-white text-4xl font-semibold text-left"
          style={{
            color: gradientColor,
          }}
          >
            {category.title}
          </h2>
        </div>
      )}

      {/* Overlay gradient ở dưới cùng để text dễ đọc hơn */}
      {hasImage && !imageError && (
        <div 
          className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/60 to-transparent"
        />
      )}

      {/* Title overlay khi có image */}
      {hasImage && !imageError && (
        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
          <h3 className="text-white text-xl font-semibold text-center leading-tight drop-shadow-lg">
            {category.title}
          </h3>
        </div>
      )}
    </div>
  );
};

export default BiodigitalCard;

