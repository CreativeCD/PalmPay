'use strict';

const router = require('express').Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const biometricController = require('../controllers/biometricController');

// All biometric endpoints require authentication
router.use(auth);

// ── Biometric endpoints ───────────────────────────────────────────────────────
router.post('/enroll', upload, biometricController.enroll);
router.post('/verify', upload, biometricController.verify);
router.get('/logs', biometricController.getLogs);

module.exports = router;
