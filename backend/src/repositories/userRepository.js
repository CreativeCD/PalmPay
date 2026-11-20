'use strict';
/**
 * userRepository.js — Parameterized persistence queries for the users table.
 *
 * Query contract (agreed with Charan):
 *   findByEmail(email)              → user row | null
 *   createUser({ name, email, passwordHash }) → new user row
 *   findById(id)                    → user row | null
 *
 * Column names match schema.sql exactly:
 *   id, name, email, password_hash, created_at
 *
 * These functions are called by authController ONLY.
 * They do NOT make business decisions — the controller does.
 */

const db = require('../config/db');

/**
 * Find a user by email address.
 * Returns the full row (including password_hash) or null if not found.
 * @param {string} email
 * @returns {Promise<object|null>}
 */
async function findByEmail(email) {
  const { rows } = await db.query(
    'SELECT id, name, email, password_hash, created_at FROM users WHERE email = $1 LIMIT 1',
    [email]
  );
  return rows[0] || null;
}

/**
 * Find a user by primary key UUID.
 * Returns the row WITHOUT password_hash (safe to attach to req.user).
 * @param {string} id  UUID
 * @returns {Promise<object|null>}
 */
async function findById(id) {
  const { rows } = await db.query(
    'SELECT id, name, email, created_at FROM users WHERE id = $1 LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

/**
 * Insert a new user and return the full created row.
 * Throws if the email is already registered (unique constraint violation).
 * @param {{ name: string, email: string, passwordHash: string }} opts
 * @returns {Promise<object>}
 */
async function createUser({ name, email, passwordHash }) {
  const { rows } = await db.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    [name, email, passwordHash]
  );
  return rows[0];
}

module.exports = { findByEmail, findById, createUser };
