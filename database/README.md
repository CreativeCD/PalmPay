# PalmPay Database Configuration

This directory contains the database definition for **PalmPay** using **PostgreSQL 14+**.

## Schema Overview

- `users`: User profiles and bcrypt password hashes.
- `biometric_templates`: Enrolled NIR palm-vein feature descriptors (HOG baseline), stored as serialized base64 strings.
- `wallets`: Demo account balances, initialized with `1000.00` demo credits, constrained to `>= 0`.
- `merchants`: Demo campus merchants for payment simulation.
- `transactions`: Log of completed transactions with idempotency key (`reference`).
- `auth_logs`: Audit trail of all biometric verification attempts and raw scores.

## Setup Instructions

### 1. Create PostgreSQL Database

```bash
# Using PostgreSQL CLI
createdb palmpay

# Or using psql prompt
psql -U postgres -c "CREATE DATABASE palmpay;"
```

### 2. Apply Schema & Seed

```bash
# Apply schema (tables, constraints, indices)
psql -d palmpay -f database/schema.sql

# Apply demo merchant seed data
psql -d palmpay -f database/seed.sql
```

### 3. Verify Tables

```bash
psql -d palmpay -c "\dt"
```
