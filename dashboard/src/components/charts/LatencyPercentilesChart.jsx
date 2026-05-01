'use client';

import { Timer } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

/**
 * LatencyPercentilesChart
 * 
 * SRE-grade replacement for the simple Average Response Time chart.
 * Shows avg, p95, and p99 as separate lines so tail latencies are visible.
 * 
 * Props:
 *   data - array of { time, avg, p95, p99 }
 */
export default function LatencyPercentilesChart({ data = [] }) {
  const formatted = data
    .filter((d) => d.avg != null || d.p95 != null || d.p99 != null)
    .map((d) => ({
      ...d,
      time: new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avg: d.avg != null ? parseFloat(d.avg) : null,
      p95: d.p95 != null ? parseFloat(d.p95) : null,
      p99: d.p99 != null ? parseFloat(d.p99) : null,
    }));

  if (formatted.length === 0) {
    return (
      <div className="chart-container animate-in stagger-6">
        <div className="chart-title">Latency Percentiles (p95 / p99)</div>
        <div className="empty-state" style={{ padding: '40px 20px' }}>
          <div style={{
            background: 'rgba(6,182,212,0.08)', width: '56px', height: '56px',
            borderRadius: '14px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 12px',
          }}>
            <Timer size={24} color="#22D3EE" strokeWidth={1.5} />
          </div>
          <div className="empty-state-text">No latency data yet.</div>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div style={{
        background: 'rgba(18,18,30,0.97)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.6)', padding: '12px 16px',
        fontSize: '12px', fontFamily: 'Inter',
      }}>
        <div style={{ color: '#eeeef4', fontWeight: 600, marginBottom: '8px' }}>{label}</div>
        {payload.map((entry) => (
          entry.value != null && (
            <div key={entry.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '4px' }}>
              <span style={{ color: entry.color, fontWeight: 500 }}>{entry.name}</span>
              <span style={{ color: '#eeeef4', fontFamily: 'JetBrains Mono' }}>{entry.value} ms</span>
            </div>
          )
        ))}
      </div>
    );
  };

  return (
    <div className="chart-container animate-in stagger-6" id="chart-latency-percentiles">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <span className="chart-title" style={{ marginBottom: 0 }}>Latency Percentiles</span>
        <span className="live-indicator">
          <span className="live-dot" />Live
        </span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={formatted} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
          <XAxis
            dataKey="time"
            stroke="transparent"
            tick={{ fill: '#52526e', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="transparent"
            tick={{ fill: '#52526e', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={false}
            unit="ms"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '11px', fontFamily: 'Inter', paddingTop: '12px' }}
            formatter={(value) => <span style={{ color: '#8888a4' }}>{value}</span>}
          />
          {/* Avg — dimmer cyan */}
          <Line
            type="monotone"
            dataKey="avg"
            name="Avg"
            stroke="#06B6D4"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            dot={false}
            activeDot={{ r: 4, stroke: '#06B6D4', fill: '#0c0c14' }}
            connectNulls
            isAnimationActive={false}
          />
          {/* p95 — amber warning */}
          <Line
            type="monotone"
            dataKey="p95"
            name="p95"
            stroke="#F59E0B"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, stroke: '#F59E0B', fill: '#0c0c14' }}
            connectNulls
            isAnimationActive={false}
          />
          {/* p99 — red critical */}
          <Line
            type="monotone"
            dataKey="p99"
            name="p99"
            stroke="#EF4444"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, stroke: '#EF4444', fill: '#0c0c14' }}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div style={{
        display: 'flex', gap: '16px', marginTop: '12px', padding: '8px 0',
        borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: '11px', color: '#52526e',
      }}>
        <span style={{ color: '#06B6D4' }}>- - Avg</span>
        <span style={{ color: '#F59E0B' }}>━ p95 <span style={{ color: '#52526e' }}>(95% of users faster than this)</span></span>
        <span style={{ color: '#EF4444' }}>━ p99 <span style={{ color: '#52526e' }}>(99% of users faster than this)</span></span>
      </div>
    </div>
  );
}
