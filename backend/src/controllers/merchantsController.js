'use strict';

const { query } = require('../config/db');

/**
 * List all active demo merchants.
 */
async function getMerchants(_req, res) {
  const result = await query(
    'SELECT id, name, category FROM merchants WHERE active = true ORDER BY name ASC',
    []
  );
  return res.json(result.rows);
}

module.exports = {
  getMerchants,
};
