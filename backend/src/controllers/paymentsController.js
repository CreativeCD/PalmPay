'use strict';
/**
 * paymentsController.js — STUB
 * Awaiting: db.js (Vaibhav) + biometricClient contract (Shree Sai).
 * Security rule (locked in now): this handler must NEVER accept a client-supplied
 * 'matched' or 'score' field to decide authorization.
 * Implementation: Day 4.
 */
async function createPayment(_req, res) {
  res.status(501).json({ error: 'Not implemented yet.' });
}
module.exports = { createPayment };
