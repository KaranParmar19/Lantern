'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, getProjects } from '@/lib/api';

/**
 * AuthContext — Provides authentication state across the dashboard.
 * 
 * Stores: user, token, projects, activeProject
 * Persists: token + activeProjectId in localStorage
 * Auto-validates: calls /api/auth/me on mount to verify token
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('lantern_token');
    if (savedToken) {
      setToken(savedToken);
      validateSession(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  // Validate token and load user data
  // Retries once after 3s in case the collector just restarted.
  const validateSession = async (t, isRetry = false) => {
    try {
      localStorage.setItem('lantern_token', t);
      const userData = await getMe();
      setUser(userData);
      setToken(t);

      // Load projects
      const projectsData = await getProjects();
      setProjects(projectsData);

      // Restore active project
      const savedProjectId = localStorage.getItem('lantern_activeProjectId');
      if (savedProjectId) {
        const found = projectsData.find((p) => p._id === savedProjectId);
        if (found) setActiveProject(found);
        else if (projectsData.length > 0) setActiveProject(projectsData[0]);
      } else if (projectsData.length > 0) {
        setActiveProject(projectsData[0]);
      }
    } catch (err) {
      // ── Network error: collector is temporarily down ──
      // DO NOT clear the token — the user is still valid.
      // Retry once after 3 seconds (covers collector restart window).
      if (err.isNetworkError) {
        console.warn('[Auth] Collector unreachable during session check.', isRetry ? 'Giving up.' : 'Retrying in 3s...');
        if (!isRetry) {
          setTimeout(() => validateSession(t, true), 3000);
          return; // Don't call setLoading(false) yet — retry will do it
        }
        // After retry also failed: stay logged-in with token but no user data yet.
        // The UI will show a loading state; user is NOT logged out.
        setToken(t);
        console.error('[Auth] Collector still unreachable after retry. Dashboard may show stale state.');
      } else {
        // ── Auth error: token is invalid / expired → log out ──
        console.error('[Auth] Session invalid:', err.message);
        localStorage.removeItem('lantern_token');
        localStorage.removeItem('lantern_user');
        setUser(null);
        setToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // Login — store token and user
  const login = useCallback((tokenValue, userData) => {
    localStorage.setItem('lantern_token', tokenValue);
    localStorage.setItem('lantern_user', JSON.stringify(userData));
    setToken(tokenValue);
    setUser(userData);
    // Load projects after login
    getProjects().then((data) => {
      setProjects(data);
      if (data.length > 0) {
        setActiveProject(data[0]);
        localStorage.setItem('lantern_activeProjectId', data[0]._id);
      }
    }).catch(console.error);
  }, []);

  // Logout — clear everything
  const logout = useCallback(() => {
    localStorage.removeItem('lantern_token');
    localStorage.removeItem('lantern_user');
    localStorage.removeItem('lantern_activeProjectId');
    setToken(null);
    setUser(null);
    setProjects([]);
    setActiveProject(null);
  }, []);

  // Switch active project
  const switchProject = useCallback((project) => {
    setActiveProject(project);
    localStorage.setItem('lantern_activeProjectId', project._id);
    // Also update legacy key for backwards compat
    localStorage.setItem('lantern_projectId', project._id);
  }, []);

  // Refresh projects list
  const refreshProjects = useCallback(async () => {
    try {
      const data = await getProjects();
      setProjects(data);
      return data;
    } catch (err) {
      console.error('[Auth] Failed to refresh projects:', err);
      return [];
    }
  }, []);

  const value = {
    user,
    token,
    projects,
    activeProject,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    switchProject,
    refreshProjects,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
