#!/usr/bin/env node
'use strict';
/**
 * test_db.js — Integration tests for DB persistence and payment atomicity.
 *
 * Run with:  node backend/test_db.js
 * Requires:  PostgreSQL running with palmpay DB and seed data loaded.
 *
 * Tests:
 *   1. DB connection and initDb()
 *   2. createUser + findByEmail + findById
 *   3. upsertTemplate + getTemplate (re-enrollment)
 *   4. recordAuthAttempt + getAuthLogs
 *   5. getWallet
 *   6. processPayment — SUCCESS (debit + transaction inserted)
 *   7. processPayment — INSUFFICIENT_FUNDS (rollback preserves balance)
 *   8. processPayment — INVALID_AMOUNT (rejected before DB hit)
 *   9. processPayment — DUPLICATE_REF (idempotency guard)
 *  10. processPayment — forced INSERT failure via bad merchantId (rollback preserves balance)
 */

// Load .env if it exists (for local dev)
try { require('dotenv').config({ path: __dirname + '/backend/.env' }); } catch {}
try { require('dotenv').config({ path: __dirname + '/.env' }); } catch {}

// Use modules from the backend's own node_modules
const { initDb, query, getClient } = require('./backend/src/config/db');
const userRepo  = require('./backend/src/repositories/userRepository');
const bioRepo   = require('./backend/src/repositories/biometricRepository');
const walletRepo = require('./backend/src/repositories/walletRepository');
const { processPayment, PaymentError } = require('./backend/src/services/paymentService');
const { hashPassword } = require('./backend/src/services/authService');
const { v4: uuidv4 } = require('./backend/node_modules/uuid');

// ── helpers ──────────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(label) { console.log(`  ✓ ${label}`); pass++; }
function ko(label, err) { console.error(`  ✗ ${label}\n    ${err?.message || err}`); fail++; }

async function cleanup(email) {
  // transactions and auth_logs reference users without ON DELETE CASCADE — delete explicitly
  const { rows } = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (rows.length) {
    const uid = rows[0].id;
    await query('DELETE FROM transactions WHERE user_id = $1', [uid]);
    await query('DELETE FROM auth_logs    WHERE user_id = $1', [uid]);
  }
  // Now delete user (wallet, biometric_templates cascade via ON DELETE CASCADE)
  await query('DELETE FROM users WHERE email = $1', [email]);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  PalmPay DB Integration Tests');
  console.log('══════════════════════════════════════════════════════\n');

  // ── Test 1: DB connection ─────────────────────────────────────────────────
  console.log('[1] DB connection');
  try {
    await initDb();
    ok('initDb() connected successfully');
  } catch (e) { ko('initDb()', e); process.exit(1); }

  // ── Seed a test merchant UUID for payment tests ───────────────────────────
  const { rows: merchants } = await query("SELECT id FROM merchants WHERE active = true LIMIT 1");
  if (merchants.length === 0) {
    console.error('No active merchants found — run database/seed.sql first.');
    process.exit(1);
  }
  const merchantId = merchants[0].id;

  const testEmail = `test.db.${Date.now()}@palmpay.local`;
  let userId, walletBalance;

  // ── Test 2: User CRUD ─────────────────────────────────────────────────────
  console.log('\n[2] userRepository');
  try {
    const ph   = await hashPassword('securepass123');
    const user = await userRepo.createUser({ name: 'DB Test User', email: testEmail, passwordHash: ph });
    userId = user.id;
    // Wallet is created by trigger or seed — create manually here if not present
    await query(
      'INSERT INTO wallets (user_id, balance) VALUES ($1, 500.00) ON CONFLICT (user_id) DO NOTHING',
      [userId]
    );
    ok(`createUser → id=${userId}`);
  } catch (e) { ko('createUser', e); await cleanup(testEmail); return; }

  try {
    const found = await userRepo.findByEmail(testEmail);
    if (!found) throw new Error('findByEmail returned null');
    ok(`findByEmail → name="${found.name}"`);
  } catch (e) { ko('findByEmail', e); }

  try {
    const found = await userRepo.findById(userId);
    if (!found) throw new Error('findById returned null');
    if (found.password_hash !== undefined) throw new Error('password_hash must not be returned by findById');
    ok('findById → no password_hash leak');
  } catch (e) { ko('findById', e); }

  // ── Test 3: biometricRepository — template ────────────────────────────────
  console.log('\n[3] biometricRepository — template');
  const fakeTemplate = Buffer.from('fakehog'.repeat(50)).toString('base64');
  const fakeTemplate2 = Buffer.from('updatedhog'.repeat(50)).toString('base64');

  try {
    const row = await bioRepo.upsertTemplate(userId, fakeTemplate, 'hog-baseline-v1');
    ok(`upsertTemplate (enroll) → method=${row.method}`);
  } catch (e) { ko('upsertTemplate (enroll)', e); }

  try {
    const row = await bioRepo.upsertTemplate(userId, fakeTemplate2, 'hog-baseline-v1');
    ok(`upsertTemplate (re-enroll) → method=${row.method}`);
  } catch (e) { ko('upsertTemplate (re-enroll)', e); }

  try {
    const row = await bioRepo.getTemplate(userId);
    if (!row) throw new Error('getTemplate returned null');
    if (row.template_data !== fakeTemplate2) throw new Error('template_data mismatch after re-enroll');
    ok(`getTemplate → template_data matches re-enrolled value`);
  } catch (e) { ko('getTemplate', e); }

  // ── Test 4: biometricRepository — auth logs ───────────────────────────────
  console.log('\n[4] biometricRepository — auth_logs');
  try {
    await bioRepo.recordAuthAttempt(userId, 'hog-baseline-v1', 'passed', 0.981234);
    await bioRepo.recordAuthAttempt(userId, 'hog-baseline-v1', 'failed', 0.421000);
    const logs = await bioRepo.getAuthLogs(userId, 10);
    if (logs.length < 2) throw new Error(`Expected ≥2 logs, got ${logs.length}`);
    ok(`recordAuthAttempt × 2 + getAuthLogs → ${logs.length} entries`);
    ok(`Latest result="${logs[0].result}" score=${logs[0].score}`);
  } catch (e) { ko('auth_logs', e); }

  // ── Test 5: walletRepository ───────────────────────────────────────────────
  console.log('\n[5] walletRepository');
  try {
    const wallet = await walletRepo.getWallet(userId);
    if (!wallet) throw new Error('getWallet returned null');
    walletBalance = parseFloat(wallet.balance);
    ok(`getWallet → balance=${wallet.balance}`);
  } catch (e) { ko('getWallet', e); }

  // ── Test 6: processPayment — success ──────────────────────────────────────
  console.log('\n[6] processPayment — success');
  const ref1 = `TEST-${uuidv4()}`;
  try {
    const { transaction, newBalance } = await processPayment({
      userId, merchantId, amount: 100, reference: ref1,
    });
    const expected = (walletBalance - 100).toFixed(2);
    if (newBalance !== expected) throw new Error(`Expected balance ${expected}, got ${newBalance}`);
    ok(`Debit 100 → newBalance=${newBalance}  txId=${transaction.id}`);
    walletBalance = parseFloat(newBalance);
  } catch (e) { ko('processPayment success', e); }

  // ── Test 7: processPayment — insufficient funds ───────────────────────────
  console.log('\n[7] processPayment — INSUFFICIENT_FUNDS + rollback');
  const { rows: [preRow] } = await query('SELECT balance FROM wallets WHERE user_id = $1', [userId]);
  const balanceBefore = preRow.balance;
  try {
    await processPayment({ userId, merchantId, amount: 999999, reference: `TEST-${uuidv4()}` });
    ko('INSUFFICIENT_FUNDS — should have thrown');
  } catch (e) {
    if (e instanceof PaymentError && e.code === 'INSUFFICIENT_FUNDS') {
      const { rows: [postRow] } = await query('SELECT balance FROM wallets WHERE user_id = $1', [userId]);
      if (postRow.balance.toString() !== balanceBefore.toString()) {
        ko('Rollback check — balance changed!', new Error(`${balanceBefore} → ${postRow.balance}`));
      } else {
        ok(`INSUFFICIENT_FUNDS thrown; balance preserved at ${postRow.balance}`);
      }
    } else { ko('Wrong error type for insufficient funds', e); }
  }

  // ── Test 8: processPayment — invalid amount ───────────────────────────────
  console.log('\n[8] processPayment — INVALID_AMOUNT');
  for (const badAmt of [0, -50, 'abc', NaN]) {
    try {
      await processPayment({ userId, merchantId, amount: badAmt, reference: `TEST-${uuidv4()}` });
      ko(`INVALID_AMOUNT for ${badAmt} — should have thrown`);
    } catch (e) {
      if (e instanceof PaymentError && e.code === 'INVALID_AMOUNT') {
        ok(`amount=${JSON.stringify(badAmt)} → INVALID_AMOUNT`);
      } else { ko(`Wrong error for amount=${badAmt}`, e); }
    }
  }

  // ── Test 9: processPayment — duplicate reference ───────────────────────────
  console.log('\n[9] processPayment — DUPLICATE_REF (idempotency)');
  try {
    // ref1 was used in test 6
    await processPayment({ userId, merchantId, amount: 1, reference: ref1 });
    ko('DUPLICATE_REF — should have thrown');
  } catch (e) {
    if (e instanceof PaymentError && e.code === 'DUPLICATE_REF') {
      ok(`Duplicate reference correctly rejected`);
    } else { ko('Wrong error type for duplicate ref', e); }
  }

  // ── Test 10: forced INSERT failure (bad merchantId) → rollback ─────────────
  console.log('\n[10] processPayment — forced INSERT failure → rollback preserves balance');
  const { rows: [pre10] } = await query('SELECT balance FROM wallets WHERE user_id = $1', [userId]);
  const bal10before = pre10.balance;
  try {
    // Use a valid UUID that doesn't match any merchant (FK violation)
    await processPayment({
      userId,
      merchantId: '00000000-0000-0000-0000-000000000000',
      amount:     1,
      reference:  `TEST-${uuidv4()}`,
    });
    ko('FK violation — should have thrown');
  } catch (e) {
    // pg error code 23503 = foreign_key_violation
    if (e.code === '23503' || e instanceof PaymentError) {
      const { rows: [post10] } = await query('SELECT balance FROM wallets WHERE user_id = $1', [userId]);
      if (post10.balance.toString() !== bal10before.toString()) {
        ko('Rollback check — balance changed after forced failure!');
      } else {
        ok(`FK violation rolled back; balance preserved at ${post10.balance}`);
      }
    } else { ko('Unexpected error on forced INSERT failure', e); }
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────
  await cleanup(testEmail);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  Results: ${pass} passed, ${fail} failed`);
  console.log('══════════════════════════════════════════════════════\n');
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Unhandled error in test_db.js:', err);
  process.exit(1);
});
