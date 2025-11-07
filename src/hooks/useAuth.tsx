'use client';

import React, {createContext, useContext, useEffect, useState, useRef, ReactNode} from 'react';
import {User, LoginRequest, RegisterRequest} from '@/types';
import {authApiService} from '@/lib/api';
import {useUserCache} from './useUserCache';
import {handle401Error} from '@/lib/authUtils';
import {resetFirePoints} from '@/lib/firePointsUtils';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isInitialized: boolean;
    login: (data: LoginRequest) => Promise<void>;
    register: (data: RegisterRequest) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({children}) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);
    const hasInitializedRef = useRef(false);
    
    // Use the cache hook
    const { saveUserToCache, getUserFromCache, clearUserCache } = useUserCache();

    // Effect để initialize auth khi component mount hoặc khi isInitialized reset về false
    useEffect(() => {
        // Chỉ chạy một lần khi mount, hoặc khi isInitialized reset về false sau logout
        if (hasInitializedRef.current && isInitialized) {
            return;
        }

        const initAuth = async () => {
            // Kiểm tra localStorage có sẵn không (tránh lỗi SSR)
            if (typeof window === 'undefined') {
                setLoading(false);
                setIsInitialized(true);
                hasInitializedRef.current = true;
                return;
            }

            const token = localStorage.getItem('auth_token');

            if (token) {
                // First, try to get user from cache
                const cachedUser = getUserFromCache();
                if (cachedUser) {
                    setUser(cachedUser);
                    setLoading(false);
                    setIsInitialized(true);
                    hasInitializedRef.current = true;
                    return;
                }

                // If no cache, fetch from API
                try {
                    const userData = await authApiService.getProfile();
                    setUser(userData);
                    saveUserToCache(userData);
                } catch (error: any) {
                    // Check if it's a 401 error and handle it
                    if (error?.response?.status === 401) {
                        handle401Error();
                        setIsInitialized(false); // Reset để có thể re-initialize
                        hasInitializedRef.current = false;
                    } else {
                        localStorage.removeItem('auth_token');
                        clearUserCache();
                        resetFirePoints(); // Reset đốm lửa khi có lỗi
                        setUser(null);
                    }
                }
            } else {
                clearUserCache();
                resetFirePoints(); // Reset đốm lửa khi không có token
            }

            setLoading(false);
            setIsInitialized(true);
            hasInitializedRef.current = true;
        };

        initAuth().catch(() => {
            setLoading(false);
            setIsInitialized(true);
            hasInitializedRef.current = true;
        });
    }, [isInitialized]); // Chỉ depend on isInitialized để có thể re-run khi reset về false

    const login = async (data: LoginRequest) => {
        setLoading(true);

        try {
            // Step 1: Gọi API đăng nhập để lấy token
            const loginResponse = await authApiService.login(data);

            // Extract token from response: { token: "...", login: true }
            const token = loginResponse?.token;

            if (!token) {
                throw new Error('No token received from login API');
            }

            // Step 2: Lưu token vào localStorage
            localStorage.setItem('auth_token', token);

            // Step 2.5: Đợi một chút để đảm bảo token đã được lưu và axios interceptor có thể đọc được
            // Điều này giải quyết vấn đề race condition khi user lần đầu mở web
            await new Promise(resolve => setTimeout(resolve, 50));

            // Verify token đã được lưu trước khi gọi getProfile
            const savedToken = localStorage.getItem('auth_token');
            if (!savedToken || savedToken !== token) {
                throw new Error('Token verification failed');
            }

            // Step 3: Gọi API getProfile để lấy user data
            const userData = await authApiService.getProfile();

            // Step 4: Set user data and cache it
            setUser(userData);
            saveUserToCache(userData);
            setIsInitialized(true); // Đảm bảo isInitialized được set khi login thành công
            hasInitializedRef.current = true; // Đánh dấu đã initialized

        } catch (error: any) {
            // Cleanup nếu có lỗi
            localStorage.removeItem('auth_token');
            clearUserCache();
            resetFirePoints(); // Reset đốm lửa khi login thất bại
            setUser(null);
            setIsInitialized(false); // Reset isInitialized khi login thất bại
            hasInitializedRef.current = false; // Reset ref
            throw error;
        } finally {
            setLoading(false);
        }
    };


    const register = async (data: RegisterRequest) => {
        setLoading(true);
        try {
            // Step 1: Gọi API đăng ký
            await authApiService.register(data);

            // Step 2: Đăng nhập luôn sau khi đăng ký thành công
            const loginResponse = await authApiService.login({
                username: data.username,
                password: data.password,
            });

            const token = loginResponse?.token;
            if (!token) {
                throw new Error('No token received from login API after register');
            }

            localStorage.setItem('auth_token', token);

            // Step 2.5: Đợi một chút để đảm bảo token đã được lưu và axios interceptor có thể đọc được
            await new Promise(resolve => setTimeout(resolve, 50));

            // Verify token đã được lưu trước khi gọi getProfile
            const savedToken = localStorage.getItem('auth_token');
            if (!savedToken || savedToken !== token) {
                throw new Error('Token verification failed');
            }

            // Step 3: Lấy profile
            const userData = await authApiService.getProfile();
            setUser(userData);
            saveUserToCache(userData);
            setIsInitialized(true); // Đảm bảo isInitialized được set khi register thành công
            hasInitializedRef.current = true; // Đánh dấu đã initialized
        } catch (error: any) {
            localStorage.removeItem('auth_token');
            clearUserCache();
            resetFirePoints();
            setUser(null);
            setIsInitialized(false); // Reset isInitialized khi register thất bại
            hasInitializedRef.current = false; // Reset ref
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        setLoading(true);
        try {
            await authApiService.logout();
        } catch (error: any) {
            // Silent fail
        } finally {
            localStorage.removeItem('auth_token');
            clearUserCache();
            resetFirePoints(); // Reset đốm lửa khi logout
            setUser(null);
            setIsInitialized(false); // Reset isInitialized để có thể re-initialize khi login lại
            hasInitializedRef.current = false; // Reset ref để có thể re-initialize
            setLoading(false);
        }
    };

    const refreshUser = async () => {
        try {
            const userData = await authApiService.getProfile();
            setUser(userData);
            saveUserToCache(userData);
        } catch (error: any) {
            // Check if it's a 401 error and handle it
            if (error?.response?.status === 401) {
                handle401Error();
            } else {
                localStorage.removeItem('auth_token');
                clearUserCache();
                resetFirePoints(); // Reset đốm lửa khi refresh thất bại
                setUser(null);
            }
        }
    };

    const value = {
        user,
        loading,
        isInitialized,
        login,
        register,
        logout,
        refreshUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};