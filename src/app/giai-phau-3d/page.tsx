'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import QuizHeader from '@/components/layout/QuizHeader';
import SearchBar from '@/components/ui/SearchBar';
import BiodigitalCard from '@/components/ui/BiodigitalCard';
import { biodigitalApiService, BiodigitalCategory } from '@/lib/api';
import { normalizeSearchKeyword, matchesCategoryTitle, createTitleSlug } from '@/lib/utils';

const BiodigitalPage: React.FC = () => {
  const router = useRouter();
  const [categories, setCategories] = useState<BiodigitalCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Force dark mode for this page - always keep dark mode
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('dark');
      
      // Monitor and force dark mode even if user tries to toggle
      const observer = new MutationObserver(() => {
        if (!document.documentElement.classList.contains('dark')) {
          document.documentElement.classList.add('dark');
        }
      });
      
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
      
      return () => {
        observer.disconnect();
        // Restore theme from localStorage when leaving this page
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
          document.documentElement.classList.remove('dark');
        } else if (savedTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          // Default to light mode if no theme is saved
          document.documentElement.classList.remove('dark');
        }
      };
    }
  }, []);

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
    // Navigate đến trang viewer với slug từ title
    const slug = createTitleSlug(category.title);
    router.push(`/giai-phau-3d/${slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <QuizHeader />
        <main className="pt-20 px-8 pb-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-400">Đang tải...</div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black">
        <QuizHeader />
        <main className="pt-20 px-8 pb-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-red-400">{error}</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <QuizHeader />
      <main className="pt-20 px-8 pb-8 max-w-7xl mx-auto">
        {/* Search Bar */}
        <div>
          <SearchBar 
            value={searchQuery} 
            onChange={(value) => setSearchQuery(value)}
            placeholder="Tìm mô hình..."
            autoFocusOnMount={true}
          />
        </div>

        {/* Categories Grid */}
        {filteredCategories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
      </main>
    </div>
  );
};

export default BiodigitalPage;

