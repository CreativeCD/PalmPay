import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function onChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function validate() {
    if (!form.name.trim() || form.name.trim().length < 2) {
      return 'Please enter your full name (at least 2 characters).';
    }
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) {
      return 'Please enter a valid email address.';
    }
    if (!form.password || form.password.length < 8) {
      return 'Password must be at least 8 characters long.';
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
      // Connect to Charan's agreed contract: POST /api/auth/register
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      };

      const registerRes = await client.post('/auth/register', payload);

      // If backend returns accessToken directly in registration response
      if (registerRes.data?.accessToken) {
        login(registerRes.data.accessToken, registerRes.data.user);
        navigate('/dashboard');
        return;
      }

      // Charan's spec returns { message: "Registered successfully", user: { id, name, email } }
      // Now attempt auto-login using POST /api/auth/login
      try {
        const loginRes = await client.post('/auth/login', {
          email: payload.email,
          password: payload.password,
        });

        if (loginRes.data?.accessToken) {
          login(loginRes.data.accessToken, loginRes.data.user);
          navigate('/dashboard');
          return;
        }
      } catch {
        // If auto-login fails, redirect to /login with notification
        navigate('/login', {
          state: { message: 'Registration successful! Please log in with your credentials.' },
        });
        return;
      }

      // Fallback redirect if neither returned token
      navigate('/login', {
        state: { message: 'Registration successful! Please log in.' },
      });
    } catch (err) {
      // Show actual API error without faking success
      const serverError =
        err.response?.data?.error ||
        err.response?.data?.message ||
        (err.code === 'ERR_NETWORK'
          ? 'Cannot connect to backend server. Ensure Express API is running.'
          : err.message || 'Registration failed');
      setError(serverError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>🖐 Create Account</h1>
      <p style={s.subtitle}>Register for a PalmPay biometric wallet account</p>

      {error && <div style={s.err}>{error}</div>}

      <form onSubmit={onSubmit}>
        <div style={s.field}>
          <label style={s.label}>Full Name</label>
          <input
            style={s.input}
            name="name"
            value={form.name}
            onChange={onChange}
            placeholder="e.g. Jane Doe"
            disabled={loading}
            required
          />
        </div>

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
          <label style={s.label}>Password (minimum 8 characters)</label>
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
          {loading ? 'Registering…' : 'Register'}
        </button>
      </form>

      <div style={s.contractNote}>
        <strong>Contract:</strong> <code>POST /api/auth/register</code> (Charan's API specification).
      </div>

      <Link to="/login" style={s.link}>
        Already have an account? Log in
      </Link>
    </div>
  );
}
