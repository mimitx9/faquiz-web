'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import QuizHeader from '@/components/layout/QuizHeader';
import HomeLoginForm from '@/components/ui/HomeLoginForm';
import { useAuth } from '@/hooks/useAuth';

const LoginPage: React.FC = () => {
  const router = useRouter();
  const { user, isInitialized } = useAuth();

  useEffect(() => {
    // Nếu đã đăng nhập thì redirect về trang chủ
    if (isInitialized && user) {
      router.push('/');
    }
  }, [user, isInitialized, router]);

  const handleLoginSuccess = () => {
    // Sau khi đăng nhập thành công, redirect về trang chủ
    router.push('/');
  };

  // Không hiển thị nếu đã đăng nhập (sẽ redirect)
  if (isInitialized && user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <QuizHeader />
      <HomeLoginForm onSuccess={handleLoginSuccess} />
    </div>
  );
};

export default LoginPage;

