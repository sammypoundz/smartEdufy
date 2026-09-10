import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { formatArm } from '../../utils/arm';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  PencilIcon,
  PlusIcon,
  XMarkIcon,
  ClockIcon,
  CalendarIcon,
  AcademicCapIcon,
  DocumentChartBarIcon,
  PrinterIcon,
  ArrowRightOnRectangleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

// --- Types from backend ---
interface Class {
  id: string;
  name: string;
  arms: Arm[];
}

interface Arm {
  id: string;
  letter: string;
  classId: string;
}

interface Subject {
  id: string;
  name: string;
}

interface TimetableEntry {
  id: string;
  armId: string;
  dayOfWeek: string;
  timeSlot: string;
  subjectId: string | null;
  subject?: Subject;
}

const DEFAULT_TIME_SLOTS = [
  '8:00–8:45',
  '8:45–9:30',
  '9:30–10:15',
  'Break',
  '10:30–11:15',
  '11:15–12:00',
  'Lunch',
  '13:00–13:45',
  '13:45–14:30',
];

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Any slot whose name marks it as a non-instructional break period.
// Case-insensitive so "Break", "Lunch", "Short Break", "RECESS", etc. all count.
const BREAK_KEYWORDS = ['break', 'lunch', 'recess'];
export const isBreakSlot = (slot: string) => {
  const s = (slot || '').trim().toLowerCase();
  return BREAK_KEYWORDS.some(k => s.includes(k));
};

// Labels offered by the "Add Break" quick action.
const BREAK_PRESETS = ['Break', 'Lunch', 'Short Break'];

export default function TimetablePage() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { classId?: string; armId?: string } | null;

  // State
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedArmId, setSelectedArmId] = useState<string>('');
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>(DEFAULT_TIME_SLOTS);
  const [loading, setLoading] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editGrid, setEditGrid] = useState<{ [day: string]: { [slot: string]: string } }>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);
  const [showCompiled, setShowCompiled] = useState(false);
  const [editableTimeSlots, setEditableTimeSlots] = useState<string[]>(DEFAULT_TIME_SLOTS);

  // Loading states for buttons
  const [savingTimetable, setSavingTimetable] = useState(false);
  const [savingTimeSlots, setSavingTimeSlots] = useState(false);

  // Teachers get read-only timetables — editing is admin-only.
  const isAdmin = !location.pathname.startsWith('/teacher');

  // Attention indicator for the Timetable Workflow button:
  // true when the workflow needs THIS user's action.
  const [workflowAttention, setWorkflowAttention] = useState(false);

  // Check the workflow state on mount (lightweight, best-effort)
  useEffect(() => {
    if (!token) return;
    const isTeacher = location.pathname.startsWith('/teacher');
    (async () => {
      try {
        if (isTeacher) {
          const res = await api.get('/timetable-workflow/mine', token);
          if (!res.ok) return;
          const data = await res.json();
          const assignments = (data.assignments || []) as {
            id: string;
            armId: string;
            periodsPerWeek: number;
            slots: { dayOfWeek: string; timeSlot: string }[];
          }[];
          const reviews = (data.reviews || []) as { armId: string; status: string }[];
          const reviewFor = (armId: string) => reviews.find((r) => r.armId === armId);
          const needs = assignments.some((a) => {
            const status = reviewFor(a.armId)?.status || 'DRAFT';
            if (status === 'CHANGES_REQUESTED') return true; // admin asked for revisions
            if (status === 'APPROVED') return false; // locked, nothing to do
            return (a.slots?.length || 0) < a.periodsPerWeek; // submission incomplete
          });
          setWorkflowAttention(needs);
        } else {
          const res = await api.get('/timetable-workflow/reviews', token);
          if (!res.ok) return;
          const reviews = (await res.json()) as { status: string }[];
          // Admin action needed when an arm's teachers have submitted and it's
          // awaiting review/approval (or was pushed back and is being revised
          // again after submission).
          setWorkflowAttention(reviews.some((r) => r.status === 'PENDING_REVIEW'));
        }
      } catch {
        /* indicator is best-effort only */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Pre‑select from navigation state
  useEffect(() => {
    if (state?.classId && state?.armId) {
      setSelectedClassId(state.classId);
      setSelectedArmId(state.armId);
    }
  }, [state]);

  // Fetch classes and subjects on mount
  useEffect(() => {
    const fetchClasses = async () => {
      if (!token) return;
      try {
        const res = await api.get('/classes', token);
        if (res.ok) {
          const data = await res.json() as Class[];
          setClasses(data);
        } else {
          toast.error('Failed to load classes');
        }
      } catch {
        toast.error('Could not load classes');
      }
    };
    const fetchSubjects = async () => {
      if (!token) return;
      try {
        const res = await api.get('/subjects', token);
        if (res.ok) {
          const data = await res.json() as Subject[];
          setSubjects(data);
        }
      } catch {
        toast.error('Could not load subjects');
      }
    };
    fetchClasses();
    fetchSubjects();
  }, [token]);

  // Fetch timetable when arm changes
  useEffect(() => {
    if (!selectedArmId || !token) {
      setTimetableEntries([]);
      return;
    }
    const fetchTimetable = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/timetable/arm/${selectedArmId}`, token);
        if (res.ok) {
          const entries = await res.json() as TimetableEntry[];
          setTimetableEntries(entries);
          // Prefer the persisted slot layout for this arm; fall back to slots
          // seen in the entries, then the defaults for a fresh arm.
          try {
            const slotsRes = await api.get(`/timetable/arm/${selectedArmId}/time-slots`, token);
            if (slotsRes.ok) {
              const data = await slotsRes.json() as { timeSlots?: string[] };
              if (data.timeSlots?.length) {
                setTimeSlots(data.timeSlots);
                return;
              }
            }
          } catch { /* fall back below */ }
          const slots = Array.from(new Set(entries.map((e: TimetableEntry) => e.timeSlot)))
            .sort((a, b) => DEFAULT_TIME_SLOTS.indexOf(a) - DEFAULT_TIME_SLOTS.indexOf(b));
          setTimeSlots(slots.length ? slots : DEFAULT_TIME_SLOTS);
        } else {
          setTimetableEntries([]);
        }
      } catch {
        toast.error('Failed to load timetable');
        setTimetableEntries([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTimetable();
  }, [selectedArmId, token]);

  const buildEditGrid = () => {
    const grid: { [day: string]: { [slot: string]: string } } = {};
    daysOfWeek.forEach(day => { grid[day] = {}; });
    timeSlots.forEach(slot => {
      daysOfWeek.forEach(day => { grid[day][slot] = ''; });
    });
    timetableEntries.forEach(entry => {
      if (grid[entry.dayOfWeek]) {
        grid[entry.dayOfWeek][entry.timeSlot] = entry.subjectId || '';
      }
    });
    setEditGrid(grid);
  };

  const openEditModal = () => {
    buildEditGrid();
    setIsEditing(true);
  };

  const openCreateModal = () => {
    buildEditGrid();
    setShowCreateModal(true);
  };

  const handleEditChange = (day: string, slot: string, subjectId: string) => {
    setEditGrid(prev => ({
      ...prev,
      [day]: { ...prev[day], [slot]: subjectId },
    }));
  };

  const saveTimetable = async () => {
    if (!selectedArmId) return;
    const entriesToSave: { dayOfWeek: string; timeSlot: string; subjectId?: string }[] = [];
    for (const day of daysOfWeek) {
      for (const slot of timeSlots) {
        const subjectId = editGrid[day]?.[slot];
        if (subjectId && subjectId.trim() !== '' && !isBreakSlot(slot)) {
          entriesToSave.push({ dayOfWeek: day, timeSlot: slot, subjectId });
        }
      }
    }

    setSavingTimetable(true);
    try {
      const res = await api.put(`/timetable/arm/${selectedArmId}`, { entries: entriesToSave }, token);
      if (!res.ok) {
        const errorText = await res.text();
        if (res.status === 409) {
          toast.error(errorText || 'Teacher time conflict detected. Please check other arms.');
        } else {
          throw new Error(errorText);
        }
        return;
      }
      toast.success('Timetable saved successfully');
      const refreshRes = await api.get(`/timetable/arm/${selectedArmId}`, token);
      if (refreshRes.ok) {
        const entries = await refreshRes.json() as TimetableEntry[];
        setTimetableEntries(entries);
      }
      setIsEditing(false);
      setShowCreateModal(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save timetable');
    } finally {
      setSavingTimetable(false);
    }
  };

  const getSubjectName = (subjectId: string | null) => {
    if (!subjectId) return '—';
    const sub = subjects.find(s => s.id === subjectId);
    return sub ? sub.name : subjectId;
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const selectedArm = selectedClass?.arms.find(a => a.id === selectedArmId);

  const renderTimetableTable = (grid: { [day: string]: { [slot: string]: string } }, editable = false) => (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className={`p-2 text-left text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Day / Time</th>
            {timeSlots.map((slot, idx) => (
              <th
                key={idx}
                className={`p-2 text-center text-xs font-medium ${
                  isBreakSlot(slot)
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                {slot}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {daysOfWeek.map(day => (
            <tr key={day} className="border-t border-gray-200 dark:border-gray-700">
              <td className={`p-2 font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{day}</td>
              {timeSlots.map((slot, idx) => {
                const subjectId = grid[day]?.[slot] || '';
                const isBreak = isBreakSlot(slot);
                return (
                  <td key={idx} className="p-1">
                    {editable ? (
                      <select
                        value={subjectId}
                        onChange={(e) => handleEditChange(day, slot, e.target.value)}
                        disabled={isBreak}
                        className={`w-full px-2 py-1 text-sm rounded border ${
                          theme === 'dark'
                            ? 'bg-gray-800 border-gray-700 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        } ${isBreak ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <option value="">—</option>
                        {subjects.map(sub => (
                          <option key={sub.id} value={sub.id}>{sub.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div
                        className={`p-2 text-center text-sm ${
                          isBreak
                            ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
                            : theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                        }`}
                      >
                        {isBreak ? slot : getSubjectName(subjectId)}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const openTimeSlotModal = () => {
    setEditableTimeSlots([...timeSlots]);
    setShowTimeSlotModal(true);
  };
  const addTimeSlot = () => setEditableTimeSlots([...editableTimeSlots, 'New Period']);
  // Privileged quick action: insert a break slot (non-instructional).
  // Break slots are never saved as class entries — isBreakSlot() filters them
  // out of saveTimetable, and the grid disables subject selection on them.
  const addBreakSlot = (label: string) => {
    setEditableTimeSlots(prev => [...prev, label]);
    toast.success(`"${label}" break slot added — it won't count as a class period`);
  };
  const removeTimeSlot = (idx: number) => {
    if (editableTimeSlots.length <= 1) return;
    setEditableTimeSlots(editableTimeSlots.filter((_, i) => i !== idx));
  };
  const saveTimeSlots = async () => {
    // Basic validation: no empty or duplicate slot names.
    const cleaned = editableTimeSlots.map(s => s.trim()).filter(Boolean);
    if (cleaned.length !== editableTimeSlots.length) {
      toast.error('Time slot names cannot be empty');
      return;
    }
    if (new Set(cleaned.map(s => s.toLowerCase())).size !== cleaned.length) {
      toast.error('Duplicate time slot names are not allowed');
      return;
    }
    setSavingTimeSlots(true);
    try {
      if (!selectedArmId) {
        // No arm selected yet — keep the local-only behaviour.
        setTimeSlots(cleaned);
      } else {
        // Persist the layout. The backend recomputes the timetable: any class
        // entries on removed slots or break slots are deleted, so breaks are
        // always off for classes.
        const res = await api.put(`/timetable/arm/${selectedArmId}/time-slots`, { timeSlots: cleaned }, token);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Failed to save time slots');
        }
        const data = await res.json() as { timeSlots: string[]; removedEntries: number };
        setTimeSlots(data.timeSlots);
        if (data.removedEntries > 0) {
          toast.success(`Time slots updated — ${data.removedEntries} class period(s) on removed/break slots were cleared`);
        } else {
          toast.success('Time slots updated');
        }
        // Refresh entries so the grid reflects pruned slots immediately.
        const refreshRes = await api.get(`/timetable/arm/${selectedArmId}`, token);
        if (refreshRes.ok) {
          setTimetableEntries(await refreshRes.json() as TimetableEntry[]);
        }
      }
      setShowTimeSlotModal(false);
      if (selectedArmId) buildEditGrid();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save time slots');
    } finally {
      setSavingTimeSlots(false);
    }
  };

  return (
    <div className={`min-h-screen px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
    }`}>
      {theme === 'dark' && (
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `linear-gradient(rgba(59,130,246,0.1) 1px,transparent 1px), linear-gradient(90deg,rgba(59,130,246,0.1) 1px,transparent 1px)`, backgroundSize: '60px 60px' }} />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(-1)}
          className={`mb-6 inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            theme === 'dark'
              ? 'text-gray-300 hover:text-white hover:bg-white/10'
              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200/50'
          }`}
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" /> Back
        </motion.button>

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center space-x-4">
            <CalendarIcon className={`h-12 w-12 ${theme === 'dark' ? 'text-blue-400/30' : 'text-blue-500/20'}`} />
            <div>
              <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent' : 'bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent'}`}>
                Timetable Management
              </h1>
              <p className={`mt-2 text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                View, edit, or create timetables with conflict detection.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Class & Arm Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Select Class</label>
              <select
                value={selectedClassId}
                onChange={(e) => { setSelectedClassId(e.target.value); setSelectedArmId(''); }}
                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                    : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-400'
                }`}
              >
                <option value="">-- Choose a class --</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>
            {selectedClass && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Select Arm</label>
                <select
                  value={selectedArmId}
                  onChange={(e) => setSelectedArmId(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-400'
                  }`}
                >
                  <option value="">-- Choose an arm --</option>
                  {selectedClass.arms.map(arm => (
                    <option key={arm.id} value={arm.id}>{formatArm(arm)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => navigate(`${isAdmin ? '/admin' : '/teacher'}/timetable-workflow`)}
              className="relative w-full flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium border transition-colors border-indigo-500 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
              Timetable Workflow
              {workflowAttention && (
                <span className="absolute -top-2.5 -right-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-600 text-white shadow-md animate-pulse">
                  <ExclamationTriangleIcon className="h-3 w-3" />
                  Action needed
                </span>
              )}
            </button>
            {isAdmin && (
              <button
                onClick={openTimeSlotModal}
                className="w-full flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              >
                <ClockIcon className="h-4 w-4 mr-2" />
                Edit Time Slots
              </button>
            )}
          </div>
        </div>

        {/* Timetable Display */}
        {selectedClassId && selectedArmId && selectedClass && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-6 rounded-2xl shadow-xl ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/30 backdrop-blur-md border border-white/20'}`}
          >
            <div className="flex flex-wrap justify-between items-center mb-6">
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Timetable for {selectedClass.name} {formatArm(selectedArm)}
              </h2>
              <div className="space-x-2 mt-2 sm:mt-0">
                {timetableEntries.length > 0 && (
                  <button
                    onClick={() => setShowCompiled(true)}
                    className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white mr-2"
                  >
                    <DocumentChartBarIcon className="h-4 w-4 mr-1" />
                    Compiled View
                  </button>
                )}
                {isAdmin && timetableEntries.length > 0 ? (
                  <button
                    onClick={openEditModal}
                    disabled={savingTimetable}
                    className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                  >
                    {savingTimetable ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                    ) : (
                      <PencilIcon className="h-4 w-4 mr-1" />
                    )}
                    Edit Timetable
                  </button>
                ) : isAdmin && (
                  <button
                    onClick={openCreateModal}
                    disabled={savingTimetable}
                    className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                  >
                    {savingTimetable ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                    ) : (
                      <PlusIcon className="h-4 w-4 mr-1" />
                    )}
                    Create New
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : timetableEntries.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <AcademicCapIcon className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">No timetable found for this class and arm.</p>
                <p className="text-sm mt-2">{isAdmin ? 'Click "Create New" to build one.' : 'No timetable has been published for this arm yet.'}</p>
              </div>
            ) : (
              renderTimetableTable(
                timetableEntries.reduce((acc, entry) => {
                  if (!acc[entry.dayOfWeek]) acc[entry.dayOfWeek] = {};
                  acc[entry.dayOfWeek][entry.timeSlot] = entry.subjectId || '';
                  return acc;
                }, {} as { [day: string]: { [slot: string]: string } }),
                false
              )
            )}
          </motion.div>
        )}
      </div>

      {/* Edit / Create Modal */}
      <AnimatePresence>
        {(isEditing || showCreateModal) && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsEditing(false); setShowCreateModal(false); }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className={`w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-xl ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {showCreateModal ? 'Create New Timetable' : 'Edit Timetable'}
                  </h3>
                  <button onClick={() => { setIsEditing(false); setShowCreateModal(false); }} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-white/10">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                {renderTimetableTable(editGrid, true)}
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => { setIsEditing(false); setShowCreateModal(false); }}
                    className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveTimetable}
                    disabled={savingTimetable}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center"
                  >
                    {savingTimetable ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      'Save'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Compiled Timetable View Modal */}
      <AnimatePresence>
        {showCompiled && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCompiled(false)}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 print-hidden"
            />
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-2 sm:p-4 print:static print:block"
            >
              <div className={`w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-2xl p-4 sm:p-6 shadow-2xl print-area ${
                theme === 'dark' ? 'bg-gray-900 print:bg-white' : 'bg-white'
              }`}>
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Compiled Timetable
                    </h2>
                    <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {selectedClass?.name} {selectedArm ? formatArm(selectedArm) : ''} · Term Overview
                    </p>
                  </div>
                  <div className="flex space-x-2 print-hidden">
                    <button
                      onClick={() => window.print()}
                      className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <PrinterIcon className="h-4 w-4 mr-1" />
                      Print
                    </button>
                    <button onClick={() => setShowCompiled(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-white/10">
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Desktop: grid (rows = periods, cols = days) — always used for printing */}
                <div className="hidden md:block print:block overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr>
                        <th className={`p-2 text-left text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Period</th>
                        {daysOfWeek.map(day => (
                          <th key={day} className={`p-2 text-center text-sm font-semibold border-b-2 ${theme === 'dark' ? 'text-blue-300 border-blue-500/50' : 'text-blue-700 border-blue-500'}`}>
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map((slot, idx) => {
                        const isBreak = isBreakSlot(slot);
                        return (
                          <tr key={idx} className={`border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
                            <td className={`p-2 text-xs font-medium whitespace-nowrap ${
                              isBreak
                                ? 'text-yellow-600 dark:text-yellow-400'
                                : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {slot}
                            </td>
                            {daysOfWeek.map(day => {
                              const subjectId = timetableEntries.find(
                                e => e.dayOfWeek === day && e.timeSlot === slot
                              )?.subjectId || '';
                              const name = getSubjectName(subjectId);
                              return (
                                <td key={day} className="p-1">
                                  {isBreak ? (
                                    <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 text-center text-xs font-medium text-yellow-700 dark:text-yellow-300 py-2">
                                      {slot === 'Break' ? '☕ Break' : '🍲 Lunch'}
                                    </div>
                                  ) : name && name !== '—' ? (
                                    <div className="rounded-md px-2 py-2 text-center text-sm font-medium shadow-sm border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200">
                                      {name}
                                    </div>
                                  ) : (
                                    <div className={`rounded-md py-2 text-center text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`}>
                                      —
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile: stacked per-day cards (screen only, never printed) */}
                <div className="md:hidden print:hidden space-y-4">
                  {daysOfWeek.map(day => (
                    <div key={day} className={`rounded-xl overflow-hidden border ${theme === 'dark' ? 'border-gray-800 bg-gray-800/40' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold">{day}</div>
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {timeSlots.map((slot, idx) => {
                          const isBreak = isBreakSlot(slot);
                          const subjectId = timetableEntries.find(
                            e => e.dayOfWeek === day && e.timeSlot === slot
                          )?.subjectId || '';
                          const name = getSubjectName(subjectId);
                          return (
                            <div key={idx} className="flex items-center justify-between px-4 py-2">
                              <span className={`text-xs ${isBreak ? 'text-yellow-600 dark:text-yellow-400 font-medium' : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                {slot}
                              </span>
                              <span className={`text-sm font-medium ${
                                isBreak
                                  ? 'text-yellow-600 dark:text-yellow-400'
                                  : name && name !== '—'
                                    ? theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                                    : theme === 'dark' ? 'text-gray-600' : 'text-gray-300'
                              }`}>
                                {isBreak ? slot : name && name !== '—' ? name : '—'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <p className={`mt-4 text-xs text-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  Printed on {new Date().toLocaleDateString()} · SmartEdufy Timetable System
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Time Slot Modal */}
      <AnimatePresence>
        {showTimeSlotModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTimeSlotModal(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className={`w-full max-w-lg rounded-2xl p-6 shadow-xl ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Edit Time Slots</h3>
                <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Define the time slots for each day. Use "Break" or "Lunch" for non‑instructional periods.
                </p>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  {editableTimeSlots.map((slot, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={slot}
                        onChange={(e) => {
                          const newSlots = [...editableTimeSlots];
                          newSlots[idx] = e.target.value;
                          setEditableTimeSlots(newSlots);
                        }}
                        className={`flex-1 px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'} ${
                          isBreakSlot(slot) ? 'border-yellow-500/60' : ''
                        }`}
                      />
                      {isBreakSlot(slot) && (
                        <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 text-[10px] font-bold uppercase tracking-wide">
                          Break
                        </span>
                      )}
                      <button
                        onClick={() => removeTimeSlot(idx)}
                        disabled={editableTimeSlots.length <= 1}
                        className="p-2 rounded-lg text-red-600 disabled:opacity-30"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addTimeSlot}
                  className={`mt-4 w-full flex items-center justify-center px-4 py-2 border border-dashed rounded-lg text-sm font-medium transition-colors ${
                    theme === 'dark'
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-800'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <PlusIcon className="h-4 w-4 mr-2" /> Add Time Slot
                </button>
                {/* Add Break quick action: inserts a non-instructional slot.
                    Break slots never count as class periods in the system. */}
                <div className="mt-2 flex items-center justify-center gap-2">
                  {BREAK_PRESETS.map(label => (
                    <button
                      key={label}
                      onClick={() => addBreakSlot(label)}
                      className={`flex-1 flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                        theme === 'dark'
                          ? 'border-yellow-600/50 text-yellow-300 hover:bg-yellow-900/20'
                          : 'border-yellow-400 text-yellow-700 hover:bg-yellow-50'
                      }`}
                    >
                      <PlusIcon className="h-4 w-4 mr-1" /> {label}
                    </button>
                  ))}
                </div>
                <p className={`mt-2 text-xs text-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  Break slots are off for classes — no subjects can be scheduled on them and they don't count toward periods.
                </p>
                <div className="mt-6 flex justify-end space-x-3">
                  <button onClick={() => setShowTimeSlotModal(false)} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                    Cancel
                  </button>
                  <button
                    onClick={saveTimeSlots}
                    disabled={savingTimeSlots}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center"
                  >
                    {savingTimeSlots ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      'Save Slots'
                    )}
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