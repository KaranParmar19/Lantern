'use strict';

const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  queryOverviewStats,
  queryRequestsPerMinute,
  queryResponseTime,
  queryEndpoints,
  queryErrors,
  querySystemMetrics,
  queryLatencyPercentiles,
  queryApdexScore,
} = require('../services/influx');

const router = express.Router();

/**
 * Dashboard Metrics API Routes
 *
 * All routes are protected by JWT (authMiddleware).
 * Clients must send: Authorization: Bearer <token>
 * All routes also require a `projectId` query parameter.
 */

// ── Auth guard — all metrics routes require a valid JWT ──
router.use(authMiddleware);

// ── Middleware: require projectId ──
router.use((req, res, next) => {
  const { projectId } = req.query;
  if (!projectId) {
    return res.status(400).json({
      error: 'Missing projectId',
      message: 'Include ?projectId=<id> in the query string.',
    });
  }
  req.projectId = projectId;
  next();
});

/**
 * GET /api/metrics/overview?projectId=xxx&range=-24h
 * 
 * Returns: totalRequests, avgResponseTime, errorCount, errorRate, lastDataAt
 */
router.get('/overview', async (req, res) => {
  try {
    const range = req.query.range || '-24h';
    const stats = await queryOverviewStats(req.projectId, range);
    res.json(stats);
  } catch (err) {
    console.error('[Lantern] /api/metrics/overview error:', err.message);
    res.status(500).json({ error: 'Failed to query overview stats' });
  }
});

/**
 * GET /api/metrics/rpm?projectId=xxx&range=-30m
 * 
 * Returns: array of { time, value } for Requests Per Minute chart
 */
router.get('/rpm', async (req, res) => {
  try {
    const range = req.query.range || '-30m';
    const data = await queryRequestsPerMinute(req.projectId, range);
    res.json(data);
  } catch (err) {
    console.error('[Lantern] /api/metrics/rpm error:', err.message);
    res.status(500).json({ error: 'Failed to query RPM data' });
  }
});

/**
 * GET /api/metrics/response-time?projectId=xxx&range=-30m
 * 
 * Returns: array of { time, value } for Response Time chart
 */
router.get('/response-time', async (req, res) => {
  try {
    const range = req.query.range || '-30m';
    const data = await queryResponseTime(req.projectId, range);
    res.json(data);
  } catch (err) {
    console.error('[Lantern] /api/metrics/response-time error:', err.message);
    res.status(500).json({ error: 'Failed to query response time data' });
  }
});

/**
 * GET /api/metrics/endpoints?projectId=xxx&range=-24h
 * 
 * Returns: array of endpoint objects with avgResponseTime, errorRate, status
 */
router.get('/endpoints', async (req, res) => {
  try {
    const range = req.query.range || '-24h';
    const data = await queryEndpoints(req.projectId, range);
    res.json(data);
  } catch (err) {
    console.error('[Lantern] /api/metrics/endpoints error:', err.message);
    res.status(500).json({ error: 'Failed to query endpoints data' });
  }
});

/**
 * GET /api/metrics/errors?projectId=xxx&range=-24h&endpoint=/api/users&statusCode=500
 * 
 * Returns: array of error objects (timestamp, endpoint, method, statusCode, errorMessage)
 */
router.get('/errors', async (req, res) => {
  try {
    const range = req.query.range || '-24h';
    const filterEndpoint = req.query.endpoint || null;
    const filterStatusCode = req.query.statusCode || null;
    const data = await queryErrors(req.projectId, range, filterEndpoint, filterStatusCode);
    res.json(data);
  } catch (err) {
    console.error('[Lantern] /api/metrics/errors error:', err.message);
    res.status(500).json({ error: 'Failed to query errors data' });
  }
});

/**
 * GET /api/metrics/system?projectId=xxx&range=-24h
 * 
 * Returns: array of system metric objects (time, memoryHeapUsed, cpuUser, etc.)
 */
router.get('/system', async (req, res) => {
  try {
    const range = req.query.range || '-24h';
    const data = await querySystemMetrics(req.projectId, range);
    res.json(data);
  } catch (err) {
    console.error('[Lantern] /api/metrics/system error:', err.message);
    res.status(500).json({ error: 'Failed to query system metrics' });
  }
});

/**
 * GET /api/metrics/latency-percentiles?projectId=xxx&range=-30m
 * 
 * SRE metric: returns avg, p95, p99 latency per minute.
 * Replace misleading averages with tail latency visibility.
 * Returns: array of { time, avg, p95, p99 }
 */
router.get('/latency-percentiles', async (req, res) => {
  try {
    const range = req.query.range || '-30m';
    const data = await queryLatencyPercentiles(req.projectId, range);
    res.json(data);
  } catch (err) {
    console.error('[Lantern] /api/metrics/latency-percentiles error:', err.message);
    res.status(500).json({ error: 'Failed to query latency percentiles' });
  }
});

/**
 * GET /api/metrics/apdex?projectId=xxx&range=-24h&targetMs=200
 * 
 * SRE metric: Apdex score (Application Performance Index).
 * Returns: { score, rating, total, satisfied, tolerating, frustrated, targetMs }
 * 
 * score: 0-1 (higher is better)
 * rating: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Unacceptable'
 */
router.get('/apdex', async (req, res) => {
  try {
    const range = req.query.range || '-24h';
    const targetMs = parseInt(req.query.targetMs || '200', 10);
    const data = await queryApdexScore(req.projectId, range, targetMs);
    res.json(data);
  } catch (err) {
    console.error('[Lantern] /api/metrics/apdex error:', err.message);
    res.status(500).json({ error: 'Failed to query Apdex score' });
  }
});

module.exports = router;
