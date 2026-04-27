'use client';

import { useState, useEffect, useCallback } from 'react';
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


  // Fetch data from API
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

  // Initial load + polling every 30 seconds
  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [projectId, fetchData]);

  // Socket.IO real-time updates
  useEffect(() => {
    if (!projectId) return;

    const unsubscribe = onMetricsUpdate((data) => {
      if (data.projectId !== projectId) return;

      // Update stats with real-time aggregates
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

      // Append to RPM chart (simplified — add a new data point)
      if (data.aggregates?.requests?.total > 0) {
        setRpmData((prev) => {
          const newPoint = {
            time: data.timestamp,
            value: data.aggregates.requests.total,
          };
          const updated = [...prev, newPoint];
          // Keep last 30 data points
          return updated.slice(-30);
        });
      }
    });

    return () => unsubscribe();
  }, [projectId]);

  // No project selected state
  if (!projectId) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Overview</h1>
          <p className="page-subtitle">Monitor your application health at a glance</p>
        </div>
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🏮</div>
            <div className="empty-state-title">No project selected</div>
            <div className="empty-state-text">
              Go to the <a href="/dashboard/projects" style={{ color: 'var(--accent-light)', fontWeight: 600 }}>Projects page</a> to create one and start monitoring.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Determine warnings
  const warnings = [];
  if (stats) {
    if (stats.errorRate > 5) {
      warnings.push({ type: 'error', message: `⚠️ High error rate: ${stats.errorRate}% of requests are failing` });
    }
    if (stats.avgResponseTime > 2000) {
      warnings.push({ type: 'warning', message: `⏱️ Slow responses: Average response time is ${stats.avgResponseTime}ms` });
    }
    if (stats.lastDataAt) {
      const lastDataTime = new Date(stats.lastDataAt).getTime();
      const now = Date.now();
      const minutesAgo = (now - lastDataTime) / (1000 * 60);
      if (minutesAgo > 2) {
        warnings.push({ type: 'error', message: `📡 No data received for ${Math.floor(minutesAgo)} minutes — your app may be down` });
      }
    }
  }

  // Uptime check
  const isLive = stats?.lastDataAt
    ? (Date.now() - new Date(stats.lastDataAt).getTime()) < 2 * 60 * 1000
    : false;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="page-subtitle">
            Monitor your application health at a glance
            {lastUpdate && (
              <span style={{ marginLeft: '12px', fontSize: '12px', color: '#5a5a72' }}>
                Last updated: {lastUpdate.toLocaleTimeString()}
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
        <div key={i} className={`warning-banner ${w.type}`}>
          {w.message}
        </div>
      ))}

      {/* Loading State */}
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="stats-grid">
            <StatsCard
              label="Total Requests"
              value={stats?.totalRequests?.toLocaleString() || '0'}
              icon="📊"
              color="purple"
            />
            <StatsCard
              label="Avg Response Time"
              value={stats?.avgResponseTime?.toFixed(1) || '0'}
              unit="ms"
              icon="⏱️"
              color={stats?.avgResponseTime > 1000 ? 'red' : stats?.avgResponseTime > 300 ? 'yellow' : 'green'}
            />
            <StatsCard
              label="Error Rate"
              value={stats?.errorRate?.toFixed(1) || '0'}
              unit="%"
              icon="🚨"
              color={stats?.errorRate > 5 ? 'red' : stats?.errorRate > 1 ? 'yellow' : 'green'}
            />
            <StatsCard
              label="Errors Today"
              value={stats?.errorCount?.toLocaleString() || '0'}
              icon="🐛"
              color={stats?.errorCount > 0 ? 'red' : 'green'}
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
