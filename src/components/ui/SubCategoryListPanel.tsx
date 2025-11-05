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
    <div className="flex-1 bg-white border-gray-200 overflow-hidden flex flex-col">
      {/* Header với indicator và close button */}
      <div className="px-6 py-4 border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: category.backgroundColor }}
          />
          <span
            className="text-sm font-medium"
            style={{ color: category.backgroundColor }}
          >
            {category.title} {category.subtitle !== 'Tổng hợp' ? category.subtitle : ''}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
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
      </div>

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

