'use client';

import { useState, useEffect, useCallback } from 'react';
import { Radio } from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import ApdexWidget from '@/components/ApdexWidget';
import RPMChart from '@/components/charts/RPMChart';
import LatencyPercentilesChart from '@/components/charts/LatencyPercentilesChart';
import ErrorBoundary from '@/components/ErrorBoundary';
import { getOverviewStats, getRPMData, getLatencyPercentiles, getApdexScore } from '@/lib/api';
import { onMetricsUpdate } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';

/**
 * Overview Page — /dashboard
 * 
 * SRE upgrades:
 *   - p95 / p99 latency stat cards (replace misleading avg-only view)
 *   - Apdex score widget
 *   - Latency percentiles chart (avg + p95 + p99 multi-line)
 */
export default function OverviewPage() {
  const { activeProject } = useAuth();
  const projectId = activeProject?._id || '';

  const [stats, setStats] = useState(null);
  const [apdex, setApdex] = useState(null);
  const [rpmData, setRpmData] = useState([]);
  const [latencyData, setLatencyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    try {
      const [overviewData, rpmResult, latencyResult, apdexResult] = await Promise.all([
        getOverviewStats(projectId, '-24h'),
        getRPMData(projectId, '-30m'),
        getLatencyPercentiles(projectId, '-30m'),
        getApdexScore(projectId, '-24h', 200),
      ]);
      setStats(overviewData);
      setRpmData(rpmResult);
      setLatencyData(latencyResult);
      setApdex(apdexResult);
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

  // Real-time Socket.IO updates
  useEffect(() => {
    if (!projectId) return;
    const unsubscribe = onMetricsUpdate((data) => {
      if (data.projectId !== projectId) return;
      const agg = data.aggregates?.requests;
      if (!agg) return;

      setStats((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          totalRequests: prev.totalRequests + (agg.total || 0),
          avgResponseTime: agg.avgResponseTime || prev.avgResponseTime,
          errorRate: agg.errorRate ?? prev.errorRate,
          errorCount: prev.errorCount + (agg.errorCount || 0),
          lastDataAt: data.timestamp,
        };
      });

      setLastUpdate(new Date());

      // Update Apdex from real-time data if available
      if (agg.apdex) {
        setApdex((prev) => prev ? {
          ...prev,
          score: agg.apdex.score,
          rating: agg.apdex.rating,
        } : agg.apdex);
      }

      // Append to RPM chart
      if (agg.total > 0) {
        setRpmData((prev) => {
          const newPoint = { time: data.timestamp, value: agg.total };
          return [...prev, newPoint].slice(-100); // Cap at 100 points (~8min at 5s intervals)
        });
      }

      // Append to latency chart
      if (agg.avgResponseTime != null) {
        setLatencyData((prev) => {
          const newPoint = {
            time: data.timestamp,
            avg: agg.avgResponseTime,
            p95: agg.p95ResponseTime ?? null,
            p99: agg.p99ResponseTime ?? null,
          };
          return [...prev, newPoint].slice(-100); // Cap at 100 points

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
    if (stats.avgResponseTime > 2000) warnings.push({ type: 'warning', message: `Slow responses: Avg response time is ${stats.avgResponseTime}ms` });
    if (stats.lastDataAt) {
      const minutesAgo = (Date.now() - new Date(stats.lastDataAt).getTime()) / (1000 * 60);
      if (minutesAgo > 2) warnings.push({ type: 'error', message: `No data received for ${Math.floor(minutesAgo)} minutes — your app may be down` });
    }
  }
  if (apdex?.score != null && apdex.score < 0.70) {
    warnings.push({ type: 'warning', message: `Low Apdex score: ${apdex.score.toFixed(2)} (${apdex.rating}) — users are experiencing slow responses` });
  }

  const isLive = stats?.lastDataAt
    ? (Date.now() - new Date(stats.lastDataAt).getTime()) < 2 * 60 * 1000
    : false;

  const p95 = latencyData.length > 0
    ? latencyData[latencyData.length - 1]?.p95
    : null;
  const p99 = latencyData.length > 0
    ? latencyData[latencyData.length - 1]?.p99
    : null;

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
          {/* Apdex skeleton */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', marginBottom: '28px' }}>
            <div className="skeleton skeleton-card" style={{ height: '200px', gridColumn: 'span 2' }} />
          </div>
          <div className="charts-grid">
            <div className="skeleton skeleton-chart" />
            <div className="skeleton skeleton-chart" style={{ animationDelay: '150ms' }} />
          </div>
        </div>
      ) : (
        <>
          {/* ── Row 1: Primary Stat Cards ── */}
          <div className="stats-grid">
            <StatsCard
              label="Total Requests"
              value={stats?.totalRequests || 0}
              color="purple"
              stagger={1}
            />
            <StatsCard
              label="Avg Response Time"
              value={stats?.avgResponseTime || 0}
              unit="ms"
              decimals={1}
              color={stats?.avgResponseTime > 1000 ? 'red' : stats?.avgResponseTime > 300 ? 'yellow' : 'green'}
              stagger={2}
              subtitle="All-time average"
            />
            <StatsCard
              label="Error Rate"
              value={stats?.errorRate || 0}
              unit="%"
              decimals={1}
              color={stats?.errorRate > 5 ? 'red' : stats?.errorRate > 1 ? 'yellow' : 'green'}
              stagger={3}
            />
            <StatsCard
              label="Errors Today"
              value={stats?.errorCount || 0}
              color={stats?.errorCount > 0 ? 'red' : 'green'}
              stagger={4}
            />
          </div>

          {/* ── Row 2: SRE Latency Percentile Cards + Apdex ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '28px',
          }}>
            <StatsCard
              label="p95 Latency"
              value={p95 ?? 0}
              unit="ms"
              decimals={1}
              color={p95 > 1000 ? 'red' : p95 > 500 ? 'yellow' : 'cyan'}
              stagger={1}
              subtitle="95th percentile"
            />
            <StatsCard
              label="p99 Latency"
              value={p99 ?? 0}
              unit="ms"
              decimals={1}
              color={p99 > 2000 ? 'red' : p99 > 800 ? 'yellow' : 'cyan'}
              stagger={2}
              subtitle="99th percentile"
            />
            <ApdexWidget data={apdex} loading={false} />
          </div>

          {/* ── Row 3: Charts ── */}
          <div className="charts-grid">
            <ErrorBoundary label="RPM Chart">
              <RPMChart data={rpmData} />
            </ErrorBoundary>
            <ErrorBoundary label="Latency Chart">
              <LatencyPercentilesChart data={latencyData} />
            </ErrorBoundary>
          </div>
        </>
      )}
    </div>
  );
}
