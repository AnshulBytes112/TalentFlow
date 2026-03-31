import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const { pathname } = req.nextUrl;

    // Redirect authenticated users away from auth pages
    if (token && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
      const redirectPath = token.role === 'recruiter' ? '/recruiter' : '/jobseeker';
      return NextResponse.redirect(new URL(redirectPath, req.url));
    }

    // Redirect generic dashboard route to role-specific dashboard
    if (pathname === '/dashboard') {
      const redirectPath = token?.role === 'recruiter' ? '/recruiter' : '/jobseeker';
      return NextResponse.redirect(new URL(redirectPath, req.url));
    }

    // Role-based route guard
    if (pathname.startsWith('/jobseeker') && token?.role !== 'jobseeker') {
      return NextResponse.redirect(new URL('/recruiter', req.url));
    }
    if (pathname.startsWith('/recruiter') && token?.role !== 'recruiter') {
      return NextResponse.redirect(new URL('/jobseeker', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Always authorize auth pages (even if no token) so middleware function can handle redirection
        if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
          return true;
        }

        // Require token for dashboard and other protected routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ['/dashboard/:path*', '/jobseeker/:path*', '/recruiter/:path*', '/login', '/register'],
};
