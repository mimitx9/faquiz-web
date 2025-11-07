import React from 'react';
import Image from 'next/image';

interface StarPanelProps {
  onClose: () => void;
}

const StarPanel: React.FC<StarPanelProps> = ({ onClose }) => {
  return (
    <div className="bg-white dark:bg-black border-l border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 h-full">
      {/* Header của panel */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <button
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            aria-label="Menu"
          >
            <svg
              className="w-5 h-5 text-gray-600 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          aria-label="Đóng panel"
        >
          <svg
            className="w-5 h-5 text-gray-600 dark:text-gray-400"
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

      {/* Nội dung panel */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="text-center">
          <div className="flex justify-center">
            <Image
              src="/quiz/Subtract.svg"
              alt="FA hack"
              width={200}
              height={41}
              className="object-contain"
            />
          </div>
        </div>
      </div>

      {/* Input field ở dưới */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="relative">
          <input
            type="text"
            placeholder="Giải thích từng ý"
            className="w-full px-4 py-3 pl-10 pr-24 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-black text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
          />
          {/* Icon search */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
              Tổng hợp
            </span>
            <button className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700 transition-colors">
              <span className="text-sm font-semibold">7</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StarPanel;

