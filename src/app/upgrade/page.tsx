'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import QuizHeader from '@/components/layout/QuizHeader';
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

  // Kiểm tra xem numTimePackage có phải là vô cực không
  const isInfinity = (value: string): boolean => {
    const lowerValue = value.toLowerCase().trim();
    return (
      lowerValue === '∞' ||
      lowerValue === 'infinity' ||
      lowerValue === 'vô cực' ||
      lowerValue === 'vo cuc' ||
      lowerValue === 'unlimited' ||
      lowerValue === 'không giới hạn'
    );
  };

  const plans = useMemo(() => {
    if (!config?.optionPackageEntities) return [] as Array<{
      id: string;
      name: string;
      price: string;
      period: string;
      note?: string;
    }>;
    return config.optionPackageEntities.map((p, idx) => {
      const showNumTime = !isInfinity(p.numTimePackage);
      return {
        id: `${p.namePackage}-${idx}`,
        name: showNumTime ? `${p.numTimePackage} ${p.textTimePackage}` : p.textTimePackage,
        price: p.numPricePackage,
        period: showNumTime ? `${p.numTimePackage} ${p.textTimePackage}` : p.textTimePackage,
        note: p.notePackage,
      };
    });
  }, [config]);

  const handleUpgrade = () => {
    window.open('https://m.me/appfaquiz', '_blank');
  };

  const handleSupport = () => {
    window.open('https://m.me/appfaquiz', '_blank');
  };

  return (
    <div className="min-h-screen bg-white">
      <QuizHeader />
      <main className="pt-28 px-4 md:px-8 pb-8 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 tracking-wider" style={{ color: '#FFBB00' }}>
            {config?.privileged || 'Nâng cấp Pro để làm tiếp'}
          </h1>
          <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-8 mb-12">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 flex-shrink-0"
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
                <span className="text-gray-700 text-sm md:text-base">{feature}</span>
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
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-white rounded-3xl min-h-[360px] md:min-h-[420px] p-6 flex flex-col border-2 border-gray-100 hover:scale-110 transition-all hover:cursor-pointer"
                >
                  <h3 className="text-xl font-semibold text-gray-700 mb-4 text-center">
                    {plan.name}
                  </h3>
                  <div className="flex justify-center items-center mb-6 flex-grow">
                    <span className="text-6xl tracking-wide font-bold text-black">{plan.price}</span>
                  </div>
                  <div className="flex justify-center mb-3">
                    <button
                      onClick={handleUpgrade}
                      className="px-8 py-4 rounded-full font-bold text-white transition-colors uppercase tracking-wider"
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
                  <div className="text-center">
                    <button
                      onClick={handleSupport}
                      className="text-sm text-[#8D7EF7] hover:underline cursor-pointer"
                    >
                      Hỗ trợ
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <p className="text-gray-400 my-12">Hoặc</p>
              <button
                onClick={() => window.open('https://m.me/appfaquiz', '_blank')}
                className="text-[#8D7EF7] text-2xl font-semibold"
              >
                Đăng nhập tài khoản Pro →
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default UpgradePage;

