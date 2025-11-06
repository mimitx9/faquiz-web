'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import QuizHeader from '@/components/layout/QuizHeader';
import QuizResults from '@/components/ui/QuizResults';
import { quizBattleApiService } from '@/lib/api';
import { Question, CategoryInfo, SubCategoryInfo, QuestionOption } from '@/types';

const COMMENT_MESSAGE_SUCCESS = [
  'Tuyệt cú mèo',
  'Giỏi ghê',
  'Mê chữ ê kéo dài',
  'Ỏ giỏi đấy',
  'Hảo hảo',
  'Dễ như ăn bánh',
  'Mấy câu này tuổi gì',
  'Ơ mây zing',
  'Phenomenal!!!',
  'Spectacular!!!',
  'Oăn đờ phu',
  'Really?',
  'Thật không thể tin được',
  'Có khiếu quá',
  'Nghệ cả củ',
  'Dăm ba cái câu hỏi',
  'Khéo quá',
  'Giỏi nha bây',
  'Ăn gì giỏi thế',
  'Chuẩn không cần chỉnh',
  'Good job!',
  'Congratulation!',
  'Marvelous!!!',
  'Fabulous!!!',
  'Bravo~',
  'I love you',
  'Giỏi!',
  'Tiếp tục nào!',
  'Chiến tích',
  'Bứt phá hơn đê',
  'Còn nhiều câu khó hơn cơ!',
  'Được quá nhỉ',
  'Có ai bảo bạn giỏi chưa?',
  'Hâm mộ ghê cơ',
  'Tiến thêm bước nữa nào!',
  'Não săn chắc phết nhể',
  'Mê rồi nha chế',
  'Bạn giỏi thật chứ đùa',
  'Quá giỏi',
  'Công nhận chiến tích',
  'Tuyệt quá',
  'Quá đã~',
  'Khen nhiều hơi mệt nha!',
  'MVP',
  'Victory',
  'Ngon lành!',
  'Nâng cấp TK thì khen tiếp',
  'Bro được đấy',
  'Ngon zai',
  'Mận ổi cóc xoài mía quá',
  'Nice job! I\'m impressed!',
  'Stick with it',
  'Giỏi quá vỗ tay bép bép',
  'Gút chóp bạn hiền!!!!',
  'Mười điểm, làm tiếp!!!!',
  'Xuất sắc quá cơ!!!',
  'Gia đình tự hào về bạn!!',
  'Bạn xuất sắc hơn 90% người rồi đấy!',
  'Hảo!!!',
  'Tuyệt vời ông mặt trời!',
  'Đỉnh đỉnh!!',
  'Đỉnh của chópppp',
  'Xuất sắc luôn!!!!',
  '3 phần xuất sắc 7 phần như 3',
  'Âyya, lại trả lời chính xác rồi!!!',
  'Tổ quốc tin bạn, phát huy tiếp nàooo',
  'Không còn từ nào để khen nữa cơ!!',
  'Lại đỉnh rồiii!!!',
  'Bingo!!!',
  'Tuyệt!!!',
  'Chúc mừng!!! Lại đúng rồiiii!',
  'Chất lừ luôn',
  'Sao giỏi quá zậy?',
  'Quá là vip pro luôn bạn eiii',
  'Chất như nước cất',
  'Hết nước chấmmm',
  'Quá là xuất sắc',
  'Đỉnh của đỉnh',
  'Hay quá bạn ơi',
  'Xịn xò con bò luôn',
  'Rất chi là siêu cấp vũ trụ',
  'Học kiểu này ai theo kịp bạn',
  'Năng suất quá bạn ơii',
  'Này có nhằm nhò gì nhở?',
  'Chất hơn bạn ơi',
  'Sao giỏi quá đê',
  'Tuyêt vời ông mặt trời',
  'Xịn vậy luôn',
  'Đúng là học vì đam mê, giỏi quá!',
  'Hơn cả giỏi, bạn quá đỉnh',
  'Sự nỗ lực này xứng đáng được công nhận',
  'Cứ hơi bị xịn xò í nhở',
  'Giỏi vậy ai dám chê',
  'Tưởng giỏi ai dè giỏi thật',
  'Nhìn vậy mà cũng giỏi phết ha',
  'Sao nay giỏi vậy?',
  'Úi, một sinh viên chất lừ',
  'Well done!',
  'Ngưỡng mộ quá!!!',
  'Sao lại có người giỏi như vậy cơ!!!',
  'Xứng đáng có 10 người yêu!!!',
  'Học bổng trong tay rồi!!!',
  'Ngầu!!!',
  'Chất quá!!!',
  'Chất như nước cất luôn!!!',
  'Thành công không xa!!!',
  'Dáng vẻ này mình thích lắm',
  'Lắm khi thấy bạn đỉnh vậy',
  'Giỏi thật chứ đùa',
  'Không thể tin được',
  'Ấn tượng điểm số của bạn',
  'Wao, 1 vẻ đẹp tri thức',
  'Giỏi quá cơ',
  'Rất đáng để nể phục',
  'Không giỏi đời không nể',
  'Bạn giỏi hơn khối người rồi đó',
  'Duy trì phong độ này nhé',
  'Giỏi thế!',
  'Wao, sáng mắt luôn',
  '1 điểm số ấn tượng',
  'Chiến luôn',
  'Không gì làm khó được bạn',
  'Câu tiếp theo!!!'
];

const COMMENT_MESSAGE_FAILED = [
  'Cố chút xíu nữa nào!',
  'Suy nghĩ kĩ nhé',
  'Hơi sai tí thui!',
  'Thất bại là mẹ thất bại',
  'Defeat',
  'Hồi máu nhanh',
  'Quên không dùng não rồi',
  'Đừng vội vã',
  'Cẩn trọng hơn nhé',
  'Đừng bị mắc bẫy',
  'Suy luận tí đê',
  'Chọn bừa à?',
  'Ê bạn chán tôi rồi à?',
  'Làm đúng tui iu bạn luôn',
  'Đừng sai nữa em mệt rồi',
  'Alo sai dữ vậy cha nội',
  'Có muốn đi học nữa không?',
  'Học, học nữa, học lại',
  'Làm sai nữa tui buồn á',
  'Eo sai kìa',
  'Chê!',
  'N.G.U',
  'Ai cũng đều có sai lầm',
  'Never bend your head',
  'Hang tough!',
  'Hang in there!',
  'Gắng lên nào!',
  'Không phải lúc chơi đâu',
  'Khổ trước sướng sau',
  'Sai nhiều mới đúng được',
  'Do the best you can',
  'Cố hết sức chưa đấy!',
  'Hơi hóc búa với bạn rùi',
  'Bước thêm bước nữa nào',
  'Đừng từ bỏ nhé!',
  'Luyện tập thêm nào',
  'It will be okay',
  'Bạn giỏi mà, cố lên!',
  'Come on, you can do it!',
  'Chán quá thì chat với tui',
  'Thử lại lần nữa xem',
  'Không khó lắm đâu, thề!',
  'Ai chả có sai lầm~',
  'Ai cũng sai câu này, đừng lo',
  'Tặng cái ôm động viên nè!',
  'Keep going',
  'Hói đầu chưa bây?',
  'Không dễ đâu cưng',
  'Nuốt không trôi',
  'Đừng dừng lại',
  'Tiếp tục đi nào',
  'Sắp giỏi dồi',
  'Quiz tôi xin chửi vào mặt bạn',
  'Bạn tệ :))',
  '0 điểm về chỗ!!!',
  'Câu dễ thế cơ mà, chê!!!',
  'Quiz từ chối nhận người quen:)',
  'Không sao, cố thêm lần nữa !!',
  'Chê :))))',
  'Lại sai cơ!!.',
  'Quiz cạn ngôn :)',
  'Còn sai nữa là xuống đáy BXH rồi!!!',
  'Đúng hộ Quiz 1 nữa câu thôi nào!!',
  '10 phần bất an về điểm thi của bạn!!',
  'Âyya, biết ngay lại sai mà!!!',
  'Vẫn chưa đến nổi tuyệt vọng!!!',
  'Không còn gì để chê :))',
  'Vẫn chưa đến nổi phải tuyệt vọng!!!',
  'Cố lên rồi sẽ sai tiếp!!!',
  'Ngáo àaaa',
  'Chia buồn! Lại sai rồi!!',
  'sai câu nữa là còn đúng cái nịt',
  'U là trời, dễ thế mà sai à',
  'Làm sai lại đổ lỗi xu cà na chứ gì',
  'Sai thêm câu nữa là về chăn bò',
  'Gòi xong, phí tiền đi học',
  'Stupid như pò',
  'Chánnnn',
  'Nhục quá bạn đê!',
  'Sai quài vậy bạn',
  'Sai vừa thôi, để phần người khác với',
  'Đích còn dài mà cứ lẹt đẹt vậy luôn',
  'Học tài thi phận, lận đận thì thi lại đê',
  'Tầm này về quê nuôi cá là vừa',
  'Nào mới chịu thể hiện đây',
  'Sao nay tệ vậy?',
  'Haizzz, chả thèm care',
  'Học hành đàng hoàng cái coi',
  'Mất nửa cái linh hồn khi thấy điểm của bạn',
  'Xịn xò đành nhường cho người khác',
  'Chúc bạn may mắn lần sau',
  'Coi như lần này xui',
  'Lần này coi như nháp',
  'Nháp vừa vừa thuii',
  'Thui đừng nháp nữa',
  'Nữa, lại tệ nữa',
  'Được rồi, xin người làm đàng hoàng cái coi',
  'Học vậy mà tính đi ngủ luôn',
  'Thật là uổng công bame kì vọng :(',
  'Thất vọng quá đi!!!',
  'Xứng đáng Ế đến già!!!',
  'Qua môn còn xa quá!!!',
  'Sầu!!!!',
  'Chán thế!!!',
  'Úp mặt vào tường tự kiểm điểm đê!!',
  'Thất bại là mẹ thành công!!',
  'Đọc đề không vậy?',
  'Làm thàm đúng hem?',
  'Cẩn thận chút đi bạn',
  '10 điểm, nhưng 10 điểm cho người ta',
  'Nỗ lực thêm bạn ơi',
  'Học năng suất lên nào',
  'Đừng chỉ nói suông, hãy hành động đê',
  'Chịu luôn, rất tệ',
  'Lần sau phải bức phá hơn',
  'Lần sau hết mình nha',
  'Cần sự bức phá hơn ở bạn',
  'Nỗ lực thêm chút nào',
  'Đừng quá lo, lần sau bạn sẽ tốt hơn',
  'Thử sức thêm lần nữa nào',
  'Tệ quá nghe',
  'Khó chút đã lụi hẻ?',
  'Làm lại thôi chờ chi!!'
];

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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true); // Mặc định collapsed
  const [questionMessages, setQuestionMessages] = useState<Record<number, string>>({}); // Lưu message cho mỗi câu hỏi
  const [isSubmitted, setIsSubmitted] = useState(false); // Trạng thái đã nộp bài
  const [startTime, setStartTime] = useState<number | null>(null); // Thời gian bắt đầu làm bài
  const [timeSpent, setTimeSpent] = useState<number>(0); // Thời gian đã làm bài (giây)
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // Ref để clear interval
  const [essayResults, setEssayResults] = useState<Record<number, boolean>>({}); // Lưu kết quả chấm điểm tự luận
  const [isGradingEssay, setIsGradingEssay] = useState<Record<number, boolean>>({}); // Lưu trạng thái đang chấm điểm tự luận
  const [showSubmitButton, setShowSubmitButton] = useState(true); // Hiển thị nút nộp bài
  const lastScrollY = useRef(0); // Lưu vị trí scroll trước đó

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
        
        // Bắt đầu đếm thời gian khi tải xong câu hỏi
        setStartTime(Date.now());
        
      } catch (e: any) {
        console.error(e);
        // Kiểm tra HTTP status code 403 và mã lỗi 40300401 - yêu cầu thanh toán
        if (e.response?.status === 403 && e.response?.data?.meta?.code === 40300401) {
          // Redirect trực tiếp đến trang upgrade
          router.push('/upgrade');
          return;
        } else {
          setError('Không thể tải câu hỏi, vui lòng thử lại.');
        }
      } finally {
        setLoading(false);
      }
    };
    loadQuestions();
  }, [slugParam]);

  // Đếm thời gian làm bài
  useEffect(() => {
    if (startTime && !isSubmitted && !loading) {
      intervalRef.current = setInterval(() => {
        setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [startTime, isSubmitted, loading]);

  // Xử lý scroll để ẩn/hiện nút nộp bài
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Nếu scroll xuống (scrollY tăng) thì ẩn, scroll lên (scrollY giảm) thì hiện
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setShowSubmitButton(false);
      } else if (currentScrollY < lastScrollY.current) {
        setShowSubmitButton(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      
      // Kiểm tra xem đã verify chưa và set message
      const newSet = new Set(set);
      const verified = correctAnswerCount > 0 && newSet.size >= correctAnswerCount;
      if (verified && !questionMessages[questionId]) {
        const isCorrect = isAnswerCorrect(question, newSet);
        const message = getRandomMessage(isCorrect);
        setQuestionMessages(prev => ({ ...prev, [questionId]: message }));
      }
      
      return { ...prev, [questionId]: newSet };
    });
  };

  // Hàm chấm điểm tự luận bằng OpenAI
  const gradeEssay = async (questionId: number, question: Question, inputText: string) => {
    if (!inputText || inputText.trim().length === 0) {
      return;
    }

    if (!question.detailAnswer || question.detailAnswer.trim().length === 0) {
      console.warn('Không có đáp án mẫu để chấm điểm');
      return;
    }

    // Nếu đã chấm điểm rồi, không chấm lại
    if (essayResults[questionId] !== undefined) {
      return;
    }

    setIsGradingEssay(prev => ({ ...prev, [questionId]: true }));

    try {
      const response = await fetch('/api/grade-essay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          detailAnswer: question.detailAnswer,
          inputText: inputText.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Lỗi khi chấm điểm tự luận');
      }

      const data = await response.json();
      
      if (data.success) {
        setEssayResults(prev => ({ ...prev, [questionId]: data.isCorrect }));
        
        // Set message cho câu hỏi tự luận
        if (!questionMessages[questionId]) {
          const message = getRandomMessage(data.isCorrect);
          setQuestionMessages(prev => ({ ...prev, [questionId]: message }));
        }
      }
    } catch (error) {
      console.error('Error grading essay:', error);
    } finally {
      setIsGradingEssay(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const handleEssayChange = (questionId: number, value: string) => {
    setTextAnswers(prev => ({ ...prev, [questionId]: value }));
    
    // Clear kết quả và message cũ nếu người dùng đang sửa lại
    if (essayResults[questionId] !== undefined) {
      setEssayResults(prev => {
        const newResults = { ...prev };
        delete newResults[questionId];
        return newResults;
      });
      setQuestionMessages(prev => {
        const newMessages = { ...prev };
        delete newMessages[questionId];
        return newMessages;
      });
    }
  };

  // Handler khi user nhấn Enter hoặc click icon gửi
  const handleEssaySubmit = (questionId: number, question: Question) => {
    const inputText = textAnswers[questionId] || '';
    if (inputText.trim().length > 0) {
      gradeEssay(questionId, question, inputText);
    }
  };

  // Handler cho Enter key trong textarea
  const handleEssayKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, questionId: number, question: Question) => {
    // Shift + Enter để xuống dòng mới, Enter để gửi
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEssaySubmit(questionId, question);
    }
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

  // Hàm kiểm tra xem câu tự luận đã được chấm điểm chưa
  const isEssayVerified = (questionId: number) => {
    return essayResults[questionId] !== undefined;
  };

  // Hàm kiểm tra xem câu trả lời có đúng không
  const isAnswerCorrect = (question: Question, selectedAnswers: Set<number> | undefined) => {
    if (!selectedAnswers || !question.options) return false;
    
    const correctAnswerIds = new Set(
      question.options.filter(opt => opt.isCorrect).map(opt => opt.answerId)
    );
    
    // Kiểm tra xem số lượng đáp án đã chọn có bằng số đáp án đúng không
    if (selectedAnswers.size !== correctAnswerIds.size) return false;
    
    // Kiểm tra xem tất cả đáp án đã chọn có đúng không
    for (const answerId of selectedAnswers) {
      if (!correctAnswerIds.has(answerId)) return false;
    }
    
    return true;
  };

  // Hàm random message dựa trên đúng/sai
  const getRandomMessage = (isCorrect: boolean): string => {
    const messages = isCorrect ? COMMENT_MESSAGE_SUCCESS : COMMENT_MESSAGE_FAILED;
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
  };

  // Hàm render icon verify dựa trên trạng thái chọn và đúng/sai
  const renderVerifyIcon = (
    option: QuestionOption, 
    selectedAnswers: Set<number> | undefined,
    isVerified: boolean
  ) => {
    // Chỉ hiển thị icon khi đã verify (đã chọn đủ số lượng bằng số đáp án đúng)
    if (!isVerified) return null;

    // Nếu option này là đáp án đúng (isCorrect = true), hiển thị icon check (xanh)
    if (option?.isCorrect) {
      return (
        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200" style={{backgroundColor: '#41C911'}}>
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="2">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      );
    } 
    // Nếu user chọn option này nhưng option này không đúng (isCorrect = false), hiển thị icon X (cam)
    else if (selectedAnswers?.has(option.answerId) && !option?.isCorrect) {
      return (
        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200" style={{backgroundColor: '#E05B00'}}>
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="2">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      );
    }
    return null;
  };

  // Hàm tính toán border color cho option
  const getBorderColor = (
    option: QuestionOption, 
    selectedAnswers: Set<number> | undefined,
    isVerified: boolean
  ) => {
    // Nếu đã verify, đáp án đúng luôn hiển thị border màu xanh
    if (isVerified && option?.isCorrect) {
      return '#00C800';
    }
    
    // Nếu đã chọn option này, border sẽ giống textColor
    if (selectedAnswers?.has(option.answerId)) {
      // Nếu đã verify nhưng không phải đáp án đúng (đã xử lý ở trên), border màu cam
      if (isVerified) {
        return '#EC5300';
      }
      // Nếu chưa verify nhưng đã chọn, dùng màu mặc định cho border khi chọn
      return '#8D7EF7'; // Màu tím khi đã chọn nhưng chưa verify
    }
    
    // Mặc định khi chưa chọn
    return 'rgba(0, 0, 0, 0.05)';
  };

  // Hàm tính toán text color cho option (giống với border color khi đã verify)
  const getTextColor = (
    option: QuestionOption, 
    selectedAnswers: Set<number> | undefined,
    isVerified: boolean
  ) => {
    // Nếu đã verify
    if (isVerified) {
      // Nếu option này là đáp án đúng, text màu xanh
      if (option?.isCorrect) {
        return '#00C800';
      }
      
      // Nếu user chọn option này nhưng sai, text màu cam
      if (selectedAnswers?.has(option.answerId) && !option?.isCorrect) {
        return '#EC5300';
      }
    }
    
    // Nếu đã chọn nhưng chưa verify, text màu tím
    if (selectedAnswers?.has(option.answerId) && !isVerified) {
      return '#8D7EF7';
    }
    
    // Mặc định
    return undefined;
  };

  // Hàm tính toán số câu đúng
  const calculateCorrectAnswers = (): number => {
    let correctCount = 0;
    
    questions.forEach((question) => {
      if (isEssay(question)) {
        // Đối với câu hỏi tự luận, kiểm tra kết quả chấm điểm từ OpenAI
        const essayResult = essayResults[question.questionId];
        if (essayResult === true) {
          correctCount++;
        }
      } else {
        const selectedAnswers = multiAnswers[question.questionId];
        if (selectedAnswers && isAnswerCorrect(question, selectedAnswers)) {
          correctCount++;
        }
      }
    });
    
    return correctCount;
  };

  // Handler nộp bài
  const handleSubmit = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsSubmitted(true);
    // Tính toán thời gian cuối cùng
    if (startTime) {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
    }
  };

  // Handler làm lại bài
  const handleRetry = () => {
    setIsSubmitted(false);
    setTextAnswers({});
    setMultiAnswers({});
    setQuestionMessages({});
    setEssayResults({});
    setIsGradingEssay({});
    setStartTime(Date.now());
    setTimeSpent(0);
  };

  // Sử dụng dữ liệu từ API
  const categoryTitle = category?.title || 'Đề thi thử';
  const categoryBackgroundColor = category?.backgroundColor || '#3B82F6';
  const subcategoryTitle = subCategory?.title || 'Đề thi thử';

  // Handler khi hết giờ đếm ngược
  const handleTimerExpired = () => {
    if (!isSubmitted) {
      handleSubmit();
    }
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

  // Hiển thị màn hình kết quả khi đã nộp bài
  if (isSubmitted) {
    const correctAnswers = calculateCorrectAnswers();
    return (
      <div className="min-h-screen bg-white">
        <QuizHeader 
          totalQuestions={questions.length}
          onTimerExpired={handleTimerExpired}
        />
        <QuizResults
          totalScore={correctAnswers}
          totalQuestions={questions.length}
          timeSpent={timeSpent}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  // Hàm render một câu hỏi
  const renderQuestion = (question: Question, index: number) => {
    const questionIsEssay = isEssay(question);
    const selectedAnswers = multiAnswers[question.questionId];
    const verified = questionIsEssay 
      ? isEssayVerified(question.questionId)
      : isVerified(question, selectedAnswers);
    const isAnswered = verified;
    const message = questionMessages[question.questionId];
    const isCorrect = questionIsEssay
      ? essayResults[question.questionId] ?? null
      : (verified ? isAnswerCorrect(question, selectedAnswers) : null);
    const isGrading = isGradingEssay[question.questionId] || false;
    const hasTextAnswer = textAnswers[question.questionId] && textAnswers[question.questionId].trim().length > 0;

    return (
      <div className="p-8 mb-6">
        <span className="text-xl font-bold" style={{ color: '#0000001A' }}>
            Câu {index + 1}
        </span>

        <h2 className="text-lg font-semibold text-gray-800 mt-3 mb-6">
          {question.question}
        </h2>

        {/* Hiển thị message khi đã verify */}
        {verified && message && (
          <div className="mb-6">
            <p 
              className="text-lg font-bold"
              style={{ 
                color: isCorrect ? '#00C800' : '#EC5300' 
              }}
            >
              {message}
            </p>
          </div>
        )}

        {/* Hiển thị trạng thái đang chấm điểm tự luận */}
        {questionIsEssay && isGrading && (
          <div className="mb-4">
            <p className="text-lg text-gray-500 italic">
              Đang chấm...
            </p>
          </div>
        )}

        {/* Quote giải thích tham khảo */}
        {verified && (question.detailAnswer && question.detailAnswer.trim().length > 0) && (
          <div className="mb-6">
            <div className="flex items-start gap-3">
              <div className="w-1.5 self-stretch" style={{ backgroundColor: '#8D7EF7' }} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-sm mb-2">
                    <span className="font-semibold" style={{ color: '#8D7EF7' }}>Quiz thông thái</span>
                    <span className="opacity-30" style={{ color: '#8D7EF7' }}>&nbsp; › &nbsp;Giải thích tham khảo</span>
                  </div>
                </div>
                <div className="text-gray-800 leading-relaxed text-lg">
                  {question.detailAnswer}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hiển thị ảnh nếu có */}
        {question.extraData?.image && (
          <div className="mb-6 flex justify-center">
            <div className="relative w-full max-w-2xl aspect-video">
              <Image
                src={question.extraData.image}
                alt="Câu hỏi"
                fill
                className="object-contain rounded-lg shadow-sm"
                onError={(e) => {
                  console.error('Failed to load image:', question.extraData?.image);
                  e.currentTarget.style.display = 'none';
                }}
                loading="lazy"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 672px"
                quality={85}
              />
            </div>
          </div>
        )}

        {questionIsEssay ? (
          <div className="relative">
            <textarea
              className={`w-full border rounded-lg p-3 min-h-[140px] pr-12}`}
              placeholder="Nhập câu trả lời... (Nhấn Enter hoặc click icon để gửi)"
              value={textAnswers[question.questionId] || ''}
              onChange={(e) => handleEssayChange(question.questionId, e.target.value)}
              onKeyDown={(e) => handleEssayKeyDown(e, question.questionId, question)}
              disabled={verified || isGrading}
              style={{
                borderColor: verified 
                  ? (isCorrect ? '#00C800' : '#EC5300')
                  : 'rgba(0, 0, 0, 0.05)'
              }}
            />
            {/* Icon gửi */}
            {!verified && hasTextAnswer && !isGrading && (
              <button
                onClick={() => handleEssaySubmit(question.questionId, question)}
                className="absolute top-3 right-3 p-2 rounded-full transition-all duration-200 hover:opacity-80"
                aria-label="Gửi câu trả lời"
                style={{ backgroundColor: '#8D7EF7' }}
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            )}
            {/* Hiển thị icon kết quả cho câu tự luận */}
            {verified && (
              <div className="absolute top-3 right-3">
                {isCorrect ? (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200" style={{backgroundColor: '#41C911'}}>
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="2">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200" style={{backgroundColor: '#E05B00'}}>
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="2">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {question.options?.map((opt, idx) => {
              const correctAnswerCount = getCorrectAnswerCount(question);
              const optionLetter = String.fromCharCode(65 + idx);
              const borderColor = getBorderColor(opt, selectedAnswers, verified);
              const textColor = getTextColor(opt, selectedAnswers, verified);
              
              return (
                <button
                  key={opt.answerId}
                  onClick={() => handleSelectOption(question.questionId, opt.answerId, question)}
                  disabled={isAnswered}
                  className={`w-full text-left p-6 rounded-2xl flex items-center justify-between bg-white border-2 transition-all duration-200 ${
                    isAnswered 
                      ? 'cursor-pointer' 
                      : 'cursor-pointer hover:bg-gray-50 hover:scale-[1.02]'
                  }`}
                  style={{
                    borderColor: (verified && opt?.isCorrect) 
                      ? '#00C800' // Đáp án đúng khi đã verify luôn có border xanh
                      : (selectedAnswers?.has(opt.answerId) && textColor 
                        ? textColor 
                        : (borderColor || '#E5E7EB'))
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg text-gray-600" style={textColor ? { color: textColor } : undefined}>{optionLetter}.</span>
                    <span className="text-lg" style={textColor ? { color: textColor } : undefined}>{opt.text}</span>
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
      <QuizHeader 
        totalQuestions={questions.length}
        onTimerExpired={handleTimerExpired}
      />
      <main className="pt-20 bg-white relative">
        {/* Nút expand sidebar khi collapsed - cố định ở góc trái */}
        {isSidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="fixed left-4 top-24 p-2 hover:scale-110 rounded transition-all z-40 duration-300"
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
        )}

        {/* Sidebar cố định bên trái */}
        {!isSidebarCollapsed && (
          <div className="fixed left-0 top-20 w-[280px] lg:w-[320px] h-[calc(100vh-5rem)] flex flex-col bg-white z-30">
            {/* Header với category title và nút collapse */}
            <div className="flex items-center justify-between pl-8 pr-0 py-5">
              <div className="flex items-center gap-2">
                <h2 
                  className="text-sm font-semibold"
                  style={{ color: categoryBackgroundColor }}
                >
                  {categoryTitle}
                </h2>
                <p 
                className="text-sm opacity-30"
                style={{ color: categoryBackgroundColor }}
              >
               &nbsp; › &nbsp;{subcategoryTitle}
              </p>
              </div>
              <button
                onClick={toggleSidebar}
                aria-label="Thu gọn sidebar"
                className="hover:scale-110 rounded transition-all duration-300"
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
                    ? (textAnswers[q.questionId] !== undefined && textAnswers[q.questionId] !== '') && essayResults[q.questionId] !== undefined
                    : multiAnswers[q.questionId] !== undefined && multiAnswers[q.questionId].size > 0;

                  return (
                    <button
                      key={q.questionId}
                      onClick={() => {
                        // Scroll đến câu hỏi tương ứng trên toàn trang
                        const element = document.getElementById(`question-${q.questionId}`);
                        if (element) {
                          const yOffset = -100; // 100px offset từ top
                          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
                          window.scrollTo({ top: y, behavior: 'smooth' });
                        }
                      }}
                      className="w-full flex items-center gap-2 p-4 rounded-xl transition-colors hover:bg-gray-50"
                    >
                      <div
                        className={`w-2 h-2 rounded-full mr-4 ${
                          isAnswered
                            ? 'bg-green-500'
                            : 'bg-gray-100'
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
          </div>
        )}

        {/* Content area với margin để tránh bị che bởi sidebar */}
        <div className={`transition-all duration-300 ${!isSidebarCollapsed ? 'ml-[280px] lg:ml-[320px]' : ''}`}>
          <div className="max-w-6xl mx-auto">
            <div className="p-8">
              {/* Danh sách tất cả câu hỏi - scroll được */}
              <div id="questions-scroll-container">
                {questions.map((question, index) => (
                  <div id={`question-${question.questionId}`} key={question.questionId}>
                    {renderQuestion(question, index)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Nút nộp bài floating ở bottom center */}
        <button
          onClick={handleSubmit}
          aria-label="Nộp bài"
          className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 px-8 py-4 rounded-full text-white shadow-2xl transition-all hover:scale-110 duration-300 z-50 tracking-wide ${
            showSubmitButton 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
          style={{ backgroundColor: '#8D7EF7' }}
        >
          <span className="text-lg font-semibold">Nộp Bài</span>
        </button>
      </main>
    </div>
  );
};

export default SubCategoryQuizPage;
