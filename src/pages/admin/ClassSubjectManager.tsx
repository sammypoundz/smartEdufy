import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { formatArm } from '../../utils/arm';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  UserGroupIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';

interface Subject {
  id: string;
  name: string;
  description?: string;
}

interface ArmSubject {
  id: string;           // SubjectArm id
  subjectId: string;
  subject: Subject;
  teacher?: {
    id: string;
    name: string;
    email?: string;
  };
}

interface ClassOption {
  id: string;
  name: string;
  arms?: { id: string; letter: string }[];
}

interface Teacher {
  id: string;
  name: string;
  email: string;
}

export default function ClassSubjectManager() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const [selectedClassId, setSelectedClassId] = useState('');
  const [arms, setArms] = useState<{ id: string; letter: string }[]>([]);
  const [selectedArmId, setSelectedArmId] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [currentArmSubject, setCurrentArmSubject] = useState<ArmSubject | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ---------- Cached queries ----------
  const classesQuery = useQuery<ClassOption[]>({
    queryKey: ['classes', token],
    enabled: !!token,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const res = await api.get('/classes', token!);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });
  const classes = classesQuery.data ?? [];

  const armSubjectsQuery = useQuery<ArmSubject[]>({
    queryKey: ['csm-arm-subjects', selectedArmId, token],
    enabled: !!token && !!selectedArmId,
    queryFn: async () => {
      const res = await api.get(`/arms/${selectedArmId}/subjects`, token!);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });
  const armSubjects = armSubjectsQuery.data ?? [];
  const loading = armSubjectsQuery.isLoading;

  const loadArmSubjects = async () => {
    await armSubjectsQuery.refetch();
  };

  const subjectsAndTeachersQuery = useQuery<{ subjects: Subject[]; teachers: Teacher[] }>({
    queryKey: ['csm-subjects-teachers', token],
    enabled: false,
    queryFn: async () => {
      const [subjectsRes, teachersRes] = await Promise.all([
        api.get('/subjects', token!),
        api.get('/teachers', token!),
      ]);
      return {
        subjects: subjectsRes.ok ? await subjectsRes.json() : [],
        teachers: teachersRes.ok ? await teachersRes.json() : [],
      };
    },
  });
  const allSubjects = subjectsAndTeachersQuery.data?.subjects ?? [];
  const allTeachers = subjectsAndTeachersQuery.data?.teachers ?? [];

  const loadAllSubjectsAndTeachers = async () => {
    await subjectsAndTeachersQuery.refetch();
  };

  // When class changes, load arms
  useEffect(() => {
    if (!selectedClassId) {
      setArms([]);
      setSelectedArmId('');
      return;
    }
    const cls = classes.find(c => c.id === selectedClassId);
    setArms(cls?.arms || []);
    setSelectedArmId('');
  }, [selectedClassId, classes]);

  // Load arm subjects when arm changes
  useEffect(() => {
    if (!selectedArmId) {
      return;
    }
    loadArmSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedArmId]);

  const openAddModal = () => {
    loadAllSubjectsAndTeachers();
    setSelectedSubjectId('');
    setSelectedTeacherId('');
    setShowAddModal(true);
  };

  const handleAddSubject = async () => {
    if (!selectedSubjectId) {
      toast.error('Please select a subject');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post(`/arms/${selectedArmId}/subjects`, {
        subjectId: selectedSubjectId,
        teacherId: selectedTeacherId || undefined,
      }, token);
      if (!res.ok) throw new Error(await res.text());
      toast.success('Subject added to arm');
      await loadArmSubjects();
      setShowAddModal(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openTeacherModal = (armSubject: ArmSubject) => {
    setCurrentArmSubject(armSubject);
    setSelectedTeacherId(armSubject.teacher?.id || '');
    loadAllSubjectsAndTeachers(); // ensure teachers are loaded
    setShowTeacherModal(true);
  };

  const handleUpdateTeacher = async () => {
    if (!currentArmSubject) return;
    setSubmitting(true);
    try {
      const res = await api.patch(`/arms/${selectedArmId}/subjects/${currentArmSubject.subjectId}/teacher`, {
        teacherId: selectedTeacherId || null,
      }, token);
      if (!res.ok) throw new Error(await res.text());
      toast.success('Teacher updated');
      await loadArmSubjects();
      setShowTeacherModal(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveSubject = async (armSubject: ArmSubject) => {
    const result = await Swal.fire({
      title: 'Remove Subject',
      text: `Remove "${armSubject.subject.name}" from this arm?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Remove',
      background: theme === 'dark' ? '#1f2937' : '#fff',
      color: theme === 'dark' ? '#fff' : '#000',
    });
    if (!result.isConfirmed) return;
    try {
      const res = await api.del(`/arms/${selectedArmId}/subjects/${armSubject.subjectId}`, token);
      if (!res.ok) throw new Error(await res.text());
      toast.success('Subject removed');
      await loadArmSubjects();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Helper to display arm name
  const getArmDisplay = () => {
    const arm = arms.find(a => a.id === selectedArmId);
    return formatArm(arm);
  };

  return (
    <div className={`min-h-screen px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
      {theme === 'dark' && (
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `linear-gradient(rgba(59,130,246,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.1) 1px,transparent 1px)`, backgroundSize: '60px 60px' }} />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="sm:flex sm:items-center sm:justify-between mb-8">
          <div>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent' : 'bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent'}`}>
              Class & Arm Subjects
            </h2>
            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage subjects offered in each arm, assign teachers, and handle per‑student exceptions.
            </p>
          </div>
        </div>

        {/* Class and Arm selectors */}
        <div className="flex flex-wrap gap-4 mb-6">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className={`px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500' : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-400'}`}
          >
            <option value="">Select Class</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>

          {arms.length > 0 && (
            <select
              value={selectedArmId}
              onChange={(e) => setSelectedArmId(e.target.value)}
              className={`px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500' : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-400'}`}
            >
              <option value="">Select Arm</option>
              {arms.map((arm) => (
                <option key={arm.id} value={arm.id}>{formatArm(arm)}</option>
              ))}
            </select>
          )}
        </div>

        {selectedArmId && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Subjects offered in {getArmDisplay()}
              </h3>
              <button
                onClick={openAddModal}
                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition"
              >
                <PlusIcon className="h-4 w-4 mr-1" /> Add Subject
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : armSubjects.length === 0 ? (
              <div className={`p-8 text-center rounded-2xl ${theme === 'dark' ? 'bg-white/5' : 'bg-white border border-gray-200'}`}>
                <BookOpenIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500">No subjects assigned to this arm yet.</p>
                <button onClick={openAddModal} className="mt-3 text-blue-600 hover:underline">Add a subject</button>
              </div>
            ) : (
              <div className={`overflow-x-auto rounded-2xl shadow-xl ${theme === 'dark' ? 'bg-gray-900/80 backdrop-blur-sm border border-white/10' : 'bg-white border border-gray-200'}`}>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className={theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">Subject</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">Teacher</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {armSubjects.map((armSub) => (
                      <tr key={armSub.id} className={theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {armSub.subject.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          {armSub.teacher?.name || 'Not assigned'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          <button
                            onClick={() => openTeacherModal(armSub)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                            title="Assign Teacher"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleRemoveSubject(armSub)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400"
                            title="Remove Subject"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Per‑student exceptions (future) */}
            <div className="mt-8">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>
                Student Subject Exceptions
              </h3>
              <div className={`p-6 rounded-2xl ${theme === 'dark' ? 'bg-white/5' : 'bg-white border border-gray-200'}`}>
                <p className="text-gray-500">To assign different subjects to individual students, click on a student's name in the student list and edit their subject offerings.</p>
                <button
                  onClick={() => window.location.href = '/admin/students'}
                  className="mt-3 inline-flex items-center text-blue-600 hover:underline"
                >
                  <UserGroupIcon className="h-4 w-4 mr-1" /> Go to Student Management
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Subject Modal */}
      <AnimatePresence>
        {showAddModal && (
          <Modal onClose={() => setShowAddModal(false)} title="Add Subject to Arm" theme={theme}>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Subject</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="">-- Select a subject --</option>
                  {allSubjects.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Teacher (optional)</label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="">-- Not assigned --</option>
                  {allTeachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700">Cancel</button>
                <button onClick={handleAddSubject} disabled={submitting || !selectedSubjectId} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                  {submitting ? 'Adding...' : 'Add Subject'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Assign Teacher Modal */}
      <AnimatePresence>
        {showTeacherModal && currentArmSubject && (
          <Modal onClose={() => setShowTeacherModal(false)} title="Assign Teacher" theme={theme}>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Subject: {currentArmSubject.subject.name}</label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="">-- Not assigned --</option>
                  {allTeachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowTeacherModal(false)} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700">Cancel</button>
                <button onClick={handleUpdateTeacher} disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// Simple Modal component (reuse the one from your other pages)
function Modal({ children, onClose, title, theme }: any) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
      />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}
        >
          <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <div className="p-6">{children}</div>
        </motion.div>
      </div>
    </>
  );
}