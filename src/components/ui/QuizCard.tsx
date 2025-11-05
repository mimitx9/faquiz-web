'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Quiz } from '@/types';
import { useAuth } from '@/hooks/useAuth';

interface QuizCardProps {
  quiz: Quiz;
  onClick: () => void;
}

const QuizCard: React.FC<QuizCardProps> = ({ quiz, onClick }) => {
  const router = useRouter();
  const { user, isInitialized } = useAuth();

  const handleClick = () => {
    // Nếu là đề PRO và chưa đăng nhập thì redirect đến trang login
    if (quiz.isPro && isInitialized && !user) {
      router.push('/login');
      return;
    }
    // Nếu không phải PRO hoặc đã đăng nhập thì gọi onClick callback
    onClick();
  };
  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-lg shadow-sm p-4 min-w-[280px] cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: quiz.color || '#3B82F6' }}
        />
        <span className="text-sm text-gray-600">{quiz.subjectName}</span>
        {quiz.universityName && (
          <>
            <span className="text-gray-400">•</span>
            <span className="text-sm text-gray-600">{quiz.universityName}</span>
          </>
        )}
      </div>
      <h3 className="font-bold text-base mb-2 text-gray-900 line-clamp-2">
        {quiz.title}
      </h3>
      <p className="text-sm text-gray-500">{quiz.questionCount} câu</p>
      {quiz.isPro && (
        <span className="inline-block mt-2 px-2 py-1 text-xs font-semibold text-yellow-600 bg-yellow-50 rounded">
          PRO
        </span>
      )}
    </div>
  );
};

export default QuizCard;
