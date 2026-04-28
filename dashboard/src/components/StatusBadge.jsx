import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

/**
 * StatusBadge — Animated status indicator with Lucide icon.
 */
const CONFIG = {
  healthy: { label: 'Healthy', Icon: CheckCircle2 },
  warning: { label: 'Warning', Icon: AlertTriangle },
  critical: { label: 'Critical', Icon: XCircle },
};

export default function StatusBadge({ status }) {
  const { label, Icon } = CONFIG[status] || CONFIG.healthy;

  return (
    <span className={`status-badge ${status}`}>
      <Icon size={12} strokeWidth={2.5} />
      {label}
    </span>
  );
}
