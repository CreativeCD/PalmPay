import axios from 'axios';

// Configurable base URL:
// Reads VITE_API_BASE_URL (e.g. "http://localhost:5000" or "http://localhost:5000/api")
// Defaults to "/api" which is proxied by Vite dev server to backend port 5000.
const rawBase = import.meta.env.VITE_API_BASE_URL || '/api';
const baseURL = rawBase.replace(/\/+$/, '').endsWith('/api')
  ? rawBase.replace(/\/+$/, '')
  : `${rawBase.replace(/\/+$/, '')}/api`;

const client = axios.create({
  baseURL,
  timeout: 30_000,
});

// Request interceptor:
// 1. Strip redundant leading "/api" so client.get('/auth/me') and client.get('/api/auth/me') both work cleanly.
// 2. Attach Authorization Bearer token if stored in localStorage.
client.interceptors.request.use((config) => {
  if (config.url?.startsWith('/api/')) {
    config.url = config.url.replace(/^\/api/, '');
  }
  const token = localStorage.getItem('palmpay_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor:
// On 401 Unauthorized, clear cached session and redirect to /login if on a protected page.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('palmpay_token');
      localStorage.removeItem('palmpay_user');
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/register')
      ) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default client;
