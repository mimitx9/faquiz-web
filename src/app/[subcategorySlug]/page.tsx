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
      } catch (e: any) {
        console.error(e);
        if (e?.response?.status === 401) {
          router.push(`/login?redirect=/${encodeURIComponent(slugParam)}`);
        } else {
          setError('Không thể tải câu hỏi, vui lòng thử lại.');
        }
      } finally {
        setLoading(false);
      }
    };
    loadQuestions();
  }, [slugParam]);

  const handleToggleOption = (questionId: number, answerId: number) => {
    setMultiAnswers(prev => {
      const current = new Set(prev[questionId] ?? []);
      if (current.has(answerId)) current.delete(answerId); else current.add(answerId);
      return { ...prev, [questionId]: current };
    });
  };

  const next = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(i => i + 1);
  };
  const prev = () => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <QuizHeader />
        <div className="flex justify-center items-center py-20 pt-32">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <QuizHeader />
        <div className="flex justify-center items-center py-20 pt-32">
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <QuizHeader />
        <div className="flex justify-center items-center py-20 pt-32">
          <p className="text-gray-500">Không có câu hỏi cho đề này.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <QuizHeader />
      <main className="pt-20 px-8 pb-8 max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Đề: {slugParam}</h1>
            {currentQuestion?.extraData?.categorySubTitle && (
              <p className="text-sm text-gray-600">{currentQuestion.extraData.categorySubTitle}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-24">
              <h2 className="font-bold text-gray-900 mb-4">Danh sách câu hỏi</h2>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, index) => {
                  const isAnsweredEssay = textAnswers[q.questionId]?.trim()?.length > 0;
                  const isAnsweredMulti = (multiAnswers[q.questionId]?.size ?? 0) > 0;
                  const isAnswered = isAnsweredEssay || isAnsweredMulti;
                  const isCurrent = index === currentIndex;
                  return (
                    <button
                      key={q.questionId}
                      onClick={() => setCurrentIndex(index)}
                      className={`w-10 h-10 rounded-md text-sm font-medium transition-colors ${
                        isCurrent
                          ? 'bg-blue-600 text-white'
                          : isAnswered
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="mb-6">
                <span className="text-sm text-gray-500">Câu {currentIndex + 1} / {questions.length}</span>
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-6">{currentQuestion.question}</h2>

              {currentQuestion.extraData?.image && (
                <div className="mb-6">
                  <img src={currentQuestion.extraData.image} alt="question" className="max-h-80 rounded-md" />
                </div>
              )}

              {isEssay ? (
                <div className="mb-8">
                  <input
                    type="text"
                    value={textAnswers[currentQuestion.questionId] ?? ''}
                    onChange={e => setTextAnswers(prev => ({ ...prev, [currentQuestion.questionId]: e.target.value }))}
                    placeholder="Nhập câu trả lời của bạn"
                    className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ) : (
                <div className="space-y-3 mb-8">
                  {(currentQuestion.options || []).map((opt) => {
                    const selected = multiAnswers[currentQuestion.questionId]?.has(opt.answerId) ?? false;
                    return (
                      <label key={opt.answerId} className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${selected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => handleToggleOption(currentQuestion.questionId, opt.answerId)}
                        />
                        <span>{opt.text}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-between">
                <button
                  onClick={prev}
                  disabled={currentIndex === 0}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    currentIndex === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Trước
                </button>
                <button
                  onClick={next}
                  disabled={currentIndex === questions.length - 1}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    currentIndex === questions.length - 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Tiếp theo
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SubCategoryQuizPage;


