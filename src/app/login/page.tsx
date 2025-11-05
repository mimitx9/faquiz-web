'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import QuizHeader from '@/components/layout/QuizHeader';
import HomeLoginForm from '@/components/ui/HomeLoginForm';

const LoginPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get('redirect') || '/';

  const handleLoginSuccess = () => {
    // Redirect to the specified page or home page after successful login
    router.push(redirect);
  };

  return (
    <div className="min-h-screen bg-white">
      <QuizHeader />
      <main className="pt-20 px-8 pb-8">
        <div className="max-w-md mx-auto">
          <HomeLoginForm onSuccess={handleLoginSuccess} />
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
