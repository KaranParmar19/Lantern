'use strict';

const mongoose = require('mongoose');

/**
 * AlertRule Model
 * 
 * Stores user-defined alert rules for a project.
 * The metrics worker checks these rules on every batch
 * and triggers an email if the threshold is breached.
 * 
 * Cooldown: after firing, the same rule won't fire again
 * until cooldownMinutes have elapsed — prevents inbox spam.
 */
const alertRuleSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true,
  },

  // Alert type determines what metric to check
  type: {
    type: String,
    required: true,
    enum: ['error_rate', 'slow_endpoint', 'app_down', 'memory'],
  },

  // Threshold value — meaning depends on type:
  //   error_rate:    percentage (e.g., 5 = 5%)
  //   slow_endpoint: milliseconds (e.g., 2000 = 2s)
  //   app_down:      minutes of no data (e.g., 2)
  //   memory:        megabytes (e.g., 500)
  threshold: {
    type: Number,
    required: true,
  },

  // Email address to notify
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },

  enabled: {
    type: Boolean,
    default: true,
  },

  // Prevent duplicate alerts — don't re-fire within this window
  cooldownMinutes: {
    type: Number,
    default: 15,
  },

  // Last time this rule triggered an alert
  lastTriggeredAt: {
    type: Date,
    default: null,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('AlertRule', alertRuleSchema);
