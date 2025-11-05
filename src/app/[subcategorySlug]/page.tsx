'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import QuizHeader from '@/components/layout/QuizHeader';
import { quizBattleApiService } from '@/lib/api';
import { Question, CategoryInfo, SubCategoryInfo } from '@/types';

const SubCategoryQuizPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const slugParam = params?.subcategorySlug as string; // dạng: 763003-bo-xuong-he-co-cac-khop-phan-2

  const [questions, setQuestions] = useState<Question[]>([]);
  const [category, setCategory] = useState<CategoryInfo | null>(null);
  const [subCategory, setSubCategory] = useState<SubCategoryInfo | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [textAnswers, setTextAnswers] = useState<Record<number, string>>({});
  const [multiAnswers, setMultiAnswers] = useState<Record<number, Set<number>>>({});
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
        
        // Set category và subcategory từ API response
        if (res.data.category) {
          setCategory(res.data.category);
        }
        if (res.data.subCategories && res.data.subCategories.length > 0) {
          // Tìm subcategory phù hợp với slug hoặc lấy đầu tiên
          const matchedSubCategory = res.data.subCategories.find(
            sub => sub.code === slugParam.split('-')[0] || slugParam.includes(sub.code)
          ) || res.data.subCategories[0];
          setSubCategory(matchedSubCategory);
        }
        
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

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Sử dụng dữ liệu từ API
  const categoryTitle = category?.title || 'Đề thi thử';
  const categoryBackgroundColor = category?.backgroundColor || '#3B82F6';
  const subcategoryTitle = subCategory?.title || 'Đề thi thử';

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
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-white">
        <QuizHeader />
        <div className="flex justify-center items-center py-20 pt-32">
          <p className="text-gray-500">Không có câu hỏi</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <QuizHeader />
      <main className="pt-20">
        <div className={`flex transition-all duration-300 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
          {/* Cột 1: Sidebar với danh sách câu hỏi */}
          {!isSidebarCollapsed && (
            <div className="w-1/3 min-w-[280px] max-w-[320px] h-[calc(100vh-5rem)] flex flex-col border-r border-gray-200 bg-white shrink-0">
              {/* Header với category title và nút collapse */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: categoryBackgroundColor }}
                  />
                  <h2 
                    className="text-base font-semibold"
                    style={{ color: categoryBackgroundColor }}
                  >
                    {categoryTitle}
                  </h2>
                </div>
                <button
                  onClick={toggleSidebar}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  aria-label="Thu gọn sidebar"
                >
                  <Image
                    src="/collapse.svg"
                    alt="Collapse"
                    width={22}
                    height={22}
                  />
                </button>
              </div>

              {/* Danh sách câu hỏi - có thể scroll */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {questions.map((q, index) => {
                    const isAnswered = isEssay 
                      ? textAnswers[q.questionId] !== undefined && textAnswers[q.questionId] !== ''
                      : multiAnswers[q.questionId] !== undefined && multiAnswers[q.questionId].size > 0;
                    const isCurrent = index === currentIndex;

                    return (
                      <button
                        key={q.questionId}
                        onClick={() => setCurrentIndex(index)}
                        className={`w-full flex items-center gap-2 p-2 rounded-md transition-colors ${
                          isCurrent
                            ? 'bg-blue-50'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isCurrent
                              ? 'bg-red-500'
                              : isAnswered
                              ? 'bg-green-500'
                              : 'bg-gray-300'
                          }`}
                        />
                        <span className={`text-sm font-medium ${
                          isCurrent
                            ? 'text-blue-600'
                            : 'text-gray-700'
                        }`}>
                          {index + 1}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer với subcategory title */}
              <div className="p-4 border-t border-gray-200">
                <p 
                  className="text-sm"
                  style={{ color: '#0000001A' }}
                >
                  {subcategoryTitle}
                </p>
              </div>
            </div>
          )}

          {/* Cột 2: Nội dung làm quiz - width gấp 2 lần cột 1 */}
          <div className={`${isSidebarCollapsed ? 'w-full max-w-4xl mx-auto' : 'w-2/3'} transition-all duration-300`}>
            <div className="p-8">
              {/* Nút expand sidebar nếu đã collapse */}
              {isSidebarCollapsed && (
                <div className="mb-6 flex justify-start">
                  <button
                    onClick={toggleSidebar}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                    aria-label="Mở rộng sidebar"
                  >
                    <Image
                      src="/collapse.svg"
                      alt="Expand"
                      width={22}
                      height={22}
                      className="rotate-180"
                    />
                  </button>
                </div>
              )}

              {/* Nội dung câu hỏi */}
              <div className="bg-white rounded-lg shadow-sm p-8">
                <div className="mb-6">
                  <span className="text-sm text-gray-500">
                    Câu {currentIndex + 1} / {questions.length}
                  </span>
                </div>

                <h1 className="text-xl font-bold text-gray-900 mb-6">
                  {currentQuestion.question}
                </h1>

                {isEssay ? (
                  <textarea
                    className="w-full border rounded-lg p-3 min-h-[140px] mb-8"
                    placeholder="Nhập câu trả lời..."
                    value={textAnswers[currentQuestion.questionId] || ''}
                    onChange={(e) => handleEssayChange(currentQuestion.questionId, e.target.value)}
                  />
                ) : (
                  <div className="space-y-3 mb-8">
                    {currentQuestion.options?.map((opt, idx) => {
                      const checked = !!multiAnswers[currentQuestion.questionId]?.has(opt.answerId);
                      const optionLetter = String.fromCharCode(65 + idx);
                      
                      return (
                        <button
                          key={opt.answerId || idx}
                          onClick={() => handleToggleOption(currentQuestion.questionId, opt.answerId)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-colors flex items-center justify-between ${
                            checked
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{optionLetter}.</span>
                            <span>{opt.text}</span>
                          </div>
                          {checked && (
                            <div className="w-5 h-5 rounded-full border-2 border-blue-600 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-between">
                  <button
                    onClick={goPrev}
                    disabled={currentIndex === 0}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      currentIndex === 0
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Trước
                  </button>
                  <button
                    onClick={goNext}
                    disabled={currentIndex === questions.length - 1}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      currentIndex === questions.length - 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    Tiếp theo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SubCategoryQuizPage;
