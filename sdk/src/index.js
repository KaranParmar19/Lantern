'use strict';

const crypto = require('crypto');

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

            // Extract endpoint path (strip query string for cleaner grouping)
            const endpoint = (req.originalUrl || req.url || '/').split('?')[0];

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

            // Push to batch (will be flushed on next interval)
            this._batch.push(metric);

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

      this._batch.push(metric);

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

      // ── Snapshot & Clear ──
      // Copy the batch and clear the original immediately.
      // This way, new metrics arriving during the async send
      // go into a fresh batch and are never lost.
      const batchCopy = this._batch.slice();
      this._batch = [];

      if (this._debug) {
        console.log(`[Lantern] 📤 Flushing ${batchCopy.length} metric(s)...`);
      }

      // ── Send to collector ──
      const success = await this._sendBatch(batchCopy);

      if (!success) {
        // ── Retry once after 2 seconds ──
        if (this._debug) {
          console.log('[Lantern] ⚠️  First flush failed. Retrying in 2 seconds...');
        }

        setTimeout(async () => {
          try {
            const retrySuccess = await this._sendBatch(batchCopy);
            if (!retrySuccess && this._debug) {
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

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this._config.projectKey,
        },
        body: JSON.stringify({ metrics: batch }),
        // AbortController timeout — don't hang forever
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

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
}

// ── Export a singleton instance ──
// This way developers just do: const lantern = require('lantern-apm')
// and lantern.init(...) — same instance everywhere in their app.
module.exports = new LanternAPM();
