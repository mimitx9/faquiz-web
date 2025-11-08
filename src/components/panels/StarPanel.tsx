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
  const inputRef = useRef<HTMLInputElement>(null);
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="bg-white dark:bg-black border-l border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 h-full">
      {/* Header của panel */}
      <div className="flex items-center justify-between px-4 py-4">
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

      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-700">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Image
              src="/quiz/Subtract.svg"
              alt="FA hack"
              width={150}
              height={31}
              className="object-contain mb-4 opacity-50"
            />
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Hỏi đáp về các câu hỏi trong đề thi
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">
              Ví dụ: "Giải thích câu hỏi số 1", "Tại sao đáp án A đúng?"
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
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="text-sm">
                        <Markdown content={message.content} />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {message.imageUrl && (
                          <div className="mb-2">
                            <img
                              src={message.imageUrl}
                              alt="Uploaded"
                              className="max-w-full h-auto rounded-lg"
                            />
                          </div>
                        )}
                        {message.content && (
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
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
      <div className="p-4 space-y-2">
        {/* Image preview */}
        {imagePreview && (
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-w-[200px] max-h-[200px] rounded-lg object-contain border-2 border-gray-200 dark:border-gray-700"
            />
            <button
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
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
        )}
        
        <div className="w-full p-6 rounded-2xl flex items-center border-2 hover:scale-[1.02] transition-all duration-200 border-[#0000000D] hover:border-[#8D7EF7] focus-within:border-[#8D7EF7]">
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
            className="mr-3 p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            aria-label="Chọn ảnh"
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
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </button>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Nhập câu hỏi của bạn..."
            disabled={isLoading}
            className="flex-1 bg-transparent text-lg text-gray-600 dark:text-gray-300 focus:outline-none placeholder:text-[#FF80F2] disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSendMessage}
            disabled={(!inputValue.trim() && !selectedImage) || isLoading}
            className="ml-3 p-2 rounded-full bg-[#FF80F21A] hover:bg-[#FF80F230] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            aria-label="Gửi tin nhắn"
          >
            <svg
              className="w-5 h-5 text-[#FF80F2] rotate-[60deg]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StarPanel;

