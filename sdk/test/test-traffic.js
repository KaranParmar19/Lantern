'use strict';

/**
 * Lantern APM — Traffic Generator
 * 
 * Spins up a dummy Express app, hooks the Lantern SDK,
 * then hammers it with realistic mixed traffic so you can
 * see live metrics on the dashboard immediately.
 * 
 * Run from: c:\Users\Komal\Lantern\sdk\test\
 *   node test-traffic.js
 */

const express = require('express');
const http    = require('http');

// ── Path is relative to THIS file's location (sdk/test/) ──
const lantern = require('../src/index');

// ── Your project API key ──
const API_KEY = process.argv[2] || 'ltrn_live_67d762df9cb9e5edec97aaee3b977c13';
const COLLECTOR_URL = 'http://localhost:4000';
const PORT = 3005;

// ── Initialize Lantern SDK ──
lantern.init({
  projectKey:            API_KEY,
  collectorURL:          COLLECTOR_URL,
  flushInterval:         2000,   // flush every 2 seconds
  systemMetricsInterval: 5000,   // system metrics every 5 seconds
  debug:                 true,
});

// ── Express App ──
const app = express();
app.use(lantern.middleware());
app.use(express.json());

// Fast success
app.get('/api/users', (_req, res) =>
  res.json({ users: [{ id: 1 }, { id: 2 }, { id: 3 }] })
);

// Occasional 404
app.get('/api/users/:id', (req, res) => {
  if (req.params.id === '999')
    return res.status(404).json({ error: 'User not found' });
  res.json({ id: req.params.id, name: 'Test User' });
});

// Slow endpoint (100–600ms) — pushes p95/p99 up
app.post('/api/orders', (_req, res) => {
  const delay = Math.floor(Math.random() * 500) + 100;
  setTimeout(() => res.json({ orderId: 'ORD123', processingTime: delay }), delay);
});

// Very slow (1–3s) — for Apdex "Frustrated" bucket
app.get('/api/reports', (_req, res) => {
  const delay = Math.floor(Math.random() * 2000) + 1000;
  setTimeout(() => res.json({ report: 'Ready', generatedIn: delay }), delay);
});

// Always 500 — drives error rate
app.get('/api/error', (_req, res) =>
  res.status(500).json({ error: 'Internal Server Error' })
);

// Health check
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', uptime: process.uptime() })
);

// ── Start & Traffic Generator ──
app.listen(PORT, () => {
  console.log('\n' + '═'.repeat(60));
  console.log('  🏮 Lantern APM — Traffic Generator');
  console.log('═'.repeat(60));
  console.log(`\n  App:       http://localhost:${PORT}`);
  console.log(`  Collector: ${COLLECTOR_URL}`);
  console.log(`  API Key:   ${API_KEY.substring(0, 18)}...`);
  console.log('\n  Generating traffic... watch your dashboard! 📡\n');
  console.log('═'.repeat(60) + '\n');

  // Weighted endpoint list
  const endpoints = [
    { method: 'GET',  path: '/api/users',    weight: 35 }, // fast, 200
    { method: 'GET',  path: '/api/users/1',  weight: 15 }, // fast, 200
    { method: 'GET',  path: '/api/users/999',weight: 8  }, // 404
    { method: 'GET',  path: '/api/health',   weight: 12 }, // instant
    { method: 'POST', path: '/api/orders',   weight: 15 }, // slow
    { method: 'GET',  path: '/api/reports',  weight: 5  }, // very slow
    { method: 'GET',  path: '/api/error',    weight: 10 }, // 500
  ];

  const makeRequest = () => {
    // Weighted random pick
    const rand = Math.random() * 100;
    let sum = 0;
    let target = endpoints[0];
    for (const ep of endpoints) {
      sum += ep.weight;
      if (rand <= sum) { target = ep; break; }
    }

    const req = http.request({
      hostname: 'localhost',
      port:     PORT,
      path:     target.path,
      method:   target.method,
      headers:  { 'Content-Type': 'application/json' },
    }, (res) => {
      res.on('data', () => {}); // drain response
    });

    req.on('error', () => {}); // swallow ECONNRESET etc.
    if (target.method === 'POST') req.write('{}');
    req.end();

    // Random interval per "user" — 10ms to 150ms
    setTimeout(makeRequest, Math.floor(Math.random() * 140) + 10);
  };

  // Simulate concurrent users (default 40, or from env var)
  const CONCURRENT_USERS = parseInt(process.env.USERS, 10) || 40;
  console.log(`  [Traffic] Simulating ${CONCURRENT_USERS} concurrent users...\n`);
  for (let i = 0; i < CONCURRENT_USERS; i++) {
    setTimeout(makeRequest, Math.random() * 1000);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Traffic Generator] Flushing remaining metrics...');
  await lantern.destroy();
  process.exit(0);
});
