'use strict';
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Run a parameterised SQL query.
 * @param {string} text  - SQL with $1, $2 … placeholders
 * @param {any[]}  params
 */
async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Verify the database connection on startup.
 */
async function initDb() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('[db] PostgreSQL connected ✓');
  } finally {
    client.release();
  }
}

module.exports = { pool, query, initDb };
