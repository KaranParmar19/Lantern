'use client';

import { useState, useEffect, useCallback } from 'react';
import { Radio } from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import RPMChart from '@/components/charts/RPMChart';
import ResponseTimeChart from '@/components/charts/ResponseTimeChart';
import { getOverviewStats, getRPMData, getResponseTimeData } from '@/lib/api';
import { onMetricsUpdate } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';

/**
 * Overview Page — /dashboard
 */
export default function OverviewPage() {
  const { activeProject } = useAuth();
  const projectId = activeProject?._id || '';

  const [stats, setStats] = useState(null);
  const [rpmData, setRpmData] = useState([]);
  const [rtData, setRtData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    try {
      const [overviewData, rpmResult, rtResult] = await Promise.all([
        getOverviewStats(projectId, '-24h'),
        getRPMData(projectId, '-30m'),
        getResponseTimeData(projectId, '-30m'),
      ]);
      setStats(overviewData);
      setRpmData(rpmResult);
      setRtData(rtResult);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('[Dashboard] Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [projectId, fetchData]);

  useEffect(() => {
    if (!projectId) return;
    const unsubscribe = onMetricsUpdate((data) => {
      if (data.projectId !== projectId) return;
      setStats((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          totalRequests: prev.totalRequests + (data.aggregates?.requests?.total || 0),
          avgResponseTime: data.aggregates?.requests?.avgResponseTime || prev.avgResponseTime,
          errorRate: data.aggregates?.requests?.errorRate || prev.errorRate,
          errorCount: prev.errorCount + (data.aggregates?.requests?.errorCount || 0),
          lastDataAt: data.timestamp,
        };
      });
      setLastUpdate(new Date());
      if (data.aggregates?.requests?.total > 0) {
        setRpmData((prev) => {
          const newPoint = { time: data.timestamp, value: data.aggregates.requests.total };
          return [...prev, newPoint].slice(-30);
        });
      }
    });
    return () => unsubscribe();
  }, [projectId]);

  // Relative time display
  const getRelativeTime = (date) => {
    if (!date) return '';
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs < 5) return 'just now';
    if (secs < 60) return `${secs}s ago`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    return date.toLocaleTimeString();
  };

  if (!projectId) {
    return (
      <div className="page-enter">
        <div className="page-header">
          <h1 className="page-title gradient-text">Overview</h1>
          <p className="page-subtitle">Monitor your application health at a glance</p>
        </div>
        <div className="card">
          <div className="empty-state">
            <div style={{ background: 'rgba(139,92,246,0.08)', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Radio size={28} color="#A78BFA" strokeWidth={1.5} />
            </div>
            <div className="empty-state-title">No project selected</div>
            <div className="empty-state-text">
              Go to the <a href="/dashboard/projects" style={{ color: 'var(--accent-light)', fontWeight: 600 }}>Projects page</a> to create one and start monitoring.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const warnings = [];
  if (stats) {
    if (stats.errorRate > 5) warnings.push({ type: 'error', message: `High error rate: ${stats.errorRate}% of requests are failing` });
    if (stats.avgResponseTime > 2000) warnings.push({ type: 'warning', message: `Slow responses: Average response time is ${stats.avgResponseTime}ms` });
    if (stats.lastDataAt) {
      const minutesAgo = (Date.now() - new Date(stats.lastDataAt).getTime()) / (1000 * 60);
      if (minutesAgo > 2) warnings.push({ type: 'error', message: `No data received for ${Math.floor(minutesAgo)} minutes — your app may be down` });
    }
  }

  const isLive = stats?.lastDataAt
    ? (Date.now() - new Date(stats.lastDataAt).getTime()) < 2 * 60 * 1000
    : false;

  return (
    <div className="page-enter">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title gradient-text">Overview</h1>
          <p className="page-subtitle">
            Monitor your application health at a glance
            {lastUpdate && (
              <span style={{ marginLeft: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                Updated {getRelativeTime(lastUpdate)}
              </span>
            )}
          </p>
        </div>
        <div className={`uptime-badge ${isLive ? 'live' : 'down'}`}>
          {isLive ? (
            <><span className="live-dot" /> LIVE</>
          ) : (
            <><span className="status-dot offline" /> DOWN</>
          )}
        </div>
      </div>

      {/* Warning Banners */}
      {warnings.map((w, i) => (
        <div key={i} className={`warning-banner ${w.type}`} style={{ animationDelay: `${i * 100}ms` }}>
          {w.message}
        </div>
      ))}

      {/* Loading State */}
      {loading ? (
        <div>
          <div className="stats-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton skeleton-card" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
          <div className="charts-grid">
            <div className="skeleton skeleton-chart" />
            <div className="skeleton skeleton-chart" style={{ animationDelay: '150ms' }} />
          </div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="stats-grid">
            <StatsCard label="Total Requests" value={stats?.totalRequests || 0} color="purple" stagger={1} />
            <StatsCard
              label="Avg Response Time" value={stats?.avgResponseTime || 0} unit="ms" decimals={1}
              color={stats?.avgResponseTime > 1000 ? 'red' : stats?.avgResponseTime > 300 ? 'yellow' : 'green'} stagger={2}
            />
            <StatsCard
              label="Error Rate" value={stats?.errorRate || 0} unit="%" decimals={1}
              color={stats?.errorRate > 5 ? 'red' : stats?.errorRate > 1 ? 'yellow' : 'green'} stagger={3}
            />
            <StatsCard
              label="Errors Today" value={stats?.errorCount || 0}
              color={stats?.errorCount > 0 ? 'red' : 'green'} stagger={4}
            />
          </div>

          {/* Charts */}
          <div className="charts-grid">
            <RPMChart data={rpmData} />
            <ResponseTimeChart data={rtData} />
          </div>
        </>
      )}
    </div>
  );
}
