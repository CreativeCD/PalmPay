'use strict';
const { v4: uuidv4 } = require('uuid');

/**
 * Atomically debit the wallet and insert a transaction record.
 * Must be called with an active pg client inside a BEGIN/COMMIT block.
 *
 * @param {object} opts
 * @param {string} opts.userId
 * @param {string} opts.merchantId
 * @param {number} opts.amount
 * @param {string} opts.reference  idempotency key
 * @param {object} opts.client     pg pool client (inside a transaction)
 * @returns {{ newBalance: string, transactionId: string }}
 */
async function processPayment({ userId, merchantId, amount, reference, client }) {
  // Lock the wallet row to prevent concurrent double-spend
  const walletResult = await client.query(
    'SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE',
    [userId]
  );

  if (walletResult.rowCount === 0) {
    throw Object.assign(new Error('Wallet not found'), { status: 404 });
  }

  const currentBalance = parseFloat(walletResult.rows[0].balance);
  if (currentBalance < amount) {
    throw Object.assign(new Error('insufficient_balance'), { status: 400 });
  }

  // Debit wallet
  const updatedWallet = await client.query(
    `UPDATE wallets
       SET balance    = balance - $1,
           updated_at = now()
     WHERE user_id = $2
     RETURNING balance`,
    [amount, userId]
  );
  const newBalance = updatedWallet.rows[0].balance;

  // Insert transaction record
  const txId = uuidv4();
  await client.query(
    `INSERT INTO transactions (id, user_id, merchant_id, amount, status, reference)
     VALUES ($1, $2, $3, $4, 'completed', $5)`,
    [txId, userId, merchantId, amount, reference]
  );

  return { newBalance: String(newBalance), transactionId: txId };
}

module.exports = { processPayment };
