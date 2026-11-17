# PalmPay
## Palm-Vein Biometric Authentication and Payment Simulation System

**Project type:** AP-DE academic capstone  
**Repository:** [https://github.com/CreativeCD/PalmPay](https://github.com/CreativeCD/PalmPay)  
**Team:** Charan, Shree Sai Deekhshit, Vaibhav Gupta, Rusheel  
**Current Milestone:** Day 1 Architecture & Scaffold Implementation Complete

> **Academic Capstone Notice:** PalmPay is an academic prototype exploring palm-vein biometric verification as an auxiliary authentication factor within a simulated closed-loop payment system. It is strictly a controlled simulation and is **not** connected to any real banking, UPI, card network, or live financial infrastructure.

---

## 1. Project Overview & Scope

PalmPay investigates whether palm-vein vascular patterns captured in near-infrared (NIR) spectrum images can be reliably processed and matched for authentication in a transaction workflow.

- **Frontend:** Single-page application built with React and Vite providing interfaces for user registration, login, dashboard, palm enrollment, palm verification testing, simulated merchant checkout, transaction history, and biometric audit logs.
- **Backend:** Node.js + Express API serving as the central orchestration and authorization authority. Features bcrypt credential hashing, JWT session verification, parameterized PostgreSQL transactions, and server-side biometric threshold enforcement.
- **Biometric Microservice:** Python, FastAPI, and OpenCV service executing image preprocessing (CLAHE, noise reduction), feature extraction (HOG baseline), and cosine similarity computation. Operates strictly statelessly with no direct database or wallet access.
- **Database:** PostgreSQL relational schema enforcing non-negative wallet constraints, unique idempotency keys for transactions, and append-only audit logs.

### Important Note on Image Acquisition
Palm-vein patterns depend on hemoglobin absorption of near-infrared light (760nm–850nm). **Ordinary consumer RGB webcams cannot reliably capture subcutaneous palm veins** because visible light does not penetrate the epidermal layers and standard cameras include optical IR-cut filters. Evaluation is performed using permissible NIR research datasets (e.g. CASIA, VERA, PolyU) or dedicated physical NIR hardware.

---

## 2. Repository Directory Structure

```text
PalmPay/
├── .env.example                 # Root environment variable documentation
├── .gitignore                   # Git exclusion rules
├── README.md                    # Project documentation and local setup
│
├── backend/                     # Node.js + Express REST API
│   ├── .env.example
│   ├── package.json
│   ├── src/
│   │   ├── app.js               # Express application factory & middleware
│   │   ├── server.js            # HTTP server entry point
│   │   ├── config/              # PostgreSQL pool & database connection
│   │   ├── controllers/         # Request handlers (auth, wallet, payments, etc.)
│   │   ├── middleware/          # JWT auth guard, Multer upload, central error handler
│   │   ├── routes/              # Route definitions delegating to controllers
│   │   └── services/            # Payment atomic logic, auth crypto, FastAPI client
│   └── db/                      # Fallback / backward-compatible schema scripts
│
├── biometric/                   # Python + FastAPI Biometric Microservice
│   ├── .env.example
│   ├── requirements.txt
│   ├── app.py                   # FastAPI service entry point (GET /health)
│   ├── preprocessing.py         # NIR palm image preprocessing (CLAHE, blur, resize)
│   ├── features.py              # Feature extraction (HOG baseline descriptor)
│   ├── matcher.py               # Cosine similarity calculation (raw score return)
│   ├── routers/                 # FastAPI endpoint definitions (/process/enroll, verify)
│   ├── services/                # Compatibility aliases for modular imports
│   └── samples/                 # Sample image directory & licensing documentation
│
├── frontend/                    # React 18 + Vite SPA
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.js           # Vite dev server with /api proxy to backend
│   ├── index.html
│   └── src/
│       ├── main.jsx             # React DOM root entry
│       ├── App.jsx              # Client-side routing configuration
│       ├── api/                 # Axios HTTP client with JWT interceptor
│       ├── context/             # AuthContext providing global auth state
│       ├── components/          # Reusable UI (NavBar, ImageUploader, ProtectedRoute)
│       └── pages/               # Views: Register, Login, Dashboard, Enroll,
│                                # Verify, Pay, Transactions, AuthLogs
│
├── database/                    # Canonical Database Schema & Seeds
│   ├── README.md                # PostgreSQL setup and migration instructions
│   ├── schema.sql               # DDL for all 6 core tables & performance indices
│   └── seed.sql                 # Demo merchant seed records
│
└── docs/                        # In-Depth Technical Documentation
    ├── architecture.md          # Sequence diagrams, system boundaries, threat model
    ├── api.md                   # Full REST API endpoint reference
    ├── biometric-pipeline.md    # Preprocessing, feature extraction & NIR optics
    └── database-schema.md       # Relational schema design & transaction safety
```

---

## 3. Architecture & Request Flow

```text
Browser / Frontend (Vite @ localhost:5173)
       |
       | HTTPS / JSON / Multipart requests
       v
Node.js + Express API (localhost:5000)  <------>  PostgreSQL Database
       |
       | Internal HTTP request (probe image + enrolled template)
       v
Python + FastAPI Microservice (localhost:8000)
       |
       | Preprocessing -> HOG extraction -> Cosine similarity
       v
Express receives raw similarity score and enforces BIOMETRIC_THRESHOLD
       |
       | If approved: begins SQL transaction (SELECT ... FOR UPDATE)
       v
SQL transaction: debit wallet + record transaction + log audit event
       |
       v
Frontend renders updated balance & transaction receipt
```

- **Express is the sole orchestrator:** The client browser never communicates directly with PostgreSQL or the internal Python microservice.
- **Server-side authorization only:** The client never passes `matched=true`. Verification occurs strictly server-to-server.
- **The Python service is stateless:** It performs vector arithmetic and image processing; it cannot modify wallets or authorize payments.

---

## 4. Local Setup Guide

Follow these exact steps to run all services locally.

### Prerequisites
- **Node.js** (LTS v18+ or v20+) & **npm**
- **Python** (v3.10+ recommended)
- **PostgreSQL** (v14+ recommended)
- **Git**

---

### Step 1: Database Setup (PostgreSQL)

Ensure your local PostgreSQL server is active:

```bash
# macOS (Homebrew):
brew services start postgresql

# Linux (systemd):
sudo systemctl start postgresql
```

Create the `palmpay` database and apply the schema and seed scripts:

```bash
# Create database
createdb palmpay

# Apply table definitions and constraints
psql -d palmpay -f database/schema.sql

# Seed demo merchants
psql -d palmpay -f database/seed.sql
```

---

### Step 2: Backend Setup (Express API)

```bash
cd backend

# Copy environment configuration
cp .env.example .env

# Edit .env to set your PostgreSQL credentials and JWT secret:
# DATABASE_URL=postgresql://<user>:<password>@localhost:5432/palmpay
# JWT_SECRET=<your_secure_random_key>

# Install dependencies
npm install

# Start development server with live reload (default port: 5000)
npm run dev
```

Verify backend health:
```bash
curl http://localhost:5000/api/health
```

---

### Step 3: Biometric Service Setup (Python FastAPI)

Open a new terminal window:

```bash
cd biometric

# Create and activate Python virtual environment
python3 -m venv .venv

# macOS / Linux:
source .venv/bin/activate

# Windows (PowerShell):
# .venv\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt

# Copy environment configuration
cp .env.example .env

# Start FastAPI server on localhost:8000
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

Verify biometric service health:
```bash
curl http://127.0.0.1:8000/health
```

---

### Step 4: Frontend Setup (React + Vite)

Open a third terminal window:

```bash
cd frontend

# Copy environment configuration
cp .env.example .env

# Install dependencies
npm install

# Start Vite dev server (default port: 5173)
npm run dev
```

Open your browser at `http://localhost:5173`. The Vite proxy will route all `/api/*` calls directly to the Express backend at `http://localhost:5000`.

---

## 5. Security & Academic Integrity Guidelines

- **No Plaintext Passwords:** Passwords must be hashed using bcrypt ($\ge 12$ rounds). Passwords and password hashes must never be logged or returned in API responses.
- **No Client Authorization Authority:** The frontend cannot authorize payments or claim a match. Express verifies tokens and evaluates similarity scores against `BIOMETRIC_THRESHOLD`.
- **Atomic Financial Transactions:** Balance checks and debits use `BEGIN ... SELECT ... FOR UPDATE ... COMMIT` in PostgreSQL to eliminate concurrency race conditions.
- **Idempotency Keys:** Payment submissions generate unique UUID `reference` keys to prevent double-charging on network retries.
- **No Secret Commits:** `.env` files are ignored by git; only `.env.example` templates with non-production placeholders are committed.
- **No Exaggerated Biometric Claims:** Biometric matching using HOG is an experimental baseline. The team does not fabricate accuracy figures, claim liveness detection, or represent standard RGB webcams as suitable for vascular scanning.

---

## 6. Team Ownership & Responsibilities

| Team Member | Primary Module & Responsibilities |
|---|---|
| **Charan** | Express backend, account authentication, JWT middleware, API integration, and payment orchestration |
| **Shree Sai Deekhshit** | Python/OpenCV preprocessing, feature extraction (HOG baseline), similarity matching, and dataset evaluation |
| **Vaibhav Gupta** | PostgreSQL schema design, foreign keys, check constraints, transaction atomicity, and seed data |
| **Rusheel** | React frontend architecture, user journeys, responsive forms, state management, and API client integration |

---

## 7. Six-Day Delivery Roadmap

- **Day 1 (Completed):** Repository architecture established, complete folder structure, database schema & seeds, Express MVC scaffolding, FastAPI image microservice, React frontend with routing, and comprehensive documentation.
- **Day 2:** Live database connectivity, end-to-end user registration/login flow, and baseline preprocessing pipeline testing.
- **Day 3:** Biometric enrollment and verification connected end-to-end between Frontend, Express, and FastAPI.
- **Day 4:** Merchant catalog, simulated wallet operations, atomic checkout orchestration, and transaction history.
- **Day 5:** Negative testing (insufficient balance, impostor palm sample, token expiration, idempotency collision), test suite execution, and demo rehearsal.
- **Day 6:** Final code freeze, documentation polish, empirical metrics compilation, and viva preparation.

---

## 8. Detailed Documentation Links

- [System Architecture & Threat Model](file:///Users/charandurga/PalmPay/docs/architecture.md)
- [REST API Reference](file:///Users/charandurga/PalmPay/docs/api.md)
- [Biometric Image Processing Pipeline](file:///Users/charandurga/PalmPay/docs/biometric-pipeline.md)
- [Database Schema & Constraints](file:///Users/charandurga/PalmPay/docs/database-schema.md)
