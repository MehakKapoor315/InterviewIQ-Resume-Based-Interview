import { NextResponse } from 'next/server';

export function proxy(request) {
  const token = request.cookies.get('auth_token')?.value;
  const nextAuthToken = request.cookies.get('next-auth.session-token')?.value || 
                        request.cookies.get('__Secure-next-auth.session-token')?.value;
  const { pathname } = request.nextUrl;

  // Paths that don't require authentication
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/api/auth');
  const isPublicFile = pathname.includes('.') || pathname.startsWith('/_next');

  if (isPublicFile || isAuthPage) {
    return NextResponse.next();
  }

  if (!token && !nextAuthToken) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
