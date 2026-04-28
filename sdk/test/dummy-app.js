'use strict';

/**
 * Lantern APM — Dummy Test App
 * 
 * A minimal Express app with 5 endpoints designed to test
 * every aspect of the SDK: fast responses, slow responses,
 * errors, 404s, and health checks.
 * 
 * Run: node sdk/test/dummy-app.js
 * Then hit the endpoints with curl or your browser.
 */

const express = require('express');
const lantern = require('../src/index');

const app = express();
const PORT = 3001;

// ─── Initialize Lantern SDK ────────────────────────────────
// Using debug mode so we can see metrics in console
// (no collector running yet — flush will fail, that's expected)
lantern.init({
  projectKey: 'ltrn_live_test1234567890abcdef',
  collectorURL: 'http://localhost:4000',  // collector not running yet
  flushInterval: 5000,                     // flush every 5 seconds
  systemMetricsInterval: 10000,            // system metrics every 10s (faster for testing)
  debug: true,
});

// ─── Attach Lantern middleware ─────────────────────────────
app.use(lantern.middleware());

// Parse JSON bodies
app.use(express.json());

// ─── Test Endpoints ────────────────────────────────────────

// 1. Fast success — should show green, ~1-5ms
app.get('/api/users', (_req, res) => {
  const users = [
    { id: 1, name: 'Alice Johnson', email: 'alice@example.com' },
    { id: 2, name: 'Bob Smith', email: 'bob@example.com' },
    { id: 3, name: 'Charlie Brown', email: 'charlie@example.com' },
  ];
  res.json({ users, count: users.length });
});

// 2. Occasional 404 — tests error capture
app.get('/api/users/:id', (req, res) => {
  const id = parseInt(req.params.id);

  if (id <= 3) {
    res.json({ id, name: `User ${id}`, email: `user${id}@example.com` });
  } else {
    res.status(404).json({ error: `User with id ${id} not found` });
  }
});

// 3. Slow endpoint — simulates heavy processing (random 200-800ms)
app.post('/api/orders', (_req, res) => {
  const delay = Math.floor(Math.random() * 600) + 200; // 200-800ms

  setTimeout(() => {
    res.json({
      orderId: `ORD-${Date.now()}`,
      status: 'created',
      processingTime: `${delay}ms`,
    });
  }, delay);
});

// 4. Health check — instant response
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// 5. Always fails — tests 500 error capture
app.get('/api/error', (_req, res) => {
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went terribly wrong in the order processing pipeline',
  });
});

// 6. Simulates a very slow endpoint — for yellow/red warning testing
app.get('/api/reports', (_req, res) => {
  const delay = Math.floor(Math.random() * 2000) + 1000; // 1000-3000ms

  setTimeout(() => {
    res.json({
      report: 'Monthly summary',
      generatedIn: `${delay}ms`,
    });
  }, delay);
});

// ─── Start Server ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n' + '═'.repeat(60));
  console.log('  🏮 Lantern APM — Test Server');
  console.log('═'.repeat(60));
  console.log(`\n  Server running on http://localhost:${PORT}\n`);
  console.log('  Available endpoints:');
  console.log('  ──────────────────────────────────────');
  console.log('  GET    /api/users       → Fast success (200)');
  console.log('  GET    /api/users/:id   → Success or 404');
  console.log('  POST   /api/orders      → Slow (200-800ms)');
  console.log('  GET    /api/health      → Instant health check');
  console.log('  GET    /api/error       → Always 500');
  console.log('  GET    /api/reports     → Very slow (1-3 seconds)');
  console.log('  ──────────────────────────────────────');
  console.log('\n  Try: curl http://localhost:3001/api/users');
  console.log('       curl http://localhost:3001/api/error');
  console.log('       curl -X POST http://localhost:3001/api/orders');
  console.log('\n  Watch the Lantern logs below ↓\n');
  console.log('═'.repeat(60) + '\n');
});

// ─── Graceful Shutdown ─────────────────────────────────────
process.on('SIGINT', async () => {
  console.log('\n[Test App] Shutting down...');
  await lantern.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await lantern.destroy();
  process.exit(0);
});
