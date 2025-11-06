'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import QuizHeader from '@/components/layout/QuizHeader';
import CategoryCard from '@/components/ui/CategoryCard';
import SubCategoryCard from '@/components/ui/SubCategoryCard';
import SubCategoryListPanel from '@/components/ui/SubCategoryListPanel';
import SearchBar from '@/components/ui/SearchBar';
import { categoryApiService } from '@/lib/api';
import { CategoriesSlide, SubCategoriesSlide } from '@/types';
import { useRouter } from 'next/navigation';
import { normalizeSearchKeyword, matchesCategoryCode, matchesCategoryTitle, hexToRgba } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const HomePage: React.FC = () => {
  const router = useRouter();
  const { user, isInitialized } = useAuth();
  const [top10Categories, setTop10Categories] = useState<CategoriesSlide[]>([]);
  const [top10SubCategories, setTop10SubCategories] = useState<SubCategoriesSlide[]>([]);
  const [top10RecentSubCategories, setTop10RecentSubCategories] = useState<SubCategoriesSlide[]>([]);
  const [fullData, setFullData] = useState<CategoriesSlide[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchByCodeOnly, setSearchByCodeOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoriesSlide | null>(null);
  const subtitleScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [appliedSubtitleFilter, setAppliedSubtitleFilter] = useState<{ subtitle: string; backgroundColor: string } | null>(null);

  const scrollSubtitleSuggestions = (direction: 'left' | 'right') => {
    if (!subtitleScrollRef.current) return;

    const container = subtitleScrollRef.current;
    const scrollAmount = 300;
    const startPosition = container.scrollLeft;
    const targetPosition = direction === 'left' 
      ? startPosition - scrollAmount 
      : startPosition + scrollAmount;
    
    const duration = 500; // Thời gian animation (ms)
    const startTime = performance.now();

    // Easing function - ease-in-out để animation mượt mà
    const easeInOutCubic = (t: number): number => {
      return t < 0.5 
        ? 4 * t * t * t 
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);
      
      const currentPosition = startPosition + (targetPosition - startPosition) * easedProgress;
      container.scrollLeft = currentPosition;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Cập nhật trạng thái nút sau khi animation hoàn thành
        updateScrollButtons();
      }
    };

    requestAnimationFrame(animate);
  };

  // Kiểm tra vị trí scroll để hiển thị/ẩn nút
  const updateScrollButtons = useCallback(() => {
    if (subtitleScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = subtitleScrollRef.current;
      const isAtStart = scrollLeft <= 0;
      const isAtEnd = scrollLeft + clientWidth >= scrollWidth - 1; // -1 để tránh lỗi làm tròn
      
      setCanScrollLeft(!isAtStart);
      setCanScrollRight(!isAtEnd);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await categoryApiService.getSlideFast();
        if (response.data) {
          setTop10Categories(response.data.top10Categories || []);
          setTop10SubCategories(response.data.top10SubCategories || []);
          setTop10RecentSubCategories(response.data.top10RecentSubCategories || []);
          setFullData(response.data.fullData?.categoriesSlide || []);
        }
      } catch (err: any) {
        console.error('Error fetching slide fast data:', err);
        setError(err.message || 'Có lỗi xảy ra khi tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Đóng split-screen khi searchQuery thay đổi hoặc khi filter được apply/remove
  useEffect(() => {
    setSelectedCategory(null);
    // Reset searchByCodeOnly khi searchQuery thay đổi (trừ khi user vừa nhấn Enter)
    if (!searchQuery.trim()) {
      setSearchByCodeOnly(false);
    }
  }, [searchQuery, appliedSubtitleFilter]);

  // Tìm kiếm trong fullData theo code và title của category
  // Nếu searchByCodeOnly = true, chỉ tìm theo code (logic cũ)
  // Nếu searchByCodeOnly = false, tìm theo cả code và title
  // Nếu có appliedSubtitleFilter, filter theo subtitle đó
  const filteredCategories = useMemo(() => {
    let baseCategories: CategoriesSlide[] = [];

    // Nếu có subtitle filter được apply, filter theo subtitle đó
    if (appliedSubtitleFilter) {
      fullData.forEach((category) => {
        if (category.subtitle === appliedSubtitleFilter.subtitle) {
          baseCategories.push(category);
        }
      });
    } else if (!searchQuery.trim()) {
      return top10Categories;
    } else {
      // Chuẩn hóa keyword: convert tiếng Việt về không dấu, loại bỏ space
      const normalizedKeyword = normalizeSearchKeyword(searchQuery);
      
      if (!normalizedKeyword) {
        return top10Categories;
      }

      fullData.forEach((category) => {
        // Tìm kiếm theo code của category (match chính xác hoặc match dạng {keyword}-*)
        // Ví dụ: tìm "GiaiPhau" sẽ match với "GiaiPhau", "GiaiPhau-HMU", "GiaiPhau-YDN", "GiaiPhau-TUMP"
        const matchesCode = category.code && matchesCategoryCode(category.code, normalizedKeyword);
        
        // Nếu searchByCodeOnly = true, chỉ tìm theo code (logic cũ khi nhấn Enter)
        if (searchByCodeOnly) {
          if (matchesCode) {
            baseCategories.push(category);
          }
        } else {
          // Tìm kiếm theo title của category (wild card matching) - chỉ khi đang typing
          const matchesTitle = category.title && matchesCategoryTitle(category.title, normalizedKeyword);
          
          if (matchesCode || matchesTitle) {
            // Trả về category với tất cả subcategories của nó
            baseCategories.push(category);
          }
        }
      });
    }

    // Nếu có cả searchQuery và subtitle filter, filter thêm theo searchQuery
    if (appliedSubtitleFilter && searchQuery.trim()) {
      const normalizedKeyword = normalizeSearchKeyword(searchQuery);
      
      if (normalizedKeyword) {
        const filtered: CategoriesSlide[] = [];
        
        baseCategories.forEach((category) => {
          const matchesCode = category.code && matchesCategoryCode(category.code, normalizedKeyword);
          
          if (searchByCodeOnly) {
            if (matchesCode) {
              filtered.push(category);
            }
          } else {
            const matchesTitle = category.title && matchesCategoryTitle(category.title, normalizedKeyword);
            
            if (matchesCode || matchesTitle) {
              filtered.push(category);
            }
          }
        });
        
        return filtered;
      }
    }

    return baseCategories;
  }, [searchQuery, searchByCodeOnly, top10Categories, fullData, appliedSubtitleFilter]);

  // Tạo suggestions cho auto complete dựa trên title của categories
  const autoCompleteSuggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      return [];
    }

    const normalizedKeyword = normalizeSearchKeyword(searchQuery);
    
    if (!normalizedKeyword) {
      return [];
    }

    // Sử dụng Set để tránh duplicate titles
    const suggestionMap = new Map<string, string>();
    const maxSuggestions = 10; // Giới hạn số lượng suggestions

    // Tìm kiếm trong fullData
    for (const category of fullData) {
      if (category.title && matchesCategoryTitle(category.title, normalizedKeyword)) {
        // Chỉ thêm nếu chưa có hoặc nếu màu chưa được set
        if (!suggestionMap.has(category.title) && suggestionMap.size < maxSuggestions) {
          suggestionMap.set(category.title, category.backgroundColor || '');
        }
        
        // Dừng khi đã đủ suggestions
        if (suggestionMap.size >= maxSuggestions) {
          break;
        }
      }
    }

    // Convert map thành array
    return Array.from(suggestionMap.entries()).map(([title, backgroundColor]) => ({
      title,
      backgroundColor: backgroundColor || undefined,
    }));
  }, [searchQuery, fullData]);

  // Khi có searchQuery hoặc đang áp dụng subtitle filter, không hiển thị subcategories riêng lẻ
  // Subcategories sẽ được hiển thị bên trong categories đã match
  const filteredSubCategories = useMemo(() => {
    if (!searchQuery.trim() && !appliedSubtitleFilter) {
      return top10SubCategories;
    }
    // Khi có searchQuery, không trả về subcategories riêng lẻ
    return [];
  }, [searchQuery, top10SubCategories, appliedSubtitleFilter]);

  // Tạo map để lấy backgroundColor và icon từ category cha cho subcategories
  const categoryColorMap = useMemo(() => {
    const colorMap = new Map<number, string>();
    const iconMap = new Map<number, string>();
    
    // Map từ fullData (có đầy đủ thông tin)
    fullData.forEach((category) => {
      if (category.subCategoriesSlide && Array.isArray(category.subCategoriesSlide)) {
        category.subCategoriesSlide.forEach((sub) => {
          colorMap.set(sub.id, category.backgroundColor);
          // Map icon từ subcategory nếu có, hoặc từ category nếu subcategory không có
          if (sub.icon) {
            iconMap.set(sub.id, sub.icon);
          } else if (category.icon) {
            iconMap.set(sub.id, category.icon);
          }
        });
      }
    });
    
    // Map từ top10Categories nếu có
    top10Categories.forEach((category) => {
      if (category.subCategoriesSlide && Array.isArray(category.subCategoriesSlide)) {
        category.subCategoriesSlide.forEach((sub) => {
          if (!colorMap.has(sub.id)) {
            colorMap.set(sub.id, category.backgroundColor);
          }
          if (!iconMap.has(sub.id)) {
            if (sub.icon) {
              iconMap.set(sub.id, sub.icon);
            } else if (category.icon) {
              iconMap.set(sub.id, category.icon);
            }
          }
        });
      }
    });
    
    return { colorMap, iconMap };
  }, [fullData, top10Categories]);

  // Lấy danh sách subtitle unique từ filteredCategories khi có searchQuery hoặc khi không có filter
  const subtitleSuggestions = useMemo(() => {
    // Nếu đã có filter được apply, không hiển thị suggestions
    if (appliedSubtitleFilter) {
      return [];
    }

    // Nếu không có searchQuery, không hiển thị suggestions
    if (!searchQuery.trim()) {
      return [];
    }

    // Tạo map để tránh duplicate subtitle và giữ backgroundColor
    const subtitleMap = new Map<string, string>();
    
    // Lấy từ fullData để có đầy đủ subtitle options
    fullData.forEach((category) => {
      if (category.subtitle && category.backgroundColor) {
        // Bỏ qua subtitle "Tổng hợp"
        if (category.subtitle === 'Tổng hợp') {
          return;
        }
        // Chỉ thêm nếu chưa có hoặc nếu màu chưa được set
        if (!subtitleMap.has(category.subtitle)) {
          subtitleMap.set(category.subtitle, category.backgroundColor);
        }
      }
    });

    // Convert map thành array
    return Array.from(subtitleMap.entries()).map(([subtitle, backgroundColor]) => ({
      subtitle,
      backgroundColor,
    }));
  }, [searchQuery, fullData, appliedSubtitleFilter]);

  // Lắng nghe sự kiện scroll và cập nhật trạng thái nút
  useEffect(() => {
    const scrollContainer = subtitleScrollRef.current;
    if (!scrollContainer) return;

    // Kiểm tra trạng thái ban đầu sau khi DOM đã được cập nhật
    const checkScrollState = () => {
      updateScrollButtons();
    };
    
    // Sử dụng setTimeout để đảm bảo DOM đã được render
    const timeoutId = setTimeout(checkScrollState, 0);

    // Lắng nghe sự kiện scroll
    scrollContainer.addEventListener('scroll', updateScrollButtons);
    
    // Lắng nghe sự kiện resize để cập nhật khi kích thước thay đổi
    const handleResize = () => {
      updateScrollButtons();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timeoutId);
      scrollContainer.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', handleResize);
    };
  }, [subtitleSuggestions, updateScrollButtons]); // Chạy lại khi subtitleSuggestions thay đổi

  const handleCategoryClick = (category: CategoriesSlide) => {
    // Nếu click lại vào category đang được chọn thì tắt split view
    if (selectedCategory && selectedCategory.id === category.id) {
      setSelectedCategory(null);
      return;
    }
    
    // Tìm category đầy đủ từ fullData để có đầy đủ subCategoriesSlide
    const fullCategory = fullData.find(c => c.id === category.id) || category;
    // Set selected category để hiển thị split-screen
    setSelectedCategory(fullCategory);
  };

  const handleCloseSubCategoryPanel = () => {
    setSelectedCategory(null);
  };

  const handleSubCategoryClick = (subCategory: SubCategoriesSlide) => {
    // Nếu là đề PRO và chưa đăng nhập thì redirect đến trang login
    if (subCategory.isPayment === true && isInitialized && !user) {
      router.push('/login');
      return;
    }
    
    // Sử dụng slug từ SubCategoriesSlide interface
    if (subCategory.slug) {
      router.push(`/${subCategory.slug}`);
    } else {
      // Fallback: nếu không có slug thì tạo slug từ title (để đảm bảo tương thích ngược)
      const vietnameseMap: Record<string, string> = {
        'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a',
        'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a',
        'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
        'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e',
        'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
        'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
        'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o',
        'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o',
        'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
        'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u',
        'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
        'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
        'đ': 'd',
        'À': 'A', 'Á': 'A', 'Ạ': 'A', 'Ả': 'A', 'Ã': 'A',
        'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ậ': 'A', 'Ẩ': 'A', 'Ẫ': 'A',
        'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ặ': 'A', 'Ẳ': 'A', 'Ẵ': 'A',
        'È': 'E', 'É': 'E', 'Ẹ': 'E', 'Ẻ': 'E', 'Ẽ': 'E',
        'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ệ': 'E', 'Ể': 'E', 'Ễ': 'E',
        'Ì': 'I', 'Í': 'I', 'Ị': 'I', 'Ỉ': 'I', 'Ĩ': 'I',
        'Ò': 'O', 'Ó': 'O', 'Ọ': 'O', 'Ỏ': 'O', 'Õ': 'O',
        'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ộ': 'O', 'Ổ': 'O', 'Ỗ': 'O',
        'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ợ': 'O', 'Ở': 'O', 'Ỡ': 'O',
        'Ù': 'U', 'Ú': 'U', 'Ụ': 'U', 'Ủ': 'U', 'Ũ': 'U',
        'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ự': 'U', 'Ử': 'U', 'Ữ': 'U',
        'Ỳ': 'Y', 'Ý': 'Y', 'Ỵ': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y',
        'Đ': 'D',
      };
      const toSlug = (text: string) => {
        let s = (text || '').trim().split('').map(ch => vietnameseMap[ch] || ch).join('');
        s = s.replace(/[^a-zA-Z0-9]+/g, '-');
        s = s.replace(/-+/g, '-');
        s = s.replace(/^-|-$/g, '');
        return s.toLowerCase();
      };
      const slug = `${subCategory.categoryId}-${toSlug(subCategory.title)}`;
      router.push(`/${slug}`);
    }
  };

  const handleSubtitleSuggestionClick = (subtitle: string, backgroundColor: string) => {
    // Apply filter theo subtitle (không thêm vào searchQuery)
    setAppliedSubtitleFilter({ subtitle, backgroundColor });
    // Reset searchByCodeOnly khi apply filter
    setSearchByCodeOnly(false);
    // Clear input để sẵn sàng user nhập mới
    setSearchQuery('');
  };

  const handleRemoveSubtitleFilter = () => {
    setAppliedSubtitleFilter(null);
    // Trở về giao diện home bình thường
    setSearchQuery('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <QuizHeader />
        <main className="pt-20 px-8 pb-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-500 dark:text-gray-400">Đang tải...</div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <QuizHeader />
        <main className="pt-20 px-8 pb-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-red-500 dark:text-red-400">{error}</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <QuizHeader />
      <main className={`pt-20 ${selectedCategory ? 'px-0' : 'px-8'} pb-8 ${selectedCategory ? 'max-w-full' : 'max-w-7xl'} mx-auto`}>
        {/* Search Bar */}
        <div className={`${selectedCategory ? 'px-8' : ''}`}>
          <SearchBar 
            value={searchQuery} 
            onChange={(value) => {
              setSearchQuery(value);
              // Reset searchByCodeOnly khi user đang typing
              setSearchByCodeOnly(false);
            }}
            onEnterPress={() => {
              // Khi nhấn Enter mà không có suggestion nào được chọn, chỉ tìm theo code
              setSearchByCodeOnly(true);
            }}
            suggestions={autoCompleteSuggestions}
          />

          {/* Applied Subtitle Filter Badge */}
          {appliedSubtitleFilter && (
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full relative"
                style={{
                  backgroundColor: hexToRgba(appliedSubtitleFilter.backgroundColor, 0.1),
                  color: appliedSubtitleFilter.backgroundColor,
                }}
              >
                <span className="text-lg font-medium pr-2">{appliedSubtitleFilter.subtitle}</span>
                <button
                  onClick={handleRemoveSubtitleFilter}
                  className="flex items-center justify-center w-5 h-5 rounded-full hover:bg-black/10 transition-colors"
                  aria-label="Remove filter"
                  style={{ color: appliedSubtitleFilter.backgroundColor }}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Subtitle Suggestions - Hiển thị khi có kết quả search và chưa có filter */}
          {subtitleSuggestions.length > 0 && (
            <div className="relative mb-12">
              {/* Left scroll button - chỉ hiện khi đã scroll sang phải */}
              {canScrollLeft && (
                <button
                  onClick={() => scrollSubtitleSuggestions('left')}
                  className="absolute left-0 top-0 bottom-0 z-10 h-full pr-4 flex items-center justify-center bg-gradient-to-r from-white dark:from-gray-900 to-transparent transition-all duration-200 hover:scale-110"
                  aria-label="Scroll left"
                >
                  <svg
                    className="w-5 h-5 text-gray-400 dark:text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
              )}
              
              {/* Right scroll button - chỉ hiện khi chưa đến cuối */}
              {canScrollRight && (
                <button
                  onClick={() => scrollSubtitleSuggestions('right')}
                  className="absolute right-0 top-0 bottom-0 z-10 h-full pl-4 flex items-center justify-center bg-gradient-to-l from-white dark:from-gray-900 to-transparent transition-all duration-200 hover:scale-110"
                  aria-label="Scroll right"
                >
                  <svg
                    className="w-5 h-5 text-gray-400 dark:text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              )}

              {/* Scroll container */}
              <div 
                ref={subtitleScrollRef}
                className="flex gap-6 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth"
                style={{ scrollBehavior: 'smooth' }}
              >
                {subtitleSuggestions.map((item, index) => (
                  <button
                    key={index}
                    className="px-8 py-4 rounded-full text-lg font-medium transition-all duration-200 hover:scale-105 flex-shrink-0"
                    style={{
                      backgroundColor: hexToRgba(item.backgroundColor, 0.05),
                      color: item.backgroundColor,
                      border: 'none',
                    }}
                    onClick={() => handleSubtitleSuggestionClick(item.subtitle, item.backgroundColor)}
                  >
                    {item.subtitle}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Split-screen layout khi có selectedCategory */}
        {selectedCategory ? (
          <div className="flex h-[calc(100vh-120px)]">
            {/* Left panel - Categories */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Hiển thị kết quả tìm kiếm từ fullData khi có searchQuery */}
              {searchQuery.trim() ? (
                <>
                  {/* Hiển thị categories từ kết quả tìm kiếm - Grid view (card nhỏ hơn trong split-screen) */}
                  {filteredCategories.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-6">
                      {filteredCategories.map((category) => (
                        <CategoryCard
                          key={category.id}
                          category={category}
                          isSelected={selectedCategory.id === category.id}
                          onClick={() => handleCategoryClick(category)}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* MÔN MỚI Section - Hiển thị top10Categories khi không có search - Grid view (card nhỏ hơn trong split-screen) */}
                  {filteredCategories.length > 0 && (
                    <div className="mb-6">
                <h2 className="text-md text-gray-300 dark:text-gray-600 tracking-widest font-bold mb-4">MÔN MỚI HÔM NAY</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                        {filteredCategories.map((category) => (
                          <CategoryCard
                            key={category.id}
                            category={category}
                            isSelected={selectedCategory.id === category.id}
                            onClick={() => handleCategoryClick(category)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right panel - SubCategory List */}
            <SubCategoryListPanel
              category={selectedCategory}
              onClose={handleCloseSubCategoryPanel}
              onSubCategoryClick={handleSubCategoryClick}
            />
          </div>
        ) : (
          <>
            {/* Normal layout khi không có selectedCategory */}
            {/* Hiển thị kết quả tìm kiếm từ fullData khi có searchQuery hoặc khi có filter subtitle */}
            {(searchQuery.trim() || appliedSubtitleFilter) ? (
          <>
            {/* Hiển thị subcategories từ kết quả tìm kiếm */}
            {filteredSubCategories.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-6">
                {filteredSubCategories.map((subCategory) => {
                  const iconFromMap = categoryColorMap.iconMap.get(subCategory.id);
                  const enrichedSub = {
                    ...subCategory,
                    icon: subCategory.icon || iconFromMap || undefined,
                  };
                  return (
                    <SubCategoryCard
                      key={subCategory.id}
                      subCategory={{
                        ...enrichedSub,
                        backgroundColor: categoryColorMap.colorMap.get(subCategory.id) || undefined,
                      }}
                      onClick={() => handleSubCategoryClick(enrichedSub)}
                    />
                  );
                })}
              </div>
            )}

            {/* Hiển thị categories từ kết quả tìm kiếm - Grid view */}
            {filteredCategories.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-6">
                {filteredCategories.map((category) => {
                  // Đảm bảo backgroundColor được truyền đúng
                  if (!category.backgroundColor) {
                    console.warn(`Category ${category.id} missing backgroundColor`);
                  }
                  return (
                    <CategoryCard
                      key={category.id}
                      category={category}
                      onClick={() => handleCategoryClick(category)}
                    />
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            {/* GẦN ĐÂY Section - Hiển thị top10RecentSubCategories khi không có search */}
            {top10RecentSubCategories.length > 0 && (
              <div className="mb-12">
                <h2 className="text-md text-gray-300 dark:text-gray-600 tracking-widest font-bold mb-8">GẦN ĐÂY</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {top10RecentSubCategories.slice(0, 8).map((subCategory) => {
                    const iconFromMap = categoryColorMap.iconMap.get(subCategory.id);
                    const enrichedSub = {
                      ...subCategory,
                      icon: subCategory.icon || iconFromMap || undefined,
                    };
                    return (
                      <SubCategoryCard
                        key={subCategory.id}
                        subCategory={{
                          ...enrichedSub,
                          backgroundColor: categoryColorMap.colorMap.get(subCategory.id) || undefined,
                        }}
                        onClick={() => handleSubCategoryClick(enrichedSub)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* MÔN MỚI Section - Hiển thị top10Categories khi không có search - Grid view */}
            {filteredCategories.length > 0 && (
              <div className="my-24">
                <h2 className="text-md text-gray-300 dark:text-gray-600 tracking-widest font-bold mb-8">MÔN MỚI HÔM NAY</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredCategories.slice(0, 8).map((category, index) => {
                    // Đảm bảo backgroundColor được truyền đúng
                    if (!category.backgroundColor) {
                      console.warn(`Category ${category.id} missing backgroundColor`);
                    }
                    // Ưu tiên load ảnh cho 5 category đầu tiên (above the fold)
                    const isPriority = index < 5;
                    return (
                      <CategoryCard
                        key={category.id}
                        category={category}
                        onClick={() => handleCategoryClick(category)}
                        priority={isPriority}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* ĐỀ MỚI Section - Hiển thị top10SubCategories khi không có search */}
            {filteredSubCategories.length > 0 && (
              <div className="mb-12">
                <h2 className="text-md text-gray-300 dark:text-gray-600 tracking-widest font-bold mb-8">ĐỀ MỚI HÔM NAY</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredSubCategories.slice(0, 8).map((subCategory) => {
                    const iconFromMap = categoryColorMap.iconMap.get(subCategory.id);
                    const enrichedSub = {
                      ...subCategory,
                      icon: subCategory.icon || iconFromMap || undefined,
                    };
                    return (
                      <SubCategoryCard
                        key={subCategory.id}
                        subCategory={{
                          ...enrichedSub,
                          backgroundColor: categoryColorMap.colorMap.get(subCategory.id) || undefined,
                        }}
                        onClick={() => handleSubCategoryClick(enrichedSub)}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

            {/* No results message */}
            {(searchQuery.trim() || appliedSubtitleFilter) && filteredCategories.length === 0 && filteredSubCategories.length === 0 && (
              <div className="text-center py-20">
                <p className="text-gray-500 dark:text-gray-400">Không tìm thấy kết quả nào cho "{searchQuery}"</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default HomePage;
