'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import QuizHeader from '@/components/layout/QuizHeader';
import { QuizResult } from '@/types';

const ResultPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const attemptId = parseInt(params?.id as string);

  const handleBackToHome = () => {
    router.push('/');
  };

  const mockResult: QuizResult = {
    attemptId: attemptId || 1,
    totalQuestions: 40,
    correctAnswers: 32,
    wrongAnswers: 8,
    score: 80,
    timeSpent: 1200,
    quiz: {
      id: 1,
      title: 'Y K41 - Đề thi thử CK 2',
      subjectName: 'Giải Phẫu',
      universityName: 'Y Hà Nội',
      questionCount: 40,
      questions: [],
    },
  };

  const scorePercentage = Math.round((mockResult.correctAnswers / mockResult.totalQuestions) * 100);

  const handleRetry = () => {
    router.push(`/quiz/${mockResult.quiz.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <QuizHeader />
      <main className="pt-20 px-8 pb-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Kết quả bài thi</h1>
            <p className="text-gray-600">{mockResult.quiz.title}</p>
          </div>

          <div className="flex justify-center mb-8">
            <div className="relative w-48 h-48">
              <svg className="transform -rotate-90 w-48 h-48">
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="#E5E7EB"
                  strokeWidth="16"
                  fill="none"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="#3B82F6"
                  strokeWidth="16"
                  fill="none"
                  strokeDasharray={`${(scorePercentage / 100) * 502.4} 502.4`}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-900">{scorePercentage}%</div>
                  <div className="text-sm text-gray-600">Điểm số</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Câu đúng</div>
              <div className="text-2xl font-bold text-green-600">
                {mockResult.correctAnswers}/{mockResult.totalQuestions}
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Câu sai</div>
              <div className="text-2xl font-bold text-red-600">
                {mockResult.wrongAnswers}/{mockResult.totalQuestions}
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Tổng điểm</div>
              <div className="text-2xl font-bold text-blue-600">{mockResult.score}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Thời gian</div>
              <div className="text-2xl font-bold text-purple-600">
                {Math.floor(mockResult.timeSpent / 60)}:
                {(mockResult.timeSpent % 60).toString().padStart(2, '0')}
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={handleBackToHome}
              className="px-6 py-3 rounded-lg font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
            >
              Về trang chủ
            </button>
            <button
              onClick={handleRetry}
              className="px-6 py-3 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Làm lại
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ResultPage;

