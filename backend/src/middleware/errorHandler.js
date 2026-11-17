'use strict';

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (status >= 500) {
    console.error('[error]', message);
  }

  // Never surface stack traces or internal details to the client.
  res.status(status).json({ error: message });
}

module.exports = errorHandler;
