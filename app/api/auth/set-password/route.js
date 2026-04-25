import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../[...nextauth]/route";
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { password } = await request.json();
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const users = db.collection('users');

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await users.findOne({ email: session.user.email });
    
    let newAuthMethod = user.authMethod === 'google' ? 'both' : user.authMethod;

    await users.updateOne(
      { email: session.user.email },
      { 
        $set: { 
          password: hashedPassword,
          authMethod: newAuthMethod
        } 
      }
    );

    return NextResponse.json({ success: true, message: 'Password set successfully. You can now login with both methods.' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
