'use strict';

const mongoose = require('mongoose');

/**
 * User Model
 *
 * Dashboard users who can create projects and view metrics.
 * Supports two auth methods:
 *   1. Email + Password  (password is bcrypt-hashed, googleId is null)
 *   2. Google OAuth      (password is null, googleId is the Google sub)
 */
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    lowercase: true,
  },

  // Null for Google OAuth users
  password: {
    type: String,
    required: false,
    default: null,
    minlength: 6,
  },

  // Google OAuth fields — null for email/password users
  googleId: {
    type: String,
    default: null,
    index: true,
    sparse: true, // allows multiple null values in unique index
  },

  avatar: {
    type: String,
    default: null,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Never return password in JSON responses
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
