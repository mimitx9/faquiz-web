import React, { useState, useEffect, useRef } from 'react';
import { Question, SubCategoryInfo } from '@/types';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { fixQuizApiService } from '@/lib/api';

interface FixErrorPanelProps {
  onClose: () => void;
  question: Question | null;
  subCategory?: SubCategoryInfo | null;
  onSuccess?: () => void;
}

const FixErrorPanel: React.FC<FixErrorPanelProps> = ({ onClose, question, subCategory, onSuccess }) => {
  const { user } = useAuth();
  const [explanation, setExplanation] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [editedQuestion, setEditedQuestion] = useState('');
  const [editedOptions, setEditedOptions] = useState<Record<string, string>>({});
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!question) {
    return null;
  }

  // Khởi tạo giá trị ban đầu
  useEffect(() => {
    if (question) {
      setEditedQuestion(question.question || '');
      const initialOptions: Record<string, string> = {};
      question.options?.forEach(opt => {
        initialOptions[opt.answerId] = opt.text || '';
      });
      setEditedOptions(initialOptions);
      // Reset ảnh khi question thay đổi
      setUploadedImage(null);
      setImagePreview(null);
    }
  }, [question]);

  // Cleanup preview URL khi component unmount hoặc ảnh thay đổi
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleOptionToggle = (answerId: number) => {
    const answerIdStr = answerId.toString();
    setSelectedOptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(answerIdStr)) {
        newSet.delete(answerIdStr);
      } else {
        newSet.add(answerIdStr);
      }
      return newSet;
    });
  };

  const handleQuestionChange = (value: string) => {
    setEditedQuestion(value);
  };

  const handleOptionChange = (answerId: number, value: string) => {
    setEditedOptions(prev => ({
      ...prev,
      [answerId]: value
    }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Kiểm tra loại file
      if (!file.type.startsWith('image/')) {
        alert('Vui lòng chọn file ảnh');
        return;
      }
      
      // Kiểm tra kích thước file (ví dụ: max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Kích thước ảnh không được vượt quá 5MB');
        return;
      }

      setUploadedImage(file);
      
      // Tạo preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
    
    // Reset input để có thể chọn lại cùng file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setUploadedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageIconClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    if (!question || !explanation.trim()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      // Map options từ UI sang format API
      const options = question.options?.map((opt, idx) => {
        const optionLetter = String.fromCharCode(65 + idx);
        const isSelected = selectedOptions.has(opt.answerId.toString());
        const editedText = editedOptions[opt.answerId];
        
        return {
          option_name: editedText !== undefined && editedText.trim() !== '' 
            ? editedText 
            : opt.text,
          option_code: opt.answerId.toString(),
          option_alpha: optionLetter,
          is_choose: isSelected,
        };
      }) || [];

      // Lấy chapter info từ question.extraData hoặc subCategory
      const chapterName = question.extraData?.categorySubTitle || subCategory?.title || 'Chưa xác định';
      const chapterCode = question.extraData?.categorySubCode || subCategory?.code || '';

      // Lấy keyword từ question (có thể lấy từ question text hoặc extraData)
      const keyword = question.question || editedQuestion || '';

      // Tạo payload
      const payload = {
        question_name: editedQuestion.trim() !== '' && editedQuestion !== question.question
          ? editedQuestion
          : question.question,
        question_code: question.questionId.toString(),
        chapter_name: chapterName,
        chapter_code: chapterCode,
        is_note_correct: selectedOptions.size > 0,
        options: options,
        contributor_name: user?.fullName || user?.username || 'Anonymous',
        contributor_id: user?.userId?.toString() || '0',
        keyword: keyword,
        explanation: explanation.trim(),
      };

      // Gọi API
      await fixQuizApiService.requestFixQuiz(payload, uploadedImage || undefined);

      setSubmitSuccess(true);
      
      // Gọi callback success để hiển thị badge
      if (onSuccess) {
        onSuccess();
      }
      
      // Đóng panel ngay lập tức
      onClose();
    } catch (error: any) {
      console.error('Error submitting fix quiz:', error);
      setSubmitError(error?.response?.data?.meta?.message || 'Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border-l border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 h-full" style={{ backgroundColor: '#CCCCCC40' }}>
      {/* Header của panel */}
      <div className="flex items-center justify-end px-4 py-4 dark:border-gray-800">
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
          <div className="w-full text-left p-4 rounded-2xl bg-white dark:bg-black border border-gray-200 dark:border-gray-700">
            <textarea
              value={editedQuestion}
              onChange={(e) => handleQuestionChange(e.target.value)}
              className="w-full text-lg font-semibold text-gray-800 dark:text-gray-200 bg-transparent border-none outline-none resize-none"
              rows={3}
              placeholder="Nhập câu hỏi"
            />
          </div>
        </div>

        {/* Các phương án trả lời */}
        <div className="space-y-3 mb-6">
          {question.options?.map((opt, idx) => {
            const optionLetter = String.fromCharCode(65 + idx);
            const isCorrect = opt.isCorrect;
            const isSelected = selectedOptions.has(opt.answerId.toString());
            
            return (
              <div
                key={opt.answerId}
                className={`w-full text-left p-4 rounded-2xl flex items-center bg-white dark:bg-black transition-all duration-200 ${
                  isCorrect 
                    ? 'border-2 border-[#00C800]' 
                    : 'border border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <button
                    onClick={() => handleOptionToggle(opt.answerId)}
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 cursor-pointer"
                    style={{
                      borderColor: isSelected ? '#00C800' : '#CCCCCC',
                      backgroundColor: isSelected ? '#00C800' : 'transparent'
                    }}
                    aria-label={`Chọn đáp án ${optionLetter}`}
                  >
                    {isSelected && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="2">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <span 
                    className="font-semibold text-lg flex-shrink-0"
                    style={isSelected ? { color: '#00C800' } : { color: '#666' }}
                  >
                    {optionLetter}.
                  </span>
                  <input
                    type="text"
                    value={editedOptions[opt.answerId] || ''}
                    onChange={(e) => handleOptionChange(opt.answerId, e.target.value)}
                    className="flex-1 text-lg bg-transparent border-none outline-none"
                    style={isSelected ? { color: '#00C800' } : { color: '#333' }}
                    placeholder={`Nhập phương án ${optionLetter}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Textarea để viết giải thích */}
        <div className="mb-6 relative">
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Viết giải thích"
            className="fix-error-textarea w-full px-4 py-3 pr-12 rounded-3xl bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none resize-none"
            style={{ 
              border: '1px solid #00C8000D'
            }}
            rows={4}
          />
          {/* Icon upload ảnh ở góc dưới bên trái */}
          <button
            type="button"
            onClick={handleImageIconClick}
            className="absolute bottom-3 left-3 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
            aria-label="Upload ảnh"
          >
            <Image
              src="/quiz/image-line-icon.svg"
              alt="Upload ảnh"
              width={16}
              height={16}
              className="w-4 h-4 opacity-60"
              style={{ filter: 'brightness(0) saturate(100%) invert(50%)' }}
            />
          </button>
          {/* Input file ẩn */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          {/* Preview ảnh đã upload */}
          {imagePreview && (
            <div className="mt-3 relative inline-block">
              <div className="relative w-full max-w-xs rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-auto object-contain max-h-64"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  aria-label="Xóa ảnh"
                >
                  <svg
                    className="w-4 h-4"
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
            </div>
          )}
        </div>
      </div>

      {/* Footer với nút submit */}
      <div className="p-4 flex flex-col items-center gap-2">
        {submitError && (
          <div className="text-red-500 text-sm text-center px-4">
            {submitError}
          </div>
        )}
        {submitSuccess && (
          <div className="text-green-500 text-sm text-center px-4">
            Gửi yêu cầu thành công!
          </div>
        )}
        <button
          onClick={handleSubmit}
          disabled={!explanation.trim() || isSubmitting}
          className="px-6 py-2 rounded-3xl text-white font-semibold transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ 
            backgroundColor: '#00C800',
            border: '1px solid #00C800'
          }}
        >
          {isSubmitting ? 'Đang gửi...' : 'GỬI'}
        </button>
      </div>
    </div>
  );
};

export default FixErrorPanel;

