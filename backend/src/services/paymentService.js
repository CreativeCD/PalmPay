'use strict';
/**
 * paymentService.js — Atomic wallet debit and transaction recording.
 *
 * STUB — depends on db.js which is blocked until SQL engine is agreed with Vaibhav.
 *
 * Logic to implement (Day 4):
 *   1. SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE
 *   2. Check balance >= amount
 *   3. UPDATE wallets SET balance = balance - $amount
 *   4. INSERT INTO transactions (...)
 *   5. COMMIT — all inside a single DB transaction passed in as `client`
 *
 * @param {{ userId, merchantId, amount, reference, client }} _opts
 */
async function processPayment(_opts) {
  // TODO: implement once SQL engine agreed with Vaibhav and db.js is wired.
  throw new Error('[paymentService] processPayment() not implemented yet.');
}

module.exports = { processPayment };
