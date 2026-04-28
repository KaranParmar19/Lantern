'use client';

import { useState, useEffect, useCallback } from 'react';
import { Filter } from 'lucide-react';
import ErrorsFeed from '@/components/ErrorsFeed';
import { getErrors } from '@/lib/api';
import { onMetricsUpdate } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';

export default function ErrorsPage() {
  const { activeProject } = useAuth();
  const projectId = activeProject?._id || '';

  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('-24h');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await getErrors(projectId, range, null, statusFilter || null);
      setErrors(data);
    } catch (err) {
      console.error('[Dashboard] Failed to fetch errors:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, range, statusFilter]);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [projectId, fetchData]);

  useEffect(() => {
    if (!projectId) return;
    const unsubscribe = onMetricsUpdate((data) => {
      if (data.projectId !== projectId) return;
      const newErrors = (data.requestMetrics || [])
        .filter((m) => m.isError)
        .map((m) => ({
          timestamp: m.timestamp, endpoint: m.endpoint, method: m.method,
          statusCode: String(m.statusCode), responseTime: m.responseTime,
          errorMessage: m.errorMessage || '', requestId: m.requestId || '',
        }));
      if (newErrors.length > 0) setErrors((prev) => [...newErrors, ...prev].slice(0, 200));
    });
    return () => unsubscribe();
  }, [projectId]);

  const errorsByStatus = errors.reduce((acc, err) => {
    const code = err.statusCode || 'unknown';
    acc[code] = (acc[code] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1 className="page-title gradient-text">Errors</h1>
        <p className="page-subtitle">
          Real-time error feed — {errors.length} error{errors.length !== 1 ? 's' : ''} in the selected range
        </p>
      </div>

      {/* Error summary badges */}
      {Object.keys(errorsByStatus).length > 0 && (
        <div className="animate-in stagger-2" style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {Object.entries(errorsByStatus)
            .sort((a, b) => b[1] - a[1])
            .map(([code, count]) => (
              <span key={code} onClick={() => setStatusFilter(statusFilter === code ? '' : code)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '4px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 600,
                  fontFamily: 'var(--font-mono)', cursor: 'pointer',
                  background: parseInt(code) >= 500 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                  color: parseInt(code) >= 500 ? '#EF4444' : '#F59E0B',
                  border: `1px solid ${parseInt(code) >= 500 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                  transition: 'all 0.2s',
                  transform: statusFilter === code ? 'scale(1.05)' : 'scale(1)',
                }}>
                {code} × {count}
                {statusFilter === code && ' ✕'}
              </span>
            ))}
        </div>
      )}

      <div className="filter-bar animate-in stagger-3">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>
          <Filter size={14} />
        </div>
        <select className="filter-select" value={range}
          onChange={(e) => { setRange(e.target.value); setLoading(true); }} id="filter-errors-range">
          <option value="-1h">Last 1 hour</option>
          <option value="-6h">Last 6 hours</option>
          <option value="-24h">Last 24 hours</option>
          <option value="-7d">Last 7 days</option>
        </select>
        <select className="filter-select" value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setLoading(true); }} id="filter-errors-status">
          <option value="">All Status Codes</option>
          <option value="400">400 Bad Request</option>
          <option value="401">401 Unauthorized</option>
          <option value="403">403 Forbidden</option>
          <option value="404">404 Not Found</option>
          <option value="500">500 Internal Server Error</option>
          <option value="502">502 Bad Gateway</option>
          <option value="503">503 Service Unavailable</option>
        </select>
      </div>

      <ErrorsFeed errors={errors} loading={loading} />
    </div>
  );
}
