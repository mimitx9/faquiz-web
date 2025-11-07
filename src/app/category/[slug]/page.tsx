'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import QuizHeader from '@/components/layout/QuizHeader';
import SearchBar from '@/components/ui/SearchBar';
import { categorySubcategoriesApiService } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { removeVietnameseDiacritics } from '@/lib/utils';
import ProgressBar from '@/components/ui/ProgressBar';

interface SubCategoryItem {
    code: string;
    id: number;
    title: string;
    slug: string;
    labelText: string;
    labelColor: string;
    categoryId: number;
    categoryTitle: string;
    isPayment: boolean;
}

const CategoryPage: React.FC = () => {
    const router = useRouter();
    const params = useParams();
    const { user, isInitialized } = useAuth();
    const slugParam = params?.slug as string;

    const [category, setCategory] = useState<{
        code: string;
        id: number;
        title: string;
        subtitle: string;
        icon: string;
        backgroundColor: string;
    } | null>(null);
    const [subCategories, setSubCategories] = useState<SubCategoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<'oldest' | 'newest'>('oldest');
    const [showSortMenu, setShowSortMenu] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            if (!slugParam) return;
            try {
                setLoading(true);
                setError(null);
                const res = await categorySubcategoriesApiService.getSubcategoriesByCategorySlug(slugParam);
                
                setCategory({
                    code: res.data.code,
                    id: res.data.id,
                    title: res.data.title,
                    subtitle: res.data.subtitle,
                    icon: res.data.icon,
                    backgroundColor: res.data.backgroundColor,
                });
                
                setSubCategories(res.data.subCategoriesSlide || []);
            } catch (e: any) {
                if (e.response?.status === 404) {
                    router.replace('/');
                    return;
                }
                setError('Không thể tải dữ liệu, vui lòng thử lại.');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [slugParam, router]);

    // Lấy danh sách labelText distinct với màu tương ứng
    const distinctLabels = useMemo(() => {
        const labelMap = new Map<string, string>();
        subCategories.forEach((sub) => {
            if (sub.labelText && !labelMap.has(sub.labelText)) {
                labelMap.set(sub.labelText, sub.labelColor);
            }
        });
        return Array.from(labelMap.entries()).map(([text, color]) => ({
            text,
            color,
        }));
    }, [subCategories]);

    // Filter và sort subcategories
    const filteredAndSortedSubCategories = useMemo(() => {
        let filtered = [...subCategories];

        // Filter theo search query (hỗ trợ tìm kiếm không dấu)
        if (searchQuery.trim()) {
            const normalizedQuery = searchQuery.toLowerCase().trim();
            const normalizedQueryNoDiacritics = removeVietnameseDiacritics(normalizedQuery);
            filtered = filtered.filter((sub) => {
                const titleLower = sub.title.toLowerCase();
                const titleNoDiacritics = removeVietnameseDiacritics(titleLower);
                return titleLower.includes(normalizedQuery) || 
                       titleNoDiacritics.includes(normalizedQueryNoDiacritics);
            });
        }

        // Filter theo label
        if (selectedLabel) {
            filtered = filtered.filter((sub) => sub.labelText === selectedLabel);
        }

        // Sort: default là cũ nhất (không cần reverse), mới nhất thì reverse
        if (sortOrder === 'newest') {
            filtered.reverse();
        }

        return filtered;
    }, [subCategories, searchQuery, selectedLabel, sortOrder]);

    const handleSubCategoryClick = (subCategory: SubCategoryItem) => {
        // Nếu là đề PRO và chưa đăng nhập thì redirect đến trang login
        if (subCategory.isPayment === true && isInitialized && !user) {
            router.push('/login');
            return;
        }
        
        // Navigate đến trang subcategory
        router.push(`/${subCategory.slug}`);
    };

    const handleTestTongHopClick = () => {
        if (!category) return;
        
        // Nếu chưa đăng nhập thì redirect đến trang login (vì Test tổng hợp là PRO)
        if (isInitialized && !user) {
            router.push('/login');
            return;
        }
        
        // Navigate đến route test tổng hợp với format {categoryId}-test-mit-tong-hop
        const testTongHopSlug = `${category.id}-test-mit-tong-hop`;
        router.push(`/${testTongHopSlug}`);
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

    if (!category) {
        return null;
    }

    return (
        <div className="min-h-screen bg-white dark:bg-black">
            <QuizHeader />
            <main className="pt-20 px-8 pb-8 max-w-7xl mx-auto">
                {/* Search Bar */}
                <SearchBar
                    value={searchQuery}
                    onChange={(value) => setSearchQuery(value)}
                    placeholder={`Tìm đề môn ${category.title}`}
                />

                {/* Filter và Sort Section */}
                <div className="flex items-center gap-4 mb-8 relative">
                    {/* Sort Icon và Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setShowSortMenu(!showSortMenu)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            aria-label="Sắp xếp"
                        >
                            <svg 
                                width="28" 
                                height="26" 
                                viewBox="0 0 38 35" 
                                fill="none" 
                                xmlns="http://www.w3.org/2000/svg"
                                className="transition-colors"
                            >
                                <g opacity="0.5">
                                    <path 
                                        d="M2.25 7.5H6" 
                                        stroke="#CCCCCC" 
                                        strokeWidth="4.5" 
                                        strokeLinecap="round"
                                    />
                                    <path 
                                        d="M2.25 27H12.75" 
                                        stroke="#CCCCCC" 
                                        strokeWidth="4.5" 
                                        strokeLinecap="round"
                                    />
                                    <path 
                                        d="M30.75 27H35.25" 
                                        stroke="#CCCCCC" 
                                        strokeWidth="4.5" 
                                        strokeLinecap="round"
                                    />
                                    <circle 
                                        cx="24.75" 
                                        cy="27" 
                                        r="5.625" 
                                        stroke="#CCCCCC" 
                                        strokeWidth="3.75"
                                    />
                                    <circle 
                                        cx="12.75" 
                                        cy="7.5" 
                                        r="5.625" 
                                        stroke="#CCCCCC" 
                                        strokeWidth="3.75"
                                    />
                                    <path 
                                        d="M24.75 7.5H35.25" 
                                        stroke="#CCCCCC" 
                                        strokeWidth="4.5" 
                                        strokeLinecap="round"
                                    />
                                </g>
                            </svg>
                        </button>

                        {/* Sort Dropdown Menu */}
                        {showSortMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowSortMenu(false)}
                                />
                                <div className="absolute left-0 top-full mt-2 bg-white dark:bg-black border-2 border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 min-w-[200px]">
                                    <button
                                        onClick={() => {
                                            setSortOrder('newest');
                                            setShowSortMenu(false);
                                        }}
                                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                                            sortOrder === 'newest'
                                                ? 'bg-gray-50 dark:bg-gray-800'
                                                : ''
                                        }`}
                                    >
                                        <span 
                                            className="text-gray-800 dark:text-gray-200"
                                            style={{
                                                color: sortOrder === 'newest' ? '#8D7EF7' : undefined
                                            }}
                                        >
                                            Đề mới nhất
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSortOrder('oldest');
                                            setShowSortMenu(false);
                                        }}
                                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                                            sortOrder === 'oldest'
                                                ? 'bg-gray-50 dark:bg-gray-800'
                                                : ''
                                        }`}
                                    >
                                        <span 
                                            className="text-gray-800 dark:text-gray-200"
                                            style={{
                                                color: sortOrder === 'oldest' ? '#8D7EF7' : undefined
                                            }}
                                        >
                                            Đề cũ nhất
                                        </span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Label Filter Buttons */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <button
                            onClick={() => setSelectedLabel(null)}
                            className="px-6 py-2 rounded-full text-sm font-medium transition-all duration-200"
                            style={{
                                backgroundColor: '#5555550D',
                                color: '#555555',
                            }}
                        >
                            Tất cả
                        </button>
                        {distinctLabels.map((label) => (
                            <button
                                key={label.text}
                                onClick={() =>
                                    setSelectedLabel(
                                        selectedLabel === label.text ? null : label.text
                                    )
                                }
                                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                                    selectedLabel === label.text
                                        ? 'text-white'
                                        : ''
                                }`}
                                style={{
                                    backgroundColor: selectedLabel === label.text
                                        ? label.color
                                        : `${label.color}1A`,
                                    color: selectedLabel === label.text
                                        ? 'white'
                                        : label.color,
                                }}
                            >
                                {label.text}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content List */}
                <div className="space-y-4">
                    {/* Box Test tổng hợp */}
                    <div
                        onClick={handleTestTongHopClick}
                        className="rounded-3xl p-8 cursor-pointer transition-all hover:scale-[1.02] relative overflow-hidden"
                        style={{
                            backgroundColor: '#FFBB001A',
                        }}
                    >
                        <div>
                            <h3
                                className="text-2xl font-semibold mb-2"
                                style={{ color: '#FFBB00' }}
                            >
                                Test tổng hợp
                            </h3>
                            <span
                                className="px-3 py-1 rounded-full text-xs font-semibold inline-block"
                                style={{
                                    backgroundColor: '#FFBB001A',
                                    color: '#FFBB00',
                                }}
                            >
                                PRO
                            </span>
                        </div>
                    </div>

                    {/* Danh sách subcategories */}
                    {filteredAndSortedSubCategories.map((subCategory) => (
                        <div
                            key={subCategory.id}
                            onClick={() => handleSubCategoryClick(subCategory)}
                            className="rounded-3xl border-2 p-6 cursor-pointer hover:scale-[1.02] transition-all bg-white dark:bg-black"
                            style={{
                                borderColor: 'rgba(0, 0, 0, 0.05)',
                            }}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
                                        {subCategory.title}
                                    </h3>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {subCategory.isPayment ? (
                                            <span
                                                className="px-3 py-1 rounded-full text-xs font-semibold"
                                                style={{
                                                    backgroundColor: '#FFBB001A',
                                                    color: '#FFBB00',
                                                }}
                                            >
                                                PRO
                                            </span>
                                        ) : (
                                            <span
                                                className="px-3 py-1 rounded-full text-xs font-semibold"
                                                style={{
                                                    backgroundColor: 'rgba(141, 126, 247, 0.1)',
                                                    color: '#8D7EF7',
                                                }}
                                            >
                                                Free
                                            </span>
                                        )}
                                        {subCategory.labelText && (
                                            <span
                                                className="px-3 py-1 rounded-full text-xs font-semibold"
                                                style={{
                                                    backgroundColor: `${subCategory.labelColor}1A`,
                                                    color: subCategory.labelColor,
                                                }}
                                            >
                                                {subCategory.labelText}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* No results message */}
                    {filteredAndSortedSubCategories.length === 0 && (
                        <div className="text-center py-20">
                            <p className="text-gray-500 dark:text-white/20">
                                Không tìm thấy kết quả nào
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default CategoryPage;

