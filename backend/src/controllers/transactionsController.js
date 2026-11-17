'use strict';

const { query } = require('../config/db');

/**
 * Retrieve transaction history for the authenticated user.
 */
async function getTransactions(req, res) {
  const result = await query(
    `SELECT t.id, t.amount, t.status, t.reference, t.created_at,
            m.id AS merchant_id, m.name AS merchant_name, m.category AS merchant_category
       FROM transactions t
       JOIN merchants m ON m.id = t.merchant_id
      WHERE t.user_id = $1
      ORDER BY t.created_at DESC`,
    [req.user.id]
  );

  const transactions = result.rows.map((r) => ({
    id: r.id,
    amount: String(r.amount),
    status: r.status,
    reference: r.reference,
    created_at: r.created_at,
    merchant: {
      id: r.merchant_id,
      name: r.merchant_name,
      category: r.merchant_category,
    },
  }));

  return res.json(transactions);
}

module.exports = {
  getTransactions,
};
