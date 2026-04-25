import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const users = db.collection('users');

    const user = await users.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
    }

    // Requirement 1: Handle Google-only accounts
    if (user.authMethod === 'google') {
      return NextResponse.json({ 
        error: 'This email is linked to Google. Please use Continue with Google to sign in.' 
      }, { status: 400 });
    }

    if (!user.isVerified) {
      return NextResponse.json({ error: 'Please verify your email first' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
    }

    const token = signToken({ userId: user._id, name: user.name, email: user.email });

    const response = NextResponse.json({ success: true, user: { name: user.name, email: user.email } });
    
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });

    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
