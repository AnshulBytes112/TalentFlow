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
        // Proxy specific backend registration endpoint
        source: '/api/auth/register',
        destination: `${backendUrl}/api/auth/register`,
      },
      {
        // Proxy core backend modules
        source: '/api/:module(jobs|applications|users|notifications|analytics|application)/:path*',
        destination: `${backendUrl}/api/:module/:path*`,
      },
      // Note: /api/auth/* (NextAuth) routes are NOT proxied and handled by the frontend.
    ];
  },
};

module.exports = nextConfig;