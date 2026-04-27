/**
 * Lantern Dashboard — Socket.IO Client
 * 
 * Singleton Socket.IO client that connects to the collector
 * for real-time metric updates.
 * 
 * Usage:
 *   import { getSocket, joinProject, onMetricsUpdate } from '@/lib/socket';
 */

import { io } from 'socket.io-client';

const COLLECTOR_URL = process.env.NEXT_PUBLIC_COLLECTOR_URL || 'http://localhost:4000';

let socket = null;

/**
 * Get or create the Socket.IO client instance.
 * Lazily connects on first call.
 */
export function getSocket() {
  if (!socket) {
    socket = io(COLLECTOR_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[Lantern Dashboard] Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Lantern Dashboard] Socket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('[Lantern Dashboard] Socket error:', err.message);
    });
  }

  return socket;
}

/**
 * Join a project room to receive its metric updates.
 * @param {string} projectId
 */
export function joinProject(projectId) {
  const s = getSocket();
  s.emit('join:project', projectId);
  console.log(`[Lantern Dashboard] Joined project room: ${projectId}`);
}

/**
 * Leave a project room.
 * @param {string} projectId
 */
export function leaveProject(projectId) {
  const s = getSocket();
  s.emit('leave:project', projectId);
}

/**
 * Listen for real-time metric updates.
 * @param {Function} callback - Called with { projectId, aggregates, requestMetrics, systemMetrics, timestamp }
 * @returns {Function} Unsubscribe function
 */
export function onMetricsUpdate(callback) {
  const s = getSocket();
  s.on('metrics:update', callback);
  return () => s.off('metrics:update', callback);
}
