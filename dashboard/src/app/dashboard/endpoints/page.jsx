'use client';

import { useState, useEffect, useCallback } from 'react';
import { Filter } from 'lucide-react';
import EndpointsTable from '@/components/EndpointsTable';
import { getEndpoints } from '@/lib/api';
import { onMetricsUpdate } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';

export default function EndpointsPage() {
  const { activeProject } = useAuth();
  const projectId = activeProject?._id || '';

  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('-24h');

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await getEndpoints(projectId, range);
      setEndpoints(data);
    } catch (err) {
      console.error('[Dashboard] Failed to fetch endpoints:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, range]);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [projectId, fetchData]);

  useEffect(() => {
    if (!projectId) return;
    const unsubscribe = onMetricsUpdate((data) => {
      if (data.projectId === projectId) setTimeout(fetchData, 2000);
    });
    return () => unsubscribe();
  }, [projectId, fetchData]);

  return (
    <div className="page-enter">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title gradient-text">Endpoints</h1>
          <p className="page-subtitle">Performance breakdown by API route — sorted by slowest first</p>
        </div>
      </div>

      <div className="filter-bar animate-in stagger-2">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>
          <Filter size={14} />
        </div>
        <select className="filter-select" value={range}
          onChange={(e) => { setRange(e.target.value); setLoading(true); }} id="filter-range">
          <option value="-1h">Last 1 hour</option>
          <option value="-6h">Last 6 hours</option>
          <option value="-24h">Last 24 hours</option>
          <option value="-7d">Last 7 days</option>
        </select>
      </div>

      <EndpointsTable endpoints={endpoints} loading={loading} />
    </div>
  );
}
