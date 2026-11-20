'use strict';
/**
 * biometricController.js — Enroll, verify and audit-log handlers.
 *
 * Uses:
 *   biometricClient     — calls Python FastAPI service
 *   biometricRepository — reads/writes biometric_templates and auth_logs
 *
 * Routes (Charan's files, NOT edited):
 *   POST /api/biometric/enroll   (auth + upload middleware applied by router)
 *   POST /api/biometric/verify   (auth + upload middleware applied by router)
 *   GET  /api/biometric/logs     (auth middleware applied by router)
 *
 * req.file is populated by multer (upload middleware) for image endpoints.
 * req.user is populated by JWT auth middleware.
 */

const bioClient = require('../services/biometricClient');
const bioRepo   = require('../repositories/biometricRepository');

/**
 * POST /api/biometric/enroll
 * Accepts: multipart/form-data with field `palm_image`
 * Returns: { enrolled: true, method, created_at }
 */
async function enroll(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'palm_image file is required.' });
  }

  const { template, method } = await bioClient.enroll(req.file.buffer, req.file.mimetype);
  const row = await bioRepo.upsertTemplate(req.user.id, template, method);

  return res.status(201).json({
    enrolled:   true,
    method:     row.method,
    created_at: row.created_at,
  });
}

/**
 * POST /api/biometric/verify
 * Accepts: multipart/form-data with field `palm_image`
 * Returns: { matched: boolean, similarity: number, method: string }
 *
 * SECURITY: `matched` is determined here by Express, never accepted from client.
 */
async function verify(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'palm_image file is required.' });
  }

  // Look up the stored template
  const templateRow = await bioRepo.getTemplate(req.user.id);
  if (!templateRow) {
    return res.status(404).json({ error: 'No enrolled template found. Please enroll first.' });
  }

  const { matched, similarity, method } = await bioClient.verify(
    req.file.buffer,
    req.file.mimetype,
    templateRow.template_data
  );

  // Record the attempt regardless of outcome
  const result = matched ? 'passed' : 'failed';
  await bioRepo.recordAuthAttempt(req.user.id, method, result, similarity);

  return res.json({ matched, similarity, method });
}

/**
 * GET /api/biometric/logs
 * Query params: limit (optional, default 50)
 * Returns: { logs: [...] }
 */
async function getLogs(req, res) {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const logs  = await bioRepo.getAuthLogs(req.user.id, limit);
  return res.json({ logs });
}

module.exports = { enroll, verify, getLogs };
