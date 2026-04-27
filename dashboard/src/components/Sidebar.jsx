'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

/**
 * Sidebar — Main navigation with project switcher and user menu.
 */
export default function Sidebar({ isConnected = false }) {
  const pathname = usePathname();
  const { user, projects, activeProject, switchProject, logout } = useAuth();

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: '📊' },
    { href: '/dashboard/endpoints', label: 'Endpoints', icon: '🔗' },
    { href: '/dashboard/errors', label: 'Errors', icon: '🚨' },
    { href: '/dashboard/system', label: 'System Health', icon: '💻' },
  ];

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🏮</div>
          <div>
            <div className="sidebar-logo-text">Lantern</div>
            <div className="sidebar-logo-version">APM v1.0</div>
          </div>
        </div>
      </div>

      {/* Project Switcher */}
      {projects.length > 0 && (
        <div style={{ padding: '12px 12px 0' }}>
          <div style={{
            fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px',
            color: 'var(--text-muted)', padding: '0 12px 6px',
          }}>
            Project
          </div>
          <select
            value={activeProject?._id || ''}
            onChange={(e) => {
              const proj = projects.find((p) => p._id === e.target.value);
              if (proj) switchProject(proj);
            }}
            style={{
              width: '100%', padding: '8px 12px', background: 'var(--bg-secondary)',
              border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)',
              fontSize: '13px', fontWeight: 500, cursor: 'pointer', outline: 'none',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {projects.map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
          {/* API Key badge */}
          {activeProject?.apiKey && (
            <div style={{
              marginTop: '6px', padding: '4px 12px', fontSize: '10px',
              fontFamily: "'SF Mono', 'Fira Code', monospace",
              color: 'var(--text-muted)', background: 'var(--bg-glass)',
              borderRadius: '6px', textAlign: 'center', letterSpacing: '0.3px',
            }}>
              🔑 {activeProject.apiKey.substring(0, 12)}...
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Monitoring</div>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        <div className="sidebar-section-label" style={{ marginTop: '12px' }}>
          Configuration
        </div>
        <Link
          href="/dashboard/alerts"
          className={`sidebar-link ${pathname === '/dashboard/alerts' ? 'active' : ''}`}
        >
          <span className="sidebar-link-icon">🔔</span>
          Alerts
        </Link>
        <Link
          href="/dashboard/projects"
          className={`sidebar-link ${pathname === '/dashboard/projects' ? 'active' : ''}`}
        >
          <span className="sidebar-link-icon">📁</span>
          Projects
        </Link>
      </nav>

      {/* User + Connection Footer */}
      <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div className="sidebar-status">
          <span className={`status-dot ${isConnected ? '' : 'offline'}`} />
          {isConnected ? 'Connected to collector' : 'Disconnected'}
        </div>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {user.name || user.email}
            </div>
            <button
              onClick={logout}
              style={{
                background: 'none', border: '1px solid var(--border)', borderRadius: '6px',
                padding: '3px 8px', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer',
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
