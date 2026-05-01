'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Auth Service
 * 
 * Handles password hashing (bcrypt) and JWT token
 * generation/verification for dashboard authentication.
 */

const JWT_SECRET = process.env.JWT_SECRET; // No default — validated at startup in index.js
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
const SALT_ROUNDS = 12; // OWASP minimum recommendation for bcrypt

/**
 * Hash a plain-text password with bcrypt.
 * @param {string} plainPassword
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Compare a plain-text password against a bcrypt hash.
 * @param {string} plainPassword
 * @param {string} hashedPassword
 * @returns {Promise<boolean>}
 */
async function comparePassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Generate a JWT token for an authenticated user.
 * @param {Object} user - User document { _id, email, name }
 * @returns {string} Signed JWT
 */
function generateToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

/**
 * Verify and decode a JWT token.
 * @param {string} token
 * @returns {Object} Decoded payload { id, email, name }
 * @throws {Error} If token is invalid or expired
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { hashPassword, comparePassword, generateToken, verifyToken };
