'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

/**
 * RPMChart — Requests Per Minute line chart.
 * Shows request volume over the last 30 minutes.
 * 
 * Props:
 *   data - Array of { time: string, value: number }
 */
export default function RPMChart({ data = [] }) {
  const formatted = data.map((d) => ({
    ...d,
    time: new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }));

  if (formatted.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-title">Requests Per Minute</div>
        <div className="empty-state" style={{ padding: '40px 20px' }}>
          <div className="empty-state-icon">📈</div>
          <div className="empty-state-text">No request data yet. Generate some traffic!</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container" id="chart-rpm">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <span className="chart-title" style={{ marginBottom: 0 }}>Requests Per Minute</span>
        <span className="live-indicator">
          <span className="live-dot" />
          Live
        </span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={formatted} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="rpmGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="time"
            stroke="rgba(255,255,255,0.2)"
            tick={{ fill: '#5a5a72', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="rgba(255,255,255,0.2)"
            tick={{ fill: '#5a5a72', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: '#111119',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              fontSize: '13px',
            }}
            labelStyle={{ color: '#f0f0f5', fontWeight: 600 }}
            itemStyle={{ color: '#8b8ba3' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            name="Requests"
            stroke="#8B5CF6"
            strokeWidth={2}
            fill="url(#rpmGradient)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: '#8B5CF6', fill: '#111119' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
