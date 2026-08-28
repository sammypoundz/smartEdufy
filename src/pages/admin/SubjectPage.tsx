import { useEffect, useState } from 'react';
import {
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { formatArm } from '../../utils/arm';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

import {
  ArrowLeftIcon,
  BookOpenIcon,
  AcademicCapIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

// ======================================================
// TYPES
// ======================================================

interface Topic {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
}

interface Subject {
  id: string;
  name: string;

  teacher?: {
    id: string;
    name: string;
    email?: string;
  };

  description?: string;

  class?: {
    id: string;
    name: string;
  };

  arm?: {
    id: string;
    letter: string;
  };
}

interface PerformanceData {
  currentGrade: number;
  gradeLetter: string;
  assignmentsCompleted: number;
  totalAssignments: number;

  recentAssessments: Array<{
    name: string;
    score: string;
    grade: string;
    date: string;
  }>;
}

type ActiveTab =
  | 'overview'
  | 'curriculum'
  | 'performance';

// ======================================================
// COMPONENT
// ======================================================

export default function SubjectPage() {
  const { theme } = useTheme();
  const { token } = useAuth();

  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const isDark = theme === 'dark';

  // ======================================================
  // STATE
  // ======================================================

  const [subject, setSubject] =
    useState<Subject | null>(null);

  const [topics, setTopics] =
    useState<Topic[]>([]);

  const [performance, setPerformance] =
    useState<PerformanceData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [activeTab, setActiveTab] =
    useState<ActiveTab>('overview');

  const [updatingTopic, setUpdatingTopic] =
    useState<string | null>(null);

  /*
   * We first attempt to get armId from navigation state.
   * If it is not available, it will be resolved from
   * the subject API response.
   */
  const navigationArmId =
    (location.state as { armId?: string } | null)
      ?.armId || null;

  const [armId, setArmId] =
    useState<string | null>(navigationArmId);

  const [armIdError, setArmIdError] =
    useState(false);

  // ======================================================
  // TOPIC MODAL
  // ======================================================

  const [showTopicModal, setShowTopicModal] =
    useState(false);

  const [editingTopic, setEditingTopic] =
    useState<Topic | null>(null);

  const [topicForm, setTopicForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    completed: false,
  });

  const [savingTopic, setSavingTopic] =
    useState(false);

  // ======================================================
  // FETCH SUBJECT
  // ======================================================

  const fetchSubject = async (
    requestedArmId: string | null
  ): Promise<Subject | null> => {
    if (!token || !id) {
      return null;
    }

    try {
      let url = `/subjects/${id}`;

      if (requestedArmId) {
        url += `?armId=${encodeURIComponent(
          requestedArmId
        )}`;
      }

      const res = await api.get(url, token);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(
          errorText || 'Failed to fetch subject'
        );
      }

      const data: Subject = await res.json();

      setSubject(data);

      /*
       * If armId wasn't supplied through navigation,
       * use the arm returned by the backend.
       */
      if (!requestedArmId && data.arm?.id) {
        setArmId(data.arm.id);
        setArmIdError(false);
      }

      return data;
    } catch (error) {
      console.error(
        'Failed to fetch subject:',
        error
      );

      toast.error(
        'Failed to load subject details'
      );

      return null;
    }
  };

  // ======================================================
  // FETCH CURRICULUM
  // ======================================================

  const fetchCurriculum = async (
    currentArmId: string | null
  ): Promise<void> => {
    if (!token || !id || !currentArmId) {
      return;
    }

    try {
      const res = await api.get(
        `/subjects/${id}/curriculum?armId=${encodeURIComponent(
          currentArmId
        )}`,
        token
      );

      if (!res.ok) {
        const errorText = await res.text();

        throw new Error(
          errorText || 'Failed to fetch curriculum'
        );
      }

      const data = await res.json();

      setTopics(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error(
        'Failed to fetch curriculum:',
        error
      );

      toast.error(
        'Failed to load curriculum'
      );

      setTopics([]);
    }
  };

  // ======================================================
  // FETCH PERFORMANCE
  // ======================================================

  const fetchPerformance = async (
    currentArmId: string | null
  ): Promise<void> => {
    if (!token || !id || !currentArmId) {
      return;
    }

    try {
      const res = await api.get(
        `/subjects/${id}/performance?armId=${encodeURIComponent(
          currentArmId
        )}`,
        token
      );

      if (!res.ok) {
        setPerformance(null);
        return;
      }

      const data: PerformanceData =
        await res.json();

      setPerformance(data);
    } catch (error) {
      console.error(
        'Failed to fetch performance:',
        error
      );

      setPerformance(null);
    }
  };

  // ======================================================
  // CREATE TOPIC
  // ======================================================

  const createTopic = async () => {
    if (!token || !id || !armId) {
      toast.error(
        'No class arm information available'
      );
      return;
    }

    const title = topicForm.title.trim();

    if (!title) {
      toast.error('Topic title is required');
      return;
    }

    setSavingTopic(true);

    try {
      const payload = {
        title,
        description:
          topicForm.description.trim() || undefined,
        dueDate:
          topicForm.dueDate || undefined,
        completed: topicForm.completed,
      };

      const res = await api.post(
        `/subjects/${id}/curriculum?armId=${encodeURIComponent(
          armId
        )}`,
        payload,
        token
      );

      if (!res.ok) {
        const errorText = await res.text();

        throw new Error(
          errorText || 'Failed to create topic'
        );
      }

      toast.success(
        'Topic added successfully'
      );

      await fetchCurriculum(armId);

      closeTopicModal();
    } catch (error: any) {
      console.error(
        'Failed to create topic:',
        error
      );

      toast.error(
        error?.message ||
          'Failed to create topic'
      );
    } finally {
      setSavingTopic(false);
    }
  };

  // ======================================================
  // UPDATE TOPIC
  // ======================================================

  const updateTopic = async () => {
    if (
      !token ||
      !id ||
      !editingTopic
    ) {
      return;
    }

    if (!armId) {
      toast.error(
        'No class arm information available'
      );
      return;
    }

    const title = topicForm.title.trim();

    if (!title) {
      toast.error('Topic title is required');
      return;
    }

    setSavingTopic(true);

    try {
      const payload = {
        title,
        description:
          topicForm.description.trim() || undefined,
        dueDate:
          topicForm.dueDate || undefined,
        completed: topicForm.completed,
      };

      const res = await api.put(
        `/subjects/${id}/curriculum/${editingTopic.id}`,
        payload,
        token
      );

      if (!res.ok) {
        const errorText = await res.text();

        throw new Error(
          errorText || 'Failed to update topic'
        );
      }

      toast.success(
        'Topic updated successfully'
      );

      await fetchCurriculum(armId);

      closeTopicModal();
    } catch (error: any) {
      console.error(
        'Failed to update topic:',
        error
      );

      toast.error(
        error?.message ||
          'Failed to update topic'
      );
    } finally {
      setSavingTopic(false);
    }
  };

  // ======================================================
  // DELETE TOPIC
  // ======================================================

  const deleteTopic = async (
    topicId: string
  ) => {
    if (!token || !id) {
      return;
    }

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',

      showCancelButton: true,

      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#2563eb',

      confirmButtonText:
        'Yes, delete it!',

      background: isDark
        ? '#111827'
        : '#ffffff',

      color: isDark
        ? '#f9fafb'
        : '#111827',
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const res = await api.del(
        `/subjects/${id}/curriculum/${topicId}`,
        token
      );

      if (!res.ok) {
        const errorText = await res.text();

        throw new Error(
          errorText || 'Failed to delete topic'
        );
      }

      toast.success('Topic deleted');

      await fetchCurriculum(armId);
    } catch (error: any) {
      console.error(
        'Failed to delete topic:',
        error
      );

      toast.error(
        error?.message ||
          'Failed to delete topic'
      );
    }
  };

  // ======================================================
  // TOGGLE TOPIC COMPLETION
  // ======================================================

  const toggleTopicCompletion = async (
    topicId: string,
    currentStatus: boolean
  ) => {
    if (!token || !id) {
      return;
    }

    setUpdatingTopic(topicId);

    /*
     * Optimistic UI update.
     */
    setTopics(prev =>
      prev.map(topic =>
        topic.id === topicId
          ? {
              ...topic,
              completed: !currentStatus,
            }
          : topic
      )
    );

    try {
      const res = await api.patch(
        `/subjects/${id}/curriculum/${topicId}`,
        {
          completed: !currentStatus,
        },
        token
      );

      if (!res.ok) {
        const errorText = await res.text();

        throw new Error(
          errorText ||
            'Failed to update topic status'
        );
      }

      toast.success(
        !currentStatus
          ? 'Topic marked as completed'
          : 'Topic marked as incomplete'
      );
    } catch (error: any) {
      /*
       * Roll back optimistic update.
       */
      setTopics(prev =>
        prev.map(topic =>
          topic.id === topicId
            ? {
                ...topic,
                completed: currentStatus,
              }
            : topic
        )
      );

      console.error(
        'Failed to update topic status:',
        error
      );

      toast.error(
        error?.message ||
          'Failed to update topic status'
      );
    } finally {
      setUpdatingTopic(null);
    }
  };

  // ======================================================
  // FORM HELPERS
  // ======================================================

  const resetTopicForm = () => {
    setTopicForm({
      title: '',
      description: '',
      dueDate: '',
      completed: false,
    });

    setEditingTopic(null);
  };

  const closeTopicModal = () => {
    if (savingTopic) {
      return;
    }

    setShowTopicModal(false);
    resetTopicForm();
  };

  const openAddTopicModal = () => {
    resetTopicForm();
    setShowTopicModal(true);
  };

  const openEditTopicModal = (
    topic: Topic
  ) => {
    setEditingTopic(topic);

    setTopicForm({
      title: topic.title,
      description:
        topic.description || '',
      dueDate: topic.dueDate
        ? topic.dueDate.split('T')[0]
        : '',
      completed: topic.completed,
    });

    setShowTopicModal(true);
  };

  // ======================================================
  // LOAD DATA
  // ======================================================

  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      if (!token || !id) {
        return;
      }

      setLoading(true);
      setArmIdError(false);

      /*
       * Clear old subject-specific data while changing
       * subjects.
       */
      setSubject(null);
      setTopics([]);
      setPerformance(null);

      try {
        /*
         * First load the subject.
         *
         * If navigation supplied armId, use it.
         * Otherwise get armId from the subject response.
         */
        const loadedSubject =
          await fetchSubject(
            navigationArmId
          );

        if (cancelled) {
          return;
        }

        const resolvedArmId =
          navigationArmId ||
          loadedSubject?.arm?.id ||
          null;

        if (!resolvedArmId) {
          setArmId(null);
          setArmIdError(true);

          toast.error(
            'No arm information available. Please go back and select a valid arm.'
          );

          return;
        }

        setArmId(resolvedArmId);
        setArmIdError(false);

        /*
         * Curriculum and performance both require armId.
         */
        await Promise.all([
          fetchCurriculum(
            resolvedArmId
          ),
          fetchPerformance(
            resolvedArmId
          ),
        ]);
      } catch (error) {
        console.error(
          'Failed to load subject page:',
          error
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadAll();

    return () => {
      cancelled = true;
    };

    /*
     * navigationArmId is intentionally included because it
     * represents the arm selected before entering this page.
     */
  }, [
    id,
    token,
    navigationArmId,
  ]);

  // ======================================================
  // CALCULATIONS
  // ======================================================

  const completedCount =
    topics.filter(
      topic => topic.completed
    ).length;

  const progressPercentage =
    topics.length > 0
      ? (completedCount /
          topics.length) *
        100
      : 0;

  const teacherName =
    subject?.teacher?.name ||
    'Not assigned';

  const teacherEmail =
    subject?.teacher?.email ||
    'Not available';

  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
          isDark
            ? 'bg-[#080D1A]'
            : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50'
        }`}
      >
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />

          <p
            className={
              isDark
                ? 'text-gray-300'
                : 'text-gray-700'
            }
          >
            Loading subject...
          </p>
        </div>
      </div>
    );
  }

  // ======================================================
  // ERROR
  // ======================================================

  if (armIdError || !subject) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isDark
            ? 'bg-[#080D1A]'
            : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50'
        }`}
      >
        <div className="text-center px-6">
          <p
            className={`text-xl mb-4 ${
              isDark
                ? 'text-red-400'
                : 'text-red-600'
            }`}
          >
            {armIdError
              ? 'No arm information available'
              : 'Subject not found'}
          </p>

          <button
            onClick={() =>
              navigate(-1)
            }
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ======================================================
  // MAIN UI
  // ======================================================

  return (
    <div
      className={`min-h-screen px-4 sm:px-6 lg:px-8 py-8 transition-all duration-300 ${
        isDark
          ? 'bg-[#080D1A]'
          : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50'
      }`}
    >
      {/* ==================================================
          DARK MODE BACKGROUND
      ================================================== */}

      {isDark && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage: `
                linear-gradient(
                  rgba(59,130,246,0.25) 1px,
                  transparent 1px
                ),
                linear-gradient(
                  90deg,
                  rgba(59,130,246,0.25) 1px,
                  transparent 1px
                )
              `,
              backgroundSize: '60px 60px',
            }}
          />

          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />

          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        </div>
      )}

      {/* ==================================================
          CONTENT
      ================================================== */}

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* ==================================================
            BACK BUTTON
        ================================================== */}

        <motion.button
          initial={{
            opacity: 0,
            x: -10,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          onClick={() =>
            navigate(-1)
          }
          className={`mb-6 inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition ${
            isDark
              ? 'text-gray-300 hover:text-white hover:bg-white/10'
              : 'text-gray-700 hover:text-blue-700 hover:bg-blue-100'
          }`}
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back
        </motion.button>

        {/* ==================================================
            SUBJECT HEADER
        ================================================== */}

        <motion.div
          initial={{
            opacity: 0,
            y: -10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="mb-8"
        >
          <h1
            className={`text-3xl sm:text-4xl font-bold ${
              isDark
                ? 'text-white'
                : 'text-gray-900'
            }`}
          >
            {subject.name}
          </h1>

          <div className="flex flex-wrap gap-4 mt-3">
            {/* TEACHER */}

            <div className="flex items-center gap-2 text-sm">
              <UserIcon
                className={`h-4 w-4 ${
                  isDark
                    ? 'text-blue-400'
                    : 'text-blue-600'
                }`}
              />

              <span
                className={
                  isDark
                    ? 'text-gray-300'
                    : 'text-gray-700'
                }
              >
                Teacher: {teacherName}
              </span>
            </div>

            {/* CLASS */}

            {subject.class && (
              <div className="flex items-center gap-2 text-sm">
                <AcademicCapIcon
                  className={`h-4 w-4 ${
                    isDark
                      ? 'text-indigo-400'
                      : 'text-indigo-600'
                  }`}
                />

                <span
                  className={
                    isDark
                      ? 'text-gray-300'
                      : 'text-gray-700'
                  }
                >
                  Class:{' '}
                  {subject.class.name}{' '}
                  {subject.arm?.letter ? formatArm(subject.arm) : ''}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* ==================================================
            TABS
        ================================================== */}

        <div
          className={`mb-6 border-b ${
            isDark
              ? 'border-gray-800'
              : 'border-gray-300'
          }`}
        >
          <nav className="flex -mb-px space-x-6 sm:space-x-8 overflow-x-auto">
            {[
              {
                id: 'overview' as const,
                label: 'Overview',
                icon: BookOpenIcon,
              },
              {
                id: 'curriculum' as const,
                label: 'Curriculum',
                icon: AcademicCapIcon,
              },
              {
                id: 'performance' as const,
                label: 'Performance',
                icon: ChartBarIcon,
              },
            ].map(tab => {
              const Icon = tab.icon;
              const active =
                activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() =>
                    setActiveTab(tab.id)
                  }
                  className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition flex items-center gap-2 ${
                    active
                      ? isDark
                        ? 'border-blue-500 text-blue-400'
                        : 'border-blue-600 text-blue-600'
                      : isDark
                      ? 'border-transparent text-gray-500 hover:text-gray-300'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ==================================================
            MAIN CONTENT CARD
        ================================================== */}

        <motion.div
          key={activeTab}
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.2,
          }}
          className={`p-5 sm:p-6 rounded-2xl shadow-xl transition-colors ${
            isDark
              ? 'bg-[#111827]/80 border border-gray-800 backdrop-blur-xl'
              : 'bg-white border border-gray-200 shadow-blue-100/50'
          }`}
        >
          {/* ==================================================
              OVERVIEW
          ================================================== */}

          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h2
                  className={`text-xl font-semibold ${
                    isDark
                      ? 'text-white'
                      : 'text-gray-900'
                  }`}
                >
                  About this subject
                </h2>

                <p
                  className={`mt-3 leading-relaxed ${
                    isDark
                      ? 'text-gray-300'
                      : 'text-gray-700'
                  }`}
                >
                  {subject.description ||
                    'No description provided.'}
                </p>
              </div>

              <div
                className={`rounded-xl p-4 border ${
                  isDark
                    ? 'bg-white/[0.03] border-gray-800'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <h3
                  className={`text-md font-semibold mb-2 ${
                    isDark
                      ? 'text-gray-200'
                      : 'text-gray-900'
                  }`}
                >
                  Teacher Contact
                </h3>

                <p
                  className={`text-sm ${
                    isDark
                      ? 'text-gray-400'
                      : 'text-gray-700'
                  }`}
                >
                  Email: {teacherEmail}
                </p>
              </div>
            </div>
          )}

          {/* ==================================================
              CURRICULUM
          ================================================== */}

          {activeTab === 'curriculum' && (
            <div className="space-y-6">
              {/* HEADER */}

              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  {topics.length > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span
                          className={`text-sm font-medium ${
                            isDark
                              ? 'text-gray-300'
                              : 'text-gray-800'
                          }`}
                        >
                          Overall Progress
                        </span>

                        <span
                          className={`text-sm font-medium ${
                            isDark
                              ? 'text-gray-300'
                              : 'text-gray-800'
                          }`}
                        >
                          {completedCount} /{' '}
                          {topics.length}{' '}
                          completed
                        </span>
                      </div>

                      <div
                        className={`w-full rounded-full h-2.5 ${
                          isDark
                            ? 'bg-gray-800'
                            : 'bg-gray-200'
                        }`}
                      >
                        <div
                          className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(
                              progressPercentage,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={
                    openAddTopicModal
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 active:bg-blue-800 transition shadow-sm"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Topic
                </button>
              </div>

              {/* TOPICS */}

              <div className="space-y-3">
                {topics.length === 0 ? (
                  <div
                    className={`text-center py-12 rounded-xl border ${
                      isDark
                        ? 'bg-white/[0.02] border-gray-800'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <AcademicCapIcon
                      className={`mx-auto h-10 w-10 mb-3 ${
                        isDark
                          ? 'text-gray-600'
                          : 'text-gray-400'
                      }`}
                    />

                    <p
                      className={
                        isDark
                          ? 'text-gray-400'
                          : 'text-gray-700'
                      }
                    >
                      No curriculum topics
                      available.
                    </p>

                    <p
                      className={`text-sm mt-1 ${
                        isDark
                          ? 'text-gray-500'
                          : 'text-gray-600'
                      }`}
                    >
                      Click "Add Topic" to
                      get started.
                    </p>
                  </div>
                ) : (
                  topics.map(topic => (
                    <div
                      key={topic.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isDark
                          ? 'bg-white/[0.03] border-gray-800 hover:bg-white/[0.06]'
                          : 'bg-white border-gray-200 hover:border-blue-200 hover:shadow-md'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3
                              className={`font-bold ${
                                isDark
                                  ? 'text-white'
                                  : 'text-gray-900'
                              }`}
                            >
                              {topic.title}
                            </h3>

                            {topic.completed && (
                              <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                            )}
                          </div>

                          {topic.description && (
                            <p
                              className={`text-sm mt-1 ${
                                isDark
                                  ? 'text-gray-400'
                                  : 'text-gray-700'
                              }`}
                            >
                              {topic.description}
                            </p>
                          )}

                          {topic.dueDate && (
                            <div
                              className={`flex items-center gap-1 mt-2 text-xs ${
                                isDark
                                  ? 'text-gray-500'
                                  : 'text-gray-600'
                              }`}
                            >
                              <ClockIcon className="h-3 w-3" />

                              <span>
                                Due:{' '}
                                {new Date(
                                  topic.dueDate
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* EDIT */}

                          <button
                            onClick={() =>
                              openEditTopicModal(
                                topic
                              )
                            }
                            className={`p-2 rounded-lg transition ${
                              isDark
                                ? 'text-blue-400 hover:bg-blue-500/10'
                                : 'text-blue-600 hover:bg-blue-50'
                            }`}
                            title="Edit Topic"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>

                          {/* DELETE */}

                          <button
                            onClick={() =>
                              deleteTopic(
                                topic.id
                              )
                            }
                            className={`p-2 rounded-lg transition ${
                              isDark
                                ? 'text-red-400 hover:bg-red-500/10'
                                : 'text-red-600 hover:bg-red-50'
                            }`}
                            title="Delete Topic"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>

                          {/* COMPLETE */}

                          <button
                            onClick={() =>
                              toggleTopicCompletion(
                                topic.id,
                                topic.completed
                              )
                            }
                            disabled={
                              updatingTopic ===
                              topic.id
                            }
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                              topic.completed
                                ? isDark
                                  ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                                  : 'bg-green-100 text-green-800 hover:bg-green-200'
                                : isDark
                                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            } disabled:opacity-50`}
                          >
                            {updatingTopic ===
                            topic.id ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : topic.completed ? (
                              'Completed'
                            ) : (
                              'Mark Complete'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ==================================================
              PERFORMANCE
          ================================================== */}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              <h2
                className={`text-xl font-semibold ${
                  isDark
                    ? 'text-white'
                    : 'text-gray-900'
                }`}
              >
                Performance Overview
              </h2>

              {performance ? (
                <>
                  {/* SUMMARY */}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* GRADE */}

                    <div
                      className={`p-5 rounded-xl border ${
                        isDark
                          ? 'bg-white/[0.03] border-gray-800'
                          : 'bg-blue-50/50 border-blue-100'
                      }`}
                    >
                      <h3
                        className={`font-medium mb-2 ${
                          isDark
                            ? 'text-gray-300'
                            : 'text-gray-800'
                        }`}
                      >
                        Current Grade
                      </h3>

                      <p
                        className={`text-3xl font-bold ${
                          isDark
                            ? 'text-blue-400'
                            : 'text-blue-700'
                        }`}
                      >
                        {performance.currentGrade}%
                      </p>

                      <p
                        className={`text-sm mt-1 ${
                          isDark
                            ? 'text-gray-400'
                            : 'text-gray-700'
                        }`}
                      >
                        {performance.gradeLetter}
                      </p>
                    </div>

                    {/* ASSIGNMENTS */}

                    <div
                      className={`p-5 rounded-xl border ${
                        isDark
                          ? 'bg-white/[0.03] border-gray-800'
                          : 'bg-green-50/50 border-green-100'
                      }`}
                    >
                      <h3
                        className={`font-medium mb-2 ${
                          isDark
                            ? 'text-gray-300'
                            : 'text-gray-800'
                        }`}
                      >
                        Assignments
                        Completed
                      </h3>

                      <p
                        className={`text-3xl font-bold ${
                          isDark
                            ? 'text-green-400'
                            : 'text-green-700'
                        }`}
                      >
                        {
                          performance.assignmentsCompleted
                        }{' '}
                        /{' '}
                        {
                          performance.totalAssignments
                        }
                      </p>

                      <div
                        className={`w-full rounded-full h-2 mt-3 ${
                          isDark
                            ? 'bg-gray-800'
                            : 'bg-gray-200'
                        }`}
                      >
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{
                            width: `${
                              performance.totalAssignments >
                              0
                                ? Math.min(
                                    (performance.assignmentsCompleted /
                                      performance.totalAssignments) *
                                      100,
                                    100
                                  )
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* RECENT ASSESSMENTS */}

                  <div className="mt-6">
                    <h3
                      className={`font-medium mb-3 ${
                        isDark
                          ? 'text-gray-200'
                          : 'text-gray-900'
                      }`}
                    >
                      Recent Assessments
                    </h3>

                    <div
                      className={`overflow-x-auto rounded-xl border ${
                        isDark
                          ? 'border-gray-800'
                          : 'border-gray-300'
                      }`}
                    >
                      <table
                        className={`min-w-full text-sm ${
                          isDark
                            ? 'text-gray-200'
                            : 'text-gray-900'
                        }`}
                      >
                        <thead
                          className={
                            isDark
                              ? 'bg-gray-900/80'
                              : 'bg-gray-100'
                          }
                        >
                          <tr>
                            <th
                              className={`text-left py-3 px-4 font-bold ${
                                isDark
                                  ? 'text-gray-300'
                                  : 'text-gray-800'
                              }`}
                            >
                              Assessment
                            </th>

                            <th
                              className={`text-left py-3 px-4 font-bold ${
                                isDark
                                  ? 'text-gray-300'
                                  : 'text-gray-800'
                              }`}
                            >
                              Score
                            </th>

                            <th
                              className={`text-left py-3 px-4 font-bold ${
                                isDark
                                  ? 'text-gray-300'
                                  : 'text-gray-800'
                              }`}
                            >
                              Grade
                            </th>

                            <th
                              className={`text-left py-3 px-4 font-bold ${
                                isDark
                                  ? 'text-gray-300'
                                  : 'text-gray-800'
                              }`}
                            >
                              Date
                            </th>
                          </tr>
                        </thead>

                        <tbody
                          className={
                            isDark
                              ? 'bg-transparent'
                              : 'bg-white'
                          }
                        >
                          {performance.recentAssessments
                            .length > 0 ? (
                            performance.recentAssessments.map(
                              (
                                assessment,
                                index
                              ) => (
                                <tr
                                  key={`${assessment.name}-${index}`}
                                  className={`border-t transition ${
                                    isDark
                                      ? 'border-gray-800 hover:bg-white/[0.04]'
                                      : 'border-gray-200 hover:bg-blue-50/50'
                                  }`}
                                >
                                  <td
                                    className={`py-3 px-4 font-semibold ${
                                      isDark
                                        ? 'text-white'
                                        : 'text-gray-900'
                                    }`}
                                  >
                                    {
                                      assessment.name
                                    }
                                  </td>

                                  <td
                                    className={`py-3 px-4 font-medium ${
                                      isDark
                                        ? 'text-gray-200'
                                        : 'text-gray-800'
                                    }`}
                                  >
                                    {
                                      assessment.score
                                    }
                                  </td>

                                  <td
                                    className={`py-3 px-4 ${
                                      isDark
                                        ? 'text-gray-200'
                                        : 'text-gray-800'
                                    }`}
                                  >
                                    <span
                                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                                        isDark
                                          ? 'bg-green-500/10 text-green-400'
                                          : 'bg-green-100 text-green-800'
                                      }`}
                                    >
                                      {
                                        assessment.grade
                                      }
                                    </span>
                                  </td>

                                  <td
                                    className={`py-3 px-4 font-medium ${
                                      isDark
                                        ? 'text-gray-300'
                                        : 'text-gray-700'
                                    }`}
                                  >
                                    {
                                      assessment.date
                                    }
                                  </td>
                                </tr>
                              )
                            )
                          ) : (
                            <tr>
                              <td
                                colSpan={4}
                                className={`py-10 px-4 text-center ${
                                  isDark
                                    ? 'text-gray-500'
                                    : 'text-gray-600'
                                }`}
                              >
                                No recent
                                assessments
                                available.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div
                  className={`text-center py-12 rounded-xl border ${
                    isDark
                      ? 'border-gray-800 text-gray-500'
                      : 'border-gray-300 text-gray-600'
                  }`}
                >
                  No performance data
                  available for this arm.
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* ==================================================
          TOPIC MODAL
      ================================================== */}

      <AnimatePresence>
        {showTopicModal && (
          <>
            {/* OVERLAY */}

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
              onClick={() => {
                if (!savingTopic) {
                  closeTopicModal();
                }
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />

            {/* MODAL */}

            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
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
                onClick={event =>
                  event.stopPropagation()
                }
                className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${
                  isDark
                    ? 'bg-[#111827] border border-gray-800'
                    : 'bg-white border border-gray-200'
                }`}
              >
                {/* HEADER */}

                <div
                  className={`flex justify-between items-center p-6 border-b ${
                    isDark
                      ? 'border-gray-800'
                      : 'border-gray-200'
                  }`}
                >
                  <h3
                    className={`text-xl font-bold ${
                      isDark
                        ? 'text-white'
                        : 'text-gray-900'
                    }`}
                  >
                    {editingTopic
                      ? 'Edit Topic'
                      : 'Add New Topic'}
                  </h3>

                  <button
                    onClick={() =>
                      closeTopicModal()
                    }
                    disabled={savingTopic}
                    className={`p-1.5 rounded-full transition disabled:opacity-50 ${
                      isDark
                        ? 'hover:bg-gray-800'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <XMarkIcon
                      className={`h-5 w-5 ${
                        isDark
                          ? 'text-gray-400'
                          : 'text-gray-500'
                      }`}
                    />
                  </button>
                </div>

                {/* BODY */}

                <div className="p-6 space-y-4">
                  {/* TITLE */}

                  <div>
                    <label
                      className={`block text-sm font-medium mb-1.5 ${
                        isDark
                          ? 'text-gray-300'
                          : 'text-gray-800'
                      }`}
                    >
                      Title *
                    </label>

                    <input
                      type="text"
                      value={topicForm.title}
                      onChange={event =>
                        setTopicForm(
                          previous => ({
                            ...previous,
                            title:
                              event.target
                                .value,
                          })
                        )
                      }
                      disabled={savingTopic}
                      className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${
                        isDark
                          ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                      }`}
                      placeholder="e.g., Introduction to Algebra"
                    />
                  </div>

                  {/* DESCRIPTION */}

                  <div>
                    <label
                      className={`block text-sm font-medium mb-1.5 ${
                        isDark
                          ? 'text-gray-300'
                          : 'text-gray-800'
                      }`}
                    >
                      Description
                    </label>

                    <textarea
                      rows={3}
                      value={
                        topicForm.description
                      }
                      onChange={event =>
                        setTopicForm(
                          previous => ({
                            ...previous,
                            description:
                              event.target
                                .value,
                          })
                        )
                      }
                      disabled={savingTopic}
                      className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-60 ${
                        isDark
                          ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                      }`}
                      placeholder="Optional description"
                    />
                  </div>

                  {/* DATE */}

                  <div>
                    <label
                      className={`block text-sm font-medium mb-1.5 ${
                        isDark
                          ? 'text-gray-300'
                          : 'text-gray-800'
                      }`}
                    >
                      Due Date
                      (optional)
                    </label>

                    <input
                      type="date"
                      value={
                        topicForm.dueDate
                      }
                      onChange={event =>
                        setTopicForm(
                          previous => ({
                            ...previous,
                            dueDate:
                              event.target
                                .value,
                          })
                        )
                      }
                      disabled={savingTopic}
                      className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${
                        isDark
                          ? 'bg-gray-900 border-gray-700 text-white focus:border-blue-500'
                          : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                      }`}
                    />
                  </div>

                  {/* COMPLETED */}

                  <label
                    className={`flex items-center gap-2 cursor-pointer ${
                      isDark
                        ? 'text-gray-300'
                        : 'text-gray-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={
                        topicForm.completed
                      }
                      onChange={event =>
                        setTopicForm(
                          previous => ({
                            ...previous,
                            completed:
                              event.target
                                .checked,
                          })
                        )
                      }
                      disabled={savingTopic}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />

                    <span className="text-sm">
                      Mark as completed
                    </span>
                  </label>
                </div>

                {/* FOOTER */}

                <div
                  className={`flex justify-end gap-3 p-6 border-t ${
                    isDark
                      ? 'border-gray-800'
                      : 'border-gray-200'
                  }`}
                >
                  <button
                    onClick={() =>
                      closeTopicModal()
                    }
                    disabled={savingTopic}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50 ${
                      isDark
                        ? 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={
                      editingTopic
                        ? updateTopic
                        : createTopic
                    }
                    disabled={
                      savingTopic ||
                      !topicForm.title.trim()
                    }
                    className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition inline-flex items-center justify-center min-w-[90px]"
                  >
                    {savingTopic ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Saving...
                      </>
                    ) : editingTopic ? (
                      'Update'
                    ) : (
                      'Create'
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}