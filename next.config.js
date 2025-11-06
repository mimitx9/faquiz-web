/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'drive.google.com', 'google.com', 'lh3.googleusercontent.com', 'storage.googleapis.com', 'facourse.com'],
    unoptimized: true, // Tắt image optimization để tránh lỗi 402 PAYMENT_REQUIRED từ Vercel
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'facourse.com',
      },
    ],
  },
}

module.exports = nextConfig

