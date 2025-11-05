// User types
export interface FaTestInfo {
    expireTime: number;
    isPaid: boolean;
    plan: 'FREE' | 'MONTHLY' | 'YEARLY' | 'LIFETIME';
}

export interface User {
    userId: number;
    email: string;
    username: string;
    fullName: string;
    avatar?: string;
    closeCategoryCode?: string;
    university?: string;
    subscriptionType?: 'free' | 'premium';
    countAttempt?: number; // Số lần đã attempt quiz từ API
    faTestInfo?: FaTestInfo;
    userBag?: {
        key?: number; // Số key của user
        battleHint?: number;
        battleSnow?: number;
        battleBlockTop1?: number;
        battleBlockBehind?: number;
    };
    globalRank?: GlobalRank; // User's ranking information
    createdAt?: string;
    updatedAt?: string;
}

// Auth types
export interface LoginRequest {
    username: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    fullName: string;
    username: string;
    password: string;
    universityId: number;
}

// Global ranking info for user profiles
export interface GlobalRank {
    userId: number;
    url: string;
    title: string;
    color: string;
    level: number;
    levelId: number;
    extraData?: {
        currentCountAchieve?: number;
        currentCountLose?: number;
        currentCountWin?: number;
        nextRank?: {
            url: string;
            title: string;
            color: string;
            level: number;
            levelId: number;
        };
        targetNextLevel?: number;
        userRanking?: number;
    };
}

// Subject type used by SubjectCard and subject lists
export interface Subject {
    id: number;
    name: string;
    icon?: string;
    color?: string;
}

// Responses for Home page new items (minimal shapes to satisfy usage)
export interface NewSubjectsResponse {
    meta: { code: number; message: string };
    data: Subject[];
}

export interface NewQuizzesResponse {
    meta: { code: number; message: string };
    data: Array<{
        id: number;
        title: string;
        subjectName: string;
        universityName?: string;
        questionCount: number;
        color?: string;
        isPro?: boolean;
        categoryCode?: string;
    }>;
}

// Placeholders to satisfy imports; expand when needed
export interface AttemptHistoryResponse {
    meta: { code: number; message: string };
    data: any;
}

export interface QuizRoom {
    id: number;
    name: string;
    [key: string]: any;
}

export interface AuthResponse {
    token: string;
    login?: boolean;
}

export interface RegisterUserResponse {
    id: number;
    username: string;
    accountNo: string;
    extraData: string;
    fcmToken: string;
    email: string;
    gmailId: string;
    facebookId: string;
    appleId: string;
    status: boolean;
    createdAt: string;
    updatedAt: string;
    source: string;
    idSource: number;
    language: string;
    faClassFcmToken: string;
}


export interface QuizSection {
    quizId: number;
    sectionType: 'Writing' | 'Speaking' | 'Listening' | 'Reading';
    sectionQuestion: string;
    isCurrent?: boolean;
    tags?: string[];
    state?: string;
    questions: QuestionAnswer[];
    medias?: QuestionAnswerMedia[];
}

export interface QuestionAnswer {
    questionId: number;
    questionType: 'essay' | 'speech' | 'multiple_choice';
    text: string;
    medias?: QuestionAnswerMedia[];
    explanation?: string;
    difficulty?: string;
    options?: QuestionAnswerOption[];
    userAnswer?: string;
    transcription?: string;
}

export interface QuestionAnswerOption {
    text: string;
    isAnswer: boolean;
    isCorrect: boolean;
    medias?: QuestionAnswerMedia[];
    explanation?: string;
}

export interface QuestionAnswerMedia {
    url: string;
    text?: string;
    type: 'audio' | 'image' | 'video';
}

// Legacy interfaces for backward compatibility
export interface QuizQuestion {
    questionId: number;
    questionType: 'essay' | 'speech' | 'multiple_choice';
    text: string;
    options?: QuestionOption[];
    medias?: Media[];
}

export interface QuestionOption {
    text: string;
    isAnswer: boolean;
    isCorrect: boolean;
}

export interface Media {
    url: string;
    type: 'audio' | 'image' | 'video';
}

export interface QuizAttemptResponse {
    id: number;
    attemptId: number;
    userId: number;
    startedAt: number;
    quizSections: QuizSection[];
}

// API Response types
export interface ApiResponse<T> {
    meta: {
        code: number;
        message: string;
    };
    data: T;
    plan?: unknown;
}

export interface CreateQuizAttemptResponse {
    meta: {
        code: number;
        message: string;
    };
    data: {
        success: boolean;
        attemptId: number;
        message: string;
    };
}

export interface GetQuizAttemptResponse {
    meta: {
        code: number;
        message: string;
    };
    data: QuizAttemptResponse;
}

// Subscription types
export interface SubscriptionPlan {
    id: string;
    name: string;
    price: number;
    currency: string;
    duration: number;
    features: string[];
    popular?: boolean;
}

// Progress type
// Quiz Submit types
export interface QuizSubmitData {
    userId: number;
    quizSections: QuizSubmitSection[];
}

export interface QuizSubmitSection {
    quizId: number;
    sectionType: 'Writing' | 'Speaking' | 'Listening' | 'Reading';
    sectionQuestion: string;
    questions: QuizSubmitQuestion[];
    medias?: Media[];
    isCurrent?: boolean; // Thêm isCurrent để xác định section hiện tại
}

export interface QuizSubmitQuestion {
    questionId: number;
    questionType: 'essay' | 'speech' | 'multiple_choice';
    text: string;
    options?: QuizSubmitOption[];
    medias?: Media[];
    userAnswer?: string; // Thêm userAnswer để gửi câu trả lời của user
    transcription?: string; // Thêm transcription cho speech questions
}

export interface QuizSubmitOption {
    text: string;
    isAnswer: boolean;
    isCorrect: boolean;
}


// Quiz Submit Response types
export interface QuizSubmitResponse {
    meta: {
        code: number;
        message: string;
    };
    data: {
        attemptId: number;
        listeningScore: number;
        message: string;
        readingScore: number;
        speakingScore: number | null;
        success: boolean;
        totalScore: number;
        writingScore: number;
    };
}

// Attempt history types
export interface AttemptHistoryItem {
    attemptId: number;
    quizType: string; // e.g., "standard"
    status: 'init' | 'in_progress' | 'completed' | string;
    startedAt: number; // unix seconds
    completedAt?: number; // unix seconds
    listeningScore?: number;
    readingScore?: number;
    speakingScore?: number;
    writingScore?: number;
    totalScore?: number;
}

export interface PaginationMeta {
    pageSize: number;
    pageOffset: number;
    totalRecords: number;
    totalPages: number;
}

// Quiz Battle Questions types
export interface QuestionOption {
    answerId: number;
    text: string;
    isCorrect: boolean;
    extraData: Record<string, any>;
}

export interface Question {
    questionId: number;
    question: string;
    options: QuestionOption[];
    detailAnswer: string;
    needDetail: boolean;
    isPaymentRequired: boolean;
    extraData: {
        categorySubCode?: string;
        categorySubTitle?: string;
        image?: string;
        [key: string]: any;
    };
}

export interface QuestionsByCategoryRequest {
    categoryCode: string;
}

export interface QuestionsByCategoryResponse {
    meta: {
        code: number;
        message: string;
    };
    data: {
        questions: Question[];
    };
}

// Questions by Sub-Category
export interface QuestionsBySubCategoryRequest {
    slug: string; // ví dụ: "763003-bo-xuong-he-co-cac-khop-phan-2"
}

export interface QuestionsBySubCategoryResponse {
    meta: {
        code: number;
        message: string;
    };
    data: {
        questions: Question[];
    };
}

// WebSocket Message types
export interface WebSocketPingMessage {
    type: 'ping';
    timestamp: number;
}

export interface WebSocketPongMessage {
    type: 'pong';
    timestamp: number;
}

export interface UserBag {
    key: number;
    battleHint: number;
    battleSnow: number;
    battleBlockTop1: number;
    battleBlockBehind: number;
}

export interface UserBagResponse {
    meta: {
        code: number;
        message: string;
    };
    data: {
        userBag: UserBag;
    };
}


// Quiz Web App types
export interface Quiz {
    id: number;
    title: string;
    subjectName: string;
    universityName?: string;
    questionCount: number;
    color?: string;
    isPro?: boolean;
    categoryCode?: string;
}

export interface QuizDetail {
    id: number;
    title: string;
    subjectName: string;
    universityName?: string;
    questionCount: number;
    questions: Question[];
    timeLimit?: number; // in minutes
}

export interface QuizResult {
    attemptId: number;
    totalQuestions: number;
    correctAnswers: number;
    wrongAnswers: number;
    score: number;
    timeSpent: number; // in seconds
    quiz: QuizDetail;
}

// Slide Fast SSE Types
export interface SubCategoriesSlide {
    code: string;
    id: number;
    title: string;
    label?: string[];
    icon?: string;
    categoryId: number;
    isPayment: boolean;
    categoryTitle: string;
}

export interface CategoriesSlide {
    code: string;
    id: number;
    title: string;
    subtitle: string;
    shortTitle?: string;
    iconUrl?: string;
    icon?: string;
    backgroundColor: string;
    label?: string[];
    subCategoriesSlide: SubCategoriesSlide[];
}

export interface CategoriesSlideStruct {
    categoriesSlide: CategoriesSlide[];
}

// Format mới từ backend - một object duy nhất
export interface SlideFastResponse {
    top10Categories: CategoriesSlide[];
    top10SubCategories: SubCategoriesSlide[];
    fullData: CategoriesSlideStruct;
}

// Format cũ - các event riêng lẻ qua SSE
export interface SlideFastSSEEvent {
    type: "top10_categories" | "top10_subcategories" | "full_data" | "complete";
    data?: CategoriesSlide[] | SubCategoriesSlide[] | CategoriesSlideStruct;
    done?: boolean;
}