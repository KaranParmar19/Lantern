'use client';

import AnimatedNumber from './AnimatedNumber';
import { BarChart3, Clock, AlertTriangle, Bug, Cpu, HardDrive, Database, Activity } from 'lucide-react';

const ICON_MAP = {
  'total-requests': BarChart3,
  'avg-response-time': Clock,
  'error-rate': AlertTriangle,
  'errors-today': Bug,
  'heap-memory': Cpu,
  'rss-memory': HardDrive,
  'cpu-usage': Activity,
  'data-points': Database,
};

/**
 * StatsCard — Animated metric card with Lucide icon, counting number, and accent gradient bar.
 *
 * Props:
 *   label    - "Total Requests"
 *   value    - number
 *   unit     - "ms" or "%" (optional)
 *   icon     - key from ICON_MAP or Lucide component
 *   color    - "purple" | "green" | "yellow" | "red" | "cyan"
 *   decimals - decimal precision (default 0)
 *   stagger  - stagger class number (1-8)
 *   subtitle - optional subtitle text
 */
export default function StatsCard({
  label, value, unit = '', icon, color = 'purple',
  decimals = 0, stagger = 1, subtitle,
}) {
  const iconKey = label.toLowerCase().replace(/\s+/g, '-');
  const IconComponent = typeof icon === 'function' ? icon : (ICON_MAP[iconKey] || BarChart3);
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, '')) || 0;

  return (
    <div
      className={`stat-card accent-${color} animate-in stagger-${stagger}`}
      id={`stat-${iconKey}`}
    >
      <div className="stat-card-header">
        <span className="stat-card-label">{label}</span>
        <div className={`stat-card-icon-wrap ${color}`}>
          <IconComponent size={19} strokeWidth={2} />
        </div>
      </div>
      <div className="stat-card-value">
        <AnimatedNumber value={numericValue} decimals={decimals} />
        {unit && <span className="stat-card-unit">{unit}</span>}
      </div>
      {subtitle && (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
