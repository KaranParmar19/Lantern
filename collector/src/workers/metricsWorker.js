'use strict';

const { Worker } = require('bullmq');
const { writeRequestMetrics, writeSystemMetrics, flushWrites } = require('../services/influx');
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
      }

      if (systemMetrics.length > 0) {
        writeSystemMetrics(projectId, systemMetrics);
      }

      // ── Flush InfluxDB write buffer ──
      // writeApi batches internally; flush() sends everything and surfaces errors.
      // If InfluxDB is down, this throws and BullMQ retries the job.
      try {
        await flushWrites();
      } catch (influxErr) {
        console.error(
          `[Lantern Worker] ❌ InfluxDB flush FAILED for project "${projectName}" ` +
          `(${requestMetrics.length} req + ${systemMetrics.length} sys metrics): ${influxErr.message}`
        );
        throw influxErr; // Re-throw → BullMQ retries with exponential backoff
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
    const isFinal = job?.attemptsMade >= (job?.opts?.attempts || 3);
    if (isFinal) {
      // Job has exhausted all retries — log as DEAD so it's visible
      console.error(
        `[Lantern Worker] 💀 DEAD JOB ${job?.id} | project: "${job?.data?.projectName}" | ` +
        `metrics: ${job?.data?.metrics?.length || 0} | error: ${err.message}`
      );
    } else {
      console.error(
        `[Lantern Worker] ❌ Job ${job?.id} failed (attempt ${job?.attemptsMade}/${job?.opts?.attempts}): ${err.message}`
      );
    }
  });

  worker.on('error', (err) => {
    console.error('[Lantern Worker] ❌ Worker error:', err.message);
  });

  console.log('[Lantern] ✅ BullMQ metrics worker started');

  return worker;
}

/**
 * Calculate aggregates from a batch of metrics.
 * These are used for real-time dashboard updates via Socket.IO.
 * 
 * SRE enhancements:
 *   - p95 / p99 latency percentiles (replace misleading averages)
 *   - Apdex score (Application Performance Index, T=200ms)
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
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      errorCount: 0,
      errorRate: 0,
      apdex: null,
      byEndpoint: {},
    },
    system: null,
  };

  if (requestMetrics.length > 0) {
    // Sort response times for percentile calculations
    const responseTimes = requestMetrics
      .map((m) => m.responseTime || 0)
      .sort((a, b) => a - b);

    const len = responseTimes.length;

    // Average response time
    const totalTime = responseTimes.reduce((sum, t) => sum + t, 0);
    aggregates.requests.avgResponseTime = parseFloat((totalTime / len).toFixed(2));

    // p95 — 95th percentile index
    const p95Index = Math.ceil(len * 0.95) - 1;
    aggregates.requests.p95ResponseTime = parseFloat(
      (responseTimes[Math.min(p95Index, len - 1)] || 0).toFixed(2)
    );

    // p99 — 99th percentile index
    const p99Index = Math.ceil(len * 0.99) - 1;
    aggregates.requests.p99ResponseTime = parseFloat(
      (responseTimes[Math.min(p99Index, len - 1)] || 0).toFixed(2)
    );

    // Error count and rate
    aggregates.requests.errorCount = requestMetrics.filter((m) => m.isError).length;
    aggregates.requests.errorRate = parseFloat(
      ((aggregates.requests.errorCount / len) * 100).toFixed(2)
    );

    // Apdex score (T = 200ms)
    const APDEX_T = 200;
    const satisfied = responseTimes.filter((t) => t <= APDEX_T).length;
    const tolerating = responseTimes.filter((t) => t > APDEX_T && t <= APDEX_T * 4).length;
    const apdexScore = parseFloat(((satisfied + tolerating / 2) / len).toFixed(3));

    let apdexRating = 'Poor';
    if (apdexScore >= 0.94) apdexRating = 'Excellent';
    else if (apdexScore >= 0.85) apdexRating = 'Good';
    else if (apdexScore >= 0.70) apdexRating = 'Fair';
    else if (apdexScore >= 0.50) apdexRating = 'Poor';
    else apdexRating = 'Unacceptable';

    aggregates.requests.apdex = { score: apdexScore, rating: apdexRating };

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

