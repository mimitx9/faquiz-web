import React from 'react';

interface PrintPanelProps {
  onClose: () => void;
}

const PrintPanel: React.FC<PrintPanelProps> = ({ onClose }) => {
  return (
    <div className="bg-white dark:bg-black flex flex-col transition-all duration-300 h-full">
      {/* Header của panel */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            In đề thi
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
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">
            In đề thi
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Chọn các tùy chọn in để xuất đề thi của bạn
          </p>
        </div>
      </div>

      {/* Footer với các nút action */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex flex-col gap-3">
          <button className="w-full px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-semibold">
            In PDF
          </button>
          <button className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-semibold">
            Xem trước
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintPanel;

