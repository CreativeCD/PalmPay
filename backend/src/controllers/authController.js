'use strict';
/**
 * authController.js — Registration and login handlers.
 * STUB: Awaiting db.js (SQL engine agreed with Vaibhav, Day 1).
 * Full implementation: Day 2.
 */

async function register(_req, res) {
  res.status(501).json({ error: 'Not implemented yet. Awaiting DB engine agreement.' });
}

async function login(_req, res) {
  res.status(501).json({ error: 'Not implemented yet. Awaiting DB engine agreement.' });
}

async function getMe(req, res) {
  res.json({ user: req.user }); // req.user set by auth middleware
}

module.exports = { register, login, getMe };
