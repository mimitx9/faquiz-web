/**
 * Utility functions for handling authentication errors
 */

/**
 * Handles 401 authentication errors by clearing auth data
 */
export const handle401Error = () => {
    if (typeof window !== 'undefined') {
        console.log('🔍 Auth Utils: 401 error detected, clearing auth data');
        
        // Clear auth data
        localStorage.removeItem('auth_token');
    }
};

/**
 * Checks if a response status is 401 and handles it
 * @param status - HTTP status code
 * @returns true if handled 401, false otherwise
 */
export const checkAndHandle401 = (status: number): boolean => {
    if (status === 401) {
        handle401Error();
        return true;
    }
    return false;
};

/**
 * Wrapper for fetch that automatically handles 401 errors
 * @param url - Request URL
 * @param options - Fetch options
 * @returns Promise<Response>
 */
export const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
    // Ensure site header is always set
    const headers = new Headers(options.headers || {});
    headers.set('site', 'BATTLE');
    
    const response = await fetch(url, {
        ...options,
        headers,
    });
    
    if (!response.ok && checkAndHandle401(response.status)) {
        throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
    
    return response;
};
