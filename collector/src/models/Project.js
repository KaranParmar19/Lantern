'use strict';

const mongoose = require('mongoose');

/**
 * Project Model
 * 
 * Each project represents one monitored application.
 * Every project has a unique API key that the SDK uses
 * to authenticate when sending metrics.
 * 
 * The apiKey field is indexed for fast lookups during
 * /ingest validation (happens on every batch send).
 */
const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },

  apiKey: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  // Will be populated in Phase 5 (Auth)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Project', projectSchema);
