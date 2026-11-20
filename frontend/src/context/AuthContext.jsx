import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('palmpay_token'));
  const [loading, setLoading] = useState(true);

  // Validate session on app initialization via GET /api/auth/me contract
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const storedToken = localStorage.getItem('palmpay_token');
      if (!storedToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const { data } = await client.get('/auth/me');
        if (isMounted && data?.user) {
          setUser(data.user);
          localStorage.setItem('palmpay_user', JSON.stringify(data.user));
        }
      } catch (err) {
        // If 401 Unauthorized, token is expired or invalid
        if (err.response?.status === 401) {
          localStorage.removeItem('palmpay_token');
          localStorage.removeItem('palmpay_user');
          if (isMounted) {
            setToken(null);
            setUser(null);
          }
        } else {
          // If backend returns 501 (Not implemented) or network error, fallback to stored user if present
          const storedUser = localStorage.getItem('palmpay_user');
          if (storedUser && isMounted) {
            try {
              setUser(JSON.parse(storedUser));
            } catch {
              // ignore parse errors
            }
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    checkAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  function login(accessToken, userData) {
    localStorage.setItem('palmpay_token', accessToken);
    if (userData) {
      localStorage.setItem('palmpay_user', JSON.stringify(userData));
    }
    setToken(accessToken);
    setUser(userData || null);
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
