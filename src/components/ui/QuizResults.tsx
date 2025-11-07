'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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

  // Handler khi click vào subcategory card
  const handleSubCategoryClick = (subCategory: SubCategoryInfo) => {
    const slug = subCategory.slug;
    router.push(`/${slug}`);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="pt-32 pb-12 px-8">
        <div className="max-w-6xl mx-auto">
          {/* Results Summary Box */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {/* Box màu tím nhạt với các thông số */}
            <div
              className="col-span-3 flex items-center justify-between px-16 py-16 rounded-3xl h-full"
              style={{ backgroundColor: '#8D7EF7' }}
            >
              {/* Tổng điểm */}
              <div className="flex flex-col items-center">
                <span className="text-lg text-white opacity-50 mb-4 tracking-wider">TỔNG ĐIỂM</span>
                <span className="text-6xl font-bold text-white tracking-wider">
                  {scoreOutOf10}/10
                </span>
              </div>

              {/* Câu đúng */}
              <div className="flex flex-col items-center">
                <span className="text-lg text-white opacity-50 mb-4 tracking-wider">CÂU ĐÚNG</span>
                <span className="text-6xl font-bold text-white tracking-wider">
                  {totalScore}/{totalQuestions}
                </span>
              </div>

              {/* Thời gian */}
              <div className="flex flex-col items-center">
                <span className="text-lg text-white opacity-50 mb-4 tracking-wider">THỜI GIAN</span>
                <span className="text-6xl font-bold text-white tracking-wider">
                  {formatTime(timeSpent)}
                </span>
              </div>
            </div>

            {/* Nút Làm lại */}
            <button
              onClick={onRetry}
              className="col-span-1 flex flex-col items-center justify-center px-16 py-16 rounded-3xl transition-opacity hover:opacity-80 h-full dark:bg-gray-800/50"
              style={{ backgroundColor: 'rgba(141, 126, 247, 0.1)' }}
            >
              <svg
                className="w-12 h-12 mb-2"
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
              <span className="text-4xl font-semibold " style={{ color: '#8D7EF7' }}>
                Làm lại
              </span>
            </button>
          </div>

          {/* FA Battle Advertisement Box */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div
              className="col-span-4 flex items-center justify-between px-16 py-16 rounded-3xl h-full"
              style={{ backgroundColor: '#04002A' }}
            >
              {/* Logo bên trái */}
              <div className="flex-shrink-0 mr-8">
                <Image
                  src="/logos/battle/battle.png"
                  alt="FA Battle Logo"
                  width={160}
                  height={160}
                  className="object-contain"
                />
              </div>

              {/* Text ở giữa */}
              <div className="flex flex-col justify-center flex-grow">
                <h3
                  className="text-3xl font-semibold mb-2"
                  style={{
                    background: 'linear-gradient(90deg, #F53AFF 0%, #FFAA00 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Đấu trường FA Battle
                </h3>
                <p className="text-lg text-white font-normal">
                  Ai giỏi hơn ai, vô đấu là biết ngay
                </p>
              </div>

              {/* Button bên phải */}
              <button
                onClick={() => window.open('https://fabattle.com/', '_blank')}
                className="flex-shrink-0 px-8 py-4 rounded-full text-white font-bold text-lg transition-opacity hover:opacity-90"
                style={{
                  background: 'linear-gradient(to right, #FFD406, #FF8C00)',
                }}
              >
                ĐẤU NGAY
              </button>
            </div>
          </div>

          {/* Đề liên quan */}
          {filteredRelatedSubCategories.length > 0 && (
            <div className="mt-12">
              <h2 className="text-md text-gray-300 dark:text-white/20 tracking-widest font-bold mb-8">ĐỀ TƯƠNG TỰ</h2>
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
                    slug: subCategory.slug,
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

