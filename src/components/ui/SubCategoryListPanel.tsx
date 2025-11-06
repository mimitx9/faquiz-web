'use client';

import React from 'react';
import { CategoriesSlide, SubCategoriesSlide } from '@/types';
import SubCategoryListItem from './SubCategoryListItem';

interface SubCategoryListPanelProps {
  category: CategoriesSlide;
  onClose: () => void;
  onSubCategoryClick: (subCategory: SubCategoriesSlide) => void;
}

const SubCategoryListPanel: React.FC<SubCategoryListPanelProps> = ({
  category,
  onClose,
  onSubCategoryClick,
}) => {
  const subCategories = category.subCategoriesSlide || [];

  return (
    <div className="flex-1 bg-white dark:bg-black border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col relative">
      {/* Close button - absolute ở góc phải trên */}
      <button
        onClick={onClose}
        className="absolute top-0 right-5 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-lg text-gray-300 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
        aria-label="Đóng"
      >
        <svg
          className="w-5 h-5"
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

      {/* List content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {subCategories.length > 0 ? (
          <div>
            {subCategories.map((subCategory) => (
              <SubCategoryListItem
                key={subCategory.id}
                subCategory={subCategory}
                backgroundColor={category.backgroundColor}
                onClick={() => onSubCategoryClick(subCategory)}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <p>Không có subcategory nào</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubCategoryListPanel;

