'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';

interface BannerItem {
  id: string;
  logo?: string;
  title: string;
  description?: string;
  buttonText?: string;
  buttonLink?: string;
  backgroundColor?: string;
  titleColor?: string;
  descriptionColor?: string;
}

interface BannerSlideProps {
  banners: BannerItem[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

const BannerSlide: React.FC<BannerSlideProps> = ({
  banners,
  autoPlay = true,
  autoPlayInterval = 5000,
}) => {
  // Tạo extended banners: [last, ...banners, first] để tạo infinity loop
  const extendedBanners = banners.length > 1 
    ? [banners[banners.length - 1], ...banners, banners[0]]
    : banners;
  
  // Bắt đầu từ slide đầu tiên của banners gốc (index 1 trong extendedBanners)
  const [currentIndex, setCurrentIndex] = useState(banners.length > 1 ? 1 : 0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lấy index thực tế để hiển thị dots (0 đến banners.length - 1)
  const getRealIndex = (index: number) => {
    if (banners.length <= 1) return 0;
    if (index === 0) return banners.length - 1;
    if (index === extendedBanners.length - 1) return 0;
    return index - 1;
  };

  const realIndex = getRealIndex(currentIndex);

  const goToSlide = (targetRealIndex: number) => {
    if (targetRealIndex === realIndex) return;
    // Chuyển đổi real index sang extended index
    const targetExtendedIndex = targetRealIndex + 1;
    setIsTransitioning(true);
    setCurrentIndex(targetExtendedIndex);
    setTimeout(() => setIsTransitioning(false), 1000);
  };

  const goToNext = useCallback(() => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setCurrentIndex((prevIndex) => {
      const nextIndex = prevIndex + 1;
      // Nếu vượt quá slide clone cuối, quay về index 1 ngay (không animation)
      if (nextIndex >= extendedBanners.length) {
        if (containerRef.current) {
          containerRef.current.style.transition = 'none';
        }
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.style.transition = '';
          }
          setIsTransitioning(false);
        }, 50);
        return 1;
      }
      // Nếu đến slide clone cuối, không set isTransitioning = false ở đây, để useEffect xử lý
      if (nextIndex === extendedBanners.length - 1) {
        return nextIndex;
      }
      // Tiếp tục swipe bình thường
      setTimeout(() => setIsTransitioning(false), 1000);
      return nextIndex;
    });
  }, [extendedBanners.length, isTransitioning]);

  // Watch currentIndex để jump về đúng vị trí khi đến slide clone cuối
  useEffect(() => {
    if (currentIndex === extendedBanners.length - 1 && isTransitioning) {
      // Đã đến slide clone cuối, sau khi animation xong sẽ jump về index 1
      const timer = setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.style.transition = 'none';
          setCurrentIndex(1);
          setTimeout(() => {
            if (containerRef.current) {
              containerRef.current.style.transition = '';
            }
            setIsTransitioning(false);
          }, 50);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, extendedBanners.length, isTransitioning]);

  useEffect(() => {
    if (autoPlay && banners.length > 1) {
      intervalRef.current = setInterval(() => {
        goToNext();
      }, autoPlayInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoPlay, autoPlayInterval, banners.length, goToNext]);

  if (banners.length === 0) {
    return null;
  }

  const slideGap = 16; // Khoảng cách giữa các slide (16px = 1rem)
  const slideHeight = 200; // Chiều cao cố định của mỗi slide

  return (
    <div className="relative mb-8">
      {/* Banner Container */}
      <div 
        className="relative overflow-hidden rounded-3xl" 
        style={{ height: `${slideHeight}px` }}
      >
        <div
          ref={containerRef}
          className="flex flex-col transition-transform duration-1000 ease-out"
          style={{
            transform: `translateY(calc(-${currentIndex} * (${slideHeight}px + ${slideGap}px)))`,
          }}
        >
          {extendedBanners.map((banner, index) => (
            <div
              key={`${banner.id}-${index}`}
              className="flex-shrink-0 flex items-center justify-between p-16 rounded-3xl cursor-pointer"
              style={{
                width: '100%',
                height: `${slideHeight}px`,
                marginBottom: index < extendedBanners.length - 1 ? `${slideGap}px` : '0',
                backgroundColor: banner.backgroundColor || '#04002A',
              }}
              onClick={() => {
                if (banner.buttonLink) {
                  if (banner.buttonLink.startsWith('http')) {
                    window.open(banner.buttonLink, '_blank');
                  } else {
                    window.location.href = banner.buttonLink;
                  }
                }
              }}
            >
              {/* Logo bên trái */}
              {banner.logo && (
                <div className="flex-shrink-0 mr-16">
                  <Image
                    src={banner.logo}
                    alt={banner.title}
                    width={100}
                    height={100}
                    className="object-contain w-full h-full rounded-full"
                  />
                </div>
              )}

              {/* Text ở giữa */}
              <div className="flex flex-col justify-center flex-grow">
                <h3
                  className="text-4xl font-bold mb-4"
                  style={{
                    color: banner.titleColor || '#FFFFFF',
                  }}
                >
                  {banner.title}
                </h3>
                {banner.description && (
                  <p
                    className="text-lg font-medium"
                    style={{
                      color: banner.descriptionColor || '#FFFFFF',
                    }}
                  >
                    {banner.description}
                  </p>
                )}
              </div>

              {/* Button bên phải */}
              {banner.buttonText && (
                <div
                  className="py-6 px-10 rounded-full text-white text-xl font-bold tracking-wide transition bg-gradient-to-b from-[#FFD700] to-[#FF8C00] shadow-xl shadow-[#FFBA08]/20 hover:shadow-[#FFBA08]/30 pointer-events-none"
                >
                  {banner.buttonText}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Navigation Dots - Inside banner, centered at bottom */}
        {banners.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex justify-center gap-2">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === realIndex
                    ? 'bg-white w-4'
                    : 'bg-white/30 hover:bg-white/50'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BannerSlide;

