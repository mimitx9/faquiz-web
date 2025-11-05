/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'drive.google.com', 'google.com', 'lh3.googleusercontent.com'],
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
    ],
  },
}

module.exports = nextConfig

