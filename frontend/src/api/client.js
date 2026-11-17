import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  timeout: 30_000,
});

// Attach JWT to every request if present
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('palmpay_token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// Redirect to /login on 401
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('palmpay_token');
      localStorage.removeItem('palmpay_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
