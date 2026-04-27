'use strict';

const Project = require('../models/Project');

/**
 * API Key Validation Middleware
 * 
 * Validates the x-api-key header against the projects collection.
 * Uses an in-memory cache (Map) with 5-minute TTL to avoid
 * hitting MongoDB on every single /ingest request.
 * 
 * Without caching, a busy app sending batches every 5 seconds
 * would cause a DB query every 5 seconds per monitored app.
 * With caching: one DB query per app every 5 minutes.
 * 
 * Cache flow:
 *   1. Check if key is in cache AND not expired
 *   2. If yes → attach project to req, call next()
 *   3. If no  → query MongoDB → cache result → proceed
 */

// In-memory cache: apiKey → { project, expiresAt }
const keyCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function validateAPIKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      error: 'Missing API key',
      message: 'Include your project API key in the x-api-key header.',
    });
  }

  // ── Check cache first ──
  const cached = keyCache.get(apiKey);

  if (cached && cached.expiresAt > Date.now()) {
    req.project = cached.project;
    return next();
  }

  // ── Cache miss or expired — query MongoDB ──
  Project.findOne({ apiKey })
    .lean()
    .then((project) => {
      if (!project) {
        return res.status(401).json({
          error: 'Invalid API key',
          message: 'The provided API key does not match any project.',
        });
      }

      // Cache the validated project
      keyCache.set(apiKey, {
        project: {
          id: project._id.toString(),
          name: project.name,
          apiKey: project.apiKey,
        },
        expiresAt: Date.now() + CACHE_TTL_MS,
      });

      req.project = {
        id: project._id.toString(),
        name: project.name,
        apiKey: project.apiKey,
      };

      next();
    })
    .catch((err) => {
      console.error('[Lantern] API key validation error:', err.message);
      return res.status(500).json({ error: 'Internal server error during authentication' });
    });
}

/**
 * Clear a specific key from the cache (useful when keys are regenerated).
 * @param {string} apiKey
 */
function invalidateCachedKey(apiKey) {
  keyCache.delete(apiKey);
}

/**
 * Clear the entire cache (useful for testing).
 */
function clearKeyCache() {
  keyCache.clear();
}

module.exports = { validateAPIKey, invalidateCachedKey, clearKeyCache };
