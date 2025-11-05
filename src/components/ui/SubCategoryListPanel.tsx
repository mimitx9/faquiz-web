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
    <div className="flex-1 bg-white border-gray-200 overflow-hidden flex flex-col relative">
      {/* Close button - absolute ở góc phải trên */}
      <button
        onClick={onClose}
        className="absolute top-0 right-6 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-lg text-gray-400 hover:text-gray-600 transition-colors hover:bg-gray-100 rounded-full"
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
            strokeWidth={2}
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
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Không có subcategory nào</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubCategoryListPanel;

