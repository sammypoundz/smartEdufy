// src/services/classService.ts
import api from './api';

// Define missing types locally
interface Teacher {
  id: string;
  name: string;
  email?: string;
  // add other fields as needed
}

interface Student {
  id: string;
  name: string;
  admissionNumber?: string;
  // add other fields as needed
}

export interface Class {
  id: string;
  name: string;
  arms?: Arm[];
}

export interface Arm {
  id: string;
  letter: string;
  alias?: string;
  teacherId?: string;
  teacher?: Teacher;
  students?: Student[];
}

export const classService = {
  getAll: async () => {
    const response = await api.get('/classes');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/classes/${id}`);
    return response.data;
  },

  create: async (name: string) => {
    const response = await api.post('/classes', { name });
    return response.data;
  },

  update: async (id: string, name: string) => {
    const response = await api.put(`/classes/${id}`, { name });
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/classes/${id}`);
    return response.data;
  },
};