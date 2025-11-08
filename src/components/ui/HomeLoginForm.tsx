import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';

const loginSchema = z.object({
  phone: z.string().min(1, 'Số điện thoại là bắt buộc'),
  password: z.string().min(1, 'Mật khẩu là bắt buộc'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface HomeLoginFormProps {
  onSuccess?: () => void;
}

const HomeLoginForm: React.FC<HomeLoginFormProps> = ({ onSuccess }) => {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });


  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError('');

    try {
      await login({
        username: data.phone,
        password: data.password
      });
      
      reset();
      onSuccess?.();
    } catch (err: unknown) {
      const error = err as {
        response?: {
          status?: number;
          data?: { meta?: { message?: string; code?: number }; message?: string };
        };
      };
      
      if (error.response?.status === 400 && error.response?.data?.meta?.message) {
        setError(error.response.data.meta.message);
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Đăng nhập thất bại');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Login Modal */}
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <div className="w-full max-w-lg bg-white dark:bg-white/5 dark:border-2 dark:border-[#8D7EF7]/10 px-12 py-4 rounded-3xl shadow-[0_0_60px_30px_rgba(141,126,247,0.1)] dark:shadow-[0_0_60px_30px_rgba(166,148,247,0.1)]">
          <div className="flex flex-col items-center justify-center mb-8">
            {error && (
              <div className="bg-red-50 text-red-600 px-5 py-3 rounded-3xl mb-5 text-sm font-medium text-center">
                {error}
              </div>
            )}
          </div>

          <div className="flex justify-center mb-10">
            <Image
              src="/logos/falogin.png"
              alt="Đăng nhập tài khoản FA"
              width={300}
              height={100}
              className="object-contain"
            />
          </div>

          <form className="mb-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-6">
              <input
                type="text"
                id="phone"
                placeholder="Số điện thoại"
                {...register('phone')}
                autoFocus={true}
                className={`w-full px-10 py-6 rounded-full text-lg bg-white dark:bg-transparent dark:text-white box-border transition focus:outline-none disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed border-2 ${errors.phone ? 'border-red-500 focus:ring-2 focus:ring-red-100' : 'border-gray-100 dark:border-white/10 focus:ring-2 focus:ring-[#8D7EF7]/10 dark:focus:ring-[#8D7EF7]'}`}
                disabled={isLoading}
              />
              {errors.phone && (
                <span className="text-red-500 text-xs mt-1 block">{errors.phone.message}</span>
              )}
            </div>

            <div className="mb-6">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="Mật khẩu"
                  {...register('password')}
                  className={`w-full px-10 py-6 pr-12 rounded-full text-lg bg-white dark:bg-transparent dark:text-white box-border transition focus:outline-none disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed border-2 ${errors.password ? 'border-red-500 focus:ring-2 focus:ring-red-100' : 'border-gray-100 dark:border-white/10 focus:ring-2 focus:ring-[#8D7EF7]/10 dark:focus:ring-[#8D7EF7]'}`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute right-6 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  <svg width="20" height="12" viewBox="0 0 29 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14.8 0.200195C6.47005 0.200195 1.09405 8.7962 0.996049 8.9502C0.870049 9.1182 0.800049 9.3282 0.800049 9.5382C0.800049 9.7202 0.856049 9.8882 0.954049 10.0422C0.968049 10.0702 5.49005 18.8622 14.8 18.8622C24.082 18.8622 28.576 10.1682 28.632 10.0562L28.646 10.0422C28.744 9.8882 28.8 9.7202 28.8 9.5382C28.8 9.3282 28.73 9.1182 28.604 8.9642C28.5061 8.7962 23.13 0.200195 14.8 0.200195ZM14.8 3.0002C18.412 3.0002 21.338 5.9262 21.338 9.5382C21.338 13.1502 18.412 16.0762 14.8 16.0762C11.188 16.0762 8.26205 13.1362 8.26205 9.5382C8.26205 5.9402 11.188 3.0002 14.8 3.0002ZM14.8 6.7382C13.26 6.7382 12 7.9982 12 9.5382C12 11.0782 13.26 12.3382 14.8 12.3382C16.34 12.3382 17.6 11.0782 17.6 9.5382C17.6 7.9982 16.34 6.7382 14.8 6.7382Z" fill={showPassword ? '#8D7EF7' : '#CCCCCC'}/>
                  </svg>
                </button>
              </div>
              {errors.password && (
                <span className="text-red-500 text-xs mt-1 block">{errors.password.message}</span>
              )}
            </div>

            <div className="text-right mb-8">
              <a 
                href="https://m.me/appfaquiz?ref=password" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-[#8D7EF7] hover:text-[#7568d4] transition"
              >
                Quên mật khẩu?
              </a>
            </div>

            <button
              type="submit"
              className="w-full py-6 tracking-wider rounded-full text-white font-semibold text-lg mb-6 uppercase transition disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transition-all duration-200"
              style={{ backgroundColor: '#8D7EF7' }}
              disabled={isLoading}
            >
              {isLoading ? 'Đang đăng nhập...' : 'ĐĂNG NHẬP'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default HomeLoginForm;
