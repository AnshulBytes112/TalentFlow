import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const { pathname } = req.nextUrl;

    // Redirect authenticated users away from auth pages
    if (token && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
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
  matcher: ['/dashboard/:path*', '/login', '/register'],
};
