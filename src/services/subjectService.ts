import api from './api';

export interface SubjectData {
  name: string;
  description?: string;
}

export const subjectService = {
  getAll: async () => {
    const response = await api.get('/subjects');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/subjects/${id}`);
    return response.data;
  },

  create: async (data: SubjectData) => {
    const response = await api.post('/subjects', data);
    return response.data;
  },

  update: async (id: string, data: SubjectData) => {
    const response = await api.put(`/subjects/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/subjects/${id}`);
    return response.data;
  },
};