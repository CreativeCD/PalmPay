import React, { useEffect, useState } from 'react';
import client from '../api/client.js';

const s = {
  page:  { maxWidth: 680, margin: '40px auto', fontFamily: 'sans-serif', padding: 24 },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 20 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th:    { textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #ddd',
           background: '#f5f5f5', fontWeight: 600 },
  td:    { padding: '10px 12px', borderBottom: '1px solid #eee' },
  empty: { color: '#888', marginTop: 20 },
  badge: { background: '#27ae60', color: '#fff', borderRadius: 4,
           padding: '2px 8px', fontSize: 12 },
};

export default function Transactions() {
  const [txs, setTxs]   = useState([]);
  const [err, setErr]   = useState('');

  useEffect(() => {
    client.get('/transactions')
      .then(r => setTxs(r.data))
      .catch(() => setErr('Could not load transactions'));
  }, []);

  return (
    <div style={s.page}>
      <h1 style={s.title}>📋 Transaction History</h1>
      {err && <p style={{ color: '#c0392b' }}>{err}</p>}
      {txs.length === 0 && !err && <p style={s.empty}>No transactions yet.</p>}
      {txs.length > 0 && (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Date</th>
              <th style={s.th}>Merchant</th>
              <th style={s.th}>Category</th>
              <th style={s.th}>Amount</th>
              <th style={s.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {txs.map(tx => (
              <tr key={tx.id}>
                <td style={s.td}>{new Date(tx.created_at).toLocaleString()}</td>
                <td style={s.td}>{tx.merchant.name}</td>
                <td style={s.td}>{tx.merchant.category}</td>
                <td style={s.td}>₹ {parseFloat(tx.amount).toFixed(2)}</td>
                <td style={s.td}>
                  <span style={s.badge}>{tx.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p style={{ fontSize: 12, color: '#aaa', marginTop: 16 }}>
        ⚠ All transactions are simulated. No real money has moved.
      </p>
    </div>
  );
}
