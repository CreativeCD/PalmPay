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

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function onChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await client.post('/auth/register', form);
      // Auto-login after registration
      const { data } = await client.post('/auth/login', {
        email: form.email, password: form.password,
      });
      login(data.accessToken, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>🖐 Create account</h1>
      {error && <p style={s.err}>{error}</p>}
      <form onSubmit={onSubmit}>
        <div style={s.field}>
          <label style={s.label}>Full name</label>
          <input style={s.input} name="name" value={form.name} onChange={onChange} required />
        </div>
        <div style={s.field}>
          <label style={s.label}>Email</label>
          <input style={s.input} name="email" type="email" value={form.email} onChange={onChange} required />
        </div>
        <div style={s.field}>
          <label style={s.label}>Password (min 8 chars)</label>
          <input style={s.input} name="password" type="password" value={form.password} onChange={onChange} required />
        </div>
        <button style={s.btn} type="submit" disabled={loading}>
          {loading ? 'Registering…' : 'Register'}
        </button>
      </form>
      <Link to="/login" style={s.link}>Already have an account? Log in</Link>
    </div>
  );
}
