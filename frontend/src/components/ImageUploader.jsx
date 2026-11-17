import React, { useRef, useState } from 'react';

const ALLOWED_TYPES = ['image/png', 'image/jpeg'];
const MAX_MB = 5;

const s = {
  wrap:   { border: '2px dashed #555', borderRadius: 8, padding: 24, textAlign: 'center',
            fontFamily: 'sans-serif', background: '#f9f9f9' },
  hint:   { fontSize: 12, color: '#777', marginTop: 6 },
  err:    { color: '#c0392b', fontSize: 13, marginTop: 8 },
  preview:{ maxWidth: 160, marginTop: 12, borderRadius: 6, border: '1px solid #ccc' },
  btn:    { marginTop: 10, background: '#1a1a2e', color: '#fff', border: 'none',
            borderRadius: 6, padding: '8px 18px', cursor: 'pointer' },
};

export default function ImageUploader({ onFile, label = 'Upload NIR Palm Image' }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [error,   setError]   = useState('');

  function handleChange(e) {
    setError('');
    const file = e.target.files[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only PNG and JPEG images are accepted.');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_MB} MB.`);
      return;
    }

    setPreview(URL.createObjectURL(file));
    onFile(file);
  }

  return (
    <div style={s.wrap}>
      <p style={{ margin: 0, fontWeight: 600 }}>{label}</p>
      <p style={s.hint}>
        Accepted: PNG, JPEG · Max {MAX_MB} MB<br />
        <strong>Note:</strong> Suitable NIR palm images are required; ordinary RGB webcam
        photos are not a reliable substitute for subcutaneous vein imaging.
      </p>
      <button style={s.btn} onClick={() => inputRef.current.click()}>
        Choose file
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      {error   && <p style={s.err}>{error}</p>}
      {preview && <img src={preview} alt="Preview" style={s.preview} />}
    </div>
  );
}
