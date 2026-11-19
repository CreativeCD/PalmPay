'use strict';
/**
 * db.js — Database configuration placeholder.
 *
 * SQL engine not yet finalised. Awaiting agreement with Vaibhav (Day 1).
 * Options under discussion: PostgreSQL | MySQL.
 *
 * Once agreed, install the matching driver here and export:
 *   query(sql, params) → Promise<rows>
 *   pool              → connection pool / client factory
 *   initDb()          → connect + verify on startup
 *
 * DO NOT wire real queries in controllers until this module is complete.
 */

// TODO: replace stub with real driver once SQL engine is confirmed with Vaibhav.
function query() {
  throw new Error('[db] Database driver not configured yet. See backend/src/config/db.js');
}

async function initDb() {
  console.warn('[db] WARNING: Database not configured. initDb() is a no-op until engine is agreed.');
}

module.exports = { query, initDb };
