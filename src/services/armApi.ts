import api from './api';
import { offlineAwareFetch, type OfflineBundleData } from '../offline/fallback';

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
  return offlineAwareFetch<ArmAssignment[]>(
    async () => {
      const res = await api.get('/arms/my-assignments');
      return res.data;
    },
    (bundle: OfflineBundleData) =>
      (bundle.arms ?? []).map((a) => ({
        armId: a.id,
        armName: a.letter,
        armIdName: a.alias ? `${a.className} ${a.alias}` : `${a.className} ${a.letter}`,
        classId: a.classId,
        className: a.className,
        isFormTeacher: a.isFormTeacher,
        subjectNames: (a.subjects ?? []).map((s) => s.name),
      })),
  );
};
