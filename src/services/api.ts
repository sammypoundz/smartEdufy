import axios from 'axios';
import { API_BASE_URL } from '../config/server';

console.log('API_BASE_URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token and tenant ID to requests
api.interceptors.request.use(
  (config) => {
    // 1. Add auth token
    const token = localStorage.getItem('token');
    if (token) {
      (config.headers as any).Authorization = `Bearer ${token}`;
    }

    // 2. Add tenant ID (schoolId) – required for multi‑tenant isolation
    const tenantId = localStorage.getItem('tenantId');
    if (tenantId) {
      (config.headers as any)['X-Tenant-ID'] = tenantId;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Optional: Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('tenantId');
      // Redirect to login page if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;