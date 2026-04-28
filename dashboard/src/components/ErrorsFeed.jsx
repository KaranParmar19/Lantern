'use client';

import { CheckCircle, AlertTriangle } from 'lucide-react';

export default function ErrorsFeed({ errors = [], loading = false }) {
  if (loading) {
    return (
      <div className="card animate-in">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton skeleton-row" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  if (errors.length === 0) {
    return (
      <div className="card animate-in">
        <div className="empty-state">
          <div className="empty-state-icon" style={{ background: 'rgba(16,185,129,0.08)', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle size={28} color="#34D399" strokeWidth={1.5} />
          </div>
          <div className="empty-state-title">No errors detected</div>
          <div className="empty-state-text">
            Your app is running cleanly! Errors will appear here when requests return 4xx or 5xx status codes.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card animate-in" style={{ padding: 0, overflow: 'hidden' }} id="errors-feed">
      <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Endpoint</th>
              <th>Method</th>
              <th>Status</th>
              <th>Response Time</th>
              <th>Error Message</th>
            </tr>
          </thead>
          <tbody>
            {errors.map((err, i) => {
              const is5xx = parseInt(err.statusCode) >= 500;
              return (
                <tr key={`${err.requestId || i}-${err.timestamp}`} className="animate-in" style={{ animationDelay: `${Math.min(i, 15) * 30}ms` }}>
                  <td className="muted" style={{ fontSize: '11px', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
                    {new Date(err.timestamp).toLocaleString([], {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
                    })}
                  </td>
                  <td>
                    <code style={{
                      fontSize: '12px', fontFamily: 'var(--font-mono)',
                      background: 'rgba(255,255,255,0.03)', padding: '3px 8px',
                      borderRadius: '5px', border: '1px solid rgba(255,255,255,0.04)',
                    }}>
                      {err.endpoint}
                    </code>
                  </td>
                  <td><span className={`method-tag ${err.method}`}>{err.method}</span></td>
                  <td>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700,
                      padding: '3px 10px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px',
                      background: is5xx ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                      color: is5xx ? '#F87171' : '#FBBF24',
                      border: `1px solid ${is5xx ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'}`,
                    }}>
                      <AlertTriangle size={10} />
                      {err.statusCode}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {err.responseTime ? `${parseFloat(err.responseTime).toFixed(1)} ms` : '—'}
                  </td>
                  <td style={{
                    fontSize: '12px', color: '#F87171',
                    maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {err.errorMessage || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
