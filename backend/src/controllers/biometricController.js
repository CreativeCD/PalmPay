'use strict';
/**
 * biometricController.js — STUB
 * Awaiting: db.js (Vaibhav) + biometricClient payload contract (Shree Sai).
 * Implementation: Day 3.
 */
async function enroll(_req, res) {
  res.status(501).json({ error: 'Not implemented yet.' });
}
async function verify(_req, res) {
  res.status(501).json({ error: 'Not implemented yet.' });
}
async function getLogs(_req, res) {
  res.status(501).json({ error: 'Not implemented yet.' });
}
module.exports = { enroll, verify, getLogs };
