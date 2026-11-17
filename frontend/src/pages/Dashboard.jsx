import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const s = {
  page: { maxWidth: 680, margin: '40px auto', fontFamily: 'sans-serif', padding: 24 },
  card: {
    background: '#1a1a2e',
    color: '#fff',
    borderRadius: 12,
    padding: '28px 32px',
    marginBottom: 24,
  },
  bal: { fontSize: 44, fontWeight: 700, color: '#e94560', margin: '8px 0' },
  note: { fontSize: 12, color: '#aaa', marginTop: 4 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginTop: 16 },
  action: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#16213e',
    border: '1px solid #2a3a5e',
    borderRadius: 8,
    padding: '18px 16px',
    textDecoration: 'none',
    color: '#fff',
    fontWeight: 600,
    textAlign: 'center',
    gap: 8,
    transition: 'background 0.2s ease',
  },
  disclaimer: {
    marginTop: 28,
    padding: 16,
    borderRadius: 8,
    background: '#fff9db',
    border: '1px solid #f08c00',
    fontSize: 13,
    color: '#664d03',
    lineHeight: 1.5,
  },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    client
      .get('/wallet')
      .then((r) => setBalance(r.data.balance))
      .catch(() => setErr('Could not load wallet balance. Ensure backend and database are running.'));
  }, []);

  return (
    <div style={s.page}>
      <h1 style={{ fontWeight: 700, fontSize: 24, marginBottom: 20 }}>
        Welcome, {user?.name}
      </h1>

      <div style={s.card}>
        <div style={{ fontSize: 14, color: '#aaa' }}>Demo Wallet Balance</div>
        <div style={s.bal}>
          {balance !== null ? `₹ ${parseFloat(balance).toFixed(2)}` : '…'}
        </div>
        <div style={s.note}>⚠ Simulated balance — closed-loop academic capstone</div>
        {err && <div style={{ color: '#e94560', marginTop: 8, fontSize: 13 }}>{err}</div>}
      </div>

      <div style={s.grid}>
        <Link to="/enroll" style={s.action}>
          <span style={{ fontSize: 24 }}>🖐</span>
          <span>Palm Enrollment</span>
        </Link>
        <Link to="/verify" style={s.action}>
          <span style={{ fontSize: 24 }}>🔍</span>
          <span>Palm Verification</span>
        </Link>
        <Link to="/pay" style={s.action}>
          <span style={{ fontSize: 24 }}>💳</span>
          <span>Pay Merchant</span>
        </Link>
        <Link to="/transactions" style={s.action}>
          <span style={{ fontSize: 24 }}>📋</span>
          <span>Transactions</span>
        </Link>
        <Link to="/auth-logs" style={s.action}>
          <span style={{ fontSize: 24 }}>🔐</span>
          <span>Auth Logs</span>
        </Link>
      </div>

      <div style={s.disclaimer}>
        <strong>Capstone Prototype Notice:</strong>
        <br />
        This application is an academic exploration of NIR palm-vein biometrics. No real banking,
        UPI, or commercial financial networks are contacted. All authorizations and ledger balances
        are simulated.
      </div>
    </div>
  );
}
