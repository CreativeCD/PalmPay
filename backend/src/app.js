'use strict';

require('express-async-errors');
const express = require('express');
const cors = require('cors');

const authRouter = require('./routes/auth');
const walletRouter = require('./routes/wallet');
const merchantsRouter = require('./routes/merchants');
const biometricRouter = require('./routes/biometric');
const paymentsRouter = require('./routes/payments');
const transactionsRouter = require('./routes/transactions');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ── CORS configured by environment ───────────────────────────────────────────
const rawOrigins = process.env.CORS_ORIGIN || process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const allowedOrigins = rawOrigins.split(',').map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

// ── JSON & URL-encoded body parsing ───────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Central health check endpoint ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'palmpay-backend',
    timestamp: new Date().toISOString(),
  });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/merchants', merchantsRouter);
app.use('/api/biometric', biometricRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/transactions', transactionsRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Endpoint not found' }));

// ── Central error handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

module.exports = app;
