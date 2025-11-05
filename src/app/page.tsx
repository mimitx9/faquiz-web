'use client';

import React, { useEffect, useState, useMemo } from 'react';
import QuizHeader from '@/components/layout/QuizHeader';
import HorizontalScroll from '@/components/ui/HorizontalScroll';
import CategoryCard from '@/components/ui/CategoryCard';
import SubCategoryCard from '@/components/ui/SubCategoryCard';
import SubCategoryListPanel from '@/components/ui/SubCategoryListPanel';
import SearchBar from '@/components/ui/SearchBar';
import { categoryApiService } from '@/lib/api';
import { CategoriesSlide, SubCategoriesSlide } from '@/types';
import { useRouter } from 'next/navigation';
import { normalizeSearchKeyword, matchesCategoryCode, hexToRgba } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const HomePage: React.FC = () => {
  const router = useRouter();
  const { user, isInitialized } = useAuth();
  const [top10Categories, setTop10Categories] = useState<CategoriesSlide[]>([]);
  const [top10SubCategories, setTop10SubCategories] = useState<SubCategoriesSlide[]>([]);
  const [fullData, setFullData] = useState<CategoriesSlide[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoriesSlide | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await categoryApiService.getSlideFast();
        if (response.data) {
          setTop10Categories(response.data.top10Categories || []);
          setTop10SubCategories(response.data.top10SubCategories || []);
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

  // Đóng split-screen khi searchQuery thay đổi
  useEffect(() => {
    setSelectedCategory(null);
  }, [searchQuery]);

  // Tìm kiếm trong fullData theo code của category
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return top10Categories;
    }

    // Chuẩn hóa keyword: convert tiếng Việt về không dấu, loại bỏ space
    const normalizedKeyword = normalizeSearchKeyword(searchQuery);
    
    if (!normalizedKeyword) {
      return top10Categories;
    }

    const results: CategoriesSlide[] = [];

    fullData.forEach((category) => {
      // Chỉ tìm kiếm theo code của category (match chính xác hoặc match dạng {keyword}-*)
      // Ví dụ: tìm "GiaiPhau" sẽ match với "GiaiPhau", "GiaiPhau-HMU", "GiaiPhau-YDN", "GiaiPhau-TUMP"
      if (category.code && matchesCategoryCode(category.code, normalizedKeyword)) {
        // Trả về category với tất cả subcategories của nó
        results.push(category);
      }
    });

    return results;
  }, [searchQuery, top10Categories, fullData]);

  // Khi có searchQuery, không hiển thị subcategories riêng lẻ
  // Subcategories sẽ được hiển thị bên trong categories đã match
  const filteredSubCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return top10SubCategories;
    }
    // Khi có searchQuery, không trả về subcategories riêng lẻ
    return [];
  }, [searchQuery, top10SubCategories]);

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

  // Lấy danh sách subtitle unique từ filteredCategories khi có searchQuery
  const subtitleSuggestions = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }

    // Tạo map để tránh duplicate subtitle và giữ backgroundColor
    const subtitleMap = new Map<string, string>();
    
    filteredCategories.forEach((category) => {
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
  }, [searchQuery, filteredCategories]);

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
    
    // Tạo slug dạng: {categoryId}-{slug-cua-title}
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
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <QuizHeader />
        <main className="pt-20 px-8 pb-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-500">Đang tải...</div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <QuizHeader />
        <main className="pt-20 px-8 pb-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-red-500">{error}</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <QuizHeader />
      <main className={`pt-20 ${selectedCategory ? 'px-0' : 'px-8'} pb-8 ${selectedCategory ? 'max-w-full' : 'max-w-7xl'} mx-auto`}>
        {/* Search Bar */}
        <div className={`${selectedCategory ? 'px-8' : ''}`}>
          <SearchBar value={searchQuery} onChange={setSearchQuery} />

          {/* Subtitle Suggestions - Hiển thị khi có kết quả search */}
          {subtitleSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {subtitleSuggestions.map((item, index) => (
                <button
                  key={index}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: hexToRgba(item.backgroundColor, 0.05),
                    color: item.backgroundColor,
                    border: 'none',
                  }}
                  onClick={() => {
                    // Có thể thêm logic click nếu cần
                  }}
                >
                  {item.subtitle}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Split-screen layout khi có selectedCategory */}
        {selectedCategory ? (
          <div className="flex h-[calc(100vh-120px)]">
            {/* Left panel - Categories */}
            <div className="flex-1 overflow-y-auto px-8">
              {/* Hiển thị kết quả tìm kiếm từ fullData khi có searchQuery */}
              {searchQuery.trim() ? (
                <>
                  {/* Hiển thị categories từ kết quả tìm kiếm - Grid view (card nhỏ hơn trong split-screen) */}
                  {filteredCategories.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
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
                <h2 className="text-md text-gray-300 tracking-widest font-bold mb-4">MÔN MỚI</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
            {/* Hiển thị kết quả tìm kiếm từ fullData khi có searchQuery */}
            {searchQuery.trim() ? (
          <>
            {/* Hiển thị subcategories từ kết quả tìm kiếm */}
            {filteredSubCategories.length > 0 && (
              <HorizontalScroll title="">
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
                      onClick={() => handleSubCategoryClick(subCategory)}
                    />
                  );
                })}
              </HorizontalScroll>
            )}

            {/* Hiển thị categories từ kết quả tìm kiếm - Grid view */}
            {filteredCategories.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
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
            {/* ĐỀ MỚI Section - Hiển thị top10SubCategories khi không có search */}
            {filteredSubCategories.length > 0 && (
              <HorizontalScroll title="ĐỀ MỚI">
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
                      onClick={() => handleSubCategoryClick(subCategory)}
                    />
                  );
                })}
              </HorizontalScroll>
            )}

            {/* MÔN MỚI Section - Hiển thị top10Categories khi không có search - Grid view */}
            {filteredCategories.length > 0 && (
              <div className="mb-6">
                <h2 className="text-md text-gray-300 tracking-widest font-bold mb-4">MÔN MỚI</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
              </div>
            )}
          </>
        )}

            {/* No results message */}
            {searchQuery.trim() && filteredCategories.length === 0 && filteredSubCategories.length === 0 && (
              <div className="text-center py-20">
                <p className="text-gray-500">Không tìm thấy kết quả nào cho "{searchQuery}"</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default HomePage;
