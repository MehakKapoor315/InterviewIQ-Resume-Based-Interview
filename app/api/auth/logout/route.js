import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });

  // 1. Clear custom JWT cookie
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: -1,
    path: '/',
  });

  // 2. Clear NextAuth cookies (for production/Netlify)
  // NextAuth uses these names. Clearing them helps ensure a clean logout.
  const nextAuthCookies = [
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
    'next-auth.csrf-token',
    'next-auth.callback-url'
  ];

  nextAuthCookies.forEach(cookieName => {
    response.cookies.set(cookieName, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: -1,
      path: '/',
    });
  });

  return response;
}
