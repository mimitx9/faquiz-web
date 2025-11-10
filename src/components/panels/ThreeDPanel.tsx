'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import BiodigitalCard from '@/components/ui/BiodigitalCard';
import { biodigitalApiService, BiodigitalCategory } from '@/lib/api';
import { normalizeSearchKeyword, matchesCategoryTitle } from '@/lib/utils';

interface ThreeDPanelProps {
  onClose: () => void;
}

type ViewMode = 'list' | 'detail';

const ThreeDPanel: React.FC<ThreeDPanelProps> = ({ onClose }) => {
  const router = useRouter();
  const [categories, setCategories] = useState<BiodigitalCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedCategory, setSelectedCategory] = useState<BiodigitalCategory | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gridCols, setGridCols] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await biodigitalApiService.getAllCategories();
        if (response.data) {
          setCategories(response.data || []);
        }
      } catch (err: any) {
        // Tự động chuyển đến trang đăng nhập khi gặp lỗi 401
        if (err.response?.status === 401) {
          router.replace('/login');
          return;
        }
        setError(err.message || 'Có lỗi xảy ra khi tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // Filter categories theo search query và chỉ hiển thị những category có description chứa human.biodigital.com
  const filteredCategories = useMemo(() => {
    // Đầu tiên filter các category có description chứa human.biodigital.com
    const biodigitalCategories = categories.filter((category) => {
      return category.description && category.description.includes('human.biodigital.com');
    });

    // Sau đó filter theo search query nếu có
    if (!searchQuery.trim()) {
      return biodigitalCategories;
    }

    const normalizedKeyword = normalizeSearchKeyword(searchQuery);
    
    if (!normalizedKeyword) {
      return biodigitalCategories;
    }

    return biodigitalCategories.filter((category) => {
      const matchesTitle = category.title && matchesCategoryTitle(category.title, normalizedKeyword);
      const matchesSearchTitle = category.searchTitle && matchesCategoryTitle(category.searchTitle, normalizedKeyword);
      
      return matchesTitle || matchesSearchTitle;
    });
  }, [searchQuery, categories]);

  const handleCardClick = (category: BiodigitalCategory) => {
    setSelectedCategory(category);
    setViewMode('detail');
  };

  const handleMenuClick = () => {
    setViewMode('list');
    setSelectedCategory(null);
  };

  // Detect panel width và cập nhật số cột grid dựa trên phần trăm chiều rộng
  useEffect(() => {
    const updateGridCols = () => {
      if (containerRef.current && typeof window !== 'undefined') {
        const panelWidth = containerRef.current.offsetWidth;
        const viewportWidth = window.innerWidth;
        const percentage = (panelWidth / viewportWidth) * 100;
        
        // 40-50%: 3 cột
        // 30-40%: 2 cột
        // < 30%: 1 cột
        if (percentage >= 40 && percentage <= 50) {
          setGridCols(3);
        } else if (percentage >= 30 && percentage < 40) {
          setGridCols(2);
        } else {
          setGridCols(1);
        }
      }
    };

    updateGridCols();
    const resizeObserver = new ResizeObserver(updateGridCols);
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Cũng lắng nghe sự kiện resize của window để cập nhật khi viewport thay đổi
    window.addEventListener('resize', updateGridCols);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateGridCols);
    };
  }, []);

  // Inject CSS for dark mode scoped to panel
  useEffect(() => {
    const styleId = 'three-d-panel-dark-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .three-d-panel-dark input[class*="dark:border-white"] {
          border-color: rgba(255, 255, 255, 0.1) !important;
        }
        .three-d-panel-dark [class*="dark:text-white"] {
          color: white !important;
        }
        .three-d-panel-dark input::placeholder {
          color: rgba(255, 255, 255, 0.2) !important;
        }
        .three-d-panel-dark [class*="dark:bg-gray-800"] {
          background-color: rgb(31, 41, 55) !important;
        }
        .three-d-panel-dark [class*="dark:border-gray-700"] {
          border-color: rgb(55, 65, 81) !important;
        }
        .three-d-panel-dark [class*="dark:hover:bg-gray-700"]:hover {
          background-color: rgb(55, 65, 81) !important;
        }
        .three-d-panel-dark [class*="dark:text-gray-200"] {
          color: rgb(229, 231, 235) !important;
        }
        .three-d-panel-dark [class*="dark:fill-white"] {
          fill: white !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const SearchIcon = () => (
    <svg
      className="w-6 h-6 fill-gray-500 opacity-20 dark:fill-white dark:opacity-20"
      viewBox="0 0 12 12"
      width="24"
      height="24"
    >
      <path d="M11.5306 11.5247C11.7901 11.2636 11.7893 10.8417 11.529 10.5815L10.1235 9.17686C10.8915 8.2158 11.3523 6.99444 11.3523 5.67297C11.3523 2.54283 8.80801 0 5.67613 0C2.54424 0 0 2.54283 0 5.67297C0 8.80311 2.54424 11.3459 5.67613 11.3459C6.99833 11.3459 8.22037 10.8854 9.18197 10.1246L10.5846 11.5264C10.846 11.7877 11.2701 11.787 11.5306 11.5247ZM5.67613 10.0111C3.28548 10.0111 1.33556 8.06229 1.33556 5.67297C1.33556 3.28365 3.28548 1.33482 5.67613 1.33482C8.06678 1.33482 10.0167 3.28365 10.0167 5.67297C10.0167 8.06229 8.06678 10.0111 5.67613 10.0111Z"></path>
    </svg>
  );

  return (
    <div ref={containerRef} className="three-d-panel-dark bg-black flex flex-col h-full">
      {/* Header của panel */}
      <div className="flex items-center gap-4 p-4">
        {/* Menu icon - luôn hiện */}
        <button
          onClick={viewMode === 'detail' ? handleMenuClick : undefined}
          className="p-2 hover:bg-gray-800 rounded transition-colors flex-shrink-0"
          aria-label={viewMode === 'detail' ? "Quay lại danh sách" : "Menu"}
        >
          <svg
            className="text-gray-300"
            width="18"
            height="14"
            viewBox="0 0 18 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="18" height="4" rx="2" fill="currentColor" />
            <rect y="10" width="12" height="4" rx="2" fill="currentColor" />
          </svg>
        </button>

        {/* Search input - luôn hiện, nằm chính giữa */}
        <div className="flex-1 flex justify-center">
          <div className="relative max-w-sm w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mô hình..."
              className="w-full rounded-full bg-white/5 px-8 py-4 pr-10 text-white border-2 border-white/5 placeholder:text-gray-400 focus:bg-transparent focus:border-2 focus:border-white/10 focus:outline-none"
            />
            <div className="absolute inset-y-0 right-0 pr-6 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-800 rounded transition-colors flex-shrink-0"
          aria-label="Đóng"
        >
          <svg
            className="w-6 h-6 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Nội dung panel */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'list' ? (
          <div className="h-full overflow-y-auto p-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-700">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-gray-400">Đang tải...</div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-red-400">{error}</div>
              </div>
            ) : (
              <>
                {/* Categories Grid - responsive theo chiều rộng panel: 2 cột mobile, 3 cột tablet, 4 cột desktop */}
                {filteredCategories.length > 0 ? (
                  <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
                    {filteredCategories.map((category) => (
                      <BiodigitalCard
                        key={category.id}
                        category={category}
                        onClick={() => handleCardClick(category)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <p className="text-gray-400">
                      {searchQuery.trim() 
                        ? `Không tìm thấy kết quả nào cho "${searchQuery}"`
                        : 'Không có dữ liệu'}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* Detail view với iframe */
          <div className="h-full w-full overflow-hidden bg-black">
            {selectedCategory && selectedCategory.description ? (
              <iframe 
                id="embedded-human" 
                frameBorder="0" 
                style={{width: '100%', height: '100%'}} 
                allowFullScreen={true} 
                loading="lazy" 
                src={selectedCategory.description}
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-gray-400">Không có mô hình 3D</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreeDPanel;




