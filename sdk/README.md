# 🏮 Lantern APM — SDK

> Lightweight, zero-dependency Application Performance Monitoring for Node.js & Express.

Add 2 lines of code. See everything about your app's health — response times, errors, memory, CPU — in real time.

---

## ⚡ Quick Start

```bash
npm install lantern-apm
```

```js
const express = require('express');
const lantern = require('lantern-apm');

const app = express();

// 1. Initialize with your project key and collector URL
lantern.init({
  projectKey: 'ltrn_live_xxxxxxxxxxxx',
  collectorURL: 'https://your-collector.onrender.com',
});

// 2. Add the middleware — that's it!
app.use(lantern.middleware());

app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.listen(3000);
```

That's it. Lantern will now silently capture every request and send metrics to your dashboard.

---

## 📊 What Gets Captured

### Request Metrics (every request)
| Field | Description |
|-------|-------------|
| `method` | HTTP method (GET, POST, etc.) |
| `endpoint` | Route path (e.g., `/api/users`) |
| `statusCode` | Response status (200, 404, 500, etc.) |
| `responseTime` | Duration in milliseconds (nanosecond precision) |
| `isError` | `true` if status code >= 400 |
| `errorMessage` | Error description for failed requests |
| `requestId` | Unique ID for error correlation |
| `timestamp` | ISO 8601 timestamp |

### System Metrics (every 30 seconds)
| Field | Description |
|-------|-------------|
| `memory.heapUsed` | Heap memory in use (MB) |
| `memory.heapTotal` | Total heap allocated (MB) |
| `memory.rss` | Resident set size (MB) |
| `cpu.userPercent` | User CPU utilization (%) |
| `cpu.systemPercent` | System CPU utilization (%) |

---

## ⚙️ Configuration

```js
lantern.init({
  // Required
  projectKey: 'ltrn_live_xxxxxxxxxxxx',    // Your project API key
  collectorURL: 'https://collector.com',    // Collector server URL

  // Optional
  flushInterval: 5000,           // Batch flush interval (default: 5000ms)
  systemMetricsInterval: 30000,  // System metrics capture interval (default: 30000ms)
  debug: false,                  // Log metrics to console (default: false)
});
```

---

## 🛡️ Performance Guarantees

- **Zero dependencies** — uses only Node.js built-ins
- **< 1ms latency added** per request — nanosecond timer overhead only
- **Non-blocking flushes** — metrics are batched and sent async (fire-and-forget)
- **Safe timers** — all intervals use `.unref()` and never prevent process exit
- **Crash-proof** — every operation wrapped in try/catch; SDK errors never propagate to your app
- **Smart batching** — snapshot & clear strategy prevents data loss during async sends

---

## 🔧 Advanced Usage

### Graceful Shutdown

```js
process.on('SIGTERM', async () => {
  await lantern.destroy(); // Flushes remaining metrics and clears timers
  process.exit(0);
});
```

### Debug Mode

Set `debug: true` to see metrics logged in your console:

```
[Lantern] ✅ SDK initialized successfully.
[Lantern] 🟢 GET /api/users → 200 (3.42ms)
[Lantern] 🔴 GET /api/error → 500 (1.07ms)
[Lantern] 📊 System: Memory 45.2MB / 68.1MB | CPU User 12.5% System 3.2%
[Lantern] 📤 Flushing 5 metric(s)...
```

---

## 📋 Requirements

- **Node.js 18+** — required for built-in `fetch` API
- **Express.js** — the middleware is designed for Express (compatible with v4 and v5)

---

## 📄 License

MIT
