'use strict';

require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server: SocketIOServer } = require('socket.io');
const { startMetricsWorker } = require('./workers/metricsWorker');
const { redisConfig } = require('./services/queue');
const ingestRoutes = require('./routes/ingest');
const metricsRoutes = require('./routes/metrics');
const alertsRoutes = require('./routes/alerts');
const authRoutes = require('./routes/auth');
const projectsRoutes = require('./routes/projects');

// ─── Configuration ─────────────────────────────────────────
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lantern';

// ─── Express App ───────────────────────────────────────────
const app = express();

// Parse JSON bodies (needed for /ingest route)
app.use(express.json({ limit: '5mb' }));

// CORS — allow dashboard to connect (port 3000)
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  credentials: true,
}));

// ─── Routes ────────────────────────────────────────────────
app.use('/', ingestRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectsRoutes);

// Root route — quick info
app.get('/', (_req, res) => {
  res.json({
    service: 'Lantern APM Collector',
    version: '1.0.0',
    endpoints: {
      'POST /ingest': 'Receive metrics from SDK',
      'GET /health': 'Health check',
    },
  });
});

// ─── HTTP Server (needed for Socket.IO) ────────────────────
const server = http.createServer(app);

// ─── Socket.IO ─────────────────────────────────────────────
const io = new SocketIOServer(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    methods: ['GET', 'POST'],
  },
});

// Handle Socket.IO connections
io.on('connection', (socket) => {
  console.log(`[Lantern] 🔌 Socket connected: ${socket.id}`);

  // Clients join a room for their project to receive updates
  socket.on('join:project', (projectId) => {
    socket.join(`project:${projectId}`);
    console.log(`[Lantern] 📡 Socket ${socket.id} joined room "project:${projectId}"`);
  });

  socket.on('leave:project', (projectId) => {
    socket.leave(`project:${projectId}`);
    console.log(`[Lantern] 📡 Socket ${socket.id} left room "project:${projectId}"`);
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Lantern] 🔌 Socket disconnected: ${socket.id} (${reason})`);
  });
});

// ─── Start Everything ──────────────────────────────────────
async function start() {
  try {
    // 1. Connect to MongoDB
    console.log('[Lantern] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log(`[Lantern] ✅ MongoDB connected (${MONGODB_URI})`);

    // 2. Start BullMQ worker (pass Socket.IO instance for broadcasting)
    startMetricsWorker(io, {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      maxRetriesPerRequest: null,
    });

    // 3. Start HTTP server
    server.listen(PORT, () => {
      console.log('\n' + '═'.repeat(60));
      console.log('  🏮 Lantern APM — Collector Server');
      console.log('═'.repeat(60));
      console.log(`\n  HTTP Server:  http://localhost:${PORT}`);
      console.log(`  Socket.IO:    ws://localhost:${PORT}`);
      console.log(`  Health Check: http://localhost:${PORT}/health`);
      console.log('\n  Routes:');
      console.log('  ──────────────────────────────────────');
      console.log('  POST  /ingest  → Receive metrics from SDK');
      console.log('  GET   /health  → Health check');
      console.log('  ──────────────────────────────────────');
      console.log('\n  Waiting for metrics... 📡\n');
      console.log('═'.repeat(60) + '\n');
    });
  } catch (err) {
    console.error('[Lantern] ❌ Failed to start collector:', err.message);
    process.exit(1);
  }
}

// ─── Graceful Shutdown ─────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n[Lantern] ${signal} received. Shutting down gracefully...`);

  try {
    const { flushWrites, closeInflux } = require('./services/influx');
    await flushWrites();
    await closeInflux();
  } catch (_) {}

  try {
    await mongoose.disconnect();
    console.log('[Lantern] MongoDB disconnected.');
  } catch (_) {}

  server.close(() => {
    console.log('[Lantern] HTTP server closed.');
    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown fails
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Start the server
start();

// Export for testing
module.exports = { app, server, io };
