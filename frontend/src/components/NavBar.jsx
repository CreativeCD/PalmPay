import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const style = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    padding: '12px 24px',
    background: '#1a1a2e',
    color: '#fff',
    fontFamily: 'sans-serif',
    borderBottom: '2px solid #e94560',
  },
  brand: {
    fontWeight: 700,
    fontSize: 20,
    color: '#e94560',
    textDecoration: 'none',
    marginRight: 8,
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  link: {
    color: '#ccc',
    textDecoration: 'none',
    fontSize: 14,
    padding: '4px 8px',
    borderRadius: 4,
    transition: 'color 0.2s',
  },
  activeLink: {
    color: '#fff',
    fontWeight: 600,
    background: 'rgba(233, 69, 96, 0.2)',
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
  userBadge: {
    color: '#aaa',
    fontSize: 13,
  },
};

export default function NavBar() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function isActive(path) {
    return location.pathname === path ? style.activeLink : {};
  }

  return (
    <nav style={style.nav}>
      <Link to={token ? '/dashboard' : '/login'} style={style.brand}>
        🖐 PalmPay
      </Link>

      <span style={style.spacer} />

      <div style={style.links}>
        {token ? (
          <>
            <Link to="/dashboard" style={{ ...style.link, ...isActive('/dashboard') }}>
              Dashboard
            </Link>
            <Link to="/enroll" style={{ ...style.link, ...isActive('/enroll') }}>
              Palm Enrollment
            </Link>
            <Link to="/verify" style={{ ...style.link, ...isActive('/verify') }}>
              Palm Verification
            </Link>
            <Link to="/pay" style={{ ...style.link, ...isActive('/pay') }}>
              Merchant Payment
            </Link>
            <Link to="/transactions" style={{ ...style.link, ...isActive('/transactions') }}>
              Transactions
            </Link>
            <Link to="/auth-logs" style={{ ...style.link, ...isActive('/auth-logs') }}>
              Auth Logs
            </Link>
            {user?.name && <span style={style.userBadge}>Hi, {user.name}</span>}
            <button style={style.btn} onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" style={{ ...style.link, ...isActive('/login') }}>
              Login
            </Link>
            <Link to="/register" style={{ ...style.link, ...isActive('/register') }}>
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
