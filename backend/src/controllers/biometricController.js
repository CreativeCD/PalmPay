'use strict';

const { query } = require('../config/db');
const biometricClient = require('../services/biometricClient');

/**
 * Enroll a palm image.
 * Forwards image buffer to Python FastAPI microservice, receives serialized template,
 * and upserts into biometric_templates.
 */
async function enroll(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'palm_image file is required' });
  }

  const { template, method } = await biometricClient.enroll(
    req.file.buffer,
    req.file.mimetype
  );

  // Upsert: exactly one template per user; replace on re-enrollment
  await query(
    `INSERT INTO biometric_templates (user_id, template_data, method)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE
       SET template_data = EXCLUDED.template_data,
           method        = EXCLUDED.method,
           created_at    = now()`,
    [req.user.id, template, method]
  );

  return res.json({
    message: 'Enrolled successfully',
    method,
  });
}

/**
 * Verify a palm image against the authenticated user's enrolled template.
 * Express applies the authorization threshold; Python service returns raw score.
 */
async function verify(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'palm_image file is required' });
  }

  const tmplResult = await query(
    'SELECT template_data, method FROM biometric_templates WHERE user_id = $1',
    [req.user.id]
  );

  if (tmplResult.rowCount === 0) {
    return res.status(404).json({
      error: 'No enrolled biometric template found. Please enroll your palm first.',
    });
  }

  const { template_data: storedTemplate, method } = tmplResult.rows[0];

  const { similarity } = await biometricClient.verify(
    req.file.buffer,
    req.file.mimetype,
    storedTemplate
  );

  const threshold = parseFloat(process.env.BIOMETRIC_THRESHOLD) || 0.6;
  const passed = similarity >= threshold;

  // Audit log of biometric verification attempt
  await query(
    `INSERT INTO auth_logs (user_id, method, result, score)
     VALUES ($1, $2, $3, $4)`,
    [req.user.id, method, passed ? 'passed' : 'failed', similarity]
  );

  return res.json({
    matched: passed,
    similarity,
    threshold,
    method,
  });
}

/**
 * Retrieve recent biometric audit logs for the authenticated user.
 */
async function getLogs(req, res) {
  const result = await query(
    `SELECT id, method, result, score, created_at
       FROM auth_logs
      WHERE user_id = $1
      ORDER BY created_at DESC`,
    [req.user.id]
  );
  return res.json(result.rows);
}

module.exports = {
  enroll,
  verify,
  getLogs,
};
