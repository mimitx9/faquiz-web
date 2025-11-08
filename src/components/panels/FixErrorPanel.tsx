import React, { useState, useEffect, useRef } from 'react';
import { Question, SubCategoryInfo } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { fixQuizApiService } from '@/lib/api';
import { trackQuizFixErrorSubmit } from '@/lib/analytics';

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
  const [showTooltip, setShowTooltip] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  if (!question) {
    return null;
  }

  // Khởi tạo giá trị ban đầu
  useEffect(() => {
    if (question) {
      setEditedQuestion(question.question || '');
      const initialOptions: Record<string, string> = {};
      const initialSelected = new Set<string>();
      question.options?.forEach(opt => {
        initialOptions[opt.answerId] = opt.text || '';
        // Khởi tạo selectedOptions với phương án đúng ban đầu
        if (opt.isCorrect) {
          initialSelected.add(opt.answerId.toString());
        }
      });
      setEditedOptions(initialOptions);
      setSelectedOptions(initialSelected);
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
      // Nếu phương án này đã được chọn, bỏ chọn
      if (prev.has(answerIdStr)) {
        return new Set<string>();
      } else {
        // Nếu chọn phương án mới, chỉ giữ lại phương án này (bỏ phương án cũ)
        return new Set([answerIdStr]);
      }
    });
  };

  const handleQuestionChange = (value: string) => {
    setEditedQuestion(value);
  };

  // Tính số hàng dựa trên độ dài text, tối đa 6 hàng
  const calculateRows = (text: string): number => {
    if (!text) return 1;
    // Đếm số dòng từ newlines
    const lineBreaks = (text.match(/\n/g) || []).length;
    // Ước tính số hàng dựa trên độ dài (khoảng 50 ký tự mỗi hàng cho text-lg)
    const estimatedRows = Math.ceil(text.length / 50);
    // Lấy giá trị lớn hơn giữa lineBreaks + 1 và estimatedRows
    const rows = Math.max(lineBreaks + 1, estimatedRows);
    // Giới hạn tối đa 6 hàng
    return Math.min(rows, 6);
  };

  const handleOptionChange = (answerId: number, value: string) => {
    setEditedOptions(prev => ({
      ...prev,
      [answerId]: value
    }));
  };

  const handleOptionFocus = (answerId: number) => {
    const answerIdStr = answerId.toString();
    // Set phương án này là correct, bỏ correct của phương án cũ
    setSelectedOptions(new Set([answerIdStr]));
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

      // Track fix error submit
      trackQuizFixErrorSubmit(
        question.questionId,
        subCategory?.code,
        undefined // categoryCode không có trong FixErrorPanel, có thể thêm sau nếu cần
      );

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
    <div 
      className="flex flex-col transition-all duration-300 h-full bg-gray-100/60 dark:bg-white/5 relative"
    >
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
      <div className="flex-1 overflow-y-auto px-6 pt-0 pb-28 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-700">
        {/* Câu hỏi */}
        <div className="mb-6">
          <div className="w-full text-left p-6 rounded-2xl border-2 border-gray-200 dark:border-white/5 flex items-center hover:scale-[1.02] transition-all duration-200">
            <textarea
              value={editedQuestion}
              onChange={(e) => handleQuestionChange(e.target.value)}
              className="w-full text-lg font-medium text-gray-800 dark:text-gray-200 bg-transparent border-none outline-none resize-none py-0"
              rows={calculateRows(editedQuestion)}
              placeholder="Sửa câu hỏi"
            />
          </div>
        </div>

        {/* Các phương án trả lời */}
        <div className="space-y-3 mb-6">
          {question.options?.map((opt, idx) => {
            const optionLetter = String.fromCharCode(65 + idx);
            const isSelected = selectedOptions.has(opt.answerId.toString());
            // Dùng isSelected để xác định isCorrect (phương án được chọn là correct)
            const isCorrect = isSelected;
            
            return (
              <div
                key={opt.answerId}
                className={`w-full text-left p-6 rounded-2xl hover:scale-[1.02] flex items-start border-2 transition-all duration-200 ${
                  isCorrect 
                    ? 'border-[#00C800]' 
                    : 'border-gray-200 dark:border-white/5'
                }`}
              >
                <div className="flex items-start gap-2 flex-1">
                  <span 
                    className={`font-semibold text-lg flex-shrink-0 self-center text-gray-600 dark:text-gray-300`}
                  >
                    {optionLetter}.
                  </span>
                  <textarea
                    value={editedOptions[opt.answerId] || ''}
                    onChange={(e) => handleOptionChange(opt.answerId, e.target.value)}
                    onFocus={() => handleOptionFocus(opt.answerId)}
                    className="flex-1 text-lg bg-transparent border-none outline-none text-gray-600 dark:text-gray-300 resize-none overflow-hidden"
                    placeholder={`Sửa ý ${optionLetter}`}
                    rows={calculateRows(editedOptions[opt.answerId] || '')}
                  />
                  
                  <button
                    onClick={() => handleOptionToggle(opt.answerId)}
                    className="self-center w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 hover:scale-[1.2] transition-all duration-200 cursor-pointer"
                    style={{
                      borderColor: isCorrect ? '#00C800' : 'rgba(0, 0, 0, 0.05)',
                      backgroundColor: isCorrect ? '#00C800' : 'transparent'
                    }}
                    aria-label={`Chọn đáp án ${optionLetter}`}
                  >
                    {isCorrect && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="2">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Textarea để viết giải thích */}
        <div className="mb-6">
          <div className="w-full p-6 rounded-2xl flex items-start border-2 hover:scale-[1.02] transition-all duration-200 border-[#8D7EF7]/50 hover:border-[#8D7EF7] focus-within:border-[#8D7EF7]">
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Giải thích của bạn"
              className="flex-1 bg-transparent text-lg text-gray-600 dark:text-gray-300 focus:outline-none resize-none overflow-hidden placeholder:text-[#8D7EF7]/60"
              rows={calculateRows(explanation)}
            />
            {/* Button upload ảnh ở bên phải */}
            <button
              type="button"
              onClick={handleImageIconClick}
              className="self-center w-5 h-5 rounded-md border-2 border-[#8D7EF7] flex items-center justify-center flex-shrink-0 hover:scale-[1.2] transition-all duration-200 cursor-pointer"
              aria-label="Upload ảnh"
            >
              <img
                src="data:image/svg+xml,%3csvg%20width='19'%20height='13'%20viewBox='0%200%2019%2013'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20d='M1%2012L4.78955%207.11073C5.60707%206.05598%207.2086%206.08248%207.99077%207.16371L9.90958%209.81618C10.6961%2010.9034%2012.3249%2010.902%2013.1376%209.83413C13.9379%208.78234%2015.5359%208.7619%2016.3363%209.81369L18%2012'%20stroke='%238D7EF7'%20stroke-width='2'%20stroke-linecap='round'/%3e%3ccircle%20cx='15'%20cy='3'%20r='2'%20stroke='%238D7EF7'%20stroke-width='1.5'/%3e%3c/svg%3e"
                alt="Upload ảnh"
                className="w-4 h-4"
              />
            </button>
          </div>
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
            <div className="mt-6 flex justify-center">
              <div className="relative inline-block">
                <div className="w-full max-w-sm rounded-2xl overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-auto object-contain"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 p-1 bg-white dark:bg-gray-800 shadow-md rounded-full hover:scale-150 transition-all duration-200"
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
                      strokeWidth={3}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer với nút submit - fixed ở dưới cùng */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col items-center">
        {submitError && (
          <div className="text-red-500 text-sm text-center px-4 mb-2">
            {submitError}
          </div>
        )}
        {submitSuccess && (
          <div className="text-green-500 text-sm text-center px-4 mb-2">
            Thanks bro! Quiz sẽ duyệt lại trong hôm nay
          </div>
        )}
        <div 
          className="relative"
          onMouseEnter={() => {
            if (!explanation.trim() || isSubmitting) {
              setShowTooltip(true);
            }
          }}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <button
            ref={buttonRef}
            onClick={handleSubmit}
            disabled={!explanation.trim() || isSubmitting}
            className="px-10 py-4 rounded-full text-white text-lg font-semibold tracking-wider transition-all duration-200 bg-[#00C800] hover:scale-110 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-2xl"
          >
            {isSubmitting ? 'Đang gửi...' : 'GỬI'}
          </button>
          {showTooltip && (!explanation.trim() || isSubmitting) && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 
            px-4 py-2 bg-[#8D7EF7] text-white text-md rounded-full whitespace-nowrap z-50">
              Viết giải thích giùm Quiz zới nha ^o^
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FixErrorPanel;

