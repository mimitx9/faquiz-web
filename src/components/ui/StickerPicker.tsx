'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface StickerCategory {
  id: string;
  name: string;
  stickers: string[]; // Array of sticker filenames
}

interface StickerPickerProps {
  onSelectSticker: (stickerId: string) => void;
  onSelectEmoji?: (emoji: string) => void;
  emojiList?: string[];
  onClose: () => void;
  className?: string;
  position?: { top?: number; bottom?: number; left?: number; right?: number };
  style?: React.CSSProperties;
}

// Helper function để parse sticker ID thành path
// stickerId format: "category/filename" (ví dụ: "bts/10.thumb128.webp")
// Backend trả về: "icon": "bts/7.thumb128.webp"
export function getStickerUrl(stickerId: string | null | undefined): string {
  if (!stickerId) {
    return '';
  }
  // Nếu đã có /stickers/ ở đầu thì giữ nguyên, nếu không thì thêm vào
  if (stickerId.startsWith('/stickers/')) {
    return stickerId;
  }
  // Nếu không có / ở đầu thì thêm /stickers/
  return `/stickers/${stickerId}`;
}

export default function StickerPicker({ onSelectSticker, onSelectEmoji, emojiList = [], onClose, className, position, style }: StickerPickerProps) {
  const [categories, setCategories] = useState<StickerCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const pickerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const menuButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isScrollingRef = useRef(false);

  // Load danh sách stickers từ public/stickers/
  useEffect(() => {
    const loadStickers = async () => {
      try {
        setIsLoading(true);
        
        // Danh sách categories (có thể hardcode hoặc fetch từ API)
        // Dựa vào folder structure: bts, cat, wechat, wonyoung, xuka
        const categoryFolders = ['bts', 'cat', 'wechat', 'wonyoung', 'xuka'];
        const categoryNames: Record<string, string> = {
          bts: 'BTS',
          cat: 'Mèo',
          wechat: 'WeChat',
          wonyoung: 'Wonyoung',
          xuka: 'Xuka',
        };

        const loadedCategories: StickerCategory[] = [];

        // Load stickers từ mỗi category
        for (const categoryId of categoryFolders) {
          try {
            const stickers: string[] = [];
            
            loadedCategories.push({
              id: categoryId,
              name: categoryNames[categoryId] || categoryId,
              stickers: stickers,
            });
          } catch (error) {
            console.error(`Error loading category ${categoryId}:`, error);
          }
        }

        // Hardcode stickers cho mỗi category
        if (loadedCategories.length > 0 && loadedCategories[0].stickers.length === 0) {
          loadedCategories[0] = {
            id: 'bts',
            name: 'BTS',
            stickers: Array.from({ length: 20 }, (_, i) => `${i + 5}.thumb128.webp`),
          };
          loadedCategories[1] = {
            id: 'cat',
            name: 'Mèo',
            stickers: Array.from({ length: 24 }, (_, i) => `${i}-1.thumb128.webp`),
          };
          loadedCategories[2] = {
            id: 'wechat',
            name: 'WeChat',
            stickers: Array.from({ length: 20 }, (_, i) => `${i + 5}.thumb128.webp`),
          };
          loadedCategories[3] = {
            id: 'wonyoung',
            name: 'Wonyoung',
            stickers: Array.from({ length: 34 }, (_, i) => `${i + 1}.thumb128.webp`),
          };
          loadedCategories[4] = {
            id: 'xuka',
            name: 'Xuka',
            stickers: Array.from({ length: 23 }, (_, i) => `${i + 1}.thumb128.webp`),
          };
        }

        setCategories(loadedCategories);
        // Set active category đầu tiên
        if (loadedCategories.length > 0) {
          setActiveCategory(loadedCategories[0].id);
        } else if (emojiList.length > 0) {
          setActiveCategory('emoji');
        }
      } catch (error) {
        console.error('Error loading stickers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStickers();
  }, []);

  // Detect active section khi scroll
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      if (isScrollingRef.current) return;

      const scrollTop = scrollContainer.scrollTop;
      const viewportHeight = scrollContainer.clientHeight;
      const threshold = 100; // Offset từ top của viewport

      // Tìm section nào đang hiển thị trong viewport
      let activeId = '';
      let bestMatchId: string | null = null;
      let bestMatchDistance = Infinity;

      Object.entries(sectionRefs.current).forEach(([id, element]) => {
        if (!element) return;
        
        const rect = element.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();
        const sectionTop = rect.top - containerRect.top + scrollContainer.scrollTop;
        const sectionBottom = sectionTop + rect.height;

        // Kiểm tra nếu section đang trong viewport
        const isVisible = sectionTop < scrollTop + viewportHeight && sectionBottom > scrollTop;
        
        if (isVisible) {
          // Tính khoảng cách từ top của viewport đến top của section
          const distance = Math.abs(sectionTop - (scrollTop + threshold));
          
          if (distance < bestMatchDistance) {
            bestMatchDistance = distance;
            bestMatchId = id;
          }
        }
      });

      // Nếu có section visible, dùng nó; nếu không, tìm section gần nhất
      if (bestMatchId !== null) {
        activeId = bestMatchId;
      } else {
        // Tìm section gần nhất với top của viewport
        let minDistance = Infinity;
        Object.entries(sectionRefs.current).forEach(([id, element]) => {
          if (!element) return;
          
          const rect = element.getBoundingClientRect();
          const containerRect = scrollContainer.getBoundingClientRect();
          const sectionTop = rect.top - containerRect.top + scrollContainer.scrollTop;
          const distance = Math.abs(sectionTop - scrollTop);

          if (distance < minDistance) {
            minDistance = distance;
            activeId = id;
          }
        });
      }

      if (activeId && activeId !== activeCategory) {
        setActiveCategory(activeId);
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    // Check initial position
    handleScroll();

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [categories, emojiList.length, activeCategory]);

  const handleStickerClick = (categoryId: string, filename: string) => {
    const stickerId = `${categoryId}/${filename}`;
    onSelectSticker(stickerId);
    onClose();
  };

  const handleEmojiClick = (emoji: string) => {
    if (onSelectEmoji) {
      onSelectEmoji(emoji);
      onClose();
    }
  };

  // Tự động scroll menu để hiển thị active button
  useEffect(() => {
    if (activeCategory && menuContainerRef.current && menuButtonRefs.current[activeCategory]) {
      const menuContainer = menuContainerRef.current;
      const activeButton = menuButtonRefs.current[activeCategory];
      
      if (activeButton) {
        // Sử dụng scrollIntoView để tự động scroll button vào view
        // inline: 'nearest' chỉ scroll khi button không trong view
        activeButton.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      }
    }
  }, [activeCategory]);

  const handleMenuClick = (categoryId: string) => {
    const sectionElement = sectionRefs.current[categoryId];
    if (sectionElement && scrollContainerRef.current) {
      isScrollingRef.current = true;
      setActiveCategory(categoryId);
      
      const containerRect = scrollContainerRef.current.getBoundingClientRect();
      const sectionRect = sectionElement.getBoundingClientRect();
      const scrollTop = scrollContainerRef.current.scrollTop;
      const sectionTop = sectionRect.top - containerRect.top + scrollTop;

      scrollContainerRef.current.scrollTo({
        top: sectionTop - 8, // Offset nhỏ để không sát mép
        behavior: 'smooth'
      });

      // Reset flag sau khi scroll xong
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 500);
    }
  };

  // Tính toán position style
  const positionStyle = position 
    ? {
        position: 'fixed' as const,
        ...(position.top !== undefined && { top: `${position.top}px` }),
        ...(position.bottom !== undefined && { bottom: `${position.bottom}px` }),
        ...(position.left !== undefined && { left: `${position.left}px` }),
        ...(position.right !== undefined && { right: `${position.right}px` }),
      }
    : {
        position: 'absolute' as const,
        bottom: '100%',
        left: '1rem',
        right: '1rem',
        marginBottom: '0.5rem',
      };

  if (isLoading) {
    return (
      <div className="relative z-[100]">
        <div
          ref={pickerRef}
          className={cn(
            'p-4',
            'bg-white dark:bg-gray-900',
            'dark:border-2 dark:border-gray-800',
            'rounded-2xl',
            'h-[480px] w-[340px] overflow-hidden flex items-center justify-center',
            className
          )}
          style={{ 
            ...positionStyle,
            ...style,
          }}
        >
          <div className="text-sm text-gray-500 dark:text-gray-400">Đang tải stickers...</div>
        </div>
      </div>
    );
  }

  const allItems = [
    ...categories.map(cat => ({ type: 'category' as const, id: cat.id, name: cat.name, data: cat })),
    ...(emojiList.length > 0 ? [{ type: 'emoji' as const, id: 'emoji', name: 'Emoji', data: emojiList }] : [])
  ];

  return (
    <div className="relative z-[100]">
      <div
        ref={pickerRef}
        className={cn(
          'bg-white dark:bg-gray-900',
          'dark:border-2 dark:border-gray-800',
          'rounded-2xl shadow-xl',
          'h-[480px] w-[340px] flex flex-col overflow-hidden',
          'relative',
          className
        )}
        style={{ 
          ...positionStyle,
          ...style,
        }}
      >
        {/* Phần 1: Menu sticker */}
        <div 
          ref={menuContainerRef}
          className="flex gap-1 p-2 overflow-x-auto shrink-0 hide-scrollbar"
        >
          {allItems.map((item) => (
            <button
              key={item.id}
              ref={(el) => {
                menuButtonRefs.current[item.id] = el;
              }}
              onClick={() => handleMenuClick(item.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                activeCategory === item.id
                  ? 'bg-[#8D7EF7]/20 text-[#8D7EF7]'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-[#8D7EF7]/20 hover:text-[#8D7EF7]'
              )}
            >
              {item.name}
            </button>
          ))}
        </div>

        {/* Phần 2: Danh sách sticker - scrollable với scrollbar ẩn */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-2 hide-scrollbar"
        >
          
          {allItems.map((item) => (
            <div
              key={item.id}
              ref={(el) => {
                sectionRefs.current[item.id] = el;
              }}
              className="mb-6 last:mb-0"
            >
              {item.type === 'emoji' ? (
                item.data.length > 0 ? (
                  <div className="grid grid-cols-8 gap-1">
                    {(item.data as string[]).map((emoji, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleEmojiClick(emoji)}
                        className="text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-0.5 transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                    Không có emoji nào
                  </div>
                )
              ) : (
                (item.data as StickerCategory).stickers.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {(item.data as StickerCategory).stickers.map((filename, index) => {
                      const stickerId = `${item.id}/${filename}`;
                      const stickerUrl = getStickerUrl(stickerId);
                      
                      return (
                        <button
                          key={`${item.id}-${filename}-${index}`}
                          onClick={() => handleStickerClick(item.id, filename)}
                          className={cn(
                            'aspect-square overflow-hidden',
                            'hover:scale-[1.2]',
                            'transition-all duration-200 p-1',
                            'flex items-center justify-center'
                          )}
                        >
                          <Image
                            src={stickerUrl}
                            alt={filename}
                            width={64}
                            height={64}
                            className="w-full h-full object-contain"
                            unoptimized // Vì là animated webp
                          />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                    Không có sticker nào
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
