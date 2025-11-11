'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import Image from 'next/image';
import Markdown from '@/components/common/Markdown';
import { useParams, useRouter } from 'next/navigation';
import QuizHeader from '@/components/layout/QuizHeader';
import QuizResults from '@/components/ui/QuizResults';
import { quizBattleApiService, faquizApiService } from '@/lib/api';
import { Question, CategoryInfo, SubCategoryInfo, QuestionOption } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import StarPanel from '@/components/panels/StarPanel';
import PrintPanel from '@/components/panels/PrintPanel';
import ThreeDPanel from '@/components/panels/ThreeDPanel';
import KiemPanel from '@/components/panels/KiemPanel';
import FixErrorPanel from '@/components/panels/FixErrorPanel';
import DocumentsPanel from '@/components/panels/DocumentsPanel';
import UpgradeOverlay from '@/components/ui/UpgradeOverlay';
import { createTitleSlug } from '@/lib/utils';
import ProgressBar from '@/components/ui/ProgressBar';
import {
  trackQuizStart,
  trackQuizQuestionAnswer,
  trackQuizQuestionEssaySubmit,
  trackQuizSubmit,
  trackQuizRetry,
  trackQuizTimerExpired,
  trackQuizPanelOpen,
  trackQuizPanelClose,
  trackQuizImageZoom,
  trackQuizFixErrorSubmit,
  trackQuizTextHighlight,
  trackUpgradeOverlayShow,
} from '@/lib/analytics';

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
  const { theme } = useTheme();
  const { user } = useAuth();
  const slugParam = params?.subcategorySlug as string; // dạng: 763003-bo-xuong-he-co-cac-khop-phan-2

  const [questions, setQuestions] = useState<Question[]>([]);
  const [category, setCategory] = useState<CategoryInfo | null>(null);
  const [subCategory, setSubCategory] = useState<SubCategoryInfo | null>(null);
  const [subCategories, setSubCategories] = useState<SubCategoryInfo[]>([]); // Danh sách tất cả subcategories trong cùng category
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
  const [focusedEssayId, setFocusedEssayId] = useState<number | null>(null); // Lưu id của textarea đang focus
  const [zoomedImage, setZoomedImage] = useState<string | null>(null); // URL ảnh đang được zoom
  const [imageRotation, setImageRotation] = useState<number>(0); // Góc xoay của ảnh (độ)
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null); // Icon đang được hover
  const [activePanel, setActivePanel] = useState<'star' | 'print' | '3d' | 'kiem' | 'fix-error' | 'documents' | null>(null); // Panel đang được mở
  const [fixErrorQuestion, setFixErrorQuestion] = useState<Question | null>(null); // Câu hỏi đang được sửa lỗi
  const [initialStarMessage, setInitialStarMessage] = useState<string | null>(null); // Tin nhắn ban đầu cho StarPanel
  const [splitPanelWidth, setSplitPanelWidth] = useState<number>(33.33); // Width của split panel (% màn hình), mặc định 1/3 (33.33%)
  const [isResizing, setIsResizing] = useState(false); // Trạng thái đang resize
  const resizeStartX = useRef<number>(0); // Vị trí X khi bắt đầu resize
  const resizeStartWidth = useRef<number>(33.33); // Width khi bắt đầu resize
  const contentContainerRef = useRef<HTMLDivElement>(null); // Ref cho container content
  const scrollContainerRef = useRef<HTMLDivElement>(null); // Ref cho scroll container
  const [showUpgradeOverlay, setShowUpgradeOverlay] = useState(false); // Hiển thị overlay upgrade khi gặp câu hỏi rỗng
  const [showSuccessBadge, setShowSuccessBadge] = useState(false); // Hiển thị badge thành công
  const [selectedText, setSelectedText] = useState<string>(''); // Text đã được chọn
  const [selectionPosition, setSelectionPosition] = useState<{ top: number; left: number } | null>(null); // Vị trí của text được chọn
  const [selectedTextForSearch, setSelectedTextForSearch] = useState<string>(''); // Text để truyền vào search panel

  const isEssay = (question: Question) => {
    if (!question) return false;
    return !question.options || question.options.length <= 1;
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

  useEffect(() => {
    const loadQuestions = async () => {
      if (!slugParam) return;
      
      // Exclude system files and routes
      const systemRoutes = ['robot.txt', 'robots.txt', 'sitemap.xml', 'favicon.ico'];
      if (systemRoutes.includes(slugParam.toLowerCase())) {
        // Redirect robot.txt to robots.txt
        if (slugParam.toLowerCase() === 'robot.txt') {
          router.replace('/robots.txt');
          return;
        }
        // For other system files, redirect to home
        router.replace('/');
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        const res = await quizBattleApiService.getQuestionsBySubCategory({ slug: slugParam });
        const questionsData = res?.data?.questions || [];
        
        // Nếu không có câu hỏi, redirect về home
        if (questionsData.length === 0) {
          router.replace('/');
          return;
        }
        
        setQuestions(questionsData);
        
        // Set category và subcategory từ API response
        let currentCategory: CategoryInfo | null = null;
        if (res.data.category) {
          setCategory(res.data.category);
          currentCategory = res.data.category;
        }
        
        // Tìm subcategory hiện tại từ API response
        let currentSubCategory: SubCategoryInfo | null = null;
        if (res.data.subCategories && res.data.subCategories.length > 0) {
          // Tìm subcategory phù hợp với slug hoặc lấy đầu tiên
          currentSubCategory = res.data.subCategories.find(
            sub => sub.code === slugParam.split('-')[0] || slugParam.includes(sub.code)
          ) || res.data.subCategories[0];
          setSubCategory(currentSubCategory);
        }
        
        // Thiết lập danh sách subcategories từ API hiện tại để tránh gọi thừa slide-fast
        if (res.data.relatedSubCategories && res.data.relatedSubCategories.length > 0) {
          setSubCategories(res.data.relatedSubCategories);
        } else if (res.data.subCategories && res.data.subCategories.length > 0) {
          setSubCategories(res.data.subCategories);
        }
        
        // Bắt đầu đếm thời gian khi tải xong câu hỏi
        setStartTime(Date.now());
        
        // Track quiz start
        if (currentCategory && currentSubCategory && questionsData.length > 0) {
          trackQuizStart(
            currentSubCategory.code || '',
            currentSubCategory.title || '',
            currentCategory.code || '',
            currentCategory.title || '',
            questionsData.length
          );
        }
        
      } catch (e: any) {
        // Kiểm tra HTTP status code 403 và mã lỗi 40300401 - yêu cầu thanh toán
        if (e.response?.status === 403 && e.response?.data?.meta?.code === 40300401) {
          // Redirect trực tiếp đến trang upgrade
          router.push('/upgrade');
          return;
        } else if (e.response?.status === 404) {
          // Redirect về home khi gặp 404
          router.replace('/');
          return;
        } else {
          setError('Không thể tải câu hỏi, vui lòng thử lại.');
        }
      } finally {
        setLoading(false);
      }
    };
    loadQuestions();
  }, [slugParam, router]);

  // Redirect về home nếu không có câu hỏi sau khi load xong
  useEffect(() => {
    if (!loading && questions.length === 0 && slugParam) {
      router.replace('/');
    }
  }, [loading, questions.length, slugParam, router]);

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
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const currentScrollY = scrollContainer.scrollTop;
      
      // Luôn hiện nút khi ở đầu trang
      if (currentScrollY < 100) {
        setShowSubmitButton(true);
      } 
      // Nếu scroll xuống (scrollTop tăng) thì ẩn
      else if (currentScrollY > lastScrollY.current) {
        setShowSubmitButton(false);
      } 
      // Nếu scroll lên (scrollTop giảm) thì hiện
      else if (currentScrollY < lastScrollY.current) {
        setShowSubmitButton(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    // Khởi tạo giá trị ban đầu
    lastScrollY.current = scrollContainer.scrollTop;
    
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [questions.length]); // Re-run khi questions được load

  // Tự động collapse sidebar khi panel được mở
  useEffect(() => {
    if (activePanel !== null) {
      setIsSidebarCollapsed(true);
    }
  }, [activePanel]);

  // Xử lý text selection và highlight
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        setSelectedText('');
        setSelectionPosition(null);
        // Remove all highlight marks - khôi phục lại nội dung gốc với formatting
        const marks = document.querySelectorAll('mark.text-selection-highlight');
        marks.forEach(mark => {
          const parent = mark.parentNode;
          if (parent) {
            // Tạo document fragment chứa tất cả nội dung của mark (bao gồm các element con)
            const fragment = document.createDocumentFragment();
            while (mark.firstChild) {
              fragment.appendChild(mark.firstChild);
            }
            parent.replaceChild(fragment, mark);
            parent.normalize();
          }
        });
        return;
      }

      const range = selection.getRangeAt(0);
      const selectedTextContent = selection.toString().trim();

      // Chỉ xử lý nếu text được chọn có nội dung và nằm trong phần câu hỏi hoặc đáp án
      if (selectedTextContent.length > 0) {
        const container = scrollContainerRef.current;
        if (!container) return;

        // Kiểm tra xem selection có nằm trong container không
        const containerRect = container.getBoundingClientRect();
        const selectionRect = range.getBoundingClientRect();

        // Kiểm tra xem selection có nằm trong button không - không cho highlight trong button
        const commonAncestor = range.commonAncestorContainer;
        let currentNode: Node | null = commonAncestor.nodeType === Node.TEXT_NODE 
          ? commonAncestor.parentNode 
          : commonAncestor as Node;
        
        while (currentNode && currentNode !== document.body) {
          if (currentNode.nodeType === Node.ELEMENT_NODE) {
            const element = currentNode as HTMLElement;
            // Không cho highlight trong button, input, hoặc các interactive elements
            if (element.tagName === 'BUTTON' || 
                element.tagName === 'INPUT' || 
                element.tagName === 'TEXTAREA' ||
                element.closest('button') ||
                element.closest('input') ||
                element.closest('textarea')) {
              setSelectedText('');
              setSelectionPosition(null);
              return;
            }
          }
          currentNode = currentNode.parentNode;
        }

        // Kiểm tra xem selection có nằm trong phần câu hỏi hoặc đáp án không
        const questionElements = container.querySelectorAll('[id^="question-"]');
        let isInQuestionOrAnswer = false;
        let currentQuestionId: number | null = null;
        
        questionElements.forEach((questionEl) => {
          const questionRect = questionEl.getBoundingClientRect();
          if (
            selectionRect.top >= questionRect.top &&
            selectionRect.bottom <= questionRect.bottom &&
            selectionRect.left >= questionRect.left &&
            selectionRect.right <= questionRect.right
          ) {
            isInQuestionOrAnswer = true;
            // Lấy questionId từ id attribute (format: "question-{questionId}")
            const questionIdMatch = questionEl.id.match(/^question-(\d+)$/);
            if (questionIdMatch) {
              currentQuestionId = parseInt(questionIdMatch[1], 10);
            }
          }
        });

        if (!isInQuestionOrAnswer) {
          setSelectedText('');
          setSelectionPosition(null);
          return;
        }

        // Remove existing highlights - khôi phục lại nội dung gốc với formatting
        const existingMarks = document.querySelectorAll('mark.text-selection-highlight');
        existingMarks.forEach(mark => {
          const parent = mark.parentNode;
          if (parent) {
            // Tạo document fragment chứa tất cả nội dung của mark (bao gồm các element con)
            const fragment = document.createDocumentFragment();
            while (mark.firstChild) {
              fragment.appendChild(mark.firstChild);
            }
            parent.replaceChild(fragment, mark);
            parent.normalize();
          }
        });

        // Highlight selected text - sử dụng cách an toàn hơn để giữ nguyên cấu trúc DOM
        try {
          // Kiểm tra xem range có bị split ở giữa element không
          const startContainer = range.startContainer;
          const endContainer = range.endContainer;
          
          // Nếu range nằm trong cùng một text node, xử lý đơn giản
          if (startContainer === endContainer && startContainer.nodeType === Node.TEXT_NODE) {
            const textNode = startContainer as Text;
            const text = textNode.textContent || '';
            const startOffset = range.startOffset;
            const endOffset = range.endOffset;
            
            // Tách text node thành 3 phần: trước, highlight, sau
            const beforeText = text.substring(0, startOffset);
            const highlightText = text.substring(startOffset, endOffset);
            const afterText = text.substring(endOffset);
            
            const parent = textNode.parentNode;
            if (!parent) return;
            
            // Tạo fragment chứa: text trước + mark + text sau
            const fragment = document.createDocumentFragment();
            if (beforeText) {
              fragment.appendChild(document.createTextNode(beforeText));
            }
            
            const mark = document.createElement('mark');
            mark.className = 'text-selection-highlight';
            mark.style.color = '#0099FF';
            mark.style.backgroundColor = '#0099FF1A';
            mark.textContent = highlightText;
            fragment.appendChild(mark);
            
            if (afterText) {
              fragment.appendChild(document.createTextNode(afterText));
            }
            
            parent.replaceChild(fragment, textNode);
            
            // Update selection
            selection.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(mark);
            selection.addRange(newRange);
          } else {
            // Range phức tạp hơn - wrap từng text node để giữ nguyên cấu trúc DOM và style
            // Hàm helper để wrap một text node
            const wrapTextNode = (textNode: Text, start: number, end: number) => {
              const text = textNode.textContent || '';
              const beforeText = text.substring(0, start);
              const highlightText = text.substring(start, end);
              const afterText = text.substring(end);
              
              const parent = textNode.parentNode;
              if (!parent) return;
              
              // Tạo fragment chứa: text trước + mark + text sau
              const fragment = document.createDocumentFragment();
              if (beforeText) {
                fragment.appendChild(document.createTextNode(beforeText));
              }
              
              const mark = document.createElement('mark');
              mark.className = 'text-selection-highlight';
              mark.style.color = '#0099FF';
              mark.style.backgroundColor = '#0099FF1A';
              mark.textContent = highlightText;
              fragment.appendChild(mark);
              
              if (afterText) {
                fragment.appendChild(document.createTextNode(afterText));
              }
              
              parent.replaceChild(fragment, textNode);
            };
            
            // Tìm tất cả text nodes trong range
            const clonedRange = range.cloneRange();
            const textNodesToWrap: { node: Text; start: number; end: number }[] = [];
            
            // Duyệt qua tất cả text nodes trong common ancestor
            const walker = document.createTreeWalker(
              clonedRange.commonAncestorContainer,
              NodeFilter.SHOW_TEXT,
              null
            );
            
            let node;
            while (node = walker.nextNode()) {
              const textNode = node as Text;
              const nodeRange = document.createRange();
              nodeRange.selectNodeContents(textNode);
              
              // Kiểm tra xem text node có nằm trong range không
              const startComparison = clonedRange.compareBoundaryPoints(Range.START_TO_START, nodeRange);
              const endComparison = clonedRange.compareBoundaryPoints(Range.END_TO_END, nodeRange);
              
              if (textNode === startContainer && startContainer.nodeType === Node.TEXT_NODE) {
                // Text node chứa start của range
                textNodesToWrap.push({ 
                  node: textNode, 
                  start: clonedRange.startOffset, 
                  end: textNode.textContent?.length || 0 
                });
              } else if (textNode === endContainer && endContainer.nodeType === Node.TEXT_NODE) {
                // Text node chứa end của range
                textNodesToWrap.push({ 
                  node: textNode, 
                  start: 0, 
                  end: clonedRange.endOffset 
                });
              } else if (startComparison > 0 && endComparison < 0) {
                // Text node nằm hoàn toàn trong range
                textNodesToWrap.push({ 
                  node: textNode, 
                  start: 0, 
                  end: textNode.textContent?.length || 0 
                });
              }
            }
            
            // Wrap từng text node (xử lý ngược để tránh ảnh hưởng đến index)
            for (let i = textNodesToWrap.length - 1; i >= 0; i--) {
              wrapTextNode(textNodesToWrap[i].node, textNodesToWrap[i].start, textNodesToWrap[i].end);
            }
            
            // Update selection - chọn tất cả các mark vừa tạo
            selection.removeAllRanges();
            const marks = document.querySelectorAll('mark.text-selection-highlight');
            if (marks.length > 0) {
              const newRange = document.createRange();
              newRange.setStartBefore(marks[0]);
              newRange.setEndAfter(marks[marks.length - 1]);
              selection.addRange(newRange);
            }
          }
        } catch (e) {
          // Ignore errors
          console.warn('Error highlighting text:', e);
        }

        // Track text highlight nếu highlight thành công
        if (currentQuestionId !== null && selectedTextContent.length > 0) {
          trackQuizTextHighlight(
            currentQuestionId,
            selectedTextContent.length,
            category?.code,
            subCategory?.code
          );
        }

        // Tính toán vị trí button (góc dưới bên phải của selection)
        const buttonTop = selectionRect.bottom + 8; // 8px offset từ bottom
        const buttonLeft = selectionRect.right - 32; // 32px từ right (width của button)

        setSelectedText(selectedTextContent);
        setSelectionPosition({
          top: buttonTop,
          left: buttonLeft,
        });
      } else {
        setSelectedText('');
        setSelectionPosition(null);
      }
    };

    const handleClick = (e: MouseEvent) => {
      // Nếu click vào button search, không clear selection
      const target = e.target as HTMLElement;
      if (target.closest('.text-selection-search-button')) {
        return;
      }
      
      // Clear selection khi click vào nơi khác
      setTimeout(() => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          if (range.collapsed) {
            setSelectedText('');
            setSelectionPosition(null);
            // Remove all highlight marks - khôi phục lại nội dung gốc với formatting
            const marks = document.querySelectorAll('mark.text-selection-highlight');
            marks.forEach(mark => {
              const parent = mark.parentNode;
              if (parent) {
                // Tạo document fragment chứa tất cả nội dung của mark (bao gồm các element con)
                const fragment = document.createDocumentFragment();
                while (mark.firstChild) {
                  fragment.appendChild(mark.firstChild);
                }
                parent.replaceChild(fragment, mark);
                parent.normalize();
              }
            });
          }
        }
      }, 0);
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('click', handleClick);
    };
  }, [questions.length]);

  // Hàm mở ảnh zoom và reset góc xoay
  const handleOpenZoom = (imageUrl: string) => {
    // Track image zoom
    trackQuizImageZoom(category?.code, subCategory?.code);
    
    setZoomedImage(imageUrl);
    setImageRotation(0);
  };

  // Hàm xoay ảnh 90 độ
  const handleRotateImage = () => {
    setImageRotation((prev) => (prev + 90) % 360);
  };

  // Hàm đóng modal và reset góc xoay
  const handleCloseZoom = () => {
    setZoomedImage(null);
    setImageRotation(0);
  };

  // Xử lý phím Escape để đóng modal zoom ảnh
  useEffect(() => {
    if (!zoomedImage) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setZoomedImage(null);
        setImageRotation(0);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [zoomedImage]);

  // Kiểm tra và hiển thị overlay upgrade khi gặp câu hỏi rỗng
  useEffect(() => {
    if (questions.length === 0 || showUpgradeOverlay) return;

    // Tìm câu hỏi rỗng đầu tiên
    const emptyQuestion = questions.find(q => !q.question || q.question.trim() === '');
    
    if (emptyQuestion) {
      // Kiểm tra xem câu hỏi đã hiển thị trên màn hình chưa
      const checkIfVisible = () => {
        const questionElement = document.getElementById(`question-${emptyQuestion.questionId}`);
        if (questionElement) {
          const rect = questionElement.getBoundingClientRect();
          const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
          if (isVisible) {
            setShowUpgradeOverlay(true);
            return true;
          }
        }
        return false;
      };

      // Sử dụng Intersection Observer để phát hiện khi user scroll đến câu hỏi rỗng
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setShowUpgradeOverlay(true);
            }
          });
        },
        {
          threshold: 0.1, // Khi 10% câu hỏi hiển thị trên màn hình
          rootMargin: '-100px 0px', // Offset từ top
        }
      );

      // Đợi một chút để đảm bảo DOM đã render, sau đó kiểm tra và setup observer
      const timeoutId = setTimeout(() => {
        // Kiểm tra xem câu hỏi đã hiển thị chưa
        if (!checkIfVisible()) {
          // Nếu chưa hiển thị, setup observer để theo dõi
          const questionElement = document.getElementById(`question-${emptyQuestion.questionId}`);
          if (questionElement) {
            observer.observe(questionElement);
          }
        }
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        const questionElement = document.getElementById(`question-${emptyQuestion.questionId}`);
        if (questionElement) {
          observer.unobserve(questionElement);
        }
      };
    }
  }, [questions, showUpgradeOverlay]);

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
        
        // Track answer event
        const questionIndex = questions.findIndex(q => q.questionId === questionId);
        trackQuizQuestionAnswer(
          questionId,
          questionIndex >= 0 ? questionIndex : 0,
          isCorrect,
          category?.code,
          subCategory?.code
        );
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
        
        // Track essay submit event
        const questionIndex = questions.findIndex(q => q.questionId === questionId);
        trackQuizQuestionEssaySubmit(
          questionId,
          questionIndex >= 0 ? questionIndex : 0,
          data.isCorrect,
          category?.code,
          subCategory?.code
        );
      }
    } catch (error) {
      // Silent fail
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

  // Handler mở/đóng split panel
  const toggleSplitPanel = (panelType?: 'star' | 'print' | '3d' | 'kiem' | 'fix-error' | 'documents', initialMessage?: string) => {
    if (panelType) {
      // Nếu click vào icon, toggle panel đó
      const newPanel = activePanel === panelType ? null : panelType;
      setActivePanel(newPanel);
      
      // Set tin nhắn ban đầu nếu có
      if (newPanel === 'star' && initialMessage) {
        setInitialStarMessage(initialMessage);
      } else if (newPanel !== 'star') {
        setInitialStarMessage(null);
      }
      
      // Track panel open/close
      if (newPanel) {
        trackQuizPanelOpen(newPanel, category?.code, subCategory?.code);
      } else {
        trackQuizPanelClose(panelType);
      }
      
      // Tự động collapse sidebar khi mở panel (set ngay lập tức)
      setIsSidebarCollapsed(true);
    } else {
      // Nếu không có panelType (đóng từ nút X), đóng panel
      if (activePanel) {
        trackQuizPanelClose(activePanel);
      }
      setActivePanel(null);
      setFixErrorQuestion(null);
      setInitialStarMessage(null);
    }
  };

  // Handler mở panel sửa lỗi
  const handleOpenFixError = (question: Question) => {
    setFixErrorQuestion(question);
    setActivePanel('fix-error');
    setIsSidebarCollapsed(true);
  };

  // Handler bắt đầu resize split panel
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    if (contentContainerRef.current) {
      const containerRect = contentContainerRef.current.getBoundingClientRect();
      // Lưu vị trí chuột tương đối trong container khi bắt đầu
      resizeStartX.current = e.clientX - containerRect.left;
      resizeStartWidth.current = splitPanelWidth;
    }
  };

  // Handler resize split panel
  useEffect(() => {
    let rafId: number | null = null;
    
    const handleResizeMove = (e: MouseEvent) => {
      if (!isResizing || !contentContainerRef.current) return;
      
      // Hủy requestAnimationFrame trước đó nếu có
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      
      // Sử dụng requestAnimationFrame để cập nhật mượt mà hơn
      rafId = requestAnimationFrame(() => {
        // Lấy width thực tế của container content (không bao gồm sidebar bên trái)
        const containerRect = contentContainerRef.current!.getBoundingClientRect();
        const containerWidth = containerRect.width;
        
        // Tính vị trí chuột hiện tại tương đối trong container
        const currentMouseX = e.clientX - containerRect.left;
        
        // Tính phần trăm panel width dựa trên vị trí chuột
        // Panel bắt đầu từ bên phải, nên width = (containerWidth - mouseX) / containerWidth * 100
        let newWidth = ((containerWidth - currentMouseX) / containerWidth) * 100;
        
        // Giới hạn min 25% (1/4) và max 50% (1/2)
        newWidth = Math.max(25, Math.min(50, newWidth));
        
        setSplitPanelWidth(newWidth);
      });
    };

    const handleResizeEnd = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove, { passive: true });
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

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
    return theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
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
    let finalTimeSpent = timeSpent;
    if (startTime) {
      finalTimeSpent = Math.floor((Date.now() - startTime) / 1000);
      setTimeSpent(finalTimeSpent);
    }
    
    // Gọi API submit quiz (async, không cần quan tâm response)
    const correctAnswers = calculateCorrectAnswers();
    const quizDuration = questions.length * 15; // Số câu x 15 giây (giống như trong QuizHeader)
    
    // Track submit event
    if (category?.code && subCategory?.code) {
      trackQuizSubmit(
        questions.length,
        correctAnswers,
        finalTimeSpent,
        category.code,
        subCategory.code
      );
      
      faquizApiService.submitQuiz({
        totalCorrect: correctAnswers,
        totalQuestion: questions.length,
        subCategoryCode: subCategory.code,
        quizDuration: quizDuration,
        endDuration: finalTimeSpent,
        categoryCode: category.code,
      });
    }
  };

  // Handler làm lại bài
  const handleRetry = () => {
    // Track retry event
    if (category?.code && subCategory?.code) {
      trackQuizRetry(category.code, subCategory.code, questions.length);
    }
    
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
    // Track timer expired event
    if (category?.code && subCategory?.code) {
      trackQuizTimerExpired(category.code, subCategory.code, questions.length);
    }
    
    if (!isSubmitted) {
      handleSubmit();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black">
        <ProgressBar isVisible={loading} />
        <QuizHeader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-black">
        <QuizHeader />
        <div className="flex justify-center items-center py-20 pt-32">
          <p className="text-red-500 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0 && !loading) {
    // Redirect về home khi không có câu hỏi (đã xử lý trong useEffect, nhưng hiển thị loading để đảm bảo)
    return (
      <div className="min-h-screen bg-white dark:bg-black">
        <QuizHeader />
        <div className="flex justify-center items-center py-20 pt-32">
          <div className="text-gray-500 dark:text-white/20">Đang chuyển hướng...</div>
        </div>
      </div>
    );
  }

  // Hiển thị màn hình kết quả khi đã nộp bài
  if (isSubmitted) {
    const correctAnswers = calculateCorrectAnswers();
    return (
      <div className="min-h-screen bg-white dark:bg-black">
        <QuizHeader 
          totalQuestions={questions.length}
          onTimerExpired={handleTimerExpired}
        />
        <QuizResults
          totalScore={correctAnswers}
          totalQuestions={questions.length}
          timeSpent={timeSpent}
          onRetry={handleRetry}
          relatedSubCategories={subCategories}
          categoryBackgroundColor={category?.backgroundColor}
          currentSubCategoryId={subCategory?.id}
          categoryCode={category?.code}
          subCategoryCode={subCategory?.code}
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
        <div className="flex justify-between items-center">
          <span className="text-xl font-bold text-[#0000001A] dark:text-white/20">
            Câu {index + 1}
          </span>
          <span className="text-md tracking-wider font-medium text-[#0000001A] dark:text-white/20">
            {question.questionId}
          </span>
        </div>

        {/* Chỉ hiển thị câu hỏi ở đây nếu không phải essay có ảnh */}
        {!(questionIsEssay && question.extraData?.image) && (
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-3 mb-6">
            {question.question}
          </h2>
        )}

        {/* Hiển thị message khi đã verify */}
        {verified && message && (
          <div className="mb-6">
            <p 
              className="text-lg font-semibold"
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
            <p className="text-lg text-gray-500 dark:text-white/20 italic">
              Đang chấm...
            </p>
          </div>
        )}

        {/* Giải thích tham khảo + ảnh detailImg của đáp án đúng (nếu có) cho câu trắc nghiệm */}
        {verified && (
          (() => {
            const correctDetailImg = !questionIsEssay
              ? question.options?.find(opt => opt.isCorrect && (opt as any)?.extraData?.detailImg)?.extraData?.detailImg
              : undefined;
            const hasDetailAnswer = !!(question.detailAnswer && question.detailAnswer.trim().length > 0);
            if (!hasDetailAnswer && !correctDetailImg) return null;
            const correctOptionText = !questionIsEssay
              ? (question.options?.find(opt => opt.isCorrect)?.text || '')
              : '';
            const normalize = (s: string) => (s || '').trim().toLowerCase();
            const useVerifiedGreen = !question.isReference && hasDetailAnswer && normalize(question.detailAnswer) !== normalize(correctOptionText);
            const accentColor = useVerifiedGreen ? '#00C800' : '#8D7EF7';
            const quizLabel = useVerifiedGreen ? 'Quiz cục súc' : 'Quiz thông thái';
            const subtitleLabel = useVerifiedGreen ? 'Đã kiểm chứng' : 'Giải thích tham khảo';
            // Nếu có ảnh detail của đáp án đúng thì hiển thị dạng 2 cột: trái giải thích, phải ảnh
            if (correctDetailImg) {
              return (
                <div className="mb-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {/* Cột trái: giải thích */}
                    <div>
                      <div className="flex items-start gap-5">
                        <div className="w-2 self-stretch" style={{ backgroundColor: accentColor }} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="text-md mb-2">
                              <span className="font-semibold" style={{ color: accentColor }}>{quizLabel}</span>
                              <span className="opacity-30 inline-flex items-center gap-1" style={{ color: accentColor }}>
                                &nbsp; › &nbsp;
                                {useVerifiedGreen && (
                                  <span className="inline-flex items-center justify-center w-[14px] h-[14px] rounded-full" style={{ backgroundColor: accentColor }}>
                                    <svg
                                      width="10"
                                      height="10"
                                      viewBox="0 0 20 20"
                                      fill="none"
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="inline-block align-middle"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        clipRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        fill="#FFFFFF"
                                      />
                                    </svg>
                                  </span>
                                )}
                                {subtitleLabel}
                              </span>
                            </div>
                          </div>
                          {hasDetailAnswer && (
                            <Markdown
                              content={question.detailAnswer}
                              className="text-gray-800 dark:text-gray-200 leading-relaxed text-lg"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Cột phải: ảnh detail của đáp án đúng */}
                    <div className="flex items-start">
                      <div className="relative w-full aspect-video cursor-pointer" onClick={() => handleOpenZoom(correctDetailImg)}>
                        <Image
                          src={correctDetailImg}
                          alt="Giải thích minh hoạ"
                          fill
                          className="object-contain rounded-2xl"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                          loading="lazy"
                          sizes="(max-width: 1024px) 100vw, 50vw"
                          quality={85}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            // Mặc định: chỉ có giải thích (không có ảnh)
            if (hasDetailAnswer) {
              return (
                <div className="mb-6">
                  <div className="flex items-start gap-5">
                    <div className="w-2 self-stretch" style={{ backgroundColor: accentColor }} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-md mb-2">
                          <span className="font-semibold" style={{ color: accentColor }}>{quizLabel}</span>
                          <span className="opacity-30 inline-flex items-center gap-1" style={{ color: accentColor }}>
                            &nbsp; › &nbsp;
                            {subtitleLabel}
                            {useVerifiedGreen && (
                              <span className="ml-1 inline-flex items-center justify-center w-[14px] h-[14px] rounded-full" style={{ backgroundColor: accentColor }}>
                                <svg
                                  width="10"
                                  height="10"
                                  viewBox="0 0 20 20"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="inline-block align-middle"
                                >
                                  <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    fill="#FFFFFF"
                                  />
                                </svg>
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                      <Markdown
                        content={question.detailAnswer}
                        className="text-gray-800 dark:text-gray-200 leading-relaxed text-lg"
                      />
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()
        )}

        {/* Các button sau khi chọn đáp án - chỉ hiển thị cho câu trắc nghiệm */}
        {verified && !questionIsEssay && (
          <div className="mb-6 flex items-center justify-between gap-4">
            {/* Button "Sửa lỗi" căn trái */}
            <button
              onClick={() => handleOpenFixError(question)}
              className="flex items-center gap-2 px-5 py-3 rounded-full text-white font-medium transition-all duration-200 hover:scale-105"
              style={{ backgroundColor: '#00C800' }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11.3333 2.00004C11.5084 1.82493 11.7163 1.68606 11.9447 1.59131C12.1731 1.49657 12.4173 1.44775 12.6667 1.44775C12.916 1.44775 13.1602 1.49657 13.3886 1.59131C13.617 1.68606 13.8249 1.82493 14 2.00004C14.1751 2.17515 14.314 2.38305 14.4087 2.61146C14.5035 2.83987 14.5523 3.08407 14.5523 3.33337C14.5523 3.58268 14.5035 3.82688 14.4087 4.05529C14.314 4.2837 14.1751 4.4916 14 4.66671L5.00001 13.6667L1.33334 14.6667L2.33334 11L11.3333 2.00004Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="currentColor"
                />
              </svg>
              Sửa lỗi &nbsp;
            </button>

            {/* 3 button căn phải - chỉ hiển thị khi user đã thanh toán */}
            {user?.faQuizInfo?.isPaid === true && (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    const bubbleText = 'Giải thích từng ý';
                    const message = `${bubbleText} ${question.questionId}`;
                    toggleSplitPanel('star', message);
                  }}
                  className="px-6 py-3 text-gray-500 dark:text-white/50 font-medium rounded-full border-2 border-gray-100 dark:border-white/10 transition-all duration-200 hover:scale-105"
                >
                  Giải thích từng ý
                </button>
                <button
                  onClick={() => {
                    const bubbleText = 'Vì sao đúng';
                    const message = `${bubbleText} ${question.questionId}`;
                    toggleSplitPanel('star', message);
                  }}
                  className="px-6 py-3 text-gray-500 dark:text-white/50 font-medium rounded-full border-2 border-gray-100 dark:border-white/10 transition-all duration-200 hover:scale-105"
                >
                  Vì sao đúng
                </button>
                <button
                  onClick={() => {
                    const bubbleText = 'Đáp án sai';
                    const message = `${bubbleText} ${question.questionId}`;
                    toggleSplitPanel('star', message);
                  }}
                  className="px-6 py-3 text-gray-500 dark:text-white/50 font-medium rounded-full border-2 border-gray-100 dark:border-white/10 transition-all duration-200 hover:scale-105"
                >
                  Đáp án sai
                </button>
              </div>
            )}
          </div>
        )}

        {questionIsEssay ? (
          // Layout cho essay: nếu có ảnh thì 2 cột, không có ảnh thì layout thường
          question.extraData?.image ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-3 mb-6 items-stretch">
              {/* Cột trái: Câu hỏi và ô input */}
              <div className="flex flex-col">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                  {question.question}
                </h2>
                <div className="flex-1 flex flex-col justify-end">
                  <div className="relative">
                    <textarea
                      className={`w-full border-2 rounded-2xl bg-white dark:bg-black dark:text-white px-8 pr-12 text-lg resize-none overflow-y-auto [&::-webkit-scrollbar]:hidden focus:outline-none transition-colors`}
                      placeholder="Viết đáp án..."
                      value={textAnswers[question.questionId] || ''}
                      onChange={(e) => handleEssayChange(question.questionId, e.target.value)}
                      onKeyDown={(e) => handleEssayKeyDown(e, question.questionId, question)}
                      onFocus={() => setFocusedEssayId(question.questionId)}
                      onBlur={() => setFocusedEssayId(null)}
                      disabled={verified || isGrading}
                      rows={calculateRows(textAnswers[question.questionId] || '')}
                      style={{
                        borderColor: verified 
                          ? (isCorrect ? '#00C800' : '#EC5300')
                          : (focusedEssayId === question.questionId ? '#8D7EF7' : theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'),
                        minHeight: '5rem',
                        maxHeight: '7rem',
                        lineHeight: '1.5rem',
                        paddingTop: '1.75rem',
                        paddingBottom: '1.75rem',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                      }}
                    />
                    {/* Icon gửi */}
                    {!verified && hasTextAnswer && !isGrading && (
                      <button
                        onClick={() => handleEssaySubmit(question.questionId, question)}
                        className="absolute top-1/2 -translate-y-1/2 right-4 px-2 pt-1 pb-2 rounded-full transition-all duration-200 hover:opacity-80"
                        aria-label="Gửi câu trả lời"
                      >
                        <img 
                          src="data:image/svg+xml,%3csvg%20width='20'%20height='18'%20viewBox='0%200%2020%2018'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20d='M17.5436%200.892072C19.0975%200.879563%2020.0714%202.56646%2019.2837%203.90592L11.7367%2016.738C10.8525%2018.2414%208.60201%2017.9717%208.09803%2016.3021L7.03905%2012.7937C6.6797%2011.6032%207.09208%2010.3144%208.07577%209.55366L12.4962%206.13506C12.7265%205.95691%2012.5179%205.59555%2012.2484%205.70597L7.08027%207.82378C5.92829%208.29584%204.60446%208.00736%203.75333%207.09879L1.2057%204.37923C0.0141876%203.1073%200.906414%201.026%202.6492%201.01197L17.5436%200.892072Z'%20fill='%238D7EF7'/%3e%3c/svg%3e"
                          alt="Gửi"
                          className="w-5 h-5"
                        />
                      </button>
                    )}
                    {/* Hiển thị icon kết quả cho câu tự luận */}
                    {verified && (
                      <div className="absolute top-1/2 -translate-y-1/2 right-6">
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
                </div>
              </div>
              {/* Cột phải: Ảnh */}
              <div className="flex items-start">
                <div className="relative w-full aspect-video cursor-pointer" onClick={() => question.extraData?.image && handleOpenZoom(question.extraData.image)}>
                  <Image
                    src={question.extraData.image}
                    alt="Câu hỏi"
                    fill
                    className="object-contain rounded-2xl"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    loading="lazy"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    quality={85}
                  />
                </div>
              </div>
            </div>
          ) : (
            // Layout thường khi không có ảnh
            <div className="relative">
              <textarea
                className={`w-full border-2 border-gray-200 dark:border-gray-700 rounded-lg px-6 py-3 bg-white dark:bg-black dark:text-white min-h-[140px] pr-12 focus:outline-none transition-colors`}
                placeholder="Viết đáp án..."
                value={textAnswers[question.questionId] || ''}
                onChange={(e) => handleEssayChange(question.questionId, e.target.value)}
                onKeyDown={(e) => handleEssayKeyDown(e, question.questionId, question)}
                onFocus={() => setFocusedEssayId(question.questionId)}
                onBlur={() => setFocusedEssayId(null)}
                disabled={verified || isGrading}
                style={{
                  borderColor: verified 
                    ? (isCorrect ? '#00C800' : '#EC5300')
                    : (focusedEssayId === question.questionId ? '#8D7EF7' : 'rgba(0, 0, 0, 0.05)')
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
                <div className="absolute top-3 right-12">
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
          )
        ) : (
          <>
            {/* Hiển thị ảnh nếu có (cho câu hỏi không phải essay) */}
            {question.extraData?.image && (
              <div className="mb-6 flex justify-center">
                <div className="relative w-full max-w-2xl aspect-video cursor-pointer" onClick={() => question.extraData?.image && handleOpenZoom(question.extraData.image)}>
                  <Image
                    src={question.extraData.image}
                    alt="Câu hỏi"
                    fill
                    className="object-contain rounded-2xl"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    loading="lazy"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 672px"
                    quality={85}
                  />
                </div>
              </div>
            )}
            {/* Hiển thị các options cho câu hỏi trắc nghiệm */}
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
                    className={`w-full text-left p-6 rounded-2xl flex items-center justify-between bg-white dark:bg-black border-2 transition-all duration-200 ${
                      isAnswered 
                        ? 'cursor-pointer' 
                        : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/10 hover:scale-[1.02]'
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
                      <span className="font-semibold text-lg text-gray-600 dark:text-gray-300" style={textColor ? { color: textColor } : undefined}>{optionLetter}.</span>
                      <span className="text-lg dark:text-gray-200" style={textColor ? { color: textColor } : undefined}>{opt.text}</span>
                    </div>
                    {renderVerifyIcon(opt, selectedAnswers, verified)}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <QuizHeader 
        totalQuestions={questions.length}
        onTimerExpired={handleTimerExpired}
        isPanelOpen={activePanel !== null}
      />
      <main className={`bg-white dark:bg-black relative transition-all duration-300 ${activePanel !== null ? 'pt-0' : 'pt-20'}`}>
        {/* Nút expand sidebar khi collapsed - cố định ở góc trái */}
        {isSidebarCollapsed && !activePanel && (
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
              className="rotate-180 dark:invert"
            />
          </button>
        )}

        {/* Sidebar cố định bên trái */}
        {!isSidebarCollapsed && !activePanel && (
          <div className="fixed left-0 top-20 w-[280px] lg:w-[320px] h-[calc(100vh-5rem)] flex flex-col z-30">
            {/* Header với category title và nút collapse */}
            <div className="flex items-center justify-between pl-8 pr-0 py-5">
              <h2 
                  className="text-sm font-semibold pr-2 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ color: categoryBackgroundColor }}
                  onClick={() => {
                    if (category?.title) {
                      const categorySlug = createTitleSlug(category.title);
                      window.open(`/category/${categorySlug}`, '_blank');
                    }
                  }}
                >
                  {categoryTitle}
              </h2>
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
                  className="dark:invert"
                />
              </button>
            </div>

            {/* Danh sách câu hỏi - có thể scroll */}
            <div className="flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-700">
              <div className="space-y-2">
                {questions.map((q, index) => {
                  const questionIsEssay = isEssay(q);
                  const selectedAnswers = multiAnswers[q.questionId];
                  const verified = questionIsEssay 
                    ? isEssayVerified(q.questionId)
                    : isVerified(q, selectedAnswers);
                  
                  // Kiểm tra xem câu trả lời đúng hay sai (chỉ khi đã verify)
                  let isCorrect: boolean | null = null;
                  if (verified) {
                    if (questionIsEssay) {
                      isCorrect = essayResults[q.questionId] === true;
                    } else {
                      isCorrect = isAnswerCorrect(q, selectedAnswers);
                    }
                  }

                  // Xác định màu chấm dựa trên trạng thái
                  let dotColorClass = 'bg-gray-100 dark:bg-gray-700'; // Mặc định: chưa trả lời (xám)
                  if (verified) {
                    if (isCorrect) {
                      dotColorClass = 'bg-green-500'; // Trả lời đúng (xanh)
                    } else {
                      dotColorClass = 'bg-red-500'; // Trả lời sai (đỏ)
                    }
                  }

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
                      className="w-full flex items-center gap-2 p-4 rounded-xl transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div
                        className={`w-2 h-2 rounded-full mr-4 ${dotColorClass}`}
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
        <div 
          ref={contentContainerRef}
          className={`transition-all duration-300 flex ${activePanel !== null ? 'h-screen' : 'h-[calc(100vh-5rem)]'} ${!isSidebarCollapsed && !activePanel ? 'ml-[280px] lg:ml-[320px]' : ''}`}
        >
          {/* Phần quiz chính */}
          <div 
            ref={scrollContainerRef}
            className={`flex-1 overflow-y-auto h-full ${!isResizing ? 'transition-all duration-300' : ''} [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-700`}
            style={{
              width: activePanel ? `${100 - splitPanelWidth}%` : '100%',
            }}
          >
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
              {/* Print footer - hiển thị ở cuối content khi in, nằm ngoài questions-scroll-container để column-span hoạt động */}
              <div className="print-footer">
                <span>FA Quiz - Trắc nghiệm Y khoa cục súc</span>
                <span>www.facourse.com</span>
              </div>
            </div>
          </div>

          {/* Divider để resize */}
          {activePanel && (
            <div
              className="w-2 h-10 rounded-full bg-gray-200 dark:bg-gray-700 mr-2 cursor-col-resize hover:scale-110 relative group self-center"
              onMouseDown={handleResizeStart}
              style={{
                cursor: isResizing ? 'col-resize' : 'col-resize',
              }}
            >
              {/* Handle visual indicator */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 rounded-full h-10 bg-gray-400 dark:bg-gray-500" />
            </div>
          )}

          {/* Split panel bên phải */}
          {activePanel && (
            <div
              className={`h-full`}
              style={{
                width: `${splitPanelWidth}%`,
                minWidth: '25%',
                maxWidth: '50%',
              }}
            >
              {activePanel === 'star' && (
                <StarPanel 
                  onClose={() => toggleSplitPanel()} 
                  questions={questions}
                  category={category}
                  subCategory={subCategory}
                  initialMessage={initialStarMessage}
                />
              )}
              {activePanel === 'print' && <PrintPanel onClose={() => toggleSplitPanel()} />}
              {activePanel === '3d' && <ThreeDPanel onClose={() => toggleSplitPanel()} />}
              {activePanel === 'kiem' && <KiemPanel onClose={() => toggleSplitPanel()} />}
              {activePanel === 'fix-error' && (
                <FixErrorPanel 
                  onClose={() => toggleSplitPanel()} 
                  question={fixErrorQuestion} 
                  subCategory={subCategory}
                  onSuccess={() => {
                    setShowSuccessBadge(true);
                    setTimeout(() => {
                      setShowSuccessBadge(false);
                    }, 2000);
                  }}
                />
              )}
              {activePanel === 'documents' && (
                <DocumentsPanel 
                  onClose={() => {
                    toggleSplitPanel();
                    setSelectedTextForSearch('');
                  }} 
                  initialSearchQuery={selectedTextForSearch}
                />
              )}
            </div>
          )}
        </div>

        {/* Modal zoom ảnh */}
        {zoomedImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-90 dark:bg-opacity-95 z-[100] flex items-center justify-center p-4"
            onClick={handleCloseZoom}
          >
            <div
              className="relative w-full h-full max-w-7xl max-h-[90vh] flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  transform: `rotate(${imageRotation}deg)`,
                  transition: 'transform 0.3s ease-in-out',
                }}
                className="relative w-full h-full flex items-center justify-center"
              >
                <Image
                  src={zoomedImage}
                  alt="Ảnh phóng to"
                  fill
                  className="object-contain"
                  quality={100}
                  sizes="100vw"
                />
              </div>
              {/* Container các nút điều khiển ở phía dưới */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4 z-[101]">
                {/* Nút xoay ảnh */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRotateImage();
                  }}
                  className="text-white hover:text-gray-300 transition-colors bg-black bg-opacity-50 rounded-full p-3"
                  aria-label="Xoay ảnh"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
                {/* Nút đóng */}
                <button
                  onClick={handleCloseZoom}
                  className="text-white hover:text-gray-300 transition-colors bg-black bg-opacity-50 rounded-full p-3"
                  aria-label="Đóng"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
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
          </div>
        )}

        {/* Container nút nộp bài và các icon ở bottom center */}
        {!activePanel && (
          <div 
            className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-3 px-6 py-3 bg-white/50 dark:bg-black/50 rounded-full z-50 transition-all duration-300 backdrop-blur-md ${
              showSubmitButton 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-10 pointer-events-none'
            }`}
            style={{boxShadow: '0 10px 20px rgba(141, 126, 247, 0.2), 0 0 0 1px rgba(141, 126, 247, 0.1)' }}
          >
            {/* Các icon bên trái nút Nộp bài */}
            {user && (
              <div className="flex items-center gap-4">
               
               

                {/* Icon 3d.svg */}
                <div className="relative flex flex-col items-center hover:scale-110 transition-all duration-300">
                  {hoveredIcon === '3d' && (
                    <span className="absolute bottom-full mb-2 text-sm font-medium text-gray-700 dark:text-white whitespace-nowrap bg-white dark:bg-black/90 py-1.5 px-3 shadow-md rounded-full">
                      Giải phẫu 3D
                    </span>
                  )}
                  <button
                    className="p-2 transition-all duration-300"
                    aria-label="Giải phẫu 3D"
                    onMouseEnter={() => setHoveredIcon('3d')}
                    onMouseLeave={() => setHoveredIcon(null)}
                    onClick={() => toggleSplitPanel('3d')}
                  >
                    <Image
                      src="/quiz/3d.svg"
                      alt="Giải phẫu 3D"
                      width={28}
                      height={30}
                      className="w-[28px] h-[30px]"
                    />
                  </button>
                </div>
               
               
                {/* Icon Star 2.svg - hiển thị cho tất cả user, chỉ user đã thanh toán mới click được */}
                <div className="relative flex flex-col items-center hover:scale-110 transition-all duration-300">
                  {hoveredIcon === 'star' && (
                    <span className="absolute bottom-full mb-2 text-sm font-medium text-gray-700 dark:text-white whitespace-nowrap bg-white dark:bg-black/90 py-1.5 px-3 shadow-md rounded-full">
                      Hỏi đáp Hack
                    </span>
                  )}
                  <button
                    className="p-2 transition-all duration-300 relative"
                    aria-label="Hỏi đáp Hack"
                    onMouseEnter={() => setHoveredIcon('star')}
                    onMouseLeave={() => setHoveredIcon(null)}
                    onClick={() => {
                      if (user?.faQuizInfo?.isPaid === true) {
                        toggleSplitPanel('star');
                      } else {
                        trackUpgradeOverlayShow('star_panel');
                        setShowUpgradeOverlay(true);
                      }
                    }}
                  >
                    <Image
                      src="/quiz/Star 2.svg"
                      alt="Hỏi đáp Hack"
                      width={30}
                      height={30}
                      className="w-[30px] h-[30px]"
                    />
                    {user?.faQuizInfo?.isPaid !== true && (
                      <span className="absolute -top-1 -right-1 bg-[#FFBB00] text-white text-[8px] font-semibold tracking-wider px-1 py-0.5 rounded-full leading-none">
                        PRO
                      </span>
                    )}
                  </button>
                </div>



            {/* Nút nộp bài ở giữa */}
            <div className="relative flex flex-col items-center hover:scale-110 transition-all duration-300">
              {hoveredIcon === 'submit' && (
                <span className="absolute bottom-full mb-2 text-sm font-medium text-gray-700 dark:text-white whitespace-nowrap bg-white dark:bg-black/90 py-1.5 px-3 shadow-md rounded-full">
                  Nộp bài
                </span>
              )}
              <button
                onClick={handleSubmit}
                aria-label="Nộp bài"
                className="w-10 h-10 mx-2 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 hover:scale-110"
                style={{ backgroundColor: '#8D7EF7' }}
                onMouseEnter={() => setHoveredIcon('submit')}
                onMouseLeave={() => setHoveredIcon(null)}
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="2">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                </svg>
              </button>
            </div>


                {/* Icon search.svg */}
                <div className="relative flex flex-col items-center hover:scale-110 transition-all duration-300">
                  {hoveredIcon === 'documents' && (
                    <span className="absolute bottom-full mb-2 text-sm font-medium text-gray-700 dark:text-white whitespace-nowrap bg-white dark:bg-black/90 py-1.5 px-3 shadow-md rounded-full">
                      Tìm tài liệu
                    </span>
                  )}
                  <button
                    className="p-2 transition-all duration-300 relative"
                    aria-label="Tìm kiếm tài liệu"
                    onMouseEnter={() => setHoveredIcon('documents')}
                    onMouseLeave={() => setHoveredIcon(null)}
                    onClick={() => {
                      if (user?.faQuizInfo?.isPaid === true) {
                        toggleSplitPanel('documents');
                      } else {
                        trackUpgradeOverlayShow('documents_panel');
                        setShowUpgradeOverlay(true);
                      }
                    }}
                  >
                    <Image
                      src="/quiz/icon search.svg"
                      alt="Tìm kiếm tài liệu"
                      width={24}
                      height={24}
                      className="w-6 h-6"
                    />
                    {user?.faQuizInfo?.isPaid !== true && (
                      <span className="absolute -top-1 -right-1 bg-[#FFBB00] text-white text-[8px] font-semibold tracking-wider px-1 py-0.5 rounded-full leading-none">
                        PRO
                      </span>
                    )}
                  </button>
                </div>

                
                {/* Icon print.svg - hiển thị cho tất cả user, chỉ user đã thanh toán mới click được */}
                <div className="relative flex flex-col items-center hover:scale-110 transition-all duration-300">
                  {hoveredIcon === 'print' && (
                    <span className="absolute bottom-full mb-2 text-sm font-medium text-gray-700 dark:text-white whitespace-nowrap bg-white dark:bg-black/90 py-1.5 px-3 shadow-md rounded-full">
                      In đề
                    </span>
                  )}
                  <button
                    className="p-2 transition-all duration-300 relative"
                    aria-label="In đề"
                    onMouseEnter={() => setHoveredIcon('print')}
                    onMouseLeave={() => setHoveredIcon(null)}
                    onClick={() => {
                      if (user?.faQuizInfo?.isPaid === true) {
                        window.print();
                      } else {
                        trackUpgradeOverlayShow('print_panel');
                        setShowUpgradeOverlay(true);
                      }
                    }}
                  >
                    <Image
                      src="/quiz/print.svg"
                      alt="In đề"
                      width={28}
                      height={26}
                      className="w-[28px] h-[26px]"
                    />
                    {user?.faQuizInfo?.isPaid !== true && (
                      <span className="absolute -top-1 -right-1 bg-[#FFBB00] text-white text-[8px] font-semibold tracking-wider px-1 py-0.5 rounded-full leading-none">
                        PRO
                      </span>
                    )}
                  </button>
                </div>
                

                {/* Icon kiem.svg */}
                {/* <div className="relative flex flex-col items-center hover:scale-110 transition-all duration-300">
                  {hoveredIcon === 'kiem' && (
                    <span className="absolute bottom-full mb-2 text-sm font-medium text-white whitespace-nowrap bg-black/80 dark:bg-black/90 py-1.5 px-3 shadow-md rounded-lg">
                      Đấu battle
                    </span>
                  )}
                  <button
                    className="p-2 transition-all duration-300"
                    aria-label="Đấu battle"
                    onMouseEnter={() => setHoveredIcon('kiem')}
                    onMouseLeave={() => setHoveredIcon(null)}
                    onClick={() => window.open('https://fabattle.com', '_blank')}
                  >
                    <Image
                      src="/quiz/kiem.svg"
                      alt="Đấu battle"
                      width={30}
                      height={30}
                      className="w-[30px] h-[30px]"
                    />
                  </button>
                </div> */}
              </div>

              
            )}
          </div>
        )}

        {/* Button search icon khi text được highlight */}
        {selectedText && selectionPosition && !activePanel && (
          <button
            className="text-selection-search-button fixed z-[60] p-2 rounded-xl transition-all duration-200 bg-[#0099FF] shadow-md hover:scale-110"
            style={{
              top: `${selectionPosition.top}px`,
              left: `${selectionPosition.left}px`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (user?.faQuizInfo?.isPaid === true) {
                setSelectedTextForSearch(selectedText);
                toggleSplitPanel('documents');
                // Clear selection after opening panel
                const selection = window.getSelection();
                if (selection) {
                  selection.removeAllRanges();
                }
                setSelectedText('');
                setSelectionPosition(null);
              } else {
                trackUpgradeOverlayShow('documents_panel');
                setShowUpgradeOverlay(true);
                // Clear selection
                const selection = window.getSelection();
                if (selection) {
                  selection.removeAllRanges();
                }
                setSelectedText('');
                setSelectionPosition(null);
              }
            }}
            aria-label="Tìm kiếm"
          >
            <Image
              src="/quiz/icon search.svg"
              alt="Tìm kiếm"
              width={20}
              height={20}
              className="w-4 h-4 brightness-0 invert"
            />
          </button>
        )}

        {/* Upgrade Overlay - hiển thị khi gặp câu hỏi rỗng */}
        <UpgradeOverlay
          isOpen={showUpgradeOverlay}
          onClose={() => setShowUpgradeOverlay(false)}
        />
        
        {/* Success Badge */}
        {showSuccessBadge && (
          <div className="fixed top-4 right-4 z-50 animate-fade-in">
            <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="font-semibold">Gửi yêu cầu thành công!</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SubCategoryQuizPage;
