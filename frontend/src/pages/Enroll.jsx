import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ImageUploader from '../components/ImageUploader.jsx';
import client from '../api/client.js';

const s = {
  page: { maxWidth: 540, margin: '40px auto', fontFamily: 'sans-serif', padding: 24 },
  title: { fontSize: 26, fontWeight: 700, marginBottom: 8 },
  desc: { color: '#4a5568', fontSize: 14, marginBottom: 20, lineHeight: 1.5 },
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
  resultCard: {
    borderRadius: 8,
    padding: 20,
    marginTop: 24,
    border: '1px solid #86efac',
    background: '#f0fdf4',
  },
  resultTitle: {
    color: '#166534',
    fontSize: 18,
    fontWeight: 700,
    margin: '0 0 10px 0',
  },
  resultDetail: {
    fontSize: 14,
    color: '#15803d',
    marginBottom: 6,
  },
  actionLink: {
    display: 'inline-block',
    marginTop: 14,
    padding: '8px 16px',
    background: '#16a34a',
    color: '#fff',
    borderRadius: 6,
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: 14,
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
};

export default function Enroll() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!file) {
      setError('Please select an NIR palm image file first.');
      return;
    }
    setError('');
    setResult(null);
    setLoading(true);

    try {
      // Multipart/form-data upload to Express POST /api/biometric/enroll
      const form = new FormData();
      form.append('palm_image', file);

      const { data } = await client.post('/biometric/enroll', form);

      // Confirm response format with Charan's contract:
      // Returns { enrolled: true, method: "hog-baseline-v1", created_at: "..." }
      // or { message: "Enrolled successfully", method: "hog-baseline-v1" }
      setResult(data);
    } catch (err) {
      // Surface actual backend error; never fake success
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        (err.code === 'ERR_NETWORK'
          ? 'Cannot connect to backend server. Ensure Express API is running.'
          : err.message || 'Enrollment request failed');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>🖐 Palm Biometric Enrollment</h1>
      <p style={s.desc}>
        Upload an NIR palm image to register your biometric vein template.
        The template is extracted server-side using HOG feature analysis and stored securely.
        Re-enrolling will replace any previously registered template.
      </p>

      <div style={s.contractBadge}>
        Contract: POST /api/biometric/enroll (multipart/form-data: palm_image)
      </div>

      <form onSubmit={onSubmit}>
        <ImageUploader onFile={setFile} label="Select NIR Palm Image for Enrollment" />

        {error && <div style={s.err}>{error}</div>}

        <button
          style={{ ...s.btn, ...(loading || !file ? s.btnDisabled : {}) }}
          type="submit"
          disabled={loading || !file}
        >
          {loading ? 'Extracting HOG Features & Enrolling…' : 'Enroll Palm Template'}
        </button>
      </form>

      {result && (
        <div style={s.resultCard}>
          <div style={s.resultTitle}>
            ✓ {result.message || 'Biometric Template Enrolled Successfully!'}
          </div>
          <div style={s.resultDetail}>
            <strong>Extraction Method:</strong> <code>{result.method || 'hog-baseline-v1'}</code>
          </div>
          {result.created_at && (
            <div style={s.resultDetail}>
              <strong>Registered At:</strong> {new Date(result.created_at).toLocaleString()}
            </div>
          )}
          <p style={{ fontSize: 13, color: '#334155', marginTop: 10 }}>
            Your biometric template is now registered on your account. You can proceed to test verification or make simulated merchant payments.
          </p>
          <Link to="/verify" style={s.actionLink}>
            Proceed to Palm Verification →
          </Link>
        </div>
      )}
    </div>
  );
}
