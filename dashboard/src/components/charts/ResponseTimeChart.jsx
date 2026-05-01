'use client';

import { Timer } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export default function ResponseTimeChart({ data = [] }) {
  const formatted = data
    .filter((d) => d.value != null)
    .map((d) => ({
      ...d,
      time: new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      value: parseFloat(d.value),
    }));

  if (formatted.length === 0) {
    return (
      <div className="chart-container animate-in stagger-6">
        <div className="chart-title">Avg Response Time</div>
        <div className="empty-state" style={{ padding: '40px 20px' }}>
          <div style={{ background: 'rgba(6,182,212,0.08)', width: '56px', height: '56px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Timer size={24} color="#22D3EE" strokeWidth={1.5} />
          </div>
          <div className="empty-state-text">No response time data yet.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container animate-in stagger-6" id="chart-response-time">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <span className="chart-title" style={{ marginBottom: 0 }}>Avg Response Time</span>
        <span className="live-indicator">
          <span className="live-dot" />Live
        </span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={formatted} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
          <defs>
            <linearGradient id="rtGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.3} />
              <stop offset="40%" stopColor="#06B6D4" stopOpacity={0.1} />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
          <XAxis dataKey="time" stroke="transparent" tick={{ fill: '#52526e', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
          <YAxis stroke="transparent" tick={{ fill: '#52526e', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} unit="ms" />
          <Tooltip
            contentStyle={{ background: 'rgba(18,18,30,0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', boxShadow: '0 12px 40px rgba(0,0,0,0.6)', fontSize: '12px', fontFamily: 'Inter' }}
            labelStyle={{ color: '#eeeef4', fontWeight: 600, marginBottom: '4px' }}
            itemStyle={{ color: '#8888a4' }}
            formatter={(value) => [`${value} ms`, 'Avg Response Time']}
          />
          <Area type="monotone" dataKey="value" name="Response Time" stroke="#06B6D4" strokeWidth={2.5} fill="url(#rtGradient)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#06B6D4', fill: '#0c0c14' }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
