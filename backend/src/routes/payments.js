'use strict';
const router = require('express').Router();
const auth   = require('../middleware/auth');
const upload = require('../middleware/upload');
const c      = require('../controllers/paymentsController');

router.use(auth);
router.post('/', upload, c.createPayment);

module.exports = router;
