import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserPlusIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

interface Teacher {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface Arm {
  id: string;
  letter: string;
  alias?: string;
  teacherId?: string;
  teacher?: { name: string };
  students?: any[];
  _count?: { students: number };
}

interface ClassType {
  id: string;
  name: string;
  arms: Arm[];
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

export default function AdminClasses() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassType | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [currentArmIndex, setCurrentArmIndex] = useState<number | null>(null);

  // ----- Teacher modal search & pagination -----
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherPage, setTeacherPage] = useState(1);
  const pageSize = 5;

  const fetchTeachers = async () => {
    if (!token) return;
    setTeachersLoading(true);
    try {
      const res = await api.get('/teachers', token);
      if (res.ok) {
        const data = await res.json();
        setTeachers(data);
        console.log('✅ Teachers loaded:', data.length);
      } else {
        console.error('Failed to fetch teachers', await res.text());
        setTeachers([]);
      }
    } catch (err) {
      console.error('Failed to fetch teachers', err);
      setTeachers([]);
    } finally {
      setTeachersLoading(false);
    }
  };

  const fetchClasses = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/classes', token);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      setClasses(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Could not load classes. Please check your network connection.');
      toast.error('Could not load classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
  }, [token]);

  // Filter & paginate teachers
  const filteredTeachers = useMemo(() => {
    if (!teacherSearch.trim()) return teachers;
    const q = teacherSearch.toLowerCase();
    return teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        (t.phone && t.phone.includes(q))
    );
  }, [teachers, teacherSearch]);

  const totalFiltered = filteredTeachers.length;
  const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
  const paginatedTeachers = useMemo(() => {
    const start = (teacherPage - 1) * pageSize;
    return filteredTeachers.slice(start, start + pageSize);
  }, [filteredTeachers, teacherPage, pageSize]);

  useEffect(() => {
    setTeacherPage(1);
  }, [teacherSearch]);

  const getTeacherName = (arm: Arm): string => {
    if (arm.teacher?.name) return arm.teacher.name;
    if (arm.teacherId) {
      const teacher = teachers.find(t => t.id === arm.teacherId);
      return teacher?.name || 'Not assigned';
    }
    return 'Not assigned';
  };

  const getStudentCount = (arm: Arm): number => {
    if (arm._count?.students !== undefined) return arm._count.students;
    if (arm.students) return arm.students.length;
    return 0;
  };

  // ✅ NEW: Calculate total students for a class
  const getTotalStudents = (cls: ClassType): number => {
    return cls.arms.reduce((total, arm) => total + getStudentCount(arm), 0);
  };

  const openPanel = (cls: ClassType | null = null) => {
    console.log('🟢 openPanel called!', { cls, token, isPanelOpen });
    
    try {
      if (cls) {
        console.log('Editing existing class:', cls.name);
        const clonedArms = cls.arms.map(arm => ({ ...arm }));
        setSelectedClass({ ...cls, arms: clonedArms });
      } else {
        console.log('Creating new class');
        setSelectedClass({ 
          id: '', 
          name: '', 
          arms: [] 
        });
      }
      
      console.log('Setting isPanelOpen to true');
      setIsPanelOpen(true);
    } catch (err) {
      console.error('Error in openPanel:', err);
    }
  };

  const closePanel = () => {
    console.log('Closing panel');
    setIsPanelOpen(false);
    setSelectedClass(null);
  };

  const saveClass = async () => {
    if (!selectedClass) {
      toast.error('No class selected');
      return;
    }
    if (!selectedClass.name.trim()) {
      toast.error('Please enter a class name');
      return;
    }
    for (const arm of selectedClass.arms) {
      if (!arm.teacherId) {
        toast.error('Every arm must have a teacher');
        return;
      }
    }

    setIsSaving(true);
    try {
      if (selectedClass.id) {
        const classRes = await api.put(`/classes/${selectedClass.id}`, { name: selectedClass.name }, token);
        if (!classRes.ok) throw new Error(`Failed to update class: ${await classRes.text()}`);

        const currentClass = classes.find(c => c.id === selectedClass.id);
        const currentArms = currentClass?.arms || [];

        for (const arm of selectedClass.arms) {
          const existingArm = currentArms.find(a => a.id === arm.id);
          if (existingArm) {
            const patchRes = await api.patch(`/arms/${arm.id}`, {
              letter: arm.letter,
              alias: arm.alias,
              teacherId: arm.teacherId,
            }, token);
            if (!patchRes.ok) throw new Error(`Failed to update arm ${arm.letter}: ${await patchRes.text()}`);
          } else {
            const createRes = await api.post('/arms', {
              letter: arm.letter,
              alias: arm.alias,
              classId: selectedClass.id,
              teacherId: arm.teacherId,
            }, token);
            if (!createRes.ok) throw new Error(`Failed to create arm ${arm.letter}: ${await createRes.text()}`);
          }
        }

        const toDelete = currentArms.filter(a => !selectedClass.arms.some(na => na.id === a.id));
        for (const arm of toDelete) {
          const delRes = await api.del(`/arms/${arm.id}`, token);
          if (!delRes.ok) console.warn(`Failed to delete arm ${arm.id}: ${await delRes.text()}`);
        }

        toast.success('Class updated');
      } else {
        const classRes = await api.post('/classes', { name: selectedClass.name }, token);
        if (!classRes.ok) throw new Error(`Failed to create class: ${await classRes.text()}`);
        const newClass = await classRes.json();

        for (const arm of selectedClass.arms) {
          const armRes = await api.post('/arms', {
            letter: arm.letter,
            alias: arm.alias,
            classId: newClass.id,
            teacherId: arm.teacherId,
          }, token);
          if (!armRes.ok) throw new Error(`Failed to create arm ${arm.letter}: ${await armRes.text()}`);
        }
        toast.success('New class created');
      }
      await fetchClasses();
      closePanel();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to save class');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteClass = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      background: theme === 'dark' ? '#1f2937' : '#fff',
      color: theme === 'dark' ? '#fff' : '#000',
    });
    if (result.isConfirmed) {
      setIsDeleting(id);
      try {
        const res = await api.del(`/classes/${id}`, token);
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || `HTTP ${res.status}`);
        }
        toast.success('Class deleted');
        await fetchClasses();
      } catch (err: any) {
        console.error(err);
        toast.error(`Delete failed: ${err.message}`);
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const addArm = () => {
    if (!selectedClass) return;
    const newArm: Arm = {
      id: '',
      letter: String.fromCharCode(65 + selectedClass.arms.length),
      teacherId: '',
      students: [],
    };
    setSelectedClass({
      ...selectedClass,
      arms: [...selectedClass.arms, newArm],
    });
  };

  const updateArm = (index: number, field: keyof Arm, value: any) => {
    if (!selectedClass) return;
    const updatedArms = [...selectedClass.arms];
    updatedArms[index] = { ...updatedArms[index], [field]: value };
    setSelectedClass({ ...selectedClass, arms: updatedArms });
  };

  const removeArm = (index: number) => {
    if (!selectedClass) return;
    const updatedArms = selectedClass.arms.filter((_, i) => i !== index);
    setSelectedClass({ ...selectedClass, arms: updatedArms });
  };

  const openTeacherModal = (armIndex: number) => {
    console.log('🟢 Opening teacher modal for arm index:', armIndex);
    console.log('Teachers available:', teachers.length);
    
    if (teachers.length === 0) {
      toast.error('No teachers available. Please create a teacher first.');
      return;
    }
    
    setCurrentArmIndex(armIndex);
    setTeacherSearch('');
    setTeacherPage(1);
    setTimeout(() => {
      setTeacherModalOpen(true);
      console.log('✅ teacherModalOpen set to true');
    }, 10);
  };

  const selectTeacher = (teacherId: string) => {
    console.log('🟢 Selecting teacher:', teacherId);
    if (currentArmIndex !== null && selectedClass) {
      const selectedTeacher = teachers.find(t => t.id === teacherId);
      if (selectedTeacher) {
        const updatedArms = [...selectedClass.arms];
        updatedArms[currentArmIndex] = {
          ...updatedArms[currentArmIndex],
          teacherId: teacherId,
          teacher: { name: selectedTeacher.name },
        };
        setSelectedClass({ ...selectedClass, arms: updatedArms });
        toast.success(`Teacher ${selectedTeacher.name} assigned to arm`);
      }
    }
    setTeacherModalOpen(false);
    setCurrentArmIndex(null);
  };

  // ----- Loading / error / empty states -----
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Loading classes...</p>
        </div>
      </div>
    );
  }

  if (error && classes.length === 0) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
        <div className={`text-center max-w-md p-8 rounded-2xl ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/30 backdrop-blur-md border border-white/20'}`}>
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Network Error</h3>
          <p className={`mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{error}</p>
          <button
            onClick={() => fetchClasses()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (classes.length === 0) {
    return (
      <div className={`min-h-screen px-4 sm:px-6 lg:px-8 py-8 ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
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
                Class Management
              </h2>
              <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Manage classes and their arms. Each arm can have its own teacher and alias.
              </p>
            </div>
            <button 
              onClick={() => {
                console.log('🟢 Add Class button clicked!');
                openPanel();
              }} 
              className="mt-4 sm:mt-0 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Class
            </button>
          </div>
          <div className={`flex flex-col items-center justify-center py-20 rounded-2xl ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/30 backdrop-blur-md border border-white/20'}`}>
            <AcademicCapIcon className={`w-24 h-24 mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <h3 className={`text-xl font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>No Classes Yet</h3>
            <p className={`text-center mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Get started by creating your first class.</p>
            <button
              onClick={() => {
                console.log('🟢 Create Class button clicked!');
                openPanel();
              }}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Class
            </button>
          </div>
        </div>

        {/* Panel */}
        <AnimatePresence>
          {isPanelOpen && selectedClass && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={closePanel} 
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" 
              />
              <motion.div 
                initial={{ x: '100%' }} 
                animate={{ x: 0 }} 
                exit={{ x: '100%' }} 
                transition={{ type: 'spring', damping: 25, stiffness: 200 }} 
                className={`fixed right-0 top-0 h-full w-full max-w-md z-50 shadow-2xl overflow-y-auto ${theme === 'dark' ? 'bg-gray-900 border-l border-white/10' : 'bg-white border-l border-gray-200'}`}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {selectedClass.id ? 'Edit Class' : 'New Class'}
                    </h3>
                    <button onClick={closePanel} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Class Name</label>
                      <input 
                        type="text" 
                        value={selectedClass.name} 
                        onChange={(e) => setSelectedClass({ ...selectedClass, name: e.target.value })} 
                        className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500' : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-400'}`} 
                        placeholder="e.g. Primary 3" 
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Arms</label>
                        <button onClick={addArm} className={`inline-flex items-center text-sm ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}>
                          <PlusIcon className="h-4 w-4 mr-1" /> Add Arm
                        </button>
                      </div>
                      <div className="space-y-4">
                        {selectedClass.arms.map((arm, index) => (
                          <div key={index} className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex justify-between items-center mb-2">
                              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Arm {arm.letter || '?'}</span>
                              <button onClick={() => removeArm(index)} className={`p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Letter</label>
                                <input type="text" value={arm.letter} onChange={(e) => updateArm(index, 'letter', e.target.value.toUpperCase())} className={`w-full mt-1 px-2 py-1 text-sm rounded border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} maxLength={2} />
                              </div>
                              <div>
                                <label className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Alias (optional)</label>
                                <input type="text" value={arm.alias || ''} onChange={(e) => updateArm(index, 'alias', e.target.value)} className={`w-full mt-1 px-2 py-1 text-sm rounded border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} placeholder="e.g. Science" />
                              </div>
                              <div className="col-span-2">
                                <label className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Teacher</label>
                                <div className="flex items-center gap-2 mt-1">
                                  <input
                                    type="text"
                                    value={arm.teacherId ? teachers.find(t => t.id === arm.teacherId)?.name || arm.teacherId : ''}
                                    readOnly
                                    className={`flex-1 px-2 py-1 text-sm rounded border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-500'}`}
                                    placeholder="No teacher selected"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => openTeacherModal(index)}
                                    className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors whitespace-nowrap"
                                  >
                                    Select
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {selectedClass.arms.length === 0 && <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>No arms added yet. Click "Add Arm" to create one.</p>}
                      </div>
                    </div>

                    <div className="pt-4">
                      <button onClick={saveClass} disabled={!selectedClass.name.trim() || isSaving} className={`w-full flex justify-center items-center px-4 py-2 rounded-lg font-medium transition-all ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-700 disabled:text-gray-500' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:text-gray-500'}`}>
                        {isSaving ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Saving...
                          </>
                        ) : (
                          selectedClass.id ? 'Update Class' : 'Create Class'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Teacher Selection Modal - FIXED with flex centering for empty state */}
        <AnimatePresence>
          {teacherModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[101] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={() => setTeacherModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-300'
                }`}
                style={{ maxHeight: '80vh' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={`p-6 flex-1 overflow-y-auto ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="flex justify-between items-center mb-4 sticky top-0 bg-inherit z-10 pb-2">
                    <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Select a Teacher
                    </h3>
                    <button
                      onClick={() => setTeacherModalOpen(false)}
                      className={`p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative mb-4">
                    <div className="relative">
                      <MagnifyingGlassIcon
                        className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}
                      />
                      <input
                        type="text"
                        value={teacherSearch}
                        onChange={(e) => setTeacherSearch(e.target.value)}
                        placeholder="Search teachers by name, email..."
                        className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-400'
                        }`}
                      />
                    </div>
                    {teacherSearch && (
                      <button
                        onClick={() => setTeacherSearch('')}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Teacher List - Scrollable */}
                  <div className="max-h-[50vh] overflow-y-auto space-y-2">
                    {teachersLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : paginatedTeachers.length === 0 ? (
                      <div className="text-center py-8">
                        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {teacherSearch.trim() ? 'No teachers match your search.' : 'No teachers available.'}
                        </p>
                        <button
                          onClick={() => {
                            setTeacherModalOpen(false);
                            toast('Please create a teacher first in the Teachers section', {
                              duration: 4000,
                              icon: '👨‍🏫',
                            });
                          }}
                          className={`mt-3 inline-flex items-center px-4 py-2 text-sm rounded-lg transition-colors ${
                            theme === 'dark'
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          <UserPlusIcon className="h-4 w-4 mr-2" />
                          Create Teacher
                        </button>
                      </div>
                    ) : (
                      paginatedTeachers.map((teacher) => (
                        <button
                          key={teacher.id}
                          onClick={() => selectTeacher(teacher.id)}
                          className={`w-full text-left p-3 rounded-lg transition-colors ${
                            theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                          }`}
                        >
                          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {teacher.name}
                          </p>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {teacher.email}
                          </p>
                          {teacher.phone && (
                            <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                              {teacher.phone}
                            </p>
                          )}
                        </button>
                      ))
                    )}
                  </div>

                  {/* Pagination Controls - Sticky at bottom */}
                  {!teachersLoading && totalFiltered > pageSize && (
                    <div
                      className={`flex items-center justify-between mt-4 pt-3 border-t sticky bottom-0 bg-inherit pb-2 ${
                        theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                      }`}
                    >
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        Showing {(teacherPage - 1) * pageSize + 1} -{' '}
                        {Math.min(teacherPage * pageSize, totalFiltered)} of {totalFiltered}
                      </span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setTeacherPage((p) => Math.max(1, p - 1))}
                          disabled={teacherPage === 1}
                          className={`p-2 rounded-md transition-colors ${
                            theme === 'dark'
                              ? 'hover:bg-gray-700 text-gray-300 disabled:text-gray-600 disabled:hover:bg-transparent'
                              : 'hover:bg-gray-200 text-gray-700 disabled:text-gray-400 disabled:hover:bg-transparent'
                          }`}
                        >
                          <ChevronLeftIcon className="h-5 w-5" />
                        </button>
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {teacherPage} / {totalPages}
                        </span>
                        <button
                          onClick={() => setTeacherPage((p) => Math.min(totalPages, p + 1))}
                          disabled={teacherPage === totalPages}
                          className={`p-2 rounded-md transition-colors ${
                            theme === 'dark'
                              ? 'hover:bg-gray-700 text-gray-300 disabled:text-gray-600 disabled:hover:bg-transparent'
                              : 'hover:bg-gray-200 text-gray-700 disabled:text-gray-400 disabled:hover:bg-transparent'
                          }`}
                        >
                          <ChevronRightIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ---------- Main render ----------
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
              Class Management
            </h2>
            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage classes and their arms. Each arm can have its own teacher and alias.
            </p>
          </div>
          <button 
            onClick={() => {
              console.log('🟢 Add Class button clicked!');
              openPanel();
            }} 
            className="mt-4 sm:mt-0 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Class
          </button>
        </div>

        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => {
            const totalStudents = getTotalStudents(cls);
            return (
              <motion.div key={cls.id} variants={item} className={`group relative overflow-hidden rounded-2xl p-6 shadow-xl transition-all duration-300 ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/30 backdrop-blur-md border border-white/20'}`}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-blue-500/10 to-purple-500/10" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{cls.name}</h3>
                      {/* ✅ Display total students */}
                      <div className="flex items-center mt-1">
                        <UserGroupIcon className={`h-4 w-4 mr-1 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                          {totalStudents} {totalStudents === 1 ? 'Student' : 'Students'} Total
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <button onClick={(e) => { e.stopPropagation(); openPanel(cls); }} className={`p-1 rounded transition-colors ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300 hover:bg-white/10' : 'text-blue-600 hover:text-blue-800 hover:bg-blue-100/50'}`}>
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button onClick={(e) => deleteClass(cls.id, e)} disabled={isDeleting === cls.id} className={`p-1 rounded transition-colors ${theme === 'dark' ? 'text-red-400 hover:text-red-300 hover:bg-white/10' : 'text-red-600 hover:text-red-800 hover:bg-red-100/50'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                        {isDeleting === cls.id ? (
                          <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <TrashIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {cls.arms.map((arm) => (
                      <div
                        key={arm.id}
                        onClick={() => navigate(`/admin/class/${cls.id}/arm/${arm.id}`)}
                        className={`p-3 rounded-lg cursor-pointer transition-all hover:shadow-md ${theme === 'dark' ? 'bg-white/10 hover:bg-white/20' : 'bg-white/40 hover:bg-white/60'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              Arm {arm.letter}
                            </span>
                            {arm.alias && (
                              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                                {arm.alias}
                              </span>
                            )}
                          </div>
                          {/* ✅ Show student count per arm */}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                            {getStudentCount(arm)} students
                          </span>
                        </div>
                        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Teacher: {getTeacherName(arm)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={`absolute -top-6 -right-6 w-32 h-32 rounded-full blur-2xl transition-all group-hover:scale-110 ${theme === 'dark' ? 'bg-blue-500/20 group-hover:bg-blue-500/30' : 'bg-blue-200/30 group-hover:bg-blue-300/40'}`} />
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* ---------- Slide‑over panel ---------- */}
      <AnimatePresence>
        {isPanelOpen && selectedClass && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closePanel} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" />
            <motion.div 
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }} 
              transition={{ type: 'spring', damping: 25, stiffness: 200 }} 
              className={`fixed right-0 top-0 h-full w-full max-w-md z-50 shadow-2xl overflow-y-auto ${theme === 'dark' ? 'bg-gray-900 border-l border-white/10' : 'bg-white border-l border-gray-200'}`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{selectedClass.id ? 'Edit Class' : 'New Class'}</h3>
                  <button onClick={closePanel} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Class Name</label>
                    <input type="text" value={selectedClass.name} onChange={(e) => setSelectedClass({ ...selectedClass, name: e.target.value })} className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500' : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-400'}`} placeholder="e.g. Primary 3" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Arms</label>
                      <button onClick={addArm} className={`inline-flex items-center text-sm ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}>
                        <PlusIcon className="h-4 w-4 mr-1" /> Add Arm
                      </button>
                    </div>
                    <div className="space-y-4">
                      {selectedClass.arms.map((arm, index) => (
                        <div key={index} className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex justify-between items-center mb-2">
                            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Arm {arm.letter || '?'}</span>
                            <button onClick={() => removeArm(index)} className={`p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Letter</label>
                              <input type="text" value={arm.letter} onChange={(e) => updateArm(index, 'letter', e.target.value.toUpperCase())} className={`w-full mt-1 px-2 py-1 text-sm rounded border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} maxLength={2} />
                            </div>
                            <div>
                              <label className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Alias (optional)</label>
                              <input type="text" value={arm.alias || ''} onChange={(e) => updateArm(index, 'alias', e.target.value)} className={`w-full mt-1 px-2 py-1 text-sm rounded border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} placeholder="e.g. Science" />
                            </div>
                            <div className="col-span-2">
                              <label className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Teacher</label>
                              <div className="flex items-center gap-2 mt-1">
                                <input
                                  type="text"
                                  value={arm.teacherId ? teachers.find(t => t.id === arm.teacherId)?.name || arm.teacherId : ''}
                                  readOnly
                                  className={`flex-1 px-2 py-1 text-sm rounded border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-500'}`}
                                  placeholder="No teacher selected"
                                />
                                <button
                                  type="button"
                                  onClick={() => openTeacherModal(index)}
                                  className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors whitespace-nowrap"
                                >
                                  Select
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {selectedClass.arms.length === 0 && <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>No arms added yet. Click "Add Arm" to create one.</p>}
                    </div>
                  </div>

                  <div className="pt-4">
                    <button onClick={saveClass} disabled={!selectedClass.name.trim() || isSaving} className={`w-full flex justify-center items-center px-4 py-2 rounded-lg font-medium transition-all ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-700 disabled:text-gray-500' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:text-gray-500'}`}>
                      {isSaving ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        selectedClass.id ? 'Update Class' : 'Create Class'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Teacher Selection Modal - FIXED with flex centering for main render */}
      <AnimatePresence>
        {teacherModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setTeacherModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-300'
              }`}
              style={{ maxHeight: '80vh' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`p-6 flex-1 overflow-y-auto ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-4 sticky top-0 bg-inherit z-10 pb-2">
                  <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Select a Teacher
                  </h3>
                  <button
                    onClick={() => setTeacherModalOpen(false)}
                    className={`p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative mb-4">
                  <div className="relative">
                    <MagnifyingGlassIcon
                      className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}
                    />
                    <input
                      type="text"
                      value={teacherSearch}
                      onChange={(e) => setTeacherSearch(e.target.value)}
                      placeholder="Search teachers by name, email..."
                      className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-400'
                      }`}
                    />
                  </div>
                  {teacherSearch && (
                    <button
                      onClick={() => setTeacherSearch('')}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Teacher List - Scrollable */}
                <div className="max-h-[50vh] overflow-y-auto space-y-2">
                  {teachersLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : paginatedTeachers.length === 0 ? (
                    <div className="text-center py-8">
                      <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {teacherSearch.trim() ? 'No teachers match your search.' : 'No teachers available.'}
                      </p>
                      <button
                        onClick={() => {
                          setTeacherModalOpen(false);
                          toast('Please create a teacher first in the Teachers section', {
                            duration: 4000,
                            icon: '👨‍🏫',
                          });
                        }}
                        className={`mt-3 inline-flex items-center px-4 py-2 text-sm rounded-lg transition-colors ${
                          theme === 'dark'
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        <UserPlusIcon className="h-4 w-4 mr-2" />
                        Create Teacher
                      </button>
                    </div>
                  ) : (
                    paginatedTeachers.map((teacher) => (
                      <button
                        key={teacher.id}
                        onClick={() => selectTeacher(teacher.id)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                        }`}
                      >
                        <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {teacher.name}
                        </p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {teacher.email}
                        </p>
                        {teacher.phone && (
                          <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                            {teacher.phone}
                          </p>
                        )}
                      </button>
                    ))
                  )}
                </div>

                {/* Pagination Controls - Sticky at bottom */}
                {!teachersLoading && totalFiltered > pageSize && (
                  <div
                    className={`flex items-center justify-between mt-4 pt-3 border-t sticky bottom-0 bg-inherit pb-2 ${
                      theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                    }`}
                  >
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      Showing {(teacherPage - 1) * pageSize + 1} -{' '}
                      {Math.min(teacherPage * pageSize, totalFiltered)} of {totalFiltered}
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setTeacherPage((p) => Math.max(1, p - 1))}
                        disabled={teacherPage === 1}
                        className={`p-2 rounded-md transition-colors ${
                          theme === 'dark'
                            ? 'hover:bg-gray-700 text-gray-300 disabled:text-gray-600 disabled:hover:bg-transparent'
                            : 'hover:bg-gray-200 text-gray-700 disabled:text-gray-400 disabled:hover:bg-transparent'
                        }`}
                      >
                        <ChevronLeftIcon className="h-5 w-5" />
                      </button>
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {teacherPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setTeacherPage((p) => Math.min(totalPages, p + 1))}
                        disabled={teacherPage === totalPages}
                        className={`p-2 rounded-md transition-colors ${
                          theme === 'dark'
                            ? 'hover:bg-gray-700 text-gray-300 disabled:text-gray-600 disabled:hover:bg-transparent'
                            : 'hover:bg-gray-200 text-gray-700 disabled:text-gray-400 disabled:hover:bg-transparent'
                        }`}
                      >
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}