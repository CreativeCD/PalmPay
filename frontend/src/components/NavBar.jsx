import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const style = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '12px 24px',
    background: '#1a1a2e',
    color: '#fff',
    fontFamily: 'sans-serif',
  },
  brand: {
    fontWeight: 700,
    fontSize: 20,
    color: '#e94560',
    textDecoration: 'none',
  },
  link: {
    color: '#ccc',
    textDecoration: 'none',
    fontSize: 14,
  },
  btn: {
    background: '#e94560',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: 14,
  },
  spacer: {
    flex: 1,
  },
};

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav style={style.nav}>
      <Link to="/dashboard" style={style.brand}>
        🖐 PalmPay
      </Link>
      <span style={style.spacer} />
      {user ? (
        <>
          <Link to="/dashboard" style={style.link}>
            Wallet
          </Link>
          <Link to="/enroll" style={style.link}>
            Enroll
          </Link>
          <Link to="/verify" style={style.link}>
            Verify
          </Link>
          <Link to="/pay" style={style.link}>
            Pay
          </Link>
          <Link to="/transactions" style={style.link}>
            Transactions
          </Link>
          <Link to="/auth-logs" style={style.link}>
            Auth Logs
          </Link>
          <span style={{ color: '#aaa', fontSize: 13 }}>Hi, {user.name}</span>
          <button style={style.btn} onClick={handleLogout}>
            Logout
          </button>
        </>
      ) : (
        <>
          <Link to="/login" style={style.link}>
            Login
          </Link>
          <Link to="/register" style={style.link}>
            Register
          </Link>
        </>
      )}
    </nav>
  );
}
