import React, { useEffect, useState } from 'react';
import ImageUploader from '../components/ImageUploader.jsx';
import client from '../api/client.js';

const s = {
  page: { maxWidth: 560, margin: '40px auto', fontFamily: 'sans-serif', padding: 24 },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 8 },
  desc: { color: '#555', fontSize: 13, marginBottom: 20, lineHeight: 1.5 },
  notice: {
    background: '#f8f9fa',
    border: '1px solid #ddd',
    borderRadius: 6,
    padding: '10px 14px',
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
  },
  field: { marginBottom: 16 },
  label: { display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ccc',
    borderRadius: 6,
    fontSize: 15,
    boxSizing: 'border-box',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ccc',
    borderRadius: 6,
    fontSize: 15,
    boxSizing: 'border-box',
  },
  btn: {
    width: '100%',
    padding: '12px',
    background: '#e94560',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 16,
    cursor: 'pointer',
    marginTop: 8,
  },
  btnDisabled: {
    background: '#aaa',
    cursor: 'not-allowed',
  },
  placeholderBanner: {
    background: '#fff9db',
    border: '1px solid #f08c00',
    color: '#664d03',
    padding: '10px 14px',
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 16,
  },
  err: {
    color: '#c0392b',
    fontSize: 13,
    marginTop: 12,
    padding: 12,
    background: '#fde8e8',
    borderRadius: 6,
    border: '1px solid #f8b4b4',
  },
  receipt: {
    background: '#f0fff4',
    border: '1px solid #27ae60',
    borderRadius: 8,
    padding: 20,
    marginTop: 20,
  },
};

export default function Pay() {
  const [merchants, setMerchants] = useState([]);
  const [merchantId, setMerchantId] = useState('');
  const [amount, setAmount] = useState('');
  const [file, setFile] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
  const [merchantError, setMerchantError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    client
      .get('/merchants')
      .then((r) => {
        if (Array.isArray(r.data)) {
          setMerchants(r.data);
          if (r.data.length) setMerchantId(r.data[0].id);
        }
      })
      .catch((err) => {
        const msg =
          err.response?.data?.error ||
          (err.response?.status === 501
            ? 'Merchants API pending backend implementation (501 Not Implemented).'
            : 'Could not load merchants.');
        setMerchantError(msg);
      });
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    if (!file) {
      setError('Please select a palm image for verification.');
      return;
    }
    if (!merchantId) {
      setError('Please select a merchant.');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Enter a valid amount greater than 0.');
      return;
    }
    setError('');
    setReceipt(null);
    setLoading(true);

    try {
      const form = new FormData();
      form.append('palm_image', file);
      form.append('merchantId', merchantId);
      form.append('amount', amount);
      form.append('reference', crypto.randomUUID ? crypto.randomUUID() : Date.now().toString());

      const { data } = await client.post('/payments', form);
      setReceipt(data);
    } catch (err) {
      // Never fake success
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        (err.response?.status === 501
          ? 'Payment API pending backend implementation (501 Not Implemented).'
          : 'Payment processing failed');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>💳 Merchant Payment</h1>
      <p style={s.desc}>
        Select a merchant, enter an amount, then upload your NIR palm image for biometric
        verification. The backend verifies your identity server-side.
        <br />
        <strong>All payments are simulated. No real money is involved.</strong>
      </p>

      <div style={s.notice}>
        <strong>API Endpoints:</strong> <code>GET /api/merchants</code> and <code>POST /api/payments</code>.
      </div>

      {merchantError && (
        <div style={s.placeholderBanner}>
          <strong>Endpoint Status:</strong> {merchantError}
        </div>
      )}

      {!receipt ? (
        <form onSubmit={onSubmit}>
          <div style={s.field}>
            <label style={s.label}>Merchant</label>
            <select
              style={s.select}
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              disabled={loading || merchants.length === 0}
            >
              {merchants.length > 0 ? (
                merchants.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.category}
                  </option>
                ))
              ) : (
                <option value="">[No merchants available — API pending]</option>
              )}
            </select>
          </div>

          <div style={s.field}>
            <label style={s.label}>Amount (₹)</label>
            <input
              style={s.input}
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 50.00"
              disabled={loading}
              required
            />
          </div>

          <ImageUploader onFile={setFile} label="Upload NIR Palm Image for Verification" />

          {error && <div style={s.err}>{error}</div>}

          <button
            style={{
              ...s.btn,
              ...(loading || !file || !merchantId ? s.btnDisabled : {}),
            }}
            type="submit"
            disabled={loading || !file || !merchantId}
          >
            {loading ? 'Verifying & processing…' : 'Authorise Payment'}
          </button>
        </form>
      ) : (
        <div style={s.receipt}>
          <h2 style={{ color: '#27ae60', marginTop: 0 }}>✓ Payment Successful (Simulated)</h2>
          <p>
            <strong>Merchant:</strong> {receipt.transaction?.merchant?.name}
          </p>
          <p>
            <strong>Amount:</strong> ₹ {parseFloat(receipt.transaction?.amount || 0).toFixed(2)}
          </p>
          <p>
            <strong>Reference:</strong> {receipt.transaction?.reference}
          </p>
          <p>
            <strong>New Balance:</strong> ₹ {parseFloat(receipt.newBalance || 0).toFixed(2)}
          </p>
          <button style={s.btn} onClick={() => setReceipt(null)}>
            Make Another Payment
          </button>
        </div>
      )}
    </div>
  );
}
