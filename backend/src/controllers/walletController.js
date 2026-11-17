'use strict';

const { query } = require('../config/db');

/**
 * Retrieve the current authenticated user's wallet balance.
 */
async function getWallet(req, res) {
  const result = await query(
    'SELECT balance, updated_at FROM wallets WHERE user_id = $1',
    [req.user.id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Wallet not found' });
  }

  // Return balance as a string to preserve decimal precision
  return res.json({
    balance: String(result.rows[0].balance),
    updated_at: result.rows[0].updated_at,
  });
}

module.exports = {
  getWallet,
};
