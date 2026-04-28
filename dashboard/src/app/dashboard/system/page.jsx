'use client';

import { useState, useEffect, useCallback } from 'react';
import { Cpu, HardDrive, Activity, Database, Filter } from 'lucide-react';
import AnimatedNumber from '@/components/AnimatedNumber';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, BarChart, Bar,
} from 'recharts';
import { getSystemMetrics } from '@/lib/api';
import { onMetricsUpdate } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';

export default function SystemPage() {
  const { activeProject } = useAuth();
  const projectId = activeProject?._id || '';
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('-24h');

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    try { setData(await getSystemMetrics(projectId, range)); }
    catch (err) { console.error('[Dashboard] Failed to fetch system metrics:', err); }
    finally { setLoading(false); }
  }, [projectId, range]);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [projectId, fetchData]);

  useEffect(() => {
    if (!projectId) return;
    const unsubscribe = onMetricsUpdate((update) => {
      if (update.projectId !== projectId || !update.aggregates?.system) return;
      const sys = update.aggregates.system;
      setData((prev) => [...prev, {
        time: update.timestamp,
        memoryHeapUsed: sys.memory?.heapUsed || 0, memoryHeapTotal: sys.memory?.heapTotal || 0,
        memoryRss: sys.memory?.rss || 0, cpuUser: sys.cpu?.userPercent || 0, cpuSystem: sys.cpu?.systemPercent || 0,
      }].slice(-200));
    });
    return () => unsubscribe();
  }, [projectId]);

  const formatted = data.map((d) => ({
    ...d,
    time: new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    cpuTotal: parseFloat(((d.cpuUser || 0) + (d.cpuSystem || 0)).toFixed(2)),
  }));

  const latest = data.length > 0 ? data[data.length - 1] : null;
  const currentMemory = latest?.memoryHeapUsed || 0;
  const currentRss = latest?.memoryRss || 0;
  const currentCpuUser = latest?.cpuUser || 0;
  const currentCpuSystem = latest?.cpuSystem || 0;
  const currentCpuTotal = currentCpuUser + currentCpuSystem;

  const warnings = [];
  if (data.length > 0) {
    if (currentCpuTotal > 90) warnings.push({ type: 'error', message: 'CPU usage consistently above 90% — potential bottleneck' });
    if (currentMemory > 500) warnings.push({ type: 'error', message: 'Memory usage exceeding 500MB — monitor for out-of-memory' });
    if (data.length >= 10) {
      const last10 = data.slice(-10);
      const increasing = last10.every((d, i) => i === 0 || d.memoryHeapUsed >= last10[i - 1].memoryHeapUsed - 0.5);
      if (increasing && last10[last10.length - 1].memoryHeapUsed - last10[0].memoryHeapUsed > 5)
        warnings.push({ type: 'warning', message: 'Possible memory leak detected — heap usage steadily climbing' });
    }
  }

  const cpuColor = currentCpuTotal > 80 ? '#EF4444' : currentCpuTotal > 50 ? '#F59E0B' : '#10B981';
  const tooltipStyle = { background: 'rgba(18,18,30,0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', fontSize: '13px' };

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1 className="page-title gradient-text">System Health</h1>
        <p className="page-subtitle">Memory and CPU usage from your instrumented application</p>
      </div>

      {warnings.map((w, i) => (
        <div key={i} className={`warning-banner ${w.type}`}>{w.message}</div>
      ))}

      <div className="filter-bar animate-in stagger-2">
        <Filter size={14} color="var(--text-muted)" />
        <select className="filter-select" value={range}
          onChange={(e) => { setRange(e.target.value); setLoading(true); }}>
          <option value="-1h">Last 1 hour</option>
          <option value="-6h">Last 6 hours</option>
          <option value="-24h">Last 24 hours</option>
          <option value="-7d">Last 7 days</option>
        </select>
      </div>

      {loading ? (
        <div>
          <div className="stats-grid">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton skeleton-card" style={{ animationDelay: `${i * 100}ms` }} />)}
          </div>
          <div className="skeleton skeleton-chart" style={{ marginBottom: '20px' }} />
          <div className="skeleton skeleton-chart" />
        </div>
      ) : formatted.length === 0 ? (
        <div className="card animate-in">
          <div className="empty-state">
            <div style={{ background: 'rgba(6,182,212,0.08)', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Cpu size={28} color="#22D3EE" strokeWidth={1.5} />
            </div>
            <div className="empty-state-title">No system data yet</div>
            <div className="empty-state-text">System metrics (memory, CPU) are captured every 30 seconds by the SDK.</div>
          </div>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <StatsCardInline icon={Cpu} label="Heap Memory" value={currentMemory} unit="MB" decimals={1} color="purple" stagger={1}
              subtitle={`of ${latest?.memoryHeapTotal?.toFixed(1) || '—'} MB allocated`} />
            <StatsCardInline icon={HardDrive} label="RSS Memory" value={currentRss} unit="MB" decimals={1} color="cyan" stagger={2}
              subtitle="Total process memory" />
            <StatsCardInline icon={Activity} label="CPU Usage" value={currentCpuTotal} unit="%" decimals={2}
              color={currentCpuTotal > 80 ? 'red' : currentCpuTotal > 50 ? 'yellow' : 'green'} stagger={3}
              subtitle={`User: ${currentCpuUser.toFixed(2)}% · System: ${currentCpuSystem.toFixed(2)}%`} />
            <StatsCardInline icon={Database} label="Data Points" value={data.length} color="purple" stagger={4}
              subtitle="System snapshots collected" />
          </div>

          {/* Memory Chart */}
          <div className="chart-container animate-in stagger-5" style={{ marginBottom: '20px' }} id="chart-memory">
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
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#f0f0f5', fontWeight: 600 }} formatter={(v) => [`${parseFloat(v).toFixed(1)} MB`]} />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#8b8ba3', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="memoryHeapUsed" name="Heap Used" stroke="#8B5CF6" strokeWidth={2.5} fill="url(#memGradient)" dot={false} />
                <Area type="monotone" dataKey="memoryRss" name="RSS" stroke="#06B6D4" strokeWidth={1.5} fill="url(#rssGradient)" dot={false} strokeDasharray="6 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* CPU Chart */}
          <div className="chart-container animate-in stagger-6" id="chart-cpu">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <span className="chart-title" style={{ marginBottom: 0 }}>CPU Usage Over Time</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{
                  fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: cpuColor,
                  background: currentCpuTotal > 80 ? 'rgba(239,68,68,0.1)' : currentCpuTotal > 50 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                  padding: '4px 12px', borderRadius: '100px',
                  border: `1px solid ${currentCpuTotal > 80 ? 'rgba(239,68,68,0.3)' : currentCpuTotal > 50 ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
                }}>
                  Current: <AnimatedNumber value={currentCpuTotal} decimals={2} />%
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
                <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fill: '#5a5a72', fontSize: 11 }} tickLine={false} axisLine={false} unit="%" domain={[0, (max) => Math.max(max * 1.5, 2)]} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#f0f0f5', fontWeight: 600 }} formatter={(v, name) => [`${parseFloat(v).toFixed(3)}%`, name]} />
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

/** Inline stat card for system page — uses AnimatedNumber directly */
function StatsCardInline({ icon: Icon, label, value, unit = '', decimals = 0, color, stagger = 1, subtitle }) {
  return (
    <div className={`stat-card accent-${color} animate-in stagger-${stagger}`}>
      <div className="stat-card-header">
        <span className="stat-card-label">{label}</span>
        <div className={`stat-card-icon-wrap ${color}`}><Icon size={19} strokeWidth={2} /></div>
      </div>
      <div className="stat-card-value">
        <AnimatedNumber value={value} decimals={decimals} />
        {unit && <span className="stat-card-unit">{unit}</span>}
      </div>
      {subtitle && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>{subtitle}</div>}
    </div>
  );
}
