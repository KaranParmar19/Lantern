/**
 * StatusBadge — Green/Yellow/Red status indicator with label.
 * 
 * Props:
 *   status - "healthy" | "warning" | "critical"
 */
export default function StatusBadge({ status }) {
  const labels = {
    healthy: 'Healthy',
    warning: 'Warning',
    critical: 'Critical',
  };

  return (
    <span className={`status-badge ${status}`}>
      <span className="status-badge-dot" />
      {labels[status] || status}
    </span>
  );
}
