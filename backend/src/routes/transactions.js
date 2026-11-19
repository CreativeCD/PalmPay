'use strict';
const router = require('express').Router();
const auth   = require('../middleware/auth');
const c      = require('../controllers/transactionsController');

router.use(auth);
router.get('/', c.getTransactions);

module.exports = router;
