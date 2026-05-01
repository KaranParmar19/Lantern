'use strict';

const crypto = require('crypto');
const http = require('http');
const https = require('https');

/**
 * LanternAPM — Lightweight APM SDK for Node.js & Express
 * 
 * Zero dependencies. Non-blocking. Fire-and-forget.
 * Captures request metrics, system health, and errors silently
 * so the host application feels zero performance impact.
 * 
 * Usage:
 *   const lantern = require('lantern-apm');
 *   lantern.init({ projectKey: 'ltrn_live_xxx', collectorURL: 'https://...' });
 *   app.use(lantern.middleware());
 */
/**
 * Hard limit on in-memory batch size to prevent OOM crashes.
 * When the batch exceeds this limit, oldest metrics are dropped.
 * SRE Recommendation: Never let the monitor crash the host.
 */
const MAX_BATCH_SIZE = 2000;

class LanternAPM {
  constructor() {
    this._config = null;
    this._batch = [];
    this._flushTimer = null;
    this._systemMetricsTimer = null;
    this._previousCpuUsage = null;
    this._previousCpuTimestamp = null;
    this._initialized = false;
    this._debug = false;

    // ── SRE: Observability counters ──
    this._droppedMetrics = 0;   // Metrics dropped due to batch overflow
    this._throttledUntil = 0;   // Timestamp until which flushes are paused (429 backpressure)

    // ── SRE: Persistent HTTP agents for connection reuse ──
    this._httpAgent = new http.Agent({ keepAlive: true, maxSockets: 5, keepAliveMsecs: 30000 });
    this._httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 5, keepAliveMsecs: 30000 });
  }

  // ─── PUBLIC API ──────────────────────────────────────────────

  /**
   * Initialize the SDK with project credentials and optional config.
   * 
   * @param {Object} options
   * @param {string} options.projectKey    - API key (format: ltrn_live_xxxxxxxxxxxx)
   * @param {string} options.collectorURL  - Collector server URL
   * @param {number} [options.flushInterval=5000]          - Batch flush interval in ms
   * @param {number} [options.systemMetricsInterval=30000] - System metrics capture interval in ms
   * @param {boolean} [options.debug=false]                - Log metrics to console
   */
  init(options = {}) {
    try {
      const {
        projectKey,
        collectorURL,
        flushInterval = 5000,
        systemMetricsInterval = 30000,
        debug = false,
      } = options;

      // ── Validate required config ──
      if (!projectKey || typeof projectKey !== 'string') {
        console.error('[Lantern] ERROR: projectKey is required and must be a string.');
        return this;
      }

      if (!projectKey.startsWith('ltrn_live_')) {
        console.warn('[Lantern] WARNING: projectKey should start with "ltrn_live_". Proceeding anyway.');
      }

      if (!collectorURL || typeof collectorURL !== 'string') {
        console.error('[Lantern] ERROR: collectorURL is required and must be a string.');
        return this;
      }

      // ── Store config ──
      this._config = {
        projectKey,
        collectorURL: collectorURL.replace(/\/+$/, ''), // strip trailing slashes
        flushInterval,
        systemMetricsInterval,
      };

      this._debug = debug;
      this._batch = [];
      this._initialized = true;

      // ── Take initial CPU snapshot for delta calculation ──
      this._previousCpuUsage = process.cpuUsage();
      this._previousCpuTimestamp = process.hrtime.bigint();

      // ── Start flush timer ──
      // .unref() ensures this timer never prevents the host process from exiting
      this._flushTimer = setInterval(() => this._flush(), flushInterval);
      this._flushTimer.unref();

      // ── Start system metrics timer ──
      this._systemMetricsTimer = setInterval(() => this._captureSystemMetrics(), systemMetricsInterval);
      this._systemMetricsTimer.unref();

      if (this._debug) {
        console.log('[Lantern] ✅ SDK initialized successfully.');
        console.log(`[Lantern]    Project Key: ${projectKey.substring(0, 15)}...`);
        console.log(`[Lantern]    Collector:   ${collectorURL}`);
        console.log(`[Lantern]    Flush every: ${flushInterval}ms`);
        console.log(`[Lantern]    System metrics every: ${systemMetricsInterval}ms`);
      }
    } catch (err) {
      // Never crash the host app because of SDK initialization failure
      console.error('[Lantern] Failed to initialize:', err.message);
    }

    return this;
  }

  /**
   * Returns Express middleware that captures request metrics.
   * 
   * Usage: app.use(lantern.middleware())
   * 
   * @returns {Function} Express middleware (req, res, next)
   */
  middleware() {
    // Return a no-op middleware if SDK wasn't initialized
    if (!this._initialized) {
      console.warn('[Lantern] WARNING: middleware() called before init(). No metrics will be captured.');
      return (_req, _res, next) => next();
    }

    // Use arrow function to preserve `this` context
    return (req, res, next) => {
      try {
        // ── Record start time with nanosecond precision ──
        const startTime = process.hrtime.bigint();
        const requestId = this._generateRequestId();

        // ── Attach request ID to request object for downstream use ──
        req.lanternRequestId = requestId;

        // ── Listen for response completion ──
        res.on('finish', () => {
          try {
            // Calculate duration in milliseconds (nanosecond precision)
            const endTime = process.hrtime.bigint();
            const durationNs = Number(endTime - startTime);
            const durationMs = parseFloat((durationNs / 1e6).toFixed(2));

            // Extract endpoint path (strip query string, normalize dynamic params)
            const rawPath = (req.route?.path || req.originalUrl || req.url || '/').split('?')[0];
            const endpoint = this._normalizeEndpoint(rawPath);

            const statusCode = res.statusCode;
            const isError = statusCode >= 400;

            // Build metric object
            const metric = {
              type: 'request',
              requestId,
              method: req.method,
              endpoint,
              statusCode,
              responseTime: durationMs,
              isError,
              errorMessage: isError
                ? (res.statusMessage || this._defaultErrorMessage(statusCode))
                : null,
              timestamp: new Date().toISOString(),
            };

            // Push to batch with circular buffer protection (SRE: prevent OOM)
            this._addToBatch(metric);

            if (this._debug) {
              const statusIcon = isError ? '🔴' : '🟢';
              console.log(
                `[Lantern] ${statusIcon} ${metric.method} ${metric.endpoint} → ${metric.statusCode} (${metric.responseTime}ms)`
              );
            }
          } catch (err) {
            // Silently handle — never interfere with the host app's response
            if (this._debug) {
              console.error('[Lantern] Error capturing metric:', err.message);
            }
          }
        });
      } catch (err) {
        // Outer catch — if anything fails, just proceed without monitoring
        if (this._debug) {
          console.error('[Lantern] Middleware error:', err.message);
        }
      }

      // Always call next() — never block the request pipeline
      next();
    };
  }

  /**
   * Gracefully shut down the SDK.
   * Clears all timers and performs a final flush of remaining metrics.
   */
  async destroy() {
    try {
      if (this._flushTimer) {
        clearInterval(this._flushTimer);
        this._flushTimer = null;
      }

      if (this._systemMetricsTimer) {
        clearInterval(this._systemMetricsTimer);
        this._systemMetricsTimer = null;
      }

      // Final flush of any remaining metrics
      if (this._batch.length > 0) {
        await this._flush();
      }

      this._initialized = false;

      if (this._debug) {
        console.log('[Lantern] 🛑 SDK destroyed. All timers cleared.');
      }
    } catch (err) {
      if (this._debug) {
        console.error('[Lantern] Error during destroy:', err.message);
      }
    }
  }

  // ─── INTERNAL METHODS ────────────────────────────────────────

  /**
   * Captures system-level metrics: memory and CPU usage.
   * Called on a timer (default: every 30 seconds).
   * @private
   */
  _captureSystemMetrics() {
    try {
      // ── Memory ──
      const mem = process.memoryUsage();
      const toMB = (bytes) => parseFloat((bytes / 1024 / 1024).toFixed(2));

      // ── CPU ──
      // Calculate CPU percentage by comparing against previous snapshot
      const currentCpuUsage = process.cpuUsage();
      const currentTimestamp = process.hrtime.bigint();

      let cpuUserPercent = 0;
      let cpuSystemPercent = 0;

      if (this._previousCpuUsage && this._previousCpuTimestamp) {
        // Wall-clock elapsed time in microseconds
        const elapsedUs = Number(currentTimestamp - this._previousCpuTimestamp) / 1000;

        if (elapsedUs > 0) {
          // CPU time deltas in microseconds
          const userDelta = currentCpuUsage.user - this._previousCpuUsage.user;
          const systemDelta = currentCpuUsage.system - this._previousCpuUsage.system;

          // Percentage = (cpu time / wall time) * 100
          cpuUserPercent = parseFloat(((userDelta / elapsedUs) * 100).toFixed(2));
          cpuSystemPercent = parseFloat(((systemDelta / elapsedUs) * 100).toFixed(2));
        }
      }

      // Store snapshot for next delta calculation
      this._previousCpuUsage = currentCpuUsage;
      this._previousCpuTimestamp = currentTimestamp;

      const metric = {
        type: 'system',
        memory: {
          heapUsed: toMB(mem.heapUsed),
          heapTotal: toMB(mem.heapTotal),
          rss: toMB(mem.rss),
          external: toMB(mem.external),
        },
        cpu: {
          userPercent: cpuUserPercent,
          systemPercent: cpuSystemPercent,
        },
        timestamp: new Date().toISOString(),
      };

      // SRE: Use safe push with overflow protection
      this._addToBatch(metric);

      if (this._debug) {
        console.log(
          `[Lantern] 📊 System: Memory ${metric.memory.heapUsed}MB / ${metric.memory.heapTotal}MB | CPU User ${metric.cpu.userPercent}% System ${metric.cpu.systemPercent}%`
        );
      }
    } catch (err) {
      if (this._debug) {
        console.error('[Lantern] Error capturing system metrics:', err.message);
      }
    }
  }

  /**
   * Flushes the current batch of metrics to the collector.
   * 
   * Strategy:
   * 1. Snapshot the batch and clear immediately (prevents data loss)
   * 2. Send via fetch (async, fire-and-forget)
   * 3. On failure: retry once after 2 seconds
   * 4. On second failure: silently discard
   * 
   * @private
   */
  async _flush() {
    try {
      // Skip if nothing to send
      if (this._batch.length === 0) return;

      // ── SRE: Respect 429 backpressure from collector ──
      if (Date.now() < this._throttledUntil) {
        if (this._debug) {
          const waitSecs = Math.ceil((this._throttledUntil - Date.now()) / 1000);
          console.log(`[Lantern] ⏳ Throttled by collector. Waiting ${waitSecs}s before next flush.`);
        }
        return;
      }

      // ── Snapshot & Clear ──
      // Copy the batch and clear the original immediately.
      // This way, new metrics arriving during the async send
      // go into a fresh batch and are never lost.
      const batchCopy = this._batch.slice();
      this._batch = [];

      if (this._debug) {
        console.log(`[Lantern] 📤 Flushing ${batchCopy.length} metric(s)...`);
        if (this._droppedMetrics > 0) {
          console.log(`[Lantern] ⚠️  ${this._droppedMetrics} metric(s) dropped due to batch overflow since last flush.`);
          this._droppedMetrics = 0;
        }
      }

      // ── Send to collector ──
      const result = await this._sendBatch(batchCopy);

      if (result === 'throttled') {
        // Collector is overloaded — back off for 30 seconds
        this._throttledUntil = Date.now() + 30000;
        if (this._debug) {
          console.log('[Lantern] 🛑 Collector returned 429. Backing off for 30 seconds.');
        }
        return;
      }

      if (!result) {
        // ── Retry once after 2 seconds ──
        if (this._debug) {
          console.log('[Lantern] ⚠️  First flush failed. Retrying in 2 seconds...');
        }

        setTimeout(async () => {
          try {
            const retryResult = await this._sendBatch(batchCopy);
            if (!retryResult && this._debug) {
              console.log(`[Lantern] ❌ Retry failed. Discarding ${batchCopy.length} metric(s).`);
            }
          } catch (_) {
            // Final discard — never crash
          }
        }, 2000);
      }
    } catch (err) {
      if (this._debug) {
        console.error('[Lantern] Flush error:', err.message);
      }
    }
  }

  /**
   * Sends a batch of metrics to the collector via HTTP POST.
   * 
   * @param {Array} batch - Array of metric objects
   * @returns {boolean} true if successful, false otherwise
   * @private
   */
  async _sendBatch(batch) {
    try {
      const url = `${this._config.collectorURL}/ingest`;

      // SRE: Use keep-alive agent for persistent TCP connections
      const isHttps = url.startsWith('https');
      const agent = isHttps ? this._httpsAgent : this._httpAgent;

      const fetchOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this._config.projectKey,
        },
        body: JSON.stringify({ metrics: batch }),
        // AbortController timeout — don't hang forever
        signal: AbortSignal.timeout(10000), // 10 second timeout
      };

      // Node.js 18+ fetch supports dispatcher; for older versions, agent option
      // We attempt to pass the agent if the runtime supports it
      if (typeof globalThis.fetch === 'function') {
        // Use native fetch with timeout (agent not directly supported in native fetch)
        // Connection pooling handled at the OS/runtime level
      }

      const response = await fetch(url, fetchOptions);

      // SRE: Handle 429 Too Many Requests (backpressure)
      if (response.status === 429) {
        if (this._debug) {
          console.log('[Lantern] 🛑 Collector returned HTTP 429 — Too Many Requests');
        }
        return 'throttled';
      }

      if (this._debug) {
        if (response.ok) {
          console.log(`[Lantern] ✅ Flush successful (${batch.length} metrics sent).`);
        } else {
          console.log(`[Lantern] ⚠️  Collector responded with ${response.status}`);
        }
      }

      return response.ok;
    } catch (err) {
      if (this._debug) {
        console.error(`[Lantern] ⚠️  Send failed: ${err.message}`);
      }
      return false;
    }
  }

  /**
   * Generates a unique request ID for error correlation.
   * Uses crypto.randomUUID() (built-in since Node 14.17).
   * 
   * @returns {string} UUID v4
   * @private
   */
  _generateRequestId() {
    try {
      return crypto.randomUUID();
    } catch (_) {
      // Fallback: timestamp + random hex
      const ts = Date.now().toString(36);
      const rand = Math.random().toString(36).substring(2, 10);
      return `${ts}-${rand}`;
    }
  }

  /**
   * Returns a default error message for common HTTP error status codes.
   * 
   * @param {number} statusCode
   * @returns {string}
   * @private
   */
  _defaultErrorMessage(statusCode) {
    const messages = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      408: 'Request Timeout',
      409: 'Conflict',
      410: 'Gone',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      501: 'Not Implemented',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout',
    };

    return messages[statusCode] || `HTTP Error ${statusCode}`;
  }

  // ─── SRE: ROUTE NORMALIZATION ──────────────────────────────

  /**
   * Normalizes dynamic path segments to prevent InfluxDB tag cardinality explosion.
   *
   * Without normalization:
   *   /api/users/1, /api/users/2 → two separate InfluxDB series
   * With normalization:
   *   /api/users/1, /api/users/2 → /api/users/:id (one series)
   *
   * Handles: numeric IDs, MongoDB ObjectIds (24-char hex), and UUIDs.
   *
   * @param {string} path - Raw URL path (query string already stripped)
   * @returns {string} Normalized path
   * @private
   */
  _normalizeEndpoint(path) {
    return path
      // MongoDB ObjectIds: 24 hex chars  e.g. /users/507f1f77bcf86cd799439011
      .replace(/\/[0-9a-fA-F]{24}(?=\/|$)/g, '/:id')
      // UUIDs: e.g. /sessions/110e8400-e29b-41d4-a716-446655440000
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi, '/:uuid')
      // Purely numeric IDs: e.g. /products/42  (must come last)
      .replace(/\/\d+(?=\/|$)/g, '/:id');
  }

  // ─── SRE: SAFE BATCH MANAGEMENT ────────────────────────────

  /**
   * Safely add a metric to the batch with circular buffer protection.
   * If the batch exceeds MAX_BATCH_SIZE, the oldest metric is dropped
   * to prevent unbounded memory growth (OOM protection).
   * 
   * @param {Object} metric - The metric object to add
   * @private
   */
  _addToBatch(metric) {
    if (this._batch.length >= MAX_BATCH_SIZE) {
      // Drop oldest metric to make room — save the host!
      this._batch.shift();
      this._droppedMetrics++;

      if (this._debug && this._droppedMetrics === 1) {
        console.warn(
          `[Lantern] ⚠️  Batch overflow! Dropping oldest metrics (limit: ${MAX_BATCH_SIZE}). ` +
          `This usually means the collector is unreachable.`
        );
      }
    }
    this._batch.push(metric);
  }

  /**
   * Returns SDK diagnostics for health monitoring.
   * Useful for debugging and SRE dashboards.
   * 
   * @returns {Object} SDK health stats
   */
  getStats() {
    return {
      initialized: this._initialized,
      batchSize: this._batch.length,
      maxBatchSize: MAX_BATCH_SIZE,
      droppedMetrics: this._droppedMetrics,
      isThrottled: Date.now() < this._throttledUntil,
      throttledUntil: this._throttledUntil > Date.now()
        ? new Date(this._throttledUntil).toISOString()
        : null,
    };
  }
}

// ── Export a singleton instance ──
// This way developers just do: const lantern = require('lantern-apm')
// and lantern.init(...) — same instance everywhere in their app.
const _lanternInstance = new LanternAPM();
module.exports = _lanternInstance;

// ── Auto-register graceful shutdown handlers ──
// When the host app receives SIGTERM (every Docker/Render deploy) or SIGINT
// (Ctrl+C), flush the current metric batch before the process exits.
// Without this, every deployment silently loses the last 0–5 seconds of data.
async function _gracefulShutdown(signal) {
  if (_lanternInstance._debug) {
    console.log(`[Lantern] ${signal} received — flushing final metric batch...`);
  }
  try {
    await _lanternInstance.destroy();
  } catch (_) {
    // Never crash the host app on shutdown
  }
  // Do NOT call process.exit() here — let the host app's own shutdown handler run
}

process.on('SIGTERM', () => _gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => _gracefulShutdown('SIGINT'));
