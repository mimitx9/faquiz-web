'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import QuizHeader from '@/components/layout/QuizHeader';
import { quizWebApiService } from '@/lib/api';
import { QuizDetail } from '@/types';

const QuizPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const quizId = parseInt(params?.id as string);

  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (quizId) {
      loadQuiz();
    }
  }, [quizId]);

  useEffect(() => {
    if (quiz?.timeLimit && timeRemaining === null) {
      setTimeRemaining(quiz.timeLimit * 60);
    }
  }, [quiz]);

  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      const response = await quizWebApiService.getQuizDetail(quizId);
      setQuiz(response.data);
    } catch (error: any) {
      console.error('Error loading quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId: number, answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleNext = () => {
    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!quiz) return;

    try {
      const response = await quizWebApiService.submitQuiz(quiz.id, answers);
      // Hiển thị thông báo hoặc redirect về home
      alert('Đã nộp bài thành công!');
      router.push('/');
    } catch (error) {
      console.error('Error submitting quiz:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  if (!quiz) {
    return (
      <div className="min-h-screen bg-white">
        <QuizHeader />
        <div className="flex justify-center items-center py-20 pt-32">
          <p className="text-gray-500">Không tìm thấy đề thi</p>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <QuizHeader />
      <main className="pt-20 px-8 pb-8 max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{quiz.title}</h1>
            <p className="text-sm text-gray-600">{quiz.subjectName}</p>
          </div>
          {timeRemaining !== null && (
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {formatTime(timeRemaining)}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-24">
              <h2 className="font-bold text-gray-900 mb-4">Danh sách câu hỏi</h2>
              <div className="grid grid-cols-5 gap-2">
                {quiz.questions.map((q, index) => {
                  const isAnswered = answers[q.questionId] !== undefined;
                  const isCurrent = index === currentQuestionIndex;

                  return (
                    <button
                      key={q.questionId}
                      onClick={() => setCurrentQuestionIndex(index)}
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
                <span className="text-sm text-gray-500">
                  Câu {currentQuestionIndex + 1} / {quiz.questions.length}
                </span>
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {currentQuestion.question}
              </h2>

              <div className="space-y-3 mb-8">
                {currentQuestion.options?.map((option, index) => {
                  const optionLetter = String.fromCharCode(65 + index);
                  const isSelected = answers[currentQuestion.questionId] === option.text;

                  return (
                    <button
                      key={option.answerId || index}
                      onClick={() => handleAnswerSelect(currentQuestion.questionId, option.text)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="font-semibold mr-2">{optionLetter}.</span>
                      {option.text}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={handlePrevious}
                  disabled={isFirstQuestion}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    isFirstQuestion
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Trước
                </button>
                <button
                  onClick={isLastQuestion ? handleSubmit : handleNext}
                  className="px-6 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  {isLastQuestion ? 'Nộp bài' : 'Tiếp theo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default QuizPage;

