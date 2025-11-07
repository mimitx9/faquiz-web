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
  titleGradient?: string;
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const goToSlide = (index: number) => {
    if (index === currentIndex || isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const goToPrevious = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? banners.length - 1 : prevIndex - 1
    );
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const goToNext = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prevIndex) =>
      prevIndex === banners.length - 1 ? 0 : prevIndex + 1
    );
    setTimeout(() => setIsTransitioning(false), 500);
  }, [banners.length, isTransitioning]);

  useEffect(() => {
    if (autoPlay && banners.length > 1 && !isTransitioning) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) =>
          prevIndex === banners.length - 1 ? 0 : prevIndex + 1
        );
      }, autoPlayInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoPlay, autoPlayInterval, banners.length, isTransitioning]);

  if (banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  return (
    <div className="relative mb-8">
      {/* Banner Container */}
      <div className="relative overflow-hidden rounded-3xl">
        <div
          className="flex items-center justify-between px-16 py-16 rounded-3xl h-full transition-all duration-500 ease-in-out"
          style={{
            backgroundColor: currentBanner.backgroundColor || '#04002A',
            transform: isTransitioning ? 'translateX(-10px)' : 'translateX(0)',
            opacity: isTransitioning ? 0.9 : 1,
          }}
        >
          {/* Logo bên trái - Tạm thời ẩn */}
          {/* {currentBanner.logo && (
            <div className="flex-shrink-0 mr-8">
              <Image
                src={currentBanner.logo}
                alt={currentBanner.title}
                width={160}
                height={160}
                className="object-contain"
              />
            </div>
          )} */}

          {/* Text ở giữa */}
          <div className="flex flex-col justify-center flex-grow">
            <h3
              className="text-4xl font-bold mb-4"
              style={{
                background: currentBanner.titleGradient || 'linear-gradient(90deg,rgb(221, 0, 255) 0%,rgb(255, 170, 0) 30%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {currentBanner.title}
            </h3>
            {currentBanner.description && (
              <p className="text-lg text-white font-medium">
                {currentBanner.description}
              </p>
            )}
          </div>

          {/* Button bên phải */}
          {currentBanner.buttonText && (
            <button
              onClick={() => {
                if (currentBanner.buttonLink) {
                  if (currentBanner.buttonLink.startsWith('http')) {
                    window.open(currentBanner.buttonLink, '_blank');
                  } else {
                    window.location.href = currentBanner.buttonLink;
                  }
                }
              }}
              className="py-6 px-10 rounded-full text-white text-xl font-bold tracking-wide transition bg-gradient-to-b from-[#FFD700] to-[#FF8C00] shadow-xl shadow-[#FFBA08]/20 hover:shadow-[#FFBA08]/30"
            >
              {currentBanner.buttonText}
            </button>
          )}

          {/* Navigation Dots - Inside banner, centered at bottom */}
          {banners.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex justify-center gap-2">
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex
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
    </div>
  );
};

export default BannerSlide;

