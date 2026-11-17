import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const s = {
  page:  { maxWidth: 420, margin: '60px auto', fontFamily: 'sans-serif', padding: 24 },
  title: { fontSize: 26, fontWeight: 700, marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #ccc',
           borderRadius: 6, fontSize: 15, boxSizing: 'border-box' },
  btn:   { width: '100%', padding: '12px', background: '#e94560', color: '#fff',
           border: 'none', borderRadius: 6, fontSize: 16, cursor: 'pointer', marginTop: 8 },
  err:   { color: '#c0392b', fontSize: 13, marginBottom: 12 },
  link:  { fontSize: 13, marginTop: 16, display: 'block', textAlign: 'center' },
};

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  function onChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await client.post('/auth/login', form);
      login(data.accessToken, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>🖐 Log in to PalmPay</h1>
      {error && <p style={s.err}>{error}</p>}
      <form onSubmit={onSubmit}>
        <div style={s.field}>
          <label style={s.label}>Email</label>
          <input style={s.input} name="email" type="email" value={form.email} onChange={onChange} required />
        </div>
        <div style={s.field}>
          <label style={s.label}>Password</label>
          <input style={s.input} name="password" type="password" value={form.password} onChange={onChange} required />
        </div>
        <button style={s.btn} type="submit" disabled={loading}>
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <Link to="/register" style={s.link}>No account yet? Register</Link>
    </div>
  );
}
