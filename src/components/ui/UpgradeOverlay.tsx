'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface UpgradeOverlayProps {
  isOpen: boolean;
  onClose?: () => void;
}

const UpgradeOverlay: React.FC<UpgradeOverlayProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
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
    if (!isOpen) return;
    
    let isCancelled = false;
    const fetchConfig = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const BASE_URL = process.env.NODE_ENV === 'production' 
          ? 'https://api.facourse.com/fai' 
          : 'http://localhost:7071/fai';
        
        const res = await fetch(
          `${BASE_URL}/faquiz/v1/remote-config/choose-purchase-package`,
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
  }, [isOpen]);

  const features = [
    'Không giới hạn đề',
    'Không giới hạn tính năng',
    'Hỗ trợ trả góp gói vĩnh viễn',
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

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
    router.back();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Blur overlay background */}
      <div 
        className="fixed inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-lg z-[200] transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Upgrade content overlay */}
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 overflow-y-auto">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="fixed top-10 right-10 z-[202] w-10 h-10 md:w-12 md:h-12 flex items-center justify-center"
          aria-label="Đóng"
        >
          <svg
            className="w-8 h-8 md:w-10 md:h-10 text-gray-400 dark:text-gray-600"
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

        <div 
          className="max-w-6xl w-full my-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-8 md:p-12">
            <div className="text-center mb-12">
              <h1 className="text-3xl md:text-4xl font-bold mb-8 tracking-wide" style={{ color: '#FFBB00' }}>
                Nâng Pro để làm full +1.000.000 đề
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
                    <span className="text-gray-700 dark:text-gray-300 text-sm md:text-base">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-12 text-gray-600 dark:text-white/20">
                Đang tải gói nâng cấp...
              </div>
            ) : errorMessage ? (
              <div className="flex justify-center items-center py-12 text-red-600 dark:text-red-400">
                {errorMessage}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      onClick={handleUpgrade}
                      className="bg-white dark:bg-black rounded-3xl min-h-[360px] md:min-h-[420px] p-6 flex flex-col border-2 border-[#8D7EF7]/10 dark:border-gray-700 hover:scale-110 transition-all hover:cursor-pointer"
                    >
                      <h3 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-3 text-center">
                        Quiz {plan.name}
                      </h3>
                      <div className="flex justify-center items-center mb-6 flex-grow">
                        <span className="text-6xl tracking-wide font-bold text-black dark:text-white">{plan.price}</span>
                      </div>
                      <div className="flex justify-center mb-6">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpgrade();
                          }}
                          className="px-12 py-4 rounded-full font-bold text-white text-lg transition-colors uppercase tracking-wider"
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSupport();
                          }}
                          className="text-md text-[#8D7EF7] cursor-pointer"
                        >
                          Hỗ trợ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-center mt-8">
                  <p className="text-gray-400 dark:text-gray-500 my-12">Hoặc</p>
                  <button
                    onClick={() => window.open('https://m.me/appfaquiz', '_blank')}
                    className="text-[#8D7EF7] text-2xl font-semibold"
                  >
                    Đăng nhập Pro để làm tiếp →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default UpgradeOverlay;

