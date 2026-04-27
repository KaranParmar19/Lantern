'use client';

import StatusBadge from './StatusBadge';

/**
 * EndpointsTable — Color-coded table of all API endpoints and their performance.
 * 
 * Props:
 *   endpoints - Array from GET /api/metrics/endpoints
 *   loading   - Boolean
 */
export default function EndpointsTable({ endpoints = [], loading = false }) {
  if (loading) {
    return (
      <div className="card">
        <div className="loading-container">
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  if (endpoints.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">🔗</div>
          <div className="empty-state-title">No endpoints detected</div>
          <div className="empty-state-text">
            Start sending requests to your instrumented app and endpoint data will appear here.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }} id="endpoints-table">
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
            {endpoints.map((ep, i) => (
              <tr key={`${ep.method}-${ep.endpoint}-${i}`}>
                <td>
                  <code style={{
                    fontSize: '13px',
                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                    background: 'rgba(255,255,255,0.04)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                  }}>
                    {ep.endpoint}
                  </code>
                </td>
                <td>
                  <span className={`method-tag ${ep.method}`}>{ep.method}</span>
                </td>
                <td>
                  <span style={{ 
                    color: ep.avgResponseTime > 1000 ? '#EF4444' 
                         : ep.avgResponseTime > 300 ? '#F59E0B' 
                         : '#10B981',
                    fontWeight: 600,
                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                    fontSize: '13px',
                  }}>
                    {ep.avgResponseTime.toFixed(1)} ms
                  </span>
                </td>
                <td>
                  <span style={{
                    color: ep.errorRate > 5 ? '#EF4444'
                         : ep.errorRate > 1 ? '#F59E0B'
                         : '#10B981',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}>
                    {ep.errorRate.toFixed(1)}%
                  </span>
                </td>
                <td className="muted" style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: '13px' }}>
                  {ep.totalCalls.toLocaleString()}
                </td>
                <td>
                  <StatusBadge status={ep.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
