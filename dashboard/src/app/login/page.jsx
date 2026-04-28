'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, Mail, Lock, ArrowRight } from 'lucide-react';
import { loginUser } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (!loading && isAuthenticated) router.push('/dashboard'); }, [loading, isAuthenticated, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      const { token, user } = await loginUser(email, password);
      login(token, user); router.push('/dashboard');
    } catch (err) { setError(err.message || 'Login failed. Please check your credentials.'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><div className="loading-spinner" /></div>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Left Panel — Branding */}
      <div style={{
        flex: '0 0 45%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(6,182,212,0.04) 100%)',
        borderRight: '1px solid var(--border)', position: 'relative', overflow: 'hidden', padding: '60px',
      }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }} />
        <div className="orb orb-1" style={{ top: '15%', left: '20%' }} />
        <div className="orb orb-2" style={{ bottom: '10%', right: '15%' }} />

        <div style={{ position: 'relative', textAlign: 'center', maxWidth: '360px' }}>
          <div style={{
            width: '64px', height: '64px', background: 'var(--accent-gradient)',
            borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', animation: 'breathe 3s ease-in-out infinite',
            boxShadow: '0 0 40px rgba(124,58,237,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}>
            <Zap size={30} color="#fff" />
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '12px' }} className="gradient-text">
            Lantern APM
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
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Welcome back</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '32px' }}>Sign in to your dashboard</p>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="warning-banner error" style={{ marginBottom: '20px' }}>{error}</div>
            )}

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
