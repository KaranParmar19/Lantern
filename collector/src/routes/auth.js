'use strict';

const express = require('express');
const User = require('../models/User');
const { hashPassword, comparePassword, generateToken } = require('../services/auth');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * Auth API Routes
 * 
 * POST /api/auth/register  — Create new user
 * POST /api/auth/login     — Login and get JWT
 * GET  /api/auth/me        — Get current user (protected)
 */

/**
 * POST /api/auth/register
 * Body: { name, email, password }
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate
    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Missing fields',
        message: 'name, email, and password are required.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Weak password',
        message: 'Password must be at least 6 characters.',
      });
    }

    // Check if email already exists
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({
        error: 'Email taken',
        message: 'An account with this email already exists.',
      });
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    });

    // Generate JWT
    const token = generateToken(user);

    console.log(`[Lantern Auth] ✅ New user registered: ${user.email}`);
    res.status(201).json({
      token,
      user: user.toJSON(),
    });
  } catch (err) {
    console.error('[Lantern] POST /api/auth/register error:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing fields',
        message: 'email and password are required.',
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect.',
      });
    }

    // Compare password
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect.',
      });
    }

    // Generate JWT
    const token = generateToken(user);

    console.log(`[Lantern Auth] ✅ User logged in: ${user.email}`);
    res.json({
      token,
      user: user.toJSON(),
    });
  } catch (err) {
    console.error('[Lantern] POST /api/auth/login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /api/auth/me
 * Protected — requires JWT
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user.toJSON());
  } catch (err) {
    console.error('[Lantern] GET /api/auth/me error:', err.message);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;
