'use strict';

const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { hashPassword, comparePassword, generateToken } = require('../services/auth');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Auth API Routes
 *
 * POST /api/auth/register  — Create new user (email + password)
 * POST /api/auth/login     — Login and get JWT (email + password)
 * POST /api/auth/google    — Sign in / register via Google OAuth
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

/**
 * POST /api/auth/google
 * Body: { credential }  — the Google ID token from the frontend
 *
 * Flow:
 *   1. Verify Google ID token using google-auth-library
 *   2. Extract email, name, googleId, avatar from the token payload
 *   3. Find existing user by googleId OR email
 *   4. If new user: create account (no password)
 *   5. If existing email/password user: link their Google account
 *   6. Return Lantern JWT + user object (same shape as /login)
 */
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        error: 'Missing credential',
        message: 'Google ID token is required.',
      });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({
        error: 'Google auth not configured',
        message: 'GOOGLE_CLIENT_ID is not set on the server.',
      });
    }

    // ── 1. Verify the Google ID token ──
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      console.error('[Lantern Auth] Google token verification failed:', verifyErr.message);
      return res.status(401).json({
        error: 'Invalid Google token',
        message: 'The Google credential could not be verified. Please try again.',
      });
    }

    const { sub: googleId, email, name, picture: avatar } = payload;

    if (!email) {
      return res.status(400).json({
        error: 'No email',
        message: 'Your Google account does not have a verified email address.',
      });
    }

    // ── 2. Find or create user ──
    let user = await User.findOne({
      $or: [{ googleId }, { email: email.toLowerCase() }],
    });

    if (user) {
      // Link Google account if this was previously an email/password user
      if (!user.googleId) {
        user.googleId = googleId;
        if (avatar) user.avatar = avatar;
        await user.save();
        console.log(`[Lantern Auth] 🔗 Linked Google account to existing user: ${user.email}`);
      }
    } else {
      // New user — create account without a password
      user = await User.create({
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        googleId,
        avatar: avatar || null,
        password: null,
      });
      console.log(`[Lantern Auth] ✅ New Google user registered: ${user.email}`);
    }

    // ── 3. Issue Lantern JWT ──
    const token = generateToken(user);

    console.log(`[Lantern Auth] ✅ Google sign-in: ${user.email}`);
    res.json({
      token,
      user: user.toJSON(),
    });
  } catch (err) {
    console.error('[Lantern] POST /api/auth/google error:', err.message);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

module.exports = router;
