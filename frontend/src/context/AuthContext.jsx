import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('palmpay_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Rehydrate user from localStorage so we don't need an extra /me call on every load
      const stored = localStorage.getItem('palmpay_user');
      if (stored) setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, [token]);

  function login(accessToken, userData) {
    localStorage.setItem('palmpay_token', accessToken);
    localStorage.setItem('palmpay_user', JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('palmpay_token');
    localStorage.removeItem('palmpay_user');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
