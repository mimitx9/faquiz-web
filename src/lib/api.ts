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
import { handle401Error } from './authUtils';

// Base URL configuration
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.facourse.com/fai' 
  : 'http://localhost:7071/fai';

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

export default api;