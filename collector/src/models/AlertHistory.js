'use strict';

const mongoose = require('mongoose');

/**
 * AlertHistory Model
 * 
 * Records every alert that was triggered.
 * Used to display alert history on the dashboard
 * and audit when alerts were fired.
 */
const alertHistorySchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true,
  },

  ruleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AlertRule',
    required: true,
  },

  type: {
    type: String,
    required: true,
    enum: ['error_rate', 'slow_endpoint', 'app_down', 'memory'],
  },

  message: {
    type: String,
    required: true,
  },

  // The actual value that triggered the alert
  actualValue: {
    type: Number,
    default: null,
  },

  // The threshold that was breached
  threshold: {
    type: Number,
    default: null,
  },

  emailSent: {
    type: Boolean,
    default: false,
  },

  triggeredAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for querying recent alerts efficiently
alertHistorySchema.index({ projectId: 1, triggeredAt: -1 });

module.exports = mongoose.model('AlertHistory', alertHistorySchema);
