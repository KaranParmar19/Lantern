'use strict';

const express = require('express');
const { validateAPIKey } = require('../middleware/validateAPIKey');
const { metricsQueue } = require('../services/queue');

const router = express.Router();

/**
 * POST /ingest
 * 
 * Receives a batch of metrics from the SDK.
 * 
 * Flow:
 *   1. validateAPIKey middleware checks x-api-key header
 *   2. Validate request body has metrics array
 *   3. Push entire batch to BullMQ queue (async)
 *   4. Respond immediately with { received: true }
 * 
 * Target: < 10ms response time.
 * The queue + worker handle the slow parts (InfluxDB writes, Socket.IO).
 */
router.post('/ingest', validateAPIKey, async (req, res) => {
  try {
    const startTime = process.hrtime.bigint();

    const { metrics } = req.body;

    // Validate payload
    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      return res.status(400).json({
        error: 'Invalid payload',
        message: 'Request body must contain a non-empty "metrics" array.',
      });
    }

    // Push to BullMQ queue — this is the fast part
    await metricsQueue.add('process-metrics', {
      projectId: req.project.id,
      projectName: req.project.name,
      metrics,
      receivedAt: new Date().toISOString(),
    });

    // Calculate response time for monitoring
    const endTime = process.hrtime.bigint();
    const responseTimeMs = Number(endTime - startTime) / 1e6;

    console.log(
      `[Lantern] 📥 Ingested ${metrics.length} metric(s) from "${req.project.name}" (${responseTimeMs.toFixed(1)}ms)`
    );

    res.status(200).json({
      received: true,
      count: metrics.length,
      responseTime: `${responseTimeMs.toFixed(1)}ms`,
    });
  } catch (err) {
    console.error('[Lantern] Ingest error:', err.message);
    res.status(500).json({
      error: 'Failed to process metrics',
      message: err.message,
    });
  }
});

/**
 * GET /health
 * 
 * Enhanced health check endpoint.
 * Reports service status + connected database states + queue depth.
 */
router.get('/health', async (_req, res) => {
  const mongoose = require('mongoose');

  let queueDepth = 0;
  try {
    queueDepth = await metricsQueue.getWaitingCount() + await metricsQueue.getActiveCount();
  } catch (_) { /* queue not ready */ }

  res.status(200).json({
    status: 'ok',
    service: 'lantern-collector',
    version: '1.0.0',
    timestamp: Date.now(),
    uptime: Math.floor(process.uptime()),
    connections: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      redis: metricsQueue?.client?.status === 'ready' ? 'connected' : 'connecting',
    },
    queue: {
      pending: queueDepth,
    },
    memory: {
      heapUsedMB: +(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1),
      rssMB: +(process.memoryUsage().rss / 1024 / 1024).toFixed(1),
    },
  });
});

module.exports = router;
