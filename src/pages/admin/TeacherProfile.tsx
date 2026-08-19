import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import {
  ArrowLeftIcon,
  PencilIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  BookOpenIcon,
  UserGroupIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

// ---------- Types ----------
interface Teacher {
  id: string;
  name: string;
  email: string;
  phone?: string;
  arms?: Arm[];
  subjectArms?: SubjectArm[];
}

interface Arm {
  id: string;
  letter: string;
  class?: { id: string; name: string };
  classId?: string;
}

interface SubjectArm {
  id: string;
  subject: { id: string; name: string };
  arm: { id: string; letter: string; class?: { name: string } };
}

interface TimetableEntry {
  id: string;
  dayOfWeek: string;
  timeSlot: string;
  subject: { name: string };
  arm: { letter: string; class?: { name: string } };
}

interface GroupedTimetable {
  day: string;
  entries: TimetableEntry[];
}

export default function TeacherProfile() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'subjects' | 'timetable'>('details');
  const [groupedTimetable, setGroupedTimetable] = useState<GroupedTimetable[]>([]);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [timetableError, setTimetableError] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);

  const [allArms, setAllArms] = useState<Arm[]>([]);
  const [showArmModal, setShowArmModal] = useState(false);
  const [selectedArmIds, setSelectedArmIds] = useState<string[]>([]);
  const [submittingArms, setSubmittingArms] = useState(false);

  const [allSubjects, setAllSubjects] = useState<{ id: string; name: string }[]>([]);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedSubjectArmId, setSelectedSubjectArmId] = useState('');
  const [submittingSubject, setSubmittingSubject] = useState(false);
  const [removingSubjectId, setRemovingSubjectId] = useState<string | null>(null);

  // ---------- Fetch functions ----------
  const fetchTeacher = async () => {
    if (!token || !id) return;
    try {
      const res = await api.get(`/teachers/${id}`, token);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setTeacher(data);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load teacher details');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimetable = async () => {
    if (!token || !teacher) return;
    setLoadingTimetable(true);
    setTimetableError(null);
    try {
      const res = await api.get(`/timetable/teacher/${teacher.id}`, token);
      if (!res.ok) throw new Error(await res.text());
      const entries: TimetableEntry[] = await res.json();

      const groupedMap = new Map<string, TimetableEntry[]>();
      entries.forEach(entry => {
        const day = entry.dayOfWeek;
        if (!groupedMap.has(day)) groupedMap.set(day, []);
        groupedMap.get(day)!.push(entry);
      });

      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const grouped = Array.from(groupedMap.entries())
        .map(([day, entries]) => ({
          day,
          entries: entries.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot)),
        }))
        .sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));

      setGroupedTimetable(grouped);
    } catch (err: any) {
      console.error(err);
      setTimetableError(err.message || 'Failed to load timetable');
      toast.error('Could not load timetable');
      setGroupedTimetable([]);
    } finally {
      setLoadingTimetable(false);
    }
  };

  const fetchAllArms = async () => {
    if (!token) return;
    try {
      const res = await api.get('/arms', token);
      if (res.ok) {
        const data = await res.json();
        setAllArms(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllSubjects = async () => {
    if (!token) return;
    try {
      const res = await api.get('/subjects', token);
      if (res.ok) {
        const data = await res.json();
        setAllSubjects(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (teacher && token) {
      fetchTimetable();
    }
  }, [teacher, token]);

  useEffect(() => {
    fetchTeacher();
    fetchAllArms();
    fetchAllSubjects();
  }, [id, token]);

  // ---------- Handlers ----------
  const handleUpdatePersonal = async () => {
    if (!teacher || !editForm.name.trim() || !editForm.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.put(`/teachers/${teacher.id}`, {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone || undefined,
      }, token);
      if (!res.ok) throw new Error(await res.text());
      toast.success('Personal information updated');
      await fetchTeacher();
      setShowEditModal(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = () => {
    if (teacher) {
      setEditForm({
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone || '',
      });
      setShowEditModal(true);
    }
  };

  const openArmModal = () => {
    if (teacher) {
      setSelectedArmIds(teacher.arms?.map(a => a.id) || []);
      setShowArmModal(true);
    }
  };

  const handleSaveArms = async () => {
    if (!teacher) return;
    setSubmittingArms(true);
    try {
      const currentArmIds = teacher.arms?.map(a => a.id) || [];
      const toAdd = selectedArmIds.filter(id => !currentArmIds.includes(id));
      const toRemove = currentArmIds.filter(id => !selectedArmIds.includes(id));
      for (const armId of toAdd) {
        await api.patch(`/arms/${armId}`, { teacherId: teacher.id }, token);
      }
      for (const armId of toRemove) {
        await api.patch(`/arms/${armId}`, { teacherId: null }, token);
      }
      toast.success('Form teacher assignments updated');
      await fetchTeacher();
      setShowArmModal(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmittingArms(false);
    }
  };

  const openAddSubjectModal = () => {
    setSelectedSubjectId('');
    setSelectedSubjectArmId('');
    setShowSubjectModal(true);
  };

  const handleAddSubject = async () => {
    if (!teacher || !selectedSubjectId || !selectedSubjectArmId) {
      toast.error('Please select a subject and an arm');
      return;
    }
    setSubmittingSubject(true);
    try {
      const alreadyExists = teacher.subjectArms?.some(sa =>
        sa.subject.id === selectedSubjectId && sa.arm.id === selectedSubjectArmId
      );
      if (alreadyExists) {
        toast.error('Subject already assigned to this teacher for this arm');
        return;
      }
      const res = await api.post(`/arms/${selectedSubjectArmId}/subjects`, {
        subjectId: selectedSubjectId,
        teacherId: teacher.id,
      }, token);
      if (!res.ok) throw new Error(await res.text());
      toast.success('Subject added to teacher');
      await fetchTeacher();
      setShowSubjectModal(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmittingSubject(false);
    }
  };

  const handleRemoveSubject = async (subjectArmId: string) => {
    const result = await Swal.fire({
      title: 'Remove Subject',
      text: 'Remove this subject from the teacher?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Remove',
    });
    if (!result.isConfirmed) return;

    setRemovingSubjectId(subjectArmId);
    try {
      const res = await api.del(`/subjects/subject-arms/${subjectArmId}`, token);
      if (!res.ok) throw new Error(await res.text());
      toast.success('Subject removed');
      await fetchTeacher();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRemovingSubjectId(null);
    }
  };

  // ---------- Loading / Error ----------
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Loading teacher profile...</p>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
        <div className="text-center">
          <p className={`text-xl mb-4 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>Teacher not found</p>
          <button onClick={() => navigate('/admin/teachers')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Go Back</button>
        </div>
      </div>
    );
  }

  // ---------- Main Render ----------
  return (
    <div className={`min-h-screen px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
      {theme === 'dark' && (
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `linear-gradient(rgba(59,130,246,0.1) 1px,transparent 1px), linear-gradient(90deg,rgba(59,130,246,0.1) 1px,transparent 1px)`, backgroundSize: '60px 60px' }} />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
        </div>
      )}

      <div className="relative z-10 max-w-5xl mx-auto">
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/admin/teachers')}
          className={`mb-6 inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            theme === 'dark'
              ? 'text-gray-300 hover:text-white hover:bg-white/10'
              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200/50'
          }`}
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" /> Back to Teachers
        </motion.button>

        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent' : 'bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent'}`}>
              {teacher.name}
            </h1>
            <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{teacher.email}</p>
          </div>
          <button
            onClick={openEditModal}
            className="inline-flex items-center px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition"
          >
            <PencilIcon className="h-4 w-4 mr-1" /> Edit Profile
          </button>
        </div>

        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px space-x-8">
            {[
              { id: 'details', label: 'Personal Details', icon: UserIcon },
              { id: 'subjects', label: 'Subjects Taught', icon: BookOpenIcon },
              { id: 'timetable', label: 'Timetable', icon: CalendarIcon },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* ⭐ MAIN CONTENT CARD – solid white in light mode, glass in dark mode */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={`p-6 rounded-2xl shadow-xl ${
            theme === 'dark'
              ? 'bg-white/5 backdrop-blur-xl border border-white/10'
              : 'bg-white shadow-xl border border-gray-200'
          }`}
        >
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                  <UserIcon className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Full Name</p>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{teacher.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <EnvelopeIcon className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Email</p>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{teacher.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <PhoneIcon className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Phone</p>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{teacher.phone || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <UserGroupIcon className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Form Teacher of</p>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {teacher.arms?.map(arm => `${arm.class?.name || ''} Arm ${arm.letter}`).join(', ') || 'None'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={openArmModal}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition"
                >
                  <UserGroupIcon className="h-4 w-4 mr-1" /> Manage Form Teacher Arms
                </button>
              </div>
            </div>
          )}

          {activeTab === 'subjects' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={openAddSubjectModal}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 transition"
                >
                  <PlusIcon className="h-4 w-4 mr-1" /> Add Subject
                </button>
              </div>
              {teacher.subjectArms && teacher.subjectArms.length > 0 ? (
                <div className="overflow-x-auto">
                  {/* ⭐ TABLE – force text color with inline style + class */}
                  <table
                    className="min-w-full text-sm text-gray-900 dark:text-white"
                    style={{ color: theme === 'dark' ? 'white' : 'black' }}
                  >
                    <thead className="border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="text-left py-2 px-2">Subject</th>
                        <th className="text-left py-2 px-2">Class / Arm</th>
                        <th className="text-left py-2 px-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teacher.subjectArms.map(sa => {
                        const isRemoving = removingSubjectId === sa.id;
                        return (
                          <tr key={sa.id} className="border-b border-gray-100 dark:border-gray-800">
                            <td className="py-2 px-2">{sa.subject.name}</td>
                            <td className="py-2 px-2">
                              {sa.arm.class?.name || ''} Arm {sa.arm.letter}
                            </td>
                            <td className="py-2 px-2">
                              <button
                                onClick={() => handleRemoveSubject(sa.id)}
                                disabled={isRemoving}
                                className={`text-red-600 hover:text-red-800 transition-colors ${isRemoving ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {isRemoving ? (
                                  <div className="h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <TrashIcon className="h-4 w-4" />
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-8 text-gray-500">No subjects assigned to this teacher.</p>
              )}
            </div>
          )}

          {activeTab === 'timetable' && (
            <div className="space-y-4">
              {loadingTimetable ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : timetableError ? (
                <div className="text-center py-8">
                  <p className="text-red-500">Failed to load timetable: {timetableError}</p>
                  <button
                    onClick={fetchTimetable}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                  >
                    Retry
                  </button>
                </div>
              ) : groupedTimetable.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No timetable entries found for this teacher.</p>
                  <p className="text-sm text-gray-400 mt-1">
                    (Timetable will appear once the teacher is assigned to arms and timetable periods are defined.)
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedTimetable.map(group => (
                    <div key={group.day} className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                      <div className={`px-4 py-2 font-semibold ${theme === 'dark' ? 'bg-gray-800 text-blue-300' : 'bg-blue-50 text-blue-800'}`}>
                        {group.day}
                      </div>
                      <div className="overflow-x-auto">
                        {/* ⭐ TABLE – force text color */}
                        <table
                          className="min-w-full text-sm text-gray-900 dark:text-white"
                          style={{ color: theme === 'dark' ? 'white' : 'black' }}
                        >
                          <thead className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                            <tr>
                              <th className="text-left py-2 px-4">Time</th>
                              <th className="text-left py-2 px-4">Subject</th>
                              <th className="text-left py-2 px-4">Class / Arm</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.entries.map(entry => (
                              <tr key={entry.id} className={`border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
                                <td className="py-2 px-4 font-mono text-sm">{entry.timeSlot}</td>
                                <td className="py-2 px-4">{entry.subject?.name || '—'}</td>
                                <td className="py-2 px-4">
                                  {entry.arm?.class?.name || ''} Arm {entry.arm?.letter || '?'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* ========== MODALS ========== */}
      <AnimatePresence>
        {showEditModal && (
          <Modal onClose={() => setShowEditModal(false)} title="Edit Personal Information" theme={theme}>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Full Name *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Email *</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowEditModal(false)} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700">Cancel</button>
                <button onClick={handleUpdatePersonal} disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showArmModal && (
          <Modal onClose={() => setShowArmModal(false)} title="Manage Form Teacher Arms" theme={theme} size="lg">
            <div className="space-y-4">
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Select arms where this teacher will be the form teacher.</p>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {allArms.length === 0 ? (
                  <p className="text-gray-500">No arms available.</p>
                ) : (
                  allArms.map(arm => {
                    const isSelected = selectedArmIds.includes(arm.id);
                    return (
                      <label key={arm.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedArmIds([...selectedArmIds, arm.id]);
                            else setSelectedArmIds(selectedArmIds.filter(id => id !== arm.id));
                          }}
                          className="w-4 h-4 rounded"
                        />
                        <span className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                          {arm.class?.name || 'No class'} Arm {arm.letter}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowArmModal(false)} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700">Cancel</button>
                <button onClick={handleSaveArms} disabled={submittingArms} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                  {submittingArms ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSubjectModal && (
          <Modal onClose={() => setShowSubjectModal(false)} title="Add Subject to Teacher" theme={theme}>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Subject</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="" className={theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}>-- Select Subject --</option>
                  {allSubjects.map(sub => (
                    <option key={sub.id} value={sub.id} className={theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Class / Arm</label>
                <select
                  value={selectedSubjectArmId}
                  onChange={(e) => setSelectedSubjectArmId(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="" className={theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}>-- Select Arm --</option>
                  {allArms.map(arm => (
                    <option key={arm.id} value={arm.id} className={theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}>
                      {arm.class?.name || 'No class'} Arm {arm.letter}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowSubjectModal(false)} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700">Cancel</button>
                <button onClick={handleAddSubject} disabled={submittingSubject} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                  {submittingSubject ? 'Adding...' : 'Add Subject'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- Modal Helper ----------
function Modal({ children, onClose, title, theme, size = 'md' }: any) {
  const maxWidth = size === 'lg' ? 'max-w-3xl' : 'max-w-md';
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
          className={`w-full ${maxWidth} rounded-2xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}
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