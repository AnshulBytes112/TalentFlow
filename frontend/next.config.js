/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'res.cloudinary.com',
      'localhost',
      // Safely handle missing API URL domain
      ...(process.env.NEXT_PUBLIC_API_URL 
        ? [process.env.NEXT_PUBLIC_API_URL.replace('https://', '').replace('http://', '').split(':')[0]] 
        : []),
    ],
  },
  env: {
    // Provide defaults if these are missing to avoid build errors
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000',
  },
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    return [
      {
        // Proxy backend auth endpoints (login, register, me) — NOT NextAuth's /api/auth/[...nextauth]
        source: '/api/auth/register',
        destination: `${backendUrl}/api/auth/register`,
      },
      {
        source: '/api/auth/send-registration-otp',
        destination: `${backendUrl}/api/auth/send-registration-otp`,
      },
      {
        source: '/api/auth/login',
        destination: `${backendUrl}/api/auth/login`,
      },
      {
        source: '/api/auth/me',
        destination: `${backendUrl}/api/auth/me`,
      },
      {
        // Proxy core backend modules (with sub-paths)
        source: '/api/:module(jobs|applications|users|notifications|analytics)/:path*',
        destination: `${backendUrl}/api/:module/:path*`,
      },
      {
        // Proxy core backend modules (root-level, e.g. GET /api/jobs)
        source: '/api/:module(jobs|applications|users|notifications|analytics)',
        destination: `${backendUrl}/api/:module`,
      },
    ];
  },
};

module.exports = nextConfig;