import { MetadataRoute } from 'next';
import axios from 'axios';
import { createTitleSlug } from '@/lib/utils';

// Base URL configuration
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'http://localhost:7071/fai' 
  : 'http://localhost:7071/fai';

const CATEGORY_API_BASE_URL = `${BASE_URL}/v1/category`;
const FAQUIZ_API_BASE_URL = `${BASE_URL}/faquiz/v1`;

// Site URL - ưu tiên NEXT_PUBLIC_SITE_URL, sau đó dùng giá trị mặc định
// Chỉ dùng VERCEL_URL khi đang ở preview/deployment và không có NEXT_PUBLIC_SITE_URL
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://facourse.com';

interface SubCategoriesSlide {
  code: string;
  id: number;
  title: string;
  slug: string;
  categoryId: number;
  isPayment: boolean;
}

interface CategoriesSlide {
  code: string;
  id: number;
  title: string;
  subtitle: string;
  subCategoriesSlide: SubCategoriesSlide[];
}

interface SlideFastResponse {
  top10Categories: CategoriesSlide[];
  universityCategories: CategoriesSlide[];
  top10SubCategories: SubCategoriesSlide[];
  fullData: {
    categoriesSlide: CategoriesSlide[];
  };
}

interface BiodigitalCategory {
  id: number;
  title: string;
  description: string;
}

interface BiodigitalCategoriesResponse {
  meta: {
    code: number;
    message: string;
  };
  data: BiodigitalCategory[];
}

async function getCategoriesData(): Promise<SlideFastResponse | null> {
  try {
    const response = await axios.get<{ meta: { code: number; message: string }; data: SlideFastResponse }>(
      `${CATEGORY_API_BASE_URL}/slide-fast`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'site': 'QUIZ_WEB',
        },
        timeout: 10000, // 10 seconds timeout
      }
    );
    
    if (response.data?.data) {
      return response.data.data;
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function getBiodigitalCategories(): Promise<BiodigitalCategory[] | null> {
  try {
    const response = await axios.get<BiodigitalCategoriesResponse>(
      `${FAQUIZ_API_BASE_URL}/biodigital/categories/all`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 10000,
      }
    );
    
    if (response.data?.data) {
      // Chỉ lấy các category có description chứa human.biodigital.com
      return response.data.data.filter(
        (category) => category.description && category.description.includes('human.biodigital.com')
      );
    }
    return null;
  } catch (error) {
    return null;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [];

  // Static routes
  const staticRoutes = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/upgrade`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/giai-phau-3d`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/fa-quiz-ung-dung-trac-nghiem-y-khoa-hang-dau-2025`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
  ];

  routes.push(...staticRoutes);

  // Fetch categories and subcategories
  const categoriesData = await getCategoriesData();
  
  if (categoriesData) {
    // Collect all unique subcategories from fullData
    const allSubCategories = new Map<string, SubCategoriesSlide>();
    
    if (categoriesData.fullData?.categoriesSlide) {
      categoriesData.fullData.categoriesSlide.forEach((category) => {
        if (category.subCategoriesSlide && Array.isArray(category.subCategoriesSlide)) {
          category.subCategoriesSlide.forEach((subCategory) => {
            if (subCategory.slug) {
              allSubCategories.set(subCategory.slug, subCategory);
            }
          });
        }
      });
    }

    // Add subcategory routes
    allSubCategories.forEach((subCategory) => {
      routes.push({
        url: `${SITE_URL}/${subCategory.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      });
    });
  }

  // Fetch biodigital categories
  const biodigitalCategories = await getBiodigitalCategories();
  
  if (biodigitalCategories) {
    biodigitalCategories.forEach((category) => {
      const slug = createTitleSlug(category.title);
      routes.push({
        url: `${SITE_URL}/giai-phau-3d/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      });
    });
  }

  return routes;
}

