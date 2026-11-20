'use strict';
/**
 * authController.js — Registration and login handlers.
 *
 * Uses:
 *   userRepository — DB reads/writes
 *   authService    — bcrypt + JWT (pure crypto, no DB)
 *
 * Routes (Charan's files, NOT edited):
 *   POST /api/auth/register
 *   POST /api/auth/login
 *   GET  /api/auth/me
 */

const userRepo   = require('../repositories/userRepository');
const authSvc    = require('../services/authService');

/**
 * POST /api/auth/register
 * Body: { name, email, password }
 * Returns: { user: { id, name, email, created_at }, token }
 */
async function register(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  // Check for duplicate email
  const existing = await userRepo.findByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'Email is already registered.' });
  }

  const passwordHash = await authSvc.hashPassword(password);
  const user         = await userRepo.createUser({ name, email, passwordHash });
  const token        = authSvc.signToken({ id: user.id, email: user.email, name: user.name });

  return res.status(201).json({ user, token });
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { user: { id, name, email, created_at }, token }
 */
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' });
  }

  const user = await userRepo.findByEmail(email);
  if (!user) {
    // Generic message to prevent email enumeration
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const ok = await authSvc.comparePassword(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = authSvc.signToken({ id: user.id, email: user.email, name: user.name });

  // Strip password_hash before sending
  const { password_hash: _omit, ...safeUser } = user;
  return res.json({ user: safeUser, token });
}

/**
 * GET /api/auth/me
 * Requires: Authorization: Bearer <token>
 * Returns: { user: { id, email, name, created_at } }
 * req.user is set by the auth middleware (JWT payload).
 */
async function getMe(req, res) {
  // Optionally re-fetch from DB for freshest data
  const user = await userRepo.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  return res.json({ user });
}

module.exports = { register, login, getMe };
