import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { unwrapRes } from '../../hooks/queryHelpers';
import { SERVER_URL } from '../../config/server';
import { uploadWithProgress } from '../../utils/upload';
import UploadProgress from '../../components/UploadProgress';
import { formatArm } from '../../utils/arm';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

import {
  PlusIcon,
  PlayIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  QuestionMarkCircleIcon,
  PhotoIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  LinkIcon,
  EllipsisVerticalIcon,
  BookOpenIcon,
  ClockIcon,
  DocumentTextIcon,
  ChartBarIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';

// ---------- Interfaces ----------

interface Test {
  id: string;
  name: string;
  classId: string;
  armId: string;
  subjects: string[];
  questionCount: number;
  duration: number;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: string;
  updatedAt: string;
}

interface Class {
  id: string;
  name: string;
  arms: Arm[];
}

interface Arm {
  id: string;
  letter: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Question {
  id: string;
  testId: string;
  subjectId?: string;
  subject?: Subject;
  text: string;
  options: string[];
  correctOption: number;
  marks: number;
  attachmentType?: 'image' | 'video' | 'audio' | null;
  attachmentUrl?: string | null;
}

interface TestAttempt {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber?: string;
  score: number;
  total: number;
  percentage: number;
  completed: boolean;
  startedAt: string;
  submittedAt: string;
  timeTakenSeconds: number;
}

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

export default function AdminCBT() {
  const { theme } = useTheme();
  const { token } = useAuth();

  // ============================================================
  // THEME HELPERS
  // ============================================================

  const isDark = theme === 'dark';

  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  const textLabel = isDark ? 'text-gray-300' : 'text-gray-700';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';

  const inputClasses = isDark
    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-blue-500'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-400';

  const modalClasses = isDark
    ? 'bg-gray-900'
    : 'bg-white';

  const modalBorder = isDark
    ? 'border-gray-700'
    : 'border-gray-200';

  const cardClasses = isDark
    ? 'bg-white/5 backdrop-blur-xl border border-white/10'
    : 'bg-white/30 backdrop-blur-md border border-white/20';

  const innerCardClasses = isDark
    ? 'bg-white/5'
    : 'bg-gray-50';

  const buttonSecondaryClasses = isDark
    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
    : 'bg-gray-200 text-gray-700 hover:bg-gray-300';

  // ---------- Existing state ----------

  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [subjectsError, setSubjectsError] = useState(false);

  // Question management state
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Subjects that belong to the currently selected test
  const [testSubjectsList, setTestSubjectsList] = useState<Subject[]>([]);

  // Question form state
  const [questionForm, setQuestionForm] = useState({
    subjectId: '',
    text: '',
    options: ['', ''],
    correctOption: 0,
    marks: 1,
    attachmentType: null as 'image' | 'video' | 'audio' | null,
    attachmentUrl: '',
    attachmentFile: null as File | null,
  });

  // Attachment upload progress (0–100, null = no upload running)
  const [attachmentProgress, setAttachmentProgress] = useState<number | null>(null);

  // Test form state
  const [formData, setFormData] = useState({
    name: '',
    classId: '',
    armId: '',
    subjects: [] as string[],
    questionCount: 10,
    duration: 30,
    status: 'DRAFT' as 'DRAFT' | 'PUBLISHED',
  });

  // ---------- Dropdown improvements ----------

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropUp, setDropUp] = useState<Record<string, boolean>>({});

  const dropdownRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dropdownMenuRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId) {
        const dropdown = dropdownRefs.current.get(openDropdownId);

        if (
          dropdown &&
          !dropdown.contains(event.target as Node)
        ) {
          setOpenDropdownId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  useEffect(() => {
    if (!openDropdownId) return;

    const menu = dropdownMenuRefs.current.get(openDropdownId);

    if (!menu) return;

    const rect = menu.getBoundingClientRect();

    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    const shouldDropUp = spaceAbove > spaceBelow;

    setDropUp(prev => ({
      ...prev,
      [openDropdownId]: shouldDropUp,
    }));
  }, [openDropdownId]);

  const setDropdownRef = (id: string) => (
    el: HTMLDivElement | null
  ) => {
    if (el) {
      dropdownRefs.current.set(id, el);
    } else {
      dropdownRefs.current.delete(id);
    }
  };

  // ============================================================
  // DATA FETCHING
  // ============================================================

  // ---------- Queries ----------
  const queryClient = useQueryClient();

  const testsQuery = useQuery<Test[]>({
    queryKey: ['cbt-tests', token],
    queryFn: async () => {
      const data = await unwrapRes<Test[]>(api.get('/tests', token!));
      return data.map((test: Test) => ({
        ...test,
        subjects: test.subjects || [],
      }));
    },
    enabled: !!token,
  });

  const classesQuery = useQuery<Class[]>({
    queryKey: ['classes'],
    queryFn: () => unwrapRes<Class[]>(api.get('/classes', token!)),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  const subjectsQuery = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: () => unwrapRes<Subject[]>(api.get('/subjects', token!)),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  const tests = testsQuery.data ?? [];
  const classes = classesQuery.data ?? [];
  const subjects = subjectsQuery.data ?? [];

  useEffect(() => {
    if (testsQuery.data) setLoading(false);
  }, [testsQuery.data]);

  useEffect(() => {
    if (testsQuery.error) {
      console.error(testsQuery.error);
      toast.error('Could not load tests');
    }
  }, [testsQuery.error]);

  useEffect(() => {
    if (subjectsQuery.error) setSubjectsError(true);
    else setSubjectsError(false);
  }, [subjectsQuery.error]);

  const fetchQuestions = async (testId: string) => {
    setLoadingQuestions(true);

    try {
      const res = await api.get(
        `/questions/test/${testId}`,
        token
      );

      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
      } else {
        toast.error('Failed to load questions');
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not load questions');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const getArmsForClass = (classId: string) => {
    const cls = classes.find(
      c => c.id === classId
    );

    return cls?.arms || [];
  };

  const getSubjectName = (subjectId: string) => {
    if (!subjectId) return '';

    const subj = subjects.find(
      s => s.id === subjectId
    );

    return subj?.name || 'Unknown';
  };

  // ============================================================
  // TEST CRUD
  // ============================================================

  const resetForm = () => {
    setFormData({
      name: '',
      classId: '',
      armId: '',
      subjects: [],
      questionCount: 10,
      duration: 30,
      status: 'DRAFT',
    });

    setEditingTest(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (test: Test) => {
    setEditingTest(test);

    setFormData({
      name: test.name,
      classId: test.classId,
      armId: test.armId,
      subjects: test.subjects || [],
      questionCount: test.questionCount,
      duration: test.duration,
      status: test.status,
    });

    setShowModal(true);
    setOpenDropdownId(null);
  };

  const handleSave = async () => {
    if (
      !formData.name.trim() ||
      !formData.classId ||
      !formData.armId
    ) {
      toast.error('Please fill all required fields');
      return;
    }

    setSubmitting(true);

    try {
      let res;

      if (editingTest) {
        res = await api.put(
          `/tests/${editingTest.id}`,
          formData,
          token
        );
      } else {
        res = await api.post(
          '/tests',
          formData,
          token
        );
      }

      if (!res.ok) {
        throw new Error(await res.text());
      }

      toast.success(
        editingTest
          ? 'Test updated'
          : 'Test created'
      );

      setShowModal(false);

      queryClient.invalidateQueries({
        queryKey: ['cbt-tests', token],
      });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (test: Test) => {
    setOpenDropdownId(null);

    const result = await Swal.fire({
      title: 'Delete Test',
      text: `Delete "${test.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete',
    });

    if (!result.isConfirmed) return;

    try {
      const res = await api.del(
        `/tests/${test.id}`,
        token
      );

      if (!res.ok) {
        throw new Error(await res.text());
      }

      toast.success('Test deleted');

      queryClient.invalidateQueries({
        queryKey: ['cbt-tests', token],
      });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleStatus = async (test: Test) => {
    setOpenDropdownId(null);

    const newStatus =
      test.status === 'DRAFT'
        ? 'PUBLISHED'
        : 'DRAFT';

    try {
      const res = await api.patch(
        `/tests/${test.id}`,
        { status: newStatus },
        token
      );

      if (!res.ok) {
        throw new Error(await res.text());
      }

      toast.success(
        `Test ${
          newStatus === 'PUBLISHED'
            ? 'published'
            : 'drafted'
        }`
      );

      queryClient.invalidateQueries({
        queryKey: ['cbt-tests', token],
      });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const copyTestLink = (testId: string) => {
    setOpenDropdownId(null);

    const url =
      `${window.location.origin}/student/test?testId=${testId}`;

    navigator.clipboard.writeText(url);

    toast.success(
      'Test link copied to clipboard!'
    );
  };

  // ============================================================
  // QUESTION MANAGEMENT
  // ============================================================

  const openQuestionManager = async (
    test: Test
  ) => {
    setSelectedTest(test);

    if (
      subjects.length === 0 &&
      !subjectsError
    ) {
      await subjectsQuery.refetch();
    }

    const testSubjects = subjects.filter(
      s => test.subjects.includes(s.id)
    );

    setTestSubjectsList(testSubjects);

    resetQuestionForm();

    await fetchQuestions(test.id);

    setShowQuestionModal(true);

    setOpenDropdownId(null);
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      subjectId: '',
      text: '',
      options: ['', ''],
      correctOption: 0,
      marks: 1,
      attachmentType: null,
      attachmentUrl: '',
      attachmentFile: null,
    });

    setEditingQuestion(null);
  };

  const openEditQuestion = (
    q: Question
  ) => {
    setEditingQuestion(q);

    setQuestionForm({
      subjectId: q.subjectId || '',
      text: q.text,
      options: [...q.options],
      correctOption: q.correctOption,
      marks: q.marks,
      attachmentType:
        q.attachmentType || null,
      attachmentUrl:
        q.attachmentUrl || '',
      attachmentFile: null,
    });
  };

  const addOption = () => {
    if (
      questionForm.options.length >= 6
    ) {
      toast.error(
        'Maximum 6 options allowed'
      );
      return;
    }

    setQuestionForm({
      ...questionForm,
      options: [
        ...questionForm.options,
        '',
      ],
    });
  };

  const removeOption = (
    idx: number
  ) => {
    if (
      questionForm.options.length <= 2
    ) {
      toast.error(
        'Minimum 2 options required'
      );
      return;
    }

    const newOptions =
      questionForm.options.filter(
        (_, i) => i !== idx
      );

    let newCorrect =
      questionForm.correctOption;

    if (
      questionForm.correctOption === idx
    ) {
      newCorrect = 0;
    } else if (
      questionForm.correctOption > idx
    ) {
      newCorrect--;
    }

    setQuestionForm({
      ...questionForm,
      options: newOptions,
      correctOption: newCorrect,
    });
  };

  const updateOption = (
    idx: number,
    value: string
  ) => {
    const newOptions = [
      ...questionForm.options,
    ];

    newOptions[idx] = value;

    setQuestionForm({
      ...questionForm,
      options: newOptions,
    });
  };

  const handleAttachmentUpload = async (
    file: File,
    type: 'image' | 'video' | 'audio'
  ) => {
    const formData = new FormData();

    formData.append(
      'file',
      file
    );

    setAttachmentProgress(0);

    try {
      const data = await uploadWithProgress(
        '/questions/upload',
        formData,
        token,
        setAttachmentProgress
      );

      let fullUrl =
        data.attachmentUrl;

      if (
        fullUrl &&
        !fullUrl.startsWith('http')
      ) {
        fullUrl =
          `${SERVER_URL}${fullUrl}`;
      }

      setQuestionForm(prev => ({
        ...prev,
        attachmentType:
          data.attachmentType,
        attachmentUrl:
          fullUrl,
        attachmentFile:
          null,
      }));

      toast.success(
        `${type} uploaded successfully`
      );
    } catch (err) {
      toast.error(
        'Upload failed'
      );

      console.error(err);
    } finally {
      setAttachmentProgress(null);
    }
  };

  const removeAttachment = () => {
    setQuestionForm({
      ...questionForm,
      attachmentType: null,
      attachmentUrl: '',
      attachmentFile: null,
    });
  };

  const handleSaveQuestion =
    async () => {
      console.log(
        'Saving question with subjectId:',
        questionForm.subjectId
      );

      if (!selectedTest) return;

      if (!questionForm.text.trim()) {
        toast.error(
          'Question text is required'
        );
        return;
      }

      if (
        questionForm.options.some(
          opt => !opt.trim()
        )
      ) {
        toast.error(
          'All options must be filled'
        );
        return;
      }

      if (
        questionForm.correctOption <
          0 ||
        questionForm.correctOption >=
          questionForm.options.length
      ) {
        toast.error(
          'Please select a valid correct option'
        );
        return;
      }

      setSubmittingQuestion(true);

      try {
        const payload = {
          testId:
            selectedTest.id,
          subjectId:
            questionForm.subjectId ||
            null,
          text:
            questionForm.text,
          options:
            questionForm.options,
          correctOption:
            questionForm.correctOption,
          marks:
            questionForm.marks,
          attachmentType:
            questionForm.attachmentType,
          attachmentUrl:
            questionForm.attachmentUrl,
        };

        let res;

        if (editingQuestion) {
          res = await api.put(
            `/questions/${editingQuestion.id}`,
            payload,
            token
          );
        } else {
          res = await api.post(
            '/questions',
            payload,
            token
          );
        }

        if (!res.ok) {
          throw new Error(
            await res.text()
          );
        }

        toast.success(
          editingQuestion
            ? 'Question updated'
            : 'Question added'
        );

        await fetchQuestions(
          selectedTest.id
        );

        const newCount =
          editingQuestion
            ? questions.length
            : questions.length + 1;

        queryClient.setQueryData<Test[]>(
          ['cbt-tests', token],
          (prev) =>
            (prev ?? []).map((t) =>
              t.id === selectedTest.id
                ? { ...t, questionCount: newCount }
                : t
            )
        );

        resetQuestionForm();
      } catch (err: any) {
        toast.error(
          err.message
        );
      } finally {
        setSubmittingQuestion(false);
      }
    };

  const handleDeleteQuestion =
    async (
      question: Question
    ) => {
      const result =
        await Swal.fire({
          title: 'Delete Question',
          text: 'Are you sure?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor:
            '#d33',
          confirmButtonText:
            'Delete',
        });

      if (!result.isConfirmed)
        return;

      try {
        const res =
          await api.del(
            `/questions/${question.id}`,
            token
          );

        if (!res.ok) {
          throw new Error(
            await res.text()
          );
        }

        toast.success(
          'Question deleted'
        );

        await fetchQuestions(
          selectedTest!.id
        );

        queryClient.setQueryData<Test[]>(
          ['cbt-tests', token],
          (prev) =>
            (prev ?? []).map((t) =>
              t.id ===
              selectedTest!.id
                ? {
                    ...t,
                    questionCount:
                      t.questionCount -
                      1,
                  }
                : t
            )
        );
      } catch (err: any) {
        toast.error(
          err.message
        );
      }
    };

  // ============================================================
  // GROUP QUESTIONS
  // ============================================================

  const getGroupedQuestions =
    () => {
      const grouped: Record<
        string,
        {
          subjectName: string;
          questions: Question[];
        }
      > = {};

      const noSubjectKey =
        'no-subject';

      for (const q of questions) {
        let subjectName =
          'General';

        if (q.subjectId) {
          const found =
            subjects.find(
              s =>
                s.id ===
                q.subjectId
            );

          if (found) {
            subjectName =
              found.name;
          } else if (
            subjectsError
          ) {
            subjectName =
              'Subject data unavailable';
          } else {
            subjectName =
              'Unknown';
          }
        } else if (
          q.subject &&
          q.subject.name
        ) {
          subjectName =
            q.subject.name;
        } else if (
          subjectsError
        ) {
          subjectName =
            'Subjects failed to load';
        }

        const key =
          q.subjectId ||
          noSubjectKey;

        if (!grouped[key]) {
          grouped[key] = {
            subjectName,
            questions: [],
          };
        }

        grouped[key].questions.push(
          q
        );
      }

      const sortedEntries =
        Object.entries(
          grouped
        ).sort((a, b) => {
          if (
            a[0] ===
            noSubjectKey
          )
            return 1;

          if (
            b[0] ===
            noSubjectKey
          )
            return -1;

          return a[1].subjectName.localeCompare(
            b[1].subjectName
          );
        });

      return Object.fromEntries(
        sortedEntries
      );
    };

  const groupedQuestions =
    getGroupedQuestions();

  // ============================================================
  // ANALYTICS
  // ============================================================

  const [
    showAnalyticsModal,
    setShowAnalyticsModal,
  ] = useState(false);

  const [
    analyticsTest,
    setAnalyticsTest,
  ] = useState<Test | null>(
    null
  );

  const [
    attempts,
    setAttempts,
  ] = useState<TestAttempt[]>(
    []
  );

  const [
    loadingAttempts,
    setLoadingAttempts,
  ] = useState(false);

  const [
    exportingResults,
    setExportingResults,
  ] = useState(false);

  const [
    exportForm,
    setExportForm,
  ] = useState({
    term: 'First Term',
    academicYearId: '',
    resultType:
      'ca1' as 'ca1' | 'ca2' | 'exam',
  });

  const academicYearsQuery = useQuery<
    {
      id: string;
      name: string;
    }[]
  >({
    queryKey: ['cbt-academic-years', token],
    enabled: false,
    queryFn: async () => {
      const res = await api.get('/academic-years', token!);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const academicYears = academicYearsQuery.data ?? [];

  useEffect(() => {
    const years = academicYearsQuery.data;
    if (years && years.length > 0 && !exportForm.academicYearId) {
      setExportForm(prev => ({
        ...prev,
        academicYearId: years[0].id,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYearsQuery.data]);

  const fetchAcademicYears = useCallback(
    async () => {
      await academicYearsQuery.refetch();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [academicYearsQuery.refetch]
  );

  const fetchTestAttempts =
    async (
      testId: string
    ) => {
      setLoadingAttempts(
        true
      );

      try {
        const res =
          await api.get(
            `/test-attempts/test/${testId}`,
            token
          );

        if (!res.ok) {
          throw new Error(
            'Failed to load attempts'
          );
        }

        const data =
          await res.json();

        setAttempts(data);
      } catch (err) {
        console.error(err);

        toast.error(
          'Could not load test attempts'
        );

        setAttempts([]);
      } finally {
        setLoadingAttempts(
          false
        );
      }
    };

  const openAnalytics =
    async (
      test: Test
    ) => {
      setAnalyticsTest(test);

      setShowAnalyticsModal(
        true
      );

      await fetchAcademicYears();

      await fetchTestAttempts(
        test.id
      );
    };

  const pushToResults =
    async () => {
      if (!analyticsTest)
        return;

      if (
        !exportForm.academicYearId
      ) {
        toast.error(
          'Please select an academic year'
        );

        return;
      }

      setExportingResults(
        true
      );

      try {
        const res =
          await api.post(
            '/results/from-test-attempts',
            {
              testId:
                analyticsTest.id,
              academicYearId:
                exportForm.academicYearId,
              term:
                exportForm.term,
              resultType:
                exportForm.resultType,
            },
            token
          );

        if (!res.ok) {
          throw new Error(
            await res.text()
          );
        }

        toast.success(
          `Results pushed successfully`
        );

        setShowAnalyticsModal(
          false
        );
      } catch (err: any) {
        toast.error(
          err.message ||
            'Failed to push results'
        );
      } finally {
        setExportingResults(
          false
        );
      }
    };

  const formatTimeTaken =
    (seconds: number) => {
      const mins =
        Math.floor(
          seconds / 60
        );

      const secs =
        seconds % 60;

      return `${mins}m ${secs}s`;
    };

  // ============================================================
  // SELECT STYLE
  // ============================================================

  const selectStyle = {
    backgroundColor:
      isDark
        ? '#1e293b'
        : '#ffffff',

    color:
      isDark
        ? '#f1f5f9'
        : '#111827',
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      className={`min-h-screen px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-300 ${
        isDark
          ? 'bg-[#0B1120]'
          : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
      }`}
    >

      {/* Dark mode background */}
      {isDark && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                `linear-gradient(rgba(59,130,246,0.1) 1px,transparent 1px), linear-gradient(90deg,rgba(59,130,246,0.1) 1px,transparent 1px)`,
              backgroundSize:
                '60px 60px',
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <motion.div
          initial={{
            opacity: 0,
            y: -10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="sm:flex sm:items-center sm:justify-between mb-8"
        >
          <div>

            <h2
              className={`text-2xl font-bold ${
                isDark
                  ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent'
              }`}
            >
              Computer-Based Test (CBT)
            </h2>

            <p
              className={`mt-2 text-sm ${textSecondary}`}
            >
              Create and manage online tests with subjects & rich media.
            </p>

          </div>

          <motion.button
            whileHover={{
              scale: 1.02,
            }}
            whileTap={{
              scale: 0.98,
            }}
            onClick={
              openCreateModal
            }
            className="mt-4 sm:mt-0 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg hover:from-blue-600 hover:to-indigo-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Test
          </motion.button>
        </motion.div>

        {/* ======================================================
            TEST LIST
        ====================================================== */}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tests.length === 0 ? (

          <div
            className={`text-center py-12 rounded-2xl ${cardClasses}`}
          >
            <p
              className={`text-sm ${textSecondary}`}
            >
              No tests found. Click "New Test" to create one.
            </p>
          </div>

        ) : (

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-6 lg:grid-cols-2"
          >

            {tests.map(test => {

              const classObj =
                classes.find(
                  c =>
                    c.id ===
                    test.classId
                );

              const armObj =
                classObj?.arms.find(
                  a =>
                    a.id ===
                    test.armId
                );

              const className =
                classObj?.name ||
                'Unknown';

              const armLetter =
                armObj?.letter ||
                '?';

              const subjectNames =
                (
                  test.subjects ||
                  []
                )
                  .map(
                    id =>
                      getSubjectName(
                        id
                      )
                  )
                  .filter(Boolean);

              return (

                <motion.div
                  key={test.id}
                  variants={item}
                  className={`group relative overflow-visible rounded-2xl p-6 shadow-xl ${cardClasses}`}
                >

                  <div className="flex justify-between items-start">

                    <div>

                      <h3
                        className={`text-lg font-bold ${textPrimary}`}
                      >
                        {test.name}
                      </h3>

                      <p
                        className={`text-sm mt-1 ${textSecondary}`}
                      >
                        Class: {className} Arm {armLetter}
                      </p>

                      <p
                        className={`text-sm ${textSecondary}`}
                      >
                        Questions: {test.questionCount} | Duration: {test.duration} min
                      </p>

                      {subjectNames.length >
                        0 && (

                        <div className="flex flex-wrap gap-1 mt-1">

                          {subjectNames.map(
                            subject => (
                              <span
                                key={
                                  subject
                                }
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  isDark
                                    ? 'bg-blue-500/20 text-blue-300'
                                    : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {subject}
                              </span>
                            )
                          )}

                        </div>

                      )}

                    </div>

                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        test.status ===
                        'PUBLISHED'
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-yellow-500/20 text-yellow-600'
                      }`}
                    >
                      {test.status ===
                      'PUBLISHED'
                        ? 'Published'
                        : 'Draft'}
                    </span>

                  </div>

                  {/* Dropdown */}

                  <div className="mt-4 flex justify-end">

                    <div
                      className="relative"
                      ref={setDropdownRef(
                        test.id
                      )}
                    >

                      <button
                        onClick={() =>
                          setOpenDropdownId(
                            openDropdownId ===
                              test.id
                              ? null
                              : test.id
                          )
                        }
                        className={`p-2 rounded-lg transition-colors ${
                          isDark
                            ? 'hover:bg-white/10'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <EllipsisVerticalIcon
                          className={`h-5 w-5 ${
                            isDark
                              ? 'text-gray-400'
                              : 'text-gray-500'
                          }`}
                        />
                      </button>

                      {openDropdownId ===
                        test.id && (

                        <div
                          ref={el => {
                            if (el) {
                              dropdownMenuRefs.current.set(
                                test.id,
                                el
                              );
                            } else {
                              dropdownMenuRefs.current.delete(
                                test.id
                              );
                            }
                          }}
                          className={`absolute right-0 w-48 rounded-md shadow-lg z-50 ${
                            dropUp[
                              test.id
                            ]
                              ? 'bottom-full mb-2'
                              : 'top-full mt-2'
                          } ${
                            isDark
                              ? 'bg-gray-800 border border-white/10'
                              : 'bg-white border border-gray-200'
                          }`}
                        >

                          <div className="py-1">

                            {test.status ===
                              'PUBLISHED' && (

                              <button
                                onClick={() =>
                                  copyTestLink(
                                    test.id
                                  )
                                }
                                className={`flex items-center w-full px-4 py-2 text-sm ${
                                  isDark
                                    ? 'text-gray-200 hover:bg-white/10'
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`}
                              >
                                <LinkIcon className="h-4 w-4 mr-2" />
                                Copy Link
                              </button>

                            )}

                            <button
                              onClick={() =>
                                handleToggleStatus(
                                  test
                                )
                              }
                              className={`flex items-center w-full px-4 py-2 text-sm ${
                                isDark
                                  ? 'text-gray-200 hover:bg-white/10'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              {test.status ===
                              'DRAFT' ? (
                                <PlayIcon className="h-4 w-4 mr-2" />
                              ) : (
                                <CheckIcon className="h-4 w-4 mr-2" />
                              )}

                              {test.status ===
                              'DRAFT'
                                ? 'Publish'
                                : 'Unpublish'}
                            </button>

                            <button
                              onClick={() =>
                                openEditModal(
                                  test
                                )
                              }
                              className={`flex items-center w-full px-4 py-2 text-sm ${
                                isDark
                                  ? 'text-gray-200 hover:bg-white/10'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <PencilIcon className="h-4 w-4 mr-2" />
                              Edit
                            </button>

                            <button
                              onClick={() =>
                                openQuestionManager(
                                  test
                                )
                              }
                              className={`flex items-center w-full px-4 py-2 text-sm ${
                                isDark
                                  ? 'text-gray-200 hover:bg-white/10'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <QuestionMarkCircleIcon className="h-4 w-4 mr-2" />
                              Questions
                            </button>

                            {test.status ===
                              'PUBLISHED' && (

                              <button
                                onClick={() =>
                                  openAnalytics(
                                    test
                                  )
                                }
                                className={`flex items-center w-full px-4 py-2 text-sm ${
                                  isDark
                                    ? 'text-gray-200 hover:bg-white/10'
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`}
                              >
                                <ChartBarIcon className="h-4 w-4 mr-2" />
                                Result
                              </button>

                            )}

                            <button
                              onClick={() =>
                                handleDelete(
                                  test
                                )
                              }
                              className={`flex items-center w-full px-4 py-2 text-sm text-red-600 ${
                                isDark
                                  ? 'hover:bg-white/10'
                                  : 'hover:bg-red-50'
                              }`}
                            >
                              <TrashIcon className="h-4 w-4 mr-2" />
                              Delete
                            </button>

                          </div>

                        </div>

                      )}

                    </div>

                  </div>

                  <div
                    className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl transition-all group-hover:scale-110 ${
                      isDark
                        ? 'bg-blue-500/20 group-hover:bg-blue-500/30'
                        : 'bg-blue-200/30 group-hover:bg-blue-300/40'
                    }`}
                  />

                </motion.div>

              );
            })}

          </motion.div>

        )}

      </div>

      {/* ========================================================
          CREATE / EDIT TEST MODAL
      ======================================================== */}

      <AnimatePresence>

        {showModal && (

          <>
            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              onClick={() =>
                setShowModal(false)
              }
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />

            <motion.div
              initial={{
                scale: 0.95,
                opacity: 0,
              }}
              animate={{
                scale: 1,
                opacity: 1,
              }}
              exit={{
                scale: 0.95,
                opacity: 0,
              }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >

              <div
                className={`w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden ${modalClasses}`}
              >

                <div
                  className={`flex justify-between items-center p-6 border-b ${modalBorder}`}
                >

                  <h3
                    className={`text-xl font-bold ${textPrimary}`}
                  >
                    {editingTest
                      ? 'Edit Test'
                      : 'Create New Test'}
                  </h3>

                  <button
                    onClick={() =>
                      setShowModal(false)
                    }
                    className={`p-1 rounded-full ${
                      isDark
                        ? 'hover:bg-gray-700'
                        : 'hover:bg-gray-200'
                    }`}
                  >
                    <XMarkIcon
                      className={`h-5 w-5 ${textMuted}`}
                    />
                  </button>

                </div>

                <div className="p-6">

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* LEFT COLUMN */}

                    <div className="space-y-4">

                      {/* Test Name */}

                      <div>

                        <label
                          className={`block text-sm font-medium mb-1 ${textLabel}`}
                        >
                          Test Name *
                        </label>

                        <div className="relative">

                          <DocumentTextIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />

                          <input
                            type="text"
                            value={
                              formData.name
                            }
                            onChange={e =>
                              setFormData({
                                ...formData,
                                name: e
                                  .target
                                  .value,
                              })
                            }
                            className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${inputClasses}`}
                            placeholder="e.g., Mathematics Final Exam"
                          />

                        </div>

                      </div>

                      {/* Class */}

                      <div>

                        <label
                          className={`block text-sm font-medium mb-1 ${textLabel}`}
                        >
                          Class *
                        </label>

                        <select
                          value={
                            formData.classId
                          }
                          onChange={e =>
                            setFormData({
                              ...formData,
                              classId:
                                e.target
                                  .value,
                              armId:
                                '',
                            })
                          }
                          style={
                            selectStyle
                          }
                          className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${inputClasses}`}
                        >
                          <option value="">
                            Select class
                          </option>

                          {classes.map(
                            c => (
                              <option
                                key={
                                  c.id
                                }
                                value={
                                  c.id
                                }
                              >
                                {c.name}
                              </option>
                            )
                          )}
                        </select>

                      </div>

                      {/* Arm */}

                      <div>

                        <label
                          className={`block text-sm font-medium mb-1 ${textLabel}`}
                        >
                          Arm *
                        </label>

                        <select
                          value={
                            formData.armId
                          }
                          onChange={e =>
                            setFormData({
                              ...formData,
                              armId:
                                e.target
                                  .value,
                            })
                          }
                          disabled={
                            !formData.classId
                          }
                          style={
                            selectStyle
                          }
                          className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 disabled:opacity-50 ${inputClasses}`}
                        >
                          <option value="">
                            Select arm
                          </option>

                          {getArmsForClass(
                            formData.classId
                          ).map(
                            arm => (
                              <option
                                key={
                                  arm.id
                                }
                                value={
                                  arm.id
                                }
                              >
                                {formatArm(arm)}
                              </option>
                            )
                          )}

                        </select>

                      </div>

                      {/* Subjects */}

                      <div>

                        <label
                          className={`block text-sm font-medium mb-1 ${textLabel}`}
                        >
                          Subjects (select multiple)
                        </label>

                        <div className="relative">

                          <BookOpenIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />

                          <select
                            multiple
                            value={
                              formData.subjects
                            }
                            onChange={e => {
                              const selected =
                                Array.from(
                                  e.target
                                    .selectedOptions,
                                  opt =>
                                    opt.value
                                );

                              setFormData({
                                ...formData,
                                subjects:
                                  selected,
                              });
                            }}
                            style={
                              selectStyle
                            }
                            className={`w-full pl-10 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 h-32 ${inputClasses}`}
                          >

                            {subjects.map(
                              sub => (
                                <option
                                  key={
                                    sub.id
                                  }
                                  value={
                                    sub.id
                                  }
                                >
                                  {
                                    sub.name
                                  }
                                </option>
                              )
                            )}

                          </select>

                        </div>

                        <p
                          className={`text-xs mt-1 ${textMuted}`}
                        >
                          Hold Ctrl (Cmd) to select multiple
                        </p>

                      </div>

                    </div>

                    {/* RIGHT COLUMN */}

                    <div className="space-y-4">

                      {/* Question Count */}

                      <div>

                        <label
                          className={`block text-sm font-medium mb-1 ${textLabel}`}
                        >
                          Number of Questions *
                        </label>

                        <div className="relative">

                          <DocumentTextIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />

                          <input
                            type="number"
                            min="1"
                            value={
                              formData.questionCount
                            }
                            onChange={e =>
                              setFormData({
                                ...formData,
                                questionCount:
                                  parseInt(
                                    e.target
                                      .value
                                  ) || 0,
                              })
                            }
                            className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${inputClasses}`}
                          />

                        </div>

                      </div>

                      {/* Duration */}

                      <div>

                        <label
                          className={`block text-sm font-medium mb-1 ${textLabel}`}
                        >
                          Duration (minutes) *
                        </label>

                        <div className="relative">

                          <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />

                          <input
                            type="number"
                            min="1"
                            value={
                              formData.duration
                            }
                            onChange={e =>
                              setFormData({
                                ...formData,
                                duration:
                                  parseInt(
                                    e.target
                                      .value
                                  ) || 0,
                              })
                            }
                            className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${inputClasses}`}
                          />

                        </div>

                      </div>

                      {/* Status */}

                      <div>

                        <label
                          className={`block text-sm font-medium mb-1 ${textLabel}`}
                        >
                          Status
                        </label>

                        <select
                          value={
                            formData.status
                          }
                          onChange={e =>
                            setFormData({
                              ...formData,
                              status:
                                e.target
                                  .value as
                                  | 'DRAFT'
                                  | 'PUBLISHED',
                            })
                          }
                          style={
                            selectStyle
                          }
                          className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${inputClasses}`}
                        >
                          <option value="DRAFT">
                            Draft
                          </option>

                          <option value="PUBLISHED">
                            Published
                          </option>
                        </select>

                      </div>

                      {/* Summary */}

                      <div className="pt-2">

                        <div
                          className={`p-3 rounded-lg ${innerCardClasses}`}
                        >

                          <p
                            className={`text-sm ${textSecondary}`}
                          >
                            <strong
                              className={
                                textPrimary
                              }
                            >
                              Summary
                            </strong>
                            <br />

                            {formData.name
                              ? `Test: ${formData.name}`
                              : 'No name set'}

                            <br />

                            Questions:{' '}
                            {
                              formData.questionCount
                            }{' '}
                            | Duration:{' '}
                            {
                              formData.duration
                            }{' '}
                            min

                            <br />

                            Status:{' '}
                            {formData.status ===
                            'DRAFT'
                              ? 'Draft'
                              : 'Published'}
                          </p>

                        </div>

                      </div>

                    </div>

                  </div>

                </div>

                <div
                  className={`flex justify-end gap-3 p-6 border-t ${modalBorder}`}
                >

                  <button
                    onClick={() =>
                      setShowModal(false)
                    }
                    className={`px-4 py-2 rounded-lg ${buttonSecondaryClasses}`}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={
                      handleSave
                    }
                    disabled={
                      submitting
                    }
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckIcon className="h-4 w-4" />
                    )}

                    {editingTest
                      ? 'Update Test'
                      : 'Create Test'}
                  </button>

                </div>

              </div>

            </motion.div>
          </>

        )}

      </AnimatePresence>

      {/* ========================================================
          QUESTION MANAGEMENT MODAL
      ======================================================== */}

      <AnimatePresence>

        {showQuestionModal &&
          selectedTest && (

            <>
              <motion.div
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                exit={{
                  opacity: 0,
                }}
                onClick={() =>
                  setShowQuestionModal(
                    false
                  )
                }
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              />

              <motion.div
                initial={{
                  scale: 0.95,
                  opacity: 0,
                }}
                animate={{
                  scale: 1,
                  opacity: 1,
                }}
                exit={{
                  scale: 0.95,
                  opacity: 0,
                }}
                className="fixed inset-0 flex items-center justify-center z-50 p-4"
              >

                <div
                  className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${modalClasses}`}
                >

                  {/* Header */}

                  <div
                    className={`flex justify-between items-center p-6 border-b ${modalBorder}`}
                  >

                    <h3
                      className={`text-xl font-bold ${textPrimary}`}
                    >
                      Manage Questions –{' '}
                      {
                        selectedTest.name
                      }
                    </h3>

                    <button
                      onClick={() =>
                        setShowQuestionModal(
                          false
                        )
                      }
                      className={`p-1 rounded-full ${
                        isDark
                          ? 'hover:bg-gray-700'
                          : 'hover:bg-gray-200'
                      }`}
                    >
                      <XMarkIcon
                        className={`h-5 w-5 ${textMuted}`}
                      />
                    </button>

                  </div>

                  <div className="p-6">

                    {/* Add/Edit Question */}

                    <div
                      className={`mb-8 p-4 rounded-xl ${innerCardClasses}`}
                    >

                      <h4
                        className={`text-lg font-semibold mb-4 ${textPrimary}`}
                      >
                        {editingQuestion
                          ? 'Edit Question'
                          : 'Add New Question'}
                      </h4>

                      <div className="space-y-4">

                        {/* Subject */}

                        <div>

                          <label
                            className={`block text-sm font-medium mb-1 ${textLabel}`}
                          >
                            Subject (optional)
                          </label>

                          <select
                            value={
                              questionForm.subjectId
                            }
                            onChange={e =>
                              setQuestionForm(
                                {
                                  ...questionForm,
                                  subjectId:
                                    e.target
                                      .value,
                                }
                              )
                            }
                            style={
                              selectStyle
                            }
                            className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${inputClasses}`}
                          >

                            <option value="">
                              -- No subject --
                            </option>

                            {testSubjectsList.map(
                              sub => (
                                <option
                                  key={
                                    sub.id
                                  }
                                  value={
                                    sub.id
                                  }
                                >
                                  {
                                    sub.name
                                  }
                                </option>
                              )
                            )}

                          </select>

                          {testSubjectsList.length ===
                            0 && (

                            <p className="text-xs text-yellow-500 mt-1">
                              No subjects assigned to this test. Please edit the test and select subjects.
                            </p>

                          )}

                        </div>

                        {/* Question Text */}

                        <div>

                          <label
                            className={`block text-sm font-medium mb-1 ${textLabel}`}
                          >
                            Question Text *
                          </label>

                          <textarea
                            rows={3}
                            value={
                              questionForm.text
                            }
                            onChange={e =>
                              setQuestionForm(
                                {
                                  ...questionForm,
                                  text:
                                    e.target
                                      .value,
                                }
                              )
                            }
                            className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${inputClasses}`}
                          />

                        </div>

                        {/* Options */}

                        <div>

                          <label
                            className={`block text-sm font-medium mb-2 ${textLabel}`}
                          >
                            Options *
                          </label>

                          {questionForm.options.map(
                            (
                              opt,
                              idx
                            ) => (

                              <div
                                key={
                                  idx
                                }
                                className="flex items-center gap-2 mb-2"
                              >

                                <input
                                  type="text"
                                  value={
                                    opt
                                  }
                                  onChange={e =>
                                    updateOption(
                                      idx,
                                      e.target
                                        .value
                                    )
                                  }
                                  className={`flex-1 px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 ${inputClasses}`}
                                  placeholder={`Option ${
                                    idx +
                                    1
                                  }`}
                                />

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeOption(
                                      idx
                                    )
                                  }
                                  className={`p-2 rounded-lg text-red-500 ${
                                    isDark
                                      ? 'hover:bg-red-900/30'
                                      : 'hover:bg-red-100'
                                  }`}
                                  title="Remove option"
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                </button>

                              </div>

                            )
                          )}

                          <button
                            type="button"
                            onClick={
                              addOption
                            }
                            className="mt-2 inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                          >
                            <PlusIcon className="h-4 w-4 mr-1" />
                            Add Option
                          </button>

                        </div>

                        {/* Correct Option & Marks */}

                        <div className="grid grid-cols-2 gap-4">

                          <div>

                            <label
                              className={`block text-sm font-medium mb-1 ${textLabel}`}
                            >
                              Correct Option (Index)
                            </label>

                            <select
                              value={
                                questionForm.correctOption
                              }
                              onChange={e =>
                                setQuestionForm(
                                  {
                                    ...questionForm,
                                    correctOption:
                                      parseInt(
                                        e.target
                                          .value
                                      ),
                                  }
                                )
                              }
                              style={
                                selectStyle
                              }
                              className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${inputClasses}`}
                            >

                              {questionForm.options.map(
                                (
                                  _,
                                  idx
                                ) => (

                                  <option
                                    key={
                                      idx
                                    }
                                    value={
                                      idx
                                    }
                                  >
                                    Option{' '}
                                    {
                                      idx +
                                      1
                                    }
                                  </option>

                                )
                              )}

                            </select>

                          </div>

                          <div>

                            <label
                              className={`block text-sm font-medium mb-1 ${textLabel}`}
                            >
                              Marks
                            </label>

                            <input
                              type="number"
                              min="1"
                              value={
                                questionForm.marks
                              }
                              onChange={e =>
                                setQuestionForm(
                                  {
                                    ...questionForm,
                                    marks:
                                      parseInt(
                                        e.target
                                          .value
                                      ) ||
                                      1,
                                  }
                                )
                              }
                              className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${inputClasses}`}
                            />

                          </div>

                        </div>

                        {/* Attachment */}

                        <div
                          className={`border-t pt-4 mt-2 ${modalBorder}`}
                        >

                          <label
                            className={`block text-sm font-medium mb-2 ${textLabel}`}
                          >
                            Attachment (optional)
                          </label>

                          <div className="flex flex-wrap gap-2 mb-3">

                            <button
                              type="button"
                              onClick={() =>
                                document
                                  .getElementById(
                                    'image-upload'
                                  )
                                  ?.click()
                              }
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
                            >
                              <PhotoIcon className="h-4 w-4" />
                              Image
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                document
                                  .getElementById(
                                    'video-upload'
                                  )
                                  ?.click()
                              }
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700"
                            >
                              <VideoCameraIcon className="h-4 w-4" />
                              Video
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                document
                                  .getElementById(
                                    'audio-upload'
                                  )
                                  ?.click()
                              }
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700"
                            >
                              <MusicalNoteIcon className="h-4 w-4" />
                              Audio
                            </button>

                            {questionForm.attachmentUrl && (

                              <button
                                type="button"
                                onClick={
                                  removeAttachment
                                }
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"
                              >
                                <TrashIcon className="h-4 w-4" />
                                Remove
                              </button>

                            )}

                          </div>

                          {attachmentProgress !== null && (
                            <UploadProgress
                              progress={attachmentProgress}
                              label="Uploading attachment…"
                              className="mt-2"
                            />
                          )}

                          <input
                            id="image-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const file =
                                e.target.files?.[0];

                              if (
                                file
                              ) {
                                handleAttachmentUpload(
                                  file,
                                  'image'
                                );
                              }
                            }}
                          />

                          <input
                            id="video-upload"
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={e => {
                              const file =
                                e.target.files?.[0];

                              if (
                                file
                              ) {
                                handleAttachmentUpload(
                                  file,
                                  'video'
                                );
                              }
                            }}
                          />

                          <input
                            id="audio-upload"
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={e => {
                              const file =
                                e.target.files?.[0];

                              if (
                                file
                              ) {
                                handleAttachmentUpload(
                                  file,
                                  'audio'
                                );
                              }
                            }}
                          />

                          {questionForm.attachmentUrl && (

                            <div className="mt-2">

                              {questionForm.attachmentType ===
                                'image' && (
                                <img
                                  src={
                                    questionForm.attachmentUrl
                                  }
                                  alt="attachment"
                                  className="max-h-40 rounded-lg border"
                                />
                              )}

                              {questionForm.attachmentType ===
                                'video' && (
                                <video
                                  controls
                                  className="max-h-40 rounded-lg border"
                                >
                                  <source
                                    src={
                                      questionForm.attachmentUrl
                                    }
                                  />
                                </video>
                              )}

                              {questionForm.attachmentType ===
                                'audio' && (
                                <audio
                                  controls
                                  src={
                                    questionForm.attachmentUrl
                                  }
                                  className="w-full"
                                />
                              )}

                            </div>

                          )}

                        </div>

                        {/* Buttons */}

                        <div className="flex justify-end gap-3">

                          <button
                            type="button"
                            onClick={() =>
                              resetQuestionForm()
                            }
                            className={`px-4 py-2 rounded-lg ${buttonSecondaryClasses}`}
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            onClick={
                              handleSaveQuestion
                            }
                            disabled={
                              submittingQuestion
                            }
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                          >
                            {submittingQuestion
                              ? 'Saving...'
                              : editingQuestion
                              ? 'Update'
                              : 'Add'}
                          </button>

                        </div>

                      </div>

                    </div>

                    {/* QUESTIONS LIST */}

                    <div>

                      <h4
                        className={`text-lg font-semibold mb-4 ${textPrimary}`}
                      >
                        Questions
                      </h4>

                      {loadingQuestions ? (

                        <div className="flex justify-center py-8">

                          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />

                        </div>

                      ) : questions.length ===
                        0 ? (

                        <p
                          className={`text-center py-8 ${textMuted}`}
                        >
                          No questions yet. Add your first question above.
                        </p>

                      ) : (

                        <div className="space-y-6">

                          {Object.entries(
                            groupedQuestions
                          ).map(
                            (
                              [
                                subjectKey,
                                group,
                              ]
                            ) => (

                              <div
                                key={
                                  subjectKey
                                }
                                className={`rounded-lg border ${
                                  isDark
                                    ? 'border-gray-700'
                                    : 'border-gray-200'
                                }`}
                              >

                                <div
                                  className={`px-4 py-2 border-b ${
                                    isDark
                                      ? 'border-gray-700 bg-white/5'
                                      : 'border-gray-200 bg-gray-100'
                                  } rounded-t-lg`}
                                >

                                  <h5
                                    className={`font-semibold ${
                                      isDark
                                        ? 'text-white'
                                        : 'text-gray-800'
                                    }`}
                                  >
                                    {
                                      group.subjectName
                                    }{' '}
                                    (
                                    {
                                      group.questions
                                        .length
                                    }{' '}
                                    questions)
                                  </h5>

                                </div>

                                <div
                                  className={`divide-y ${
                                    isDark
                                      ? 'divide-gray-700'
                                      : 'divide-gray-200'
                                  }`}
                                >

                                  {group.questions.map(
                                    (
                                      q,
                                      idx
                                    ) => (

                                      <div
                                        key={
                                          q.id
                                        }
                                        className={`p-4 ${
                                          isDark
                                            ? 'bg-white/5'
                                            : 'bg-white'
                                        }`}
                                      >

                                        <div className="flex justify-between items-start">

                                          <div className="flex-1">

                                            <p
                                              className={`font-medium ${textPrimary}`}
                                            >
                                              {idx +
                                                1}
                                              .{' '}
                                              {
                                                q.text
                                              }
                                            </p>

                                            <ul className="mt-2 space-y-1">

                                              {q.options.map(
                                                (
                                                  opt,
                                                  optIdx
                                                ) => (

                                                  <li
                                                    key={
                                                      optIdx
                                                    }
                                                    className={`text-sm ${
                                                      optIdx ===
                                                      q.correctOption
                                                        ? 'text-green-600 font-semibold'
                                                        : isDark
                                                        ? 'text-gray-300'
                                                        : 'text-gray-600'
                                                    }`}
                                                  >
                                                    {optIdx ===
                                                      q.correctOption &&
                                                      '✓ '}
                                                    {
                                                      opt
                                                    }
                                                  </li>

                                                )
                                              )}

                                            </ul>

                                            <p
                                              className={`text-xs mt-2 ${textMuted}`}
                                            >
                                              Marks:{' '}
                                              {
                                                q.marks
                                              }
                                            </p>

                                            {q.attachmentUrl && (

                                              <div className="mt-2">

                                                {q.attachmentType ===
                                                  'image' && (
                                                  <img
                                                    src={
                                                      q.attachmentUrl.startsWith(
                                                        'http'
                                                      )
                                                        ? q.attachmentUrl
                                                        : `${SERVER_URL}${q.attachmentUrl}`
                                                    }
                                                    alt="attachment"
                                                    className="h-20 rounded"
                                                  />
                                                )}

                                                {q.attachmentType ===
                                                  'video' && (
                                                  <video
                                                    src={
                                                      q.attachmentUrl.startsWith(
                                                        'http'
                                                      )
                                                        ? q.attachmentUrl
                                                        : `${SERVER_URL}${q.attachmentUrl}`
                                                    }
                                                    className="h-20 rounded"
                                                    controls
                                                  />
                                                )}

                                                {q.attachmentType ===
                                                  'audio' && (
                                                  <audio
                                                    src={
                                                      q.attachmentUrl.startsWith(
                                                        'http'
                                                      )
                                                        ? q.attachmentUrl
                                                        : `${SERVER_URL}${q.attachmentUrl}`
                                                    }
                                                    controls
                                                    className="w-full mt-1"
                                                  />
                                                )}

                                              </div>

                                            )}

                                          </div>

                                          <div className="flex space-x-2 ml-4">

                                            <button
                                              onClick={() =>
                                                openEditQuestion(
                                                  q
                                                )
                                              }
                                              className={`p-1 rounded transition-colors ${
                                                isDark
                                                  ? 'text-blue-400 hover:bg-white/10'
                                                  : 'text-blue-600 hover:bg-blue-100'
                                              }`}
                                            >
                                              <PencilIcon className="h-4 w-4" />
                                            </button>

                                            <button
                                              onClick={() =>
                                                handleDeleteQuestion(
                                                  q
                                                )
                                              }
                                              className={`p-1 rounded transition-colors ${
                                                isDark
                                                  ? 'text-red-400 hover:bg-white/10'
                                                  : 'text-red-600 hover:bg-red-100'
                                              }`}
                                            >
                                              <TrashIcon className="h-4 w-4" />
                                            </button>

                                          </div>

                                        </div>

                                      </div>

                                    )
                                  )}

                                </div>

                              </div>

                            )
                          )}

                        </div>

                      )}

                    </div>

                  </div>

                  <div
                    className={`flex justify-end p-6 border-t ${modalBorder}`}
                  >

                    <button
                      onClick={() =>
                        setShowQuestionModal(
                          false
                        )
                      }
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Close
                    </button>

                  </div>

                </div>

              </motion.div>
            </>

          )}

      </AnimatePresence>

      {/* ========================================================
          ANALYTICS MODAL
      ======================================================== */}

      <AnimatePresence>

        {showAnalyticsModal &&
          analyticsTest && (

            <>
              <motion.div
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                exit={{
                  opacity: 0,
                }}
                onClick={() =>
                  setShowAnalyticsModal(
                    false
                  )
                }
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              />

              <motion.div
                initial={{
                  scale: 0.95,
                  opacity: 0,
                }}
                animate={{
                  scale: 1,
                  opacity: 1,
                }}
                exit={{
                  scale: 0.95,
                  opacity: 0,
                }}
                className="fixed inset-0 flex items-center justify-center z-50 p-4"
              >

                <div
                  className={`w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${modalClasses}`}
                >

                  <div
                    className={`flex justify-between items-center p-6 border-b ${modalBorder}`}
                  >

                    <h3
                      className={`text-xl font-bold ${textPrimary}`}
                    >
                      Test Analytics –{' '}
                      {
                        analyticsTest.name
                      }
                    </h3>

                    <button
                      onClick={() =>
                        setShowAnalyticsModal(
                          false
                        )
                      }
                      className={`p-1 rounded-full ${
                        isDark
                          ? 'hover:bg-gray-700'
                          : 'hover:bg-gray-200'
                      }`}
                    >
                      <XMarkIcon
                        className={`h-5 w-5 ${textMuted}`}
                      />
                    </button>

                  </div>

                  <div className="p-6">

                    {loadingAttempts ? (

                      <div className="flex justify-center py-12">

                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />

                      </div>

                    ) : attempts.length ===
                      0 ? (

                      <p
                        className={`text-center py-8 ${textMuted}`}
                      >
                        No attempts recorded for this test yet.
                      </p>

                    ) : (

                      <>

                        {/* SUMMARY CARDS */}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

                          <div
                            className={`p-4 rounded-xl ${
                              isDark
                                ? 'bg-white/5 border border-white/10'
                                : 'bg-white/60 border border-white/30'
                            }`}
                          >

                            <p
                              className={`text-sm ${textMuted}`}
                            >
                              Total Attempts
                            </p>

                            <p
                              className={`text-3xl font-bold ${textPrimary}`}
                            >
                              {
                                attempts.length
                              }
                            </p>

                          </div>

                          <div
                            className={`p-4 rounded-xl ${
                              isDark
                                ? 'bg-white/5 border border-white/10'
                                : 'bg-white/60 border border-white/30'
                            }`}
                          >

                            <p
                              className={`text-sm ${textMuted}`}
                            >
                              Completed
                            </p>

                            <p
                              className={`text-3xl font-bold ${textPrimary}`}
                            >
                              {
                                attempts.filter(
                                  a =>
                                    a.completed
                                ).length
                              }
                            </p>

                          </div>

                          <div
                            className={`p-4 rounded-xl ${
                              isDark
                                ? 'bg-white/5 border border-white/10'
                                : 'bg-white/60 border border-white/30'
                            }`}
                          >

                            <p
                              className={`text-sm ${textMuted}`}
                            >
                              Average Score
                            </p>

                            <p
                              className={`text-3xl font-bold ${textPrimary}`}
                            >
                              {(
                                attempts.reduce(
                                  (
                                    sum,
                                    a
                                  ) =>
                                    sum +
                                    a.percentage,
                                  0
                                ) /
                                attempts.length
                              ).toFixed(
                                1
                              )}
                              %
                            </p>

                          </div>

                        </div>

                        {/* ATTEMPTS TABLE */}

                        <div className="overflow-x-auto">

                          <table className="min-w-full text-sm">

                            <thead
                              className={`border-b ${modalBorder}`}
                            >

                              <tr>

                                <th
                                  className={`text-left py-2 px-3 ${textLabel}`}
                                >
                                  Student
                                </th>

                                <th
                                  className={`text-left py-2 px-3 ${textLabel}`}
                                >
                                  Adm No
                                </th>

                                <th
                                  className={`text-center py-2 px-3 ${textLabel}`}
                                >
                                  Score (%)
                                </th>

                                <th
                                  className={`text-center py-2 px-3 ${textLabel}`}
                                >
                                  Time Taken
                                </th>

                                <th
                                  className={`text-center py-2 px-3 ${textLabel}`}
                                >
                                  Completed
                                </th>

                              </tr>

                            </thead>

                            <tbody
                              className={`divide-y ${
                                isDark
                                  ? 'divide-gray-700'
                                  : 'divide-gray-200'
                              }`}
                            >

                              {attempts.map(
                                attempt => (

                                  <tr
                                    key={
                                      attempt.id
                                    }
                                  >

                                    <td
                                      className={`py-2 px-3 ${textPrimary}`}
                                    >
                                      {
                                        attempt.studentName
                                      }
                                    </td>

                                    <td
                                      className={`py-2 px-3 ${textSecondary}`}
                                    >
                                      {
                                        attempt.admissionNumber ||
                                        '—'
                                      }
                                    </td>

                                    <td
                                      className={`text-center py-2 px-3 font-medium ${textPrimary}`}
                                    >
                                      {attempt.percentage.toFixed(
                                        1
                                      )}
                                      %
                                    </td>

                                    <td
                                      className={`text-center py-2 px-3 ${textSecondary}`}
                                    >
                                      {formatTimeTaken(
                                        attempt.timeTakenSeconds
                                      )}
                                    </td>

                                    <td className="text-center py-2 px-3">

                                      {attempt.completed ? (

                                        <span className="inline-flex items-center gap-1 text-green-500">

                                          <CheckIcon className="h-4 w-4" />

                                          Yes

                                        </span>

                                      ) : (

                                        <span className="inline-flex items-center gap-1 text-red-500">

                                          <XMarkIcon className="h-4 w-4" />

                                          No

                                        </span>

                                      )}

                                    </td>

                                  </tr>

                                )
                              )}

                            </tbody>

                          </table>

                        </div>

                        {/* PUSH TO RESULTS */}

                        <div
                          className={`mt-6 p-4 rounded-xl ${
                            isDark
                              ? 'bg-white/5 border border-white/10'
                              : 'bg-white/60 border border-white/30'
                          }`}
                        >

                          <h4
                            className={`text-md font-semibold mb-3 ${textPrimary}`}
                          >
                            Push to Student Results
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                            {/* Academic Year */}

                            <div>

                              <label
                                className={`block text-xs mb-1 ${textMuted}`}
                              >
                                Academic Year
                              </label>

                              <select
                                value={
                                  exportForm.academicYearId
                                }
                                onChange={e =>
                                  setExportForm(
                                    prev => ({
                                      ...prev,
                                      academicYearId:
                                        e
                                          .target
                                          .value,
                                    })
                                  )
                                }
                                style={
                                  selectStyle
                                }
                                className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 ${inputClasses}`}
                              >

                                <option value="">
                                  Select year
                                </option>

                                {academicYears.map(
                                  y => (
                                    <option
                                      key={
                                        y.id
                                      }
                                      value={
                                        y.id
                                      }
                                    >
                                      {
                                        y.name
                                      }
                                    </option>
                                  )
                                )}

                              </select>

                            </div>

                            {/* Term */}

                            <div>

                              <label
                                className={`block text-xs mb-1 ${textMuted}`}
                              >
                                Term
                              </label>

                              <select
                                value={
                                  exportForm.term
                                }
                                onChange={e =>
                                  setExportForm(
                                    prev => ({
                                      ...prev,
                                      term:
                                        e
                                          .target
                                          .value,
                                    })
                                  )
                                }
                                style={
                                  selectStyle
                                }
                                className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 ${inputClasses}`}
                              >

                                <option>
                                  First Term
                                </option>

                                <option>
                                  Second Term
                                </option>

                                <option>
                                  Third Term
                                </option>

                              </select>

                            </div>

                            {/* Result Type */}

                            <div>

                              <label
                                className={`block text-xs mb-1 ${textMuted}`}
                              >
                                Save as
                              </label>

                              <select
                                value={
                                  exportForm.resultType
                                }
                                onChange={e =>
                                  setExportForm(
                                    prev => ({
                                      ...prev,
                                      resultType:
                                        e
                                          .target
                                          .value as
                                          | 'ca1'
                                          | 'ca2'
                                          | 'exam',
                                    })
                                  )
                                }
                                style={
                                  selectStyle
                                }
                                className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 ${inputClasses}`}
                              >

                                <option value="ca1">
                                  First CA
                                </option>

                                <option value="ca2">
                                  Second CA
                                </option>

                                <option value="exam">
                                  Exam Score
                                </option>

                              </select>

                            </div>

                          </div>

                          <button
                            onClick={
                              pushToResults
                            }
                            disabled={
                              exportingResults ||
                              !exportForm.academicYearId
                            }
                            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium hover:shadow-lg disabled:opacity-50"
                          >

                            {exportingResults ? (

                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />

                            ) : (

                              <AcademicCapIcon className="h-4 w-4" />

                            )}

                            {exportingResults
                              ? 'Pushing...'
                              : 'Push to Results'}

                          </button>

                        </div>

                      </>

                    )}

                  </div>

                  <div
                    className={`flex justify-end p-6 border-t ${modalBorder}`}
                  >

                    <button
                      onClick={() =>
                        setShowAnalyticsModal(
                          false
                        )
                      }
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Close
                    </button>

                  </div>

                </div>

              </motion.div>
            </>

          )}

      </AnimatePresence>

    </div>
  );
}