'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  BarChart,
  Bar,
} from 'recharts';
import { getSystemMetrics } from '@/lib/api';
import { onMetricsUpdate } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';

/**
 * System Health Page — /dashboard/system
 */
export default function SystemPage() {
  const { activeProject } = useAuth();
  const projectId = activeProject?._id || '';

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('-24h');

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    try {
      const result = await getSystemMetrics(projectId, range);
      setData(result);
    } catch (err) {
      console.error('[Dashboard] Failed to fetch system metrics:', err);
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

  // Real-time updates
  useEffect(() => {
    if (!projectId) return;
    const unsubscribe = onMetricsUpdate((update) => {
      if (update.projectId !== projectId || !update.aggregates?.system) return;
      const sys = update.aggregates.system;
      setData((prev) => [...prev, {
        time: update.timestamp,
        memoryHeapUsed: sys.memory?.heapUsed || 0,
        memoryHeapTotal: sys.memory?.heapTotal || 0,
        memoryRss: sys.memory?.rss || 0,
        cpuUser: sys.cpu?.userPercent || 0,
        cpuSystem: sys.cpu?.systemPercent || 0,
      }].slice(-200));
    });
    return () => unsubscribe();
  }, [projectId]);

  const formatted = data.map((d) => ({
    ...d,
    time: new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    cpuTotal: parseFloat(((d.cpuUser || 0) + (d.cpuSystem || 0)).toFixed(2)),
  }));

  // Current values from latest data point
  const latest = data.length > 0 ? data[data.length - 1] : null;
  const currentMemory = latest ? latest.memoryHeapUsed : 0;
  const currentRss = latest ? latest.memoryRss : 0;
  const currentCpuUser = latest ? latest.cpuUser : 0;
  const currentCpuSystem = latest ? latest.cpuSystem : 0;
  const currentCpuTotal = currentCpuUser + currentCpuSystem;

  // Detect warnings
  const warnings = [];
  if (data.length > 0) {
    if (currentCpuTotal > 90) {
      warnings.push({ type: 'error', message: '🔥 CPU usage consistently above 90% — potential bottleneck' });
    }
    if (currentMemory > 500) {
      warnings.push({ type: 'error', message: '🧠 Memory usage exceeding 500MB — monitor for out-of-memory' });
    }
    if (data.length >= 10) {
      const last10 = data.slice(-10);
      const increasing = last10.every((d, i) => i === 0 || d.memoryHeapUsed >= last10[i - 1].memoryHeapUsed - 0.5);
      const delta = last10[last10.length - 1].memoryHeapUsed - last10[0].memoryHeapUsed;
      if (increasing && delta > 5) {
        warnings.push({ type: 'warning', message: '📈 Possible memory leak detected — heap usage steadily climbing' });
      }
    }
  }

  // CPU color based on usage level
  const cpuColor = currentCpuTotal > 80 ? '#EF4444' : currentCpuTotal > 50 ? '#F59E0B' : '#10B981';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">System Health</h1>
        <p className="page-subtitle">Memory and CPU usage from your instrumented application</p>
      </div>

      {/* Warnings */}
      {warnings.map((w, i) => (
        <div key={i} className={`warning-banner ${w.type}`}>{w.message}</div>
      ))}

      {/* Time range filter */}
      <div className="filter-bar">
        <select
          className="filter-select"
          value={range}
          onChange={(e) => { setRange(e.target.value); setLoading(true); }}
        >
          <option value="-1h">Last 1 hour</option>
          <option value="-6h">Last 6 hours</option>
          <option value="-24h">Last 24 hours</option>
          <option value="-7d">Last 7 days</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-container"><div className="loading-spinner" /></div>
      ) : formatted.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">💻</div>
            <div className="empty-state-title">No system data yet</div>
            <div className="empty-state-text">System metrics (memory, CPU) are captured every 30 seconds by the SDK.</div>
          </div>
        </div>
      ) : (
        <>
          {/* ── Live System Stats ─────────────────────────── */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-label">Heap Memory</span>
                <div className="stat-card-icon purple">🧠</div>
              </div>
              <div className="stat-card-value">
                {currentMemory.toFixed(1)}
                <span className="stat-card-unit">MB</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                of {latest?.memoryHeapTotal?.toFixed(1) || '—'} MB allocated
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-label">RSS Memory</span>
                <div className="stat-card-icon green">📦</div>
              </div>
              <div className="stat-card-value">
                {currentRss.toFixed(1)}
                <span className="stat-card-unit">MB</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                Total process memory
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-label">CPU Usage</span>
                <div className="stat-card-icon yellow">⚡</div>
              </div>
              <div className="stat-card-value" style={{ color: cpuColor }}>
                {currentCpuTotal.toFixed(2)}
                <span className="stat-card-unit">%</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                User: {currentCpuUser.toFixed(2)}% · System: {currentCpuSystem.toFixed(2)}%
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-label">Data Points</span>
                <div className="stat-card-icon purple">📊</div>
              </div>
              <div className="stat-card-value">
                {data.length}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                System snapshots collected
              </div>
            </div>
          </div>

          {/* ── Memory Chart (full width) ─────────────────── */}
          <div className="chart-container" style={{ marginBottom: '20px' }} id="chart-memory">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <span className="chart-title" style={{ marginBottom: 0 }}>Memory Usage Over Time</span>
              <span className="live-indicator"><span className="live-dot" />Live</span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={formatted} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="rssGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" tick={{ fill: '#5a5a72', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fill: '#5a5a72', fontSize: 11 }} tickLine={false} axisLine={false} unit=" MB" />
                <Tooltip
                  contentStyle={{ background: '#111119', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', fontSize: '13px' }}
                  labelStyle={{ color: '#f0f0f5', fontWeight: 600 }}
                  formatter={(value) => [`${parseFloat(value).toFixed(1)} MB`]}
                />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#8b8ba3', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="memoryHeapUsed" name="Heap Used" stroke="#8B5CF6" strokeWidth={2.5} fill="url(#memGradient)" dot={false} />
                <Area type="monotone" dataKey="memoryRss" name="RSS" stroke="#06B6D4" strokeWidth={1.5} fill="url(#rssGradient)" dot={false} strokeDasharray="6 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* ── CPU Chart (full width, bar chart for clarity) ── */}
          <div className="chart-container" id="chart-cpu">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <span className="chart-title" style={{ marginBottom: 0 }}>CPU Usage Over Time</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  fontFamily: "'SF Mono', 'Fira Code', monospace",
                  color: cpuColor,
                  background: currentCpuTotal > 80 ? 'rgba(239,68,68,0.1)' : currentCpuTotal > 50 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                  padding: '4px 12px',
                  borderRadius: '100px',
                  border: `1px solid ${currentCpuTotal > 80 ? 'rgba(239,68,68,0.3)' : currentCpuTotal > 50 ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
                }}>
                  Current: {currentCpuTotal.toFixed(2)}%
                </span>
                <span className="live-indicator"><span className="live-dot" />Live</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={formatted} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="cpuUserBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.4} />
                  </linearGradient>
                  <linearGradient id="cpuSysBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" tick={{ fill: '#5a5a72', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="rgba(255,255,255,0.2)"
                  tick={{ fill: '#5a5a72', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  unit="%"
                  domain={[0, (dataMax) => Math.max(dataMax * 1.5, 2)]}
                />
                <Tooltip
                  contentStyle={{ background: '#111119', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', fontSize: '13px' }}
                  labelStyle={{ color: '#f0f0f5', fontWeight: 600 }}
                  formatter={(value, name) => [`${parseFloat(value).toFixed(3)}%`, name]}
                />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#8b8ba3', paddingTop: '8px' }} />
                <ReferenceLine y={90} stroke="#EF4444" strokeDasharray="4 4" strokeWidth={1} label={{ value: '90% threshold', fill: '#EF4444', fontSize: 10, position: 'right' }} />
                <Bar dataKey="cpuUser" name="User CPU" fill="url(#cpuUserBarGrad)" stackId="cpu" radius={[2, 2, 0, 0]} />
                <Bar dataKey="cpuSystem" name="System CPU" fill="url(#cpuSysBarGrad)" stackId="cpu" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
