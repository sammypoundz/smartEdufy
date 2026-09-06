import { useState, useEffect, useRef } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { unwrapRes } from '../../hooks/queryHelpers';
import { uploadWithProgress } from '../../utils/upload';
import UploadProgress from '../../components/UploadProgress';
import { formatArm } from '../../utils/arm';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import {
  DocumentArrowDownIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  XMarkIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';

// Types
interface LessonPlan {
  id: string;
  title: string;
  description?: string;
  classId: string;
  className?: string;
  armId: string;
  armLetter?: string;
  subjectId: string;
  subjectName?: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  status: 'DRAFT' | 'APPROVED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

interface ClassOption {
  id: string;
  name: string;
  arms?: ArmOption[];
}

interface ArmOption {
  id: string;
  letter: string;
  classId: string;
}

interface SubjectOption {
  id: string;
  name: string;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 },
};

export default function AdminLessonPlan() {
  const { theme } = useTheme();
  const { token } = useAuth();

  // State
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<LessonPlan | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Dropdown portal state
  const [dropdownState, setDropdownState] = useState<{
    plan: LessonPlan;
    position: { top: number; left: number };
  } | null>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Filters
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedArmId, setSelectedArmId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    classId: '',
    armId: '',
    subjectId: '',
    status: 'DRAFT' as 'DRAFT' | 'APPROVED' | 'ARCHIVED',
    file: null as File | null,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownState) {
        const target = event.target as HTMLElement;
        if (!target.closest('.action-dropdown') && !target.closest('.action-dropdown-button')) {
          setDropdownState(null);
        }
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [dropdownState]);

  // ---------- Queries ----------
  const lessonPlansQuery = useQuery<LessonPlan[]>({
    queryKey: ['lesson-plans', token, selectedClassId, selectedArmId, selectedSubjectId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedClassId) params.append('classId', selectedClassId);
      if (selectedArmId) params.append('armId', selectedArmId);
      if (selectedSubjectId) params.append('subjectId', selectedSubjectId);
      const url = `/lesson-plans${params.toString() ? `?${params}` : ''}`;
      return unwrapRes<LessonPlan[]>(api.get(url, token!));
    },
    enabled: !!token,
    placeholderData: keepPreviousData,
  });

  const classesQuery = useQuery<ClassOption[]>({
    queryKey: ['classes'],
    queryFn: () => unwrapRes<ClassOption[]>(api.get('/classes', token!)),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  const subjectsQuery = useQuery<SubjectOption[]>({
    queryKey: ['subjects'],
    queryFn: () => unwrapRes<SubjectOption[]>(api.get('/subjects', token!)),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  const lessonPlans = lessonPlansQuery.data ?? [];
  const classes = classesQuery.data ?? [];
  const subjects = subjectsQuery.data ?? [];
  const loading = lessonPlansQuery.isLoading;
  const queryClient = useQueryClient();
  const invalidateLessonPlans = () =>
    queryClient.invalidateQueries({ queryKey: ['lesson-plans'] });

  useEffect(() => {
    if (lessonPlansQuery.error) {
      console.error(lessonPlansQuery.error);
      toast.error('Failed to load lesson plans');
    }
  }, [lessonPlansQuery.error]);

  // Get arms for selected class
  const getArmsForClass = () => {
    const selectedClass = classes.find(c => c.id === selectedClassId);
    return selectedClass?.arms || [];
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      classId: '',
      armId: '',
      subjectId: '',
      status: 'DRAFT',
      file: null,
    });
    setEditingPlan(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (plan: LessonPlan) => {
    setEditingPlan(plan);
    setFormData({
      title: plan.title,
      description: plan.description || '',
      classId: plan.classId,
      armId: plan.armId,
      subjectId: plan.subjectId,
      status: plan.status,
      file: null,
    });
    setSelectedClassId(plan.classId);
    setSelectedArmId(plan.armId);
    setShowModal(true);
    setDropdownState(null);
  };

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.classId || !formData.armId || !formData.subjectId) {
      toast.error('Please fill all required fields');
      return;
    }
    if (!editingPlan && !formData.file) {
      toast.error('Please select a file to upload');
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('title', formData.title);
      if (formData.description) form.append('description', formData.description);
      form.append('classId', formData.classId);
      form.append('armId', formData.armId);
      form.append('subjectId', formData.subjectId);
      form.append('status', formData.status);
      if (formData.file) form.append('file', formData.file);

      const onProgress = setUploadProgress;
      if (editingPlan) {
        if (formData.file) {
          // New file attached — upload with progress (PUT, includes file)
          onProgress(0);
          await uploadWithProgress(`/lesson-plans/${editingPlan.id}`, form, token, onProgress, 'PUT');
        } else {
          // Text-only update
          const res = await api.put(`/lesson-plans/${editingPlan.id}`, form, token);
          if (!res.ok) throw new Error(await res.text());
        }
      } else {
        onProgress(0);
        await uploadWithProgress('/lesson-plans', form, token, onProgress);
      }
      toast.success(editingPlan ? 'Lesson plan updated' : 'Lesson plan uploaded');
      setShowModal(false);
      invalidateLessonPlans();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async (plan: LessonPlan) => {
    setDropdownState(null);
    const result = await Swal.fire({
      title: 'Delete Lesson Plan',
      text: `Delete "${plan.title}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete',
    });
    if (!result.isConfirmed) return;
    try {
      const res = await api.del(`/lesson-plans/${plan.id}`, token);
      if (!res.ok) throw new Error(await res.text());
      toast.success('Lesson plan deleted');
      invalidateLessonPlans();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDownload = async (plan: LessonPlan) => {
    setDropdownState(null);
    try {
      const res = await api.get(`/lesson-plans/${plan.id}/download`, token);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = plan.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error('Download failed');
    }
  };

  const handleView = async (plan: LessonPlan) => {
    setDropdownState(null);
    try {
      const res = await api.get(`/lesson-plans/${plan.id}/download`, token);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Revoke after a delay to allow the new tab to load
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      toast.error('Could not open file');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      DRAFT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      ARCHIVED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
    };
    return styles[status as keyof typeof styles] || styles.DRAFT;
  };

  // Open dropdown with position calculation
  const openDropdown = (plan: LessonPlan, button: HTMLButtonElement) => {
    const rect = button.getBoundingClientRect();
    setDropdownState({
      plan,
      position: {
        top: rect.bottom + window.scrollY + 4,
        left: rect.right + window.scrollX - 160, // align right edge with button
      },
    });
  };

  return (
    <div className={`min-h-screen px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
    }`}>
      {/* Background pattern */}
      {theme === 'dark' && (
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `linear-gradient(rgba(59,130,246,0.1) 1px,transparent 1px), linear-gradient(90deg,rgba(59,130,246,0.1) 1px,transparent 1px)`, backgroundSize: '60px 60px' }} />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="sm:flex sm:items-center sm:justify-between mb-8">
          <div>
            <h2 className={`text-2xl font-bold ${
              theme === 'dark' ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent' : 'bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent'
            }`}>Lesson Plans</h2>
            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Upload and manage lesson plans by class, arm, and subject.</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openCreateModal}
            className="mt-4 sm:mt-0 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg hover:from-blue-600 hover:to-indigo-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" /> Upload Plan
          </motion.button>
        </motion.div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedArmId('');
              }}
              className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-400'
              }`}
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <select
              value={selectedArmId}
              onChange={(e) => setSelectedArmId(e.target.value)}
              disabled={!selectedClassId}
              className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500 disabled:opacity-50'
                  : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-400 disabled:opacity-50'
              }`}
            >
              <option value="">All Arms</option>
              {getArmsForClass().map(arm => (
                <option key={arm.id} value={arm.id}>{formatArm(arm)}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-400'
              }`}
            >
              <option value="">All Subjects</option>
              {subjects.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <motion.div variants={container} initial="hidden" animate="show" className="rounded-2xl shadow-xl overflow-hidden">
          <div className={`overflow-x-auto ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/30 backdrop-blur-md border border-white/20'}`}>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : lessonPlans.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No lesson plans found.</div>
            ) : (
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className={`py-4 pl-6 pr-3 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Title</th>
                    <th className={`px-3 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Class / Arm</th>
                    <th className={`px-3 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Subject</th>
                    <th className={`px-3 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Uploaded</th>
                    <th className={`px-3 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Status</th>
                    <th className={`relative py-4 pl-3 pr-6 text-right text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/10' : 'divide-gray-200/50'}`}>
                  {lessonPlans.map((plan) => (
                    <motion.tr key={plan.id} variants={item} whileHover={{ backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(59,130,246,0.05)' }} className="transition-colors">
                      <td className={`whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{plan.title}</td>
                      <td className={`whitespace-nowrap px-3 py-4 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {plan.className} Arm {plan.armLetter}
                      </td>
                      <td className={`whitespace-nowrap px-3 py-4 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{plan.subjectName}</td>
                      <td className={`whitespace-nowrap px-3 py-4 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {new Date(plan.createdAt).toLocaleDateString()}
                      </td>
                      <td className={`whitespace-nowrap px-3 py-4 text-sm`}>
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusBadge(plan.status)}`}>
                          {plan.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm">
                        <button
                          ref={(el) => {
                            if (el) buttonRefs.current.set(plan.id, el);
                            else buttonRefs.current.delete(plan.id);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const btn = buttonRefs.current.get(plan.id);
                            if (btn) {
                              if (dropdownState?.plan.id === plan.id) {
                                setDropdownState(null);
                              } else {
                                openDropdown(plan, btn);
                              }
                            }
                          }}
                          className="action-dropdown-button p-1 rounded-lg transition-colors inline-flex items-center justify-center"
                          style={{ width: '32px', height: '32px' }}
                        >
                          <EllipsisVerticalIcon className={`h-5 w-5 ${
                            theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                          }`} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </div>

      {/* Dropdown Portal */}
      {dropdownState && createPortal(
        <div
          className="action-dropdown fixed z-50 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none"
          style={{
            top: dropdownState.position.top,
            left: dropdownState.position.left,
          }}
        >
          <div className="py-1">
            <button
              onClick={() => handleView(dropdownState.plan)}
              className={`flex items-center w-full px-4 py-2 text-sm ${
                theme === 'dark'
                  ? 'text-gray-300 hover:bg-white/10'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <EyeIcon className="h-4 w-4 mr-2" /> View
            </button>
            <button
              onClick={() => handleDownload(dropdownState.plan)}
              className={`flex items-center w-full px-4 py-2 text-sm ${
                theme === 'dark'
                  ? 'text-gray-300 hover:bg-white/10'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" /> Download
            </button>
            <button
              onClick={() => openEditModal(dropdownState.plan)}
              className={`flex items-center w-full px-4 py-2 text-sm ${
                theme === 'dark'
                  ? 'text-gray-300 hover:bg-white/10'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <PencilIcon className="h-4 w-4 mr-2" /> Edit
            </button>
            <button
              onClick={() => handleDelete(dropdownState.plan)}
              className={`flex items-center w-full px-4 py-2 text-sm text-red-600 ${
                theme === 'dark'
                  ? 'hover:bg-white/10'
                  : 'hover:bg-gray-100'
              }`}
            >
              <TrashIcon className="h-4 w-4 mr-2" /> Delete
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Modal for Create/Edit */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}
              >
                <div className={`flex justify-between items-center p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {editingPlan ? 'Edit Lesson Plan' : 'Upload Lesson Plan'}
                  </h3>
                  <button onClick={() => setShowModal(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                    <XMarkIcon className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                        theme === 'dark'
                          ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                          : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-400'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                        theme === 'dark'
                          ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                          : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-400'
                      }`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Class *</label>
                      <select
                        value={formData.classId}
                        onChange={(e) => {
                          setFormData({ ...formData, classId: e.target.value, armId: '' });
                          setSelectedClassId(e.target.value);
                        }}
                        className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                          theme === 'dark'
                            ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                            : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-400'
                        }`}
                      >
                        <option value="">Select Class</option>
                        {classes.map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Arm *</label>
                      <select
                        value={formData.armId}
                        onChange={(e) => setFormData({ ...formData, armId: e.target.value })}
                        disabled={!formData.classId}
                        className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                          theme === 'dark'
                            ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500 disabled:opacity-50'
                            : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-400 disabled:opacity-50'
                        }`}
                      >
                        <option value="">Select Arm</option>
                        {getArmsForClass().map(arm => (
                          <option key={arm.id} value={arm.id}>{formatArm(arm)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Subject *</label>
                    <select
                      value={formData.subjectId}
                      onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                      className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                        theme === 'dark'
                          ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                          : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-400'
                      }`}
                    >
                      <option value="">Select Subject</option>
                      {subjects.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                        theme === 'dark'
                          ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                          : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-400'
                      }`}
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="APPROVED">Approved</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      File {!editingPlan && '*'}
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                      accept=".pdf,.doc,.docx,.ppt,.pptx"
                      className={`w-full ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                    />
                    {editingPlan && !formData.file && (
                      <p className="text-xs text-gray-500 mt-1">Leave empty to keep current file</p>
                    )}
                    {uploadProgress !== null && (
                      <UploadProgress
                        progress={uploadProgress}
                        label={formData.file ? `Uploading ${formData.file.name}` : 'Uploading…'}
                        className="mt-2"
                      />
                    )}
                  </div>
                </div>
                <div className={`flex justify-end gap-3 p-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                    {submitting ? 'Saving...' : editingPlan ? 'Update' : 'Upload'}
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