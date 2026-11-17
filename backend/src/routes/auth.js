'use strict';

const router = require('express').Router();
const auth = require('../middleware/auth');
const authController = require('../controllers/authController');

// ── Authentication endpoints ──────────────────────────────────────────────────
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', auth, authController.getMe);

module.exports = router;
