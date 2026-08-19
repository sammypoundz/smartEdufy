import api from './api';

export interface AttendanceRecord {
  studentId: string;
  present: boolean;
}

export const attendanceService = {
  getByArm: async (armId: string, date?: string) => {
    const params = date ? { date } : {};
    const response = await api.get(`/attendance/arm/${armId}`, { params });
    return response.data;
  },

  mark: async (date: string, records: AttendanceRecord[]) => {
    const response = await api.post('/attendance/mark', { date, records });
    return response.data;
  },
};