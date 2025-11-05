'use client';

import { useCallback } from 'react';
import { User } from '@/types';

// Cache configuration
const USER_CACHE_KEY = 'user_profile_cache';
const DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface UserCache {
    user: User;
    timestamp: number;
}

export const useUserCache = () => {
    const saveUserToCache = useCallback((userData: User, duration: number = DEFAULT_CACHE_DURATION) => {
        if (typeof window !== 'undefined') {
            const cache: UserCache = {
                user: userData,
                timestamp: Date.now()
            };
            localStorage.setItem(USER_CACHE_KEY, JSON.stringify(cache));
        }
    }, []);

    const getUserFromCache = useCallback((duration: number = DEFAULT_CACHE_DURATION): User | null => {
        if (typeof window === 'undefined') return null;
        
        try {
            const cached = localStorage.getItem(USER_CACHE_KEY);
            if (!cached) return null;

            const cache: UserCache = JSON.parse(cached);
            const now = Date.now();
            
            // Check if cache is still valid
            if (now - cache.timestamp < duration) {
                return cache.user;
            } else {
                localStorage.removeItem(USER_CACHE_KEY);
                return null;
            }
        } catch (error) {
            localStorage.removeItem(USER_CACHE_KEY);
            return null;
        }
    }, []);

    const clearUserCache = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(USER_CACHE_KEY);
        }
    }, []);

    const isCacheValid = useCallback((duration: number = DEFAULT_CACHE_DURATION): boolean => {
        if (typeof window === 'undefined') return false;
        
        try {
            const cached = localStorage.getItem(USER_CACHE_KEY);
            if (!cached) return false;

            const cache: UserCache = JSON.parse(cached);
            const now = Date.now();
            
            return now - cache.timestamp < duration;
        } catch {
            return false;
        }
    }, []);

    const getCacheAge = useCallback((): number => {
        if (typeof window === 'undefined') return 0;
        
        try {
            const cached = localStorage.getItem(USER_CACHE_KEY);
            if (!cached) return 0;

            const cache: UserCache = JSON.parse(cached);
            return Date.now() - cache.timestamp;
        } catch {
            return 0;
        }
    }, []);

    return {
        saveUserToCache,
        getUserFromCache,
        clearUserCache,
        isCacheValid,
        getCacheAge
    };
};
