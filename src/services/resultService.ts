import api from './api';

export interface ResultData {
  studentId: string;
  subjectId: string;
  term: string;
  score: number;
  grade?: string;
}

export const resultService = {
  getByStudentId: async (studentId: string) => {
    const response = await api.get(`/results/student/${studentId}`);
    return response.data;
  },

  create: async (data: ResultData) => {
    const response = await api.post('/results', data);
    return response.data;
  },
};