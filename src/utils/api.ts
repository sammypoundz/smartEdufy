// src/utils/api.ts
const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Get the stored token from localStorage.
 */
const getToken = (): string | null => localStorage.getItem('token');

/**
 * Get the stored tenantId from localStorage.
 */
const getTenantId = (): string | null => localStorage.getItem('tenantId');

/**
 * Build the headers for a request.
 * Optionally override the token with a parameter.
 * Returns a plain object with string keys.
 */
const buildHeaders = (token?: string | null): Record<string, string> => {
  const headers: Record<string, string> = {};
  const authToken = token !== undefined ? token : getToken();
  const tenantId = getTenantId();
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  if (tenantId) headers['X-Tenant-ID'] = tenantId;
  return headers;
};

/**
 * Set the token in localStorage (convenience method).
 */
export const setToken = (token: string | null) => {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
};

export const api = {
  setToken,

  get: (endpoint: string, token?: string | null) => {
    return fetch(`${API_BASE_URL}${endpoint}`, {
      headers: buildHeaders(token),
    });
  },

  post: (endpoint: string, body: any, token?: string | null) => {
    const isFormData = body instanceof FormData;
    const headers = buildHeaders(token);
    if (!isFormData) headers['Content-Type'] = 'application/json';
    return fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: isFormData ? body : JSON.stringify(body),
    });
  },

  put: (endpoint: string, body: any, token?: string | null) => {
    const isFormData = body instanceof FormData;
    const headers = buildHeaders(token);
    if (!isFormData) headers['Content-Type'] = 'application/json';
    return fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: isFormData ? body : JSON.stringify(body),
    });
  },

  patch: (endpoint: string, body: any, token?: string | null) => {
    const isFormData = body instanceof FormData;
    const headers = buildHeaders(token);
    if (!isFormData) headers['Content-Type'] = 'application/json';
    return fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: isFormData ? body : JSON.stringify(body),
    });
  },

  del: (endpoint: string, token?: string | null) => {
    return fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: buildHeaders(token),
    });
  },
};