'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Rocket, User, Mail, Lock, ArrowRight, Terminal } from 'lucide-react';
import { registerUser } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (!loading && isAuthenticated) router.push('/dashboard'); }, [loading, isAuthenticated, router]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setSubmitting(true);
    try {
      const { token, user } = await registerUser(name, email, password);
      login(token, user); router.push('/dashboard/projects');
    } catch (err) { setError(err.message || 'Registration failed.'); }
    finally { setSubmitting(false); }
  };

  // Password strength
  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthColors = ['transparent', '#EF4444', '#F59E0B', '#10B981'];
  const strengthLabels = ['', 'Weak', 'Good', 'Strong'];

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><div className="loading-spinner" /></div>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Left Panel */}
      <div style={{
        flex: '0 0 45%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, rgba(6,182,212,0.06) 0%, rgba(124,58,237,0.08) 100%)',
        borderRight: '1px solid var(--border)', position: 'relative', overflow: 'hidden', padding: '60px',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(6,182,212,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.03) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }} />
        <div className="orb orb-2" style={{ bottom: '10%', right: '15%' }} />
        <div className="orb orb-3" style={{ top: '20%', left: '10%' }} />

        <div style={{ position: 'relative', textAlign: 'center', maxWidth: '360px' }}>
          <img src="/logo.png?v=3" alt="Logo" style={{
            width: '80px', height: '80px', margin: '0 auto 24px',
            mixBlendMode: 'screen', objectFit: 'contain', transform: 'scale(1.7)',
            animation: 'breathe 3s ease-in-out infinite'
          }} />
          <h2 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '12px' }} className="gradient-text">
            Start Monitoring
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            Set up your dashboard in under 60 seconds. Track performance, catch errors, ship with confidence.
          </p>
          <div style={{
            marginTop: '32px', padding: '16px 20px', borderRadius: '12px',
            background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.12)', textAlign: 'left',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Terminal size={11} /> Quick setup
            </div>
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#67E8F9', lineHeight: 1.8 }}>
              npm install @lantern-apm/sdk
            </code>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px',
        opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)', transition: 'all 0.5s ease-out',
      }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Create your account</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '32px' }}>Start monitoring your Node.js apps</p>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="warning-banner error" style={{ marginBottom: '20px' }}>{error}</div>
            )}

            <div style={{ marginBottom: '18px' }}>
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <User size={11} /> Full Name
              </label>
              <input className="input" id="register-name" type="text" value={name}
                onChange={(e) => setName(e.target.value)} placeholder="John Doe" required />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Mail size={11} /> Email
              </label>
              <input className="input" id="register-email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Lock size={11} /> Password
              </label>
              <input className="input" id="register-password" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 characters" required minLength={6} />
            </div>

            {/* Password Strength Indicator */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                {[1, 2, 3].map(level => (
                  <div key={level} style={{
                    flex: 1, height: '3px', borderRadius: '2px',
                    background: strength >= level ? strengthColors[strength] : 'rgba(255,255,255,0.06)',
                    transition: 'all 0.3s',
                  }} />
                ))}
              </div>
              {strength > 0 && (
                <span style={{ fontSize: '11px', color: strengthColors[strength], fontWeight: 500 }}>
                  {strengthLabels[strength]}
                </span>
              )}
            </div>

            <button id="register-submit" type="submit" disabled={submitting} className="btn-primary" style={{
              width: '100%', padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              {submitting ? 'Creating account...' : <><span>Create Account</span> <ArrowRight size={16} /></>}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '28px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--accent-light)', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
