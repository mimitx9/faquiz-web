'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import QuizHeader from '@/components/layout/QuizHeader';
import { biodigitalApiService, BiodigitalCategory } from '@/lib/api';
import { createTitleSlug } from '@/lib/utils';

const BiodigitalViewerPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const slugParam = params?.slug as string;

  const [category, setCategory] = useState<BiodigitalCategory | null>(null);
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
    const fetchCategory = async () => {
      if (!slugParam) {
        setError('Slug không hợp lệ');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await biodigitalApiService.getAllCategories();

        if (!response.data || response.data.length === 0) {
          setError('Không tìm thấy dữ liệu');
          setLoading(false);
          return;
        }

        const foundCategory = response.data.find((cat) => {
          const categorySlug = createTitleSlug(cat.title);
          return categorySlug === slugParam;
        });

        if (!foundCategory) {
          setError('Không tìm thấy mô hình');
          setLoading(false);
          return;
        }

        setCategory(foundCategory);
      } catch (err: any) {
        console.error('Error fetching biodigital category:', err);
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

    fetchCategory();
  }, [slugParam, router]);

  if (loading) {
    return (
        <div className="min-h-screen bg-black">
          <QuizHeader />
          <main className="pt-20 h-[calc(100vh-80px)] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-[#8D7EF7] border-t-transparent rounded-full animate-spin"></div>
              <div className="text-gray-400">Đang tải...</div>
            </div>
          </main>
        </div>
    );
  }

  if (error || !category) {
    return (
        <div className="min-h-screen bg-black">
          <QuizHeader />
          <main className="pt-20 px-8 pb-8 max-w-7xl mx-auto">
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="text-red-400 text-center">{error || 'Không tìm thấy mô hình'}</div>
              <button
                  onClick={() => router.push('/giai-phau-3d')}
                  className="px-6 py-3 rounded-full bg-gray-700 text-white hover:opacity-90 transition-opacity"
              >
                Quay lại
              </button>
            </div>
          </main>
        </div>
    );
  }

  return (
      <div className="min-h-screen bg-black">
        <QuizHeader />
        <main className="pt-20 h-[calc(100vh)] relative overflow-hidden">
          {/* Main Content */}
          <div className="relative z-10 h-full flex flex-col px-4 sm:px-8 pb-8">

            {/* Iframe Container */}
            <div className="flex-1 w-full overflow-hidden bg-black">
              {category.description ? (
                <iframe 
                  id="embedded-human" 
                  frameBorder="0" 
                  style={{width: '100%', height: '100%'}} 
                  allowFullScreen={true} 
                  loading="lazy" 
                  src={category.description}
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-gray-400">Không có mô hình 3D</div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
  );
};

export default BiodigitalViewerPage;