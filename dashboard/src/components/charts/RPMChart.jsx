'use client';

import { Radio } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export default function RPMChart({ data = [] }) {
  const formatted = data.map((d) => ({
    ...d,
    time: new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }));

  if (formatted.length === 0) {
    return (
      <div className="chart-container animate-in stagger-5">
        <div className="chart-title">Requests Per Minute</div>
        <div className="empty-state" style={{ padding: '40px 20px' }}>
          <div style={{ background: 'rgba(139,92,246,0.08)', width: '56px', height: '56px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Radio size={24} color="#A78BFA" strokeWidth={1.5} />
          </div>
          <div className="empty-state-text">No request data yet. Generate some traffic!</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container animate-in stagger-5" id="chart-rpm">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <span className="chart-title" style={{ marginBottom: 0 }}>Requests Per Minute</span>
        <span className="live-indicator">
          <span className="live-dot" />Live
        </span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={formatted} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
          <defs>
            <linearGradient id="rpmGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
              <stop offset="40%" stopColor="#8B5CF6" stopOpacity={0.1} />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
          <XAxis dataKey="time" stroke="transparent" tick={{ fill: '#52526e', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
          <YAxis stroke="transparent" tick={{ fill: '#52526e', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: 'rgba(18,18,30,0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', boxShadow: '0 12px 40px rgba(0,0,0,0.6)', fontSize: '12px', fontFamily: 'Inter' }}
            labelStyle={{ color: '#eeeef4', fontWeight: 600, marginBottom: '4px' }}
            itemStyle={{ color: '#8888a4' }}
          />
          <Area type="monotone" dataKey="value" name="Requests" stroke="#8B5CF6" strokeWidth={2.5} fill="url(#rpmGradient)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#8B5CF6', fill: '#0c0c14' }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
