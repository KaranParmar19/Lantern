'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GoogleLogin } from '@react-oauth/google';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { loginUser, googleAuth } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (!loading && isAuthenticated) router.push('/dashboard'); }, [loading, isAuthenticated, router]);

  // Email + password login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      const { token, user } = await loginUser(email, password);
      login(token, user);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  // Google Sign-In
  const handleGoogleSuccess = async (credentialResponse) => {
    setError(''); setGoogleLoading(true);
    try {
      const { token, user } = await googleAuth(credentialResponse.credential);
      login(token, user);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in was cancelled or failed. Please try again.');
  };

  const googleEnabled = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><div className="loading-spinner" /></div>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Left Panel — Branding */}
      <div style={{
        flex: '0 0 45%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(6,182,212,0.04) 100%)',
        borderRight: '1px solid var(--border)', position: 'relative', overflow: 'hidden', padding: '60px',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }} />
        <div className="orb orb-1" style={{ top: '15%', left: '20%' }} />
        <div className="orb orb-2" style={{ bottom: '10%', right: '15%' }} />

        <div style={{ position: 'relative', textAlign: 'center', maxWidth: '360px' }}>
          <img src="/logo.png?v=3" alt="Logo" style={{
            width: '80px', height: '80px', margin: '0 auto 24px',
            mixBlendMode: 'screen', objectFit: 'contain', transform: 'scale(1.7)',
            animation: 'breathe 3s ease-in-out infinite'
          }} />
          <h2 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '12px' }} className="gradient-text">
            APM
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            Lightweight, self-hosted performance monitoring for Node.js applications.
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '32px', flexWrap: 'wrap' }}>
            {['Real-time', 'Open Source', 'Self-hosted'].map(t => (
              <span key={t} style={{
                padding: '5px 14px', borderRadius: '100px', fontSize: '11px', fontWeight: 600,
                background: 'var(--accent-glow)', border: '1px solid rgba(124,58,237,0.15)',
                color: 'var(--accent-light)', letterSpacing: '0.3px',
              }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px',
        opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)', transition: 'all 0.5s ease-out',
      }}>
        <div style={{ width: '100%', maxWidth: '380px', position: 'relative' }}>
          <Link href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)',
            fontWeight: 500, marginBottom: '32px', transition: 'color 0.2s', textDecoration: 'none'
          }} onMouseOver={e => e.currentTarget.style.color = 'var(--text-primary)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} /> Back to home
          </Link>

          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Welcome back</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '32px' }}>Sign in to your dashboard</p>

          {error && (
            <div className="warning-banner error" style={{ marginBottom: '20px' }}>{error}</div>
          )}

          {/* ── Google Sign-In ── */}
          {googleEnabled && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                display: 'flex', justifyContent: 'center',
                filter: googleLoading ? 'opacity(0.6)' : 'none',
                pointerEvents: googleLoading ? 'none' : 'auto',
                transition: 'filter 0.2s',
              }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="filled_black"
                  shape="rectangular"
                  size="large"
                  text="signin_with"
                  width="340"
                />
              </div>

              {/* Divider */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0',
              }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  or sign in with email
                </span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              </div>
            </div>
          )}

          {/* ── Email / Password Form ── */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Mail size={11} /> Email
              </label>
              <input className="input" id="login-email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Lock size={11} /> Password
              </label>
              <input className="input" id="login-password" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
            </div>

            <button id="login-submit" type="submit" disabled={submitting} className="btn-primary" style={{
              width: '100%', padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              {submitting ? 'Signing in...' : <><span>Sign In</span> <ArrowRight size={16} /></>}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '28px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{ color: 'var(--accent-light)', fontWeight: 600 }}>Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
