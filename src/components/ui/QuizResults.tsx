'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import SubCategoryCard from './SubCategoryCard';
import { SubCategoryInfo } from '@/types';
import { createSubCategorySlug } from '@/lib/utils';

interface QuizResultsProps {
  totalScore: number; // Số câu đúng
  totalQuestions: number; // Tổng số câu hỏi
  timeSpent: number; // Thời gian làm bài tính bằng giây
  onRetry: () => void;
  relatedSubCategories?: SubCategoryInfo[]; // Danh sách subcategories liên quan
  categoryBackgroundColor?: string; // Màu của category
  currentSubCategoryId?: number; // ID của subcategory hiện tại
}

const QuizResults: React.FC<QuizResultsProps> = ({
  totalScore,
  totalQuestions,
  timeSpent,
  onRetry,
  relatedSubCategories = [],
  categoryBackgroundColor = '#3B82F6',
  currentSubCategoryId,
}) => {
  const router = useRouter();

  // Format thời gian từ giây sang MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Tính điểm trên thang 10
  const scoreOutOf10 = totalQuestions > 0 
    ? Math.round((totalScore / totalQuestions) * 10)
    : 0;

  // Filter các subcategory liên quan (loại bỏ subcategory hiện tại)
  const filteredRelatedSubCategories = relatedSubCategories.filter(
    sub => sub.id !== currentSubCategoryId
  );

  console.log('🔍 QuizResults - relatedSubCategories:', relatedSubCategories);
  console.log('🔍 QuizResults - filteredRelatedSubCategories:', filteredRelatedSubCategories);
  console.log('🔍 QuizResults - currentSubCategoryId:', currentSubCategoryId);

  // Handler khi click vào subcategory card
  const handleSubCategoryClick = (subCategory: SubCategoryInfo) => {
    const slug = createSubCategorySlug(subCategory.code, subCategory.title);
    router.push(`/${slug}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="pt-20 pb-12 px-8">
        <div className="max-w-6xl mx-auto">
          {/* Results Summary Box */}
          <div className="flex items-center gap-4 mb-8">
            {/* Box màu tím nhạt với các thông số */}
            <div
              className="flex-1 flex items-center justify-between px-8 py-6 rounded-lg"
              style={{ backgroundColor: '#8D7EF7' }}
            >
              {/* Tổng điểm */}
              <div className="flex flex-col items-center">
                <span className="text-sm text-white opacity-90 mb-1">Tổng điểm</span>
                <span className="text-3xl font-bold text-white">
                  {scoreOutOf10}/10
                </span>
              </div>

              {/* Câu đúng */}
              <div className="flex flex-col items-center">
                <span className="text-sm text-white opacity-90 mb-1">Câu đúng</span>
                <span className="text-3xl font-bold text-white">
                  {totalScore}/{totalQuestions}
                </span>
              </div>

              {/* Thời gian */}
              <div className="flex flex-col items-center">
                <span className="text-sm text-white opacity-90 mb-1">Thời gian</span>
                <span className="text-3xl font-bold text-white">
                  {formatTime(timeSpent)}
                </span>
              </div>
            </div>

            {/* Nút Làm lại */}
            <button
              onClick={onRetry}
              className="flex flex-col items-center justify-center px-6 py-4 rounded-lg transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#E5E7EB' }}
            >
              <svg
                className="w-6 h-6 mb-2"
                style={{ color: '#8D7EF7' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="text-sm font-medium" style={{ color: '#8D7EF7' }}>
                Làm lại
              </span>
            </button>
          </div>

          {/* Đề liên quan */}
          {filteredRelatedSubCategories.length > 0 && (
            <div className="mt-12">
              <h2 className="text-md text-gray-300 tracking-widest font-bold mb-8">ĐỀ LIÊN QUAN</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredRelatedSubCategories.map((subCategory) => {
                  // Convert SubCategoryInfo sang format SubCategoriesSlide để dùng với SubCategoryCard
                  const subCategoryCardData = {
                    code: subCategory.code,
                    id: subCategory.id,
                    title: subCategory.title,
                    categoryId: subCategory.categoryId,
                    isPayment: subCategory.isPayment,
                    categoryTitle: subCategory.categoryTitle,
                    slug: createSubCategorySlug(subCategory.code, subCategory.title),
                    backgroundColor: categoryBackgroundColor,
                  };
                  
                  return (
                    <SubCategoryCard
                      key={subCategory.id}
                      subCategory={subCategoryCardData}
                      onClick={() => handleSubCategoryClick(subCategory)}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizResults;

