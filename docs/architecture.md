# PalmPay System Architecture

## 1. System Overview

PalmPay is an academic prototype evaluating palm-vein biometric verification integrated into a simulated closed-loop payment system.

```text
+-------------------------------------------------------------+
|                      Client Browser                         |
|  React (Vite) Single-Page Application (localhost:5173)      |
+-------------------------------------------------------------+
                              |
                              | HTTPS / JSON / Multipart
                              v
+-------------------------------------------------------------+
|                  Express Backend API (Port 5000)            |
| - Authentication & Token Signing (bcrypt + JWT)             |
| - Authorization & Business Logic Orchestration              |
| - Parameterized SQL queries via PostgreSQL pool             |
| - Biometric threshold evaluation (server-side)              |
+-------------------------------------------------------------+
          |                                       |
          | Internal HTTP                         | SQL Transactions
          | (localhost:8000)                      | (SELECT ... FOR UPDATE)
          v                                       v
+---------------------------------+   +-----------------------+
|   Python Biometric Service      |   |   PostgreSQL Database |
|   (FastAPI + OpenCV)            |   |                       |
| - Grayscale & CLAHE & Blur      |   | - users               |
| - HOG Feature Extraction        |   | - biometric_templates |
| - Cosine Similarity Scoring     |   | - wallets             |
| * Stateless (No DB writes)      |   | - merchants           |
| * No Payment Authorization      |   | - transactions        |
+---------------------------------+   | - auth_logs           |
                                      +-----------------------+
```

## 2. Core Architectural Principles

### Strict Service Boundaries
1. **Express is the Sole Orchestrator:**
   The frontend communicates only with the Express API. It cannot directly query PostgreSQL or interact directly with the Python biometric microservice.
2. **Client Never Authorizes Payment:**
   The browser never submits a `matched=true` flag to trigger a payment. Biometric verification occurs strictly server-to-server: Express receives the uploaded probe image, forwards it to FastAPI, receives the raw similarity score, compares it to the configured threshold, and decides whether to authorize the payment.
3. **Stateless Biometric Microservice:**
   The Python FastAPI service does not connect to the database, does not hold user records, and does not update wallet balances. It operates strictly as an image-processing and vector-scoring worker.
4. **Closed-Loop Simulation:**
   No live bank networks, UPI APIs, or payment gateways are used. All wallets are internal virtual ledgers initialized with demo credits.

## 3. Request Flow: Biometric Payment Checkout

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant Express as Express Backend (:5000)
    participant Python as Biometric Service (:8000)
    participant DB as PostgreSQL Database

    User->>Express: POST /api/payments (merchantId, amount, reference, palm_image)
    Express->>Express: Verify JWT session
    Express->>DB: Check merchant active & user wallet balance
    Express->>DB: Query enrolled biometric template for user
    Express->>Python: POST /process/verify (probe image + enrolled template)
    Python->>Python: Decode -> Preprocess (CLAHE) -> Extract HOG -> Compute Cosine Sim
    Python-->>Express: Return raw similarity score & method
    Express->>Express: Evaluate score >= BIOMETRIC_THRESHOLD
    alt Score < Threshold
        Express->>DB: INSERT INTO auth_logs (result='failed', score)
        Express-->>User: 403 Forbidden (biometric_verification_failed)
    else Score >= Threshold
        Express->>DB: BEGIN Transaction
        Express->>DB: SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE
        Express->>DB: UPDATE wallets SET balance = balance - amount
        Express->>DB: INSERT INTO transactions (id, user_id, merchant_id, amount, reference)
        Express->>DB: INSERT INTO auth_logs (result='passed', score)
        Express->>DB: COMMIT Transaction
        Express-->>User: 200 OK (Payment successful + receipt)
    end
```

## 4. Threat Model & Mitigations

| Threat | Risk | Mitigation |
|---|---|---|
| Client forgery of biometric verdict | Unauthorized debit | The browser cannot pass verification flags; Express orchestrates FastAPI comparison. |
| Concurrent double-spend | Wallet overdraft | SQL transaction with `SELECT ... FOR UPDATE` row-level locking. |
| Duplicate payment submission | Multiple charges | Client generates UUID idempotency `reference`; DB enforces unique constraint. |
| Credential disclosure | Password breach | bcrypt hashing with minimum 12 rounds; passwords excluded from API responses. |
| SQL Injection | Data exfiltration | Parameterized SQL queries (`$1, $2`) via `pg` library. |
| Arbitrary file upload | RCE / Resource exhaustion | Server-side MIME check (`image/png`, `image/jpeg`) and 5MB size limit. |
