// User types
export interface FaTestInfo {
    expireTime: number;
    isPaid: boolean;
    plan: 'FREE' | 'PRO' | 'YEARLY' | 'LIFETIME';
}

export interface User {
    userId: number;
    email: string;
    username: string;
    fullName: string;
    avatar?: string;
    faQuizInfo?: FaTestInfo;
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


export interface QuestionOption {
    text: string;
    isAnswer: boolean;
    isCorrect: boolean;
}

export interface Media {
    url: string;
    type: 'audio' | 'image' | 'video';
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

export interface CategoryInfo {
    code: string;
    id: number;
    title: string;
    subtitle: string;
    shortTitle: string;
    icon: string;
    backgroundColor: string;
}

export interface SubCategoryInfo {
    code: string;
    id: number;
    title: string;
    slug: string;
    iconUrl: string;
    categoryId: number;
    categoryTitle: string;
    isPayment: boolean;
}

export interface QuestionsBySubCategoryResponse {
    meta: {
        code: number;
        message: string;
    };
    data: {
        category: CategoryInfo;
        subCategories: SubCategoryInfo[];
        relatedSubCategories: SubCategoryInfo[];
        questions: Question[];
    };
}

export interface UserBag {
    key: number;
    battleHint: number;
    battleSnow: number;
    battleBlockTop1: number;
    battleBlockBehind: number;
}


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


export interface SubCategoriesSlide {
    code: string;
    id: number;
    title: string;
    label?: string[];
    icon?: string;
    categoryId: number;
    isPayment: boolean;
    categoryTitle: string;
    slug: string;
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
    top10RecentSubCategories: SubCategoriesSlide[];
    fullData: CategoriesSlideStruct;
}

// Format cũ - các event riêng lẻ qua SSE
export interface SlideFastSSEEvent {
    type: "top10_categories" | "top10_subcategories" | "full_data" | "complete";
    data?: CategoriesSlide[] | SubCategoriesSlide[] | CategoriesSlideStruct;
    done?: boolean;
}