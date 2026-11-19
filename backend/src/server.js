'use strict';
require('dotenv').config();
const app          = require('./app');
const { initDb }   = require('./config/db');

const PORT = parseInt(process.env.PORT, 10) || 5000;

(async () => {
  await initDb();   // no-op until SQL engine agreed with Vaibhav
  app.listen(PORT, () => {
    console.log(`[server] PalmPay backend running → http://localhost:${PORT}`);
    console.log(`[server] Health: http://localhost:${PORT}/api/health`);
    console.log(`[server] Biometric URL (not yet wired): ${process.env.BIOMETRIC_SERVICE_URL || 'http://127.0.0.1:8000'}`);
  });
})();
