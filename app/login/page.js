'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('form'); // 'form' or 'otp'
  const [otp, setOtp] = useState('');
  const router = useRouter();

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        if (isLogin) {
          router.push('/');
        } else {
          setStep('otp');
        }
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/');
      } else {
        setError(data.error || 'Invalid code');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #E6F1FB 0%, #dbeafe 100%)',
      fontFamily: 'sans-serif',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: '#fff',
        borderRadius: '20px',
        boxShadow: '0 10px 25px rgba(24,95,165,0.1)',
        padding: '40px',
        border: '1px solid #B5D4F4'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#185FA5',
            margin: '0 0 8px 0'
          }}>
            InterviewIQ
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            {isLogin ? 'Welcome back! Please login to continue.' : 'Create an account to get started.'}
          </p>
        </div>

        {step === 'form' ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {!isLogin && (
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#042C53', marginBottom: '6px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#042C53', marginBottom: '6px' }}>
                Email Address
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="name@company.com"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#042C53', marginBottom: '6px' }}>
                {isLogin ? 'Password' : 'Create Password'}
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {!isLogin && (
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#042C53', marginBottom: '6px' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                />
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                    Passwords do not match
                  </p>
                )}
              </div>
            )}

            {error && (
              <p style={{ color: '#dc2626', fontSize: '13px', margin: '4px 0 0 0' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                background: '#185FA5',
                color: '#fff',
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                fontSize: '15px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '8px',
                transition: 'background 0.2s'
              }}
            >
              {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0' }}>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
              <span style={{ padding: '0 10px', color: '#64748b', fontSize: '13px' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                background: '#fff',
                color: '#042C53',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid #B5D4F4',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
              onMouseOut={(e) => e.currentTarget.style.background = '#fff'}
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continue with Google
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', marginBottom: '8px' }}>
              We've sent a 6-digit code to <strong>{formData.email}</strong>. Please enter it below.
            </p>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#042C53', marginBottom: '6px' }}>
                Verification Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  fontSize: '24px',
                  textAlign: 'center',
                  letterSpacing: '8px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {error && (
              <p style={{ color: '#dc2626', fontSize: '13px', margin: '4px 0 0 0' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              style={{
                background: '#185FA5',
                color: '#fff',
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                fontSize: '15px',
                fontWeight: '600',
                cursor: (loading || otp.length !== 6) ? 'not-allowed' : 'pointer',
                marginTop: '8px',
                transition: 'background 0.2s'
              }}
            >
              {loading ? 'Verifying...' : 'Verify & Sign Up'}
            </button>

            <button
              type="button"
              onClick={() => setStep('form')}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '13px',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Edit email address
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              style={{
                background: 'none',
                border: 'none',
                color: '#185FA5',
                fontWeight: '600',
                cursor: 'pointer',
                padding: 0,
                fontSize: '14px'
              }}
            >
              {isLogin ? 'Sign up' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
