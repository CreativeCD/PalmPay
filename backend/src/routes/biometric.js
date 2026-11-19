'use strict';
const router = require('express').Router();
const auth   = require('../middleware/auth');
const upload = require('../middleware/upload');
const c      = require('../controllers/biometricController');

router.use(auth);
router.post('/enroll', upload, c.enroll);
router.post('/verify', upload, c.verify);
router.get('/logs',           c.getLogs);

module.exports = router;
