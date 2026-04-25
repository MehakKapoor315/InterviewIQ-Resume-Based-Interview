import clientPromise from '@/lib/mongodb';
import { signToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const users = db.collection('users');

    const user = await users.findOne({ email, otpCode: otp });

    if (!user) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    await users.updateOne(
      { _id: user._id },
      { 
        $set: { isVerified: true },
        $unset: { otpCode: "" } 
      }
    );

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
