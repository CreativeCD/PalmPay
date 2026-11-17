'use strict';

const { pool, query } = require('../config/db');
const authService = require('../services/authService');

/**
 * Register a new user and initialize a demo wallet with 1000.00 credits.
 */
async function register(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }

  const trimmedEmail = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // Check duplicate email
  const existing = await query('SELECT id FROM users WHERE email = $1', [trimmedEmail]);
  if (existing.rowCount > 0) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const hash = await authService.hashPassword(password);

  // Insert user and create wallet in a single atomic transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [name.trim(), trimmedEmail, hash]
    );
    const user = userResult.rows[0];

    await client.query(
      'INSERT INTO wallets (user_id, balance) VALUES ($1, 1000.00)',
      [user.id]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Registered successfully',
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Authenticate credentials and return a signed JWT.
 */
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const trimmedEmail = email.toLowerCase().trim();
  const result = await query(
    'SELECT id, name, email, password_hash FROM users WHERE email = $1',
    [trimmedEmail]
  );

  if (result.rowCount === 0) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const user = result.rows[0];
  const valid = await authService.comparePassword(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const accessToken = authService.signToken({
    id: user.id,
    email: user.email,
    name: user.name,
  });

  return res.status(200).json({
    accessToken,
    user: { id: user.id, name: user.name, email: user.email },
  });
}

/**
 * Return authenticated user profile (req.user set by auth middleware).
 */
async function getMe(req, res) {
  return res.json({ user: req.user });
}

module.exports = {
  register,
  login,
  getMe,
};
