'use strict';

const { Worker } = require('bullmq');
const { writeRequestMetrics, writeSystemMetrics } = require('../services/influx');
const { checkAlertRules } = require('../services/alerts');

/**
 * BullMQ Metrics Worker
 * 
 * Processes jobs from the 'ingest-metrics' queue.
 * 
 * For each batch of metrics:
 *   1. Separate into request metrics and system metrics
 *   2. Write request metrics to InfluxDB 'requests' measurement
 *   3. Write system metrics to InfluxDB 'system' measurement
 *   4. Calculate aggregates (requests count, avg response time, error rate)
 *   5. Broadcast via Socket.IO to the project's room
 *   6. Check alert rules (Phase 4)
 * 
 * Retry config: 3 attempts with exponential backoff (1s → 4s → 16s)
 */

let ioInstance = null;

/**
 * Initialize the worker with a Socket.IO instance for broadcasting.
 * Must be called after the HTTP server is created.
 * 
 * @param {Object} io - Socket.IO server instance
 * @param {Object} redisConfig - Redis connection config
 */
function startMetricsWorker(io, redisConfig) {
  ioInstance = io;

  const worker = new Worker(
    'ingest-metrics',
    async (job) => {
      const { projectId, projectName, metrics } = job.data;

      console.log(
        `[Lantern Worker] ⚙️  Processing ${metrics.length} metric(s) for "${projectName}" (Job ${job.id})`
      );

      // ── 1. Separate metrics by type ──
      const requestMetrics = metrics.filter((m) => m.type === 'request');
      const systemMetrics = metrics.filter((m) => m.type === 'system');

      // ── 2. Write to InfluxDB ──
      if (requestMetrics.length > 0) {
        writeRequestMetrics(projectId, requestMetrics);
        console.log(
          `[Lantern Worker] 📝 Wrote ${requestMetrics.length} request metric(s) to InfluxDB`
        );
      }

      if (systemMetrics.length > 0) {
        writeSystemMetrics(projectId, systemMetrics);
        console.log(
          `[Lantern Worker] 📝 Wrote ${systemMetrics.length} system metric(s) to InfluxDB`
        );
      }

      // ── 3. Calculate aggregates for real-time dashboard ──
      const aggregates = calculateAggregates(requestMetrics, systemMetrics);

      // ── 4. Broadcast via Socket.IO ──
      if (ioInstance) {
        const roomName = `project:${projectId}`;

        ioInstance.to(roomName).emit('metrics:update', {
          projectId,
          aggregates,
          requestMetrics,
          systemMetrics,
          timestamp: new Date().toISOString(),
        });

        // Count clients in room
        const room = ioInstance.sockets.adapter.rooms.get(roomName);
        const clientCount = room ? room.size : 0;

        if (clientCount > 0) {
          console.log(
            `[Lantern Worker] 📡 Broadcasted to ${clientCount} client(s) in room "${roomName}"`
          );
        }
      }

      // ── 5. Check alert rules (stub for Phase 4) ──
      await checkAlertRules(projectId, aggregates);

      console.log(
        `[Lantern Worker] ✅ Job ${job.id} completed`
      );
    },
    {
      connection: redisConfig,
      concurrency: 5, // Process up to 5 jobs concurrently
    }
  );

  // ── Worker event handlers ──
  worker.on('completed', (job) => {
    // Logged inside the processor above
  });

  worker.on('failed', (job, err) => {
    console.error(
      `[Lantern Worker] ❌ Job ${job?.id} failed (attempt ${job?.attemptsMade}/${job?.opts?.attempts}):`,
      err.message
    );
  });

  worker.on('error', (err) => {
    console.error('[Lantern Worker] ❌ Worker error:', err.message);
  });

  console.log('[Lantern] ✅ BullMQ metrics worker started');

  return worker;
}

/**
 * Calculate aggregates from a batch of metrics.
 * These are used for real-time dashboard updates.
 * 
 * @param {Array} requestMetrics
 * @param {Array} systemMetrics
 * @returns {Object} Aggregates
 */
function calculateAggregates(requestMetrics, systemMetrics) {
  const aggregates = {
    requests: {
      total: requestMetrics.length,
      avgResponseTime: 0,
      errorCount: 0,
      errorRate: 0,
      byEndpoint: {},
    },
    system: null,
  };

  if (requestMetrics.length > 0) {
    // Average response time
    const totalTime = requestMetrics.reduce((sum, m) => sum + (m.responseTime || 0), 0);
    aggregates.requests.avgResponseTime = parseFloat(
      (totalTime / requestMetrics.length).toFixed(2)
    );

    // Error count and rate
    aggregates.requests.errorCount = requestMetrics.filter((m) => m.isError).length;
    aggregates.requests.errorRate = parseFloat(
      ((aggregates.requests.errorCount / requestMetrics.length) * 100).toFixed(2)
    );

    // Per-endpoint breakdown
    for (const metric of requestMetrics) {
      const key = `${metric.method} ${metric.endpoint}`;
      if (!aggregates.requests.byEndpoint[key]) {
        aggregates.requests.byEndpoint[key] = {
          endpoint: metric.endpoint,
          method: metric.method,
          totalCalls: 0,
          totalTime: 0,
          errorCount: 0,
        };
      }
      const ep = aggregates.requests.byEndpoint[key];
      ep.totalCalls++;
      ep.totalTime += metric.responseTime || 0;
      ep.errorCount += metric.isError ? 1 : 0;
    }

    // Calculate averages per endpoint
    for (const key of Object.keys(aggregates.requests.byEndpoint)) {
      const ep = aggregates.requests.byEndpoint[key];
      ep.avgResponseTime = parseFloat((ep.totalTime / ep.totalCalls).toFixed(2));
      ep.errorRate = parseFloat(((ep.errorCount / ep.totalCalls) * 100).toFixed(2));
    }
  }

  // Latest system metrics snapshot
  if (systemMetrics.length > 0) {
    const latest = systemMetrics[systemMetrics.length - 1];
    aggregates.system = {
      memory: latest.memory,
      cpu: latest.cpu,
    };
  }

  return aggregates;
}

module.exports = { startMetricsWorker };
