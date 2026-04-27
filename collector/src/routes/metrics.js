'use strict';

const express = require('express');
const {
  queryOverviewStats,
  queryRequestsPerMinute,
  queryResponseTime,
  queryEndpoints,
  queryErrors,
  querySystemMetrics,
} = require('../services/influx');

const router = express.Router();

/**
 * Dashboard Metrics API Routes
 * 
 * These endpoints query InfluxDB and return JSON for the dashboard.
 * All routes require a `projectId` query parameter.
 * 
 * For Phase 3 there is no JWT auth — these are open.
 * Phase 5 will add JWT middleware to protect them.
 */

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

module.exports = router;
