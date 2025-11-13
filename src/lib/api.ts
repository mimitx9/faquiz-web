import axios from 'axios';
import {
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    User,
    ApiResponse,
    RegisterUserResponse,
    QuestionsBySubCategoryRequest,
    QuestionsBySubCategoryResponse,
    SlideFastResponse
} from '../types';
import {handle401Error} from './authUtils';

// Base URL configuration
const BASE_URL = process.env.NODE_ENV === 'production'
    ? 'https://api.facourse.com/fai'
    : 'https://api.facourse.com/fai';

const API_BASE_URL = `${BASE_URL}/api`;
const AUTH_API_BASE_URL = `${BASE_URL}/v1/account`;
const USER_PROFILE_URL = `${BASE_URL}/v1/user`;
const QUIZ_API_BASE_URL = `${BASE_URL}/v1/test`;
const QUIZ_BATTLE_API_BASE_URL = `${BASE_URL}/v1/quiz-battle`;
const MASTER_API_BASE_URL = `${BASE_URL}/v1/master`;
const QUIZ_WEB_API_BASE_URL = `${BASE_URL}/v1/quiz-web`;
const CATEGORY_API_BASE_URL = `${BASE_URL}/v1/category`;
const FAQUIZ_API_BASE_URL = `${BASE_URL}/faquiz/v1`;

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'site': 'BATTLE',
    },
});

const authApi = axios.create({
    baseURL: AUTH_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'site': 'BATTLE',
    },
});

const userProfileApi = axios.create({
    baseURL: USER_PROFILE_URL,
    headers: {
        'Content-Type': 'application/json',
        'site': 'BATTLE',
    },
});

const quizApiInstance = axios.create({
    baseURL: QUIZ_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'site': 'BATTLE',
    },
});

const quizBattleApiInstance = axios.create({
    baseURL: QUIZ_BATTLE_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'site': 'BATTLE',
    },
});

const masterApiInstance = axios.create({
    baseURL: MASTER_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'site': 'BATTLE',
    },
});

const quizWebApiInstance = axios.create({
    baseURL: QUIZ_WEB_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'site': 'QUIZ_WEB',
    },
});

const categoryApiInstance = axios.create({
    baseURL: CATEGORY_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'site': 'QUIZ_WEB',
    },
});

const faquizApiInstance = axios.create({
    baseURL: FAQUIZ_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    // Ensure site header is always set
    config.headers.site = 'BATTLE';
    return config;
});

userProfileApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    // Ensure site header is always set
    config.headers.site = 'BATTLE';
    return config;
});

quizApiInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    // Ensure site header is always set
    config.headers.site = 'BATTLE';
    return config;
});

quizBattleApiInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    // Ensure site header is always set
    config.headers.site = 'BATTLE';
    return config;
});

quizWebApiInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers.site = 'QUIZ_WEB';
    return config;
});

categoryApiInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers.site = 'QUIZ_WEB';
    return config;
});

faquizApiInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Add response interceptors để handle 401 errors và 404 errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            handle401Error();
        } else if (error.response?.status === 404) {
            if (typeof window !== 'undefined') {
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

userProfileApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            handle401Error();
        } else if (error.response?.status === 404) {
            if (typeof window !== 'undefined') {
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

quizApiInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        // Không redirect 401 cho quiz API - cho phép làm quiz không cần token
        if (error.response?.status === 401) {
            // Không gọi handle401Error() để không redirect
        }
        return Promise.reject(error);
    }
);

quizBattleApiInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            handle401Error();
        } else if (error.response?.status === 404) {
            if (typeof window !== 'undefined') {
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

quizWebApiInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        // Không redirect 401 cho quiz web API - cho phép làm quiz không cần token
        if (error.response?.status === 401) {
            // Không gọi handle401Error() để không redirect
        }
        return Promise.reject(error);
    }
);

categoryApiInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            handle401Error();
        } else if (error.response?.status === 404) {
            if (typeof window !== 'undefined') {
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

faquizApiInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        // Không redirect 401 cho faquiz API - cho phép submit quiz không cần token
        if (error.response?.status === 401) {
            // Không làm gì cả
        } else if (error.response?.status === 404) {
            if (typeof window !== 'undefined') {
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authApiService = {
    login: async (data: LoginRequest): Promise<{ token: string; login: boolean }> => {
        const response = await authApi.post<ApiResponse<AuthResponse>>('/auth-mini', data);

        // Check response structure matches expected format
        if (response.data && response.data.data && response.data.data.token) {
            return {
                token: response.data.data.token,
                login: response.data.data.login ?? true
            };
        } else {
            throw new Error('Invalid login response structure');
        }
    },

    register: async (data: RegisterRequest): Promise<User> => {
        const response = await authApi.post<ApiResponse<RegisterUserResponse>>('/register-mini', data);

        if (response.data && response.data.data) {
            // Convert RegisterUserResponse to User format
            const userData: User = {
                userId: response.data.data.id,
                email: response.data.data.email,
                username: response.data.data.username,
                fullName: response.data.data.username, // Use username as fullName if not available
                avatar: undefined,
            };
            return userData;
        } else {
            throw new Error('Invalid register response structure');
        }
    },

    getProfile: async (): Promise<User> => {
        try {
            const response = await userProfileApi.get('/profile-quiz');

            // Xử lý response linh hoạt - có thể là ApiResponse hoặc trực tiếp User
            let userData: any;
            if (response.data.data) {
                userData = response.data.data;
            } else {
                userData = response.data;
            }

            if (userData && userData.rank && !userData.globalRank) {
                userData.globalRank = userData.rank;
                delete userData.rank;
            }

            return userData as User;
        } catch (error: any) {
            throw error;
        }
    },

    logout: async (): Promise<void> => {
        try {
            await api.post('/auth/logout');
        } catch {
            // Logout có thể fail nhưng vẫn clear local state
        }
    },
};

// Quiz Battle API
export const quizBattleApiService = {

    getQuestionsBySubCategory: async (payload: QuestionsBySubCategoryRequest): Promise<QuestionsBySubCategoryResponse> => {
        try {
            const response = await quizBattleApiInstance.post<QuestionsBySubCategoryResponse>('/questions/by-sub-category', payload);
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },
};

// Category API
export const categoryApiService = {
    getSlideFast: async (): Promise<ApiResponse<SlideFastResponse>> => {
        try {
            const response = await categoryApiInstance.get<ApiResponse<SlideFastResponse>>('/slide-fast');
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },
};

// FaQuiz API
export interface SubmitQuizRequest {
    totalCorrect: number;
    totalQuestion: number;
    subCategoryCode: string;
    quizDuration: number; // Thời gian cần làm (giây)
    endDuration: number; // Thời gian hoàn thành (giây)
    categoryCode: string;
}

// Documents API
export interface Document {
    id: number;
    university: string;
    grade: string;
    program: string;
    bookTitle: string;
    author: string | null;
    publisher: string | null;
    publishYear: string;
    chapter: string;
    embedStatus: string;
    stt: number;
    categoryCode: string | null;
}

export interface DocumentGroup {
    university: string;
    bookTitle: string;
    author: string;
    publisher: string;
    publishYear: string;
    documents: Document[];
}

export interface DocumentWithContent extends Document {
    content?: string;
}

export interface DocumentGroupWithContent {
    university: string;
    bookTitle: string;
    author: string;
    publisher: string;
    publishYear: string;
    documents: DocumentWithContent[];
}

export interface DocumentsResponse {
    meta: {
        code: number;
        message: string;
    };
    data: {
        groups: DocumentGroup[];
    };
}

export interface DocumentsWithContentResponse {
    meta: {
        code: number;
        message: string;
    };
    data: {
        groups: DocumentGroupWithContent[];
    };
}

export const faquizApiService = {
    submitQuiz: async (payload: SubmitQuizRequest): Promise<void> => {
        try {
            // Gọi async, không cần quan tâm response
            faquizApiInstance.post('/user-quiz', payload).catch(() => {
                // Silent fail để không ảnh hưởng đến flow chính
            });
        } catch (error: any) {
            // Silent fail để không ảnh hưởng đến flow chính
        }
    },
    getDocuments: async (): Promise<DocumentsResponse> => {
        try {
            const response = await faquizApiInstance.get<DocumentsResponse>('/documents');
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },
    getDocumentsWithContent: async (params: {
        bookTitles?: string | null;
        universities?: string | null;
        authors?: string | null;
        publishYears?: string | null;
    }): Promise<DocumentsWithContentResponse> => {
        try {
            const queryParams = new URLSearchParams();

            // Chỉ thêm params nếu có giá trị hợp lệ (không null, undefined, hoặc empty string)
            if (params.bookTitles && params.bookTitles.trim()) {
                queryParams.append('bookTitles', params.bookTitles.trim());
            }
            if (params.universities && params.universities.trim()) {
                queryParams.append('universities', params.universities.trim());
            }
            if (params.authors && params.authors.trim()) {
                queryParams.append('authors', params.authors.trim());
            }
            if (params.publishYears && params.publishYears.trim()) {
                queryParams.append('publishYears', params.publishYears.trim());
            }

            const response = await faquizApiInstance.get<DocumentsWithContentResponse>(`/documents/with-content?${queryParams.toString()}`);
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },
};

// Biodigital API
export interface BiodigitalCategory {
    id: number;
    title: string;
    searchTitle: string;
    image: string;
    color: string;
    description: string; // URL của biodigital viewer
}

export interface BiodigitalCategoriesResponse {
    meta: {
        code: number;
        message: string;
    };
    data: BiodigitalCategory[];
}

export const biodigitalApiService = {
    getAllCategories: async (): Promise<BiodigitalCategoriesResponse> => {
        try {
            const response = await faquizApiInstance.get<BiodigitalCategoriesResponse>('/biodigital/categories/all');
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },
};

// Category Subcategories API
export interface CategorySubcategoriesResponse {
    meta: {
        code: number;
        message: string;
    };
    data: {
        code: string;
        id: number;
        title: string;
        subtitle: string;
        icon: string;
        backgroundColor: string;
        subCategoriesSlide: Array<{
            code: string;
            id: number;
            title: string;
            slug: string;
            labelText: string;
            labelColor: string;
            categoryId: number;
            categoryTitle: string;
            isPayment: boolean;
        }>;
    };
}

export const categorySubcategoriesApiService = {
    getSubcategoriesByCategorySlug: async (slug: string): Promise<CategorySubcategoriesResponse> => {
        try {
            const response = await faquizApiInstance.get<CategorySubcategoriesResponse>(`/categories/${slug}/subcategories`);
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },
};

// Fix Quiz API
export interface FixQuizRequestPayload {
    question_name: string;
    question_code: string;
    chapter_name: string;
    chapter_code: string;
    is_note_correct: boolean;
    options: Array<{
        option_name: string;
        option_code: string;
        option_alpha: string;
        is_choose: boolean;
    }>;
    contributor_name: string;
    contributor_id: string;
    keyword: string;
    explanation: string;
}

// Fix Quiz API instance - sử dụng base URL trực tiếp
const fixQuizApiInstance = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Accept': 'application/json',
    },
});

// Add auth token to fix quiz requests
fixQuizApiInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const fixQuizApiService = {
    requestFixQuiz: async (payload: FixQuizRequestPayload, imageFile?: File): Promise<void> => {
        try {
            const formData = new FormData();

            // Thêm payload vào formData
            formData.append('payload', JSON.stringify(payload));

            // Thêm ảnh nếu có
            if (imageFile) {
                formData.append('option_img', imageFile);
            }

            await fixQuizApiInstance.post('/faquiz/request-fix-quiz', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
        } catch (error: any) {
            throw error;
        }
    },
};

// Google Search API
export interface GoogleSearchImage {
    contextLink: string;
    height: number;
    width: number;
    byteSize: number;
    thumbnailLink: string;
    thumbnailHeight: number;
    thumbnailWidth: number;
}

export interface GoogleSearchResult {
    title: string;
    link: string;
    displayLink: string;
    snippet: string;
    image?: GoogleSearchImage;
}

export interface GoogleSearchPagination {
    pageSize: number;
    pageOffset: number;
    totalRecords: number;
    totalPages: number;
}

export interface GoogleSearchResponse {
    meta: {
        code: number;
        message: string;
    };
    data: {
        results: GoogleSearchResult[];
        pagination: GoogleSearchPagination;
    };
}

// Google Search API instance - sử dụng BASE_URL trực tiếp
const googleSearchApiInstance = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Accept': 'application/json',
    },
});

// Add auth token to Google Search requests
googleSearchApiInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const googleSearchApiService = {
    search: async (params: {
        keyword: string;
        type: 'website' | 'image' | 'video';
        pageOffset?: number;
        pageSize?: number;
    }): Promise<GoogleSearchResponse> => {
        try {
            const queryParams = new URLSearchParams();
            queryParams.append('keyword', params.keyword);
            queryParams.append('type', params.type);

            if (params.pageOffset !== undefined) {
                queryParams.append('pageOffset', params.pageOffset.toString());
            }
            if (params.pageSize !== undefined) {
                queryParams.append('pageSize', params.pageSize.toString());
            }

            const response = await googleSearchApiInstance.get<GoogleSearchResponse>(
                `/faquiz/google-search?${queryParams.toString()}`
            );
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },
};

// Chat API Types
export interface ChatMessageRequest {
    targetUserId: number;
    username: string;
    fullName: string;
    avatar: string | null;
    message: string;
    timestamp: number;
    type: 'message' | 'icon' | 'sticker' | 'image';
    media?: string | null; // Media URL/ID cho icon/sticker/image
    audio?: string | null; // Audio URL nếu sticker có audio
}

export interface ChatMessageResponse {
    meta: {
        code: number;
        message: string;
    };
    data: {
        id: string;
        saved: boolean;
    };
}

export interface ChatMessage {
    id: string;
    userId: number;
    username: string;
    fullName: string;
    avatar: string | null;
    message: string;
    timestamp: number;
    type: 'message' | 'icon' | 'sticker' | 'image';
    media?: string | null; // Media URL/ID cho icon/sticker/image
    audio?: string | null; // Audio URL nếu sticker có audio
}

export interface GetMessagesResponse {
    meta: {
        code: number;
        message: string;
    };
    data: {
        messages: ChatMessage[];
        hasMore: boolean;
        count: number;
    };
}

export interface ChatConversation {
    targetUserId: number;
    targetUsername: string;
    targetFullName: string;
    targetAvatar: string | null;
    lastMessage: ChatMessage | null;
    unreadCount: number;
}

export interface GetConversationsResponse {
    meta: {
        code: number;
        message: string;
    };
    data: {
        conversations: ChatConversation[];
    };
}

export interface MarkReadRequest {
    targetUserId: number;
}

export interface MarkReadResponse {
    meta: {
        code: number;
        message: string;
    };
    data: {
        marked: boolean;
    };
}

// Chat API instance - sử dụng BASE_URL trực tiếp
const chatApiInstance = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Add auth token to Chat API requests
chatApiInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Upload Image API Types
export interface UploadImageResponse {
    meta: {
        code: number;
        message: string;
    };
    data: {
        urlFile: string;
    };
}

// Upload Image API instance - sử dụng BASE_URL trực tiếp
const uploadImageApiInstance = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Accept': 'application/json',
    },
});

// Add auth token to upload image requests
uploadImageApiInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Chat API Service
export const chatApiService = {
    // Upload ảnh
    uploadImage: async (file: File): Promise<UploadImageResponse> => {
        try {
            const formData = new FormData();
            formData.append('files', file);

            const response = await uploadImageApiInstance.post<UploadImageResponse>(
                '/v1/file/upload-course-image',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },

    // Upload audio (sử dụng endpoint riêng cho audio)
    uploadAudio: async (file: File): Promise<UploadImageResponse> => {
        try {
            const formData = new FormData();
            formData.append('files', file);

            const response = await uploadImageApiInstance.post<UploadImageResponse>(
                '/v1/file/upload-course-audio',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },

    // Gửi tin nhắn
    sendMessage: async (payload: ChatMessageRequest): Promise<ChatMessageResponse> => {
        try {
            const response = await chatApiInstance.post<ChatMessageResponse>(
                '/faquiz/v1/chat/messages',
                payload
            );
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },

    // Lấy danh sách tin nhắn
    getMessages: async (params: {
        targetUserId: number;
        limit?: number;
        beforeTimestamp?: number;
    }): Promise<GetMessagesResponse> => {
        try {
            const queryParams = new URLSearchParams();
            queryParams.append('targetUserId', params.targetUserId.toString());
            if (params.limit !== undefined) {
                queryParams.append('limit', params.limit.toString());
            }
            if (params.beforeTimestamp !== undefined) {
                queryParams.append('beforeTimestamp', params.beforeTimestamp.toString());
            }

            const response = await chatApiInstance.get<GetMessagesResponse>(
                `/faquiz/v1/chat/messages?${queryParams.toString()}`
            );
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },

    // Lấy danh sách conversations
    getConversations: async (params?: {
        limit?: number;
    }): Promise<GetConversationsResponse> => {
        try {
            const queryParams = new URLSearchParams();
            if (params?.limit !== undefined) {
                queryParams.append('limit', params.limit.toString());
            }

            const url = queryParams.toString()
                ? `/faquiz/v1/chat/conversations?${queryParams.toString()}`
                : '/faquiz/v1/chat/conversations';

            const response = await chatApiInstance.get<GetConversationsResponse>(url);
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },

    // Đánh dấu đã đọc
    markAsRead: async (payload: MarkReadRequest): Promise<MarkReadResponse> => {
        try {
            const response = await chatApiInstance.post<MarkReadResponse>(
                '/faquiz/v1/chat/messages/read',
                payload
            );
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },
};

export default api;