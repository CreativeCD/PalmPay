import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import client from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const s = {
  page: { maxWidth: 440, margin: '40px auto', fontFamily: 'sans-serif', padding: 24 },
  title: { fontSize: 26, fontWeight: 700, marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  field: { marginBottom: 16 },
  label: { display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ccc',
    borderRadius: 6,
    fontSize: 15,
    boxSizing: 'border-box',
  },
  btn: {
    width: '100%',
    padding: '12px',
    background: '#e94560',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 16,
    cursor: 'pointer',
    marginTop: 8,
  },
  btnDisabled: {
    background: '#aaa',
    cursor: 'not-allowed',
  },
  err: {
    background: '#fde8e8',
    color: '#c81e1e',
    padding: '10px 12px',
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 16,
    border: '1px solid #f8b4b4',
    wordBreak: 'break-word',
  },
  msg: {
    background: '#def7ec',
    color: '#03543f',
    padding: '10px 12px',
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 16,
    border: '1px solid #bcf0da',
  },
  contractNote: {
    fontSize: 12,
    color: '#888',
    marginTop: 20,
    background: '#f8f9fa',
    padding: 10,
    borderRadius: 6,
  },
  link: { fontSize: 13, marginTop: 16, display: 'block', textAlign: 'center', color: '#e94560' },
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectMessage = location.state?.message;

  function onChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function validate() {
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) {
      return 'Please enter a valid email address.';
    }
    if (!form.password) {
      return 'Please enter your password.';
    }
    return null;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      // Connect to Charan's agreed contract: POST /api/auth/login
      const payload = {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      };

      const { data } = await client.post('/auth/login', payload);

      if (!data?.accessToken) {
        throw new Error('Server response missing accessToken.');
      }

      login(data.accessToken, data.user);

      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      // Show actual API error; never fake success
      const serverError =
        err.response?.data?.error ||
        err.response?.data?.message ||
        (err.code === 'ERR_NETWORK'
          ? 'Cannot connect to backend server. Ensure Express API is running.'
          : err.message || 'Login failed');
      setError(serverError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>🖐 Log in to PalmPay</h1>
      <p style={s.subtitle}>Enter your credentials to access your biometric wallet</p>

      {redirectMessage && <div style={s.msg}>{redirectMessage}</div>}
      {error && <div style={s.err}>{error}</div>}

      <form onSubmit={onSubmit}>
        <div style={s.field}>
          <label style={s.label}>Email Address</label>
          <input
            style={s.input}
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            placeholder="jane@example.com"
            disabled={loading}
            required
          />
        </div>

        <div style={s.field}>
          <label style={s.label}>Password</label>
          <input
            style={s.input}
            name="password"
            type="password"
            value={form.password}
            onChange={onChange}
            placeholder="SecurePassword123"
            disabled={loading}
            required
          />
        </div>

        <button
          style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
          type="submit"
          disabled={loading}
        >
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <div style={s.contractNote}>
        <strong>Contract:</strong> <code>POST /api/auth/login</code> (Charan's API specification).
      </div>

      <Link to="/register" style={s.link}>
        No account yet? Register
      </Link>
    </div>
  );
}
