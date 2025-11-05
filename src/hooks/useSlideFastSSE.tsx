'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CategoriesSlide, SlideFastSSEEvent, SubCategoriesSlide, SlideFastResponse } from '@/types';

interface UseSlideFastSSEReturn {
    top10Categories: CategoriesSlide[];
    top10SubCategories: SubCategoriesSlide[];
    allCategories: CategoriesSlide[]; // Full data for search
    loading: boolean;
    error: Error | null;
    isComplete: boolean;
    reconnect: () => void;
}

export const useSlideFastSSE = (): UseSlideFastSSEReturn => {
    const [top10Categories, setTop10Categories] = useState<CategoriesSlide[]>([]);
    const [top10SubCategories, setTop10SubCategories] = useState<SubCategoriesSlide[]>([]);
    const [allCategories, setAllCategories] = useState<CategoriesSlide[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [isComplete, setIsComplete] = useState(false);
    
    const abortControllerRef = useRef<AbortController | null>(null);
    const BASE_URL = process.env.NODE_ENV === 'production' 
        ? 'https://api.facourse.com/fai' 
        : 'http://localhost:7071/fai';
    const SSE_URL = `${BASE_URL}/v1/category/slide-fast`;

    const connect = useCallback(() => {
        // Abort existing connection if any
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        setLoading(true);
        setError(null);
        setIsComplete(false);

        const token = localStorage.getItem('auth_token');
        if (!token) {
            setError(new Error('No auth token found'));
            setLoading(false);
            return () => {}; // Return empty cleanup function
        }

        // Use fetch API instead of EventSource to support custom headers
        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        
        console.log('🔗 SSE: Connecting to:', SSE_URL);
        console.log('🔗 SSE: Token present:', token ? 'Yes' : 'No');
        
        fetch(SSE_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'text/event-stream',
            },
            signal: abortController.signal,
        })
        .then(response => {
            console.log('📡 SSE: Response status:', response.status);
            console.log('📡 SSE: Response headers:', Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (!response.body) {
                throw new Error('Response body is null');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let currentEvent = '';
            let currentDataLines: string[] = [];

            const processStream = async () => {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        
                        if (done) {
                            console.log('✅ SSE: Stream completed');
                            setIsComplete(true);
                            setLoading(false);
                            break;
                        }

                        const chunk = decoder.decode(value, { stream: true });
                        console.log('📦 SSE: Received chunk:', chunk.substring(0, 200));
                        buffer += chunk;
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || ''; // Keep incomplete line in buffer

                        for (const line of lines) {
                            const trimmedLine = line.trim();
                            console.log('📝 SSE: Processing line:', trimmedLine.substring(0, 100));
                            
                            if (trimmedLine.startsWith('event: ')) {
                                currentEvent = trimmedLine.slice(7).trim();
                                console.log('🎯 SSE: Event type:', currentEvent);
                            } else if (trimmedLine.startsWith('data: ')) {
                                // Nối các dòng data lại với nhau (theo chuẩn SSE)
                                const dataIndex = line.indexOf('data: ');
                                if (dataIndex !== -1) {
                                    const dataContent = line.slice(dataIndex + 6); // Lấy phần sau "data: "
                                    currentDataLines.push(dataContent);
                                }
                            } else if (trimmedLine === '') {
                                // Dòng trống báo hiệu kết thúc event - parse JSON ở đây
                                if (currentDataLines.length > 0) {
                                    const fullDataString = currentDataLines.join('\n');
                                    console.log('📊 SSE: Complete data received:', fullDataString.substring(0, 200));
                                    
                                    try {
                                        // Thử parse theo format mới (SlideFastResponse) trước
                                        const responseData: SlideFastResponse | SlideFastSSEEvent = JSON.parse(fullDataString);
                                        
                                        // Kiểm tra xem có phải format mới không (có top10Categories, top10SubCategories, fullData)
                                        if ('top10Categories' in responseData && 'top10SubCategories' in responseData && 'fullData' in responseData) {
                                            // Format mới: một object duy nhất
                                            const newFormatData = responseData as SlideFastResponse;
                                            console.log('✅ SSE: Received new format (SlideFastResponse)');
                                            console.log('📊 SSE: Top10Categories:', newFormatData.top10Categories.length);
                                            console.log('📊 SSE: Top10SubCategories:', newFormatData.top10SubCategories.length);
                                            console.log('📊 SSE: FullData categories:', newFormatData.fullData.categoriesSlide.length);
                                            
                                            setTop10Categories(newFormatData.top10Categories);
                                            setTop10SubCategories(newFormatData.top10SubCategories);
                                            setAllCategories(newFormatData.fullData.categoriesSlide);
                                            setLoading(false);
                                        } else if ('type' in responseData) {
                                            // Format cũ: các event riêng lẻ
                                            const eventData = responseData as SlideFastSSEEvent;
                                            console.log('✅ SSE: Parsed event (old format):', {
                                                type: eventData.type,
                                                hasData: !!eventData.data,
                                                dataType: Array.isArray(eventData.data) ? 'array' : typeof eventData.data,
                                                dataLength: Array.isArray(eventData.data) ? eventData.data.length : 'N/A'
                                            });

                                            switch (eventData.type) {
                                                case 'top10_categories':
                                                    if (Array.isArray(eventData.data)) {
                                                        const categories = eventData.data as CategoriesSlide[];
                                                        console.log('📊 SSE: Setting top 10 categories:', categories.length, categories);
                                                        setTop10Categories(categories);
                                                        setLoading(false);
                                                    } else {
                                                        console.warn('⚠️ SSE: top10_categories data is not an array:', eventData.data);
                                                    }
                                                    break;

                                                case 'top10_subcategories':
                                                    if (Array.isArray(eventData.data)) {
                                                        const subCategories = eventData.data as SubCategoriesSlide[];
                                                        console.log('📊 SSE: Setting top 10 subcategories:', subCategories.length, subCategories);
                                                        setTop10SubCategories(subCategories);
                                                    } else {
                                                        console.warn('⚠️ SSE: top10_subcategories data is not an array:', eventData.data);
                                                    }
                                                    break;

                                                case 'full_data':
                                                    if (eventData.data && typeof eventData.data === 'object' && 'categoriesSlide' in eventData.data) {
                                                        const fullData = eventData.data as { categoriesSlide: CategoriesSlide[] };
                                                        console.log('📊 SSE: Setting full data for search:', fullData.categoriesSlide.length, fullData.categoriesSlide);
                                                        setAllCategories(fullData.categoriesSlide);
                                                        setLoading(false);
                                                    } else {
                                                        console.warn('⚠️ SSE: full_data structure unexpected:', eventData.data);
                                                    }
                                                    break;

                                                case 'complete':
                                                    console.log('✅ SSE: Stream complete');
                                                    setIsComplete(true);
                                                    setLoading(false);
                                                    abortController.abort();
                                                    break;

                                                default:
                                                    console.warn('⚠️ SSE: Unknown event type:', eventData.type, 'Full data:', eventData);
                                            }
                                        } else {
                                            console.warn('⚠️ SSE: Unknown data format:', responseData);
                                        }
                                    } catch (parseError) {
                                        console.error('❌ SSE: Error parsing event data:', parseError);
                                        console.error('❌ SSE: Raw data:', fullDataString);
                                        console.error('❌ SSE: Current event:', currentEvent);
                                        setError(new Error(`Failed to parse SSE event data: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`));
                                    }
                                }
                                
                                // Reset for next event
                                currentEvent = '';
                                currentDataLines = [];
                            }
                        }
                    }
                } catch (readError) {
                    if (readError instanceof Error && readError.name === 'AbortError') {
                        console.log('🔄 SSE: Stream aborted');
                    } else {
                        console.error('❌ SSE: Error reading stream:', readError);
                        setError(readError instanceof Error ? readError : new Error('Failed to read SSE stream'));
                        setLoading(false);
                    }
                }
            };

            processStream();
        })
        .catch(err => {
            if (err instanceof Error && err.name === 'AbortError') {
                console.log('🔄 SSE: Request aborted');
            } else {
                console.error('❌ SSE: Failed to connect:', err);
                console.error('❌ SSE: Error details:', {
                    message: err instanceof Error ? err.message : 'Unknown error',
                    name: err instanceof Error ? err.name : 'Unknown',
                    stack: err instanceof Error ? err.stack : 'No stack'
                });
                setError(err instanceof Error ? err : new Error('Failed to connect to SSE'));
                setLoading(false);
            }
        });

        // Return cleanup function
        return () => {
            abortController.abort();
        };
    }, [SSE_URL]);

    useEffect(() => {
        const cleanup = connect();

        // Cleanup on unmount
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
            cleanup();
        };
    }, [connect]);

    // Debug: Log categories changes
    useEffect(() => {
        console.log('📋 SSE: Top10 Categories state updated:', {
            count: top10Categories.length,
            categories: top10Categories.map(c => ({ id: c.id, code: c.code, title: c.title }))
        });
    }, [top10Categories]);

    useEffect(() => {
        console.log('📋 SSE: Top10 SubCategories state updated:', {
            count: top10SubCategories.length,
            subCategories: top10SubCategories.map(sc => ({ id: sc.id, code: sc.code, title: sc.title }))
        });
    }, [top10SubCategories]);

    const reconnect = useCallback(() => {
        console.log('🔄 SSE: Reconnecting...');
        connect();
    }, [connect]);

    return {
        top10Categories,
        top10SubCategories,
        allCategories,
        loading,
        error,
        isComplete,
        reconnect
    };
};

