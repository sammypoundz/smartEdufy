import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAcademicSession } from '../../contexts/AcademicSessionContext';
import { api } from '../../utils/api';
import { fetchGradingData, resolveClassScales, computeGradeWithScales } from '../../utils/grading';
import type { GradingScale, GradingScaleGroup } from '../../utils/grading';
import { formatArm } from '../../utils/arm';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
  DocumentArrowDownIcon,
  EyeIcon,
  PrinterIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const toNumber = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

interface Class { id: string; name: string; gradingScaleGroup?: { id: string; name: string } | null; }
interface Arm { id: string; letter: string; }
interface Subject { id: string; name: string; }
interface Student { id: string; name: string; admissionNumber?: string; }

interface ApiResult {
  studentId: string;
  ca: string | number;
  exam: string | number;
  total: string | number;
  grade: string;
}

interface SubjectResult {
  subjectId: string;
  subjectName: string;
  ca: number;
  exam: number;
  total: number;
  grade: string;
}

interface StudentResultCard {
  studentId: string;
  studentName: string;
  admissionNumber?: string;
  subjects: SubjectResult[];
  totalScore: number;
  average: number;
  overallGrade: string;
}

// Type for Excel rows – CA and Exam can be number or string (for empty cells)
interface ExcelRow {
  Subject: string;
  CA: number | string;
  Exam: number | string;
  Total: number;
  Grade: string;
}

const TERMS = ['First Term', 'Second Term', 'Third Term'];

const sanitiseFileName = (name: string) => name.replace(/[\\/*?:"<>|]/g, '_').slice(0, 200);

export default function AdminReports() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const { academicYears } = useAcademicSession();

  const [classes, setClasses] = useState<Class[]>([]);
  const [arms, setArms] = useState<Arm[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedArmId, setSelectedArmId] = useState('');
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [selectedTerm, setSelectedTerm] = useState(TERMS[0]);

  const [resultCards, setResultCards] = useState<StudentResultCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<StudentResultCard | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [printingAll, setPrintingAll] = useState(false);
  const [downloadingSingle, setDownloadingSingle] = useState<string | null>(null);

  // Grading scales (class-assigned group takes priority over school-wide)
  const [schoolScales, setSchoolScales] = useState<GradingScale[]>([]);
  const [gradingGroups, setGradingGroups] = useState<GradingScaleGroup[]>([]);

  useEffect(() => {
    if (!token) return;
    fetchGradingData(token).then(({ schoolScales, groups }) => {
      setSchoolScales(schoolScales);
      setGradingGroups(groups);
    });
  }, [token]);

  const effectiveGradingScales = useMemo(() => {
    const selectedClass = classes.find(c => c.id === selectedClassId);
    return resolveClassScales(selectedClass, schoolScales, gradingGroups);
  }, [classes, selectedClassId, schoolScales, gradingGroups]);

  const computeGrade = useCallback(
    (score: number) => computeGradeWithScales(effectiveGradingScales, score),
    [effectiveGradingScales]
  );

  // ========== Data fetching ==========
  const fetchClasses = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/classes', token);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const sanitised = data.map((c: any) => ({ ...c, id: String(c.id) }));
      setClasses(sanitised);
      if (sanitised.length > 0 && !selectedClassId) setSelectedClassId(sanitised[0].id);
    } catch { toast.error('Failed to load classes'); }
  }, [token, selectedClassId]);

  const fetchArms = useCallback(async () => {
    if (!token || !selectedClassId) return;
    try {
      const res = await api.get(`/classes/${selectedClassId}/arms`, token);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const sanitised = data.map((a: any) => ({ ...a, id: String(a.id), letter: String(a.letter) }));
      setArms(sanitised);
      if (sanitised.length > 0 && !selectedArmId) setSelectedArmId(sanitised[0].id);
      else if (sanitised.length === 0) setSelectedArmId('');
    } catch { toast.error('Failed to load arms'); }
  }, [token, selectedClassId, selectedArmId]);

  const fetchStudents = useCallback(async () => {
    if (!token || !selectedArmId) return;
    try {
      const res = await api.get(`/arms/${selectedArmId}/students`, token);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const sanitised = data.map((s: any) => ({
        id: String(s.id),
        name: String(s.name),
        admissionNumber: s.admissionNumber ? String(s.admissionNumber) : undefined,
      }));
      setStudents(sanitised);
    } catch { toast.error('Failed to load students'); }
  }, [token, selectedArmId]);

  const fetchSubjects = useCallback(async () => {
    if (!token || !selectedArmId) return;
    try {
      const res = await api.get(`/arms/${selectedArmId}/subjects/list`, token);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const sanitised = data.map((sub: any) => ({ id: String(sub.id), name: String(sub.name) }));
      setSubjects(sanitised);
    } catch { toast.error('Failed to load subjects'); }
  }, [token, selectedArmId]);

  // ========== Build result cards ==========
  const buildResultCards = useCallback(async () => {
    if (!selectedArmId || !selectedTerm || !selectedAcademicYearId || students.length === 0 || subjects.length === 0) {
      setResultCards([]);
      return;
    }
    setLoading(true);
    try {
      const subjectResultsMap = new Map<string, Map<string, { ca: number; exam: number; total: number; grade: string }>>();

      for (const sub of subjects) {
        const url = `/results?armId=${selectedArmId}&subjectId=${sub.id}&term=${encodeURIComponent(selectedTerm)}&academicYearId=${selectedAcademicYearId}`;
        const res = await api.get(url, token);
        if (!res.ok) continue;
        const results = (await res.json()) as ApiResult[];
        const studentMap = new Map<string, { ca: number; exam: number; total: number; grade: string }>();
        for (const r of results) {
          studentMap.set(r.studentId, {
            ca: toNumber(r.ca),
            exam: toNumber(r.exam),
            total: toNumber(r.total),
            grade: r.grade || '—',
          });
        }
        subjectResultsMap.set(sub.id, studentMap);
      }

      const cards: StudentResultCard[] = students.map(student => {
        const subjectsData: SubjectResult[] = [];
        let totalScore: number = 0;
        let subjectsWithScores: number = 0;

        for (const sub of subjects) {
          const result = subjectResultsMap.get(sub.id)?.get(student.id);
          if (result) {
            subjectsWithScores++;
            totalScore += result.total;
            subjectsData.push({
              subjectId: sub.id,
              subjectName: sub.name,
              ca: result.ca,
              exam: result.exam,
              total: result.total,
              grade: result.grade,
            });
          } else {
            subjectsData.push({
              subjectId: sub.id,
              subjectName: sub.name,
              ca: 0,
              exam: 0,
              total: 0,
              grade: '—',
            });
          }
        }

        const average: number = subjectsWithScores > 0 ? totalScore / subjectsWithScores : 0;
        const overallGrade = computeGrade(average);

        return {
          studentId: student.id,
          studentName: student.name,
          admissionNumber: student.admissionNumber,
          subjects: subjectsData,
          totalScore: Number(totalScore),
          average: Number(average),
          overallGrade,
        };
      });

      setResultCards(cards);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load result cards');
    } finally {
      setLoading(false);
    }
  }, [selectedArmId, selectedTerm, selectedAcademicYearId, students, subjects, token, computeGrade]);

  // ========== Effects ==========
  useEffect(() => { fetchClasses(); }, [fetchClasses]);
  useEffect(() => { if (selectedClassId) fetchArms(); }, [selectedClassId, fetchArms]);
  useEffect(() => { if (selectedArmId) { fetchStudents(); fetchSubjects(); } }, [selectedArmId, fetchStudents, fetchSubjects]);
  useEffect(() => { if (students.length && subjects.length && selectedAcademicYearId) buildResultCards(); }, [students, subjects, buildResultCards, selectedAcademicYearId]);

  useEffect(() => {
    if (academicYears.length > 0 && !selectedAcademicYearId) {
      const active = academicYears.find(y => y.isActive);
      setSelectedAcademicYearId(active?.id || academicYears[0].id);
    }
  }, [academicYears, selectedAcademicYearId]);

  // ========== Download functions – FIXED TYPE ERRORS ==========
  const downloadSingleCard = async (card: StudentResultCard) => {
    setDownloadingSingle(card.studentId);
    try {
      const rows: ExcelRow[] = card.subjects.map(sub => ({
        Subject: sub.subjectName,
        'CA': Number(sub.ca),    // explicit number
        'Exam': Number(sub.exam),
        'Total': Number(sub.total),
        'Grade': sub.grade,
      }));
      rows.push({
        Subject: 'TOTAL / AVERAGE',
        'CA': '',                // empty string allowed by ExcelRow type
        'Exam': '',
        'Total': Number(card.totalScore),
        'Grade': `${Number(card.average).toFixed(2)}% (${card.overallGrade})`,
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Results');

      const yearName = academicYears.find(y => y.id === selectedAcademicYearId)?.name || 'unknown';
      const safeStudentName = sanitiseFileName(card.studentName);
      const fileName = `${safeStudentName}_${yearName}_${selectedTerm}_result.xlsx`;

      XLSX.writeFile(wb, fileName);
      toast.success(`Downloaded: ${fileName}`);
    } catch (err: any) {
      console.error('Download single card error:', err);
      toast.error(`Download failed: ${err.message || 'Unknown error'}`);
    } finally {
      setDownloadingSingle(null);
    }
  };

  const downloadAllCards = async () => {
    if (resultCards.length === 0) {
      toast.error('No result cards to download');
      return;
    }
    setDownloadingAll(true);
    try {
      const wb = XLSX.utils.book_new();
      for (const card of resultCards) {
        const rows: ExcelRow[] = card.subjects.map(sub => ({
          Subject: sub.subjectName,
          'CA': Number(sub.ca),
          'Exam': Number(sub.exam),
          'Total': Number(sub.total),
          'Grade': sub.grade,
        }));
        rows.push({
          Subject: 'TOTAL / AVERAGE',
          'CA': '',
          'Exam': '',
          'Total': Number(card.totalScore),
          'Grade': `${Number(card.average).toFixed(2)}% (${card.overallGrade})`,
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        let sheetName = card.studentName.slice(0, 31).replace(/[\\/*?:[\]]/g, '');
        if (!sheetName) sheetName = `Student_${card.studentId}`;
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }
      const yearName = academicYears.find(y => y.id === selectedAcademicYearId)?.name || 'unknown';
      const safeArmId = sanitiseFileName(selectedArmId);
      const fileName = `Result_Cards_${safeArmId}_${yearName}_${selectedTerm}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success('All result cards downloaded');
    } catch (err: any) {
      console.error('Download all cards error:', err);
      toast.error(`Download failed: ${err.message || 'Unknown error'}`);
    } finally {
      setDownloadingAll(false);
    }
  };

  // ========== Print functions ==========
  const printAllCards = async () => {
    if (resultCards.length === 0) {
      toast.error('No result cards to print');
      return;
    }
    setPrintingAll(true);
    try {
      const yearName = academicYears.find(y => y.id === selectedAcademicYearId)?.name || '';
      let htmlContent = `<!DOCTYPE html><html><head><title>Result Cards - ${yearName} ${selectedTerm}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; background: white; color: black; }
          .card { page-break-after: always; margin-bottom: 40px; padding: 20px; border: 1px solid #ccc; border-radius: 8px; }
          .card:last-child { page-break-after: auto; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .header { text-align: center; margin-bottom: 20px; }
          .total-row { font-weight: bold; background-color: #f9f9f9; }
        </style>
      </head><body>`;
      for (const card of resultCards) {
        htmlContent += `<div class="card"><div class="header"><h2>${card.studentName}</h2>
          <p>Admission No: ${card.admissionNumber || '—'} | Session: ${yearName} | Term: ${selectedTerm}</p></div>
          <table><thead><tr><th>Subject</th><th>CA</th><th>Exam</th><th>Total</th><th>Grade</th></tr></thead><tbody>`;
        for (const sub of card.subjects) {
          htmlContent += `<tr><td>${sub.subjectName}</td><td>${sub.ca}</td><td>${sub.exam}</td><td>${sub.total}</td><td>${sub.grade}</td></tr>`;
        }
        htmlContent += `<tr class="total-row"><td><strong>TOTAL / AVERAGE</strong></td><td></td><td></td>
          <td><strong>${card.totalScore}</strong></td><td><strong>${card.average.toFixed(2)}% (${card.overallGrade})</strong></td></tr>
          </tbody></table></div>`;
      }
      htmlContent += `</body></html>`;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
      }
      toast.success('Print window opened');
    } catch (err: any) {
      console.error('Print all error:', err);
      toast.error('Failed to prepare print view');
    } finally {
      setPrintingAll(false);
    }
  };

  const openModal = (card: StudentResultCard) => {
    setSelectedCard(card);
    setShowModal(true);
  };

  const printModal = () => {
    const printContent = document.getElementById('result-card-print');
    if (!printContent) return;
    const originalTitle = document.title;
    document.title = `Result Card - ${selectedCard?.studentName}`;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const yearName = academicYears.find(y => y.id === selectedAcademicYearId)?.name || '';
      printWindow.document.write(`
        <html><head><title>Result Card - ${selectedCard?.studentName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .header { text-align: center; margin-bottom: 20px; }
          .total-row { font-weight: bold; background-color: #f9f9f9; }
        </style>
        </head><body>${printContent.innerHTML.replace('—', `${yearName} | Term: ${selectedTerm}`)}</body></html>
      `);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
    document.title = originalTitle;
  };

  if (classes.length === 0 && !loading) return <div className="p-8">Loading...</div>;

  return (
    <div className={`min-h-screen px-4 sm:px-6 lg:px-8 py-8 ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
      {theme === 'dark' && (
        <div className="fixed inset-0 z-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(59,130,246,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.1) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
      )}
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="sm:flex sm:items-center sm:justify-between mb-8">
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent' : 'bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent'}`}>
            Student Result Cards
          </h2>
          <div className="mt-4 sm:mt-0 flex gap-3">
            <button onClick={downloadAllCards} disabled={resultCards.length === 0 || loading || downloadingAll}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm shadow-lg disabled:opacity-50">
              {downloadingAll ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <DocumentArrowDownIcon className="h-4 w-4 mr-2" />}
              {downloadingAll ? 'Downloading...' : 'Download All (Excel)'}
            </button>
            <button onClick={printAllCards} disabled={resultCards.length === 0 || loading || printingAll}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-sm shadow-lg disabled:opacity-50">
              {printingAll ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <PrinterIcon className="h-4 w-4 mr-2" />}
              {printingAll ? 'Preparing...' : 'Print All Cards'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-4 mb-8">
          <div>
            <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Class</label>
            <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}
              className={`mt-1 w-full rounded-xl border-0 px-4 py-3 text-sm shadow-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 text-white border border-white/10' : 'bg-white/40 text-gray-900 border border-white/20'}`}>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Arm</label>
            <select value={selectedArmId} onChange={e => setSelectedArmId(e.target.value)} disabled={!selectedClassId}
              className={`mt-1 w-full rounded-xl border-0 px-4 py-3 text-sm shadow-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${theme === 'dark' ? 'bg-gray-800 text-white border border-white/10' : 'bg-white/40 text-gray-900 border border-white/20'}`}>
              <option value="">Select arm</option>
              {arms.map(a => <option key={a.id} value={a.id}>{formatArm(a)}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Academic Year</label>
            <select value={selectedAcademicYearId} onChange={e => setSelectedAcademicYearId(e.target.value)}
              className={`mt-1 w-full rounded-xl border-0 px-4 py-3 text-sm shadow-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 text-white border border-white/10' : 'bg-white/40 text-gray-900 border border-white/20'}`}>
              <option value="">Select year</option>
              {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Term</label>
            <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}
              className={`mt-1 w-full rounded-xl border-0 px-4 py-3 text-sm shadow-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 text-white border border-white/10' : 'bg-white/40 text-gray-900 border border-white/20'}`}>
              {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Loading result cards...</div>
        ) : resultCards.length === 0 ? (
          <div className={`text-center py-12 rounded-2xl ${theme === 'dark' ? 'bg-white/5' : 'bg-white/30'} backdrop-blur-md`}>
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>No results found for the selected arm, academic year, and term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resultCards.map(card => (
              <motion.div key={card.studentId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className={`group relative overflow-hidden rounded-2xl p-6 shadow-xl transition-all duration-300 ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/30 backdrop-blur-md border border-white/20'}`}>
                <div className="relative z-10">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{card.studentName}</h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Adm: {card.admissionNumber || '—'}</p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                      card.overallGrade === 'A' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                      card.overallGrade === 'B' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                      card.overallGrade === 'C' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                      card.overallGrade === 'D' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}>{card.overallGrade}</div>
                  </div>
                  <div className="mt-4 space-y-1">
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Total Score: <span className="font-bold">{card.totalScore}</span></p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Average: <span className="font-bold">{card.average.toFixed(2)}%</span></p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Subjects: {card.subjects.length}</p>
                  </div>
                  <div className="mt-4 flex space-x-3">
                    <button onClick={() => openModal(card)} className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm transition-colors ${theme === 'dark' ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>
                      <EyeIcon className="h-4 w-4 mr-1" /> View Card
                    </button>
                    <button onClick={() => downloadSingleCard(card)} disabled={downloadingSingle === card.studentId}
                      className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50 ${theme === 'dark' ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                      {downloadingSingle === card.studentId ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" /> : <DocumentArrowDownIcon className="h-4 w-4 mr-1" />}
                      {downloadingSingle === card.studentId ? '...' : 'Download'}
                    </button>
                  </div>
                </div>
                <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl transition-all group-hover:scale-110 ${theme === 'dark' ? 'bg-blue-500/20 group-hover:bg-blue-500/30' : 'bg-blue-200/30 group-hover:bg-blue-300/40'}`} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && selectedCard && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto">
              <div className={`w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Result Card - {selectedCard.studentName}</h3>
                  <div className="flex gap-2">
                    <button onClick={printModal} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} title="Print"><PrinterIcon className="h-5 w-5" /></button>
                    <button onClick={() => setShowModal(false)} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}><XMarkIcon className="h-5 w-5" /></button>
                  </div>
                </div>
                <div className="p-6 max-h-[80vh] overflow-y-auto" id="result-card-print">
                  <div className="text-center mb-6">
                    <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{selectedCard.studentName}</h2>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Admission No: {selectedCard.admissionNumber || '—'} | Session: {academicYears.find(y => y.id === selectedAcademicYearId)?.name || ''} | Term: {selectedTerm}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                        <tr><th className={`text-left py-2 px-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Subject</th><th className={`text-center py-2 px-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>CA</th><th className={`text-center py-2 px-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Exam</th><th className={`text-center py-2 px-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Total</th><th className={`text-center py-2 px-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Grade</th></tr>
                      </thead>
                      <tbody>
                        {selectedCard.subjects.map(sub => (
                          <tr key={sub.subjectId} className="border-b border-gray-100 dark:border-gray-800">
                            <td className={`py-2 px-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{sub.subjectName}</td>
                            <td className={`text-center py-2 px-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{sub.ca}</td>
                            <td className={`text-center py-2 px-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{sub.exam}</td>
                            <td className={`text-center py-2 px-2 font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{sub.total}</td>
                            <td className={`text-center py-2 px-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{sub.grade}</td>
                          </tr>
                        ))}
                        <tr className={`font-bold ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                          <td className={`py-2 px-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>TOTAL / AVERAGE</td>
                          <td className="text-center py-2 px-2"></td><td className="text-center py-2 px-2"></td>
                          <td className={`text-center py-2 px-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{selectedCard.totalScore}</td>
                          <td className={`text-center py-2 px-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{selectedCard.average.toFixed(2)}% ({selectedCard.overallGrade})</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                  <button onClick={() => setShowModal(false)} className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'}`}>Close</button>
                  <button onClick={() => { downloadSingleCard(selectedCard); setShowModal(false); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Download Excel</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}