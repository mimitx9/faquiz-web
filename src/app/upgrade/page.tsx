'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import QuizHeader from '@/components/layout/QuizHeader';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

const UpgradePage: React.FC = () => {
  const router = useRouter();
  const { user, isInitialized } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [config, setConfig] = useState<{
    privileged: string;
    note: string;
    optionPackageEntities: Array<{
      namePackage: string;
      numTimePackage: string;
      textTimePackage: string;
      numPricePackage: string;
      notePackage: string;
      value: string;
    }>;
  } | null>(null);

  useEffect(() => {
    // Nếu chưa đăng nhập thì redirect đến trang login
    if (isInitialized && !user) {
      router.push('/login');
    }
  }, [user, isInitialized, router]);
  useEffect(() => {
    let isCancelled = false;
    const fetchConfig = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const res = await fetch(
          'http://localhost:7071/fai/faquiz/v1/remote-config/choose-purchase-package',
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
            cache: 'no-store',
          }
        );
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = await res.json();
        const raw = json?.data?.configValue;
        if (!raw || typeof raw !== 'string') {
          throw new Error('Dữ liệu không hợp lệ');
        }
        const parsed = JSON.parse(raw);
        if (!isCancelled) {
          setConfig(parsed);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setErrorMessage(err?.message || 'Có lỗi xảy ra.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };
    fetchConfig();
    return () => {
      isCancelled = true;
    };
  }, []);

  const features = [
    'Không giới hạn đề',
    'Không giới hạn tính năng',
    'Không giới hạn hỏi đáp',
  ];

  const plans = useMemo(() => {
    if (!config?.optionPackageEntities) return [] as Array<{
      id: string;
      name: string;
      price: string;
      period: string;
      note?: string;
      popular?: boolean;
    }>;
    return config.optionPackageEntities.map((p, idx) => ({
      id: `${p.namePackage}-${idx}`,
      name: p.namePackage,
      price: p.numPricePackage,
      period: `${p.numTimePackage} ${p.textTimePackage}`,
      note: p.notePackage,
      popular: idx === 1, // giữ "Phổ biến" cho gói thứ 2 như UI cũ
    }));
  }, [config]);

  const handleUpgrade = (planId: string) => {
    console.log('Upgrading to:', planId);
  };

  return (
    <div className="min-h-screen bg-white">
      <QuizHeader />
      <main className="pt-20 px-8 pb-8 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#FFBB00' }}>
            {config?.privileged || 'Nâng cấp Pro để làm tiếp'}
          </h1>
          {config?.note && (
            <p className="text-gray-600 mb-4">{config.note}</p>
          )}
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

        {isLoading ? (
          <div className="flex justify-center items-center py-12 text-gray-600">
            Đang tải gói nâng cấp...
          </div>
        ) : errorMessage ? (
          <div className="flex justify-center items-center py-12 text-red-600">
            {errorMessage}
          </div>
        ) : (
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
                <div className="text-center mb-1">
                  <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600 ml-2">/{plan.period}</span>
                </div>
                {plan.note && (
                  <div className="text-center text-sm text-gray-600 mb-4">{plan.note}</div>
                )}
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
        )}

      </main>
    </div>
  );
};

export default UpgradePage;

