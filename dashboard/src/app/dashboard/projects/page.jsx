'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createProject, deleteProject, regenerateProjectKey } from '@/lib/api';

/**
 * Projects Page — /dashboard/projects
 * 
 * Create new projects, view API keys, switch active project.
 */
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
    setCreating(true);
    setError('');
    try {
      const newProject = await createProject(name.trim());
      await refreshProjects();
      switchProject(newProject);
      setName('');
      setShowKey(newProject._id); // Show the API key for the new project
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteProject(id);
      const updated = await refreshProjects();
      if (activeProject?._id === id && updated.length > 0) {
        switchProject(updated[0]);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleRegenerate = async (id) => {
    try {
      await regenerateProjectKey(id);
      await refreshProjects();
      setShowKey(id);
    } catch (err) {
      console.error('Regenerate failed:', err);
    }
  };

  const copyKey = (key, id) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const maskKey = (key) => key ? key.substring(0, 12) + '••••••••••••••••' : '';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Projects</h1>
        <p className="page-subtitle">Manage your monitored applications and API keys</p>
      </div>

      {/* Create Project Form */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <span className="card-title">New Project</span>
        </div>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Express App"
              required
              style={{
                width: '100%', padding: '10px 14px', background: 'var(--bg-secondary)',
                border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)',
                fontSize: '14px', outline: 'none',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            style={{
              padding: '10px 24px', background: 'var(--accent-gradient)', color: '#fff',
              border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
              cursor: creating ? 'wait' : 'pointer', opacity: creating ? 0.6 : 1, whiteSpace: 'nowrap',
            }}
          >
            {creating ? 'Creating...' : '+ Create Project'}
          </button>
        </form>
        {error && (
          <div style={{ color: '#EF4444', fontSize: '13px', marginTop: '12px', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>
            {error}
          </div>
        )}
      </div>

      {/* Projects List */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Your Projects ({projects.length})</span>
        </div>

        {projects.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px' }}>
            <div className="empty-state-icon">📁</div>
            <div className="empty-state-title">No projects yet</div>
            <div className="empty-state-text">Create your first project above to start monitoring.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {projects.map((project) => {
              const isActive = activeProject?._id === project._id;
              const isKeyVisible = showKey === project._id;

              return (
                <div
                  key={project._id}
                  style={{
                    padding: '20px',
                    borderRadius: '12px',
                    border: `2px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                    background: isActive ? 'var(--accent-glow)' : 'var(--bg-glass)',
                    transition: 'all 0.2s',
                  }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '24px' }}>📁</span>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {project.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Created {new Date(project.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {!isActive && (
                        <button
                          onClick={() => switchProject(project)}
                          style={{
                            padding: '6px 16px', background: 'var(--accent-gradient)', color: '#fff',
                            border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Set Active
                        </button>
                      )}
                      {isActive && (
                        <span style={{
                          padding: '6px 16px', background: 'var(--success-bg)', color: 'var(--success)',
                          border: '1px solid var(--success-border)', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                        }}>
                          ✓ Active
                        </span>
                      )}
                      <button
                        onClick={() => handleDelete(project._id)}
                        style={{
                          padding: '6px 12px', background: 'none', border: '1px solid var(--border)',
                          borderRadius: '8px', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer',
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>

                  {/* API Key */}
                  <div style={{
                    padding: '12px 16px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        API Key
                      </div>
                      <code style={{
                        fontSize: '13px', fontFamily: "'SF Mono', 'Fira Code', monospace",
                        color: isKeyVisible ? 'var(--accent-light)' : 'var(--text-secondary)',
                        wordBreak: 'break-all',
                      }}>
                        {isKeyVisible ? project.apiKey : maskKey(project.apiKey)}
                      </code>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button
                        onClick={() => setShowKey(isKeyVisible ? null : project._id)}
                        style={{
                          padding: '6px 10px', background: 'none', border: '1px solid var(--border)',
                          borderRadius: '6px', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer',
                        }}
                      >
                        {isKeyVisible ? '🙈' : '👁'}
                      </button>
                      <button
                        onClick={() => copyKey(project.apiKey, project._id)}
                        style={{
                          padding: '6px 10px', background: copiedId === project._id ? 'var(--success-bg)' : 'none',
                          border: `1px solid ${copiedId === project._id ? 'var(--success-border)' : 'var(--border)'}`,
                          borderRadius: '6px', color: copiedId === project._id ? 'var(--success)' : 'var(--text-muted)',
                          fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s',
                        }}
                      >
                        {copiedId === project._id ? '✓ Copied' : '📋 Copy'}
                      </button>
                      <button
                        onClick={() => handleRegenerate(project._id)}
                        style={{
                          padding: '6px 10px', background: 'none', border: '1px solid var(--border)',
                          borderRadius: '6px', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer',
                        }}
                        title="Regenerate API Key"
                      >
                        🔄
                      </button>
                    </div>
                  </div>

                  {/* SDK Snippet */}
                  {isKeyVisible && (
                    <div style={{
                      marginTop: '12px', padding: '12px 16px', background: 'rgba(139,92,246,0.06)',
                      borderRadius: '8px', border: '1px solid rgba(139,92,246,0.15)',
                    }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        Quick Setup — add this to your app:
                      </div>
                      <code style={{
                        display: 'block', fontSize: '12px', fontFamily: "'SF Mono', 'Fira Code', monospace",
                        color: 'var(--accent-light)', whiteSpace: 'pre-wrap', lineHeight: '1.6',
                      }}>
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
