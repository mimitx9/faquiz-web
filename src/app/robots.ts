import { MetadataRoute } from 'next';

// Site URL - ưu tiên NEXT_PUBLIC_SITE_URL, sau đó dùng giá trị mặc định
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://facourse.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/result/'], // Disallow API routes and result pages
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

