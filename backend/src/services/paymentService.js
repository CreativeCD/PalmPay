'use strict';
/**
 * paymentService.js — Atomic wallet debit and transaction recording.
 *
 * Function signature (agreed with Charan):
 *
 *   processPayment({ userId, merchantId, amount, reference })
 *     → Promise<{ transaction: object, newBalance: string }>
 *
 *   Errors thrown (Charan catches these in paymentsController):
 *     INVALID_AMOUNT     – amount is not a positive finite number
 *     INSUFFICIENT_FUNDS – wallet balance < amount
 *     DUPLICATE_REF      – reference already exists (idempotency violation)
 *     (Any other pg error propagates as-is for the central error handler)
 *
 * Implementation:
 *   1. BEGIN
 *   2. SELECT … FROM wallets WHERE user_id = $1 FOR UPDATE   ← row-level lock
 *   3. Guard: balance >= amount
 *   4. UPDATE wallets SET balance = balance - $amount, updated_at = now()
 *   5. INSERT INTO transactions (…) RETURNING *
 *   6. COMMIT
 *   On any error: ROLLBACK (balance is restored to its pre-transaction value)
 *
 * Idempotency:
 *   The `reference` column has a UNIQUE constraint in the DB.
 *   A duplicate `reference` raises a 23505 (unique_violation) pg error,
 *   which this service converts to the named DUPLICATE_REF error.
 */

const db = require('../config/db');

class PaymentError extends Error {
  constructor(code, message) {
    super(message);
    this.name  = 'PaymentError';
    this.code  = code;         // e.g. 'INSUFFICIENT_FUNDS'
    this.status = code === 'INVALID_AMOUNT'  ? 400
                : code === 'INSUFFICIENT_FUNDS' ? 422
                : code === 'DUPLICATE_REF'   ? 409
                : 500;
  }
}

/**
 * Atomically debit a user's wallet and record a transaction.
 *
 * @param {{ userId: string, merchantId: string, amount: number|string, reference: string }} opts
 * @returns {Promise<{ transaction: object, newBalance: string }>}
 * @throws {PaymentError}
 */
async function processPayment({ userId, merchantId, amount, reference }) {
  // ── 0. Validate amount before touching the DB ──────────────────────────────
  const amt = parseFloat(amount);
  if (!isFinite(amt) || amt <= 0) {
    throw new PaymentError('INVALID_AMOUNT', `Amount must be a positive number, got: ${amount}`);
  }
  // Round to 2 decimal places to match NUMERIC(12,2) column
  const amtStr = amt.toFixed(2);

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // ── 1. Lock the wallet row ─────────────────────────────────────────────────
    const { rows: walletRows } = await client.query(
      'SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
      [userId]
    );
    if (walletRows.length === 0) {
      throw new PaymentError('INSUFFICIENT_FUNDS', 'Wallet not found for this user.');
    }
    const wallet  = walletRows[0];
    const balance = parseFloat(wallet.balance);

    // ── 2. Check sufficient funds ──────────────────────────────────────────────
    if (balance < amt) {
      throw new PaymentError(
        'INSUFFICIENT_FUNDS',
        `Insufficient funds. Balance: ${balance.toFixed(2)}, Required: ${amtStr}`
      );
    }

    // ── 3. Debit the wallet ───────────────────────────────────────────────────
    const { rows: updatedWallet } = await client.query(
      `UPDATE wallets
       SET balance    = balance - $1,
           updated_at = now()
       WHERE user_id = $2
       RETURNING balance`,
      [amtStr, userId]
    );
    const newBalance = updatedWallet[0].balance;

    // ── 4. Insert transaction record ──────────────────────────────────────────
    let txRow;
    try {
      const { rows } = await client.query(
        `INSERT INTO transactions (user_id, merchant_id, amount, status, reference)
         VALUES ($1, $2, $3, 'completed', $4)
         RETURNING id, user_id, merchant_id, amount, status, reference, created_at`,
        [userId, merchantId, amtStr, reference]
      );
      txRow = rows[0];
    } catch (pgErr) {
      if (pgErr.code === '23505') {        // unique_violation — duplicate reference
        throw new PaymentError('DUPLICATE_REF', `Duplicate payment reference: ${reference}`);
      }
      throw pgErr;                         // re-throw unexpected errors
    }

    // ── 5. Commit ─────────────────────────────────────────────────────────────
    await client.query('COMMIT');

    return { transaction: txRow, newBalance: newBalance.toString() };

  } catch (err) {
    // ── Rollback on ANY error (PaymentError or pg error) ──────────────────────
    await client.query('ROLLBACK');
    throw err;      // re-throw so the controller/error-handler can respond
  } finally {
    client.release();
  }
}

module.exports = { processPayment, PaymentError };
