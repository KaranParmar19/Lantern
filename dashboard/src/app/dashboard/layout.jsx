'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { getSocket, joinProject, leaveProject } from '@/lib/socket';

/**
 * Dashboard Layout — Wraps all /dashboard/* pages.
 * Provides the sidebar + main content area.
 * Redirects to /login if not authenticated.
 * Manages Socket.IO connection and project room.
 */
export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { isAuthenticated, loading, activeProject } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  // Auth guard — redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  // Socket.IO connection management
  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();
    setIsConnected(socket.connected);

    // Use named handlers so we can remove only these specific listeners on cleanup
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [isAuthenticated]);

  // Join/leave project room when active project changes
  useEffect(() => {
    if (!activeProject?._id) return;

    joinProject(activeProject._id);
    // Also set legacy localStorage key for backwards compat
    localStorage.setItem('lantern_projectId', activeProject._id);

    return () => {
      leaveProject(activeProject._id);
    };
  }, [activeProject?._id]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  // Don't render dashboard if not authenticated (redirect will happen)
  if (!isAuthenticated) return null;

  return (
    <div className="app-layout">
      <Sidebar isConnected={isConnected} />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
