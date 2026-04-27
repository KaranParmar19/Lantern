'use strict';

const express = require('express');
const crypto = require('crypto');
const Project = require('../models/Project');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * Projects API Routes (all protected by JWT)
 * 
 * GET    /api/projects          — List user's projects
 * POST   /api/projects          — Create a new project
 * DELETE /api/projects/:id      — Delete a project
 * POST   /api/projects/:id/regenerate-key — Regenerate API key
 */

// All routes require authentication
router.use(authMiddleware);

/**
 * Generate a unique Lantern API key.
 * Format: ltrn_live_<32 random hex chars>
 */
function generateAPIKey() {
  return `ltrn_live_${crypto.randomBytes(16).toString('hex')}`;
}

/**
 * GET /api/projects
 * List all projects belonging to the logged-in user.
 */
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(projects);
  } catch (err) {
    console.error('[Lantern] GET /api/projects error:', err.message);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

/**
 * POST /api/projects
 * Create a new project with auto-generated API key.
 * Body: { name }
 */
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Missing name',
        message: 'Project name is required.',
      });
    }

    const project = await Project.create({
      name: name.trim(),
      apiKey: generateAPIKey(),
      userId: req.user.id,
    });

    console.log(`[Lantern] ✅ New project created: "${project.name}" by ${req.user.email}`);
    res.status(201).json(project);
  } catch (err) {
    console.error('[Lantern] POST /api/projects error:', err.message);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

/**
 * DELETE /api/projects/:id
 * Delete a project (only if owned by the user).
 */
router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    console.log(`[Lantern] 🗑️  Project "${project.name}" deleted by ${req.user.email}`);
    res.json({ deleted: true, id: req.params.id });
  } catch (err) {
    console.error('[Lantern] DELETE /api/projects error:', err.message);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

/**
 * POST /api/projects/:id/regenerate-key
 * Regenerate the API key for a project.
 */
router.post('/:id/regenerate-key', async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { apiKey: generateAPIKey() } },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    console.log(`[Lantern] 🔄 API key regenerated for "${project.name}"`);
    res.json(project);
  } catch (err) {
    console.error('[Lantern] POST regenerate-key error:', err.message);
    res.status(500).json({ error: 'Failed to regenerate API key' });
  }
});

module.exports = router;
