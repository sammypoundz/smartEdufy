import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { api } from '../../utils/api';
import { formatArm } from '../../utils/arm';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  CheckCircleIcon,
  AcademicCapIcon,
  UserIcon,
  IdentificationIcon,
  DocumentTextIcon,
  PlayIcon,
  ArrowPathIcon,
  XCircleIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';

// Types
interface Class {
  id: string;
  name: string;
  arms: Arm[];
}
interface Arm {
  id: string;
  letter: string;
}
interface Test {
  id: string;
  name: string;
  duration: number;
  subjects: Subject[];
}
interface Subject {
  id: string;
  name: string;
  questions: Question[];
}
interface Question {
  id: string;
  text: string;
  options: string[];
  marks: number;
  attachmentType?: 'image' | 'video' | 'audio' | null;
  attachmentUrl?: string | null;
}
interface Answer {
  subjectId: string;
  questionId: string;
  selectedOption: number;
}
interface StudentInfo {
  id: string;
  name: string;
  admissionNumber: string;
  className: string;
  armLetter: string;
}
interface SavedProgress {
  testId: string;
  testName: string;
  testDuration: number;
  subjects: Subject[];
  studentInfo: StudentInfo;
  currentSubjectIndex: number;
  currentQuestionIndex: number;
  answers: Answer[];
  startedAt: number;
  token: string;
}

export default function TestPortal() {
  const { theme } = useTheme();

  // Auth state
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedArmId, setSelectedArmId] = useState('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [availableTests, setAvailableTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'auth' | 'select-test' | 'taking' | 'result'>('auth');
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Test taking state
  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; percentage: number } | null>(null);

  // ---------- Persistence helpers ----------
  const saveProgress = () => {
    if (step !== 'taking' || !selectedTest || !studentInfo || !token) return;
    const progress: SavedProgress = {
      testId: selectedTest.id,
      testName: selectedTest.name,
      testDuration: selectedTest.duration,
      subjects: selectedTest.subjects,
      studentInfo,
      currentSubjectIndex,
      currentQuestionIndex,
      answers,
      startedAt: Date.now() - (selectedTest.duration * 60 - timeLeft) * 1000,
      token,
    };
    localStorage.setItem('cbt_progress', JSON.stringify(progress));
  };

  const clearSavedProgress = () => {
    localStorage.removeItem('cbt_progress');
  };

  const restoreProgress = (): SavedProgress | null => {
    const raw = localStorage.getItem('cbt_progress');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SavedProgress;
    } catch {
      return null;
    }
  };

  const resumeTest = (progress: SavedProgress) => {
    setSelectedTest({
      id: progress.testId,
      name: progress.testName,
      duration: progress.testDuration,
      subjects: progress.subjects,
    });
    setStudentInfo(progress.studentInfo);
    setToken(progress.token);
    api.setToken(progress.token);
    setCurrentSubjectIndex(progress.currentSubjectIndex);
    setCurrentQuestionIndex(progress.currentQuestionIndex);
    setAnswers(progress.answers);
    const elapsed = (Date.now() - progress.startedAt) / 1000;
    const remaining = Math.max(0, progress.testDuration * 60 - elapsed);
    setTimeLeft(Math.floor(remaining));
    setStep('taking');
  };

  // ---------- Fetch classes (public) ----------
  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      if (!res.ok) throw new Error('Failed to load classes');
      const data = await res.json();
      setClasses(data);
    } catch (err) {
      console.error(err);
      toast.error('Could not load classes');
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const getArmsForClass = (classId: string) => {
    const cls = classes.find(c => c.id === classId);
    return cls?.arms || [];
  };

  // Student login using JWT endpoint
  const handleAuthenticate = async () => {
    if (!admissionNumber.trim()) {
      toast.error('Please enter admission number');
      return;
    }
    if (!selectedArmId) {
      toast.error('Please select class and arm');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/student-login', {
        admissionNumber,
        armId: selectedArmId,
      });

      if (!res.ok) {
        if (res.status === 403) {
          const errorData = await res.json();
          toast.error(errorData.error || 'Account suspended. Contact admin.');
        } else {
          const errText = await res.text();
          throw new Error(errText || 'Authentication failed');
        }
        return;
      }

      const data = await res.json();
      const newToken = data.token;
      setToken(newToken);
      api.setToken(newToken);
      localStorage.setItem('studentToken', newToken);

      const student = data.student;
      setStudentInfo({
        id: student.id,
        name: student.name,
        admissionNumber: student.admissionNumber,
        className: student.className || 'Unknown',
        armLetter: student.armLetter || '?',
      });

      // Check for unfinished test
      const saved = restoreProgress();
      if (saved && saved.studentInfo.admissionNumber === student.admissionNumber) {
        const result = await Swal.fire({
          title: 'Unfinished Test',
          text: 'You have an unfinished test. Do you want to resume it?',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Yes, resume',
          cancelButtonText: 'No, start fresh',
          background: theme === 'dark' ? '#1f2937' : '#fff',
          color: theme === 'dark' ? '#fff' : '#000',
        });
        if (result.isConfirmed) {
          resumeTest(saved);
          setLoading(false);
          return;
        } else {
          clearSavedProgress();
        }
      }

      await fetchTests(newToken);
      setStep('select-test');
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch published tests for the arm (authenticated)
  const fetchTests = async (authToken: string) => {
    try {
      const res = await api.get(`/tests?armId=${selectedArmId}&status=PUBLISHED`, authToken);
      if (!res.ok) throw new Error('Failed to load tests');
      const testsData = await res.json();

      const testsWithSubjects = await Promise.all(
        testsData.map(async (test: any) => {
          const qRes = await api.get(`/questions/test/${test.id}`, authToken);
          if (!qRes.ok) return { ...test, subjects: [] };
          const questionsData = await qRes.json();

          const subjectMap = new Map<string, { id: string; name: string; questions: Question[] }>();
          for (const q of questionsData) {
            const subjectId = q.subjectId || 'no-subject';
            if (!subjectMap.has(subjectId)) {
              const subjName = q.subject?.name || 'General';
              subjectMap.set(subjectId, { id: subjectId, name: subjName, questions: [] });
            }
            subjectMap.get(subjectId)!.questions.push({
              id: q.id,
              text: q.text,
              options: q.options,
              marks: q.marks,
              attachmentType: q.attachmentType,
              attachmentUrl: q.attachmentUrl,
            });
          }
          const subjects = Array.from(subjectMap.values());
          return { ...test, subjects };
        })
      );
      setAvailableTests(testsWithSubjects);
      if (testsWithSubjects.length === 0) {
        toast.error('No published tests available for this arm');
        setStep('auth');
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not load tests');
      setStep('auth');
    }
  };

  const startTest = (test: Test) => {
    setSelectedTest(test);
    setCurrentSubjectIndex(0);
    setCurrentQuestionIndex(0);
    const initialAnswers: Answer[] = [];
    test.subjects.forEach(subject => {
      subject.questions.forEach(question => {
        initialAnswers.push({
          subjectId: subject.id,
          questionId: question.id,
          selectedOption: -1,
        });
      });
    });
    setAnswers(initialAnswers);
    setTimeLeft(test.duration * 60);
    setStep('taking');
    clearSavedProgress();
  };

  // Save progress whenever the test state changes (while taking)
  useEffect(() => {
    if (step === 'taking' && selectedTest && studentInfo && token) {
      saveProgress();
    }
  }, [step, selectedTest, studentInfo, token, currentSubjectIndex, currentQuestionIndex, answers, timeLeft]);

  // Timer effect – automatically submit when time runs out
  useEffect(() => {
    if (step !== 'taking' || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitTest(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const handleAnswerSelect = (subjectId: string, questionId: string, optionIndex: number) => {
    setAnswers(prev =>
      prev.map(ans =>
        ans.subjectId === subjectId && ans.questionId === questionId
          ? { ...ans, selectedOption: optionIndex }
          : ans
      )
    );
  };

  const handleSubmitTest = async (autoSubmit = false) => {
    if (!autoSubmit && answers.some(ans => ans.selectedOption === -1)) {
      const result = await Swal.fire({
        title: 'Unanswered Questions',
        text: 'You have unanswered questions. Submit anyway?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, submit',
        cancelButtonText: 'No, go back',
        background: theme === 'dark' ? '#1f2937' : '#fff',
        color: theme === 'dark' ? '#fff' : '#000',
      });
      if (!result.isConfirmed) return;
    }

    setSubmitting(true);
    try {
      const payload = {
        testId: selectedTest!.id,
        studentId: studentInfo!.id,
        answers: answers.map(ans => ({
          questionId: ans.questionId,
          selectedOption: ans.selectedOption,
        })),
        startedAt: new Date(Date.now() - (selectedTest!.duration * 60 - timeLeft) * 1000).toISOString(),
        submittedAt: new Date().toISOString(),
      };
      const res = await api.post('/test-attempts/submit', payload, token!);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult({
        score: data.score,
        total: data.total,
        percentage: data.percentage,
      });
      clearSavedProgress();
      setStep('result');
    } catch (err: any) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentSubject = () => selectedTest?.subjects[currentSubjectIndex];
  const getCurrentQuestion = () => getCurrentSubject()?.questions[currentQuestionIndex];
  const getCurrentAnswer = () => {
    const subject = getCurrentSubject();
    const question = getCurrentQuestion();
    if (!subject || !question) return -1;
    const ans = answers.find(a => a.subjectId === subject.id && a.questionId === question.id);
    return ans?.selectedOption ?? -1;
  };

  const isQuestionAnswered = (subjectId: string, questionId: string) => {
    const ans = answers.find(a => a.subjectId === subjectId && a.questionId === questionId);
    return ans?.selectedOption !== -1;
  };

  const getSubjectProgress = (subject: Subject) => {
    const answered = subject.questions.filter(q => isQuestionAnswered(subject.id, q.id)).length;
    return { answered, total: subject.questions.length };
  };

  // Helper to get absolute attachment URL (returns undefined if no valid URL)
  const getAttachmentUrl = (url: string | null | undefined): string | undefined => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    return `${import.meta.env.VITE_API_URL}${url}`;
  };

  const QuestionNumbers = () => {
    const subject = getCurrentSubject();
    if (!subject) return null;
    return (
      <div className="flex flex-wrap gap-2 mt-4">
        {subject.questions.map((_, idx) => {
          const answered = isQuestionAnswered(subject.id, subject.questions[idx].id);
          const isCurrent = currentQuestionIndex === idx;
          let bgColor = '';
          if (isCurrent) {
            bgColor = theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white';
          } else if (answered) {
            bgColor = theme === 'dark' ? 'bg-green-600 text-white' : 'bg-green-500 text-white';
          } else {
            bgColor = theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-300 text-gray-700';
          }
          return (
            <button
              key={idx}
              onClick={() => setCurrentQuestionIndex(idx)}
              className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${bgColor} hover:opacity-80`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
    );
  };

  const SubjectSidebar = () => (
    <div className={`rounded-2xl p-4 shadow-lg ${theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-white/40 border border-white/20'}`}>
      <h3 className={`text-lg font-bold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
        <BookOpenIcon className="h-5 w-5" /> Subjects
      </h3>
      <div className="space-y-3">
        {selectedTest?.subjects.map((subject, idx) => {
          const { answered, total } = getSubjectProgress(subject);
          const isActive = currentSubjectIndex === idx;
          return (
            <button
              key={subject.id}
              onClick={() => {
                setCurrentSubjectIndex(idx);
                setCurrentQuestionIndex(0);
              }}
              className={`w-full text-left p-3 rounded-xl transition-all ${
                isActive
                  ? theme === 'dark'
                    ? 'bg-blue-500/30 border border-blue-500'
                    : 'bg-blue-100 border border-blue-500'
                  : theme === 'dark'
                  ? 'bg-white/5 hover:bg-white/10'
                  : 'bg-white/60 hover:bg-white/80'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{subject.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${answered === total ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                  {answered}/{total}
                </span>
              </div>
              <div className="w-full bg-gray-600 rounded-full h-1.5 mt-2">
                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${(answered / total) * 100}%` }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  // Loading state for auth step
  if (loading && step === 'auth') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md p-8 rounded-2xl bg-white/10 backdrop-blur-sm animate-pulse">
          <div className="h-8 w-3/4 bg-gray-300 dark:bg-gray-700 rounded mx-auto mb-6" />
          <div className="space-y-4">
            <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded" />
            <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded" />
            <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded" />
            <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'}`}>
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg mb-4"
          >
            <AcademicCapIcon className="h-8 w-8 text-white" />
          </motion.div>
          <h1 className={`text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent ${theme === 'dark' ? 'from-blue-400 to-indigo-300' : ''}`}>
            SmartEdufy
          </h1>
          <p className={`mt-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Computer-Based Testing Platform</p>
        </div>

        {/* Authentication Step */}
        {step === 'auth' && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`max-w-lg mx-auto rounded-2xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/70 backdrop-blur-md border border-white/30'}`}
          >
            <div className="p-8">
              <div className="flex items-center justify-center mb-6">
                <IdentificationIcon className={`h-12 w-12 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
              </div>
              <h2 className={`text-2xl font-bold text-center mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Enter Your Details</h2>
              <p className={`text-center text-sm mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Please provide your admission number and class</p>
              <div className="space-y-5">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Admission Number</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={admissionNumber}
                      onChange={(e) => setAdmissionNumber(e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 transition-all ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700 text-white focus:ring-blue-500' : 'bg-white/50 border-gray-200 text-gray-900 focus:ring-blue-400'}`}
                      placeholder="e.g., ADM2024001"
                    />
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Class</label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => { setSelectedClassId(e.target.value); setSelectedArmId(''); }}
                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700 text-white focus:ring-blue-500' : 'bg-white/50 border-gray-200 text-gray-900 focus:ring-blue-400'}`}
                  >
                    <option value="">Select class</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Arm</label>
                  <select
                    value={selectedArmId}
                    onChange={(e) => setSelectedArmId(e.target.value)}
                    disabled={!selectedClassId}
                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 disabled:opacity-50 ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700 text-white focus:ring-blue-500' : 'bg-white/50 border-gray-200 text-gray-900 focus:ring-blue-400'}`}
                  >
                    <option value="">Select arm</option>
                    {getArmsForClass(selectedClassId).map(arm => <option key={arm.id} value={arm.id}>{formatArm(arm)}</option>)}
                  </select>
                </div>
                <button
                  onClick={handleAuthenticate}
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg"
                >
                  {loading ? <ArrowPathIcon className="h-5 w-5 animate-spin mx-auto" /> : 'Continue to Tests'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Test Selection Step */}
        {step === 'select-test' && studentInfo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className={`rounded-2xl p-5 ${theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-white/40 border border-white/20'} backdrop-blur-sm`}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-500/20">
                    <UserIcon className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Welcome,</p>
                    <p className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{studentInfo.name}</p>
                  </div>
                </div>
                <div className="flex gap-4 text-sm">
                  <div><span className="font-medium">Adm No:</span> {studentInfo.admissionNumber}</div>
                  <div><span className="font-medium">Class:</span> {studentInfo.className} Arm {studentInfo.armLetter}</div>
                </div>
              </div>
            </div>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Available Assessments</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {availableTests.map((test, idx) => {
                const totalQuestions = test.subjects.reduce((acc, s) => acc + s.questions.length, 0);
                return (
                  <motion.div
                    key={test.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`group rounded-2xl p-5 shadow-lg transition-all hover:shadow-xl cursor-pointer ${theme === 'dark' ? 'bg-white/5 border border-white/10 hover:bg-white/10' : 'bg-white/60 border border-white/30 hover:bg-white/80'}`}
                    onClick={() => startTest(test)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{test.name}</h3>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                          <span className={`flex items-center gap-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                            <DocumentTextIcon className="h-4 w-4" /> {totalQuestions} questions
                          </span>
                          <span className={`flex items-center gap-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                            <ClockIcon className="h-4 w-4" /> {test.duration} min
                          </span>
                          <span className={`flex items-center gap-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                            <BookOpenIcon className="h-4 w-4" /> {test.subjects.length} subjects
                          </span>
                        </div>
                      </div>
                      <div className="p-2 rounded-full bg-green-500/20 text-green-600 group-hover:scale-110 transition">
                        <PlayIcon className="h-6 w-6" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            <button onClick={() => setStep('auth')} className="text-blue-500 hover:underline text-sm">← Back to authentication</button>
          </motion.div>
        )}

        {/* Test Taking Step */}
        {step === 'taking' && selectedTest && studentInfo && (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-72">
              <SubjectSidebar />
            </div>
            <div className="flex-1">
              <div className={`rounded-2xl shadow-xl overflow-hidden ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/70 backdrop-blur-md border border-white/30'}`}>
                <div className={`p-5 border-b ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}>
                  <div className="flex flex-wrap justify-between items-center gap-3">
                    <div>
                      <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{selectedTest.name}</h2>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{studentInfo.name} · {studentInfo.className} Arm {studentInfo.armLetter}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono text-xl ${timeLeft < 60 ? 'bg-red-500 text-white animate-pulse' : theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-800'}`}>
                        <ClockIcon className="h-5 w-5" />
                        {formatTime(timeLeft)}
                      </div>
                      <button
                        onClick={() => handleSubmitTest(false)}
                        disabled={submitting}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 text-white font-semibold hover:bg-red-700 transition disabled:opacity-50"
                      >
                        <XCircleIcon className="h-5 w-5" />
                        End Exam
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6 min-h-[400px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${currentSubjectIndex}-${currentQuestionIndex}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex gap-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${theme === 'dark' ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                            {getCurrentSubject()?.name}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                            Subject {currentSubjectIndex + 1} of {selectedTest.subjects.length}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                            Q {currentQuestionIndex + 1} of {getCurrentSubject()?.questions.length}
                          </span>
                        </div>
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Marks: {getCurrentQuestion()?.marks}</span>
                      </div>

                      {/* Display attachment if present */}
                      {(() => {
                        const attachmentUrl = getCurrentQuestion()?.attachmentUrl;
                        const attachmentType = getCurrentQuestion()?.attachmentType;
                        if (!attachmentUrl) return null;
                        const fullUrl = getAttachmentUrl(attachmentUrl);
                        if (!fullUrl) return null;
                        if (attachmentType === 'image') {
                          return <img src={fullUrl} alt="Question attachment" className="max-w-full max-h-64 rounded-lg border mb-4" />;
                        } else if (attachmentType === 'video') {
                          return <video controls className="max-w-full max-h-64 rounded-lg border mb-4" src={fullUrl} />;
                        } else if (attachmentType === 'audio') {
                          return <audio controls className="w-full mb-4" src={fullUrl} />;
                        }
                        return null;
                      })()}

                      <p className={`text-xl leading-relaxed ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                        {getCurrentQuestion()?.text}
                      </p>

                      <div className="space-y-3">
                        {getCurrentQuestion()?.options.map((opt, idx) => {
                          const isSelected = getCurrentAnswer() === idx;
                          return (
                            <label
                              key={idx}
                              className={`flex items-start p-4 rounded-xl cursor-pointer transition-all border-2 ${isSelected ? (theme === 'dark' ? 'border-blue-500 bg-blue-500/20' : 'border-blue-500 bg-blue-50') : (theme === 'dark' ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-gray-200 bg-white/40 hover:bg-white/60')}`}
                            >
                              <div className="flex items-center gap-3 w-full">
                                <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-400'}`}>
                                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                                <input
                                  type="radio"
                                  name={`question-${getCurrentQuestion()?.id}`}
                                  checked={isSelected}
                                  onChange={() => handleAnswerSelect(getCurrentSubject()!.id, getCurrentQuestion()!.id, idx)}
                                  className="hidden"
                                />
                                <span className={`text-base ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>{opt}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      <QuestionNumbers />
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className={`p-5 border-t ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'} flex justify-between`}>
                  <button
                    onClick={() => {
                      if (currentQuestionIndex > 0) {
                        setCurrentQuestionIndex(prev => prev - 1);
                      } else if (currentSubjectIndex > 0) {
                        setCurrentSubjectIndex(prev => prev - 1);
                        const prevSubject = selectedTest.subjects[currentSubjectIndex - 1];
                        setCurrentQuestionIndex(prevSubject.questions.length - 1);
                      }
                    }}
                    disabled={currentSubjectIndex === 0 && currentQuestionIndex === 0}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gray-500 text-white disabled:opacity-50 hover:bg-gray-600 transition"
                  >
                    <ChevronLeftIcon className="h-5 w-5" /> Previous
                  </button>
                  <button
                    onClick={() => {
                      const currentSubject = getCurrentSubject();
                      if (currentQuestionIndex < currentSubject!.questions.length - 1) {
                        setCurrentQuestionIndex(prev => prev + 1);
                      } else if (currentSubjectIndex < selectedTest.subjects.length - 1) {
                        setCurrentSubjectIndex(prev => prev + 1);
                        setCurrentQuestionIndex(0);
                      } else {
                        handleSubmitTest(false);
                      }
                    }}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition"
                  >
                    {currentSubjectIndex === selectedTest.subjects.length - 1 && currentQuestionIndex === getCurrentSubject()!.questions.length - 1 ? (
                      <>Submit <CheckCircleIcon className="h-5 w-5" /></>
                    ) : (
                      <>Next <ChevronRightIcon className="h-5 w-5" /></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Result Step */}
        {step === 'result' && result && studentInfo && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`max-w-2xl mx-auto rounded-2xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/70 backdrop-blur-md border border-white/30'}`}
          >
            <div className="p-8 text-center">
              <div className="inline-flex p-3 rounded-full bg-green-500/20 mb-4">
                <CheckCircleIcon className="h-12 w-12 text-green-500" />
              </div>
              <h2 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Assessment Complete</h2>
              <p className={`mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Thank you for completing the test</p>
              <div className={`p-5 rounded-xl text-left ${theme === 'dark' ? 'bg-white/10' : 'bg-white/60'}`}>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="font-medium">Name:</span> <span className={theme === 'dark' ? 'text-white' : 'text-gray-800'}>{studentInfo.name}</span></div>
                  <div><span className="font-medium">Admission No:</span> <span className={theme === 'dark' ? 'text-white' : 'text-gray-800'}>{studentInfo.admissionNumber}</span></div>
                  <div><span className="font-medium">Class:</span> <span className={theme === 'dark' ? 'text-white' : 'text-gray-800'}>{studentInfo.className} Arm {studentInfo.armLetter}</span></div>
                  <div><span className="font-medium">Test:</span> <span className={theme === 'dark' ? 'text-white' : 'text-gray-800'}>{selectedTest?.name}</span></div>
                </div>
              </div>
              <div className="my-8">
                <div className={`text-7xl font-bold ${result.percentage >= 70 ? 'text-green-500' : result.percentage >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {result.percentage}%
                </div>
                <p className={`text-lg mt-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Score: {result.score} / {result.total}
                </p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transition transform hover:scale-105"
              >
                Take Another Test
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}