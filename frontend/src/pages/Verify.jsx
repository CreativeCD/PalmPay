import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ImageUploader from '../components/ImageUploader.jsx';
import client from '../api/client.js';

const s = {
  page: { maxWidth: 560, margin: '40px auto', fontFamily: 'sans-serif', padding: 24 },
  title: { fontSize: 26, fontWeight: 700, marginBottom: 8 },
  desc: { color: '#4a5568', fontSize: 14, marginBottom: 16, lineHeight: 1.5 },
  contractBadge: {
    display: 'inline-block',
    background: '#f1f5f9',
    border: '1px solid #cbd5e1',
    color: '#334155',
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 20,
  },
  btn: {
    marginTop: 20,
    width: '100%',
    padding: '12px',
    background: '#e94560',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
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
  card: { borderRadius: 8, padding: 20, marginTop: 24, border: '1px solid #ccc' },
  passed: { background: '#f0fdf4', borderColor: '#86efac' },
  failed: { background: '#fef2f2', borderColor: '#fca5a5' },
  badge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: 4,
    fontWeight: 700,
    color: '#fff',
    fontSize: 13,
    marginBottom: 14,
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px dashed #cbd5e1',
    fontSize: 14,
  },
  securityNotice: {
    marginTop: 16,
    padding: 12,
    borderRadius: 6,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    fontSize: 12,
    color: '#475569',
    lineHeight: 1.4,
  },
  enrollPrompt: {
    marginTop: 12,
    padding: 12,
    borderRadius: 6,
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    fontSize: 13,
    color: '#1e40af',
  },
};

export default function Verify() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [notEnrolled, setNotEnrolled] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!file) {
      setError('Please select a probe NIR palm image first.');
      return;
    }
    setError('');
    setResult(null);
    setNotEnrolled(false);
    setLoading(true);

    try {
      // Upload probe image as multipart/form-data to Express POST /api/biometric/verify
      const form = new FormData();
      form.append('palm_image', file);

      const { data } = await client.post('/biometric/verify', form);
      // Valid contract response received from Charan's Express backend
      // { matched: boolean, similarity: number, threshold: number, method: string }
      setResult(data);
    } catch (err) {
      // Check if user has not enrolled yet
      if (err.response?.status === 404 || err.response?.data?.error?.includes('enroll')) {
        setNotEnrolled(true);
      }
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        (err.code === 'ERR_NETWORK'
          ? 'Cannot connect to backend server. Ensure Express API is running.'
          : err.message || 'Biometric verification request failed');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>🖐 Palm-Vein Verification Test</h1>
      <p style={s.desc}>
        Test a probe NIR palm image against your enrolled biometric template.
        The backend extracts HOG features and computes the cosine similarity score server-side.
      </p>

      <div style={s.contractBadge}>
        Contract: POST /api/biometric/verify (multipart/form-data: palm_image)
      </div>

      <form onSubmit={onSubmit}>
        <ImageUploader onFile={setFile} label="Upload Probe NIR Palm Image" />

        {error && <div style={s.err}>{error}</div>}

        {notEnrolled && (
          <div style={s.enrollPrompt}>
            <strong>Notice:</strong> No biometric template is registered for your account yet.{' '}
            <Link to="/enroll" style={{ color: '#2563eb', fontWeight: 600 }}>
              Click here to enroll your palm first →
            </Link>
          </div>
        )}

        <button
          style={{ ...s.btn, ...(loading || !file ? s.btnDisabled : {}) }}
          type="submit"
          disabled={loading || !file}
        >
          {loading ? 'Comparing HOG Features Server-Side…' : 'Run Verification Test'}
        </button>
      </form>

      {result && (
        <div style={{ ...s.card, ...(result.matched ? s.passed : s.failed) }}>
          <span
            style={{
              ...s.badge,
              background: result.matched ? '#16a34a' : '#dc2626',
            }}
          >
            {result.matched ? '✓ VERIFICATION PASSED' : '✗ VERIFICATION FAILED'}
          </span>

          <div style={s.statRow}>
            <span>Biometric Result:</span>
            <strong>{result.matched ? 'Genuine Match (Authorized)' : 'Below Threshold (Impostor)'}</strong>
          </div>
          <div style={s.statRow}>
            <span>Cosine Similarity Score:</span>
            <strong>
              {typeof result.similarity === 'number'
                ? result.similarity.toFixed(4)
                : result.similarity}
            </strong>
          </div>
          <div style={s.statRow}>
            <span>Decision Threshold:</span>
            <span>≥ {result.threshold ?? 0.6}</span>
          </div>
          <div style={s.statRow}>
            <span>Pipeline Method:</span>
            <code>{result.method || 'hog-baseline-v1'}</code>
          </div>

          <div style={s.securityNotice}>
            <strong>🔒 Server-Side Decision:</strong> This verification decision was computed strictly server-side by the Express orchestrator and Python biometric engine. The browser client never decides match authorization.
          </div>
        </div>
      )}
    </div>
  );
}
