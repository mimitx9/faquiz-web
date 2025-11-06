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
  const [showExplanation, setShowExplanation] = useState(false);

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
        setError(err.message || 'Có lỗi xảy ra khi tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };

    fetchCategory();
  }, [slugParam]);

  const handleOpenViewer = () => {
    if (category?.description) {
      // Mở trong cửa sổ mới với kích thước tối ưu
      const width = Math.min(1400, window.screen.width * 0.9);
      const height = Math.min(900, window.screen.height * 0.9);
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      window.open(
          category.description,
          'BioDigital 3D Viewer',
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes,toolbar=no,menubar=no,location=no`
      );
    }
  };

  if (loading) {
    return (
        <div className="min-h-screen bg-white dark:bg-black">
          <QuizHeader />
          <main className="pt-20 h-[calc(100vh-80px)] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-[#8D7EF7] border-t-transparent rounded-full animate-spin"></div>
              <div className="text-gray-500 dark:text-gray-400">Đang tải...</div>
            </div>
          </main>
        </div>
    );
  }

  if (error || !category) {
    return (
        <div className="min-h-screen bg-white dark:bg-black">
          <QuizHeader />
          <main className="pt-20 px-8 pb-8 max-w-7xl mx-auto">
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="text-red-500 dark:text-red-400">{error || 'Không tìm thấy mô hình'}</div>
              <button
                  onClick={() => router.push('/giai-phau-3d')}
                  className="px-6 py-3 rounded-full bg-[#8D7EF7] text-white hover:opacity-90 transition-opacity"
              >
                Quay lại
              </button>
            </div>
          </main>
        </div>
    );
  }

  return (
      <div className="min-h-screen bg-white dark:bg-black">
        <QuizHeader />
        <main className="pt-20 h-[calc(100vh-80px)] relative overflow-hidden">
          {/* Preview Background with Blur Effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-pink-500/10 dark:from-purple-500/20 dark:via-blue-500/20 dark:to-pink-500/20">
            {/* Animated Grid Pattern */}
            <div className="absolute inset-0 opacity-10 dark:opacity-5"
                 style={{
                   backgroundImage: `
                   linear-gradient(to right, currentColor 1px, transparent 1px),
                   linear-gradient(to bottom, currentColor 1px, transparent 1px)
                 `,
                   backgroundSize: '50px 50px'
                 }}>
            </div>
          </div>

          {/* Main Content */}
          <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 sm:px-8">
            <div className="max-w-2xl w-full text-center space-y-8">
              {/* 3D Icon */}
              <div className="mx-auto w-32 h-32 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#8D7EF7] to-purple-600 rounded-3xl rotate-6 animate-pulse opacity-20"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-[#8D7EF7] to-purple-600 rounded-3xl flex items-center justify-center transform hover:scale-110 transition-transform duration-300">
                  <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-3">
                <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white">
                  {category.title}
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  Mô hình giải phẫu 3D tương tác
                </p>
              </div>

              {/* Info Card */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-xl">
                <div className="flex items-start gap-4 text-left">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Do hạn chế về bảo mật, mô hình 3D cần được mở trong cửa sổ mới để xem đầy đủ tính năng tương tác.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                    onClick={handleOpenViewer}
                    className="group relative px-8 py-4 rounded-full bg-gradient-to-r from-[#8D7EF7] to-purple-600 text-white font-semibold hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 transform hover:scale-105"
                >
                <span className="flex items-center justify-center gap-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Xem mô hình 3D
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </span>
                </button>

                <button
                    onClick={() => router.push('/giai-phau-3d')}
                    className="px-8 py-4 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300"
                >
                  Quay lại danh sách
                </button>
              </div>

            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </main>
      </div>
  );
};

export default BiodigitalViewerPage;