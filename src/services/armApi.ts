import api from './api';

export interface ArmAssignment {
  armId: string;
  armName: string;
  armIdName: string;
  classId: string;
  className: string;
  isFormTeacher: boolean;
  subjectNames: string[];
}

export const getMyAssignments = async (): Promise<ArmAssignment[]> => {
  const res = await api.get('/arms/my-assignments');
  return res.data;
};
