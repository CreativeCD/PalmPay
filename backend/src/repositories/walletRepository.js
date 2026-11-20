'use strict';
/**
 * walletRepository.js — Read-only wallet queries (writes done in paymentService transaction).
 *
 * Query contract:
 *   getWallet(userId)   → wallet row | null
 */

const db = require('../config/db');

/**
 * Return the wallet row for a user, or null if none exists.
 * @param {string} userId UUID
 * @returns {Promise<object|null>}
 */
async function getWallet(userId) {
  const { rows } = await db.query(
    'SELECT id, user_id, balance, updated_at FROM wallets WHERE user_id = $1 LIMIT 1',
    [userId]
  );
  return rows[0] || null;
}

module.exports = { getWallet };
