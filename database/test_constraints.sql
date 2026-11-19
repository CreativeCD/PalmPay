-- =============================================================================
-- PalmPay Database Integrity & Constraint Verification Test Suite
-- Target: PostgreSQL 14+
-- Run: psql -d palmpay -f database/test_constraints.sql
--
-- This script tests:
-- 1. Valid record insertions across all 6 entities.
-- 2. Negative and zero amount/balance checks.
-- 3. Duplicate key violations on UNIQUE constraints (email, 1:1 wallet, reference).
-- 4. Foreign key constraint enforcement for orphaned records.
-- 5. Enumeration check constraints on auth log results.
--
-- Automatically rolls back all test rows upon completion so database state is preserved.
-- =============================================================================

\set ON_ERROR_STOP off

BEGIN;

CREATE TEMP TABLE test_results (
    test_num INT,
    test_name TEXT,
    expected_outcome TEXT,
    actual_outcome TEXT,
    status TEXT
);

-- Test 1: Insert valid test user
DO $$
BEGIN
    INSERT INTO users (id, name, email, password_hash)
    VALUES ('b1111111-1111-1111-1111-111111111111', 'Test Student', 'student@nst.edu.in', 'hash123');
    INSERT INTO test_results VALUES (1, 'Insert Valid User', 'Success', 'User inserted with UUID', 'PASSED');
EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES (1, 'Insert Valid User', 'Success', SQLERRM, 'FAILED');
END $$;

-- Test 2: Duplicate email constraint
DO $$
BEGIN
    INSERT INTO users (id, name, email, password_hash)
    VALUES ('b2222222-2222-2222-2222-222222222222', 'Test Student 2', 'student@nst.edu.in', 'hash456');
    INSERT INTO test_results VALUES (2, 'Duplicate Email (users.email UNIQUE)', 'Rejected with unique_violation', 'Unexpected Success', 'FAILED');
EXCEPTION WHEN unique_violation THEN
    INSERT INTO test_results VALUES (2, 'Duplicate Email (users.email UNIQUE)', 'Rejected with unique_violation', 'Correctly rejected: ' || SQLERRM, 'PASSED');
END $$;

-- Test 3: Insert valid wallet
DO $$
BEGIN
    INSERT INTO wallets (user_id, balance)
    VALUES ('b1111111-1111-1111-1111-111111111111', 1000.00);
    INSERT INTO test_results VALUES (3, 'Insert Valid Wallet (Default 1000.00)', 'Success', 'Wallet created, balance = 1000.00', 'PASSED');
EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES (3, 'Insert Valid Wallet (Default 1000.00)', 'Success', SQLERRM, 'FAILED');
END $$;

-- Test 4: Duplicate wallet for same user (1:1 relationship)
DO $$
BEGIN
    INSERT INTO wallets (user_id, balance)
    VALUES ('b1111111-1111-1111-1111-111111111111', 500.00);
    INSERT INTO test_results VALUES (4, 'Duplicate Wallet (wallets.user_id UNIQUE)', 'Rejected with unique_violation', 'Unexpected Success', 'FAILED');
EXCEPTION WHEN unique_violation THEN
    INSERT INTO test_results VALUES (4, 'Duplicate Wallet (wallets.user_id UNIQUE)', 'Rejected with unique_violation', 'Correctly rejected: ' || SQLERRM, 'PASSED');
END $$;

-- Test 5: Negative wallet balance
DO $$
BEGIN
    UPDATE wallets SET balance = -50.00 WHERE user_id = 'b1111111-1111-1111-1111-111111111111';
    INSERT INTO test_results VALUES (5, 'Negative Balance (wallets CHECK balance >= 0)', 'Rejected with check_violation', 'Unexpected Success', 'FAILED');
EXCEPTION WHEN check_violation THEN
    INSERT INTO test_results VALUES (5, 'Negative Balance (wallets CHECK balance >= 0)', 'Rejected with check_violation', 'Correctly rejected: ' || SQLERRM, 'PASSED');
END $$;

-- Test 6: Orphan wallet (non-existent user)
DO $$
BEGIN
    INSERT INTO wallets (user_id, balance)
    VALUES ('c9999999-9999-9999-9999-999999999999', 500.00);
    INSERT INTO test_results VALUES (6, 'Orphan Wallet (wallets.user_id FK users.id)', 'Rejected with foreign_key_violation', 'Unexpected Success', 'FAILED');
EXCEPTION WHEN foreign_key_violation THEN
    INSERT INTO test_results VALUES (6, 'Orphan Wallet (wallets.user_id FK users.id)', 'Rejected with foreign_key_violation', 'Correctly rejected: ' || SQLERRM, 'PASSED');
END $$;

-- Test 7: Valid biometric template
DO $$
BEGIN
    INSERT INTO biometric_templates (user_id, template_data, method)
    VALUES ('b1111111-1111-1111-1111-111111111111', 'base64EncodedSampleFeatureData==', 'hog-baseline-v1');
    INSERT INTO test_results VALUES (7, 'Insert Valid Biometric Template', 'Success', 'Template enrolled successfully', 'PASSED');
EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES (7, 'Insert Valid Biometric Template', 'Success', SQLERRM, 'FAILED');
END $$;

-- Test 8: Duplicate biometric template for same user
DO $$
BEGIN
    INSERT INTO biometric_templates (user_id, template_data, method)
    VALUES ('b1111111-1111-1111-1111-111111111111', 'differentTemplateData==', 'hog-baseline-v1');
    INSERT INTO test_results VALUES (8, 'Duplicate Template (biometric_templates.user_id UNIQUE)', 'Rejected with unique_violation', 'Unexpected Success', 'FAILED');
EXCEPTION WHEN unique_violation THEN
    INSERT INTO test_results VALUES (8, 'Duplicate Template (biometric_templates.user_id UNIQUE)', 'Rejected with unique_violation', 'Correctly rejected: ' || SQLERRM, 'PASSED');
END $$;

-- Test 9: Valid transaction
DO $$
BEGIN
    INSERT INTO transactions (user_id, merchant_id, amount, status, reference)
    VALUES ('b1111111-1111-1111-1111-111111111111', 'a1b2c3d4-0001-0001-0001-000000000001', 120.00, 'completed', 'REF-TEST-00001');
    INSERT INTO test_results VALUES (9, 'Insert Valid Transaction', 'Success', 'Transaction recorded with FKs and reference', 'PASSED');
EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES (9, 'Insert Valid Transaction', 'Success', SQLERRM, 'FAILED');
END $$;

-- Test 10: Non-positive transaction amount (zero amount)
DO $$
BEGIN
    INSERT INTO transactions (user_id, merchant_id, amount, status, reference)
    VALUES ('b1111111-1111-1111-1111-111111111111', 'a1b2c3d4-0001-0001-0001-000000000001', 0.00, 'completed', 'REF-TEST-00002');
    INSERT INTO test_results VALUES (10, 'Zero Amount (transactions CHECK amount > 0)', 'Rejected with check_violation', 'Unexpected Success', 'FAILED');
EXCEPTION WHEN check_violation THEN
    INSERT INTO test_results VALUES (10, 'Zero Amount (transactions CHECK amount > 0)', 'Rejected with check_violation', 'Correctly rejected: ' || SQLERRM, 'PASSED');
END $$;

-- Test 11: Negative transaction amount
DO $$
BEGIN
    INSERT INTO transactions (user_id, merchant_id, amount, status, reference)
    VALUES ('b1111111-1111-1111-1111-111111111111', 'a1b2c3d4-0001-0001-0001-000000000001', -45.50, 'completed', 'REF-TEST-00003');
    INSERT INTO test_results VALUES (11, 'Negative Amount (transactions CHECK amount > 0)', 'Rejected with check_violation', 'Unexpected Success', 'FAILED');
EXCEPTION WHEN check_violation THEN
    INSERT INTO test_results VALUES (11, 'Negative Amount (transactions CHECK amount > 0)', 'Rejected with check_violation', 'Correctly rejected: ' || SQLERRM, 'PASSED');
END $$;

-- Test 12: Duplicate transaction reference (idempotency)
DO $$
BEGIN
    INSERT INTO transactions (user_id, merchant_id, amount, status, reference)
    VALUES ('b1111111-1111-1111-1111-111111111111', 'a1b2c3d4-0001-0001-0001-000000000001', 50.00, 'completed', 'REF-TEST-00001');
    INSERT INTO test_results VALUES (12, 'Duplicate Reference (transactions.reference UNIQUE)', 'Rejected with unique_violation', 'Unexpected Success', 'FAILED');
EXCEPTION WHEN unique_violation THEN
    INSERT INTO test_results VALUES (12, 'Duplicate Reference (transactions.reference UNIQUE)', 'Rejected with unique_violation', 'Correctly rejected: ' || SQLERRM, 'PASSED');
END $$;

-- Test 13: Orphan transaction (invalid merchant)
DO $$
BEGIN
    INSERT INTO transactions (user_id, merchant_id, amount, status, reference)
    VALUES ('b1111111-1111-1111-1111-111111111111', 'f9999999-9999-9999-9999-999999999999', 50.00, 'completed', 'REF-TEST-00004');
    INSERT INTO test_results VALUES (13, 'Invalid Merchant FK (transactions.merchant_id FK)', 'Rejected with foreign_key_violation', 'Unexpected Success', 'FAILED');
EXCEPTION WHEN foreign_key_violation THEN
    INSERT INTO test_results VALUES (13, 'Invalid Merchant FK (transactions.merchant_id FK)', 'Rejected with foreign_key_violation', 'Correctly rejected: ' || SQLERRM, 'PASSED');
END $$;

-- Test 14: Valid auth log
DO $$
BEGIN
    INSERT INTO auth_logs (user_id, method, result, score)
    VALUES ('b1111111-1111-1111-1111-111111111111', 'hog-baseline-v1', 'passed', 0.842100);
    INSERT INTO test_results VALUES (14, 'Insert Valid Auth Log', 'Success', 'Auth log recorded with raw similarity score', 'PASSED');
EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES (14, 'Insert Valid Auth Log', 'Success', SQLERRM, 'FAILED');
END $$;

-- Test 15: Invalid auth log result value
DO $$
BEGIN
    INSERT INTO auth_logs (user_id, method, result, score)
    VALUES ('b1111111-1111-1111-1111-111111111111', 'hog-baseline-v1', 'maybe', 0.500000);
    INSERT INTO test_results VALUES (15, 'Invalid Auth Result (auth_logs CHECK result IN (passed, failed))', 'Rejected with check_violation', 'Unexpected Success', 'FAILED');
EXCEPTION WHEN check_violation THEN
    INSERT INTO test_results VALUES (15, 'Invalid Auth Result (auth_logs CHECK result IN (passed, failed))', 'Rejected with check_violation', 'Correctly rejected: ' || SQLERRM, 'PASSED');
END $$;

-- Print summary table
\echo ''
\echo '========================================================================================'
\echo ' PALMPAY CONSTRAINT ENFORCEMENT & INTEGRITY VERIFICATION TEST RESULTS'
\echo '========================================================================================'
SELECT test_num AS "#", test_name AS "Test Specification", status AS "Verdict", actual_outcome AS "PostgreSQL Response" 
FROM test_results 
ORDER BY test_num;
\echo '========================================================================================'
\echo ''

-- Always rollback so test records never pollute the database
ROLLBACK;
