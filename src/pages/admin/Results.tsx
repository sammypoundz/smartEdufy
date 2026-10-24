import { useState, useEffect, useCallback, useMemo } from 'react';
// import { motion } from 'framer-motion';  // ❌ removed – not used
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAcademicSession } from '../../contexts/AcademicSessionContext';
import { api } from '../../utils/api';
import { saveResultsOffline } from '../../offline/offlineWrites';
import { fetchGradingData, resolveClassScales, computeGradeWithScales } from '../../utils/grading';
import type { GradingScale, GradingScaleGroup } from '../../utils/grading';
import { formatArm } from '../../utils/arm';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import UploadProgress from '../../components/UploadProgress';
import { useEdufy } from '../../edufy/EdufyContext';
import {
  DocumentArrowDownIcon,
  PrinterIcon,
  CloudArrowUpIcon,
  DocumentChartBarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

// Types (unchanged)
interface Class { id: string; name: string; gradingScaleGroup?: { id: string; name: string } | null; }
interface Arm { id: string; letter: string; }
interface Subject { id: string; name: string; }
interface Student { id: string; name: string; admissionNumber?: string; }

interface StudentResult {
  studentId: string;
  studentName: string;
  ca1: number | null;
  ca2: number | null;
  ca3: number | null;
  ca: number | null;   // total CA = ca1 + ca2 + ca3
  exam: number | null;
  total: number | null;
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
  ca1?: number;
  ca2?: number;
  ca3?: number;
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
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const [compiledData, setCompiledData] = useState<CompiledStudentResult[]>([]);
  const [loadingCompiled, setLoadingCompiled] = useState(false);
  const [showCompiled, setShowCompiled] = useState(false);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  // AI scanning happens in the Edufy agent panel (floating modal). When a
  // completed scan is pushed from the panel, it lands here to be consumed.
  const { pendingScan, consumePendingScan } = useEdufy();

  // Consume a scan pushed from the agent: pre-select class/arm/subject/term/
  // year from the scan context, then fill the score fields once the table
  // loads. Runs after mount so the fetch effects react to the selections.
  useEffect(() => {
    if (!pendingScan) return;
    const ctx = pendingScan.context;
    if (ctx?.classId) setSelectedClassId(ctx.classId);
    if (ctx?.armId) setSelectedArmId(ctx.armId);
    if (ctx?.subjectId) setSelectedSubjectId(ctx.subjectId);
    if (ctx?.term) setSelectedTerm(ctx.term);
    if (ctx?.academicYearId) setSelectedAcademicYearId(ctx.academicYearId);
  }, [pendingScan]);

  // Fill score fields once the results table for the pushed scan is loaded.
  const [filledFromScan, setFilledFromScan] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingScan || results.length === 0) return;
    if (filledFromScan) return; // already filled for this scan
    fillScoresFromScan(pendingScan.rows);
    setFilledFromScan(pendingScan.rows.map(r => r.name).join('|'));
    consumePendingScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingScan, results]);

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

  // School info (logo + name) for the printable entry sheet letterhead
  const [schoolInfo, setSchoolInfo] = useState<{ name: string; logoUrl: string | null }>({ name: '', logoUrl: null });
  useEffect(() => {
    let cancelled = false;
    api.get('/settings/general')
      .then(res => (res.ok ? res.json() : {}))
      .then((data) => {
        if (cancelled) return;
        setSchoolInfo({ name: (data as any).schoolName || '', logoUrl: (data as any).logoUrl || null });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // ---------- Data fetching ----------
  const fetchClasses = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/classes', token);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      // Keep gradingScaleGroup so grades use the scale assigned to the class in Academic Setup
      setClasses(data.map((c: any) => ({ id: String(c.id), name: c.name, gradingScaleGroup: c.gradingScaleGroup ?? null })));
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
      const resultMap = new Map(existing.map(r => [r.studentId, { ca1: r.ca1, ca2: r.ca2, ca3: r.ca3, ca: r.ca, exam: r.exam, total: r.total, grade: r.grade }]));
      const combined = students.map(s => {
        const ex = resultMap.get(s.id);
        return {
          studentId: s.id,
          studentName: s.name,
          ca1: ex?.ca1 !== undefined ? ex.ca1 : null,
          ca2: ex?.ca2 !== undefined ? ex.ca2 : null,
          ca3: ex?.ca3 !== undefined ? ex.ca3 : null,
          ca: ex?.ca !== undefined ? ex.ca : null,
          exam: ex?.exam !== undefined ? ex.exam : null,
          total: ex?.total !== undefined ? ex.total : null,
          grade: ex?.grade || '',
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
    try {
      const res = await api.get(`/results/history?armId=${selectedArmId}`, token);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error('Failed to fetch history', err);
      setHistory([]);
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

  // Scales for the selected class: its assigned grading scale group if it has
  // one, otherwise the school-wide (ungrouped) scales.
  const effectiveGradingScales = useMemo(() => {
    const selectedClass = classes.find(c => c.id === selectedClassId);
    return resolveClassScales(selectedClass, schoolScales, gradingGroups);
  }, [classes, selectedClassId, schoolScales, gradingGroups]);

  const computeGrade = useCallback(
    (score: number) => computeGradeWithScales(effectiveGradingScales, score),
    [effectiveGradingScales]
  );

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
            subjectsData.push({ subjectName: sub.subjectName, total: score, grade: computeGrade(score) });
          } else {
            subjectsData.push({ subjectName: sub.subjectName, total: 0, grade: '—' });
          }
        }
        const average = subjectsWithScores > 0 ? totalScore / subjectsWithScores : 0;
        const overallGrade = computeGrade(average);
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
      ca1: r.ca1 ?? 0,
      ca2: r.ca2 ?? 0,
      ca3: r.ca3 ?? 0,
      ca: (r.ca1 ?? 0) + (r.ca2 ?? 0) + (r.ca3 ?? 0),
      exam: r.exam ?? 0,
      total: (r.ca1 ?? 0) + (r.ca2 ?? 0) + (r.ca3 ?? 0) + (r.exam ?? 0),
      grade: r.grade,
    }));
    setSaving(true);
    try {
      // Offline-aware: posts to /results/bulk when the server is reachable,
      // queues the batch in the IndexedDB outbox otherwise.
      const result = await saveResultsOffline(payload);
      if (result.mode === 'queued') {
        toast.success('No internet — scores saved on device and will sync automatically');
      } else {
        toast.success('Results saved successfully');
      }
      fetchHistory(); // refresh history
    } catch (err: any) {
      toast.error(err.message || 'Failed to save results');
    } finally { setSaving(false); }
  };

  // ---------- Download printable result entry sheet (PDF via print dialog) ----------
  const downloadEntrySheetPdf = () => {
    if (!selectedArmId || !selectedSubjectId || students.length === 0) {
      toast.error('Select a class, arm, and subject first');
      return;
    }
    const cls = classes.find(c => c.id === selectedClassId);
    const arm = arms.find(a => a.id === selectedArmId);
    const subject = subjects.find(s => s.id === selectedSubjectId);
    const yearName = academicYears.find(y => y.id === selectedAcademicYearId)?.name || '';
    const rows = students.map((s, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${s.admissionNumber || '—'}</td>
        <td style="text-align:left">${s.name}</td>
        <td></td><td></td><td></td><td></td><td></td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Result Entry Sheet - ${cls?.name || ''} ${subject?.name || ''}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; padding: 24px; }
    .letterhead { display: flex; align-items: center; gap: 16px; border-bottom: 3px double #333; padding-bottom: 12px; }
    .letterhead img { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; }
    .letterhead .school-name { font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
    .meta { display: flex; justify-content: center; gap: 32px; margin: 14px 0 6px; font-size: 13px; font-weight: 600; flex-wrap: wrap; }
    .meta span b { color: #444; font-weight: 400; margin-right: 4px; }
    h2 { text-align: center; font-size: 15px; margin: 8px 0 14px; letter-spacing: 1px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #444; padding: 7px 8px; text-align: center; }
    thead th { background: #f0f0f0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    td.name { text-align: left; }
    .sign { margin-top: 28px; display: flex; justify-content: space-between; font-size: 12px; }
    .sign div { width: 30%; border-top: 1px solid #333; padding-top: 4px; text-align: center; }
    @media print { body { padding: 8px; } @page { size: A4 landscape; margin: 10mm; } }
  </style>
</head>
<body>
  <div class="letterhead">
    ${schoolInfo.logoUrl ? `<img src="${schoolInfo.logoUrl}" alt="logo" />` : ''}
    <div class="school-name">${schoolInfo.name || 'School'}</div>
  </div>
  <div class="meta">
    <span><b>Class:</b> ${cls?.name || ''} ${arm ? formatArm(arm) : ''}</span>
    <span><b>Subject:</b> ${subject?.name || ''}</span>
    <span><b>Session:</b> ${yearName}</span>
    <span><b>Term:</b> ${selectedTerm}</span>
  </div>
  <h2>RESULT ENTRY SHEET</h2>
  <table>
    <thead>
      <tr>
        <th>S/N</th>
        <th>Adm. No</th>
        <th style="text-align:left">Student Name</th>
        <th>1CA (10)</th>
        <th>2CA (10)</th>
        <th>3CA (10)</th>
        <th>Exam (70)</th>
        <th>Total (100)</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="sign">
    <div>Subject Teacher's Signature</div>
    <div>Date</div>
    <div>Principal's Signature & Stamp</div>
  </div>
</body>
</html>`;

    // Print via a hidden iframe — opens the print dialog (which shows a PDF
    // preview / 'Save as PDF') but leaves no popup window behind.
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const cleanup = () => {
      setTimeout(() => iframe.remove(), 500);
    };

    const doc = iframe.contentDocument;
    if (!doc) {
      iframe.remove();
      toast.error('Could not generate the entry sheet');
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();

    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        cleanup();
      }
    };
  };

  const downloadTemplate = () => {
    const template = students.map(s => ({
      'Student Name': s.name,
      'Student ID': s.id,
      '1CA (max 10)': '',
      '2CA (max 10)': '',
      '3CA (max 10)': '',
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
    setUploadProgress(0);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet) as any[];
      const updatedResults = [...results];
      let processed = 0;
      for (const row of rows) {
        const studentId = row['Student ID'] || row['studentId'];
        const ca1 = Number(row['1CA (max 10)'] ?? row['CA (max 30)'] ?? row['ca1'] ?? 0) || 0;
        const ca2 = Number(row['2CA (max 10)'] ?? row['ca2'] ?? 0) || 0;
        const ca3 = Number(row['3CA (max 10)'] ?? row['ca3'] ?? 0) || 0;
        const exam = Number(row['Exam (max 70)'] ?? row['exam'] ?? 0) || 0;
        if (studentId) {
          const index = updatedResults.findIndex(r => r.studentId === studentId);
          if (index !== -1) {
            const ca = ca1 + ca2 + ca3;
            const total = ca + exam;
            updatedResults[index] = { ...updatedResults[index], ca1, ca2, ca3, ca, exam, total, grade: computeGrade(total) };
          }
        }
        processed++;
        setUploadProgress(Math.round((processed / rows.length) * 100));
        // Yield to the event loop so the progress bar can paint between rows
        await new Promise((r) => setTimeout(r, 0));
      }
      setResults(updatedResults);
      setUploadProgress(100);
      toast.success('Upload successful');
    } catch { toast.error('Failed to parse Excel file'); }
    finally { setUploading(false); setUploadProgress(null); }
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

  // ---------- AI Result Scanner: apply extracted rows to the score table ----------
  const fillScoresFromScan = (rows: { name: string; ca1: number | null; ca2: number | null; ca3: number | null; exam: number | null }[]) => {
    setResults(prev => prev.map(r => {
      const match = rows.find(x => x.name.toLowerCase().trim() === r.studentName.toLowerCase().trim());
      if (!match) return r;
      const ca1 = match.ca1 ?? r.ca1;
      const ca2 = match.ca2 ?? r.ca2;
      const ca3 = match.ca3 ?? r.ca3;
      const exam = match.exam ?? r.exam;
      const ca = (ca1 ?? 0) + (ca2 ?? 0) + (ca3 ?? 0);
      const total = ca + (exam ?? 0);
      return { ...r, ca1, ca2, ca3, ca, exam, total, grade: computeGrade(total) };
    }));
    const applied = rows.filter(x =>
      results.some(r => r.studentName.toLowerCase().trim() === x.name.toLowerCase().trim()),
    ).length;
    if (applied > 0) {
      toast.success(`AI filled scores for ${applied} student(s). Review and save.`);
    } else {
      toast.error('No matching students found in the score table');
    }
  };

  // Score change with 3 CAs: total = 1CA + 2CA + 3CA + Exam
  type ScoreField = 'ca1' | 'ca2' | 'ca3' | 'exam';
  const handleScoreChange = (studentId: string, field: ScoreField, value: number | null) => {
    setResults(prev => prev.map(r => {
      if (r.studentId === studentId) {
        // If value is null or undefined, set to null
        if (value === null || value === undefined || isNaN(value)) {
          const cleared = { ...r, [field]: null };
          const ca = (cleared.ca1 ?? 0) + (cleared.ca2 ?? 0) + (cleared.ca3 ?? 0);
          return { ...cleared, ca, total: ca + (cleared.exam ?? 0), grade: '' };
        }
        const updated = { ...r, [field]: value };
        const ca1 = updated.ca1 ?? 0;
        const ca2 = updated.ca2 ?? 0;
        const ca3 = updated.ca3 ?? 0;
        const exam = updated.exam ?? 0;
        const ca = ca1 + ca2 + ca3;
        const total = ca + exam;
        return { ...updated, ca, total, grade: computeGrade(total) };
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
        {uploadProgress !== null && (
          <UploadProgress progress={uploadProgress} label="Processing results upload…" className="mb-4" />
        )}
        <div className="sm:flex sm:items-center sm:justify-between mb-6 sm:mb-8">
          <h2 className={`text-xl sm:text-2xl font-bold ${theme === 'dark' ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent' : 'bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent'}`}>Result Compiler</h2>
          {/* Action buttons: 2-up grid on phones, inline row on larger screens. */}
          <div className="mt-4 sm:mt-0 grid grid-cols-2 gap-2 sm:flex sm:gap-3">
            <button onClick={downloadTemplate} disabled={students.length===0} className="inline-flex items-center justify-center px-3 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs sm:text-sm shadow-lg disabled:opacity-50"><DocumentArrowDownIcon className="h-4 w-4 mr-1.5"/>Template</button>
            <button onClick={downloadEntrySheetPdf} disabled={students.length===0} className="inline-flex items-center justify-center px-3 py-2.5 rounded-lg bg-gradient-to-r from-rose-500 to-red-600 text-white text-xs sm:text-sm shadow-lg disabled:opacity-50"><PrinterIcon className="h-4 w-4 mr-1.5"/>Entry Sheet</button>
            <button onClick={triggerFileUpload} disabled={students.length===0||uploading} className="inline-flex items-center justify-center px-3 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs sm:text-sm shadow-lg disabled:opacity-50"><CloudArrowUpIcon className="h-4 w-4 mr-1.5"/>{uploading?'Uploading...':'Bulk Upload'}</button>
            <button onClick={compileResults} disabled={!selectedArmId || !selectedTerm || !selectedAcademicYearId || loadingCompiled} className="inline-flex items-center justify-center px-3 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs sm:text-sm shadow-lg hover:shadow-xl disabled:opacity-50"><DocumentChartBarIcon className="h-4 w-4 mr-1.5"/>{loadingCompiled?'Compiling...':'Compile Results'}</button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-6 mb-6 sm:mb-8">
          {/* Class spans both columns on phones so long class names fit */}
          <div className="col-span-2 sm:col-span-1">
            <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Class</label>
            <select value={selectedClassId} onChange={e=>setSelectedClassId(e.target.value)} className={`mt-1 w-full rounded-xl border-0 px-4 py-3 text-sm shadow-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 text-white border border-white/10' : 'bg-white/40 text-gray-900 border border-white/20'}`}>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Arm</label>
            <select value={selectedArmId} onChange={e=>setSelectedArmId(e.target.value)} disabled={!selectedClassId} className={`mt-1 w-full rounded-xl border-0 px-4 py-3 text-sm shadow-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${theme === 'dark' ? 'bg-gray-800 text-white border border-white/10 disabled:bg-gray-700' : 'bg-white/40 text-gray-900 border border-white/20 disabled:bg-gray-100'}`}>
              <option value="">Select arm</option>
              {arms.map(a => <option key={a.id} value={a.id}>{formatArm(a)}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Subject</label>
            <select value={selectedSubjectId} onChange={e=>setSelectedSubjectId(e.target.value)} disabled={!selectedArmId} className={`mt-1 w-full rounded-xl border-0 px-4 py-3 text-sm shadow-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${theme === 'dark' ? 'bg-gray-800 text-white border border-white/10 disabled:bg-gray-700' : 'bg-white/40 text-gray-900 border border-white/20 disabled:bg-gray-100'}`}>
              <option value="">Select subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="col-span-2 sm:col-span-1">
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
        <div className="flex flex-wrap gap-2 mb-6 sm:space-x-4 border-b border-gray-200 dark:border-gray-700">
          <button onClick={()=>setShowCompiled(false)} className={`py-2 px-3 sm:px-4 text-xs sm:text-sm font-medium whitespace-nowrap ${!showCompiled ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>Subject Scores Entry</button>
          <button onClick={()=>setShowCompiled(true)} className={`py-2 px-3 sm:px-4 text-xs sm:text-sm font-medium whitespace-nowrap ${showCompiled ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>Compiled Results</button>
        </div>

        {!showCompiled ? (
          <div className="rounded-2xl shadow-xl bg-white/30 backdrop-blur-md border border-white/20 dark:bg-white/5 dark:border-white/10">
            {/* ===== Mobile: card-per-student score entry ===== */}
            <div className="md:hidden">
              {loading ? (
                <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Loading...</div>
              ) : results.length === 0 ? (
                <div className={`text-center py-8 px-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No results found for this subject, term, and academic year. Enter scores below and save.</div>
              ) : (
                <div className="divide-y divide-gray-200/50 dark:divide-white/10">
                  {results.map(r => (
                    <div key={r.studentId} className="p-4">
                      <p className={`font-semibold text-sm mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{r.studentName}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(['ca1', 'ca2', 'ca3'] as const).map(field => (
                          <div key={field}>
                            <label className={`block text-[10px] font-medium uppercase tracking-wide mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{field === 'ca1' ? '1CA' : field === 'ca2' ? '2CA' : '3CA'}</label>
                            <input
                              type="number"
                              inputMode="numeric"
                              min="0"
                              max="10"
                              value={r[field] ?? ''}
                              onChange={e => {
                                const val = e.target.value === '' ? null : Number(e.target.value);
                                handleScoreChange(r.studentId, field, val);
                              }}
                              className={`w-full rounded-lg border-0 px-2 py-2.5 text-sm shadow focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 text-white border border-white/10' : 'bg-white text-gray-900 border border-gray-200'}`}
                              placeholder="-"
                            />
                          </div>
                        ))}
                        <div className="col-span-2">
                          <label className={`block text-[10px] font-medium uppercase tracking-wide mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Exam</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            max="70"
                            value={r.exam ?? ''}
                            onChange={e => {
                              const val = e.target.value === '' ? null : Number(e.target.value);
                              handleScoreChange(r.studentId, 'exam', val);
                            }}
                            className={`w-full rounded-lg border-0 px-2 py-2.5 text-sm shadow focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 text-white border border-white/10' : 'bg-white text-gray-900 border border-gray-200'}`}
                            placeholder="-"
                          />
                        </div>
                        <div className="flex flex-col justify-end">
                          <span className={`text-[10px] font-medium uppercase tracking-wide mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Total</span>
                          <span className={`rounded-lg px-2 py-2.5 text-sm font-bold text-center ${theme === 'dark' ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-900'}`}>{r.total ?? '—'} {r.grade && <span className={`text-[10px] font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>({r.grade})</span>}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="p-4">
                <button onClick={saveResults} disabled={saving} className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium shadow-lg disabled:opacity-50">{saving?'Saving...':'Save Results'}</button>
              </div>
            </div>

            {/* ===== Desktop: table score entry ===== */}
            <div className="hidden md:block">
              <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200/50 dark:border-white/10">
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Student</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>1CA</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>2CA</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>3CA</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>CA Total</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Exam</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Grade</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/10' : 'divide-gray-200/50'}`}>
                {loading ? (
                  <tr><td colSpan={8} className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Loading...</td></tr>
                ) : results.length === 0 ? (
                  <tr><td colSpan={8} className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No results found for this subject, term, and academic year. Enter scores above and save.</td></tr>
                ) : (
                  results.map(r => (
                    <tr key={r.studentId} className={theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-50'}>
                      <td className={`px-6 py-4 text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{r.studentName}</td>
                      {(['ca1', 'ca2', 'ca3'] as const).map(field => (
                        <td key={field} className="px-6 py-4 text-sm">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={r[field] ?? ''}
                            onChange={e => {
                              const val = e.target.value === '' ? null : Number(e.target.value);
                              handleScoreChange(r.studentId, field, val);
                            }}
                            className={`w-20 rounded-xl border-0 px-3 py-2 text-sm shadow-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 text-white border border-white/10' : 'bg-white/40 text-gray-900 border border-white/20'}`}
                            placeholder="-"
                          />
                        </td>
                      ))}
                      <td className={`px-6 py-4 text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{(r.ca1 ?? 0) + (r.ca2 ?? 0) + (r.ca3 ?? 0)}</td>
                      <td className="px-6 py-4 text-sm">
                        <input
                          type="number"
                          min="0"
                          max="70"
                          value={r.exam ?? ''}
                          onChange={e => {
                            const val = e.target.value === '' ? null : Number(e.target.value);
                            handleScoreChange(r.studentId, 'exam', val);
                          }}
                          className={`w-20 rounded-xl border-0 px-3 py-2 text-sm shadow-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 text-white border border-white/10' : 'bg-white/40 text-gray-900 border border-white/20'}`}
                          placeholder="-"
                        />
                      </td>
                      <td className={`px-6 py-4 text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{r.total ?? '-'}</td>
                      <td className={`px-6 py-4 text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{r.grade || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
              </div>
            <div className="flex justify-end p-6">
              <button onClick={saveResults} disabled={saving} className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg disabled:opacity-50">{saving?'Saving...':'Save Results'}</button>
            </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl shadow-xl bg-white/30 backdrop-blur-md border border-white/20 dark:bg-white/5 dark:border-white/10">
            {loadingCompiled ? (
              <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Compiling results, please wait...</div>
            ) : compiledData.length === 0 ? (
              <div className={`text-center py-12 px-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No compiled data yet. Select academic year & term and click "Compile Results".</div>
            ) : (
              <>
                <div className="overflow-x-auto">
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
                </div>
                <div className="flex justify-end p-4 sm:p-6">
                  <button onClick={exportCompiled} className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg">Export Compiled Results (Excel)</button>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}