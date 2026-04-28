'use client';

import { Link2 } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function EndpointsTable({ endpoints = [], loading = false }) {
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

  if (endpoints.length === 0) {
    return (
      <div className="card animate-in">
        <div className="empty-state">
          <div className="empty-state-icon" style={{ background: 'rgba(6,182,212,0.08)', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Link2 size={28} color="#22D3EE" strokeWidth={1.5} />
          </div>
          <div className="empty-state-title">No endpoints detected</div>
          <div className="empty-state-text">
            Start sending requests to your instrumented app and endpoint data will appear here.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card animate-in" style={{ padding: 0, overflow: 'hidden' }} id="endpoints-table">
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Endpoint</th>
              <th>Method</th>
              <th>Avg Response Time</th>
              <th>Error Rate</th>
              <th>Total Calls</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map((ep, i) => {
              const rtColor = ep.avgResponseTime > 1000 ? '#F87171' : ep.avgResponseTime > 300 ? '#FBBF24' : '#34D399';
              const erColor = ep.errorRate > 5 ? '#F87171' : ep.errorRate > 1 ? '#FBBF24' : '#34D399';
              return (
                <tr key={`${ep.method}-${ep.endpoint}-${i}`} className="animate-in" style={{ animationDelay: `${i * 40}ms` }}>
                  <td>
                    <code style={{
                      fontSize: '12.5px', fontFamily: 'var(--font-mono)',
                      background: 'rgba(255,255,255,0.03)', padding: '4px 10px',
                      borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)',
                    }}>
                      {ep.endpoint}
                    </code>
                  </td>
                  <td><span className={`method-tag ${ep.method}`}>{ep.method}</span></td>
                  <td>
                    <span style={{
                      color: rtColor, fontWeight: 600,
                      fontFamily: 'var(--font-mono)', fontSize: '12.5px',
                    }}>
                      {ep.avgResponseTime.toFixed(1)}
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '2px' }}>ms</span>
                    </span>
                  </td>
                  <td>
                    <span style={{ color: erColor, fontWeight: 600, fontSize: '12.5px' }}>
                      {ep.errorRate.toFixed(1)}%
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    {ep.totalCalls.toLocaleString()}
                  </td>
                  <td><StatusBadge status={ep.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
