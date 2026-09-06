import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAcademicSession } from '../../contexts/AcademicSessionContext';
import { api } from '../../utils/api';
import { formatArm } from '../../utils/arm';
import toast from 'react-hot-toast';

interface Class {
  id: string;
  name: string;
  arms: Arm[];
  gradingScaleGroup?: { id: string; name: string } | null;
}

interface Arm {
  id: string;
  letter: string;
  alias?: string;
  classId: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Result {
  studentId: string;
  subjectId: string;
  ca: number;
  exam: number;
  total: number;
  grade?: string;
}

interface StudentResult {
  studentId: string;
  studentName: string;
  subjects: {
    subjectId: string;
    subjectName: string;
    total: number;
    grade: string;
  }[];
  totalScore: number;
  average: number;
  overallGrade: string;
  position: number;
}

interface GradingScale {
  minScore: number;
  maxScore: number;
  grade: string;
}

interface GradingScaleGroup {
  id: string;
  name: string;
  grades: GradingScale[];
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 },
};

export default function AdminBroadsheet() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const { academicYears, currentTerm } = useAcademicSession();

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedArmId, setSelectedArmId] = useState('');
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [selectedTermName, setSelectedTermName] = useState('');

  const selectStyle = {
    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
    color: theme === 'dark' ? '#f1f5f9' : '#0f172a',
  };

  // ---------- Cached queries ----------
  const classesQuery = useQuery<Class[]>({
    queryKey: ['broadsheet-classes', token],
    enabled: !!token,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const res = await api.get('/classes', token!);
      if (!res.ok) throw new Error('Failed to load classes');
      return res.json();
    },
  });

  const subjectsQuery = useQuery<Subject[]>({
    queryKey: ['broadsheet-arm-subjects', selectedArmId, token],
    enabled: !!token && !!selectedArmId,
    queryFn: async () => {
      const res = await api.get(`/arms/${selectedArmId}/subjects/list`, token!);
      if (!res.ok) throw new Error('Failed to load subjects');
      return res.json();
    },
  });

  const gradingScalesQuery = useQuery<GradingScale[]>({
    queryKey: ['grading-scales', token],
    enabled: !!token,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const res = await api.get('/grading-scales', token!);
      if (!res.ok) {
        // Default fallback scale
        return [
          { minScore: 80, maxScore: 100, grade: 'A' },
          { minScore: 70, maxScore: 79, grade: 'B' },
          { minScore: 60, maxScore: 69, grade: 'C' },
          { minScore: 50, maxScore: 59, grade: 'D' },
          { minScore: 0, maxScore: 49, grade: 'F' },
        ];
      }
      return res.json();
    },
  });

  const gradingGroupsQuery = useQuery<GradingScaleGroup[]>({
    queryKey: ['grading-scale-groups', token],
    enabled: !!token,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const res = await api.get('/grading-scale-groups', token!);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const classes = classesQuery.data ?? [];
  const subjects = subjectsQuery.data ?? [];
  const gradingScales = gradingScalesQuery.data ?? [];
  const gradingGroups = gradingGroupsQuery.data ?? [];

  useEffect(() => {
    if (classesQuery.error) {
      console.error(classesQuery.error);
      toast.error('Could not load classes');
    }
  }, [classesQuery.error]);

  useEffect(() => {
    if (subjectsQuery.error) {
      console.error(subjectsQuery.error);
      toast.error('Could not load subjects');
    }
  }, [subjectsQuery.error]);

  // Scales for the selected class: use its assigned grading scale group if it
  // has one, otherwise the school-wide (ungrouped) scales.
  const effectiveGradingScales = useMemo(() => {
    const selectedClass = classes.find(c => c.id === selectedClassId);
    if (selectedClass?.gradingScaleGroup) {
      const group = gradingGroups.find(g => g.id === selectedClass.gradingScaleGroup!.id);
      if (group && group.grades.length > 0) return group.grades;
    }
    return gradingScales;
  }, [classes, selectedClassId, gradingGroups, gradingScales]);

  const computeGrade = useCallback((score: number): string => {
    const scale = effectiveGradingScales.find(s => score >= s.minScore && score <= s.maxScore);
    return scale?.grade || '?';
  }, [effectiveGradingScales]);

  // Subjects are loaded automatically by the arm-subjects query

  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  useEffect(() => {
    if (academicYears.length > 0 && !selectedAcademicYearId) {
      const active = academicYears.find(y => y.isActive);
      setSelectedAcademicYearId(active?.id || academicYears[0].id);
    }
  }, [academicYears, selectedAcademicYearId]);

  useEffect(() => {
    if (currentTerm && !selectedTermName) {
      setSelectedTermName(currentTerm.name);
    }
  }, [currentTerm, selectedTermName]);

  useEffect(() => {
    setSelectedArmId('');
  }, [selectedClassId]);

  useEffect(() => {
    setSelectedTermName('');
  }, [selectedAcademicYearId]);

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const arms = selectedClass?.arms || [];

  // ---------- Consolidated results (cached query) ----------
  const resultsEnabled =
    !!token &&
    !!selectedArmId &&
    !!selectedAcademicYearId &&
    !!selectedTermName &&
    subjects.length > 0;

  const resultsQuery = useQuery<StudentResult[]>({
    queryKey: [
      'broadsheet-results',
      selectedArmId,
      selectedAcademicYearId,
      selectedTermName,
      subjects.map(s => s.id).join(','),
    ],
    enabled: resultsEnabled,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const encodedTerm = encodeURIComponent(selectedTermName);
      // ✅ Now we call the endpoint without subjectId (after backend change)
      const res = await api.get(
        `/results?armId=${selectedArmId}&academicYearId=${selectedAcademicYearId}&term=${encodedTerm}`,
        token!
      );
      if (!res.ok) throw new Error('Failed to fetch results');
      const resultsData: Result[] = await res.json();

      const studentMap = new Map<string, { name: string; subjects: Map<string, number> }>();
      const studentsRes = await api.get(`/students?armId=${selectedArmId}`, token);
      if (studentsRes.ok) {
        const students = await studentsRes.json();
        for (const student of students) {
          studentMap.set(student.id, { name: student.name, subjects: new Map() });
        }
      }

      for (const result of resultsData) {
        const student = studentMap.get(result.studentId);
        if (student) {
          const subject = subjects.find(s => s.id === result.subjectId);
          if (subject) {
            student.subjects.set(subject.id, result.total);
          }
        }
      }

      const studentResultList: StudentResult[] = [];
      for (const [studentId, data] of studentMap.entries()) {
        const subjectScores: { subjectId: string; subjectName: string; total: number; grade: string }[] = [];
        let totalScore = 0;
        let subjectsWithScores = 0;

        for (const subject of subjects) {
          const score = data.subjects.get(subject.id);
          if (score !== undefined) {
            subjectsWithScores++;
            totalScore += score;
            subjectScores.push({
              subjectId: subject.id,
              subjectName: subject.name,
              total: score,
              grade: computeGrade(score),
            });
          } else {
            subjectScores.push({
              subjectId: subject.id,
              subjectName: subject.name,
              total: 0,
              grade: '—',
            });
          }
        }
        const average = subjectsWithScores > 0 ? totalScore / subjectsWithScores : 0;
        const overallGrade = computeGrade(average);
        studentResultList.push({
          studentId,
          studentName: data.name,
          subjects: subjectScores,
          totalScore,
          average,
          overallGrade,
          position: 0,
        });
      }

      studentResultList.sort((a, b) => b.average - a.average);
      // Competition ranking: students tied on average share the same position,
      // and the counter only advances past a tied group (1, 2, 2, 4, ...).
      for (let i = 0; i < studentResultList.length; i++) {
        if (i > 0 && studentResultList[i].average === studentResultList[i - 1].average) {
          studentResultList[i].position = studentResultList[i - 1].position;
        } else {
          studentResultList[i].position = i + 1;
        }
      }

      return studentResultList;
    },
  });

  useEffect(() => {
    if (resultsQuery.error) {
      console.error(resultsQuery.error);
      toast.error(
        resultsQuery.error instanceof Error
          ? resultsQuery.error.message
          : 'Failed to load results'
      );
    }
  }, [resultsQuery.error]);

  const studentResults = resultsQuery.data ?? [];
  const loadingData = resultsQuery.isFetching;

  return (
    <div className={`min-h-screen px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
    }`}>
      {theme === 'dark' && (
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `linear-gradient(rgba(59,130,246,0.1) 1px,transparent 1px), linear-gradient(90deg,rgba(59,130,246,0.1) 1px,transparent 1px)`, backgroundSize: '60px 60px' }} />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
        </div>
      )}
      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h2 className={`text-2xl font-bold ${
            theme === 'dark' ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent' : 'bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent'
          }`}>Broadsheet</h2>
          <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>View consolidated student results with positions and grades.</p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-4 mb-8">
          <div>
            <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              style={selectStyle}
              className={`mt-1 block w-full rounded-xl border-0 px-4 py-3 text-sm shadow-lg focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark' ? 'bg-white/5 text-white border border-white/10' : 'bg-white/40 text-gray-900 border border-white/20'
              }`}
            >
              <option value="">Select class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Arm</label>
            <select
              value={selectedArmId}
              onChange={(e) => setSelectedArmId(e.target.value)}
              disabled={!selectedClassId}
              style={selectStyle}
              className={`mt-1 block w-full rounded-xl border-0 px-4 py-3 text-sm shadow-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                theme === 'dark' ? 'bg-white/5 text-white border border-white/10' : 'bg-white/40 text-gray-900 border border-white/20'
              }`}
            >
              <option value="">Select arm</option>
              {arms.map(arm => <option key={arm.id} value={arm.id}>{formatArm(arm)}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Academic Year</label>
            <select
              value={selectedAcademicYearId}
              onChange={(e) => setSelectedAcademicYearId(e.target.value)}
              style={selectStyle}
              className={`mt-1 block w-full rounded-xl border-0 px-4 py-3 text-sm shadow-lg focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark' ? 'bg-white/5 text-white border border-white/10' : 'bg-white/40 text-gray-900 border border-white/20'
              }`}
            >
              <option value="">Select year</option>
              {academicYears.map(year => <option key={year.id} value={year.id}>{year.name}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Term</label>
            <select
              value={selectedTermName}
              onChange={(e) => setSelectedTermName(e.target.value)}
              disabled={!selectedAcademicYearId}
              style={selectStyle}
              className={`mt-1 block w-full rounded-xl border-0 px-4 py-3 text-sm shadow-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                theme === 'dark' ? 'bg-white/5 text-white border border-white/10' : 'bg-white/40 text-gray-900 border border-white/20'
              }`}
            >
              <option value="">Select term</option>
              {academicYears.find(y => y.id === selectedAcademicYearId)?.terms.map(term => (
                <option key={term.id} value={term.name}>{term.name}</option>
              ))}
            </select>
          </div>
        </div>

        {loadingData ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : studentResults.length === 0 ? (
          <div className={`text-center py-12 rounded-2xl ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/30 backdrop-blur-md border border-white/20'}`}>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              No results found for the selected arm, academic year, and term.
            </p>
          </div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="rounded-2xl shadow-xl overflow-hidden">
            <div className={`overflow-x-auto ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/30 backdrop-blur-md border border-white/20'}`}>
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className={`py-4 pl-6 pr-3 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>#</th>
                    <th className={`py-4 pl-6 pr-3 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Student</th>
                    {subjects.map(sub => (
                      <th key={sub.id} className={`px-3 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>{sub.name}</th>
                    ))}
                    <th className={`px-3 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Total</th>
                    <th className={`px-3 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Average</th>
                    <th className={`px-3 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Grade</th>
                    <th className={`px-3 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Position</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/10' : 'divide-gray-200/50'}`}>
                  {studentResults.map((student, idx) => (
                    <motion.tr key={student.studentId} variants={item} whileHover={{ backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(59,130,246,0.05)' }} className="transition-colors">
                      <td className={`whitespace-nowrap py-4 pl-6 pr-3 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{idx + 1}</td>
                      <td className={`whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{student.studentName}</td>
                      {student.subjects.map(sub => (
                        <td key={sub.subjectId} className={`whitespace-nowrap px-3 py-4 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          {sub.total > 0 ? `${sub.total} (${sub.grade})` : '—'}
                        </td>
                      ))}
                      <td className={`whitespace-nowrap px-3 py-4 text-sm font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>{student.totalScore}</td>
                      <td className={`whitespace-nowrap px-3 py-4 text-sm font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>{student.average.toFixed(1)}</td>
                      <td className={`whitespace-nowrap px-3 py-4 text-sm font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{student.overallGrade}</td>
                      <td className={`whitespace-nowrap px-3 py-4 text-sm font-bold ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>{student.position}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}