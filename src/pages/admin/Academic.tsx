import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAcademicSession } from '../../contexts/AcademicSessionContext';
import { api } from '../../utils/api';
import { formatArm } from '../../utils/arm';
import toast from 'react-hot-toast';
import {
  UsersIcon,
  AcademicCapIcon,
  UserGroupIcon,
  ArrowRightIcon,
  PlusIcon,
  CheckIcon,
  ArrowPathIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 },
};

interface Class {
  id: string;
  name: string;
  arms: Arm[];
}

interface Arm {
  id: string;
  letter: string;
}

interface Student {
  id: string;
  name: string;
  admissionNumber?: string;
}

export default function AdminAcademic() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const { currentYear, currentTerm, academicYears, addAcademicYear, setCurrentSession } =
    useAcademicSession();

  // State for classes and arms
  const [classes, setClasses] = useState<Class[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  // Promotion state
  const [promotionType, setPromotionType] = useState<'class' | 'student'>('class');
  const [sourceClassId, setSourceClassId] = useState('');
  const [sourceArmId, setSourceArmId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [targetArmId, setTargetArmId] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isPromoting, setIsPromoting] = useState(false);

  // Grading scale state
  const [gradingScales, setGradingScales] = useState<{ grade: string; min: number | null; max: number | null }[]>([]);
  const [savingGrading, setSavingGrading] = useState(false);
  const [loadingGrading, setLoadingGrading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Academic year modal
  const [showYearModal, setShowYearModal] = useState(false);
  const [newYearName, setNewYearName] = useState('');
  const [newYearTerms, setNewYearTerms] = useState(['First Term', 'Second Term', 'Third Term']);
  const [addingYear, setAddingYear] = useState(false);

  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      if (!token) return;
      try {
        const res = await api.get('/classes', token);
        if (res.ok) {
          const data = await res.json();
          setClasses(data);
        } else {
          const errorText = await res.text();
          console.error('Classes fetch error:', res.status, errorText);
          toast.error('Failed to load classes');
        }
      } catch (error) {
        console.error(error);
        toast.error('Could not load classes');
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchClasses();
  }, [token]);

  // 🔽 FETCH GRADING SCALES – now with debugging and flexible parsing
  useEffect(() => {
    const fetchGradingScales = async () => {
      if (!token) return;
      setLoadingGrading(true);
      try {
        const res = await api.get('/grading-scales', token);
        if (res.ok) {
          const rawData = await res.json();
          console.log('📊 Raw grading scales response:', rawData);

          // Try to extract an array of grade objects
          let gradesArray: any[] = [];

          if (Array.isArray(rawData)) {
            gradesArray = rawData;
          } else if (rawData && typeof rawData === 'object') {
            // Common patterns: { grades: [...] } or { data: [...] }
            if (Array.isArray(rawData.grades)) gradesArray = rawData.grades;
            else if (Array.isArray(rawData.data)) gradesArray = rawData.data;
            else if (Array.isArray(rawData.items)) gradesArray = rawData.items;
            else {
              // If it's an object with keys like "A", "B", etc.
              const values = Object.values(rawData);
              if (values.every(v => typeof v === 'object' && v !== null)) {
                gradesArray = values;
              }
            }
          }

          // Map to our expected shape { grade, min, max }
          const mapped = gradesArray.map((item: any) => {
            // Try common property names
            const grade = item.grade || item.letter || item.name || '';
            const min = item.min !== undefined ? item.min : (item.minScore !== undefined ? item.minScore : (item.minimum !== undefined ? item.minimum : (item.low !== undefined ? item.low : null)));
            const max = item.max !== undefined ? item.max : (item.maxScore !== undefined ? item.maxScore : (item.maximum !== undefined ? item.maximum : (item.high !== undefined ? item.high : null)));
            return { grade: String(grade), min: min !== null ? Number(min) : null, max: max !== null ? Number(max) : null };
          }).filter(g => g.grade.trim() !== ''); // remove entries without a grade letter

          if (mapped.length > 0) {
            setGradingScales(mapped);
            toast.success('Grading scales loaded');
          } else {
            // No valid grades found – use defaults with null values
            console.warn('No grading scales found, using defaults');
            setGradingScales([
              { grade: 'A', min: 70, max: 100 },
              { grade: 'B', min: 60, max: 69 },
              { grade: 'C', min: 50, max: 59 },
              { grade: 'D', min: 40, max: 49 },
              { grade: 'F', min: 0, max: 39 },
            ]);
            toast('No grading scales found, using defaults', { icon: 'ℹ️' });
          }
        } else {
          toast.error('Failed to load grading scales');
          setGradingScales([
            { grade: 'A', min: 70, max: 100 },
            { grade: 'B', min: 60, max: 69 },
            { grade: 'C', min: 50, max: 59 },
            { grade: 'D', min: 40, max: 49 },
            { grade: 'F', min: 0, max: 39 },
          ]);
        }
      } catch (error) {
        console.error('Fetch grading scales error:', error);
        toast.error('Could not load grading scales');
        setGradingScales([
          { grade: 'A', min: 70, max: 100 },
          { grade: 'B', min: 60, max: 69 },
          { grade: 'C', min: 50, max: 59 },
          { grade: 'D', min: 40, max: 49 },
          { grade: 'F', min: 0, max: 39 },
        ]);
      } finally {
        setLoadingGrading(false);
      }
    };
    fetchGradingScales();
  }, [token, refreshKey]);

  // Fetch students when source arm changes
  useEffect(() => {
    if (!sourceArmId || !token) {
      setStudents([]);
      setSelectedStudents([]);
      return;
    }
    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const res = await api.get(`/students?armId=${sourceArmId}`, token);
        if (res.ok) {
          const data = await res.json();
          setStudents(data);
          setSelectedStudents([]);
        } else {
          setStudents([]);
        }
      } catch (error) {
        console.error(error);
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudents();
  }, [sourceArmId, token]);

  const getArmsForClass = (classId: string) => {
    const cls = classes.find(c => c.id === classId);
    return cls?.arms || [];
  };

  const sourceArms = getArmsForClass(sourceClassId);
  const targetArms = getArmsForClass(targetClassId);

  // Promotion handler
  const handlePromote = async () => {
    if (!sourceClassId || !sourceArmId || !targetClassId || !targetArmId) {
      toast.error('Please select source and target class/arm');
      return;
    }
    if (promotionType === 'student' && selectedStudents.length === 0) {
      toast.error('Please select at least one student to promote');
      return;
    }
    if (!currentYear || !currentTerm) {
      toast.error('No active academic session. Please set one in Academic Setup.');
      return;
    }

    setIsPromoting(true);
    try {
      const payload: {
        sourceArmId: string;
        targetArmId: string;
        studentIds?: string[];
        academicYearId: string;
        termId: string;
      } = {
        sourceArmId,
        targetArmId,
        academicYearId: currentYear.id,
        termId: currentTerm.id,
      };
      if (promotionType === 'student') {
        payload.studentIds = selectedStudents;
      }
      const res = await api.post('/promote', payload, token);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      toast.success(
        promotionType === 'class'
          ? 'All students promoted successfully'
          : `${selectedStudents.length} student(s) promoted successfully`
      );
      // Reset form
      setSelectedStudents([]);
      setSourceArmId('');
      setSourceClassId('');
      setTargetArmId('');
      setTargetClassId('');
    } catch (err: any) {
      toast.error(err.message || 'Promotion failed');
    } finally {
      setIsPromoting(false);
    }
  };

  // Save grading scales
  const handleSaveGradingScales = async () => {
    // Validate before saving
    for (const scale of gradingScales) {
      if (!scale.grade.trim()) {
        toast.error('Grade letter is required for all rows');
        return;
      }
      if (scale.min === null || scale.min === undefined || isNaN(scale.min)) {
        toast.error(`Min score is required for grade "${scale.grade}"`);
        return;
      }
      if (scale.max === null || scale.max === undefined || isNaN(scale.max)) {
        toast.error(`Max score is required for grade "${scale.grade}"`);
        return;
      }
    }
    setSavingGrading(true);
    try {
      // Convert null values to 0 before saving
      const payload = gradingScales.map(scale => ({
        grade: scale.grade,
        min: scale.min ?? 0,
        max: scale.max ?? 0,
      }));
      const res = await api.post('/grading-scales/bulk', { scales: payload }, token);
      if (!res.ok) throw new Error(await res.text());
      toast.success('Grading scales saved');
      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save grading scales');
    } finally {
      setSavingGrading(false);
    }
  };

  // Update a single grading scale field locally
  const updateGradingScale = (index: number, field: 'min' | 'max' | 'grade', value: string | number | null) => {
    const updated = [...gradingScales];
    updated[index] = { ...updated[index], [field]: value };
    setGradingScales(updated);
  };

  // Add a new grade row
  const addGradeRow = () => {
    const newGrade = `Grade${gradingScales.length + 1}`;
    setGradingScales([...gradingScales, { grade: newGrade, min: null, max: null }]);
  };

  // Remove a grade row
  const removeGradeRow = (index: number) => {
    if (gradingScales.length <= 1) {
      toast.error('At least one grade is required');
      return;
    }
    const updated = gradingScales.filter((_, i) => i !== index);
    setGradingScales(updated);
  };

  // Add academic year
  const handleAddAcademicYear = async () => {
    if (!newYearName.trim()) {
      toast.error('Year name is required');
      return;
    }
    setAddingYear(true);
    try {
      await addAcademicYear(newYearName, newYearTerms);
      setShowYearModal(false);
      setNewYearName('');
      setNewYearTerms(['First Term', 'Second Term', 'Third Term']);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAddingYear(false);
    }
  };

  const selectStyle = {
    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
    color: theme === 'dark' ? '#f1f5f9' : '#0f172a',
  };

  if (loadingClasses || loadingGrading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
      {theme === 'dark' && (
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `linear-gradient(rgba(59,130,246,0.1) 1px,transparent 1px), linear-gradient(90deg,rgba(59,130,246,0.1) 1px,transparent 1px)`, backgroundSize: '60px 60px' }} />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-2xl font-bold mb-8 ${theme === 'dark' ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent' : 'bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent'}`}
        >
          Academic Setup
        </motion.h2>

        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
          {/* Academic Year Management Card */}
          <motion.div
            variants={item}
            className={`group relative overflow-hidden rounded-2xl p-6 shadow-xl transition-all duration-300 ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/30 backdrop-blur-md border border-white/20'}`}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-blue-500/10 to-purple-500/10" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Academic Session</h3>
                <button onClick={() => setShowYearModal(true)} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition">
                  <PlusIcon className="h-4 w-4" /> New Year
                </button>
              </div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Select the active academic year and term. All data will be filtered accordingly.</p>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Academic Year</label>
                  <select
                    value={currentYear?.id || ''}
                    onChange={async (e) => {
                      const year = academicYears.find((y) => y.id === e.target.value);
                      if (year) {
                        const termId = currentTerm?.id || year.terms[0]?.id;
                        if (termId) await setCurrentSession(year.id, termId);
                        else toast.error('No terms defined for this academic year');
                      }
                    }}
                    style={selectStyle}
                    className={`mt-1 block w-full rounded-xl border-0 bg-transparent px-4 py-3 text-sm shadow-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-white/5 text-white border border-white/10' : 'bg-white/40 text-gray-900 border border-white/20'}`}
                  >
                    <option value="">-- Select Year --</option>
                    {academicYears.map((year) => (
                      <option key={year.id} value={year.id}>{year.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Current Term</label>
                  <select
                    value={currentTerm?.id || ''}
                    onChange={async (e) => {
                      if (currentYear) await setCurrentSession(currentYear.id, e.target.value);
                    }}
                    style={selectStyle}
                    className={`mt-1 block w-full rounded-xl border-0 bg-transparent px-4 py-3 text-sm shadow-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-white/5 text-white border border-white/10' : 'bg-white/40 text-gray-900 border border-white/20'}`}
                    disabled={!currentYear}
                  >
                    <option value="">-- Select Term --</option>
                    {currentYear?.terms.map((term) => (
                      <option key={term.id} value={term.id}>{term.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className={`absolute -top-6 -right-6 w-32 h-32 rounded-full blur-2xl transition-all group-hover:scale-110 ${theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-200/30'}`} />
          </motion.div>

          {/* Grading Scale Card */}
          <motion.div
            variants={item}
            className={`group relative overflow-hidden rounded-2xl p-6 shadow-xl transition-all duration-300 ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/30 backdrop-blur-md border border-white/20'}`}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-blue-500/10 to-purple-500/10" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Grading Scale</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRefreshKey(prev => prev + 1)}
                    className="p-2 rounded-lg bg-gray-200/50 dark:bg-white/10 hover:bg-gray-300/50 dark:hover:bg-white/20 transition"
                    title="Refresh grading scales from server"
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleSaveGradingScales}
                    disabled={savingGrading}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50"
                  >
                    {savingGrading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                    Save
                  </button>
                </div>
              </div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Define grade boundaries for result computation. Click the refresh icon to reload saved values.
              </p>
              <div className="mt-5 overflow-x-auto">
                {loadingGrading ? (
                  <div className="flex justify-center py-4">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Grade</th>
                          <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Min Score</th>
                          <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Max Score</th>
                          <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700/50' : 'divide-gray-200/50'}`}>
                        {gradingScales.map((scale, idx) => (
                          <tr key={idx}>
                            <td className="whitespace-nowrap px-3 py-3 text-sm">
                              <input
                                type="text"
                                value={scale.grade}
                                onChange={(e) => updateGradingScale(idx, 'grade', e.target.value)}
                                className={`w-16 rounded-xl border-0 bg-transparent px-2 py-1 text-sm shadow-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-white/5 text-white border border-white/10' : 'bg-white/40 text-gray-900 border border-white/20'}`}
                              />
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-sm">
                              <input
                                type="number"
                                value={scale.min !== null && scale.min !== undefined ? scale.min : ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? null : parseInt(e.target.value);
                                  updateGradingScale(idx, 'min', val);
                                }}
                                placeholder="-"
                                className={`w-20 rounded-xl border-0 bg-transparent px-3 py-2 text-sm shadow-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-white/5 text-white border border-white/10' : 'bg-white/40 text-gray-900 border border-white/20'}`}
                              />
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-sm">
                              <input
                                type="number"
                                value={scale.max !== null && scale.max !== undefined ? scale.max : ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? null : parseInt(e.target.value);
                                  updateGradingScale(idx, 'max', val);
                                }}
                                placeholder="-"
                                className={`w-20 rounded-xl border-0 bg-transparent px-3 py-2 text-sm shadow-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-white/5 text-white border border-white/10' : 'bg-white/40 text-gray-900 border border-white/20'}`}
                              />
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-right">
                              <button
                                onClick={() => removeGradeRow(idx)}
                                className="p-1 text-red-500 hover:text-red-700 transition disabled:opacity-30"
                                disabled={gradingScales.length <= 1}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button
                      onClick={addGradeRow}
                      className="mt-3 inline-flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 transition"
                    >
                      <PlusIcon className="h-4 w-4" /> Add Grade
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className={`absolute -bottom-6 -left-6 w-32 h-32 rounded-full blur-2xl transition-all group-hover:scale-110 ${theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-200/30'}`} />
          </motion.div>

          {/* Promotion Module */}
          <motion.div
            variants={item}
            className={`group relative overflow-hidden rounded-2xl p-6 shadow-xl transition-all duration-300 ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/30 backdrop-blur-md border border-white/20'}`}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-emerald-500/10 to-teal-500/10" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                  <AcademicCapIcon className={`h-6 w-6 ${theme === 'dark' ? 'text-emerald-300' : 'text-emerald-600'}`} />
                </div>
                <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Class / Student Promotion</h3>
              </div>
              <p className={`text-sm mb-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Move students to the next academic level. History will be preserved with the current academic session.
                {currentYear && currentTerm && <span className="block text-xs mt-1 text-emerald-500">Active session: {currentYear.name} – {currentTerm.name}</span>}
              </p>

              {/* Promotion Type Toggle */}
              <div className="flex gap-2 p-1 rounded-xl mb-6 w-full max-w-xs bg-white/20 dark:bg-white/5 backdrop-blur-sm">
                <button onClick={() => setPromotionType('class')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${promotionType === 'class' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md' : theme === 'dark' ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-white/50'}`}>
                  <UserGroupIcon className="h-4 w-4" /> Whole Class
                </button>
                <button onClick={() => setPromotionType('student')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${promotionType === 'student' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md' : theme === 'dark' ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-white/50'}`}>
                  <UsersIcon className="h-4 w-4" /> Select Students
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Source Section */}
                <div className={`rounded-xl p-4 ${theme === 'dark' ? 'bg-white/5' : 'bg-white/40'}`}>
                  <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span> Current Level (Source)
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className={`block text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Class</label>
                      <select
                        value={sourceClassId}
                        onChange={(e) => { setSourceClassId(e.target.value); setSourceArmId(''); setStudents([]); setSelectedStudents([]); }}
                        style={selectStyle}
                        className={`mt-1 w-full rounded-xl border-0 bg-transparent px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-emerald-500 ${theme === 'dark' ? 'bg-white/5 text-white border border-white/10' : 'bg-white/60 text-gray-900 border border-white/20'}`}
                      >
                        <option value="">Select class</option>
                        {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Arm</label>
                      <select
                        value={sourceArmId}
                        onChange={(e) => setSourceArmId(e.target.value)}
                        disabled={!sourceClassId}
                        style={selectStyle}
                        className={`mt-1 w-full rounded-xl border-0 bg-transparent px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 ${theme === 'dark' ? 'bg-white/5 text-white border border-white/10' : 'bg-white/60 text-gray-900 border border-white/20'}`}
                      >
                        <option value="">Select arm</option>
                        {sourceArms.map((arm) => <option key={arm.id} value={arm.id}>{formatArm(arm)}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Target Section */}
                <div className={`rounded-xl p-4 ${theme === 'dark' ? 'bg-white/5' : 'bg-white/40'}`}>
                  <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span> Next Level (Target)
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className={`block text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Class</label>
                      <select
                        value={targetClassId}
                        onChange={(e) => { setTargetClassId(e.target.value); setTargetArmId(''); }}
                        style={selectStyle}
                        className={`mt-1 w-full rounded-xl border-0 bg-transparent px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-emerald-500 ${theme === 'dark' ? 'bg-white/5 text-white border border-white/10' : 'bg-white/60 text-gray-900 border border-white/20'}`}
                      >
                        <option value="">Select class</option>
                        {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Arm</label>
                      <select
                        value={targetArmId}
                        onChange={(e) => setTargetArmId(e.target.value)}
                        disabled={!targetClassId}
                        style={selectStyle}
                        className={`mt-1 w-full rounded-xl border-0 bg-transparent px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 ${theme === 'dark' ? 'bg-white/5 text-white border border-white/10' : 'bg-white/60 text-gray-900 border border-white/20'}`}
                      >
                        <option value="">Select arm</option>
                        {targetArms.map((arm) => <option key={arm.id} value={arm.id}>{formatArm(arm)}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {promotionType === 'student' && sourceArmId && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Select Students to Promote</h4>
                    {students.length > 0 && (
                      <button onClick={() => setSelectedStudents(selectedStudents.length === students.length ? [] : students.map(s => s.id))} className="text-xs text-emerald-500 hover:text-emerald-600 transition">
                        {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>
                  {loadingStudents ? (
                    <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1">
                      {students.map((student) => (
                        <label key={student.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${selectedStudents.includes(student.id) ? 'bg-emerald-500/20 border border-emerald-500/50' : theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-white/40 hover:bg-white/60'}`}>
                          <input type="checkbox" checked={selectedStudents.includes(student.id)} onChange={(e) => { if (e.target.checked) setSelectedStudents(prev => [...prev, student.id]); else setSelectedStudents(prev => prev.filter(id => id !== student.id)); }} className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500" />
                          <div>
                            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{student.name}</p>
                            {student.admissionNumber && <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{student.admissionNumber}</p>}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                  {students.length === 0 && !loadingStudents && sourceArmId && (
                    <p className={`text-sm text-center py-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No students found in this arm.</p>
                  )}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handlePromote}
                  disabled={isPromoting || !sourceClassId || !sourceArmId || !targetClassId || !targetArmId || (promotionType === 'student' && selectedStudents.length === 0)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPromoting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <ArrowRightIcon className="h-4 w-4" />}
                  {isPromoting ? 'Promoting...' : 'Promote Now'}
                </button>
              </div>
            </div>
            <div className={`absolute -top-6 -right-6 w-40 h-40 rounded-full blur-3xl transition-all group-hover:scale-110 ${theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-200/30'}`} />
          </motion.div>
        </motion.div>

        {theme === 'light' && <div className="fixed -top-20 -right-20 w-64 h-64 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />}
      </div>

      {/* Academic Year Modal */}
      {showYearModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className={`w-full max-w-md rounded-2xl p-6 shadow-xl ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
            <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Add Academic Year</h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Year Name (e.g., 2024/2025)</label>
                <input type="text" value={newYearName} onChange={(e) => setNewYearName(e.target.value)} className={`mt-1 w-full rounded-xl border-0 bg-transparent px-4 py-2 shadow-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-white/5 text-white border border-white/10' : 'bg-white/60 text-gray-900 border border-white/20'}`} placeholder="2024/2025" />
              </div>
              <div>
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Terms (one per line)</label>
                <textarea rows={3} value={newYearTerms.join('\n')} onChange={(e) => setNewYearTerms(e.target.value.split('\n').filter(t => t.trim()))} className={`mt-1 w-full rounded-xl border-0 bg-transparent px-4 py-2 shadow-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-white/5 text-white border border-white/10' : 'bg-white/60 text-gray-900 border border-white/20'}`} placeholder="First Term&#10;Second Term&#10;Third Term" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowYearModal(false)} className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Cancel</button>
              <button onClick={handleAddAcademicYear} disabled={addingYear} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{addingYear ? 'Creating...' : 'Create'}</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}