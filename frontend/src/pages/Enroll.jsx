import React, { useState } from 'react';
import ImageUploader from '../components/ImageUploader.jsx';
import client from '../api/client.js';

const s = {
  page: { maxWidth: 520, margin: '40px auto', fontFamily: 'sans-serif', padding: 24 },
  title:{ fontSize: 24, fontWeight: 700, marginBottom: 8 },
  desc: { color: '#555', fontSize: 14, marginBottom: 24, lineHeight: 1.5 },
  btn:  { marginTop: 16, width: '100%', padding: '12px', background: '#e94560',
          color: '#fff', border: 'none', borderRadius: 6, fontSize: 16, cursor: 'pointer' },
  ok:   { color: '#27ae60', fontWeight: 600, marginTop: 16 },
  err:  { color: '#c0392b', marginTop: 12, fontSize: 13 },
};

export default function Enroll() {
  const [file, setFile]       = useState(null);
  const [status, setStatus]   = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!file) { setError('Please select a palm image first.'); return; }
    setError(''); setStatus(''); setLoading(true);
    try {
      const form = new FormData();
      form.append('palm_image', file);
      const { data } = await client.post('/biometric/enroll', form);
      setStatus(`✓ ${data.message} (method: ${data.method})`);
    } catch (err) {
      setError(err.response?.data?.error || 'Enrollment failed');
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
      <form onSubmit={onSubmit}>
        <ImageUploader onFile={setFile} label="Select NIR Palm Image for Enrollment" />
        {error  && <p style={s.err}>{error}</p>}
        {status && <p style={s.ok}>{status}</p>}
        <button style={s.btn} type="submit" disabled={loading || !file}>
          {loading ? 'Processing…' : 'Enroll Palm'}
        </button>
      </form>
    </div>
  );
}
