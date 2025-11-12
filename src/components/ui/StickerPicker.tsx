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

export default function StickerPicker({ onSelectSticker, onSelectEmoji, emojiList = [], onClose, className }: StickerPickerProps) {
  const [categories, setCategories] = useState<StickerCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const pickerRef = useRef<HTMLDivElement>(null);

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
            // Fetch danh sách files từ folder (sử dụng Next.js API route hoặc static list)
            // Vì không thể list files trực tiếp từ client, ta sẽ hardcode hoặc dùng API
            // Tạm thời dùng cách đơn giản: hardcode một số stickers phổ biến hoặc fetch từ config
            
            // Option: Tạo API route để list files, hoặc hardcode list
            // Ở đây ta sẽ dùng cách đơn giản: giả sử có config hoặc hardcode
            const stickers: string[] = [];
            
            // Với mỗi category, ta sẽ cần list files
            // Tạm thời để empty array, sẽ populate sau khi có cách list files
            loadedCategories.push({
              id: categoryId,
              name: categoryNames[categoryId] || categoryId,
              stickers: stickers,
            });
          } catch (error) {
            console.error(`Error loading category ${categoryId}:`, error);
          }
        }

        // Nếu không có cách list files tự động, ta sẽ hardcode một số stickers
        // Hoặc tạo API endpoint để list files từ public/stickers/
        // Tạm thời dùng cách đơn giản: hardcode một số stickers
        if (loadedCategories.length > 0 && loadedCategories[0].stickers.length === 0) {
          // Hardcode một số stickers cho mỗi category để demo
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
        // Chọn category đầu tiên hoặc "emoji" nếu có
        if (loadedCategories.length > 0) {
          setSelectedCategory(loadedCategories[0].id);
        } else if (emojiList.length > 0) {
          setSelectedCategory('emoji');
        }
      } catch (error) {
        console.error('Error loading stickers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStickers();
  }, []);

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

  const selectedCategoryData = categories.find((cat) => cat.id === selectedCategory);
  const isEmojiCategory = selectedCategory === 'emoji';

  if (isLoading) {
    return (
      <div className="relative">
        <div
          ref={pickerRef}
          className={cn(
            'absolute bottom-full left-4 right-4 mb-2 p-4',
            'bg-white dark:bg-gray-800',
            'rounded-lg',
            'max-h-64 overflow-hidden flex items-center justify-center',
            className
          )}
          style={{ border: '1px solid #8D7EF740' }}
        >
          <div className="text-sm text-gray-500 dark:text-gray-400">Đang tải stickers...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={pickerRef}
        className={cn(
          'absolute bottom-full left-4 right-4 mb-2',
          'bg-white dark:bg-gray-800',
          'rounded-lg shadow-xl',
          'max-h-64 flex flex-col overflow-hidden',
          className
        )}
        style={{ border: '1px solid #8D7EF740' }}
      >
        {/* Arrow bo tròn ở đỉnh */}
        <div 
          className="absolute -bottom-2 left-8 w-3 h-3 bg-white dark:bg-gray-800 transform rotate-45 rounded-tl-sm"
          style={{ borderRight: '1px solid #8D7EF740', borderBottom: '1px solid #8D7EF740' }}
        />
        {/* Category tabs */}
        <div className="flex gap-1 p-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
                selectedCategory === category.id
                  ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              {category.name}
            </button>
          ))}
          {/* Tab Emoji ở cuối */}
          {emojiList.length > 0 && (
            <button
              onClick={() => setSelectedCategory('emoji')}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
                selectedCategory === 'emoji'
                  ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              Emoji
            </button>
          )}
        </div>

        {/* Stickers grid hoặc Emoji grid */}
        <div className="flex-1 overflow-y-auto p-2">
          {isEmojiCategory ? (
            emojiList.length > 0 ? (
              <div className="grid grid-cols-8 gap-1">
                {emojiList.map((emoji, idx) => (
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
          ) : selectedCategoryData && selectedCategoryData.stickers.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {selectedCategoryData.stickers.map((filename, index) => {
                const stickerId = `${selectedCategory}/${filename}`;
                const stickerUrl = getStickerUrl(stickerId);
                
                return (
                  <button
                    key={`${selectedCategory}-${filename}-${index}`}
                    onClick={() => handleStickerClick(selectedCategory, filename)}
                    className={cn(
                      'aspect-square rounded-lg overflow-hidden',
                      'hover:bg-gray-100 dark:hover:bg-gray-700',
                      'transition-colors p-1',
                      'flex items-center justify-center'
                    )}
                    title={filename}
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
          )}
        </div>
      </div>
    </div>
  );
}

