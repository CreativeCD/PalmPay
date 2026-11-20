import React, { useEffect, useState } from 'react';
import client from '../api/client.js';

const s = {
  page: { maxWidth: 680, margin: '40px auto', fontFamily: 'sans-serif', padding: 24 },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 8 },
  notice: {
    background: '#f8f9fa',
    border: '1px solid #ddd',
    borderRadius: 6,
    padding: '10px 14px',
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
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
  note: { fontSize: 13, color: '#666', marginBottom: 20, lineHeight: 1.5 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: '2px solid #ddd',
    background: '#f5f5f5',
    fontWeight: 600,
  },
  td: { padding: '10px 12px', borderBottom: '1px solid #eee' },
  passed: {
    background: '#27ae60',
    color: '#fff',
    borderRadius: 4,
    padding: '2px 8px',
    fontSize: 12,
  },
  failed: {
    background: '#c0392b',
    color: '#fff',
    borderRadius: 4,
    padding: '2px 8px',
    fontSize: 12,
  },
  empty: { color: '#888', marginTop: 20 },
};

export default function AuthLogs() {
  const [logs, setLogs] = useState([]);
  const [err, setErr] = useState('');
  const [apiPending, setApiPending] = useState(false);

  useEffect(() => {
    client
      .get('/biometric/logs')
      .then((r) => {
        if (Array.isArray(r.data)) {
          setLogs(r.data);
        }
      })
      .catch((error) => {
        const msg =
          error.response?.data?.error ||
          (error.response?.status === 501
            ? 'Biometric logs API pending backend implementation (501 Not Implemented).'
            : 'Could not load auth logs');
        setErr(msg);
        setApiPending(true);
      });
  }, []);

  return (
    <div style={s.page}>
      <h1 style={s.title}>🔐 Biometric Auth Logs</h1>

      <div style={s.notice}>
        <strong>API Endpoint:</strong> <code>GET /api/biometric/logs</code> (requires Bearer token).
      </div>

      <p style={s.note}>
        Raw similarity scores from experimental HOG-based matching.
        These scores are illustrative only. The numeric threshold applied by the backend
        was determined experimentally.
      </p>

      {apiPending && (
        <div style={s.placeholderBanner}>
          <strong>Endpoint Status:</strong> {err}
          <br />
          Biometric audit logs will appear here once the backend verification pipeline is active.
        </div>
      )}

      {!apiPending && err && <p style={{ color: '#c0392b' }}>{err}</p>}

      {!apiPending && logs.length === 0 && !err && (
        <p style={s.empty}>No auth attempts recorded yet.</p>
      )}

      {logs.length > 0 && (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Date</th>
              <th style={s.th}>Method</th>
              <th style={s.th}>Result</th>
              <th style={s.th}>Similarity Score</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td style={s.td}>{new Date(log.created_at).toLocaleString()}</td>
                <td style={s.td}>{log.method}</td>
                <td style={s.td}>
                  <span style={log.result === 'passed' ? s.passed : s.failed}>
                    {log.result}
                  </span>
                </td>
                <td style={s.td}>
                  {log.score !== null ? parseFloat(log.score).toFixed(4) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
