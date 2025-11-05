import axios from 'axios';
import {
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    User,
    ApiResponse,
    CreateQuizAttemptResponse,
    GetQuizAttemptResponse,
    QuizAttemptResponse,
    RegisterUserResponse,
    QuizSubmitData,
    QuizSubmitResponse,
    SubscriptionPlan,
    AttemptHistoryResponse,
    QuizRoom,
    QuestionsByCategoryRequest,
    QuestionsByCategoryResponse,
    QuestionsBySubCategoryRequest,
    QuestionsBySubCategoryResponse,
    UserBagResponse,
    GlobalRank,
    NewQuizzesResponse,
    NewSubjectsResponse,
    QuizDetail,
    QuizResult,
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
    console.log('🔍 Quiz API Token:', token ? 'Present' : 'Missing');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔍 Authorization header set');
    } else {
        console.warn('⚠️ No auth token found for quiz API');
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

masterApiInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
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

// Add response interceptors để handle 401 errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.log('🔍 API: 401 error detected, redirecting to login');
            handle401Error();
        }
        return Promise.reject(error);
    }
);

userProfileApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.log('🔍 UserProfile API: 401 error detected, redirecting to login');
            handle401Error();
        }
        return Promise.reject(error);
    }
);

quizApiInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        // Không redirect 401 cho quiz API - cho phép làm quiz không cần token
        if (error.response?.status === 401) {
            console.log('🔍 Quiz API: 401 error detected, but allowing quiz without token');
            // Không gọi handle401Error() để không redirect
        }
        return Promise.reject(error);
    }
);

quizBattleApiInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.log('🔍 Quiz Battle API: 401 error detected, redirecting to login');
            handle401Error();
        }
        return Promise.reject(error);
    }
);

masterApiInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.log('🔍 Master API: 401 error detected, redirecting to login');
            handle401Error();
        }
        return Promise.reject(error);
    }
);

quizWebApiInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        // Không redirect 401 cho quiz web API - cho phép làm quiz không cần token
        if (error.response?.status === 401) {
            console.log('🔍 Quiz Web API: 401 error detected, but allowing quiz without token');
            // Không gọi handle401Error() để không redirect
        }
        return Promise.reject(error);
    }
);

categoryApiInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.log('🔍 Category API: 401 error detected, redirecting to login');
            handle401Error();
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authApiService = {
    login: async (data: LoginRequest): Promise<{ token: string; login: boolean }> => {
        console.log('🔍 API: Login request data:', data);

        const response = await authApi.post<ApiResponse<AuthResponse>>('/auth-mini', data);

        console.log('🔍 API: Raw response:', response);
        console.log('🔍 API: Response data:', response.data);
        console.log('🔍 API: Response status:', response.status);

        // Check response structure matches expected format
        if (response.data && response.data.data && response.data.data.token) {
            console.log('🔍 API: Login successful, token received');
            return {
                token: response.data.data.token,
                login: response.data.data.login ?? true
            };
        } else {
            console.error('❌ API: Unexpected login response structure:', response.data);
            throw new Error('Invalid login response structure');
        }
    },

    register: async (data: RegisterRequest): Promise<User> => {
        console.log('🔍 API: Register request data:', data);

        const response = await authApi.post<ApiResponse<RegisterUserResponse>>('/register-mini', data);

        console.log('🔍 API: Register response:', response.data);

        if (response.data && response.data.data) {
            console.log('🔍 API: Register successful, user created');
            // Convert RegisterUserResponse to User format
            const userData: User = {
                userId: response.data.data.id,
                email: response.data.data.email,
                username: response.data.data.username,
                fullName: response.data.data.username, // Use username as fullName if not available
                avatar: undefined,
                university: undefined,
                subscriptionType: 'free',
                countAttempt: 0,
                createdAt: response.data.data.createdAt,
                updatedAt: response.data.data.updatedAt
            };
            return userData;
        } else {
            throw new Error('Invalid register response structure');
        }
    },

    getProfile: async (): Promise<User> => {
        try {
            console.log('🔍 API: Calling getProfile...');
            const response = await userProfileApi.get('/profile-battle');

            console.log('🔍 API: getProfile response:', response);
            console.log('🔍 API: getProfile data:', response.data);

            // Xử lý response linh hoạt - có thể là ApiResponse hoặc trực tiếp User
            let userData: any;
            if (response.data.data) {
                userData = response.data.data;
                console.log('🔍 API: Using nested data structure');
            } else {
                userData = response.data;
                console.log('🔍 API: Using direct data structure');
            }

            if (userData && userData.rank && !userData.globalRank) {
                userData.globalRank = userData.rank;
                delete userData.rank;
            }

            console.log('🔍 API: Final user data:', userData);
            return userData as User;
        } catch (error: any) {
            console.error('❌ API: getProfile failed:', error);
            console.error('❌ API: Error response:', error.response?.data);
            console.error('❌ API: Error status:', error.response?.status);
            throw error;
        }
    },

    logout: async (): Promise<void> => {
        try {
            await api.post('/auth/logout');
        } catch {
            // Logout có thể fail nhưng vẫn clear local state
            console.log('Logout API failed, but continuing with local cleanup');
        }
    },
};

// Quiz Battle API
export const quizBattleApiService = {
    getShoppingMall: async (): Promise<{ meta: { code: number; message: string }, data: Array<{ id: number; itemCode: string; status: string; description: string; quantity: number; priceInKey: number }> }> => {
        try {
            console.log('🔍 API: Calling getShoppingMall...');
            const response = await quizBattleApiInstance.get('/shopping-mall');
            console.log('🔍 API: getShoppingMall response:', response);
            return response.data;
        } catch (error: any) {
            console.error('❌ API: getShoppingMall failed:', error);
            console.error('❌ API: Error response:', error.response?.data);
            console.error('❌ API: Error status:', error.response?.status);
            throw error;
        }
    },
    
    getQuestionsBySubCategory: async (payload: QuestionsBySubCategoryRequest): Promise<QuestionsBySubCategoryResponse> => {
        try {
            console.log('🔍 API: Calling getQuestionsBySubCategory with slug:', payload.slug);
            const response = await quizBattleApiInstance.post<QuestionsBySubCategoryResponse>('/questions/by-sub-category', payload);
            console.log('🔍 API: getQuestionsBySubCategory response:', response);
            return response.data;
        } catch (error: any) {
            console.error('❌ API: getQuestionsBySubCategory failed:', error);
            console.error('❌ API: Error response:', error.response?.data);
            console.error('❌ API: Error status:', error.response?.status);
            throw error;
        }
    },
    consumeItem: async (payload: { itemCode: string; quantity: number }): Promise<{ meta: { code: number; message: string }, data?: { userBag: any } }> => {
        try {
            console.log('🔍 API: Calling consumeItem...', payload);
            const response = await quizBattleApiInstance.post('/consume-item', payload);
            console.log('🔍 API: consumeItem response:', response);
            return response.data;
        } catch (error: any) {
            console.error('❌ API: consumeItem failed:', error);
            throw error;
        }
    },
    getUserBag: async (): Promise<UserBagResponse> => {
        try {
            console.log('🔍 API: Calling getUserBag...');
            const response = await quizBattleApiInstance.get<UserBagResponse>('/user-bag');
            
            console.log('🔍 API: getUserBag response:', response);
            console.log('🔍 API: getUserBag data:', response.data);
            
            return response.data;
        } catch (error: any) {
            console.error('❌ API: getUserBag failed:', error);
            console.error('❌ API: Error response:', error.response?.data);
            console.error('❌ API: Error status:', error.response?.status);
            throw error;
        }
    },

    getQuestionsByCategory: async (requestData: QuestionsByCategoryRequest): Promise<QuestionsByCategoryResponse> => {
        try {
            console.log('🔍 API: Calling getQuestionsByCategory with categoryCode:', requestData.categoryCode);
            const response = await quizBattleApiInstance.post<QuestionsByCategoryResponse>('/questions/by-category', requestData);
            
            console.log('🔍 API: getQuestionsByCategory response:', response);
            console.log('🔍 API: getQuestionsByCategory data:', response.data);
            
            return response.data;
        } catch (error: any) {
            console.error('❌ API: getQuestionsByCategory failed:', error);
            console.error('❌ API: Error response:', error.response?.data);
            console.error('❌ API: Error status:', error.response?.status);
            throw error;
        }
    },

    getUserRanking: async (): Promise<{ data: { globalRank: GlobalRank } }> => {
        try {
            console.log('🔍 API: Calling getUserRanking...');
            const response = await quizBattleApiInstance.get<{ data: { globalRank: GlobalRank } }>('/user-ranking');
            
            console.log('🔍 API: getUserRanking response:', response);
            console.log('🔍 API: getUserRanking data:', response.data);
            
            return response.data;
        } catch (error: any) {
            console.error('❌ API: getUserRanking failed:', error);
            console.error('❌ API: Error response:', error.response?.data);
            console.error('❌ API: Error status:', error.response?.status);
            
            // Return mock data if API fails
            console.log('🔍 API: Returning mock ranking data...');
            return {
                data: {
                    globalRank: {
                        userId: 0,
                        url: "https://storage.googleapis.com/faquiz2/rankiCon/Fe3.png",
                        title: "Lv 10. Vàng V",
                        color: "#FFD700",
                        level: 10,
                        levelId: 5,
                        extraData: {
                            currentCountAchieve: 250,
                            currentCountLose: 23,
                            currentCountWin: 1,
                            nextRank: {
                                url: "https://storage.googleapis.com/faquiz2/rankiCon/Fe2.png",
                                title: "Lv 11. Vàng IV",
                                color: "#FFD700",
                                level: 11,
                                levelId: 6
                            },
                            targetNextLevel: 400,
                            userRanking: 0
                        }
                    }
                }
            };
        }
    },
};

// Master API
export const masterApiService = {
    getUniversities: async (): Promise<{
        meta: { code: number; message: string };
        pagination: { pageSize: number; pageOffset: number; totalRecords: number; totalPages: number };
        data: Array<{ text: string; code: string; image?: string }>;
    }> => {
        try {
            console.log('🔍 API: Calling getUniversities...');
            const response = await masterApiInstance.get('/list', {
                params: { filterType: 'UNIVERSITY' },
            });
            console.log('🔍 API: getUniversities response:', response);
            return response.data;
        } catch (error: any) {
            console.error('❌ API: getUniversities failed:', error);
            console.error('❌ API: Error response:', error.response?.data);
            console.error('❌ API: Error status:', error.response?.status);
            throw error;
        }
    },
};

// Quiz Web API
export const quizWebApiService = {
    getNewQuizzes: async (): Promise<NewQuizzesResponse> => {
        try {
            console.log('🔍 API: Calling getNewQuizzes...');
            const response = await quizWebApiInstance.get<NewQuizzesResponse>('/new-quizzes');
            console.log('🔍 API: getNewQuizzes response:', response);
            return response.data;
        } catch (error: any) {
            console.error('❌ API: getNewQuizzes failed:', error);
            console.error('❌ API: Error response:', error.response?.data);
            console.error('❌ API: Error status:', error.response?.status);
            throw error;
        }
    },

    getNewSubjects: async (): Promise<NewSubjectsResponse> => {
        try {
            console.log('🔍 API: Calling getNewSubjects...');
            const response = await quizWebApiInstance.get<NewSubjectsResponse>('/new-subjects');
            console.log('🔍 API: getNewSubjects response:', response);
            return response.data;
        } catch (error: any) {
            console.error('❌ API: getNewSubjects failed:', error);
            console.error('❌ API: Error response:', error.response?.data);
            console.error('❌ API: Error status:', error.response?.status);
            throw error;
        }
    },

    getQuizDetail: async (quizId: number): Promise<ApiResponse<QuizDetail>> => {
        try {
            console.log('🔍 API: Calling getQuizDetail...', quizId);
            const response = await quizWebApiInstance.get<ApiResponse<QuizDetail>>(`/quiz/${quizId}`);
            console.log('🔍 API: getQuizDetail response:', response);
            return response.data;
        } catch (error: any) {
            console.error('❌ API: getQuizDetail failed:', error);
            console.error('❌ API: Error response:', error.response?.data);
            console.error('❌ API: Error status:', error.response?.status);
            throw error;
        }
    },

    searchSubjects: async (query: string): Promise<NewSubjectsResponse> => {
        try {
            console.log('🔍 API: Calling searchSubjects...', query);
            const response = await quizWebApiInstance.get<NewSubjectsResponse>('/search-subjects', {
                params: { q: query },
            });
            console.log('🔍 API: searchSubjects response:', response);
            return response.data;
        } catch (error: any) {
            console.error('❌ API: searchSubjects failed:', error);
            console.error('❌ API: Error response:', error.response?.data);
            console.error('❌ API: Error status:', error.response?.status);
            throw error;
        }
    },

    submitQuiz: async (quizId: number, answers: Record<number, string>): Promise<ApiResponse<QuizResult>> => {
        try {
            console.log('🔍 API: Calling submitQuiz...', quizId);
            const response = await quizWebApiInstance.post<ApiResponse<QuizResult>>(`/quiz/${quizId}/submit`, {
                answers,
            });
            console.log('🔍 API: submitQuiz response:', response);
            return response.data;
        } catch (error: any) {
            console.error('❌ API: submitQuiz failed:', error);
            console.error('❌ API: Error response:', error.response?.data);
            console.error('❌ API: Error status:', error.response?.status);
            throw error;
        }
    },
};

// Category API
export const categoryApiService = {
    getSlideFast: async (): Promise<ApiResponse<SlideFastResponse>> => {
        try {
            console.log('🔍 API: Calling getSlideFast...');
            const response = await categoryApiInstance.get<ApiResponse<SlideFastResponse>>('/slide-fast');
            console.log('🔍 API: getSlideFast response:', response);
            return response.data;
        } catch (error: any) {
            console.error('❌ API: getSlideFast failed:', error);
            console.error('❌ API: Error response:', error.response?.data);
            console.error('❌ API: Error status:', error.response?.status);
            throw error;
        }
    },
};

export default api;