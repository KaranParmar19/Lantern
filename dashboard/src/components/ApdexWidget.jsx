'use client';

import { Activity } from 'lucide-react';

/**
 * ApdexWidget — Application Performance Index
 * 
 * Renders the Apdex score as a gauge-style card with breakdown bars.
 * Score range: 0 (terrible) → 1 (perfect).
 * 
 * Thresholds (T = target response time):
 *   Satisfied  : ≤ T        (200ms default)
 *   Tolerating : T–4T       (200ms–800ms)
 *   Frustrated : > 4T       (> 800ms)
 * 
 * Props:
 *   data - { score, rating, total, satisfied, tolerating, frustrated, targetMs }
 *   loading - boolean
 */
export default function ApdexWidget({ data, loading = false }) {
  const ratingColors = {
    Excellent:    { bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.25)', text: '#10B981', bar: '#10B981' },
    Good:         { bg: 'rgba(34,211,238,0.10)', border: 'rgba(34,211,238,0.25)', text: '#22D3EE', bar: '#22D3EE' },
    Fair:         { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)', text: '#F59E0B', bar: '#F59E0B' },
    Poor:         { bg: 'rgba(251,146,60,0.10)', border: 'rgba(251,146,60,0.25)', text: '#FB923C', bar: '#FB923C' },
    Unacceptable: { bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)',  text: '#EF4444', bar: '#EF4444' },
    'No data':    { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.06)', text: '#52526e', bar: '#52526e' },
    Error:        { bg: 'rgba(239,68,68,0.05)',  border: 'rgba(239,68,68,0.15)',  text: '#52526e', bar: '#52526e' },
  };

  const rating = data?.rating || 'No data';
  const colors = ratingColors[rating] || ratingColors['No data'];
  const score = data?.score;
  const total = data?.total || 0;
  const satisfied = data?.satisfied || 0;
  const tolerating = data?.tolerating || 0;
  const frustrated = data?.frustrated || 0;

  const satisfiedPct  = total > 0 ? Math.round((satisfied / total) * 100) : 0;
  const toleratingPct = total > 0 ? Math.round((tolerating / total) * 100) : 0;
  const frustratedPct = total > 0 ? Math.max(0, 100 - satisfiedPct - toleratingPct) : 0;

  // Arc position for the gauge needle: maps 0–1 → 0°–180°
  const gaugeAngle = score != null ? Math.round(score * 180) : 0;

  if (loading) {
    return <div className="skeleton skeleton-card" style={{ height: '200px', borderRadius: 'var(--radius-lg)' }} />;
  }

  return (
    <div
      className="stat-card animate-in stagger-5"
      id="stat-apdex-score"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        gridColumn: 'span 2',
        display: 'flex',
        gap: '32px',
        alignItems: 'center',
        padding: '24px 28px',
      }}
    >
      {/* Left: Gauge + Score */}
      <div style={{ flexShrink: 0, textAlign: 'center', minWidth: '140px' }}>
        {/* SVG Arc Gauge */}
        <div style={{ position: 'relative', width: '140px', height: '76px', margin: '0 auto 12px' }}>
          <svg viewBox="0 0 140 76" style={{ width: '140px', height: '76px', overflow: 'visible' }}>
            {/* Background arc */}
            <path
              d="M 10 70 A 60 60 0 0 1 130 70"
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Score arc */}
            {score != null && score > 0 && (
              <path
                d="M 10 70 A 60 60 0 0 1 130 70"
                fill="none"
                stroke={colors.bar}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${score * 188.5} 188.5`}
                style={{ filter: `drop-shadow(0 0 6px ${colors.bar}60)`, transition: 'stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)' }}
              />
            )}
            {/* Needle */}
            {score != null && (
              <g transform={`rotate(${gaugeAngle - 90}, 70, 70)`}>
                <line x1="70" y1="70" x2="70" y2="16" stroke={colors.bar} strokeWidth="2" strokeLinecap="round" />
                <circle cx="70" cy="70" r="4" fill={colors.bar} />
              </g>
            )}
            {/* Tick marks */}
            {[0, 0.5, 0.85, 0.94, 1].map((v, i) => {
              const angle = (v * 180 - 90) * (Math.PI / 180);
              const x1 = 70 + 52 * Math.cos(angle);
              const y1 = 70 + 52 * Math.sin(angle);
              const x2 = 70 + 60 * Math.cos(angle);
              const y2 = 70 + 60 * Math.sin(angle);
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />;
            })}
          </svg>
          {/* Score text over the gauge */}
          <div style={{
            position: 'absolute', bottom: '-4px', left: 0, right: 0,
            textAlign: 'center',
          }}>
            <span style={{
              fontSize: '28px', fontWeight: 800, letterSpacing: '-1px',
              color: score != null ? colors.text : '#52526e',
              fontFeatureSettings: "'tnum'",
            }}>
              {score != null ? score.toFixed(2) : '—'}
            </span>
          </div>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '4px 14px', borderRadius: '100px',
          background: colors.bg, border: `1px solid ${colors.border}`,
          fontSize: '12px', fontWeight: 700, color: colors.text,
          letterSpacing: '0.3px',
        }}>
          <Activity size={12} strokeWidth={2.5} />
          {rating}
        </div>
      </div>

      {/* Right: Details */}
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>
            APDEX Score
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Application Performance Index
            <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
              T = {data?.targetMs || 200}ms
            </span>
          </div>
        </div>

        {/* Breakdown stacked bar */}
        {total > 0 && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', height: '8px', gap: '2px' }}>
              <div style={{ flex: satisfiedPct, background: '#10B981', minWidth: satisfiedPct > 0 ? '4px' : '0', transition: 'flex 0.6s ease', borderRadius: '3px' }} />
              <div style={{ flex: toleratingPct, background: '#F59E0B', minWidth: toleratingPct > 0 ? '4px' : '0', transition: 'flex 0.6s ease', borderRadius: '3px' }} />
              <div style={{ flex: frustratedPct, background: '#EF4444', minWidth: frustratedPct > 0 ? '4px' : '0', transition: 'flex 0.6s ease', borderRadius: '3px' }} />
            </div>
          </div>
        )}

        {/* Breakdown rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[
            { label: 'Satisfied', count: satisfied, pct: satisfiedPct, color: '#10B981', desc: `≤ ${data?.targetMs || 200}ms` },
            { label: 'Tolerating', count: tolerating, pct: toleratingPct, color: '#F59E0B', desc: `≤ ${(data?.targetMs || 200) * 4}ms` },
            { label: 'Frustrated', count: frustrated, pct: frustratedPct, color: '#EF4444', desc: `> ${(data?.targetMs || 200) * 4}ms` },
          ].map(({ label, count, pct, color, desc }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', width: '72px' }}>{label}</span>
              <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono', color: 'var(--text-primary)', width: '40px' }}>{pct}%</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{count.toLocaleString()} reqs</span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
