'use strict';
const router = require('express').Router();
const auth   = require('../middleware/auth');
const c      = require('../controllers/walletController');

router.use(auth);
router.get('/', c.getWallet);

module.exports = router;
