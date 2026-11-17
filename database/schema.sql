-- =============================================================================
-- PalmPay Database Schema
-- Target Engine: PostgreSQL 14+
-- Run: psql -d palmpay -f database/schema.sql
-- =============================================================================

-- Enable pgcrypto for gen_random_uuid() (standard on Postgres 13+)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- users
-- Stores account credentials and profile. Password is encrypted using bcrypt.
-- Never store plaintext passwords.
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
-- Holds the serialized feature descriptor extracted from approved NIR palm images.
-- One template per user; re-enrollment upserts to maintain single active template.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS biometric_templates (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_data TEXT        NOT NULL,   -- base64-encoded numpy float32 descriptor
  method        TEXT        NOT NULL,   -- e.g. 'hog-baseline-v1'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- -----------------------------------------------------------------------------
-- wallets
-- Simulated demo wallet. Balance constrained to non-negative values.
-- Updated atomically during payment processing via SELECT ... FOR UPDATE.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallets (
  id         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID           UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance    NUMERIC(12, 2) NOT NULL DEFAULT 1000.00 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- merchants
-- Closed-loop simulated merchants for checkout testing.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS merchants (
  id       UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name     TEXT    NOT NULL,
  category TEXT,
  active   BOOLEAN NOT NULL DEFAULT true
);

-- -----------------------------------------------------------------------------
-- transactions
-- Audit record of simulated payments.
-- 'reference' column is an idempotency key preventing duplicate payment processing.
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
-- auth_logs
-- Biometric verification attempt log.
-- Stores raw similarity scores and pass/fail verdicts for evaluation and auditing.
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
-- Query Performance Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id    ON auth_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created    ON auth_logs (created_at DESC);
