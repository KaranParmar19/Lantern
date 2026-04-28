'use client';

import { useState } from 'react';
import { FolderOpen, Plus, Trash2, Eye, EyeOff, Copy, Check, RefreshCw, Key } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createProject, deleteProject, regenerateProjectKey } from '@/lib/api';

export default function ProjectsPage() {
  const { projects, activeProject, switchProject, refreshProjects } = useAuth();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [showKey, setShowKey] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true); setError('');
    try {
      const newProject = await createProject(name.trim());
      await refreshProjects(); switchProject(newProject);
      setName(''); setShowKey(newProject._id);
    } catch (err) { setError(err.message); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteProject(id);
      const updated = await refreshProjects();
      if (activeProject?._id === id && updated.length > 0) switchProject(updated[0]);
    } catch (err) { console.error('Delete failed:', err); }
  };

  const handleRegenerate = async (id) => {
    try { await regenerateProjectKey(id); await refreshProjects(); setShowKey(id); }
    catch (err) { console.error('Regenerate failed:', err); }
  };

  const copyKey = (key, id) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id); setTimeout(() => setCopiedId(null), 2000);
  };

  const maskKey = (key) => key ? key.substring(0, 12) + '••••••••••••••••' : '';

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1 className="page-title gradient-text">Projects</h1>
        <p className="page-subtitle">Manage your monitored applications and API keys</p>
      </div>

      {/* Create Project Form */}
      <div className="card animate-in stagger-1" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={14} /> New Project
          </span>
        </div>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label className="input-label">Project Name</label>
            <input className="input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Express App" required />
          </div>
          <button type="submit" disabled={creating} className="btn-primary" style={{ padding: '10px 24px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={15} /> {creating ? 'Creating...' : 'Create Project'}
          </button>
        </form>
        {error && <div style={{ color: '#EF4444', fontSize: '13px', marginTop: '12px', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>{error}</div>}
      </div>

      {/* Projects List */}
      <div className="card animate-in stagger-3">
        <div className="card-header">
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderOpen size={14} /> Your Projects ({projects.length})
          </span>
        </div>

        {projects.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px' }}>
            <div style={{ background: 'rgba(139,92,246,0.08)', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <FolderOpen size={28} color="#A78BFA" strokeWidth={1.5} />
            </div>
            <div className="empty-state-title">No projects yet</div>
            <div className="empty-state-text">Create your first project above to start monitoring.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {projects.map((project, i) => {
              const isActive = activeProject?._id === project._id;
              const isKeyVisible = showKey === project._id;
              return (
                <div key={project._id} className={`project-card ${isActive ? 'active' : ''} animate-in`} style={{ animationDelay: `${i * 60}ms` }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: isActive ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FolderOpen size={20} color={isActive ? '#A78BFA' : 'var(--text-muted)'} />
                      </div>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{project.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Created {new Date(project.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {!isActive && (
                        <button onClick={() => switchProject(project)} className="btn-primary" style={{ padding: '6px 16px', fontSize: '12px' }}>Set Active</button>
                      )}
                      {isActive && (
                        <span style={{ padding: '6px 16px', background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success-border)', borderRadius: '8px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Check size={12} /> Active
                        </span>
                      )}
                      <button onClick={() => handleDelete(project._id)} className="btn-ghost" style={{ padding: '6px 10px' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* API Key */}
                  <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Key size={10} /> API Key
                      </div>
                      <code style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: isKeyVisible ? 'var(--accent-light)' : 'var(--text-secondary)', wordBreak: 'break-all' }}>
                        {isKeyVisible ? project.apiKey : maskKey(project.apiKey)}
                      </code>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button onClick={() => setShowKey(isKeyVisible ? null : project._id)} className="btn-ghost" style={{ padding: '6px 10px' }}>
                        {isKeyVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button onClick={() => copyKey(project.apiKey, project._id)} className="btn-ghost" style={{
                        padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px',
                        ...(copiedId === project._id ? { background: 'var(--success-bg)', borderColor: 'var(--success-border)', color: 'var(--success)' } : {}),
                      }}>
                        {copiedId === project._id ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                      </button>
                      <button onClick={() => handleRegenerate(project._id)} className="btn-ghost" style={{ padding: '6px 10px' }} title="Regenerate API Key">
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </div>

                  {/* SDK Snippet */}
                  {isKeyVisible && (
                    <div style={{ marginTop: '12px', padding: '12px 16px', background: 'rgba(139,92,246,0.06)', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.15)', animation: 'fadeInUp 0.3s ease-out' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>Quick Setup — add this to your app:</div>
                      <code style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--accent-light)', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
{`const lantern = require('@lantern-apm/sdk');
lantern.init({ apiKey: '${project.apiKey}' });`}
                      </code>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
