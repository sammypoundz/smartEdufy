import api from './api';

export interface TimetableEntry {
  dayOfWeek: string;
  timeSlot: string;
  subjectId?: string;
}

export const timetableService = {
  getByArmId: async (armId: string) => {
    const response = await api.get(`/timetable/arm/${armId}`);
    return response.data;
  },

  replaceForArm: async (armId: string, entries: TimetableEntry[]) => {
    const response = await api.post(`/timetable/arm/${armId}`, { entries });
    return response.data;
  },
};