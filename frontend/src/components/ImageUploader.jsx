import React, { useRef, useState } from 'react';

const ALLOWED_TYPES = ['image/png', 'image/jpeg'];
const MAX_MB = 5;

const s = {
  wrap: {
    border: '2px dashed #4a5568',
    borderRadius: 8,
    padding: 20,
    textAlign: 'center',
    fontFamily: 'sans-serif',
    background: '#f8fafc',
    transition: 'border-color 0.2s',
  },
  title: { margin: 0, fontWeight: 600, fontSize: 15, color: '#1a202c' },
  hint: { fontSize: 13, color: '#4a5568', marginTop: 8, lineHeight: 1.4 },
  nirWarning: {
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: 6,
    padding: '10px 12px',
    marginTop: 12,
    fontSize: 12,
    color: '#92400e',
    textAlign: 'left',
    lineHeight: 1.4,
  },
  err: { color: '#dc2626', fontSize: 13, marginTop: 8, fontWeight: 500 },
  previewWrap: {
    marginTop: 16,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  preview: {
    maxWidth: 220,
    maxHeight: 220,
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    objectFit: 'contain',
    background: '#0f172a',
  },
  meta: { fontSize: 12, color: '#64748b' },
  btnRow: { display: 'flex', gap: 10, justifyContent: 'center', marginTop: 12 },
  btn: {
    background: '#1a1a2e',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '8px 18px',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
  },
  clearBtn: {
    background: '#e2e8f0',
    color: '#334155',
    border: 'none',
    borderRadius: 6,
    padding: '8px 14px',
    cursor: 'pointer',
    fontSize: 13,
  },
};

export default function ImageUploader({ onFile, label = 'Upload NIR Palm Image' }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [fileMeta, setFileMeta] = useState(null);
  const [error, setError] = useState('');

  function handleFile(file) {
    setError('');
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Unsupported file type. Only PNG and JPEG images are accepted.');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File size exceeds ${MAX_MB} MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`);
      return;
    }

    setFileMeta({
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      type: file.type,
    });
    setPreview(URL.createObjectURL(file));
    onFile(file);
  }

  function handleChange(e) {
    const file = e.target.files[0];
    if (file) handleFile(file);
  }

  function handleClear() {
    setPreview(null);
    setFileMeta(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
    onFile(null);
  }

  return (
    <div style={s.wrap}>
      <p style={s.title}>{label}</p>
      <p style={s.hint}>
        <strong>Supported formats:</strong> PNG, JPEG · <strong>Max file size:</strong> {MAX_MB} MB
      </p>

      <div style={s.nirWarning}>
        <strong>⚠️ NIR Palm Imaging Requirement:</strong> Suitable Near-Infrared (NIR) palm images are required. Ordinary RGB webcam photos or phone selfies reflect visible light off the skin surface and cannot reliably capture subcutaneous palm vein patterns.
      </div>

      <div style={s.btnRow}>
        <button type="button" style={s.btn} onClick={() => inputRef.current?.click()}>
          {preview ? 'Change Palm Image' : 'Select Palm Image File'}
        </button>
        {preview && (
          <button type="button" style={s.clearBtn} onClick={handleClear}>
            Remove Image
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        style={{ display: 'none' }}
        onChange={handleChange}
      />

      {error && <p style={s.err}>{error}</p>}

      {preview && (
        <div style={s.previewWrap}>
          <img src={preview} alt="NIR Palm Preview" style={s.preview} />
          {fileMeta && (
            <span style={s.meta}>
              {fileMeta.name} ({fileMeta.size})
            </span>
          )}
        </div>
      )}
    </div>
  );
}
