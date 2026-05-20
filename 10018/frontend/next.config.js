/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/uploads/**',
      },
    ],
  },
  env: {
    API_URL: process.env.API_URL || 'http://localhost:5000/api',
    SITE_URL: process.env.SITE_URL || 'http://localhost:3000',
  },
};

module.exports = nextConfig;
