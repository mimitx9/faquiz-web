'use client';

import React, { useRef, useState, useEffect } from 'react';

interface HorizontalScrollProps {
  children: React.ReactNode;
  title?: string;
  gridMode?: boolean; // Grid layout mode (4 cols desktop, 3 cols tablet)
}

const HorizontalScroll: React.FC<HorizontalScrollProps> = ({ children, title, gridMode = false }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [hasDragged, setHasDragged] = useState(false);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Drag to scroll functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current || !gridMode) return;
    setIsDragging(true);
    setHasDragged(false);
    const rect = scrollRef.current.getBoundingClientRect();
    setStartX(e.clientX - rect.left);
    setScrollLeft(scrollRef.current.scrollLeft);
    scrollRef.current.style.cursor = 'grabbing';
    scrollRef.current.style.userSelect = 'none';
  };

  const handleMouseLeave = () => {
    if (!scrollRef.current) return;
    setIsDragging(false);
    setHasDragged(false);
    if (gridMode) {
      scrollRef.current.style.cursor = 'grab';
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    // Prevent click on children if we were dragging
    if (hasDragged && gridMode) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsDragging(false);
    // Reset hasDragged after a short delay to allow click events
    setTimeout(() => setHasDragged(false), 100);
    if (gridMode) {
      scrollRef.current.style.cursor = 'grab';
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current || !gridMode) return;
    const rect = scrollRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const walk = (x - startX) * 2; // Scroll speed multiplier
    const newScrollLeft = scrollLeft - walk;
    
    // Only consider it dragging if we've moved more than 5 pixels
    if (Math.abs(walk) > 5) {
      setHasDragged(true);
      e.preventDefault();
      scrollRef.current.scrollLeft = newScrollLeft;
    }
  };

  useEffect(() => {
    if (scrollRef.current && gridMode) {
      scrollRef.current.style.cursor = 'grab';
    }
  }, [gridMode]);

  return (
    <div className="mb-8">
      {title && (
        <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
      )}
      <div className="relative">
        {!gridMode && (
          <>
            {/* Left scroll button - positioned at vertical center */}
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full hover:bg-gray-100 transition-colors bg-white"
              aria-label="Scroll left"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            
            {/* Right scroll button - positioned at vertical center */}
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full hover:bg-gray-100 transition-colors bg-white"
              aria-label="Scroll right"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )}
        
        {/* Scroll container - grid mode or flex mode */}
        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          className={gridMode 
            ? "flex gap-6 overflow-x-auto scrollbar-hide pb-2 grid-scroll-container" 
            : "flex gap-6 overflow-x-auto scrollbar-hide pb-2 px-12"}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            ...(gridMode ? {} : {})
          }}
        >
          {gridMode && (
            <>
              {React.Children.map(children, (child) => {
                if (React.isValidElement(child)) {
                  // Get current className and remove w-full if present
                  const currentClassName = child.props?.className || '';
                  const classNameWithoutWFull = currentClassName.replace(/\bw-full\b/g, '').trim();
                  return React.cloneElement(child as React.ReactElement<any>, {
                    className: `${classNameWithoutWFull} grid-card-item`.trim(),
                    style: {
                      ...(child.props?.style || {}),
                      pointerEvents: hasDragged ? 'none' : 'auto',
                    },
                  });
                }
                return child;
              })}
            </>
          )}
          {!gridMode && children}
        </div>
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
          div.grid-scroll-container {
            display: flex;
            overflow-x: auto;
            scroll-behavior: smooth;
          }
          div.grid-scroll-container > *,
          div.grid-scroll-container > .grid-card-item {
            flex: 0 0 auto;
            flex-shrink: 0;
          }
          /* Mobile: Show 2 cards initially */
          @media (max-width: 639px) {
            div.grid-scroll-container {
              width: 100%;
            }
            div.grid-scroll-container > *,
            div.grid-scroll-container > .grid-card-item {
              width: calc((100% - 1.5rem) / 2) !important;
              min-width: calc((100% - 1.5rem) / 2) !important;
              max-width: calc((100% - 1.5rem) / 2) !important;
            }
          }
          /* Tablet: Show 3 cards initially */
          @media (min-width: 640px) and (max-width: 1023px) {
            div.grid-scroll-container {
              width: 100%;
            }
            div.grid-scroll-container > *,
            div.grid-scroll-container > .grid-card-item {
              width: calc((100% - 3rem) / 3) !important;
              min-width: calc((100% - 3rem) / 3) !important;
              max-width: calc((100% - 3rem) / 3) !important;
            }
          }
          /* Desktop: Show 4 cards initially with fixed width, then scroll */
          @media (min-width: 1024px) {
            div.grid-scroll-container {
              width: calc(280px * 4 + 1.5rem * 3);
              max-width: 100%;
            }
            div.grid-scroll-container > *,
            div.grid-scroll-container > .grid-card-item {
              width: 280px !important;
              min-width: 280px !important;
              max-width: 280px !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default HorizontalScroll;
