'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ 
  isOpen, 
  onClose,
  message = 'SubCategory này yêu cầu thanh toán. Vui lòng đăng nhập để truy cập nội dung này'
}) => {
  const router = useRouter();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    router.push('/upgrade');
  };

  const features = [
    'Không giới hạn đề',
    'Không giới hạn tính năng',
    'Không giới hạn hỏi đáp',
  ];

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-lg p-8 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#FFBB00' }}>
            Nâng cấp Pro để làm tiếp
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            {message}
          </p>
          
          <div className="flex flex-col gap-3 mb-6">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center justify-center gap-2">
                <svg
                  className="w-5 h-5"
                  style={{ color: '#FFBB00' }}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-gray-700 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleUpgrade}
            className="flex-1 py-3 rounded-lg font-medium text-white transition-colors"
            style={{
              backgroundColor: '#FFBB00',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FFA500';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFBB00';
            }}
          >
            NÂNG CẤP
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;




