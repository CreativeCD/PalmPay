# PalmPay Database Configuration & Verification

This directory contains the production database definition, seed data, and constraint test suite for **PalmPay** using **PostgreSQL 14+**.

## 1. Agreed SQL Engine: PostgreSQL 14+

- **Engine Selected:** PostgreSQL 14+ (tested on PostgreSQL 18.6).
- **Justification:**
  - Native `UUID` type with `pgcrypto` (`gen_random_uuid()`) for distributed, collision-resistant primary keys.
  - Strict domain `CHECK` constraints on financial amounts (`amount > 0`) and balances (`balance >= 0`).
  - Row-level locking via `SELECT ... FOR UPDATE` inside atomic transactions to eliminate double-spending race conditions.
  - Native driver support (`pg` / `node-postgres`) in the Express.js API backend.

---

## 2. Schema Overview

The relational model consists of 6 core tables:

| Table Name | Primary Key | Foreign Keys / Relationships | Constraints & Indices |
|---|---|---|---|
| `users` | `id` (UUID) | None | `email` (UNIQUE, NOT NULL), `password_hash` (NOT NULL) |
| `biometric_templates` | `id` (UUID) | `user_id` -> `users(id)` (ON DELETE CASCADE) | `UNIQUE (user_id)` (1:1 with user) |
| `wallets` | `id` (UUID) | `user_id` -> `users(id)` (ON DELETE CASCADE) | `UNIQUE (user_id)` (1:1 with user), `CHECK (balance >= 0)`, Default 1000.00 |
| `merchants` | `id` (UUID) | None | `name` (NOT NULL), `active` (BOOLEAN DEFAULT true) |
| `transactions` | `id` (UUID) | `user_id` -> `users(id)`, `merchant_id` -> `merchants(id)` | `CHECK (amount > 0)`, `reference` (UNIQUE, NOT NULL), Indexes on `user_id` and `created_at DESC` |
| `auth_logs` | `id` (UUID) | `user_id` -> `users(id)` | `CHECK (result IN ('passed', 'failed'))`, Indexes on `user_id` and `created_at DESC` |

---

## 3. Setup Instructions

### Step 1: Create Database
```bash
# Using PostgreSQL CLI
createdb palmpay

# Or using psql prompt
psql -c "CREATE DATABASE palmpay;"
```

### Step 2: Apply Schema (Tables, Constraints, Indexes)
```bash
psql -d palmpay -f database/schema.sql
```

### Step 3: Load Demo Seed Data
```bash
psql -d palmpay -f database/seed.sql
```

### Step 4: Verify Tables and Seed Merchants
```bash
psql -d palmpay -c "\dt"
psql -d palmpay -c "SELECT id, name, category, active FROM merchants;"
```

---

## 4. Constraint Enforcement & Integrity Testing

To verify that all primary keys, foreign keys, unique email checks, 1:1 wallet/user rules, balance constraints, and transaction idempotency keys are actively enforced by PostgreSQL, run the automated test suite:

```bash
psql -d palmpay -f database/test_constraints.sql
```

This test suite executes 15 distinct validation scenarios (including negative balances, zero transaction amounts, duplicate emails, and orphan foreign keys). All test operations are safely wrapped in an automatic `ROLLBACK` so test rows never alter production database state.

---

## 5. Environment Coordination (Safe Config)

Coordinate the following environment variable names with the team:

```env
# Backend Connection String (Never commit database passwords to Git)
DATABASE_URL=postgresql://<DB_USER>:<DB_PASSWORD>@localhost:5432/palmpay
```
