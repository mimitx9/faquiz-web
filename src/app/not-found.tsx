'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // Tự động redirect về trang home khi gặp 404
    router.replace('/');
  }, [router]);

  // Hiển thị loading trong khi redirect
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-gray-400">Đang chuyển hướng...</div>
    </div>
  );
}





