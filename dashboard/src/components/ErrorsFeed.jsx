'use client';

/**
 * ErrorsFeed — Real-time list of error requests.
 * 
 * Props:
 *   errors  - Array from GET /api/metrics/errors
 *   loading - Boolean
 */
export default function ErrorsFeed({ errors = [], loading = false }) {
  if (loading) {
    return (
      <div className="card">
        <div className="loading-container">
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  if (errors.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <div className="empty-state-title">No errors detected</div>
          <div className="empty-state-text">
            Your app is running cleanly! Errors will appear here when requests return 4xx or 5xx status codes.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }} id="errors-feed">
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
            {errors.map((err, i) => (
              <tr key={`${err.requestId || i}-${err.timestamp}`}>
                <td className="muted" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                  {new Date(err.timestamp).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </td>
                <td>
                  <code style={{
                    fontSize: '13px',
                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                    background: 'rgba(255,255,255,0.04)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                  }}>
                    {err.endpoint}
                  </code>
                </td>
                <td>
                  <span className={`method-tag ${err.method}`}>{err.method}</span>
                </td>
                <td>
                  <span style={{
                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                    fontSize: '13px',
                    fontWeight: 700,
                    color: parseInt(err.statusCode) >= 500 ? '#EF4444' : '#F59E0B',
                  }}>
                    {err.statusCode}
                  </span>
                </td>
                <td className="muted" style={{
                  fontFamily: "'SF Mono', 'Fira Code', monospace",
                  fontSize: '12px',
                }}>
                  {err.responseTime ? `${parseFloat(err.responseTime).toFixed(1)} ms` : '—'}
                </td>
                <td style={{
                  fontSize: '13px',
                  color: '#EF4444',
                  maxWidth: '300px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {err.errorMessage || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
