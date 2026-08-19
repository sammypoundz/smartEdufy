import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
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
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);
  const [currentTerm, setCurrentTerm] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!token) return;
    try {
      const [yearsRes, currentRes] = await Promise.all([
        api.get('/academic-years', token),
        api.get('/academic-session/current', token),
      ]);
      if (yearsRes.ok) {
        const years = await yearsRes.json();
        setAcademicYears(years);
      }
      if (currentRes.ok) {
        const { year, term } = await currentRes.json();
        setCurrentYear(year);
        setCurrentTerm(term);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const setCurrentSession = async (yearId: string, termId: string) => {
    if (!token) return;
    try {
      const res = await api.post('/academic-session/set', { yearId, termId }, token);
      if (!res.ok) throw new Error(await res.text());
      await fetchData();
      toast.success('Academic session updated');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const refreshYears = () => fetchData();

  const addAcademicYear = async (name: string, terms: string[]) => {
    if (!token) return;
    try {
      const res = await api.post('/academic-years', { name, terms }, token);
      if (!res.ok) throw new Error(await res.text());
      toast.success('Academic year added');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
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