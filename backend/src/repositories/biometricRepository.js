'use strict';
/**
 * biometricRepository.js — Persistence queries for biometric_templates and auth_logs.
 *
 * Template representation agreed with Shree Sai (biometric Python service):
 *   template_data  TEXT — base64-encoded float32 numpy array (HOG descriptor, 1568-dim)
 *   method         TEXT — e.g. 'hog-baseline-v1'
 *
 * Query contract:
 *   getTemplate(userId)                              → template row | null
 *   upsertTemplate(userId, templateData, method)     → upserted row
 *   recordAuthAttempt(userId, method, result, score) → new auth_log row
 *   getAuthLogs(userId, limit)                       → array of log rows
 */

const db = require('../config/db');

/**
 * Retrieve the stored biometric template for a user.
 * Returns null if the user has never enrolled.
 * @param {string} userId  UUID
 * @returns {Promise<object|null>}
 */
async function getTemplate(userId) {
  const { rows } = await db.query(
    `SELECT id, user_id, template_data, method, created_at
     FROM biometric_templates
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

/**
 * Upsert a biometric template for a user.
 * If a template already exists for user_id, it is replaced (re-enrollment).
 * The UNIQUE(user_id) constraint ensures at most one active template per user.
 *
 * @param {string} userId
 * @param {string} templateData  base64 string from Python /process/enroll
 * @param {string} method        e.g. 'hog-baseline-v1'
 * @returns {Promise<object>}  the upserted row
 */
async function upsertTemplate(userId, templateData, method) {
  const { rows } = await db.query(
    `INSERT INTO biometric_templates (user_id, template_data, method)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE
       SET template_data = EXCLUDED.template_data,
           method        = EXCLUDED.method,
           created_at    = now()
     RETURNING id, user_id, method, created_at`,
    [userId, templateData, method]
  );
  return rows[0];
}

/**
 * Record the outcome of a biometric verification attempt.
 * @param {string} userId
 * @param {string} method    e.g. 'hog-baseline-v1'
 * @param {'passed'|'failed'} result
 * @param {number|null} score  raw cosine similarity from Python service
 * @returns {Promise<object>}
 */
async function recordAuthAttempt(userId, method, result, score) {
  const { rows } = await db.query(
    `INSERT INTO auth_logs (user_id, method, result, score)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, method, result, score, created_at`,
    [userId, method, result, score ?? null]
  );
  return rows[0];
}

/**
 * Retrieve recent auth log entries for a user.
 * @param {string} userId
 * @param {number} [limit=50]
 * @returns {Promise<object[]>}
 */
async function getAuthLogs(userId, limit = 50) {
  const { rows } = await db.query(
    `SELECT id, method, result, score, created_at
     FROM auth_logs
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

module.exports = { getTemplate, upsertTemplate, recordAuthAttempt, getAuthLogs };
