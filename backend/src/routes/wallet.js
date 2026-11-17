'use strict';

const router = require('express').Router();
const auth = require('../middleware/auth');
const walletController = require('../controllers/walletController');

// All wallet endpoints require authentication
router.use(auth);

// ── Wallet endpoints ──────────────────────────────────────────────────────────
router.get('/', walletController.getWallet);

module.exports = router;
