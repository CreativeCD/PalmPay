# PalmPay API Reference

All backend endpoints are prefixed with `/api`. Protected routes require the header:
```http
Authorization: Bearer <jwt_access_token>
```

---

## 1. Backend Express API (`http://localhost:5000`)

### System & Health

#### `GET /api/health`
Health check endpoint.
- **Auth:** Public
- **Response (200):**
```json
{
  "status": "ok",
  "service": "palmpay-backend",
  "timestamp": "2026-11-16T10:30:00.000Z"
}
```

---

### Authentication

#### `POST /api/auth/register`
Register a new user and initialize a demo wallet with ₹1,000.00 balance.
- **Auth:** Public
- **Body (JSON):**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecurePassword123"
}
```
- **Response (201):**
```json
{
  "message": "Registered successfully",
  "user": {
    "id": "c1f7a0b3-e29b-432d-8e4a-932b13c12a78",
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
}
```

#### `POST /api/auth/login`
Authenticate with email and password to receive a JWT access token.
- **Auth:** Public
- **Body (JSON):**
```json
{
  "email": "jane@example.com",
  "password": "SecurePassword123"
}
```
- **Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": "c1f7a0b3-e29b-432d-8e4a-932b13c12a78",
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
}
```

#### `GET /api/auth/me`
Return authenticated user details.
- **Auth:** Bearer Token
- **Response (200):**
```json
{
  "user": {
    "id": "c1f7a0b3-e29b-432d-8e4a-932b13c12a78",
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
}
```

---

### Wallet & Merchants

#### `GET /api/wallet`
Retrieve the current authenticated user's wallet balance.
- **Auth:** Bearer Token
- **Response (200):**
```json
{
  "balance": "1000.00",
  "updated_at": "2026-11-16T10:30:00.000Z"
}
```

#### `GET /api/merchants`
Retrieve active demo merchants.
- **Auth:** Bearer Token
- **Response (200):**
```json
[
  {
    "id": "a1b2c3d4-0001-0001-0001-000000000001",
    "name": "Campus Cafeteria",
    "category": "Food & Beverage"
  }
]
```

---

### Biometric Operations

#### `POST /api/biometric/enroll`
Enroll a user's NIR palm image.
- **Auth:** Bearer Token
- **Content-Type:** `multipart/form-data`
- **Fields:**
  - `palm_image`: File (PNG or JPEG, <= 5MB)
- **Response (200):**
```json
{
  "message": "Enrolled successfully",
  "method": "hog-baseline-v1"
}
```

#### `POST /api/biometric/verify`
Test a probe palm image against the enrolled template without initiating a transaction.
- **Auth:** Bearer Token
- **Content-Type:** `multipart/form-data`
- **Fields:**
  - `palm_image`: File (PNG or JPEG, <= 5MB)
- **Response (200):**
```json
{
  "matched": true,
  "similarity": 0.842105,
  "threshold": 0.6,
  "method": "hog-baseline-v1"
}
```

#### `GET /api/biometric/logs`
Audit log of past biometric verification attempts.
- **Auth:** Bearer Token
- **Response (200):**
```json
[
  {
    "id": "e4b6c8d0-...",
    "method": "hog-baseline-v1",
    "result": "passed",
    "score": "0.842105",
    "created_at": "2026-11-16T10:32:00.000Z"
  }
]
```

---

### Payments & Transactions

#### `POST /api/payments`
Authorize and process a simulated merchant payment protected by palm-vein biometrics.
- **Auth:** Bearer Token
- **Content-Type:** `multipart/form-data`
- **Fields:**
  - `merchantId`: UUID string
  - `amount`: number (> 0)
  - `reference`: UUID idempotency string
  - `palm_image`: File (PNG or JPEG)
- **Response (200):**
```json
{
  "message": "Payment successful (simulated)",
  "transaction": {
    "id": "7f8b9c0d-...",
    "amount": "25.50",
    "reference": "d982b13c-...",
    "created_at": "2026-11-16T10:35:00.000Z",
    "merchant": {
      "id": "a1b2c3d4-0001-0001-0001-000000000001",
      "name": "Campus Cafeteria"
    }
  },
  "newBalance": "974.50"
}
```

#### `GET /api/transactions`
List transaction history for the user.
- **Auth:** Bearer Token
- **Response (200):**
```json
[
  {
    "id": "7f8b9c0d-...",
    "amount": "25.50",
    "status": "completed",
    "reference": "d982b13c-...",
    "created_at": "2026-11-16T10:35:00.000Z",
    "merchant": {
      "id": "a1b2c3d4-0001-0001-0001-000000000001",
      "name": "Campus Cafeteria",
      "category": "Food & Beverage"
    }
  }
]
```

---

## 2. Internal Biometric Microservice (`http://127.0.0.1:8000`)

*Internal service: accessed exclusively by the Express backend.*

#### `GET /health`
- **Response (200):**
```json
{
  "status": "ok",
  "service": "palmpay-biometric",
  "timestamp": "2026-11-16T10:30:00.000000+00:00"
}
```

#### `POST /process/enroll`
- **Content-Type:** `multipart/form-data`
- **Body:** `palm_image: UploadFile`
- **Response (200):**
```json
{
  "success": true,
  "template": "<base64_encoded_numpy_bytes>",
  "method": "hog-baseline-v1",
  "shape": [128, 128]
}
```

#### `POST /process/verify`
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `palm_image: UploadFile`
  - `reference_template: string` (Form data, base64-encoded)
- **Response (200):**
```json
{
  "success": true,
  "matched": false,
  "similarity": 0.842105,
  "method": "hog-baseline-v1"
}
```
*Note: `matched` is always `false` in this response; the Express server applies the threshold.*
