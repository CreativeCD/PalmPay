'use strict';

const router = require('express').Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const paymentsController = require('../controllers/paymentsController');

// All payment endpoints require authentication
router.use(auth);

// ── Payment endpoints ─────────────────────────────────────────────────────────
router.post('/', upload, paymentsController.createPayment);

module.exports = router;
