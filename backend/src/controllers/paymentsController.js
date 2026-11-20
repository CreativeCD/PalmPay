'use strict';
/**
 * paymentsController.js — Payment handler.
 *
 * SECURITY RULE (locked in): matched/score are NEVER accepted from the client
 * to authorize a payment. The Express server re-verifies biometrics itself.
 *
 * Route (Charan's file, NOT edited):
 *   POST /api/payments   (auth + upload middleware applied by router)
 *
 * Request: multipart/form-data
 *   palm_image   (file)       — probe palm image for biometric re-verification
 *   merchant_id  (string)     — UUID of the target merchant
 *   amount       (string)     — payment amount in decimal (e.g. "49.99")
 *   reference    (string)     — idempotency key (client-generated UUID or order ref)
 *
 * Response (success): { transaction, newBalance }
 * Response (failure): { error: string } with appropriate HTTP status
 */

const bioClient  = require('../services/biometricClient');
const bioRepo    = require('../repositories/biometricRepository');
const { processPayment, PaymentError } = require('../services/paymentService');

async function createPayment(req, res) {
  // ── Validate required fields ───────────────────────────────────────────────
  if (!req.file) {
    return res.status(400).json({ error: 'palm_image file is required for payment.' });
  }
  const { merchant_id, amount, reference } = req.body;
  if (!merchant_id || !amount || !reference) {
    return res.status(400).json({ error: 'merchant_id, amount and reference are required.' });
  }

  // ── Biometric re-verification (Express applies threshold, never trusts client) ──
  const templateRow = await bioRepo.getTemplate(req.user.id);
  if (!templateRow) {
    return res.status(403).json({ error: 'Biometric not enrolled. Enroll before making a payment.' });
  }

  const { matched, similarity, method } = await bioClient.verify(
    req.file.buffer,
    req.file.mimetype,
    templateRow.template_data
  );

  // Record the verification attempt
  await bioRepo.recordAuthAttempt(req.user.id, method, matched ? 'passed' : 'failed', similarity);

  if (!matched) {
    return res.status(403).json({
      error:      'Biometric verification failed. Payment denied.',
      similarity,
      threshold:  bioClient.threshold(),
    });
  }

  // ── Atomic payment ────────────────────────────────────────────────────────
  try {
    const { transaction, newBalance } = await processPayment({
      userId:     req.user.id,
      merchantId: merchant_id,
      amount,
      reference,
    });
    return res.status(201).json({ transaction, newBalance });

  } catch (err) {
    if (err instanceof PaymentError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    throw err;  // unexpected — central error handler catches it
  }
}

module.exports = { createPayment };
