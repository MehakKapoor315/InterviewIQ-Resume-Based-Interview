import { verifyToken } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../[...nextauth]/route";

export async function GET(request) {
  // 1. Check for custom JWT token
  const token = request.cookies.get('auth_token')?.value;
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      return NextResponse.json({ 
        user: { 
          name: decoded.name, 
          email: decoded.email,
          authMethod: 'email' // If custom JWT, it's definitely email (or both)
        } 
      });
    }
  }

  // 2. Check for NextAuth session
  const session = await getServerSession(authOptions);
  if (session && session.user) {
    return NextResponse.json({ 
      user: { 
        name: session.user.name, 
        email: session.user.email, 
        image: session.user.image,
        authMethod: session.user.authMethod || 'google'
      } 
    });
  }

  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
}
