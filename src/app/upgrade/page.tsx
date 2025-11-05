'use client';

import React from 'react';
import QuizHeader from '@/components/layout/QuizHeader';
import Link from 'next/link';

const UpgradePage: React.FC = () => {
  const plans = [
    {
      id: 'monthly',
      name: 'Tháng',
      price: '159k',
      period: '1 tháng',
    },
    {
      id: 'yearly',
      name: 'Năm',
      price: '999k',
      period: '12 tháng',
      popular: true,
    },
    {
      id: 'lifetime',
      name: 'Vĩnh viễn',
      price: '1.899k',
      period: 'Trọn đời',
    },
  ];

  const features = [
    'Không giới hạn đề',
    'Không giới hạn tính năng',
    'Không giới hạn hỏi đáp',
  ];

  const handleUpgrade = (planId: string) => {
    console.log('Upgrading to:', planId);
  };

  return (
    <div className="min-h-screen bg-white">
      <QuizHeader />
      <main className="pt-20 px-8 pb-8 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4" style={{ color: '#FFBB00' }}>
            Nâng cấp Pro để làm tiếp
          </h1>
          <div className="flex justify-center gap-8 mb-8">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
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
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-lg border-2 p-6 ${
                plan.popular
                  ? 'border-blue-500 shadow-lg'
                  : 'border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="text-center mb-4">
                  <span className="inline-block px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-full">
                    Phổ biến
                  </span>
                </div>
              )}
              <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
                {plan.name}
              </h3>
              <div className="text-center mb-4">
                <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-gray-600 ml-2">/{plan.period}</span>
              </div>
              <button
                onClick={() => handleUpgrade(plan.id)}
                className="w-full py-3 rounded-lg font-medium text-white transition-colors mb-3"
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
              <div className="text-center">
                <Link
                  href="/support"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Hỗ trợ
                </Link>
              </div>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
};

export default UpgradePage;

