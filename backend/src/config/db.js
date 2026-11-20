'use strict';
/**
 * db.js — PostgreSQL connection pool.
 *
 * Uses the `pg` (node-postgres) driver.
 * All credentials are read from environment variables — NEVER hardcode secrets.
 *
 * Environment variables expected (set in .env):
 *   DB_HOST     – hostname, default: localhost
 *   DB_PORT     – port,     default: 5432
 *   DB_NAME     – database name, default: palmpay
 *   DB_USER     – db user,  default: current OS user (Postgres.app default)
 *   DB_PASSWORD – db password (leave blank for peer/trust auth)
 *
 * Exports:
 *   query(sql, params)  → Promise<pg.QueryResult>
 *   getClient()         → Promise<pg.PoolClient>  (must be released by caller)
 *   pool                → underlying pg.Pool (for transactions)
 *   initDb()            → verify connection on startup
 */

const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME     || 'palmpay',
  user:     process.env.DB_USER     || undefined, // pg uses OS user by default
  password: process.env.DB_PASSWORD || undefined,
  max:      10,          // max pool connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err.message);
});

/**
 * Run a parameterized query.
 * @param {string}  sql
 * @param {Array}   [params]
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(sql, params) {
  return pool.query(sql, params);
}

/**
 * Acquire a dedicated client for multi-statement transactions.
 * Caller MUST call client.release() in a finally block.
 * @returns {Promise<import('pg').PoolClient>}
 */
async function getClient() {
  return pool.connect();
}

/**
 * Verify the database connection on startup.
 * Logs the PostgreSQL server version and exits gracefully on failure.
 */
async function initDb() {
  try {
    const { rows } = await pool.query('SELECT version()');
    console.log('[db] Connected to PostgreSQL:', rows[0].version.split(' ').slice(0, 2).join(' '));
  } catch (err) {
    console.error('[db] Failed to connect to PostgreSQL:', err.message);
    console.error('[db] Check DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD in your .env');
    process.exit(1);
  }
}

module.exports = { query, getClient, pool, initDb };
