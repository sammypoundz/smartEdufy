import api from './api';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  role: 'ADMIN' | 'TEACHER' | 'PARENT' | 'STUDENT';
  name: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
}

export const authService = {
  login: async (data: LoginData) => {
    const response = await api.post('/auth/login', data);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  register: async (data: RegisterData) => {
    const response = await api.post('/auth/register', data);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  /** Fresh profile for the signed-in staff/admin, including the school's
   *  assigned subscription (plan, billing cycle, price per cycle, status). */
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  /** Active subscription plans (marketing-safe fields) for the school's
   *  plan catalogue — shows what the school is on and what it can switch to. */
  getPlans: async () => {
    const response = await api.get('/auth/plans');
    return response.data.plans as any[];
  },
};