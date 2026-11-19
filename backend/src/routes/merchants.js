'use strict';
const router = require('express').Router();
const auth   = require('../middleware/auth');
const c      = require('../controllers/merchantsController');

router.use(auth);
router.get('/', c.getMerchants);

module.exports = router;
