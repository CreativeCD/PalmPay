-- =============================================================================
-- PalmPay Database Schema
-- PostgreSQL 14+
-- Run: psql -d palmpay -f schema.sql
-- =============================================================================

-- Enable pgcrypto for gen_random_uuid() (available in Postgres 13+ as built-in)
-- If using Postgres < 13, run: CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  email         TEXT        UNIQUE NOT NULL,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- biometric_templates
-- One template per user; re-enrollment replaces the previous record (UPSERT).
-- Template data is a serialized HOG feature vector (numpy bytes → base64).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS biometric_templates (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_data TEXT        NOT NULL,   -- base64-encoded numpy float32 bytes
  method        TEXT        NOT NULL,   -- e.g. 'hog-baseline-v1'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)                      -- enforce one template per user
);

-- -----------------------------------------------------------------------------
-- wallets
-- One wallet per user; balance must stay non-negative (enforced in app + DB).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallets (
  id         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID           UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance    NUMERIC(12, 2) NOT NULL DEFAULT 1000.00 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- merchants   (demo data only — no real money movement)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS merchants (
  id       UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name     TEXT    NOT NULL,
  category TEXT,
  active   BOOLEAN NOT NULL DEFAULT true
);

-- -----------------------------------------------------------------------------
-- transactions
-- reference is the idempotency key supplied by the client.
-- A UNIQUE constraint on reference prevents double-submission.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID           NOT NULL REFERENCES users(id),
  merchant_id UUID           NOT NULL REFERENCES merchants(id),
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  status      TEXT           NOT NULL DEFAULT 'completed',
  reference   TEXT           UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- auth_logs   (biometric attempt audit trail)
-- score stores the raw similarity value only — no threshold applied here.
-- method records the feature extraction technique used.
-- result is 'passed' or 'failed'.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_logs (
  id         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID           NOT NULL REFERENCES users(id),
  method     TEXT           NOT NULL,
  result     TEXT           NOT NULL CHECK (result IN ('passed', 'failed')),
  score      NUMERIC(8, 6),              -- raw similarity score
  created_at TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Indexes for common query patterns
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id    ON auth_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created    ON auth_logs (created_at DESC);
