'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  BarChart3, Link2, AlertTriangle, Monitor, Bell, FolderOpen,
  Zap, Star, ArrowRight, Sparkles, Activity, Shield, Cpu,
  Terminal, ChevronRight, CheckCircle2, Server
} from 'lucide-react';

function useInView(ref) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return visible;
}

const HeroDashboardMockup = () => {
  return (
    <div style={{
      width: '100%', maxWidth: '1060px', margin: '60px auto 0',
      background: 'rgba(10, 10, 14, 0.85)',
      backdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '24px', overflow: 'hidden',
      boxShadow: '0 30px 80px rgba(0,0,0,0.8), 0 0 120px rgba(124, 58, 237, 0.15)',
      transform: 'perspective(1200px) rotateX(4deg)',
      transformOrigin: 'top center',
      animation: 'float 8s ease-in-out infinite',
    }}>
      {/* Mac Window Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#EF4444', opacity: 0.9, boxShadow: '0 0 8px rgba(239,68,68,0.4)' }} />
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#F59E0B', opacity: 0.9, boxShadow: '0 0 8px rgba(245,158,11,0.4)' }} />
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10B981', opacity: 0.9, boxShadow: '0 0 8px rgba(16,185,129,0.4)' }} />
        <div style={{ margin: '0 auto', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Shield size={14} color="#10B981" /> dashboard.lantern.dev
        </div>
      </div>
      {/* Mockup Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: '480px' }}>
        {/* Sidebar */}
        <div style={{ borderRight: '1px solid rgba(255,255,255,0.05)', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.2)' }}>
          {[
            { icon: BarChart3, label: 'Overview', active: true },
            { icon: Link2, label: 'Endpoints', active: false },
            { icon: AlertTriangle, label: 'Errors', active: false },
            { icon: Monitor, label: 'System Health', active: false },
            { icon: Bell, label: 'Alerts', active: false }
          ].map((item, i) => (
            <div key={i} style={{ 
              display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px', 
              background: item.active ? 'rgba(124,58,237,0.15)' : 'transparent',
              color: item.active ? '#fff' : 'var(--text-secondary)',
              borderLeft: item.active ? '3px solid var(--accent)' : '3px solid transparent',
              transition: 'all 0.2s'
            }}>
              <item.icon size={18} color={item.active ? 'var(--accent-light)' : 'var(--text-secondary)'} />
              <span style={{ fontSize: '14px', fontWeight: item.active ? 600 : 500 }}>{item.label}</span>
            </div>
          ))}
        </div>
        {/* Main Area */}
        <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {[
              { label: 'Requests per min', value: '12,450', change: '+14%', color: '#10B981', icon: Activity, spark: 'M0,15 Q5,5 10,10 T20,15 T30,5 T40,10 T50,0' },
              { label: 'Avg Response', value: '42ms', change: '-2ms', color: '#A78BFA', icon: Zap, spark: 'M0,5 Q10,15 20,5 T40,10 T50,15' },
              { label: 'Error Rate', value: '0.01%', change: '0.00%', color: '#06B6D4', icon: Shield, spark: 'M0,15 L50,15' }
            ].map((stat, i) => (
              <div key={i} style={{ 
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '10px', background: `rgba(255,255,255,0.05)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <stat.icon size={18} color={stat.color} />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: stat.color, background: `${stat.color}20`, padding: '2px 8px', borderRadius: '100px' }}>{stat.change}</span>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff', letterSpacing: '-1px', marginBottom: '4px', fontFeatureSettings: '"tnum"' }}>{stat.value}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>{stat.label}</div>
                  <svg width="50" height="20" viewBox="0 0 50 20">
                    <path d={stat.spark} fill="none" stroke={stat.color} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
          {/* Main Chart Area */}
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Global Latency (p99)
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981', animation: 'pulseDot 2s infinite' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '2px', background: '#A78BFA' }}/> p99</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '2px', background: '#06B6D4' }}/> p95</span>
              </div>
            </div>
            
            <div style={{ position: 'absolute', inset: 0, top: '60px', opacity: 0.8 }}>
              {/* Grid lines */}
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', maskImage: 'linear-gradient(to bottom, black, transparent)' }} />
              
              <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
                {/* Purple Line (p99) */}
                <path d="M0,80 Q10,40 25,50 T50,30 T75,60 T100,20 L100,100 L0,100 Z" fill="url(#grad1)" />
                <path d="M0,80 Q10,40 25,50 T50,30 T75,60 T100,20" fill="none" stroke="#A78BFA" strokeWidth="2.5" vectorEffect="non-scaling-stroke" filter="drop-shadow(0 0 8px rgba(167,139,250,0.6))" />
                {/* Cyan Line (p95) */}
                <path d="M0,90 Q15,70 30,75 T60,50 T85,75 T100,40 L100,100 L0,100 Z" fill="url(#grad2)" />
                <path d="M0,90 Q15,70 30,75 T60,50 T85,75 T100,40" fill="none" stroke="#06B6D4" strokeWidth="2" vectorEffect="non-scaling-stroke" filter="drop-shadow(0 0 6px rgba(6,182,212,0.4))" />
                
                {/* Glowing Dots */}
                <circle cx="50" cy="30" r="1.5" fill="#fff" filter="drop-shadow(0 0 4px #A78BFA)" />
                <circle cx="100" cy="20" r="1.5" fill="#fff" filter="drop-shadow(0 0 4px #A78BFA)" />
                <circle cx="60" cy="50" r="1.5" fill="#fff" filter="drop-shadow(0 0 4px #06B6D4)" />

                <defs>
                  <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  const heroRef = useRef(null);
  const bentoRef = useRef(null);
  const codeRef = useRef(null);
  const ctaRef = useRef(null);

  const bentoVisible = useInView(bentoRef);
  const codeVisible = useInView(codeRef);
  const ctaVisible = useInView(ctaRef);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (!loading && isAuthenticated) router.push('/dashboard'); }, [loading, isAuthenticated, router]);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><div className="loading-spinner" /></div>;
  if (isAuthenticated) return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', overflow: 'hidden', color: '#fff', fontFamily: 'var(--font-sans)' }}>
      {/* Noise Texture */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, opacity: 0.03, pointerEvents: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />

      {/* Grid Lines */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '100px 100px',
        maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 80%)',
      }} />

      {/* Glowing Orbs */}
      <div style={{ position: 'absolute', top: '-20%', left: '10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)', filter: 'blur(80px)', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: '30%', right: '-10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)', filter: 'blur(80px)', zIndex: 0 }} />

      {/* Navigation */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '20px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(6,6,11,0.7)',
        opacity: 1, transform: 'translateY(0)', transition: 'all 0.6s ease-out',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo.png?v=3" alt="Logo" style={{ width: '44px', height: '44px', mixBlendMode: 'screen', objectFit: 'contain', transform: 'scale(1.7)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ display: 'flex', gap: '24px', display: 'none' }} className="md:flex">
            <Link href="#features" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color = '#fff'} onMouseOut={e => e.target.style.color = 'var(--text-secondary)'}>Features</Link>
            <Link href="#docs" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color = '#fff'} onMouseOut={e => e.target.style.color = 'var(--text-secondary)'}>Documentation</Link>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />
          <Link href="/login" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color = '#fff'} onMouseOut={e => e.target.style.color = 'var(--text-secondary)'}>Log In</Link>
          <Link href="/register" style={{
            padding: '10px 24px', borderRadius: '100px', fontSize: '14px', fontWeight: 600,
            background: '#fff', color: '#000', transition: 'transform 0.2s, box-shadow 0.2s',
            boxShadow: '0 0 20px rgba(255,255,255,0.2)',
          }} onMouseOver={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 30px rgba(255,255,255,0.3)'; }} onMouseOut={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 0 20px rgba(255,255,255,0.2)'; }}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} style={{
        position: 'relative', zIndex: 1, textAlign: 'center',
        padding: '180px 32px 100px', margin: '0 auto',
        opacity: 1, transform: 'translateY(0)', transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '8px 20px', borderRadius: '100px', fontSize: '13px', fontWeight: 600,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', marginBottom: '32px',
          backdropFilter: 'blur(10px)',
        }}>
          <Sparkles size={14} color="#A78BFA" /> Open Source APM for Node.js
        </div>

        <h1 style={{ fontSize: 'clamp(48px, 8vw, 84px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.04em', color: '#fff', marginBottom: '24px', textWrap: 'balance' }}>
          Understand your code.<br />
          <span style={{
            background: 'linear-gradient(to right, #fff 20%, #A78BFA 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Before it breaks.</span>
        </h1>

        <p style={{ fontSize: 'clamp(18px, 2vw, 22px)', lineHeight: 1.6, color: 'var(--text-secondary)', maxWidth: '700px', margin: '0 auto 48px', textWrap: 'balance', letterSpacing: '-0.01em' }}>
          Zero-config telemetry for Node.js. Track response times, trace errors, and monitor memory leaks with surgical precision. All it takes is two lines of code.
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '80px', flexWrap: 'wrap' }}>
          <Link href="/register" style={{
            padding: '16px 36px', borderRadius: '12px', fontSize: '16px', fontWeight: 600,
            background: '#fff', color: '#000', display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 0 40px rgba(255,255,255,0.2)', transition: 'all 0.2s',
          }}>
            Start Monitoring <ArrowRight size={18} />
          </Link>
          <a href="https://github.com/KaranParmar19/Lantern" target="_blank" rel="noopener" style={{
            padding: '16px 36px', borderRadius: '12px', fontSize: '16px', fontWeight: 600,
            background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
          }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
            <Terminal size={18} /> View on GitHub
          </a>
        </div>

        <HeroDashboardMockup />
      </section>

      {/* Bento Grid Features */}
      <section id="features" ref={bentoRef} style={{
        position: 'relative', zIndex: 1, padding: '120px 32px', maxWidth: '1280px', margin: '0 auto',
        opacity: 1, transform: 'translateY(0)', transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '16px' }}>
            Built for modern engineering teams
          </h2>
          <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
            Everything you need to ship faster and sleep better, packaged into a gorgeous, high-performance UI.
          </p>
        </div>

        {/* CSS Grid for Bento Layout */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px',
          gridAutoRows: 'minmax(300px, auto)'
        }}>
          {/* Card 1 - Large */}
          <div className="bento-large" style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '48px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)', filter: 'blur(40px)' }} />
            <Activity size={32} color="#A78BFA" style={{ marginBottom: '24px' }} />
            <h3 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '16px', letterSpacing: '-0.02em' }}>Sub-millisecond precision</h3>
            <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '400px' }}>Lantern collects high-fidelity telemetry data without blocking the event loop. Monitor RPM, latency, and throughput in absolute real-time.</p>
          </div>

          {/* Card 2 */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '40px', position: 'relative', overflow: 'hidden' }}>
            <AlertTriangle size={28} color="#EF4444" style={{ marginBottom: '24px' }} />
            <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '12px', letterSpacing: '-0.02em' }}>Error Tracing</h3>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>Automatically capture 4xx and 5xx errors with full stack traces, request payloads, and user context to resolve bugs instantly.</p>
          </div>

          {/* Card 3 */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '40px', position: 'relative', overflow: 'hidden' }}>
            <Cpu size={28} color="#10B981" style={{ marginBottom: '24px' }} />
            <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '12px', letterSpacing: '-0.02em' }}>Memory Profiling</h3>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>Track Heap Total, Heap Used, and RSS continuously. Spot memory leaks hours before they trigger an OOM crash.</p>
          </div>
        </div>
      </section>

      {/* Code Integration Section */}
      <section ref={codeRef} style={{
        position: 'relative', zIndex: 1, padding: '120px 32px', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.03)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '80px', alignItems: 'center' }}>
          <div style={{ opacity: 1, transform: 'translateX(0)', transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1)' }}>
            <h2 style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '24px' }}>Integrates in seconds.</h2>
            <p style={{ fontSize: '18px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '32px' }}>
              No massive configuration files. No agents to install on your host. Simply drop the SDK into your Express app and start streaming metrics immediately.
            </p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '16px', listStyle: 'none', padding: 0 }}>
              {[
                'Zero external dependencies',
                'Minimal performance overhead (<1ms)',
                'Auto-discovers all API routes',
                'Automatic request & response sizing'
              ].map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>
                  <CheckCircle2 size={20} color="#10B981" /> {item}
                </li>
              ))}
            </ul>
          </div>

          <div style={{
            background: '#0d0d12', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            opacity: 1, transform: 'translateX(0)', transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s'
          }}>
            <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#EF4444' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#F59E0B' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10B981' }} />
              <span style={{ marginLeft: '12px', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>server.js</span>
            </div>
            <div style={{ padding: '32px', fontFamily: 'var(--font-mono)', fontSize: '14px', lineHeight: 1.8, overflowX: 'auto' }}>
              <pre style={{ margin: 0 }}>
                <span style={{ color: '#8888a4' }}>// 1. Import the SDK</span>{'\n'}
                <span style={{ color: '#ff7b72' }}>const</span> <span style={{ color: '#79c0ff' }}>lantern</span> <span style={{ color: '#ff7b72' }}>=</span> <span style={{ color: '#d2a8ff' }}>require</span>(<span style={{ color: '#a5d6ff' }}>'@lantern-apm/sdk'</span>);{'\n\n'}
                <span style={{ color: '#8888a4' }}>// 2. Initialize with your API Key</span>{'\n'}
                <span style={{ color: '#79c0ff' }}>lantern</span>.<span style={{ color: '#d2a8ff' }}>init</span>({'{'} <span style={{ color: '#79c0ff' }}>apiKey</span>: <span style={{ color: '#a5d6ff' }}>'ltrn_live_xxxxxxxx'</span> {'}'});{'\n\n'}
                <span style={{ color: '#ff7b72' }}>const</span> <span style={{ color: '#79c0ff' }}>express</span> <span style={{ color: '#ff7b72' }}>=</span> <span style={{ color: '#d2a8ff' }}>require</span>(<span style={{ color: '#a5d6ff' }}>'express'</span>);{'\n'}
                <span style={{ color: '#ff7b72' }}>const</span> <span style={{ color: '#79c0ff' }}>app</span> <span style={{ color: '#ff7b72' }}>=</span> <span style={{ color: '#d2a8ff' }}>express</span>();{'\n\n'}
                <span style={{ color: '#8888a4' }}>// 3. Attach the middleware</span>{'\n'}
                <span style={{ color: '#79c0ff' }}>app</span>.<span style={{ color: '#d2a8ff' }}>use</span>(<span style={{ color: '#79c0ff' }}>lantern</span>.<span style={{ color: '#d2a8ff' }}>middleware</span>());{'\n\n'}
                <span style={{ color: '#79c0ff' }}>app</span>.<span style={{ color: '#d2a8ff' }}>listen</span>(<span style={{ color: '#a5d6ff' }}>3000</span>, () <span style={{ color: '#ff7b72' }}>=&gt;</span> {'{'} console.log(<span style={{ color: '#a5d6ff' }}>'App is alive and monitored!'</span>); {'}'});
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaRef} style={{
        position: 'relative', zIndex: 1, padding: '160px 32px', textAlign: 'center',
      }}>
        <div style={{
          maxWidth: '800px', margin: '0 auto',
          opacity: 1, transform: 'scale(1)', transition: 'all 0.6s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <h2 style={{ fontSize: 'clamp(40px, 6vw, 64px)', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '24px' }}>
            Stop guessing.<br />Start monitoring.
          </h2>
          <p style={{ fontSize: '20px', color: 'var(--text-secondary)', marginBottom: '40px' }}>Join the next generation of Node.js developers.</p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link href="/register" style={{
              padding: '18px 48px', borderRadius: '100px', fontSize: '18px', fontWeight: 600,
              background: '#fff', color: '#000', display: 'flex', alignItems: 'center', gap: '12px',
              boxShadow: '0 0 50px rgba(255,255,255,0.2)', transition: 'transform 0.2s',
            }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
              Get Started for Free <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.05)', padding: '48px 32px', background: 'var(--bg-secondary)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png?v=3" alt="Logo" style={{ width: '24px', height: '24px', mixBlendMode: 'screen', objectFit: 'contain', transform: 'scale(1.7)' }} />
            <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.5px' }}>Lantern APM</span>
          </div>
          <div style={{ display: 'flex', gap: '24px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            <a href="https://github.com/KaranParmar19/Lantern" target="_blank" rel="noopener" style={{ transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color = '#fff'} onMouseOut={e => e.target.style.color = 'var(--text-secondary)'}>GitHub</a>
            <a href="https://github.com/KaranParmar19/Lantern#readme" target="_blank" rel="noopener" style={{ transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color = '#fff'} onMouseOut={e => e.target.style.color = 'var(--text-secondary)'}>Documentation</a>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '24px' }}>
            © {new Date().getFullYear()} Lantern APM. Open-source monitoring for Node.js.
          </p>
        </div>
      </footer>
    </div>
  );
}
