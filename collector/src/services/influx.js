'use strict';

const { InfluxDB, Point } = require('@influxdata/influxdb-client');

/**
 * InfluxDB Service
 * 
 * Handles writing AND querying metrics in InfluxDB.
 * 
 * Two measurements:
 *   - 'requests': per-request data (endpoint, method, response time, errors)
 *   - 'system':   system health (memory, CPU usage)
 * 
 * Why InfluxDB instead of MongoDB for metrics?
 * → Time-series queries like "average response time over the last 30 minutes
 *   grouped by minute" are what InfluxDB is built for. MongoDB would struggle
 *   with these aggregations at scale, and InfluxDB has built-in retention
 *   policies and downsampling.
 */

const INFLUX_URL = process.env.INFLUX_URL || 'http://localhost:8086';
const INFLUX_TOKEN = process.env.INFLUX_TOKEN || 'lantern-dev-token';
const INFLUX_ORG = process.env.INFLUX_ORG || 'lantern';
const INFLUX_BUCKET = process.env.INFLUX_BUCKET || 'metrics';

// Create InfluxDB client
const influxDB = new InfluxDB({
  url: INFLUX_URL,
  token: INFLUX_TOKEN,
});

// Write API — uses batching internally for efficiency
const writeApi = influxDB.getWriteApi(INFLUX_ORG, INFLUX_BUCKET, 'ms', {
  batchSize: 100,       // Flush after 100 points
  flushInterval: 1000,  // Or flush every 1 second
  maxRetries: 3,
  retryJitter: 200,
});

// Query API — used by dashboard routes to read metrics
const queryApi = influxDB.getQueryApi(INFLUX_ORG);

// Set default tags for all writes
writeApi.useDefaultTags({ service: 'lantern-collector' });

console.log(`[Lantern] ✅ InfluxDB client configured (${INFLUX_URL}, bucket: ${INFLUX_BUCKET})`);

// ─── WRITE FUNCTIONS ──────────────────────────────────────────

/**
 * Write an array of request metrics to the 'requests' measurement.
 * 
 * @param {string} projectId - The project this data belongs to
 * @param {Array} metrics - Array of request metric objects from the SDK
 */
function writeRequestMetrics(projectId, metrics) {
  for (const metric of metrics) {
    const point = new Point('requests')
      .tag('projectId', projectId)
      .tag('endpoint', metric.endpoint || '/unknown')
      .tag('method', metric.method || 'UNKNOWN')
      .tag('statusCode', String(metric.statusCode || 0))
      .floatField('responseTime', metric.responseTime || 0)
      .booleanField('isError', metric.isError || false)
      .stringField('errorMessage', metric.errorMessage || '')
      .stringField('requestId', metric.requestId || '')
      .timestamp(new Date(metric.timestamp));

    writeApi.writePoint(point);
  }
}

/**
 * Write an array of system metrics to the 'system' measurement.
 * 
 * @param {string} projectId - The project this data belongs to
 * @param {Array} metrics - Array of system metric objects from the SDK
 */
function writeSystemMetrics(projectId, metrics) {
  for (const metric of metrics) {
    const memory = metric.memory || {};
    const cpu = metric.cpu || {};

    const point = new Point('system')
      .tag('projectId', projectId)
      .floatField('memoryHeapUsed', memory.heapUsed || 0)
      .floatField('memoryHeapTotal', memory.heapTotal || 0)
      .floatField('memoryRss', memory.rss || 0)
      .floatField('memoryExternal', memory.external || 0)
      .floatField('cpuUser', cpu.userPercent || 0)
      .floatField('cpuSystem', cpu.systemPercent || 0)
      .timestamp(new Date(metric.timestamp));

    writeApi.writePoint(point);
  }
}

// ─── QUERY FUNCTIONS (Phase 3 — Dashboard) ────────────────────

/**
 * Helper: collect all rows from a Flux query into an array.
 * @param {string} query - Flux query string
 * @returns {Promise<Array>} Array of row objects
 */
function _collectRows(query) {
  return new Promise((resolve, reject) => {
    const rows = [];
    queryApi.queryRows(query, {
      next(row, tableMeta) {
        rows.push(tableMeta.toObject(row));
      },
      error(err) {
        reject(err);
      },
      complete() {
        resolve(rows);
      },
    });
  });
}

/**
 * Overview stats: total requests, avg response time, error count, error rate.
 * Used by the Overview page stat cards.
 * 
 * @param {string} projectId
 * @param {string} range - Flux duration (e.g., '-24h', '-1h', '-30m')
 */
async function queryOverviewStats(projectId, range = '-24h') {
  // Total requests
  const countQuery = `
    from(bucket: "${INFLUX_BUCKET}")
      |> range(start: ${range})
      |> filter(fn: (r) => r._measurement == "requests" and r.projectId == "${projectId}")
      |> filter(fn: (r) => r._field == "responseTime")
      |> count()
      |> yield(name: "count")
  `;

  // Average response time
  const avgQuery = `
    from(bucket: "${INFLUX_BUCKET}")
      |> range(start: ${range})
      |> filter(fn: (r) => r._measurement == "requests" and r.projectId == "${projectId}")
      |> filter(fn: (r) => r._field == "responseTime")
      |> mean()
      |> yield(name: "mean")
  `;

  // Error count
  const errorQuery = `
    from(bucket: "${INFLUX_BUCKET}")
      |> range(start: ${range})
      |> filter(fn: (r) => r._measurement == "requests" and r.projectId == "${projectId}")
      |> filter(fn: (r) => r._field == "isError" and r._value == true)
      |> count()
      |> yield(name: "errors")
  `;

  // Last data point timestamp (for uptime check)
  const lastQuery = `
    from(bucket: "${INFLUX_BUCKET}")
      |> range(start: ${range})
      |> filter(fn: (r) => r._measurement == "requests" and r.projectId == "${projectId}")
      |> filter(fn: (r) => r._field == "responseTime")
      |> last()
      |> yield(name: "last")
  `;

  try {
    const [countRows, avgRows, errorRows, lastRows] = await Promise.all([
      _collectRows(countQuery),
      _collectRows(avgQuery),
      _collectRows(errorQuery),
      _collectRows(lastQuery),
    ]);

    const totalRequests = countRows.length > 0 ? countRows[0]._value : 0;
    const avgResponseTime = avgRows.length > 0 ? parseFloat(avgRows[0]._value.toFixed(2)) : 0;
    const errorCount = errorRows.length > 0 ? errorRows[0]._value : 0;
    const errorRate = totalRequests > 0 ? parseFloat(((errorCount / totalRequests) * 100).toFixed(2)) : 0;
    const lastDataAt = lastRows.length > 0 ? lastRows[0]._time : null;

    return {
      totalRequests,
      avgResponseTime,
      errorCount,
      errorRate,
      lastDataAt,
    };
  } catch (err) {
    console.error('[Lantern] queryOverviewStats error:', err.message);
    return { totalRequests: 0, avgResponseTime: 0, errorCount: 0, errorRate: 0, lastDataAt: null };
  }
}

/**
 * Requests per minute over time. Used by the RPM line chart.
 * 
 * @param {string} projectId
 * @param {string} range - Flux duration (default: last 30 minutes)
 */
async function queryRequestsPerMinute(projectId, range = '-30m') {
  const query = `
    from(bucket: "${INFLUX_BUCKET}")
      |> range(start: ${range})
      |> filter(fn: (r) => r._measurement == "requests" and r.projectId == "${projectId}")
      |> filter(fn: (r) => r._field == "responseTime")
      |> aggregateWindow(every: 1m, fn: count, createEmpty: true)
      |> yield(name: "rpm")
  `;

  try {
    const rows = await _collectRows(query);
    return rows.map((r) => ({
      time: r._time,
      value: r._value || 0,
    }));
  } catch (err) {
    console.error('[Lantern] queryRequestsPerMinute error:', err.message);
    return [];
  }
}

/**
 * Average response time over time. Used by the response time line chart.
 * 
 * @param {string} projectId
 * @param {string} range - Flux duration (default: last 30 minutes)
 */
async function queryResponseTime(projectId, range = '-30m') {
  const query = `
    from(bucket: "${INFLUX_BUCKET}")
      |> range(start: ${range})
      |> filter(fn: (r) => r._measurement == "requests" and r.projectId == "${projectId}")
      |> filter(fn: (r) => r._field == "responseTime")
      |> aggregateWindow(every: 1m, fn: mean, createEmpty: true)
      |> yield(name: "response_time")
  `;

  try {
    const rows = await _collectRows(query);
    return rows.map((r) => ({
      time: r._time,
      value: r._value != null ? parseFloat(r._value.toFixed(2)) : null,
    }));
  } catch (err) {
    console.error('[Lantern] queryResponseTime error:', err.message);
    return [];
  }
}

/**
 * Per-endpoint aggregates. Used by the Endpoints table.
 * Returns: endpoint, method, avgResponseTime, errorRate, totalCalls
 * 
 * @param {string} projectId
 * @param {string} range - Flux duration (default: last 24 hours)
 */
async function queryEndpoints(projectId, range = '-24h') {
  // Get response time stats per endpoint
  const rtQuery = `
    from(bucket: "${INFLUX_BUCKET}")
      |> range(start: ${range})
      |> filter(fn: (r) => r._measurement == "requests" and r.projectId == "${projectId}")
      |> filter(fn: (r) => r._field == "responseTime")
      |> group(columns: ["endpoint", "method"])
      |> reduce(
           fn: (r, accumulator) => ({
             sum: accumulator.sum + r._value,
             count: accumulator.count + 1.0
           }),
           identity: { sum: 0.0, count: 0.0 }
         )
      |> map(fn: (r) => ({ r with avg: r.sum / r.count }))
      |> yield(name: "rt_stats")
  `;

  // Get error count per endpoint
  const errQuery = `
    from(bucket: "${INFLUX_BUCKET}")
      |> range(start: ${range})
      |> filter(fn: (r) => r._measurement == "requests" and r.projectId == "${projectId}")
      |> filter(fn: (r) => r._field == "isError" and r._value == true)
      |> group(columns: ["endpoint", "method"])
      |> count()
      |> yield(name: "error_counts")
  `;

  try {
    const [rtRows, errRows] = await Promise.all([
      _collectRows(rtQuery),
      _collectRows(errQuery),
    ]);

    // Build error lookup: "METHOD /path" → error count
    const errorMap = {};
    for (const row of errRows) {
      const key = `${row.method} ${row.endpoint}`;
      errorMap[key] = row._value || 0;
    }

    // Combine into endpoint list
    const endpoints = rtRows.map((row) => {
      const key = `${row.method} ${row.endpoint}`;
      const totalCalls = row.count || 0;
      const errorCount = errorMap[key] || 0;
      const errorRate = totalCalls > 0 ? parseFloat(((errorCount / totalCalls) * 100).toFixed(2)) : 0;
      const avgResponseTime = row.avg != null ? parseFloat(row.avg.toFixed(2)) : 0;

      // Determine health status
      let status = 'healthy';
      if (avgResponseTime > 1000 || errorRate > 5) {
        status = 'critical';
      } else if (avgResponseTime > 300 || errorRate > 1) {
        status = 'warning';
      }

      return {
        endpoint: row.endpoint,
        method: row.method,
        avgResponseTime,
        errorRate,
        errorCount,
        totalCalls,
        status,
      };
    });

    // Sort by slowest first
    endpoints.sort((a, b) => b.avgResponseTime - a.avgResponseTime);

    return endpoints;
  } catch (err) {
    console.error('[Lantern] queryEndpoints error:', err.message);
    return [];
  }
}

/**
 * Error feed: all requests where isError == true.
 * Used by the Errors page.
 * 
 * @param {string} projectId
 * @param {string} range - Flux duration (default: last 24 hours)
 * @param {string} [filterEndpoint] - Optional: filter by endpoint
 * @param {string} [filterStatusCode] - Optional: filter by status code
 */
async function queryErrors(projectId, range = '-24h', filterEndpoint = null, filterStatusCode = null) {
  let filters = `r._measurement == "requests" and r.projectId == "${projectId}"`;
  if (filterEndpoint) {
    filters += ` and r.endpoint == "${filterEndpoint}"`;
  }
  if (filterStatusCode) {
    filters += ` and r.statusCode == "${filterStatusCode}"`;
  }

  // We need both isError=true rows and their corresponding errorMessage + responseTime
  // Pivot combines fields from the same timestamp into a single row
  const query = `
    from(bucket: "${INFLUX_BUCKET}")
      |> range(start: ${range})
      |> filter(fn: (r) => ${filters})
      |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
      |> filter(fn: (r) => r.isError == true)
      |> sort(columns: ["_time"], desc: true)
      |> limit(n: 200)
      |> yield(name: "errors")
  `;

  try {
    const rows = await _collectRows(query);
    return rows.map((r) => ({
      timestamp: r._time,
      endpoint: r.endpoint,
      method: r.method,
      statusCode: r.statusCode,
      responseTime: r.responseTime,
      errorMessage: r.errorMessage || '',
      requestId: r.requestId || '',
    }));
  } catch (err) {
    console.error('[Lantern] queryErrors error:', err.message);
    return [];
  }
}

/**
 * System metrics over time (memory + CPU).
 * Used by the System Health page.
 * 
 * @param {string} projectId
 * @param {string} range - Flux duration (default: last 24 hours)
 */
async function querySystemMetrics(projectId, range = '-24h') {
  const query = `
    from(bucket: "${INFLUX_BUCKET}")
      |> range(start: ${range})
      |> filter(fn: (r) => r._measurement == "system" and r.projectId == "${projectId}")
      |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
      |> sort(columns: ["_time"])
      |> yield(name: "system")
  `;

  try {
    const rows = await _collectRows(query);
    return rows.map((r) => ({
      time: r._time,
      memoryHeapUsed: r.memoryHeapUsed || 0,
      memoryHeapTotal: r.memoryHeapTotal || 0,
      memoryRss: r.memoryRss || 0,
      cpuUser: r.cpuUser || 0,
      cpuSystem: r.cpuSystem || 0,
    }));
  } catch (err) {
    console.error('[Lantern] querySystemMetrics error:', err.message);
    return [];
  }
}

// ─── LIFECYCLE ────────────────────────────────────────────────

/**
 * Flush any buffered writes to InfluxDB.
 * Called during graceful shutdown.
 */
async function flushWrites() {
  try {
    await writeApi.flush();
    console.log('[Lantern] InfluxDB writes flushed.');
  } catch (err) {
    console.error('[Lantern] InfluxDB flush error:', err.message);
  }
}

/**
 * Close the write API connection.
 * Called during graceful shutdown.
 */
async function closeInflux() {
  try {
    await writeApi.close();
    console.log('[Lantern] InfluxDB connection closed.');
  } catch (err) {
    console.error('[Lantern] InfluxDB close error:', err.message);
  }
}

module.exports = {
  influxDB,
  writeRequestMetrics,
  writeSystemMetrics,
  flushWrites,
  closeInflux,
  // Query functions (Phase 3 — Dashboard)
  queryOverviewStats,
  queryRequestsPerMinute,
  queryResponseTime,
  queryEndpoints,
  queryErrors,
  querySystemMetrics,
  // Config exports
  INFLUX_ORG,
  INFLUX_BUCKET,
};
