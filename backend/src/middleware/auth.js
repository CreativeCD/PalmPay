'use strict';
/**
 * auth.js — JWT authentication middleware (stub).
 *
 * Reads: Authorization: Bearer <token>
 * Sets:  req.user = { id, email, name } on success.
 *
 * Full implementation: Day 2, after authService.signToken is wired.
 */
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: missing token' });
  }

  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
  }
}

module.exports = authMiddleware;
