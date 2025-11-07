import React, { useState } from 'react';
import { Question } from '@/types';

interface FixErrorPanelProps {
  onClose: () => void;
  question: Question | null;
}

const FixErrorPanel: React.FC<FixErrorPanelProps> = ({ onClose, question }) => {
  const [explanation, setExplanation] = useState('');

  if (!question) {
    return null;
  }

  const handleSubmit = () => {
    // TODO: Gửi API để lưu giải thích
    console.log('Submit explanation:', {
      questionId: question.questionId,
      explanation,
    });
    // Có thể đóng panel sau khi submit thành công
    // onClose();
  };

  return (
    <div className="bg-white dark:bg-black border-l border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 h-full">
      {/* Header của panel */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Sửa lỗi
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          aria-label="Đóng panel"
        >
          <svg
            className="w-5 h-5 text-gray-600 dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Nội dung panel */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Câu hỏi */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {question.question}
          </h2>
        </div>

        {/* Các phương án trả lời */}
        <div className="space-y-3 mb-6">
          {question.options?.map((opt, idx) => {
            const optionLetter = String.fromCharCode(65 + idx);
            const isCorrect = opt.isCorrect;
            
            return (
              <div
                key={opt.answerId}
                className={`w-full text-left p-4 rounded-2xl flex items-center justify-between bg-white dark:bg-black transition-all duration-200 ${
                  isCorrect 
                    ? 'border-2 border-[#00C800]' 
                    : 'border border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span 
                    className="font-semibold text-lg"
                    style={isCorrect ? { color: '#00C800' } : { color: '#666' }}
                  >
                    {optionLetter}.
                  </span>
                  <span 
                    className="text-lg"
                    style={isCorrect ? { color: '#00C800' } : { color: '#333' }}
                  >
                    {opt.text}
                  </span>
                </div>
                {isCorrect && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{backgroundColor: '#41C911'}}>
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="2">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Textarea để viết giải thích */}
        <div className="mb-6">
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Viết giải thích"
            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 resize-none"
            rows={10}
          />
        </div>
      </div>

      {/* Footer với nút submit */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={handleSubmit}
          disabled={!explanation.trim()}
          className="w-full px-4 py-3 rounded-lg text-white font-semibold transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#00C800' }}
        >
          GỬI
        </button>
      </div>
    </div>
  );
};

export default FixErrorPanel;

