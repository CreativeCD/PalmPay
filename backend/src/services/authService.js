'use strict';
/**
 * authService.js — Account credential helpers.
 *
 * Pure crypto operations; no database calls here.
 * Database reads/writes happen in authController once db.js is wired (Day 2).
 */
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');

const ROUNDS = () => parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;

async function hashPassword(plain) {
  return bcrypt.hash(plain, ROUNDS());
}

async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { hashPassword, comparePassword, signToken, verifyToken };
