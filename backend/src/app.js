'use strict';
require('express-async-errors');   // catches async throws without try/catch in routes
const express = require('express');
const cors    = require('cors');

const errorHandler       = require('./middleware/errorHandler');
const authRouter         = require('./routes/auth');
const walletRouter       = require('./routes/wallet');
const merchantsRouter    = require('./routes/merchants');
const biometricRouter    = require('./routes/biometric');
const paymentsRouter     = require('./routes/payments');
const transactionsRouter = require('./routes/transactions');

const app = express();

// ── Environment-based CORS ────────────────────────────────────────────────────
// Comma-separated origins in CORS_ORIGIN env var, e.g. "http://localhost:5173"
const rawOrigins    = process.env.CORS_ORIGIN || 'http://localhost:5173';
const allowedOrigins = rawOrigins.split(',').map((o) => o.trim());

app.use(
  cors({
    origin(origin, cb) {
      // Allow server-to-server / curl (no origin header)
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      cb(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  })
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status:    'ok',
    service:   'palmpay-backend',
    timestamp: new Date().toISOString(),
  });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',         authRouter);
app.use('/api/wallet',       walletRouter);
app.use('/api/merchants',    merchantsRouter);
app.use('/api/biometric',    biometricRouter);
app.use('/api/payments',     paymentsRouter);
app.use('/api/transactions', transactionsRouter);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Endpoint not found' }));

// ── Central error handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

module.exports = app;
