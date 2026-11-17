'use strict';

const router = require('express').Router();
const auth = require('../middleware/auth');
const transactionsController = require('../controllers/transactionsController');

// All transaction endpoints require authentication
router.use(auth);

// ── Transaction endpoints ─────────────────────────────────────────────────────
router.get('/', transactionsController.getTransactions);

module.exports = router;
