import React, { useEffect, useState } from 'react';
import client from '../api/client.js';

const s = {
  page: { maxWidth: 720, margin: '40px auto', fontFamily: 'sans-serif', padding: 24 },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 8 },
  simulatedNotice: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    color: '#1e40af',
    padding: '10px 14px',
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 1.4,
  },
  placeholderBanner: {
    background: '#fff9db',
    border: '1px solid #f08c00',
    color: '#664d03',
    padding: '12px 16px',
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 1.5,
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: '2px solid #ddd',
    background: '#f8fafc',
    fontWeight: 600,
    color: '#334155',
  },
  td: { padding: '10px 12px', borderBottom: '1px solid #eee' },
  empty: { color: '#888', marginTop: 20 },
  badge: {
    background: '#16a34a',
    color: '#fff',
    borderRadius: 4,
    padding: '3px 8px',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  refCode: {
    fontSize: 11,
    color: '#64748b',
    display: 'block',
    marginTop: 2,
  },
};

export default function Transactions() {
  const [txs, setTxs] = useState([]);
  const [err, setErr] = useState('');
  const [apiPending, setApiPending] = useState(false);

  useEffect(() => {
    // GET /api/transactions
    client
      .get('/transactions')
      .then((r) => {
        const list = Array.isArray(r.data)
          ? r.data
          : Array.isArray(r.data?.transactions)
          ? r.data.transactions
          : [];
        setTxs(list);
      })
      .catch((error) => {
        const msg =
          error.response?.data?.error ||
          (error.response?.status === 501
            ? 'Transactions API pending backend implementation (501 Not Implemented).'
            : 'Could not load transaction history.');
        setErr(msg);
        setApiPending(true);
      });
  }, []);

  return (
    <div style={s.page}>
      <h1 style={s.title}>📋 Simulated Transaction Ledger</h1>

      <div style={s.simulatedNotice}>
        <strong>⚠️ Simulated Prototype Ledger:</strong> All transaction records reflect virtual debits within a closed-loop academic prototype. No real money has moved.
      </div>

      {apiPending && (
        <div style={s.placeholderBanner}>
          <strong>Endpoint Status:</strong> {err}
          <br />
          Transaction ledger records will appear here once the backend transactions endpoint is wired.
        </div>
      )}

      {!apiPending && err && <p style={{ color: '#c0392b' }}>{err}</p>}

      {!apiPending && txs.length === 0 && !err && (
        <p style={s.empty}>No simulated transactions recorded yet.</p>
      )}

      {txs.length > 0 && (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Date & Time</th>
              <th style={s.th}>Merchant</th>
              <th style={s.th}>Category</th>
              <th style={s.th}>Amount</th>
              <th style={s.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((tx) => (
              <tr key={tx.id || tx.reference}>
                <td style={s.td}>
                  {new Date(tx.created_at).toLocaleString()}
                  {tx.reference && <span style={s.refCode}>Ref: {tx.reference}</span>}
                </td>
                <td style={s.td}>{tx.merchant?.name || 'Demo Merchant'}</td>
                <td style={s.td}>{tx.merchant?.category || 'Retail'}</td>
                <td style={{ ...s.td, fontWeight: 600, color: '#e94560' }}>
                  ₹ {parseFloat(tx.amount).toFixed(2)}
                </td>
                <td style={s.td}>
                  <span style={s.badge}>{tx.status || 'completed'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
