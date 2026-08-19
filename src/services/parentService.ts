import api from './api';

export const parentService = {
  getAll: async () => {
    const response = await api.get('/parents');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/parents/${id}`);
    return response.data;
  },
};