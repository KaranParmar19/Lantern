'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  BarChart3, Link2, AlertTriangle, Monitor, Bell, FolderOpen,
  Zap, Star, ArrowRight, Sparkles, Package, Target,
} from 'lucide-react';

const FEATURES = [
  { Icon: BarChart3, title: 'Real-Time Dashboard', desc: 'Live RPM, response times, and error rates with auto-refreshing charts and Socket.IO streaming.', color: '#8B5CF6' },
  { Icon: Link2, title: 'Endpoint Breakdown', desc: 'See every API route ranked by performance. Instantly find your slowest endpoints.', color: '#06B6D4' },
  { Icon: AlertTriangle, title: 'Error Tracking', desc: 'Capture every 4xx and 5xx error with full context — method, status code, timing, and more.', color: '#EF4444' },
  { Icon: Monitor, title: 'System Health', desc: 'Monitor CPU, heap memory, and RSS in real-time. Detect memory leaks before they crash your app.', color: '#10B981' },
  { Icon: Bell, title: 'Smart Alerts', desc: 'Configurable rules with email notifications, cooldown periods, and threshold-based triggers.', color: '#F59E0B' },
  { Icon: FolderOpen, title: 'Multi-Project', desc: 'Manage unlimited projects, each with unique API keys. Switch between apps in one click.', color: '#A855F7' },
];

const STEPS = [
  { step: '1', title: 'Install the SDK', desc: 'npm install @lantern-apm/sdk', Icon: Package },
  { step: '2', title: 'Add 2 lines of code', desc: 'Init the SDK and attach the middleware', Icon: Zap },
  { step: '3', title: 'See Your Metrics', desc: 'Open the dashboard and watch live data flow in', Icon: Target },
];

function useInView(ref) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.15 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return visible;
}

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  const featuresRef = useRef(null);
  const stepsRef = useRef(null);
  const ctaRef = useRef(null);
  const featuresVisible = useInView(featuresRef);
  const stepsVisible = useInView(stepsRef);
  const ctaVisible = useInView(ctaRef);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (!loading && isAuthenticated) router.push('/dashboard'); }, [loading, isAuthenticated, router]);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><div className="loading-spinner" /></div>;
  if (isAuthenticated) return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      {/* Animated Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(139,92,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.03) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Floating Orbs */}
      <div className="orb orb-1" style={{ top: '-15%', left: '-8%' }} />
      <div className="orb orb-2" style={{ bottom: '-15%', right: '-8%' }} />
      <div className="orb orb-3" style={{ top: '40%', right: '10%' }} />

      {/* Particles */}
      <div className="particles">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="particle" style={{
            left: `${8 + Math.random() * 84}%`, top: `${5 + Math.random() * 90}%`,
            width: `${1.5 + Math.random() * 2}px`, height: `${1.5 + Math.random() * 2}px`,
            animationDelay: `${Math.random() * 6}s`, animationDuration: `${4 + Math.random() * 4}s`,
            opacity: 0.2 + Math.random() * 0.3,
          }} />
        ))}
      </div>

      {/* Navigation */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50, padding: '16px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', background: 'rgba(10,10,15,0.8)',
        opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(-10px)', transition: 'all 0.6s ease-out',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', background: 'var(--accent-gradient)',
            borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)',
          }}>
            <Zap size={18} color="#fff" />
          </div>
          <span style={{
            fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px',
          }} className="gradient-text">Lantern</span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/login" className="btn-ghost" style={{ padding: '8px 20px', borderRadius: '10px', fontSize: '14px' }}>Sign In</Link>
          <Link href="/register" className="btn-primary" style={{ padding: '8px 20px', borderRadius: '10px', fontSize: '14px' }}>Get Started</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        position: 'relative', zIndex: 1, textAlign: 'center',
        padding: '100px 32px 80px', maxWidth: '900px', margin: '0 auto',
        opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.8s ease-out 0.2s',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '6px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: 500,
          background: 'var(--accent-glow)', border: '1px solid rgba(139,92,246,0.2)', color: 'var(--accent-light)', marginBottom: '28px',
        }}>
          <Sparkles size={14} /> Open Source APM for Node.js
        </div>

        <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-2px', color: 'var(--text-primary)', marginBottom: '24px' }}>
          Monitor Your APIs<br />
          <span className="hero-gradient-text">In Real-Time</span>
        </h1>

        <p style={{ fontSize: '18px', lineHeight: 1.7, color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 40px' }}>
          Lightweight, self-hosted application performance monitoring. Track response times, catch errors, and monitor system health — all with
          <strong style={{ color: 'var(--text-primary)' }}> just 2 lines of code</strong>.
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '60px' }}>
          <Link href="/register" className="btn-primary" style={{ padding: '14px 32px', borderRadius: '12px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Start Monitoring <ArrowRight size={18} />
          </Link>
          <a href="https://github.com" target="_blank" rel="noopener" className="btn-ghost"
            style={{ padding: '14px 32px', borderRadius: '12px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Star size={18} /> GitHub
          </a>
        </div>

        {/* Code Preview */}
        <div style={{
          background: 'rgba(17,17,25,0.9)', border: '1px solid var(--border-strong)',
          borderRadius: '16px', padding: '28px 32px', textAlign: 'left',
          maxWidth: '580px', margin: '0 auto', position: 'relative', overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 60px rgba(139,92,246,0.05)',
        }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#EF4444' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F59E0B' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10B981' }} />
          </div>
          <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', lineHeight: 1.8, margin: 0 }}>
            <span style={{ color: '#6B7280' }}>{"// That's it. Just 2 lines."}</span>{'\n'}
            <span style={{ color: '#C084FC' }}>const</span>{' '}
            <span style={{ color: '#F0F0F5' }}>lantern</span>{' '}
            <span style={{ color: '#6B7280' }}>=</span>{' '}
            <span style={{ color: '#A78BFA' }}>require</span>
            <span style={{ color: '#6B7280' }}>(</span>
            <span style={{ color: '#34D399' }}>&apos;@lantern-apm/sdk&apos;</span>
            <span style={{ color: '#6B7280' }}>);</span>{'\n'}
            <span style={{ color: '#F0F0F5' }}>lantern</span>
            <span style={{ color: '#6B7280' }}>.</span>
            <span style={{ color: '#A78BFA' }}>init</span>
            <span style={{ color: '#6B7280' }}>(</span>
            <span style={{ color: '#6B7280' }}>{'{ '}</span>
            <span style={{ color: '#06B6D4' }}>apiKey</span>
            <span style={{ color: '#6B7280' }}>: </span>
            <span style={{ color: '#34D399' }}>&apos;ltrn_live_...&apos;</span>
            <span style={{ color: '#6B7280' }}>{' }'}</span>
            <span style={{ color: '#6B7280' }}>);</span>{'\n\n'}
            <span style={{ color: '#6B7280' }}>{'// Add middleware to Express'}</span>{'\n'}
            <span style={{ color: '#F0F0F5' }}>app</span>
            <span style={{ color: '#6B7280' }}>.</span>
            <span style={{ color: '#A78BFA' }}>use</span>
            <span style={{ color: '#6B7280' }}>(</span>
            <span style={{ color: '#F0F0F5' }}>lantern</span>
            <span style={{ color: '#6B7280' }}>.</span>
            <span style={{ color: '#A78BFA' }}>middleware</span>
            <span style={{ color: '#6B7280' }}>()</span>
            <span style={{ color: '#6B7280' }}>);</span>
          </pre>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', background: 'linear-gradient(transparent, rgba(139,92,246,0.03))', pointerEvents: 'none' }} />
        </div>
      </section>

      {/* Features Grid */}
      <section ref={featuresRef} className={featuresVisible ? 'animate-in' : ''} style={{
        position: 'relative', zIndex: 1, padding: '60px 32px 80px', maxWidth: '1100px', margin: '0 auto',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-1px', marginBottom: '12px' }} className="gradient-text">
            Everything You Need to Ship With Confidence
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto' }}>
            From request tracing to memory leak detection — Lantern gives you full visibility.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-card" style={{ '--card-accent': `${f.color}40`, animationDelay: featuresVisible ? `${i * 80}ms` : '0ms' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${f.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <f.Icon size={24} color={f.color} strokeWidth={1.8} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>{f.title}</h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section ref={stepsRef} className={stepsVisible ? 'animate-in' : ''} style={{
        position: 'relative', zIndex: 1, padding: '60px 32px 80px', maxWidth: '900px', margin: '0 auto',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-1px' }} className="gradient-text">Up and Running in 3 Steps</h2>
        </div>
        <div style={{ display: 'flex', gap: '24px', position: 'relative' }}>
          {/* Connecting line */}
          <div style={{ position: 'absolute', top: '48px', left: '20%', right: '20%', height: '2px', background: 'linear-gradient(90deg, var(--accent), rgba(6,182,212,0.3), var(--success))', opacity: 0.3, zIndex: 0 }} />
          {STEPS.map((s, i) => (
            <div key={i} className="feature-card" style={{ flex: 1, textAlign: 'center', zIndex: 1, animationDelay: stepsVisible ? `${i * 120}ms` : '0ms' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: '#fff', margin: '0 auto 16px', boxShadow: 'var(--shadow-glow)' }}>{s.step}</div>
              <div style={{ marginBottom: '12px' }}><s.Icon size={28} color="var(--accent-light)" strokeWidth={1.5} /></div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>{s.title}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section style={{ position: 'relative', zIndex: 1, padding: '40px 32px 80px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-muted)', marginBottom: '24px' }}>Built With</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {['Node.js', 'Express', 'Next.js', 'InfluxDB', 'MongoDB', 'Redis', 'Socket.IO'].map((tech) => (
            <span key={tech} style={{
              fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)',
              padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-glass)',
              transition: 'all 0.3s', cursor: 'default',
            }}>{tech}</span>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section ref={ctaRef} className={ctaVisible ? 'animate-in' : ''} style={{
        position: 'relative', zIndex: 1, padding: '60px 32px 100px', textAlign: 'center',
      }}>
        <div style={{
          maxWidth: '600px', margin: '0 auto', padding: '48px', background: 'var(--bg-card)',
          border: '1px solid var(--border)', borderRadius: '24px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #8B5CF6, #06B6D4, #10B981)' }} />
          <h2 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: '12px' }} className="gradient-text">Ready to ship with confidence?</h2>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '28px' }}>Start monitoring your Node.js apps in under 60 seconds.</p>
          <Link href="/register" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 36px', borderRadius: '12px', fontSize: '16px' }}>
            Create Free Account <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid var(--border)', padding: '32px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
          <Zap size={16} color="var(--accent-light)" />
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Lantern APM</span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Open-source application performance monitoring for Node.js.<br />
          Built with ❤️ for developers who care about performance.
        </p>
      </footer>
    </div>
  );
}
