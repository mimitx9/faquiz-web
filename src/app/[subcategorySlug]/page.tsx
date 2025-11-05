'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import QuizHeader from '@/components/layout/QuizHeader';
import { quizBattleApiService } from '@/lib/api';
import { Question } from '@/types';

const SubCategoryQuizPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const slugParam = params?.subcategorySlug as string; // dạng: 763003-bo-xuong-he-co-cac-khop-phan-2

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [textAnswers, setTextAnswers] = useState<Record<number, string>>({});
  const [multiAnswers, setMultiAnswers] = useState<Record<number, Set<number>>>({});

  const currentQuestion = questions[currentIndex];

  const isEssay = useMemo(() => {
    if (!currentQuestion) return false;
    return !currentQuestion.options || currentQuestion.options.length <= 1;
  }, [currentQuestion]);

  useEffect(() => {
    const loadQuestions = async () => {
      if (!slugParam) return;
      try {
        setLoading(true);
        setError(null);
        const res = await quizBattleApiService.getQuestionsBySubCategory({ slug: slugParam });
        setQuestions(res?.data?.questions || []);
        setCurrentIndex(0);
      } catch (e: any) {
        console.error(e);
        setError('Không thể tải câu hỏi, vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };
    loadQuestions();
  }, [slugParam]);

  const handleToggleOption = (questionId: number, answerId: number) => {
    setMultiAnswers(prev => {
      const set = new Set(prev[questionId] || []);
      if (set.has(answerId)) set.delete(answerId); else set.add(answerId);
      return { ...prev, [questionId]: set };
    });
  };

  const handleEssayChange = (questionId: number, value: string) => {
    setTextAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const goNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(i => i + 1);
  };
  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <QuizHeader />
        <main className="pt-20 px-8 pb-8 max-w-4xl mx-auto">
          <div className="text-center text-gray-500 py-20">Đang tải...</div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <QuizHeader />
        <main className="pt-20 px-8 pb-8 max-w-4xl mx-auto">
          <div className="text-center text-red-500 py-20">{error}</div>
        </main>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-white">
        <QuizHeader />
        <main className="pt-20 px-8 pb-8 max-w-4xl mx-auto">
          <div className="text-center text-gray-500 py-20">Không có câu hỏi</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <QuizHeader />
      <main className="pt-20 px-8 pb-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">Câu {currentIndex + 1} / {questions.length}</span>
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-4">{currentQuestion.question}</h1>

          {isEssay ? (
            <textarea
              className="w-full border rounded-lg p-3 min-h-[140px]"
              placeholder="Nhập câu trả lời..."
              value={textAnswers[currentQuestion.questionId] || ''}
              onChange={(e) => handleEssayChange(currentQuestion.questionId, e.target.value)}
            />
          ) : (
            <div className="space-y-2">
              {currentQuestion.options?.map((opt, idx) => {
                const checked = !!multiAnswers[currentQuestion.questionId]?.has(opt.answerId);
                const optionLetter = String.fromCharCode(65 + idx);
                return (
                  <label
                    key={opt.answerId || idx}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${checked ? 'bg-blue-50 border-blue-300' : 'border-gray-200 hover:border-gray-300'}`}
                    onClick={() => handleToggleOption(currentQuestion.questionId, opt.answerId)}
                  >
                    <input type="checkbox" checked={checked} readOnly />
                    <span className="font-semibold">{optionLetter}.</span>
                    <span>{opt.text}</span>
                  </label>
                );
              })}
            </div>
          )}

          <div className="flex justify-between mt-6">
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className={`px-5 py-2 rounded-lg font-medium ${currentIndex === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Trước
            </button>
            <button
              onClick={goNext}
              disabled={currentIndex === questions.length - 1}
              className={`px-5 py-2 rounded-lg font-medium ${currentIndex === questions.length - 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              Tiếp theo
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SubCategoryQuizPage;


