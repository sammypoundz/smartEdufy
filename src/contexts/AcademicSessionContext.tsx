import { createContext, useContext, type ReactNode } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { api } from '../utils/api';
import toast from 'react-hot-toast';

interface AcademicYear {
  id: string;
  name: string;
  isActive: boolean;
  terms: { id: string; name: string }[];
}

interface AcademicSessionContextType {
  currentYear: AcademicYear | null;
  currentTerm: { id: string; name: string } | null;
  setCurrentSession: (yearId: string, termId: string) => Promise<void>;
  academicYears: AcademicYear[];
  loading: boolean;
  refreshYears: () => Promise<void>;
  addAcademicYear: (name: string, terms: string[]) => Promise<void>;
}

const AcademicSessionContext = createContext<AcademicSessionContextType | undefined>(undefined);

export const useAcademicSession = () => {
  const ctx = useContext(AcademicSessionContext);
  if (!ctx) throw new Error('useAcademicSession must be used within AcademicSessionProvider');
  return ctx;
};

export const AcademicSessionProvider = ({ children }: { children: ReactNode }) => {
  const { token } = useAuth();

  const { data, isLoading: loading, refetch } = useQuery({
    queryKey: ['academic-session', token],
    enabled: !!token,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const [yearsRes, currentRes] = await Promise.all([
        api.get('/academic-years', token!),
        api.get('/academic-session/current', token!),
      ]);
      const years = yearsRes.ok ? await yearsRes.json() : [];
      const current = currentRes.ok ? await currentRes.json() : { year: null, term: null };
      return { years: years as AcademicYear[], year: current.year as AcademicYear | null, term: current.term as { id: string; name: string } | null };
    },
  });

  const academicYears = data?.years ?? [];
  const currentYear = data?.year ?? null;
  const currentTerm = data?.term ?? null;

  const refreshSession = async () => {
    await refetch();
  };

  const setCurrentSessionMutation = useMutation({
    mutationFn: async ({ yearId, termId }: { yearId: string; termId: string }) => {
      const res = await api.post('/academic-session/set', { yearId, termId }, token!);
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: async () => {
      await refreshSession();
      toast.success('Academic session updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addYearMutation = useMutation({
    mutationFn: async ({ name, terms }: { name: string; terms: string[] }) => {
      const res = await api.post('/academic-years', { name, terms }, token!);
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: async () => {
      await refreshSession();
      toast.success('Academic year added');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const setCurrentSession = async (yearId: string, termId: string) => {
    if (!token) return;
    await setCurrentSessionMutation.mutateAsync({ yearId, termId });
  };

  const refreshYears = () => refreshSession();

  const addAcademicYear = async (name: string, terms: string[]) => {
    if (!token) return;
    await addYearMutation.mutateAsync({ name, terms });
  };

  return (
    <AcademicSessionContext.Provider
      value={{
        currentYear,
        currentTerm,
        setCurrentSession,
        academicYears,
        loading,
        refreshYears,
        addAcademicYear,
      }}
    >
      {children}
    </AcademicSessionContext.Provider>
  );
};