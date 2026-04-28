'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, AlertTriangle, Cpu, Radio, Gauge, Plus, X, Trash2, History } from 'lucide-react';
import { getAlertRules, createAlertRule, updateAlertRule, deleteAlertRule, getAlertHistory } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const ALERT_TYPES = [
  { value: 'error_rate', label: 'Error Rate', unit: '%', Icon: AlertTriangle, placeholder: '5', description: 'Alert when error rate exceeds this percentage', color: '#EF4444' },
  { value: 'slow_endpoint', label: 'Slow Endpoint', unit: 'ms', Icon: Gauge, placeholder: '2000', description: 'Alert when any endpoint is slower than this', color: '#F59E0B' },
  { value: 'app_down', label: 'App Down', unit: 'min', Icon: Radio, placeholder: '2', description: 'Alert when no data is received for this many minutes', color: '#06B6D4' },
  { value: 'memory', label: 'High Memory', unit: 'MB', Icon: Cpu, placeholder: '500', description: 'Alert when heap memory exceeds this amount', color: '#8B5CF6' },
];

export default function AlertsPage() {
  const { activeProject } = useAuth();
  const projectId = activeProject?._id || '';
  const [rules, setRules] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [formType, setFormType] = useState('error_rate');
  const [formThreshold, setFormThreshold] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCooldown, setFormCooldown] = useState('15');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    try {
      const [r, h] = await Promise.all([getAlertRules(projectId), getAlertHistory(projectId, 30)]);
      setRules(r); setHistory(h);
    } catch (err) { console.error('[Dashboard] Failed to fetch alerts:', err); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [projectId, fetchData]);

  const handleCreate = async (e) => {
    e.preventDefault(); setFormError('');
    if (!formThreshold || isNaN(Number(formThreshold))) { setFormError('Please enter a valid threshold number.'); return; }
    if (!formEmail || !formEmail.includes('@')) { setFormError('Please enter a valid email address.'); return; }
    setSubmitting(true);
    try {
      await createAlertRule(projectId, { type: formType, threshold: Number(formThreshold), email: formEmail, cooldownMinutes: Number(formCooldown) || 15 });
      setShowForm(false); setFormThreshold(''); setFormEmail(''); setFormCooldown('15'); await fetchData();
    } catch (err) { setFormError(err.message); }
    finally { setSubmitting(false); }
  };

  const handleToggle = async (rule) => {
    try { await updateAlertRule(projectId, rule._id, { enabled: !rule.enabled }); await fetchData(); }
    catch (err) { console.error('Failed to toggle rule:', err); }
  };

  const handleDelete = async (ruleId) => {
    try { await deleteAlertRule(projectId, ruleId); await fetchData(); }
    catch (err) { console.error('Failed to delete rule:', err); }
  };

  const getTypeInfo = (type) => ALERT_TYPES.find((t) => t.value === type) || ALERT_TYPES[0];

  return (
    <div className="page-enter">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title gradient-text">Alerts</h1>
          <p className="page-subtitle">Configure alert rules to get notified when thresholds are breached</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className={showForm ? 'btn-ghost' : 'btn-primary'}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', ...(showForm ? { color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)' } : {}) }}>
          {showForm ? <><X size={15} /> Cancel</> : <><Plus size={15} /> New Alert Rule</>}
        </button>
      </div>

      {/* Create Rule Form */}
      {showForm && (
        <div className="card animate-in-scale" style={{ marginBottom: '24px' }}>
          <div className="card-header"><span className="card-title">Create Alert Rule</span></div>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
              {ALERT_TYPES.map((t) => {
                const TypeIcon = t.Icon;
                return (
                  <div key={t.value} onClick={() => setFormType(t.value)}
                    className="feature-card" style={{
                      padding: '14px', textAlign: 'center', cursor: 'pointer',
                      borderColor: formType === t.value ? 'var(--accent)' : undefined,
                      background: formType === t.value ? 'var(--accent-glow)' : 'var(--bg-glass)',
                      '--card-accent': `${t.color}40`,
                    }}>
                    <div style={{ marginBottom: '6px' }}><TypeIcon size={22} color={formType === t.value ? t.color : 'var(--text-muted)'} /></div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: formType === t.value ? 'var(--accent-light)' : 'var(--text-primary)' }}>{t.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{t.description}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label className="input-label">Threshold ({getTypeInfo(formType).unit})</label>
                <input className="input" type="number" value={formThreshold} onChange={(e) => setFormThreshold(e.target.value)}
                  placeholder={getTypeInfo(formType).placeholder} required style={{ fontFamily: 'var(--font-mono)' }} />
              </div>
              <div>
                <label className="input-label">Email Address</label>
                <input className="input" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="alerts@example.com" required />
              </div>
              <div>
                <label className="input-label">Cooldown (minutes)</label>
                <input className="input" type="number" value={formCooldown} onChange={(e) => setFormCooldown(e.target.value)} placeholder="15" min="1"
                  style={{ fontFamily: 'var(--font-mono)' }} />
              </div>
            </div>
            {formError && <div style={{ color: '#EF4444', fontSize: '13px', marginBottom: '16px', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>{formError}</div>}
            <button type="submit" disabled={submitting} className="btn-primary" style={{ padding: '10px 24px' }}>
              {submitting ? 'Creating...' : 'Create Alert Rule'}
            </button>
          </form>
        </div>
      )}

      {/* Active Rules */}
      <div className="card animate-in stagger-2" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={14} /> Active Rules ({rules.length})
          </span>
        </div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: '72px', borderRadius: '10px', animationDelay: `${i * 100}ms` }} />)}
          </div>
        ) : rules.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px' }}>
            <div style={{ background: 'rgba(139,92,246,0.08)', width: '56px', height: '56px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Bell size={24} color="#A78BFA" strokeWidth={1.5} />
            </div>
            <div className="empty-state-title">No alert rules yet</div>
            <div className="empty-state-text">Create your first alert rule to get notified when something goes wrong.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {rules.map((rule, i) => {
              const typeInfo = getTypeInfo(rule.type);
              const TypeIcon = typeInfo.Icon;
              const recent = rule.lastTriggeredAt && (Date.now() - new Date(rule.lastTriggeredAt).getTime()) < 3600000;
              return (
                <div key={rule._id} className="animate-in" style={{
                  animationDelay: `${i * 60}ms`, display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '10px',
                  border: `1px solid ${recent ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                  background: recent ? 'rgba(239,68,68,0.05)' : 'var(--bg-glass)',
                  opacity: rule.enabled ? 1 : 0.5, transition: 'all 0.3s',
                }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${typeInfo.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TypeIcon size={20} color={typeInfo.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {typeInfo.label}
                      {recent && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#EF4444', fontWeight: 700 }}>TRIGGERED</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Threshold: <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--accent-light)' }}>{rule.threshold}{typeInfo.unit}</span>
                      {' · '}Email: <span style={{ fontWeight: 500 }}>{rule.email}</span>
                      {' · '}Cooldown: {rule.cooldownMinutes}min
                    </div>
                    {rule.lastTriggeredAt && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Last triggered: {new Date(rule.lastTriggeredAt).toLocaleString()}</div>}
                  </div>
                  <button onClick={() => handleToggle(rule)} className={`toggle-switch ${rule.enabled ? 'on' : 'off'}`} title={rule.enabled ? 'Disable' : 'Enable'}>
                    <div className="toggle-knob" />
                  </button>
                  <button onClick={() => handleDelete(rule._id)} title="Delete rule" className="btn-ghost" style={{ padding: '6px 8px' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Alert History */}
      <div className="card animate-in stagger-4">
        <div className="card-header">
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={14} /> Alert History
          </span>
        </div>
        {history.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px' }}>
            <div style={{ background: 'rgba(139,92,246,0.08)', width: '56px', height: '56px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <History size={24} color="#A78BFA" strokeWidth={1.5} />
            </div>
            <div className="empty-state-title">No alerts triggered yet</div>
            <div className="empty-state-text">When an alert fires, it will appear here with full details.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Time</th><th>Type</th><th>Message</th><th>Value</th><th>Threshold</th><th>Email</th></tr></thead>
              <tbody>
                {history.map((h, i) => {
                  const typeInfo = getTypeInfo(h.type);
                  const TypeIcon = typeInfo.Icon;
                  return (
                    <tr key={h._id} className="animate-in" style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
                      <td className="muted" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {new Date(h.triggeredAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td><span style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}><TypeIcon size={14} color={typeInfo.color} /> {typeInfo.label}</span></td>
                      <td style={{ fontSize: '13px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#EF4444' }}>{h.message}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: '#EF4444' }}>{h.actualValue}{typeInfo.unit}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-secondary)' }}>{h.threshold}{typeInfo.unit}</td>
                      <td>
                        <span style={{
                          fontSize: '11px', padding: '2px 8px', borderRadius: '100px', fontWeight: 600,
                          background: h.emailSent ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                          color: h.emailSent ? '#10B981' : '#F59E0B',
                          border: `1px solid ${h.emailSent ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                        }}>{h.emailSent ? '✓ Sent' : 'Console'}</span>
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
