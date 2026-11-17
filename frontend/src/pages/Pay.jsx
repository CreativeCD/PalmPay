import React, { useEffect, useState } from 'react';
import ImageUploader from '../components/ImageUploader.jsx';
import client from '../api/client.js';

const s = {
  page:   { maxWidth: 560, margin: '40px auto', fontFamily: 'sans-serif', padding: 24 },
  title:  { fontSize: 24, fontWeight: 700, marginBottom: 8 },
  desc:   { color: '#555', fontSize: 13, marginBottom: 24, lineHeight: 1.5 },
  field:  { marginBottom: 16 },
  label:  { display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 },
  select: { width: '100%', padding: '10px 12px', border: '1px solid #ccc',
            borderRadius: 6, fontSize: 15, boxSizing: 'border-box' },
  input:  { width: '100%', padding: '10px 12px', border: '1px solid #ccc',
            borderRadius: 6, fontSize: 15, boxSizing: 'border-box' },
  btn:    { width: '100%', padding: '12px', background: '#e94560', color: '#fff',
            border: 'none', borderRadius: 6, fontSize: 16, cursor: 'pointer', marginTop: 8 },
  err:    { color: '#c0392b', fontSize: 13, marginTop: 8 },
  receipt:{ background: '#f0fff4', border: '1px solid #27ae60', borderRadius: 8,
            padding: 20, marginTop: 20 },
};

export default function Pay() {
  const [merchants, setMerchants]   = useState([]);
  const [merchantId, setMerchantId] = useState('');
  const [amount, setAmount]         = useState('');
  const [file, setFile]             = useState(null);
  const [receipt, setReceipt]       = useState(null);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    client.get('/merchants').then(r => {
      setMerchants(r.data);
      if (r.data.length) setMerchantId(r.data[0].id);
    });
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    if (!file)       { setError('Please select a palm image for verification.'); return; }
    if (!merchantId) { setError('Please select a merchant.'); return; }
    if (!amount || parseFloat(amount) <= 0) { setError('Enter a valid amount.'); return; }
    setError(''); setReceipt(null); setLoading(true);

    try {
      const form = new FormData();
      form.append('palm_image', file);
      form.append('merchantId', merchantId);
      form.append('amount',     amount);
      form.append('reference',  crypto.randomUUID ? crypto.randomUUID() : Date.now().toString());

      const { data } = await client.post('/payments', form);
      setReceipt(data);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Payment failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>💳 Make a Payment</h1>
      <p style={s.desc}>
        Select a merchant, enter an amount, then upload your NIR palm image for biometric
        verification. The backend verifies your identity — the browser never decides
        whether the payment is authorised.
        <br /><strong>All payments are simulated. No real money is involved.</strong>
      </p>

      {!receipt ? (
        <form onSubmit={onSubmit}>
          <div style={s.field}>
            <label style={s.label}>Merchant</label>
            <select style={s.select} value={merchantId}
                    onChange={e => setMerchantId(e.target.value)}>
              {merchants.map(m => (
                <option key={m.id} value={m.id}>{m.name} — {m.category}</option>
              ))}
            </select>
          </div>
          <div style={s.field}>
            <label style={s.label}>Amount (₹)</label>
            <input style={s.input} type="number" min="1" step="0.01"
                   value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <ImageUploader onFile={setFile} label="Upload NIR Palm Image for Verification" />
          {error && <p style={s.err}>{error}</p>}
          <button style={s.btn} type="submit" disabled={loading || !file}>
            {loading ? 'Verifying & processing…' : 'Authorise Payment'}
          </button>
        </form>
      ) : (
        <div style={s.receipt}>
          <h2 style={{ color: '#27ae60', marginTop: 0 }}>✓ Payment Successful (Simulated)</h2>
          <p><strong>Merchant:</strong> {receipt.transaction.merchant.name}</p>
          <p><strong>Amount:</strong> ₹ {parseFloat(receipt.transaction.amount).toFixed(2)}</p>
          <p><strong>Reference:</strong> {receipt.transaction.reference}</p>
          <p><strong>New Balance:</strong> ₹ {parseFloat(receipt.newBalance).toFixed(2)}</p>
          <button style={{ ...s.btn, background: '#1a1a2e', marginTop: 12 }}
                  onClick={() => { setReceipt(null); setFile(null); setAmount(''); }}>
            Make another payment
          </button>
        </div>
      )}
    </div>
  );
}
