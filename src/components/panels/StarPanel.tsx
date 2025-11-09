'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Question, CategoryInfo, SubCategoryInfo } from '@/types';
import Markdown from '@/components/common/Markdown';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
}

interface StarPanelProps {
  onClose: () => void;
  questions: Question[];
  category: CategoryInfo | null;
  subCategory: SubCategoryInfo | null;
  initialMessage?: string | null;
}

const StarPanel: React.FC<StarPanelProps> = ({ onClose, questions, category, subCategory, initialMessage }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasSentInitialMessage = useRef(false);
  const autoSendTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasSentRef = useRef(false); // Đánh dấu đã gửi tin nhắn ban đầu

  // Auto scroll to bottom when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset flag khi initialMessage thay đổi hoặc panel đóng
  useEffect(() => {
    if (!initialMessage) {
      hasSentInitialMessage.current = false;
      hasSentRef.current = false;
      // Clear timer nếu có
      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
        autoSendTimerRef.current = null;
      }
    } else if (initialMessage && !hasSentInitialMessage.current) {
      // Set inputValue và đánh dấu đã set
      hasSentInitialMessage.current = true;
      hasSentRef.current = false; // Reset flag gửi
      setInputValue(initialMessage);
    }
  }, [initialMessage]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Vui lòng chọn file ảnh');
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Kích thước ảnh không được vượt quá 10MB');
        return;
      }
      setSelectedImage(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Tạo hàm gửi tin nhắn với useCallback để có thể sử dụng trong useEffect
  const handleSendMessage = useCallback(async () => {
    if ((!inputValue.trim() && !selectedImage) || isLoading) return;

    // Clear timer tự động gửi nếu user gửi trước
    if (autoSendTimerRef.current) {
      clearTimeout(autoSendTimerRef.current);
      autoSendTimerRef.current = null;
    }

    // Đánh dấu đã gửi để tránh gửi lại
    hasSentRef.current = true;

    const userMessage = inputValue.trim();
    const imageToSend = selectedImage;
    
    // Clear input and image
    setInputValue('');
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Reset textarea height về 1 dòng
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const lineHeight = parseInt(getComputedStyle(inputRef.current).lineHeight) || 24;
      inputRef.current.style.height = `${lineHeight}px`;
      inputRef.current.style.overflowY = 'hidden';
    }
    
    // Reset flag sau khi gửi tin nhắn ban đầu
    if (hasSentInitialMessage.current) {
      hasSentInitialMessage.current = false;
    }
    
    // Lưu conversation history trước khi thêm messages mới
    const conversationHistory = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
    
    // Add user message to chat
    const newUserMessage: ChatMessage = {
      role: 'user',
      content: userMessage || (imageToSend ? '[Đã gửi ảnh]' : ''),
      imageUrl: imagePreview || undefined,
    };
    
    // Tính index của AI message sau khi thêm cả user và AI message
    // User message sẽ ở index messages.length, AI message sẽ ở index messages.length + 1
    const aiMessageId = messages.length + 1;
    
    // Thêm cả user message và empty AI message cùng lúc
    setMessages(prev => [
      ...prev, 
      newUserMessage,
      {
        role: 'assistant',
        content: '',
      }
    ]);
    setIsLoading(true);

    try {
      // Prepare questions data for API
      const questionsData = questions.map(q => ({
        questionId: q.questionId,
        question: q.question,
        options: q.options?.map(opt => ({
          answerId: opt.answerId,
          text: opt.text,
          isCorrect: opt.isCorrect,
        })) || [],
        detailAnswer: q.detailAnswer,
      }));

      // Create FormData if image exists, otherwise use JSON
      const formData = new FormData();
      formData.append('userMessage', userMessage || '');
      formData.append('questions', JSON.stringify(questionsData));
      formData.append('categoryTitle', category?.title || '');
      formData.append('subCategoryTitle', subCategory?.title || '');
      formData.append('conversationHistory', JSON.stringify(conversationHistory));
      
      if (imageToSend) {
        formData.append('image', imageToSend);
      }

      // Get auth token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/star-chat', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Lỗi khi gửi câu hỏi');
      }

      // Xử lý stream response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Không thể đọc stream response');
      }

      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              setIsLoading(false);
              inputRef.current?.focus();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.error) {
                throw new Error(parsed.error);
              }

              if (parsed.content) {
                accumulatedContent += parsed.content;
                // Cập nhật message từng phần - tìm message AI rỗng cuối cùng
                setMessages(prev => {
                  const newMessages = [...prev];
                  // Tìm index của message AI rỗng cuối cùng
                  let lastEmptyAiIndex = -1;
                  for (let i = newMessages.length - 1; i >= 0; i--) {
                    if (newMessages[i].role === 'assistant' && newMessages[i].content === '') {
                      lastEmptyAiIndex = i;
                      break;
                    }
                  }
                  // Nếu tìm thấy, cập nhật; nếu không, thêm mới
                  if (lastEmptyAiIndex >= 0) {
                    newMessages[lastEmptyAiIndex] = {
                      role: 'assistant',
                      content: accumulatedContent,
                    };
                  } else if (aiMessageId < newMessages.length) {
                    newMessages[aiMessageId] = {
                      role: 'assistant',
                      content: accumulatedContent,
                    };
                  }
                  return newMessages;
                });
              }
            } catch (e) {
              // Bỏ qua nếu không parse được JSON
            }
          }
        }
      }

      setIsLoading(false);
      inputRef.current?.focus();
    } catch (error: any) {
      // Add error message to chat - tìm message AI rỗng cuối cùng
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: error.message || 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.',
      };
      setMessages(prev => {
        const newMessages = [...prev];
        // Tìm index của message AI rỗng cuối cùng
        let lastEmptyAiIndex = -1;
        for (let i = newMessages.length - 1; i >= 0; i--) {
          if (newMessages[i].role === 'assistant' && newMessages[i].content === '') {
            lastEmptyAiIndex = i;
            break;
          }
        }
        // Nếu tìm thấy, cập nhật; nếu không, dùng aiMessageId
        if (lastEmptyAiIndex >= 0) {
          newMessages[lastEmptyAiIndex] = errorMessage;
        } else if (aiMessageId < newMessages.length) {
          newMessages[aiMessageId] = errorMessage;
        }
        return newMessages;
      });
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [inputValue, selectedImage, isLoading, messages, questions, category, subCategory, imagePreview]);

  // Tự động gửi tin nhắn khi inputValue được set từ initialMessage (phải đặt sau khi handleSendMessage được định nghĩa)
  useEffect(() => {
    // Clear timer cũ nếu có
    if (autoSendTimerRef.current) {
      clearTimeout(autoSendTimerRef.current);
      autoSendTimerRef.current = null;
    }

    if (initialMessage && inputValue === initialMessage && !isLoading && messages.length === 0 && hasSentInitialMessage.current && !hasSentRef.current) {
      // Đợi một chút để đảm bảo component đã render xong
      autoSendTimerRef.current = setTimeout(() => {
        if (!hasSentRef.current) {
          hasSentRef.current = true;
          handleSendMessage();
        }
        autoSendTimerRef.current = null;
      }, 300);
    }

    return () => {
      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
        autoSendTimerRef.current = null;
      }
    };
  }, [initialMessage, inputValue, isLoading, messages.length, handleSendMessage]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-resize textarea với max 2 dòng
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    
    // Reset height để tính toán lại
    e.target.style.height = 'auto';
    
    // Tính toán số dòng
    const lineHeight = parseInt(getComputedStyle(e.target).lineHeight) || 24;
    const maxHeight = lineHeight * 2; // 2 dòng
    const scrollHeight = e.target.scrollHeight;
    
    // Giới hạn ở 2 dòng
    if (scrollHeight <= maxHeight) {
      e.target.style.height = `${scrollHeight}px`;
      e.target.style.overflowY = 'hidden';
    } else {
      e.target.style.height = `${maxHeight}px`;
      e.target.style.overflowY = 'auto';
    }
  };

  return (
    <div className="flex flex-col transition-all duration-300 h-full bg-gray-100/60 dark:bg-white/5 relative">
      {/* Header của panel */}
      <div className="flex items-center justify-end px-4 py-4 dark:border-gray-800">
       
       <button
           onClick={onClose}
           className="p-2 hover:scale-150 transition-all duration-200"
           aria-label="Đóng panel"
         >
           <svg
             className="w-5 h-5 text-gray-600 dark:text-white/30"
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

      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-700">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Image
              src="/quiz/Subtract.svg"
              alt="FA hack"
              width={150}
              height={31}
              className="object-contain mb-4"
            />
            <p className="text-gray-500 dark:text-white/20 text-sm">
              Giải đáp thắc mắc đề thi
            </p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              // Chỉ hiển thị message nếu có nội dung hoặc là user message
              if (!message.content && message.role === 'assistant') {
                return null;
              }
              
              return (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] text-lg text-gray-800 dark:text-gray-200 ${
                      message.role === 'user'
                        ? 'bg-white dark:bg-white/10 rounded-3xl px-6 py-3 shadow-sm border border-gray-100 dark:border-white/10'
                        : 'bg-transparent px-4 py-3'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                        <Markdown content={message.content} />
                    ) : (
                      <div className="space-y-2">
                        {message.imageUrl && (
                          <div className="mb-2">
                            <img
                              src={message.imageUrl}
                              alt="Uploaded"
                              className="max-h-[60px] rounded-xl shadow-sm"
                            />
                          </div>
                        )}
                        {message.content && (
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {isLoading && messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1]?.content === '' && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input field ở dưới */}
      <div className="p-4 space-y-4">
        {/* Image preview */}
        {imagePreview && (
          <div className="flex justify-center">
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-[60px] rounded-xl shadow-sm object-contain"
              />
            <button
              onClick={handleRemoveImage}
              className="absolute -top-1 -right-2 p-0.5 bg-white dark:bg-gray-800 shadow-md rounded-full hover:scale-150 transition-all duration-200"
              aria-label="Xóa ảnh"
            >
              <svg
                className="w-3 h-3 opacity-50"
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
        
        <div className="w-full max-w-sm mx-auto
        bg-white dark:bg-white/5 rounded-3xl p-4 shadow-lg border border-gray-100 dark:border-white/5
        flex items-center transition-all duration-200 focus-within:shadow-none">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
            disabled={isLoading}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="mr-3 p-1 opacity-50 hover:opacity-100 transition-all flex-shrink-0"
            aria-label="Chọn ảnh"
          >
            <svg
              className="w-4 h-4 text-gray-600 dark:text-white/30"
              width="19"
              height="13"
              viewBox="0 0 19 13"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 12L4.78955 7.11073C5.60707 6.05598 7.2086 6.08248 7.99077 7.16371L9.90958 9.81618C10.6961 10.9034 12.3249 10.902 13.1376 9.83413C13.9379 8.78234 15.5359 8.7619 16.3363 9.81369L18 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle
                cx="15"
                cy="3"
                r="2"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </button>
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleTextareaChange}
            onKeyPress={handleKeyPress}
            placeholder="Viết câu hỏi"
            disabled={isLoading}
            rows={1}
            className="flex-1 bg-transparent text-lg text-gray-800 dark:text-gray-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed resize-none overflow-y-auto max-h-[3rem] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            style={{ minHeight: '1.5rem', lineHeight: '1.5rem' }}
          />
          <button
            onClick={handleSendMessage}
            disabled={(!inputValue.trim() && !selectedImage) || isLoading}
            className="ml-4 p-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            aria-label="Gửi"
          >
            <svg
              className="w-4 h-4 text-[#FF80F2]"
              width="20"
              height="18"
              viewBox="0 0 20 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M17.5436 0.892072C19.0975 0.879563 20.0714 2.56646 19.2837 3.90592L11.7367 16.738C10.8525 18.2414 8.60201 17.9717 8.09803 16.3021L7.03905 12.7937C6.6797 11.6032 7.09208 10.3144 8.07577 9.55366L12.4962 6.13506C12.7265 5.95691 12.5179 5.59555 12.2484 5.70597L7.08027 7.82378C5.92829 8.29584 4.60446 8.00736 3.75333 7.09879L1.2057 4.37923C0.0141876 3.1073 0.906414 1.026 2.6492 1.01197L17.5436 0.892072Z"
                fill="#FF80F2"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StarPanel;

