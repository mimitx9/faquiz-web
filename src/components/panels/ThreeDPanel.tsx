import React from 'react';

interface ThreeDPanelProps {
  onClose: () => void;
}

const ThreeDPanel: React.FC<ThreeDPanelProps> = ({ onClose }) => {
  return (
    <div className="bg-white dark:bg-black border-l border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 h-full">
      {/* Header của panel */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Giải phẫu 3D
          </h3>
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
      <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <svg
              className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">
            Giải phẫu 3D
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Khám phá mô hình giải phẫu 3D tương tác để hiểu rõ hơn về cấu trúc cơ thể
          </p>
        </div>
      </div>

      {/* Footer với các nút action */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex flex-col gap-3">
          <button className="w-full px-4 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-semibold">
            Mở mô hình 3D
          </button>
          <button className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-semibold">
            Tìm kiếm bộ phận
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThreeDPanel;

