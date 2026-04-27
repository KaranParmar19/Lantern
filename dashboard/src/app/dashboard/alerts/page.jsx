'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  getAlertHistory,
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

/**
 * Alerts Configuration Page — /dashboard/alerts
 */

const ALERT_TYPES = [
  { value: 'error_rate', label: 'Error Rate', unit: '%', icon: '🚨', placeholder: '5', description: 'Alert when error rate exceeds this percentage' },
  { value: 'slow_endpoint', label: 'Slow Endpoint', unit: 'ms', icon: '🐢', placeholder: '2000', description: 'Alert when any endpoint is slower than this' },
  { value: 'app_down', label: 'App Down', unit: 'min', icon: '📡', placeholder: '2', description: 'Alert when no data is received for this many minutes' },
  { value: 'memory', label: 'High Memory', unit: 'MB', icon: '🧠', placeholder: '500', description: 'Alert when heap memory exceeds this amount' },
];

export default function AlertsPage() {
  const { activeProject } = useAuth();
  const projectId = activeProject?._id || '';

  const [rules, setRules] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');

  // Form state
  const [formType, setFormType] = useState('error_rate');
  const [formThreshold, setFormThreshold] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCooldown, setFormCooldown] = useState('15');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    try {
      const [rulesData, historyData] = await Promise.all([
        getAlertRules(projectId),
        getAlertHistory(projectId, 30),
      ]);
      setRules(rulesData);
      setHistory(historyData);
    } catch (err) {
      console.error('[Dashboard] Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [projectId, fetchData]);

  // Create new rule
  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formThreshold || isNaN(Number(formThreshold))) {
      setFormError('Please enter a valid threshold number.');
      return;
    }
    if (!formEmail || !formEmail.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      await createAlertRule(projectId, {
        type: formType,
        threshold: Number(formThreshold),
        email: formEmail,
        cooldownMinutes: Number(formCooldown) || 15,
      });
      setShowForm(false);
      setFormThreshold('');
      setFormEmail('');
      setFormCooldown('15');
      await fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle rule enabled/disabled
  const handleToggle = async (rule) => {
    try {
      await updateAlertRule(projectId, rule._id, { enabled: !rule.enabled });
      await fetchData();
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  };

  // Delete rule
  const handleDelete = async (ruleId) => {
    try {
      await deleteAlertRule(projectId, ruleId);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  const getTypeInfo = (type) => ALERT_TYPES.find((t) => t.value === type) || ALERT_TYPES[0];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Alerts</h1>
          <p className="page-subtitle">Configure alert rules to get notified when thresholds are breached</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: showForm ? 'rgba(239, 68, 68, 0.15)' : 'var(--accent-gradient)',
            color: showForm ? '#EF4444' : '#fff',
            border: showForm ? '1px solid rgba(239, 68, 68, 0.3)' : 'none',
            padding: '10px 20px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {showForm ? '✕ Cancel' : '+ New Alert Rule'}
        </button>
      </div>

      {/* ── Create Rule Form ─────────────────────────── */}
      {showForm && (
        <div className="card" style={{ marginBottom: '24px', animation: 'slideDown 0.3s ease-out' }}>
          <div className="card-header">
            <span className="card-title">Create Alert Rule</span>
          </div>
          <form onSubmit={handleCreate}>
            {/* Alert Type Selection */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
              {ALERT_TYPES.map((t) => (
                <div
                  key={t.value}
                  onClick={() => setFormType(t.value)}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    border: formType === t.value ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: formType === t.value ? 'var(--accent-glow)' : 'var(--bg-glass)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>{t.icon}</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: formType === t.value ? 'var(--accent-light)' : 'var(--text-primary)' }}>{t.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{t.description}</div>
                </div>
              ))}
            </div>

            {/* Input Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Threshold ({getTypeInfo(formType).unit})
                </label>
                <input
                  type="number"
                  value={formThreshold}
                  onChange={(e) => setFormThreshold(e.target.value)}
                  placeholder={getTypeInfo(formType).placeholder}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="alerts@example.com"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Cooldown (minutes)
                </label>
                <input
                  type="number"
                  value={formCooldown}
                  onChange={(e) => setFormCooldown(e.target.value)}
                  placeholder="15"
                  min="1"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {formError && (
              <div style={{ color: '#EF4444', fontSize: '13px', marginBottom: '16px', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                background: 'var(--accent-gradient)',
                color: '#fff',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: submitting ? 'wait' : 'pointer',
                opacity: submitting ? 0.6 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              {submitting ? 'Creating...' : 'Create Alert Rule'}
            </button>
          </form>
        </div>
      )}

      {/* ── Active Rules ─────────────────────────────── */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <span className="card-title">Active Rules ({rules.length})</span>
        </div>

        {loading ? (
          <div className="loading-container"><div className="loading-spinner" /></div>
        ) : rules.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px' }}>
            <div className="empty-state-icon">🔔</div>
            <div className="empty-state-title">No alert rules yet</div>
            <div className="empty-state-text">Create your first alert rule to get notified when something goes wrong.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {rules.map((rule) => {
              const typeInfo = getTypeInfo(rule.type);
              const isRecentlyTriggered = rule.lastTriggeredAt && (Date.now() - new Date(rule.lastTriggeredAt).getTime()) < 60 * 60 * 1000;

              return (
                <div
                  key={rule._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    borderRadius: '10px',
                    border: `1px solid ${isRecentlyTriggered ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                    background: isRecentlyTriggered ? 'rgba(239,68,68,0.05)' : 'var(--bg-glass)',
                    opacity: rule.enabled ? 1 : 0.5,
                    transition: 'all 0.2s',
                  }}
                >
                  {/* Icon */}
                  <div style={{ fontSize: '28px', width: '40px', textAlign: 'center' }}>
                    {typeInfo.icon}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {typeInfo.label}
                      {isRecentlyTriggered && (
                        <span style={{ marginLeft: '8px', fontSize: '11px', color: '#EF4444', fontWeight: 700, textTransform: 'uppercase' }}>
                          🔴 Triggered
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Threshold: <span style={{ fontWeight: 600, fontFamily: "'SF Mono', monospace", color: 'var(--accent-light)' }}>{rule.threshold}{typeInfo.unit}</span>
                      {' · '}Email: <span style={{ fontWeight: 500 }}>{rule.email}</span>
                      {' · '}Cooldown: {rule.cooldownMinutes}min
                    </div>
                    {rule.lastTriggeredAt && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Last triggered: {new Date(rule.lastTriggeredAt).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(rule)}
                    title={rule.enabled ? 'Disable' : 'Enable'}
                    style={{
                      width: '48px',
                      height: '26px',
                      borderRadius: '13px',
                      border: 'none',
                      background: rule.enabled ? 'var(--success)' : 'rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 0.2s',
                    }}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#fff',
                      position: 'absolute',
                      top: '3px',
                      left: rule.enabled ? '25px' : '3px',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(rule._id)}
                    title="Delete rule"
                    style={{
                      background: 'none',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      fontSize: '14px',
                      transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => { e.target.style.borderColor = 'rgba(239,68,68,0.5)'; e.target.style.color = '#EF4444'; }}
                    onMouseOut={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-muted)'; }}
                  >
                    🗑
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Alert History ─────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Alert History</span>
        </div>

        {history.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px' }}>
            <div className="empty-state-icon">📜</div>
            <div className="empty-state-title">No alerts triggered yet</div>
            <div className="empty-state-text">When an alert fires, it will appear here with full details.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Message</th>
                  <th>Value</th>
                  <th>Threshold</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => {
                  const typeInfo = getTypeInfo(h.type);
                  return (
                    <tr key={h._id}>
                      <td className="muted" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {new Date(h.triggeredAt).toLocaleString([], {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
                        })}
                      </td>
                      <td>
                        <span style={{ fontSize: '13px' }}>{typeInfo.icon} {typeInfo.label}</span>
                      </td>
                      <td style={{ fontSize: '13px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#EF4444' }}>
                        {h.message}
                      </td>
                      <td style={{ fontFamily: "'SF Mono', monospace", fontSize: '13px', fontWeight: 600, color: '#EF4444' }}>
                        {h.actualValue}{typeInfo.unit}
                      </td>
                      <td style={{ fontFamily: "'SF Mono', monospace", fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {h.threshold}{typeInfo.unit}
                      </td>
                      <td>
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '100px',
                          background: h.emailSent ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                          color: h.emailSent ? '#10B981' : '#F59E0B',
                          border: `1px solid ${h.emailSent ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                          fontWeight: 600,
                        }}>
                          {h.emailSent ? '✓ Sent' : 'Console'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
