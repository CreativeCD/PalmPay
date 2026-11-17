# PalmPay Database Specification

## 1. Relational Entity Diagram

```text
       +-------------------------+
       |          users          |
       +-------------------------+
       | id (PK, UUID)           |<-------+
       | name                    |        |
       | email (UNIQUE)          |        |
       | password_hash           |        |
       | created_at              |        |
       +-------------------------+        |
         | 1                     | 1      |
         |                       |        |
         v 1                     v 1      |
+---------------------+ +---------------+ |
| biometric_templates | |    wallets    | |
+---------------------+ +---------------+ |
| id (PK, UUID)       | | id (PK, UUID) | |
| user_id (FK, UNIQUE)| | user_id (FK,U)| |
| template_data       | | balance (>= 0)| |
| method              | | updated_at    | |
| created_at          | +---------------+ |
+---------------------+                   |
                                          |
         +--------------------------------+
         | 1                      | 1
         |                        |
         v M                      v M
+----------------------+ +--------------------+
|     transactions     | |     auth_logs      |
+----------------------+ +--------------------+
| id (PK, UUID)        | | id (PK, UUID)      |
| user_id (FK)         | | user_id (FK)       |
| merchant_id (FK)     | | method             |
| amount (> 0)         | | result (pass/fail) |
| status               | | score (NUMERIC)    |
| reference (UNIQUE)   | | created_at         |
| created_at           | +--------------------+
+----------------------+
         | M
         |
         v 1
+--------------------+
|     merchants      |
+--------------------+
| id (PK, UUID)      |
| name               |
| category           |
| active (BOOLEAN)   |
+--------------------+
```

## 2. Table Definitions & Constraints

### `users`
- Primary identity table for accounts.
- `email`: Enforced unique, case-insensitive in application logic.
- `password_hash`: Salted bcrypt hash with cost factor $\ge 12$. Plaintext is never stored.

### `biometric_templates`
- Stores serialized feature vectors.
- `UNIQUE (user_id)` ensures each account maintains exactly one active template.
- New enrollments execute an `ON CONFLICT (user_id) DO UPDATE` to overwrite previous templates.

### `wallets`
- Closed-loop virtual balance for demo purposes.
- Initialized with `1000.00` upon registration.
- `CHECK (balance >= 0)` ensures the database strictly prevents overdrafts regardless of application state.

### `merchants`
- Simulated vendors for payment checkout testing.
- `active`: Boolean flag allowing merchants to be disabled without breaking foreign key history.

### `transactions`
- Financial ledger of completed debits.
- `amount`: Constrained to positive values (`CHECK (amount > 0)`).
- `reference`: Unique idempotency key supplied by the client during payment submission to prevent double-charging on network retries.

### `auth_logs`
- Independent audit log for every biometric verification attempt.
- `result`: Restricted to `'passed'` or `'failed'`.
- `score`: Stores the raw float similarity value for post-evaluation and debugging.

## 3. Concurrency & Transaction Safety

When processing payments, the backend executes an atomic PostgreSQL transaction:
```sql
BEGIN;
SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE;
-- Verify balance >= amount
UPDATE wallets SET balance = balance - $2, updated_at = now() WHERE user_id = $1;
INSERT INTO transactions (id, user_id, merchant_id, amount, status, reference)
VALUES ($3, $1, $4, $2, 'completed', $5);
COMMIT;
```
The `SELECT ... FOR UPDATE` acquires an exclusive row-level lock on the user's wallet record, eliminating race conditions and double-spending across concurrent requests.
