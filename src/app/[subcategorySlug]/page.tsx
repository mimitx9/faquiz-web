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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [textAnswers, setTextAnswers] = useState<Record<number, string>>({});
  const [multiAnswers, setMultiAnswers] = useState<Record<number, Set<number>>>({}); // Lưu các answerId đã chọn cho mỗi câu hỏi
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const isEssay = (question: Question) => {
    if (!question) return false;
    return !question.options || question.options.length <= 1;
  };

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
        
      } catch (e: any) {
        console.error(e);
        setError('Không thể tải câu hỏi, vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };
    loadQuestions();
  }, [slugParam]);

  // Đếm số lượng đáp án đúng trong một câu hỏi
  const getCorrectAnswerCount = (question: Question) => {
    return question.options?.filter(opt => opt.isCorrect).length || 0;
  };

  const handleSelectOption = (questionId: number, answerId: number, question: Question) => {
    const selectedAnswers = multiAnswers[questionId] || new Set();
    const correctAnswerCount = getCorrectAnswerCount(question);
    
    // Nếu đã verify (đã chọn đủ số lượng bằng số đáp án đúng), không cho chọn thêm
    if (selectedAnswers.size >= correctAnswerCount && correctAnswerCount > 0) {
      return;
    }
    
    // Toggle option (chọn/bỏ chọn)
    setMultiAnswers(prev => {
      const set = new Set(prev[questionId] || []);
      if (set.has(answerId)) {
        set.delete(answerId);
      } else {
        // Chỉ cho phép chọn đến khi đủ số lượng bằng số đáp án đúng
        if (set.size < correctAnswerCount || correctAnswerCount === 0) {
          set.add(answerId);
        }
      }
      return { ...prev, [questionId]: set };
    });
  };

  const handleEssayChange = (questionId: number, value: string) => {
    setTextAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Hàm kiểm tra xem đã chọn đủ số lượng bằng số đáp án đúng chưa
  const isVerified = (question: Question, selectedAnswers: Set<number> | undefined) => {
    if (!selectedAnswers) return false;
    const correctAnswerCount = getCorrectAnswerCount(question);
    return correctAnswerCount > 0 && selectedAnswers.size >= correctAnswerCount;
  };

  // Hàm render icon verify dựa trên trạng thái chọn và đúng/sai
  const renderVerifyIcon = (
    option: { answerId?: number; isCorrect?: boolean }, 
    selectedAnswers: Set<number> | undefined,
    isVerified: boolean
  ) => {
    // Chỉ hiển thị icon khi đã verify (đã chọn đủ số lượng bằng số đáp án đúng)
    if (!isVerified) return null;

    // Nếu option này là đáp án đúng (isCorrect = true), hiển thị icon check (xanh)
    if (option?.isCorrect) {
      return (
        <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200" style={{backgroundColor: '#41C911'}}>
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="2">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      );
    } 
    // Nếu user chọn option này nhưng option này không đúng (isCorrect = false), hiển thị icon X (cam)
    else if (selectedAnswers?.has(option.answerId) && !option?.isCorrect) {
      return (
        <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200" style={{backgroundColor: '#E05B00'}}>
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="2">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      );
    }
    return null;
  };

  // Hàm tính toán border color cho option
  const getBorderColor = (
    option: { answerId?: number; isCorrect?: boolean }, 
    selectedAnswers: Set<number> | undefined,
    isVerified: boolean
  ) => {
    // Chỉ hiển thị border màu khi đã verify
    if (!isVerified) {
      return 'rgba(0, 0, 0, 0.05)';
    }
    
    // Nếu option này là đáp án đúng, border màu xanh
    if (option?.isCorrect) {
      return '#00C800';
    }
    
    // Nếu user chọn option này nhưng sai, border màu cam
    if (selectedAnswers?.has(option.answerId) && !option?.isCorrect) {
      return '#EC5300';
    }
    
    // Mặc định
    return 'rgba(0, 0, 0, 0.05)';
  };

  // Hàm tính toán text color cho option (giống với border color khi đã verify)
  const getTextColor = (
    option: { answerId?: number; isCorrect?: boolean }, 
    selectedAnswers: Set<number> | undefined,
    isVerified: boolean
  ) => {
    // Chỉ đổi màu text khi đã verify
    if (!isVerified) {
      return undefined; // Màu mặc định
    }
    
    // Nếu option này là đáp án đúng, text màu xanh
    if (option?.isCorrect) {
      return '#00C800';
    }
    
    // Nếu user chọn option này nhưng sai, text màu cam
    if (selectedAnswers?.has(option.answerId) && !option?.isCorrect) {
      return '#EC5300';
    }
    
    // Mặc định
    return undefined;
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

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <QuizHeader />
        <div className="flex justify-center items-center py-20 pt-32">
          <p className="text-gray-500">Không có câu hỏi</p>
        </div>
      </div>
    );
  }

  // Hàm render một câu hỏi
  const renderQuestion = (question: Question, index: number) => {
    const questionIsEssay = isEssay(question);
    const selectedAnswers = multiAnswers[question.questionId];
    const verified = isVerified(question, selectedAnswers);
    const isAnswered = verified;

    return (
      <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
        <div className="mb-6">
          <span className="text-xl bold" style={{ color: '#0000001A' }}>
            Câu {index + 1}
          </span>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-6">
          {question.question}
        </h1>

        {/* Hiển thị ảnh nếu có */}
        {question.extraData?.image && (
          <div className="mb-6 flex justify-center">
            <div className="relative w-full max-w-2xl">
              <img
                src={question.extraData.image}
                alt="Câu hỏi"
                className="w-full h-auto rounded-lg shadow-sm"
                onError={(e) => {
                  console.error('Failed to load image:', question.extraData?.image);
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>
        )}

        {questionIsEssay ? (
          <textarea
            className="w-full border rounded-lg p-3 min-h-[140px]"
            placeholder="Nhập câu trả lời..."
            value={textAnswers[question.questionId] || ''}
            onChange={(e) => handleEssayChange(question.questionId, e.target.value)}
          />
        ) : (
          <div className="space-y-3">
            {question.options?.map((opt, idx) => {
              const correctAnswerCount = getCorrectAnswerCount(question);
              const optionLetter = String.fromCharCode(65 + idx);
              const borderColor = getBorderColor(opt, selectedAnswers, verified);
              const textColor = getTextColor(opt, selectedAnswers, verified);
              
              return (
                <button
                  key={opt.answerId || idx}
                  onClick={() => handleSelectOption(question.questionId, opt.answerId, question)}
                  disabled={isAnswered}
                  className={`w-full text-left p-4 rounded-lg transition-colors flex items-center justify-between bg-white ${
                    isAnswered ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                  }`}
                  style={{
                    border: `1px solid ${borderColor}`,
                    borderRadius: '8px'
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold" style={textColor ? { color: textColor } : undefined}>{optionLetter}.</span>
                    <span style={textColor ? { color: textColor } : undefined}>{opt.text}</span>
                  </div>
                  {renderVerifyIcon(opt, selectedAnswers, verified)}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

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
                    const questionIsEssay = isEssay(q);
                    const isAnswered = questionIsEssay 
                      ? textAnswers[q.questionId] !== undefined && textAnswers[q.questionId] !== ''
                      : multiAnswers[q.questionId] !== undefined && multiAnswers[q.questionId].size > 0;

                    return (
                      <button
                        key={q.questionId}
                        onClick={() => {
                          // Scroll đến câu hỏi tương ứng trong container scroll
                          const element = document.getElementById(`question-${q.questionId}`);
                          const scrollContainer = document.getElementById('questions-scroll-container');
                          if (element && scrollContainer) {
                            const containerRect = scrollContainer.getBoundingClientRect();
                            const elementRect = element.getBoundingClientRect();
                            const scrollTop = scrollContainer.scrollTop + elementRect.top - containerRect.top - 20; // 20px offset
                            scrollContainer.scrollTo({ top: scrollTop, behavior: 'smooth' });
                          }
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-md transition-colors hover:bg-gray-50"
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isAnswered
                              ? 'bg-green-500'
                              : 'bg-gray-300'
                          }`}
                        />
                        <span className="text-sm font-medium text-gray-700">
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

          {/* Cột 2: Danh sách tất cả câu hỏi scroll được */}
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

              {/* Danh sách tất cả câu hỏi - scroll được */}
              <div id="questions-scroll-container" className="overflow-y-auto max-h-[calc(100vh-8rem)]">
                {questions.map((question, index) => (
                  <div id={`question-${question.questionId}`} key={question.questionId}>
                    {renderQuestion(question, index)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SubCategoryQuizPage;
