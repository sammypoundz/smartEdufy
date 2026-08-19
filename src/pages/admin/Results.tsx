import { useState, useEffect, useCallback } from 'react';
// import { motion } from 'framer-motion';  // ❌ removed – not used
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAcademicSession } from '../../contexts/AcademicSessionContext';
import { api } from '../../utils/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
  DocumentArrowDownIcon,
  CloudArrowUpIcon,
  DocumentChartBarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

// Types (unchanged)
interface Class { id: string; name: string; }
interface Arm { id: string; letter: string; }
interface Subject { id: string; name: string; }
interface Student { id: string; name: string; admissionNumber?: string; }

interface StudentResult {
  studentId: string;
  studentName: string;
  ca: number;
  exam: number;
  total: number;
  grade: string;
}

interface CompiledStudentResult {
  studentId: string;
  studentName: string;
  admissionNumber?: string;
  subjects: { subjectName: string; total: number; grade: string }[];
  totalScore: number;
  average: number;
  overallGrade: string;
  position: number;
}

interface ApiResult {
  studentId: string;
  ca: number;
  exam: number;
  total: number;
  grade: string;
}

interface HistoryItem {
  academicYearId: string;
  academicYearName: string;
  term: string;
}

const TERMS = ['First Term', 'Second Term', 'Third Term'];

export default function AdminResults() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const { academicYears } = useAcademicSession();

  const [classes, setClasses] = useState<Class[]>([]);
  const [arms, setArms] = useState<Arm[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedArmId, setSelectedArmId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [selectedTerm, setSelectedTerm] = useState(TERMS[0]);

  const [results, setResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [compiledData, setCompiledData] = useState<CompiledStudentResult[]>([]);
  const [loadingCompiled, setLoadingCompiled] = useState(false);
  const [showCompiled, setShowCompiled] = useState(false);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  // ❌ removed unused state: const [loadingHistory, setLoadingHistory] = useState(false);

  // ---------- Data fetching ----------
  const fetchClasses = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/classes', token);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setClasses(data);
      if (data.length > 0 && !selectedClassId) setSelectedClassId(data[0].id);
    } catch { toast.error('Failed to load classes'); }
  }, [token, selectedClassId]);

  const fetchArms = useCallback(async () => {
    if (!token || !selectedClassId) return;
    try {
      const res = await api.get(`/classes/${selectedClassId}/arms`, token);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setArms(data);
      if (data.length > 0 && !selectedArmId) setSelectedArmId(data[0].id);
      else if (data.length === 0) setSelectedArmId('');
    } catch { toast.error('Failed to load arms'); }
  }, [token, selectedClassId, selectedArmId]);

  const fetchSubjects = useCallback(async () => {
    if (!token || !selectedArmId) return;
    try {
      const res = await api.get(`/arms/${selectedArmId}/subjects/list`, token);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSubjects(data);
      if (data.length > 0 && !selectedSubjectId) setSelectedSubjectId(data[0].id);
      else if (data.length === 0) setSelectedSubjectId('');
    } catch { toast.error('Failed to load subjects'); }
  }, [token, selectedArmId, selectedSubjectId]);

  const fetchStudents = useCallback(async () => {
    if (!token || !selectedArmId) return;
    try {
      const res = await api.get(`/arms/${selectedArmId}/students`, token);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setStudents(data);
    } catch { toast.error('Failed to load students'); }
  }, [token, selectedArmId]);

  // Fetch subject-wise results (with academic year)
  const fetchResults = useCallback(async () => {
    // Guard: wait until we have all required data
    if (!token || !selectedArmId || !selectedSubjectId || !selectedTerm || !selectedAcademicYearId || students.length === 0) {
      // If no students, clear results and return
      if (students.length === 0 && selectedArmId) setResults([]);
      return;
    }
    setLoading(true);
    try {
      const url = `/results?armId=${selectedArmId}&subjectId=${selectedSubjectId}&term=${encodeURIComponent(selectedTerm)}&academicYearId=${selectedAcademicYearId}`;
      const res = await api.get(url, token);
      if (!res.ok) throw new Error(await res.text());
      const existing = await res.json() as ApiResult[];
      const resultMap = new Map(existing.map(r => [r.studentId, { ca: r.ca, exam: r.exam, total: r.total, grade: r.grade }]));
      const combined = students.map(s => {
        const ex = resultMap.get(s.id);
        return {
          studentId: s.id,
          studentName: s.name,
          ca: ex?.ca ?? 0,
          exam: ex?.exam ?? 0,
          total: ex?.total ?? 0,
          grade: ex?.grade ?? '',
        };
      });
      setResults(combined);
    } catch {
      toast.error('Failed to load results');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [token, selectedArmId, selectedSubjectId, selectedTerm, selectedAcademicYearId, students]);

  const fetchHistory = useCallback(async () => {
    if (!token || !selectedArmId) return;
    // ❌ removed setLoadingHistory(true);
    try {
      const res = await api.get(`/results/history?armId=${selectedArmId}`, token);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error('Failed to fetch history', err);
      setHistory([]);
    } finally {
      // ❌ removed setLoadingHistory(false);
    }
  }, [token, selectedArmId]);

  // ---------- Effects ----------
  useEffect(() => { fetchClasses(); }, [fetchClasses]);
  useEffect(() => { if (selectedClassId) fetchArms(); }, [selectedClassId, fetchArms]);

  // When arm changes: fetch subjects, students, and history; also clear results/compiled
  useEffect(() => {
    if (selectedArmId) {
      fetchSubjects();
      fetchStudents();
      fetchHistory();
      // Clear old results and compiled data immediately
      setResults([]);
      setCompiledData([]);
    }
  }, [selectedArmId, fetchSubjects, fetchStudents, fetchHistory]);

  // When subject, term, or academic year changes, clear results and compiled data
  useEffect(() => {
    setResults([]);
    setCompiledData([]);
  }, [selectedSubjectId, selectedTerm, selectedAcademicYearId]);

  // Fetch results when all necessary data is ready
  useEffect(() => {
    if (selectedArmId && selectedSubjectId && selectedTerm && selectedAcademicYearId && students.length) {
      fetchResults();
    } else if (selectedArmId && students.length === 0) {
      // No students in this arm – ensure results are empty
      setResults([]);
      setLoading(false);
    }
  }, [selectedArmId, selectedSubjectId, selectedTerm, selectedAcademicYearId, students, fetchResults]);

  // Set default academic year when list loads
  useEffect(() => {
    if (academicYears.length > 0 && !selectedAcademicYearId) {
      const active = academicYears.find(y => y.isActive);
      setSelectedAcademicYearId(active?.id || academicYears[0].id);
    }
  }, [academicYears, selectedAcademicYearId]);

  // ---------- Compile results ----------
  const compileResults = async () => {
    if (!selectedArmId || !selectedTerm || !selectedAcademicYearId) {
      toast.error('Please select an arm, term, and academic year');
      return;
    }
    setLoadingCompiled(true);
    setCompiledData([]); // clear old data
    setShowCompiled(true);
    try {
      const subjectsRes = await api.get(`/arms/${selectedArmId}/subjects/list`, token);
      if (!subjectsRes.ok) throw new Error(await subjectsRes.text());
      const armSubjects: Subject[] = await subjectsRes.json();
      if (armSubjects.length === 0) {
        toast.error('No subjects found for this arm');
        setLoadingCompiled(false);
        return;
      }

      const studentsRes = await api.get(`/arms/${selectedArmId}/students`, token);
      if (!studentsRes.ok) throw new Error(await studentsRes.text());
      const armStudents: Student[] = await studentsRes.json();
      if (armStudents.length === 0) {
        toast.error('No students in this arm');
        setLoadingCompiled(false);
        return;
      }

      const allSubjectResults: { subjectId: string; subjectName: string; results: Map<string, number> }[] = [];
      for (const sub of armSubjects) {
        const url = `/results?armId=${selectedArmId}&subjectId=${sub.id}&term=${encodeURIComponent(selectedTerm)}&academicYearId=${selectedAcademicYearId}`;
        const res = await api.get(url, token);
        if (!res.ok) continue;
        const subjectResults = await res.json() as ApiResult[];
        const studentScoreMap = new Map<string, number>();
        for (const sr of subjectResults) {
          studentScoreMap.set(sr.studentId, sr.total);
        }
        allSubjectResults.push({
          subjectId: sub.id,
          subjectName: sub.name,
          results: studentScoreMap,
        });
      }

      const compiled: CompiledStudentResult[] = armStudents.map(student => {
        const subjectsData: { subjectName: string; total: number; grade: string }[] = [];
        let totalScore = 0;
        let subjectsWithScores = 0;
        for (const sub of allSubjectResults) {
          const score = sub.results.get(student.id);
          if (score !== undefined) {
            subjectsWithScores++;
            totalScore += score;
            let grade = '';
            if (score >= 70) grade = 'A';
            else if (score >= 60) grade = 'B';
            else if (score >= 50) grade = 'C';
            else if (score >= 40) grade = 'D';
            else grade = 'F';
            subjectsData.push({ subjectName: sub.subjectName, total: score, grade });
          } else {
            subjectsData.push({ subjectName: sub.subjectName, total: 0, grade: '—' });
          }
        }
        const average = subjectsWithScores > 0 ? totalScore / subjectsWithScores : 0;
        let overallGrade = '';
        if (average >= 70) overallGrade = 'A';
        else if (average >= 60) overallGrade = 'B';
        else if (average >= 50) overallGrade = 'C';
        else if (average >= 40) overallGrade = 'D';
        else overallGrade = 'F';
        return {
          studentId: student.id,
          studentName: student.name,
          admissionNumber: student.admissionNumber,
          subjects: subjectsData,
          totalScore,
          average,
          overallGrade,
          position: 0,
        };
      });

      compiled.sort((a, b) => b.totalScore - a.totalScore);
      compiled.forEach((s, idx) => { s.position = idx + 1; });
      setCompiledData(compiled);
      toast.success('Results compiled successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to compile results');
    } finally {
      setLoadingCompiled(false);
    }
  };

  // ---------- Export, save, upload ----------
  const exportCompiled = () => {
    if (compiledData.length === 0) {
      toast.error('No compiled data to export');
      return;
    }
    const yearName = academicYears.find(y => y.id === selectedAcademicYearId)?.name || 'unknown';
    const exportRows = compiledData.map(s => ({
      'S/N': s.position,
      'Admission No': s.admissionNumber || '',
      'Student Name': s.studentName,
      ...s.subjects.reduce((acc, sub) => ({ ...acc, [`${sub.subjectName} (Total)`]: sub.total }), {}),
      'Total Score': s.totalScore,
      'Average': s.average.toFixed(2),
      'Overall Grade': s.overallGrade,
    }));
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Compiled_Results');
    XLSX.writeFile(wb, `compiled_results_${selectedArmId}_${yearName}_${selectedTerm}.xlsx`);
    toast.success('Export complete');
  };

  const saveResults = async () => {
    if (!selectedArmId || !selectedSubjectId || !selectedTerm || !selectedAcademicYearId) {
      toast.error('Please select arm, subject, term, and academic year');
      return;
    }
    const payload = results.map(r => ({
      studentId: r.studentId,
      subjectId: selectedSubjectId,
      armId: selectedArmId,
      term: selectedTerm,
      academicYearId: selectedAcademicYearId,
      ca: r.ca,
      exam: r.exam,
      total: r.total,
      grade: r.grade,
    }));
    setSaving(true);
    try {
      const res = await api.post('/results/bulk', { results: payload }, token);
      if (!res.ok) throw new Error(await res.text());
      toast.success('Results saved successfully');
      fetchHistory(); // refresh history
    } catch (err: any) {
      toast.error(err.message || 'Failed to save results');
    } finally { setSaving(false); }
  };

  const downloadTemplate = () => {
    const template = students.map(s => ({
      'Student Name': s.name,
      'Student ID': s.id,
      'CA (max 30)': '',
      'Exam (max 70)': '',
    }));
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results_Template');
    XLSX.writeFile(wb, `results_template_${selectedSubjectId}_${selectedTerm}.xlsx`);
    toast.success('Template downloaded');
  };

  const handleBulkUpload = async (file: File) => {
    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet) as any[];
      const updatedResults = [...results];
      for (const row of rows) {
        const studentId = row['Student ID'] || row['studentId'];
        const ca = Number(row['CA (max 30)'] || row['ca']);
        const exam = Number(row['Exam (max 70)'] || row['exam']);
        if (studentId && !isNaN(ca) && !isNaN(exam)) {
          const index = updatedResults.findIndex(r => r.studentId === studentId);
          if (index !== -1) {
            const total = ca + exam;
            let grade = '';
            if (total >= 70) grade = 'A';
            else if (total >= 60) grade = 'B';
            else if (total >= 50) grade = 'C';
            else if (total >= 40) grade = 'D';
            else grade = 'F';
            updatedResults[index] = { ...updatedResults[index], ca, exam, total, grade };
          }
        }
      }
      setResults(updatedResults);
      toast.success('Upload successful');
    } catch { toast.error('Failed to parse Excel file'); }
    finally { setUploading(false); }
  };

  const triggerFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleBulkUpload(file);
    };
    input.click();
  };

  const handleScoreChange = (studentId: string, field: 'ca' | 'exam', value: number) => {
    setResults(prev => prev.map(r => {
      if (r.studentId === studentId) {
        const newCa = field === 'ca' ? value : r.ca;
        const newExam = field === 'exam' ? value : r.exam;
        const total = newCa + newExam;
        let grade = '';
        if (total >= 70) grade = 'A';
        else if (total >= 60) grade = 'B';
        else if (total >= 50) grade = 'C';
        else if (total >= 40) grade = 'D';
        else grade = 'F';
        return { ...r, ca: newCa, exam: newExam, total, grade };
      }
      return r;
    }));
  };

  if (classes.length === 0 && loading) return <div>Loading...</div>;

  // ---------- Render ----------
  return (
    <div className={`min-h-screen px-4 sm:px-6 lg:px-8 py-8 ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
      {theme === 'dark' && <div className="fixed inset-0 z-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(59,130,246,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.1) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />}
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="sm:flex sm:items-center sm:justify-between mb-8">
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent' : 'bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent'}`}>Result Compiler</h2>
          <div className="mt-4 sm:mt-0 flex gap-3">
            <button onClick={downloadTemplate} disabled={students.length===0} className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm shadow-lg disabled:opacity-50"><DocumentArrowDownIcon className="h-4 w-4 mr-2"/>Template</button>
            <button onClick={triggerFileUpload} disabled={students.length===0||uploading} className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-sm shadow-lg disabled:opacity-50"><CloudArrowUpIcon className="h-4 w-4 mr-2"/>{uploading?'Uploading...':'Bulk Upload'}</button>
            <button onClick={compileResults} disabled={!selectedArmId || !selectedTerm || !selectedAcademicYearId || loadingCompiled} className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm shadow-lg hover:shadow-xl disabled:opacity-50"><DocumentChartBarIcon className="h-4 w-4 mr-2"/>{loadingCompiled?'Compiling...':'Compile Results'}</button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-5 mb-8">
          <div>
            <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Class</label>
            <select value={selectedClassId} onChange={e=>setSelectedClassId(e.target.value)} className={`mt-1 w-full rounded-xl border-0 px-4 py-3 text-sm shadow-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 text-white border border-white/10' : 'bg-white/40 text-gray-900 border border-white/20'}`}>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Arm</label>
            <select value={selectedArmId} onChange={e=>setSelectedArmId(e.target.value)} disabled={!selectedClassId} className={`mt-1 w-full rounded-xl border-0 px-4 py-3 text-sm shadow-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${theme === 'dark' ? 'bg-gray-800 text-white border border-white/10 disabled:bg-gray-700' : 'bg-white/40 text-gray-900 border border-white/20 disabled:bg-gray-100'}`}>
              <option value="">Select arm</option>
              {arms.map(a => <option key={a.id} value={a.id}>Arm {a.letter}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Subject</label>
            <select value={selectedSubjectId} onChange={e=>setSelectedSubjectId(e.target.value)} disabled={!selectedArmId} className={`mt-1 w-full rounded-xl border-0 px-4 py-3 text-sm shadow-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${theme === 'dark' ? 'bg-gray-800 text-white border border-white/10 disabled:bg-gray-700' : 'bg-white/40 text-gray-900 border border-white/20 disabled:bg-gray-100'}`}>
              <option value="">Select subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Academic Year</label>
            <select value={selectedAcademicYearId} onChange={e=>setSelectedAcademicYearId(e.target.value)} className={`mt-1 w-full rounded-xl border-0 px-4 py-3 text-sm shadow-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 text-white border border-white/10' : 'bg-white/40 text-gray-900 border border-white/20'}`}>
              <option value="">Select year</option>
              {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Term</label>
            <select value={selectedTerm} onChange={e=>setSelectedTerm(e.target.value)} className={`mt-1 w-full rounded-xl border-0 px-4 py-3 text-sm shadow-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 text-white border border-white/10' : 'bg-white/40 text-gray-900 border border-white/20'}`}>
              {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Compilation History Section */}
        {history.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <ClockIcon className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
              <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Compilation History</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {history.map((item) => (
                <button
                  key={`${item.academicYearId}-${item.term}`}
                  onClick={() => {
                    setSelectedAcademicYearId(item.academicYearId);
                    setSelectedTerm(item.term);
                    setTimeout(() => compileResults(), 100);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedAcademicYearId === item.academicYearId && selectedTerm === item.term
                      ? 'bg-blue-600 text-white shadow-md'
                      : theme === 'dark'
                      ? 'bg-white/10 text-gray-300 hover:bg-white/20'
                      : 'bg-white/40 text-gray-700 hover:bg-white/60'
                  }`}
                >
                  {item.academicYearName} – {item.term}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button onClick={()=>setShowCompiled(false)} className={`py-2 px-4 text-sm font-medium ${!showCompiled ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>Subject Scores Entry</button>
          <button onClick={()=>setShowCompiled(true)} className={`py-2 px-4 text-sm font-medium ${showCompiled ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>Compiled Results</button>
        </div>

        {!showCompiled ? (
          <div className="overflow-x-auto rounded-2xl shadow-xl bg-white/30 backdrop-blur-md border border-white/20 dark:bg-white/5 dark:border-white/10">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200/50 dark:border-white/10">
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Student</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>CA</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Exam</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Grade</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/10' : 'divide-gray-200/50'}`}>
                {loading ? (
                  <tr><td colSpan={5} className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Loading...</td></tr>
                ) : results.length === 0 ? (
                  <tr><td colSpan={5} className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No results found for this subject, term, and academic year. Enter scores above and save.</td></tr>
                ) : (
                  results.map(r => (
                    <tr key={r.studentId} className={theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-50'}>
                      <td className={`px-6 py-4 text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{r.studentName}</td>
                      <td className="px-6 py-4 text-sm">
                        <input type="number" min="0" max="30" value={r.ca} onChange={e=>handleScoreChange(r.studentId,'ca',+e.target.value)} className={`w-20 rounded-xl border-0 px-3 py-2 text-sm shadow-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 text-white border border-white/10' : 'bg-white/40 text-gray-900 border border-white/20'}`} />
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <input type="number" min="0" max="70" value={r.exam} onChange={e=>handleScoreChange(r.studentId,'exam',+e.target.value)} className={`w-20 rounded-xl border-0 px-3 py-2 text-sm shadow-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 text-white border border-white/10' : 'bg-white/40 text-gray-900 border border-white/20'}`} />
                      </td>
                      <td className={`px-6 py-4 text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{r.total}</td>
                      <td className={`px-6 py-4 text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{r.grade}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="flex justify-end p-6">
              <button onClick={saveResults} disabled={saving} className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg disabled:opacity-50">{saving?'Saving...':'Save Results'}</button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl shadow-xl bg-white/30 backdrop-blur-md border border-white/20 dark:bg-white/5 dark:border-white/10">
            {loadingCompiled ? (
              <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Compiling results, please wait...</div>
            ) : compiledData.length === 0 ? (
              <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No compiled data yet. Select academic year & term and click "Compile Results".</div>
            ) : (
              <>
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200/50 dark:border-white/10">
                      <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Pos</th>
                      <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Adm No</th>
                      <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Student Name</th>
                      {compiledData[0]?.subjects.map(s => <th key={s.subjectName} className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{s.subjectName}</th>)}
                      <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total</th>
                      <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Avg</th>
                      <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Grade</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/10' : 'divide-gray-200/50'}`}>
                    {compiledData.map(s => (
                      <tr key={s.studentId} className={theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-50'}>
                        <td className={`px-4 py-2 text-center text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{s.position}</td>
                        <td className={`px-4 py-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{s.admissionNumber || '—'}</td>
                        <td className={`px-4 py-2 font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{s.studentName}</td>
                        {s.subjects.map(sub => (
                          <td key={sub.subjectName} className={`px-4 py-2 text-center text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{sub.total} ({sub.grade})</td>
                        ))}
                        <td className={`px-4 py-2 text-center font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{s.totalScore}</td>
                        <td className={`px-4 py-2 text-center text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{s.average.toFixed(2)}</td>
                        <td className={`px-4 py-2 text-center font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{s.overallGrade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-end p-6">
                  <button onClick={exportCompiled} className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg">Export Compiled Results (Excel)</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}