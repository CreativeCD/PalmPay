import React, { useState } from 'react';
import ImageUploader from '../components/ImageUploader.jsx';
import client from '../api/client.js';

const s = {
  page: { maxWidth: 520, margin: '40px auto', fontFamily: 'sans-serif', padding: 24 },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 8 },
  desc: { color: '#555', fontSize: 14, marginBottom: 20, lineHeight: 1.5 },
  notice: {
    background: '#f8f9fa',
    border: '1px solid #ddd',
    borderRadius: 6,
    padding: '10px 14px',
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
  },
  btn: {
    marginTop: 16,
    width: '100%',
    padding: '12px',
    background: '#e94560',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 16,
    cursor: 'pointer',
  },
  btnDisabled: {
    background: '#aaa',
    cursor: 'not-allowed',
  },
  ok: {
    color: '#27ae60',
    fontWeight: 600,
    marginTop: 16,
    padding: 12,
    background: '#eafaf1',
    borderRadius: 6,
    border: '1px solid #a3e4d7',
  },
  err: {
    color: '#c0392b',
    marginTop: 12,
    fontSize: 13,
    padding: 12,
    background: '#fde8e8',
    borderRadius: 6,
    border: '1px solid #f8b4b4',
  },
};

export default function Enroll() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!file) {
      setError('Please select a palm image first.');
      return;
    }
    setError('');
    setStatus('');
    setLoading(true);

    try {
      const form = new FormData();
      form.append('palm_image', file);

      const { data } = await client.post('/biometric/enroll', form);
      setStatus(`✓ ${data.message || 'Enrolled successfully'} (method: ${data.method || 'hog-baseline-v1'})`);
    } catch (err) {
      // Never fake success — report actual API response/error
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        (err.response?.status === 501
          ? 'Enrollment API pending backend implementation (501 Not Implemented).'
          : 'Enrollment request failed');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>🖐 Palm Enrollment</h1>
      <p style={s.desc}>
        Upload a suitable near-infrared (NIR) palm image to register your biometric template.
        This template will be used to verify your identity during payments.
        Re-uploading replaces your existing template.
      </p>

      <div style={s.notice}>
        <strong>API Endpoint:</strong> <code>POST /api/biometric/enroll</code> (requires Bearer token).
      </div>

      <form onSubmit={onSubmit}>
        <ImageUploader onFile={setFile} label="Select NIR Palm Image for Enrollment" />
        {error && <div style={s.err}>{error}</div>}
        {status && <div style={s.ok}>{status}</div>}
        <button
          style={{ ...s.btn, ...(loading || !file ? s.btnDisabled : {}) }}
          type="submit"
          disabled={loading || !file}
        >
          {loading ? 'Processing Enrollment…' : 'Enroll Palm'}
        </button>
      </form>
    </div>
  );
}
