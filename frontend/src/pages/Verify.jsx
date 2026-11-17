import React, { useState } from 'react';
import ImageUploader from '../components/ImageUploader.jsx';
import client from '../api/client.js';

const s = {
  page:    { maxWidth: 560, margin: '40px auto', fontFamily: 'sans-serif', padding: 24 },
  title:   { fontSize: 24, fontWeight: 700, marginBottom: 8 },
  desc:    { color: '#555', fontSize: 13, marginBottom: 20, lineHeight: 1.5 },
  btn:     { marginTop: 16, width: '100%', padding: '12px', background: '#e94560',
             color: '#fff', border: 'none', borderRadius: 6, fontSize: 16, cursor: 'pointer' },
  err:     { color: '#c0392b', marginTop: 12, fontSize: 13 },
  card:    { borderRadius: 8, padding: 20, marginTop: 20, border: '1px solid #ccc' },
  passed:  { background: '#f0fff4', borderColor: '#27ae60' },
  failed:  { background: '#fff5f5', borderColor: '#e53e3e' },
  badge:   { display: 'inline-block', padding: '4px 10px', borderRadius: 4, fontWeight: 700,
             color: '#fff', fontSize: 13, marginBottom: 12 },
  statRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0',
             borderBottom: '1px dashed #ddd', fontSize: 14 },
};

export default function Verify() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!file) {
      setError('Please select a probe palm image first.');
      return;
    }
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const form = new FormData();
      form.append('palm_image', file);

      const { data } = await client.post('/biometric/verify', form);
      setResult(data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Biometric verification failed'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>🖐 Palm-Vein Verification Test</h1>
      <p style={s.desc}>
        Test a probe NIR palm image against your previously enrolled template.
        This standalone test evaluates the similarity score without initiating a transaction.
        <br />
        <strong>Note:</strong> Standard RGB webcam images are not a reliable substitute for
        subcutaneous NIR palm-vein imaging.
      </p>

      <form onSubmit={onSubmit}>
        <ImageUploader onFile={setFile} label="Upload Probe NIR Palm Image" />
        {error && <p style={s.err}>{error}</p>}
        <button style={s.btn} type="submit" disabled={loading || !file}>
          {loading ? 'Comparing features…' : 'Run Verification Test'}
        </button>
      </form>

      {result && (
        <div style={{ ...s.card, ...(result.matched ? s.passed : s.failed) }}>
          <span
            style={{
              ...s.badge,
              background: result.matched ? '#27ae60' : '#e53e3e',
            }}
          >
            {result.matched ? 'VERIFICATION PASSED' : 'VERIFICATION FAILED'}
          </span>

          <div style={s.statRow}>
            <span>Result:</span>
            <strong>{result.matched ? 'Genuine Match' : 'Impostor / Below Threshold'}</strong>
          </div>
          <div style={s.statRow}>
            <span>Cosine Similarity Score:</span>
            <strong>{typeof result.similarity === 'number' ? result.similarity.toFixed(4) : result.similarity}</strong>
          </div>
          <div style={s.statRow}>
            <span>Server Threshold:</span>
            <span>≥ {result.threshold ?? 0.6}</span>
          </div>
          <div style={s.statRow}>
            <span>Method:</span>
            <code>{result.method}</code>
          </div>

          <p style={{ fontSize: 12, color: '#666', marginTop: 12, marginBottom: 0 }}>
            * This score was computed server-side by the Express orchestrator and Python service.
            The frontend never grants authorization directly.
          </p>
        </div>
      )}
    </div>
  );
}
