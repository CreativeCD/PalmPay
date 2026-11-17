'use strict';
require('dotenv').config();
const app      = require('./app');
const { initDb } = require('./config/db');

const PORT = parseInt(process.env.PORT, 10) || 5000;

(async () => {
  await initDb();
  app.listen(PORT, () => {
    console.log(`[server] PalmPay backend running on http://localhost:${PORT}`);
    console.log(`[server] Biometric service URL: ${process.env.BIOMETRIC_SERVICE_URL}`);
  });
})();
