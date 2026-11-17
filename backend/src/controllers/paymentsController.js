'use strict';

const { pool, query } = require('../config/db');
const biometricClient = require('../services/biometricClient');
const paymentService = require('../services/paymentService');

/**
 * Authorize and process a simulated payment.
 *
 * Security requirements:
 * 1. The client must never provide 'matched=true' or 'score'.
 * 2. Express validates the account session and checks the merchant and balance.
 * 3. Express forwards the uploaded palm image to the internal Python biometric service.
 * 4. Express enforces the biometric threshold server-side.
 * 5. Debit wallet and record transaction atomically inside a PostgreSQL transaction.
 */
async function createPayment(req, res) {
  const { merchantId, amount, reference } = req.body;

  // 1. Input validation
  if (!merchantId || !amount || !reference) {
    return res.status(400).json({ error: 'merchantId, amount and reference are required' });
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'palm_image file is required for biometric payment authorization' });
  }

  // 2. Merchant validation
  const merchantResult = await query(
    'SELECT id, name FROM merchants WHERE id = $1 AND active = true',
    [merchantId]
  );
  if (merchantResult.rowCount === 0) {
    return res.status(404).json({ error: 'Merchant not found or inactive' });
  }
  const merchant = merchantResult.rows[0];

  // 3. Check for enrolled biometric template
  const tmplResult = await query(
    'SELECT template_data, method FROM biometric_templates WHERE user_id = $1',
    [req.user.id]
  );
  if (tmplResult.rowCount === 0) {
    return res.status(400).json({
      error: 'biometric_not_enrolled',
      message: 'Please enroll your palm template before attempting payment.',
    });
  }
  const { template_data: storedTemplate, method } = tmplResult.rows[0];

  // 4. Server-side biometric comparison
  const { similarity } = await biometricClient.verify(
    req.file.buffer,
    req.file.mimetype,
    storedTemplate
  );

  const threshold = parseFloat(process.env.BIOMETRIC_THRESHOLD) || 0.6;
  const biometricPassed = similarity >= threshold;

  // Audit log of biometric check
  await query(
    `INSERT INTO auth_logs (user_id, method, result, score)
     VALUES ($1, $2, $3, $4)`,
    [req.user.id, method, biometricPassed ? 'passed' : 'failed', similarity]
  );

  if (!biometricPassed) {
    return res.status(403).json({
      error: 'biometric_verification_failed',
      message: 'Palm verification failed. Similarity score was below required threshold.',
      similarity,
      threshold,
    });
  }

  // 5. Atomic SQL transaction: debit wallet + insert transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { newBalance, transactionId } = await paymentService.processPayment({
      userId: req.user.id,
      merchantId,
      amount: numAmount,
      reference,
      client,
    });
    await client.query('COMMIT');

    return res.status(200).json({
      message: 'Payment successful (simulated)',
      transaction: {
        id: transactionId,
        amount: String(numAmount),
        reference,
        created_at: new Date().toISOString(),
        merchant: { id: merchant.id, name: merchant.name },
      },
      newBalance,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.message === 'insufficient_balance') {
      return res.status(400).json({ error: 'insufficient_balance', message: 'Insufficient wallet balance.' });
    }
    // Handle idempotency duplicate reference
    if (err.code === '23505' && err.constraint === 'transactions_reference_key') {
      return res.status(409).json({ error: 'duplicate_reference', message: 'Transaction reference already processed.' });
    }
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  createPayment,
};
