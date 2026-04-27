/**
 * StatsCard — Displays a single metric statistic.
 * 
 * Props:
 *   label    - "Total Requests"
 *   value    - "1,234"
 *   unit     - "ms" or "%" (optional)
 *   icon     - emoji
 *   color    - "purple" | "green" | "yellow" | "red"
 */
export default function StatsCard({ label, value, unit = '', icon, color = 'purple' }) {
  return (
    <div className="stat-card" id={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="stat-card-header">
        <span className="stat-card-label">{label}</span>
        <div className={`stat-card-icon ${color}`}>{icon}</div>
      </div>
      <div className="stat-card-value">
        {value}
        {unit && <span className="stat-card-unit">{unit}</span>}
      </div>
    </div>
  );
}
