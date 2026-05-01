'use strict';

const express = require('express');
const { validateAPIKey } = require('../middleware/validateAPIKey');
const { metricsQueue, getRedisClient } = require('../services/queue');

const router = express.Router();

/**
 * SRE: Backpressure threshold.
 * If BullMQ queue depth exceeds this, return HTTP 429 to SDKs.
 * This prevents Redis memory from blowing up when InfluxDB is slow.
 */
const QUEUE_BACKPRESSURE_THRESHOLD = 10000;

/**
 * SRE: Rate limiting configuration.
 * Max ingest requests per minute per project (API key).
 */
const RATE_LIMIT_MAX = 100;
const RATE_LIMIT_WINDOW_SECONDS = 60;

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

    // ── SRE: Check queue backpressure ──
    // If BullMQ is backed up, reject new metrics to protect Redis memory
    try {
      const waitingCount = await metricsQueue.getWaitingCount();
      const activeCount = await metricsQueue.getActiveCount();
      const queueDepth = waitingCount + activeCount;

      if (queueDepth > QUEUE_BACKPRESSURE_THRESHOLD) {
        console.warn(
          `[Lantern] 🛑 Queue backpressure! Depth: ${queueDepth} (threshold: ${QUEUE_BACKPRESSURE_THRESHOLD}). Rejecting ingest.`
        );
        return res.status(429).json({
          error: 'Too Many Requests',
          message: `Collector queue is backed up (${queueDepth} pending jobs). Please retry later.`,
          retryAfter: 30,
        });
      }
    } catch (queueErr) {
      // If we can't check queue depth, proceed anyway — don't block ingestion
      console.warn('[Lantern] Could not check queue depth:', queueErr.message);
    }

    // ── SRE: Per-project rate limiting via Redis ──
    try {
      const redis = getRedisClient();
      if (redis) {
        const rateLimitKey = `lantern:ratelimit:${req.project.id}`;
        const currentCount = await redis.incr(rateLimitKey);

        // Set TTL on first request in this window
        if (currentCount === 1) {
          await redis.expire(rateLimitKey, RATE_LIMIT_WINDOW_SECONDS);
        }

        if (currentCount > RATE_LIMIT_MAX) {
          const ttl = await redis.ttl(rateLimitKey);
          console.warn(
            `[Lantern] 🛑 Rate limit exceeded for project "${req.project.name}" (${currentCount}/${RATE_LIMIT_MAX} per ${RATE_LIMIT_WINDOW_SECONDS}s)`
          );
          return res.status(429).json({
            error: 'Rate limit exceeded',
            message: `Max ${RATE_LIMIT_MAX} ingest requests per ${RATE_LIMIT_WINDOW_SECONDS} seconds per project.`,
            retryAfter: ttl > 0 ? ttl : RATE_LIMIT_WINDOW_SECONDS,
          });
        }
      }
    } catch (rlErr) {
      // Rate limiting is a safety net, not a blocker
      console.warn('[Lantern] Rate limit check failed:', rlErr.message);
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
