'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  BarChart3, Link2, AlertTriangle, Monitor,
  Bell, FolderOpen, LogOut, ChevronDown, Zap
} from 'lucide-react';

export default function Sidebar({ isConnected = false }) {
  const pathname = usePathname();
  const { user, projects, activeProject, switchProject, logout } = useAuth();

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: BarChart3 },
    { href: '/dashboard/endpoints', label: 'Endpoints', icon: Link2 },
    { href: '/dashboard/errors', label: 'Errors', icon: AlertTriangle },
    { href: '/dashboard/system', label: 'System Health', icon: Monitor },
  ];

  const configItems = [
    { href: '/dashboard/alerts', label: 'Alerts', icon: Bell },
    { href: '/dashboard/projects', label: 'Projects', icon: FolderOpen },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" style={{ animation: 'breathe 3s ease-in-out infinite' }}>
            <Zap size={20} color="#fff" />
          </div>
          <div>
            <div className="sidebar-logo-text">Lantern</div>
            <div className="sidebar-logo-version">APM v1.0</div>
          </div>
        </div>
      </div>

      {/* Project Switcher */}
      {projects.length > 0 && (
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{
            fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px',
            color: 'var(--text-muted)', padding: '0 8px 8px',
          }}>
            Project
          </div>
          <div style={{
            position: 'relative', background: 'var(--bg-input)',
            border: '1px solid var(--border)', borderRadius: '10px',
            overflow: 'hidden', transition: 'border-color 0.2s',
          }}>
            <select
              value={activeProject?._id || ''}
              onChange={(e) => {
                const proj = projects.find((p) => p._id === e.target.value);
                if (proj) switchProject(proj);
              }}
              style={{
                width: '100%', padding: '9px 32px 9px 12px',
                background: 'transparent', border: 'none',
                color: 'var(--text-primary)', fontSize: '13px', fontWeight: 500,
                cursor: 'pointer', outline: 'none',
                fontFamily: "'Inter', sans-serif",
                appearance: 'none',
              }}
            >
              {projects.map((p) => (
                <option key={p._id} value={p._id} style={{ background: 'var(--bg-secondary)' }}>{p.name}</option>
              ))}
            </select>
            <div style={{
              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
              pointerEvents: 'none', color: 'var(--text-muted)',
            }}>
              <ChevronDown size={14} />
            </div>
          </div>
          {activeProject?.apiKey && (
            <div style={{
              marginTop: '6px', padding: '5px 10px', fontSize: '10px',
              fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
              background: 'rgba(255,255,255,0.02)', borderRadius: '6px',
              textAlign: 'center', border: '1px solid rgba(255,255,255,0.03)',
            }}>
              🔑 {activeProject.apiKey.substring(0, 14)}...
            </div>
          )}
        </div>
      )}

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Monitoring</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className={`sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-link-icon">
                <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
              </span>
              {item.label}
            </Link>
          );
        })}

        <div className="sidebar-section-label" style={{ marginTop: '8px' }}>Configuration</div>
        {configItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className={`sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-link-icon">
                <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div className="sidebar-status">
          <span className={`status-dot ${isConnected ? '' : 'offline'}`} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <div style={{
                width: '26px', height: '26px', borderRadius: '8px',
                background: 'var(--accent-gradient)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0,
                boxShadow: '0 0 12px rgba(124,58,237,0.2)',
              }}>
                {(user.name || user.email || '?')[0].toUpperCase()}
              </div>
              <span style={{
                fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user.name || user.email}
              </span>
            </div>
            <button onClick={logout} className="btn-ghost" style={{
              padding: '4px 10px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              <LogOut size={12} /> Logout
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
