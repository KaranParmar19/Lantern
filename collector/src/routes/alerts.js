'use strict';

const express = require('express');
const AlertRule = require('../models/AlertRule');
const AlertHistory = require('../models/AlertHistory');

const router = express.Router();

/**
 * Alerts API Routes
 * 
 * CRUD operations for alert rules + alert history.
 * All routes require ?projectId= query param (JWT auth added in Phase 5).
 */

// ── Middleware: require projectId ──
router.use((req, res, next) => {
  const projectId = req.query.projectId || req.body?.projectId;
  if (!projectId) {
    return res.status(400).json({
      error: 'Missing projectId',
      message: 'Include projectId in query string or request body.',
    });
  }
  req.projectId = projectId;
  next();
});

/**
 * GET /api/alerts?projectId=xxx
 * List all alert rules for a project.
 */
router.get('/', async (req, res) => {
  try {
    const rules = await AlertRule.find({ projectId: req.projectId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(rules);
  } catch (err) {
    console.error('[Lantern] GET /api/alerts error:', err.message);
    res.status(500).json({ error: 'Failed to fetch alert rules' });
  }
});

/**
 * POST /api/alerts
 * Create a new alert rule.
 * Body: { projectId, type, threshold, email, cooldownMinutes? }
 */
router.post('/', async (req, res) => {
  try {
    const { type, threshold, email, cooldownMinutes } = req.body;

    // Validate required fields
    if (!type || threshold == null || !email) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'type, threshold, and email are required.',
      });
    }

    // Validate type
    const validTypes = ['error_rate', 'slow_endpoint', 'app_down', 'memory'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Invalid alert type',
        message: `type must be one of: ${validTypes.join(', ')}`,
      });
    }

    const rule = await AlertRule.create({
      projectId: req.projectId,
      type,
      threshold: Number(threshold),
      email: email.trim().toLowerCase(),
      cooldownMinutes: cooldownMinutes || 15,
    });

    console.log(`[Lantern Alerts] ✅ New rule created: [${type}] threshold=${threshold} → ${email}`);
    res.status(201).json(rule);
  } catch (err) {
    console.error('[Lantern] POST /api/alerts error:', err.message);
    res.status(500).json({ error: 'Failed to create alert rule' });
  }
});

/**
 * PUT /api/alerts/:id?projectId=xxx
 * Update an alert rule (toggle enable, change threshold, etc.)
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};

    // Only allow specific fields to be updated
    if (req.body.threshold != null) updates.threshold = Number(req.body.threshold);
    if (req.body.email) updates.email = req.body.email.trim().toLowerCase();
    if (req.body.enabled != null) updates.enabled = Boolean(req.body.enabled);
    if (req.body.cooldownMinutes != null) updates.cooldownMinutes = Number(req.body.cooldownMinutes);

    const rule = await AlertRule.findOneAndUpdate(
      { _id: id, projectId: req.projectId },
      { $set: updates },
      { new: true }
    );

    if (!rule) {
      return res.status(404).json({ error: 'Alert rule not found' });
    }

    console.log(`[Lantern Alerts] ✏️  Rule ${id} updated:`, updates);
    res.json(rule);
  } catch (err) {
    console.error('[Lantern] PUT /api/alerts error:', err.message);
    res.status(500).json({ error: 'Failed to update alert rule' });
  }
});

/**
 * DELETE /api/alerts/:id?projectId=xxx
 * Delete an alert rule.
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const rule = await AlertRule.findOneAndDelete({ _id: id, projectId: req.projectId });

    if (!rule) {
      return res.status(404).json({ error: 'Alert rule not found' });
    }

    console.log(`[Lantern Alerts] 🗑️  Rule ${id} deleted`);
    res.json({ deleted: true, id });
  } catch (err) {
    console.error('[Lantern] DELETE /api/alerts error:', err.message);
    res.status(500).json({ error: 'Failed to delete alert rule' });
  }
});

/**
 * GET /api/alerts/history?projectId=xxx&limit=50
 * Get recent alert history for a project.
 */
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const history = await AlertHistory.find({ projectId: req.projectId })
      .sort({ triggeredAt: -1 })
      .limit(limit)
      .lean();
    res.json(history);
  } catch (err) {
    console.error('[Lantern] GET /api/alerts/history error:', err.message);
    res.status(500).json({ error: 'Failed to fetch alert history' });
  }
});

module.exports = router;
