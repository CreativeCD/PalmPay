'use strict';
/**
 * errorHandler.js — Central Express error handler.
 *
 * Must be the LAST middleware registered in app.js.
 * Catches any error thrown (or passed to next(err)) by route handlers.
 * Never surfaces stack traces or internal details to the client.
 */

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status  = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.path} →`, message);
  }

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
