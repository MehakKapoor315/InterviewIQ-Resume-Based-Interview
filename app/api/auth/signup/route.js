import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: parseInt(process.env.EMAIL_SERVER_PORT),
  secure: process.env.EMAIL_SERVER_PORT === '465', // true for 465, false for others
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
  // Add a timeout to prevent 502 Bad Gateway if SMTP is slow
  connectionTimeout: 5000, 
  greetingTimeout: 5000,
});

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const users = db.collection('users');

    const existingUser = await users.findOne({ email });
    if (existingUser && existingUser.isVerified) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    const userData = {
      name,
      email,
      password: hashedPassword,
      isVerified: false,
      authMethod: 'email',
      otpCode,
      createdAt: new Date(),
    };

    if (existingUser) {
      await users.updateOne({ email }, { $set: userData });
    } else {
      await users.insertOne(userData);
    }

    // Send OTP email
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Your InterviewIQ Verification Code',
        text: `Your verification code is: ${otpCode}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #B5D4F4; border-radius: 10px;">
            <h2 style="color: #185FA5;">Verify your account</h2>
            <p>Thank you for signing up for InterviewIQ. Please use the following code to verify your account:</p>
            <div style="font-size: 32px; font-weight: bold; color: #185FA5; letter-spacing: 5px; margin: 20px 0;">
              ${otpCode}
            </div>
            <p>This code will expire in 10 minutes.</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Email error:', emailError);
      return NextResponse.json({ error: 'Failed to send verification email. Check your SMTP settings.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'OTP sent to email' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
