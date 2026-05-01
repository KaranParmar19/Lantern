'use strict';

const { Queue } = require('bullmq');
const IORedis = require('ioredis');

/**
 * BullMQ Queue Setup
 * 
 * Creates a Redis-backed job queue named 'ingest-metrics'.
 * The /ingest route pushes jobs here, and the metricsWorker
 * processes them asynchronously.
 * 
 * Why queue instead of writing to InfluxDB directly?
 * → The collector must respond in < 10ms. Writing to InfluxDB
 *   takes 20-100ms. The queue decouples ingestion from storage
 *   so traffic spikes never overwhelm the database.
 */

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

// Shared Redis connection config
const redisConfig = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: null, // Required by BullMQ
};

// Create a shared IORedis connection for the queue
const connection = new IORedis(redisConfig);

connection.on('connect', () => {
  console.log(`[Lantern] ✅ Redis connected (${REDIS_HOST}:${REDIS_PORT})`);
});

connection.on('error', (err) => {
  console.error('[Lantern] ❌ Redis connection error:', err.message);
});

// Create the metrics ingestion queue
const metricsQueue = new Queue('ingest-metrics', {
  connection,
  defaultJobOptions: {
    removeOnComplete: {
      count: 1000, // Keep last 1000 completed jobs for debugging
      age: 3600,   // Remove completed jobs older than 1 hour
    },
    removeOnFail: {
      count: 5000, // Keep last 5000 failed jobs for inspection
    },
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000, // 1s, 4s, 16s
    },
  },
});

/**
 * Returns the shared IORedis connection for reuse in other modules.
 * Used by the ingest route for rate limiting without creating extra connections.
 */
function getRedisClient() {
  return connection;
}

module.exports = { metricsQueue, redisConfig, getRedisClient };
