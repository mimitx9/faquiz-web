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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await biodigitalApiService.getAllCategories();
        if (response.data) {
          setCategories(response.data || []);
        }
      } catch (err: any) {
        console.error('Error fetching biodigital categories:', err);
        setError(err.message || 'Có lỗi xảy ra khi tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter categories theo search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return categories;
    }

    const normalizedKeyword = normalizeSearchKeyword(searchQuery);
    
    if (!normalizedKeyword) {
      return categories;
    }

    return categories.filter((category) => {
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
      <div className="min-h-screen bg-white dark:bg-black">
        <QuizHeader />
        <main className="pt-20 px-8 pb-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-500 dark:text-gray-400">Đang tải...</div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-black">
        <QuizHeader />
        <main className="pt-20 px-8 pb-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-red-500 dark:text-red-400">{error}</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <QuizHeader />
      <main className="pt-20 px-8 pb-8 max-w-7xl mx-auto">
        {/* Search Bar */}
        <div>
          <SearchBar 
            value={searchQuery} 
            onChange={(value) => setSearchQuery(value)}
            placeholder="Tìm mô hình"
          />
        </div>

        {/* Categories Grid */}
        {filteredCategories.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
            <p className="text-gray-500 dark:text-gray-400">
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

