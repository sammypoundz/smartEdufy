import api from './api';

export interface SkillData {
  name: string;
  description?: string;
}

export const skillService = {
  getAll: async () => {
    const response = await api.get('/skills');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/skills/${id}`);
    return response.data;
  },

  create: async (data: SkillData) => {
    const response = await api.post('/skills', data);
    return response.data;
  },

  update: async (id: string, data: SkillData) => {
    const response = await api.put(`/skills/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/skills/${id}`);
    return response.data;
  },
};