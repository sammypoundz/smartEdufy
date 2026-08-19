import api from './api';

export const studentService = {
  getByArmId: async (armId: string) => {
    const response = await api.get(`/students/arm/${armId}`);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/students/${id}`);
    return response.data;
  },

  assignParent: async (studentId: string, parentId: string) => {
    const response = await api.post(`/students/${studentId}/assign-parent`, { parentId });
    return response.data;
  },
};