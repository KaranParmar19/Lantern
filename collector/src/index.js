'use strict';

require('dotenv').config();

// ─── Fail-fast env validation ───────────────────────────────────────
// If a critical env var is missing, crash immediately with a clear
// message rather than silently failing 3 hours into a production run.
const REQUIRED_ENV = ['MONGODB_URI', 'REDIS_HOST', 'INFLUX_URL', 'INFLUX_TOKEN', 'JWT_SECRET'];
const MISSING_ENV = REQUIRED_ENV.filter((k) => !process.env[k]);
if (MISSING_ENV.length > 0) {
  console.error('\n[Lantern] ❌ FATAL: Missing required environment variables:');
  MISSING_ENV.forEach((k) => console.error(`  - ${k}`));
  console.error('[Lantern] Set them in .env or your deployment dashboard, then restart.\n');
  process.exit(1);
}
if (process.env.JWT_SECRET === 'lantern-dev-secret-change-in-production') {
  console.error('\n[Lantern] ❌ FATAL: JWT_SECRET is still the default insecure dev value.');
  console.error('[Lantern] Generate a strong secret: openssl rand -base64 32');
  console.error('[Lantern] Set it as JWT_SECRET in your .env or deployment env vars.\n');
  process.exit(1);
}

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

// Parse JSON bodies
// SDK MAX_BATCH_SIZE = 2000 metrics × ~300 bytes avg = ~600KB max.
// 1mb gives safe headroom while still blocking oversized malicious payloads.
// (The original 5mb was excessive; 1mb is the correct security/compatibility balance.)
app.use(express.json({ limit: '1mb' }));

// CORS — allow dashboard to connect
// DASHBOARD_URL must be set in production (e.g. https://lantern.vercel.app)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.DASHBOARD_URL,
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
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
    origin: allowedOrigins, // Same list as Express CORS — includes DASHBOARD_URL in production
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

    // 2. Start BullMQ worker — reuse the shared redisConfig from queue.js
    // (includes TLS + password for Upstash in production)
    startMetricsWorker(io, redisConfig);

    // 3. Start HTTP server
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n[Lantern] ❌ Port ${PORT} is already in use.`);
        console.error(`[Lantern]    Run this to free it:  npx kill-port ${PORT}`);
        console.error(`[Lantern]    Or on Windows:  Get-NetTCPConnection -LocalPort ${PORT} | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }\n`);
      } else {
        console.error('[Lantern] ❌ Server error:', err.message);
      }
      process.exit(1);
    });

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
