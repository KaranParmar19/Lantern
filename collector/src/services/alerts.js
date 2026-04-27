'use strict';

const nodemailer = require('nodemailer');
const AlertRule = require('../models/AlertRule');
const AlertHistory = require('../models/AlertHistory');

/**
 * Alerts Service
 * 
 * Checks incoming metrics against user-defined alert rules
 * and sends email notifications via Nodemailer when thresholds
 * are breached.
 * 
 * If SMTP is not configured (no SMTP_HOST env var), emails are
 * logged to console instead — so alerts work out of the box
 * for local development.
 * 
 * Cooldown: each rule has a cooldownMinutes value. After firing,
 * the same rule won't fire again until the cooldown expires.
 */

// ─── SMTP Transport ────────────────────────────────────────

let transporter = null;
const SMTP_CONFIGURED = !!process.env.SMTP_HOST;

if (SMTP_CONFIGURED) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  console.log(`[Lantern] ✅ SMTP configured (${process.env.SMTP_HOST}:${process.env.SMTP_PORT})`);
} else {
  console.log('[Lantern] ℹ️  SMTP not configured — alerts will log to console only.');
  console.log('[Lantern]    Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env to enable email.');
}

const SMTP_FROM = process.env.SMTP_FROM || 'Lantern APM <alerts@lantern-apm.dev>';

// ─── Alert Type Labels ─────────────────────────────────────

const ALERT_TYPE_LABELS = {
  error_rate: 'Error Rate',
  slow_endpoint: 'Slow Endpoint',
  app_down: 'App Down',
  memory: 'High Memory',
};

const ALERT_TYPE_UNITS = {
  error_rate: '%',
  slow_endpoint: 'ms',
  app_down: 'min',
  memory: 'MB',
};

// ─── Check Alert Rules ─────────────────────────────────────

/**
 * Check metrics against all enabled alert rules for a project.
 * Called by the BullMQ worker after processing each batch.
 * 
 * @param {string} projectId
 * @param {Object} aggregates - Calculated aggregates from the worker
 */
async function checkAlertRules(projectId, aggregates) {
  try {
    // Fetch all enabled rules for this project
    const rules = await AlertRule.find({ projectId, enabled: true }).lean();
    if (rules.length === 0) return;

    const now = new Date();

    for (const rule of rules) {
      // Check cooldown — skip if we alerted recently
      if (rule.lastTriggeredAt) {
        const cooldownMs = (rule.cooldownMinutes || 15) * 60 * 1000;
        const timeSinceLastAlert = now.getTime() - new Date(rule.lastTriggeredAt).getTime();
        if (timeSinceLastAlert < cooldownMs) continue;
      }

      // Evaluate the rule against current aggregates
      const result = evaluateRule(rule, aggregates);

      if (result.triggered) {
        await fireAlert(rule, result, projectId);
      }
    }
  } catch (err) {
    console.error('[Lantern Alerts] Error checking rules:', err.message);
  }
}

/**
 * Evaluate a single alert rule against aggregates.
 * 
 * @param {Object} rule - AlertRule document
 * @param {Object} aggregates - { requests: {...}, system: {...} }
 * @returns {{ triggered: boolean, actualValue: number, message: string }}
 */
function evaluateRule(rule, aggregates) {
  const result = { triggered: false, actualValue: 0, message: '' };

  switch (rule.type) {
    case 'error_rate': {
      const errorRate = aggregates?.requests?.errorRate || 0;
      if (errorRate > rule.threshold) {
        result.triggered = true;
        result.actualValue = errorRate;
        result.message = `Error rate is ${errorRate.toFixed(1)}% (threshold: ${rule.threshold}%)`;
      }
      break;
    }

    case 'slow_endpoint': {
      const avgResponseTime = aggregates?.requests?.avgResponseTime || 0;
      if (avgResponseTime > rule.threshold) {
        result.triggered = true;
        result.actualValue = avgResponseTime;
        result.message = `Average response time is ${avgResponseTime.toFixed(0)}ms (threshold: ${rule.threshold}ms)`;
      }
      // Also check individual endpoints
      const byEndpoint = aggregates?.requests?.byEndpoint || {};
      for (const [key, ep] of Object.entries(byEndpoint)) {
        if (ep.avgResponseTime > rule.threshold) {
          result.triggered = true;
          result.actualValue = Math.max(result.actualValue, ep.avgResponseTime);
          result.message = `${key} is responding in ${ep.avgResponseTime.toFixed(0)}ms (threshold: ${rule.threshold}ms)`;
        }
      }
      break;
    }

    case 'memory': {
      const memoryUsed = aggregates?.system?.memory?.heapUsed || 0;
      if (memoryUsed > rule.threshold) {
        result.triggered = true;
        result.actualValue = memoryUsed;
        result.message = `Memory usage is ${memoryUsed.toFixed(1)}MB (threshold: ${rule.threshold}MB)`;
      }
      break;
    }

    case 'app_down': {
      // This is checked differently — handled by a separate timer
      // For now, the worker checks if the batch itself signals downtime
      // Full implementation requires a scheduled job (Phase 6 polish)
      break;
    }
  }

  return result;
}

// ─── Fire Alert ─────────────────────────────────────────────

/**
 * Fire an alert: log it, save to history, send email.
 * 
 * @param {Object} rule - AlertRule document
 * @param {Object} result - { actualValue, message }
 * @param {string} projectId
 */
async function fireAlert(rule, result, projectId) {
  const typeLabel = ALERT_TYPE_LABELS[rule.type] || rule.type;

  console.log(`[Lantern Alerts] 🚨 ALERT TRIGGERED: [${typeLabel}] ${result.message}`);
  console.log(`[Lantern Alerts]    Rule ID: ${rule._id} | Email: ${rule.email}`);

  try {
    // Update rule's lastTriggeredAt
    await AlertRule.findByIdAndUpdate(rule._id, { lastTriggeredAt: new Date() });

    // Save to alert history
    const historyEntry = await AlertHistory.create({
      projectId,
      ruleId: rule._id,
      type: rule.type,
      message: result.message,
      actualValue: result.actualValue,
      threshold: rule.threshold,
      emailSent: false,
    });

    // Send email
    const emailSent = await sendAlertEmail(
      rule.email,
      `🚨 Lantern Alert: ${typeLabel}`,
      buildAlertEmailHTML(rule, result)
    );

    // Update history with email status
    if (emailSent) {
      await AlertHistory.findByIdAndUpdate(historyEntry._id, { emailSent: true });
    }
  } catch (err) {
    console.error('[Lantern Alerts] Error firing alert:', err.message);
  }
}

// ─── Send Email ─────────────────────────────────────────────

/**
 * Send an alert email via Nodemailer.
 * If SMTP is not configured, logs to console instead.
 * 
 * @param {string} to - Recipient email
 * @param {string} subject
 * @param {string} html - HTML email body
 * @returns {boolean} true if sent successfully
 */
async function sendAlertEmail(to, subject, html) {
  if (!SMTP_CONFIGURED || !transporter) {
    console.log(`[Lantern Alerts] 📧 EMAIL (console-only):`);
    console.log(`[Lantern Alerts]    To: ${to}`);
    console.log(`[Lantern Alerts]    Subject: ${subject}`);
    console.log(`[Lantern Alerts]    (Set SMTP_HOST in .env to send real emails)`);
    return false;
  }

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      html,
    });
    console.log(`[Lantern Alerts] ✅ Email sent to ${to}`);
    return true;
  } catch (err) {
    console.error(`[Lantern Alerts] ❌ Email failed: ${err.message}`);
    return false;
  }
}

// ─── Email HTML Template ────────────────────────────────────

/**
 * Build a branded HTML email for an alert.
 */
function buildAlertEmailHTML(rule, result) {
  const typeLabel = ALERT_TYPE_LABELS[rule.type] || rule.type;
  const unit = ALERT_TYPE_UNITS[rule.type] || '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;">
      <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
        
        <!-- Header -->
        <div style="text-align:center;margin-bottom:32px;">
          <div style="display:inline-block;background:linear-gradient(135deg,#8B5CF6,#6D28D9);border-radius:12px;padding:12px 16px;margin-bottom:12px;">
            <span style="font-size:24px;">🏮</span>
          </div>
          <h1 style="color:#f0f0f5;font-size:22px;margin:8px 0 4px;">Lantern APM Alert</h1>
          <p style="color:#8b8ba3;font-size:13px;margin:0;">${new Date().toLocaleString()}</p>
        </div>

        <!-- Alert Card -->
        <div style="background:#111119;border:1px solid rgba(239,68,68,0.3);border-radius:12px;padding:24px;margin-bottom:24px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
            <span style="font-size:20px;">🚨</span>
            <span style="color:#EF4444;font-size:16px;font-weight:700;">${typeLabel} Alert</span>
          </div>
          <p style="color:#f0f0f5;font-size:15px;margin:0 0 16px;line-height:1.5;">
            ${result.message}
          </p>
          <div style="display:flex;gap:16px;">
            <div style="background:rgba(239,68,68,0.1);border-radius:8px;padding:12px 16px;flex:1;">
              <div style="color:#8b8ba3;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Actual</div>
              <div style="color:#EF4444;font-size:20px;font-weight:800;">${result.actualValue}${unit}</div>
            </div>
            <div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:12px 16px;flex:1;">
              <div style="color:#8b8ba3;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Threshold</div>
              <div style="color:#f0f0f5;font-size:20px;font-weight:800;">${rule.threshold}${unit}</div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <p style="color:#5a5a72;font-size:12px;text-align:center;margin:0;">
          This alert was sent by Lantern APM. Manage your alert rules in the dashboard.
        </p>
      </div>
    </body>
    </html>
  `;
}

module.exports = { checkAlertRules, sendAlertEmail };
