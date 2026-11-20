import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ImageUploader from '../components/ImageUploader.jsx';
import client from '../api/client.js';

const DEMO_MERCHANTS = [
  {
    id: 'a1b2c3d4-0001-0001-0001-000000000001',
    name: 'Campus Cafeteria',
    category: 'Food & Beverage',
  },
  {
    id: 'a1b2c3d4-0001-0001-0001-000000000002',
    name: 'University Bookstore',
    category: 'Retail & Books',
  },
  {
    id: 'a1b2c3d4-0001-0001-0001-000000000003',
    name: 'Student Union Convenience',
    category: 'Groceries',
  },
];

const s = {
  page: { maxWidth: 600, margin: '40px auto', fontFamily: 'sans-serif', padding: 24 },
  title: { fontSize: 26, fontWeight: 700, marginBottom: 6 },
  desc: { color: '#4a5568', fontSize: 14, marginBottom: 20, lineHeight: 1.5 },
  simulatedBanner: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    color: '#1e40af',
    padding: '10px 14px',
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 1.4,
  },
  balanceBox: {
    background: '#1a1a2e',
    color: '#fff',
    borderRadius: 8,
    padding: '16px 20px',
    marginBottom: 20,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  field: { marginBottom: 18 },
  label: { display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14, color: '#1f2937' },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 15,
    boxSizing: 'border-box',
    background: '#fff',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 15,
    boxSizing: 'border-box',
  },
  confirmCard: {
    background: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    padding: 18,
    marginBottom: 20,
  },
  confirmRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px dashed #e2e8f0',
    fontSize: 14,
  },
  btnRow: { display: 'flex', gap: 12, marginTop: 20 },
  primaryBtn: {
    flex: 1,
    padding: '12px',
    background: '#e94560',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
  },
  secondaryBtn: {
    padding: '12px 18px',
    background: '#e2e8f0',
    color: '#334155',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnDisabled: {
    background: '#94a3b8',
    cursor: 'not-allowed',
  },
  err: {
    color: '#991b1b',
    marginTop: 16,
    fontSize: 13,
    padding: 14,
    background: '#fef2f2',
    borderRadius: 6,
    border: '1px solid #fecaca',
    lineHeight: 1.4,
  },
  receipt: {
    background: '#f0fdf4',
    border: '2px solid #86efac',
    borderRadius: 10,
    padding: 24,
    marginTop: 20,
  },
  receiptTitle: {
    color: '#166534',
    fontSize: 20,
    fontWeight: 700,
    margin: '0 0 6px 0',
  },
  receiptSubtitle: {
    color: '#15803d',
    fontSize: 13,
    marginBottom: 16,
  },
};

export default function Pay() {
  const [step, setStep] = useState(1); // 1: Entry, 2: Confirmation & Biometric Upload, 3: Receipt
  const [merchants, setMerchants] = useState(DEMO_MERCHANTS);
  const [merchantId, setMerchantId] = useState(DEMO_MERCHANTS[0].id);
  const [amount, setAmount] = useState('');
  const [walletBalance, setWalletBalance] = useState(null);
  const [balanceErr, setBalanceErr] = useState('');
  const [reference, setReference] = useState('');
  const [file, setFile] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Load wallet balance and merchants list
  useEffect(() => {
    // 1. GET /api/wallet
    client
      .get('/wallet')
      .then((res) => {
        const bal = res.data?.wallet?.balance ?? res.data?.balance;
        if (bal !== undefined && bal !== null) {
          setWalletBalance(parseFloat(bal));
        }
      })
      .catch((err) => {
        setBalanceErr(err.response?.data?.error || 'Could not fetch wallet balance.');
      });

    // 2. GET /api/merchants
    client
      .get('/merchants')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setMerchants(res.data);
          setMerchantId(res.data[0].id);
        }
      })
      .catch(() => {
        // Fall back to agreed demo merchants from api.md if endpoint is pending (501)
        setMerchants(DEMO_MERCHANTS);
      });
  }, []);

  const selectedMerchant = merchants.find((m) => m.id === merchantId) || {
    id: merchantId,
    name: 'Selected Merchant',
    category: 'Commercial',
  };

  // Step 1: Proceed to confirmation
  function handleProceedToConfirmation(e) {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid payment amount greater than ₹ 0.');
      return;
    }

    if (walletBalance !== null && parsedAmount > walletBalance) {
      setError(
        `Insufficient funds: Required ₹ ${parsedAmount.toFixed(2)}, but available balance is ₹ ${walletBalance.toFixed(2)}.`
      );
      return;
    }

    // Generate idempotency reference for this transaction
    const newRef = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `ref-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setReference(newRef);
    setFile(null);
    setStep(2);
  }

  // Step 2: Authorize Payment via POST /api/payments
  async function handleAuthorizePayment(e) {
    e.preventDefault();
    if (!file) {
      setError('Please upload an NIR palm image for biometric verification.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const form = new FormData();
      form.append('palm_image', file);
      // Pass both keys to support backend requirements cleanly
      form.append('merchant_id', merchantId);
      form.append('merchantId', merchantId);
      form.append('amount', parseFloat(amount).toFixed(2));
      form.append('reference', reference);

      // Do not decide authorization in frontend or show receipt before backend confirms commit
      const res = await client.post('/payments', form);

      // Backend committed payment transaction atomically!
      setReceipt(res.data);
      if (res.data?.newBalance !== undefined) {
        setWalletBalance(parseFloat(res.data.newBalance));
      }
      setStep(3);
    } catch (err) {
      // Handle insufficient funds, failed verification, loading and network errors
      const status = err.response?.status;
      const data = err.response?.data;

      if (status === 422 || data?.code === 'INSUFFICIENT_FUNDS') {
        setError(
          `Payment Denied (Insufficient Funds): ${
            data?.error || 'Your demo wallet balance is insufficient for this payment.'
          }`
        );
      } else if (status === 403) {
        if (data?.error?.includes('not enrolled')) {
          setError(
            'Payment Denied: Biometric template not enrolled. Please complete palm enrollment first.'
          );
        } else {
          setError(
            `Payment Denied (Biometric Verification Failed): ${
              data?.error || 'Probe palm does not match enrolled template.'
            } (Similarity: ${
              typeof data?.similarity === 'number' ? data.similarity.toFixed(4) : 'N/A'
            })`
          );
        }
      } else if (status === 409 || data?.code === 'DUPLICATE_REF') {
        setError('Duplicate Reference: This transaction reference was already used.');
      } else if (status === 501) {
        setError('Payment Endpoint Pending: Backend payment service is awaiting implementation (501).');
      } else {
        const errorMsg =
          data?.error ||
          data?.message ||
          (err.code === 'ERR_NETWORK'
            ? 'Cannot connect to backend server. Ensure Express API is running.'
            : err.message || 'Payment processing failed.');
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setStep(1);
    setAmount('');
    setFile(null);
    setReceipt(null);
    setError('');
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>💳 Merchant Payment</h1>
      <p style={s.desc}>
        Simulate an in-person merchant checkout protected by server-side NIR palm-vein biometrics.
      </p>

      <div style={s.simulatedBanner}>
        <strong>⚠️ Simulated Academic Payment:</strong> All transactions are closed-loop simulations
        using an internal virtual ledger. No real money, bank accounts, or UPI networks are involved.
      </div>

      <div style={s.balanceBox}>
        <div>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>Demo Wallet Balance</span>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#e94560', marginTop: 2 }}>
            {walletBalance !== null ? `₹ ${walletBalance.toFixed(2)}` : balanceErr ? 'Unavailable' : 'Loading…'}
          </div>
        </div>
        <Link
          to="/transactions"
          style={{ color: '#cbd5e1', fontSize: 13, textDecoration: 'underline' }}
        >
          View History
        </Link>
      </div>

      {/* STEP 1: Enter Merchant and Amount */}
      {step === 1 && (
        <form onSubmit={handleProceedToConfirmation}>
          <div style={s.field}>
            <label style={s.label}>Select Merchant</label>
            <select
              style={s.select}
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
            >
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.category})
                </option>
              ))}
            </select>
          </div>

          <div style={s.field}>
            <label style={s.label}>Payment Amount (₹)</label>
            <input
              style={s.input}
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 45.00"
              required
            />
          </div>

          {error && <div style={s.err}>{error}</div>}

          <button type="submit" style={s.primaryBtn}>
            Review Order & Proceed to Palm Verification →
          </button>
        </form>
      )}

      {/* STEP 2: Review & Biometric Verification */}
      {step === 2 && (
        <form onSubmit={handleAuthorizePayment}>
          <div style={s.confirmCard}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 16, color: '#1e293b' }}>
              Confirm Payment Details
            </h3>
            <div style={s.confirmRow}>
              <span style={{ color: '#64748b' }}>Merchant:</span>
              <strong>{selectedMerchant.name}</strong>
            </div>
            <div style={s.confirmRow}>
              <span style={{ color: '#64748b' }}>Category:</span>
              <span>{selectedMerchant.category}</span>
            </div>
            <div style={s.confirmRow}>
              <span style={{ color: '#64748b' }}>Amount to Pay:</span>
              <strong style={{ color: '#e94560', fontSize: 16 }}>
                ₹ {parseFloat(amount).toFixed(2)}
              </strong>
            </div>
            <div style={s.confirmRow}>
              <span style={{ color: '#64748b' }}>Idempotency Reference:</span>
              <code style={{ fontSize: 12 }}>{reference}</code>
            </div>
          </div>

          <ImageUploader
            onFile={setFile}
            label="Upload NIR Palm Image for Payment Authorization"
          />

          {error && <div style={s.err}>{error}</div>}

          <div style={s.btnRow}>
            <button
              type="button"
              style={s.secondaryBtn}
              onClick={() => {
                setStep(1);
                setError('');
              }}
              disabled={loading}
            >
              ← Back
            </button>
            <button
              type="submit"
              style={{
                ...s.primaryBtn,
                ...(loading || !file ? s.btnDisabled : {}),
              }}
              disabled={loading || !file}
            >
              {loading ? 'Verifying & Committing Payment…' : 'Authorize Payment (Simulated)'}
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: Receipt (shown ONLY after backend confirms commit) */}
      {step === 3 && receipt && (
        <div style={s.receipt}>
          <div style={s.receiptTitle}>✓ Simulated Payment Successful</div>
          <div style={s.receiptSubtitle}>
            Virtual ledger transaction committed atomically by backend.
          </div>

          <div style={s.confirmRow}>
            <span>Transaction ID:</span>
            <code>{receipt.transaction?.id || 'simulated-tx'}</code>
          </div>
          <div style={s.confirmRow}>
            <span>Merchant:</span>
            <strong>{receipt.transaction?.merchant?.name || selectedMerchant.name}</strong>
          </div>
          <div style={s.confirmRow}>
            <span>Amount Debited:</span>
            <strong style={{ color: '#16a34a' }}>
              ₹ {parseFloat(receipt.transaction?.amount || amount).toFixed(2)}
            </strong>
          </div>
          <div style={s.confirmRow}>
            <span>Reference:</span>
            <code style={{ fontSize: 12 }}>{receipt.transaction?.reference || reference}</code>
          </div>
          <div style={s.confirmRow}>
            <span>Timestamp:</span>
            <span>
              {receipt.transaction?.created_at
                ? new Date(receipt.transaction.created_at).toLocaleString()
                : new Date().toLocaleString()}
            </span>
          </div>
          <div style={s.confirmRow}>
            <span>Updated Wallet Balance:</span>
            <strong>
              ₹{' '}
              {receipt.newBalance !== undefined
                ? parseFloat(receipt.newBalance).toFixed(2)
                : walletBalance !== null
                ? walletBalance.toFixed(2)
                : '—'}
            </strong>
          </div>

          <div style={s.btnRow}>
            <button type="button" style={s.primaryBtn} onClick={handleReset}>
              Make Another Payment
            </button>
            <Link to="/transactions" style={{ ...s.secondaryBtn, textDecoration: 'none', textAlign: 'center' }}>
              View History
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
