'use strict';

const router = require('express').Router();
const auth = require('../middleware/auth');
const merchantsController = require('../controllers/merchantsController');

// All merchant endpoints require authentication
router.use(auth);

// ── Merchant endpoints ────────────────────────────────────────────────────────
router.get('/', merchantsController.getMerchants);

module.exports = router;
