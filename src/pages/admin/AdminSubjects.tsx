import { useState, useEffect } from 'react';
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
  MagnifyingGlassIcon,
  UserGroupIcon,
  BookOpenIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

// ============================================================
// TYPES
// ============================================================

interface Subject {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

interface ArmSubject {
  id: string;
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
  arms?: {
    id: string;
    letter: string;
  }[];
}

interface Teacher {
  id: string;
  name: string;
  email: string;
}

const ITEMS_PER_PAGE = 10;

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function AdminSubjects() {
  const { theme } = useTheme();
  const { token } = useAuth();

  // ==========================================================
  // GLOBAL SUBJECTS
  // ==========================================================

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const [subjectForm, setSubjectForm] = useState({
    name: '',
    description: '',
  });

  const [submittingSubject, setSubmittingSubject] = useState(false);

  // ==========================================================
  // ARM SUBJECT ASSIGNMENTS
  // ==========================================================

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');

  const [arms, setArms] = useState<
    { id: string; letter: string }[]
  >([]);

  const [selectedArmId, setSelectedArmId] = useState('');

  const [armSubjects, setArmSubjects] = useState<ArmSubject[]>([]);
  const [loadingArmSubjects, setLoadingArmSubjects] = useState(false);

  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);

  const [showAddArmSubjectModal, setShowAddArmSubjectModal] =
    useState(false);

  const [showTeacherModal, setShowTeacherModal] = useState(false);

  const [currentArmSubject, setCurrentArmSubject] =
    useState<ArmSubject | null>(null);

  // Removed unused selectedSubjectId
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  // Multi-select state
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const [submittingArmAction, setSubmittingArmAction] = useState(false);

  // ==========================================================
  // FETCH SUBJECTS
  // ==========================================================

  const fetchSubjects = async () => {
    if (!token) return;

    setLoadingSubjects(true);

    try {
      const res = await api.get('/subjects', token);

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();

      setSubjects(data);
      setFilteredSubjects(data);
    } catch (error: any) {
      console.error('Failed to fetch subjects:', error);
      toast.error('Failed to load subjects');
    } finally {
      setLoadingSubjects(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [token]);

  // ==========================================================
  // SEARCH / FILTER
  // ==========================================================

  useEffect(() => {
    const search = searchTerm.toLowerCase().trim();

    const filtered = subjects.filter((subject) =>
      subject.name.toLowerCase().includes(search)
    );

    setFilteredSubjects(filtered);
    setCurrentPage(1);
  }, [searchTerm, subjects]);

  // ==========================================================
  // PAGINATION
  // ==========================================================

  const totalPages = Math.ceil(
    filteredSubjects.length / ITEMS_PER_PAGE
  );

  const paginatedSubjects = filteredSubjects.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // ==========================================================
  // SUBJECT MODAL
  // ==========================================================

  const resetSubjectModal = () => {
    setEditingSubject(null);

    setSubjectForm({
      name: '',
      description: '',
    });
  };

  const openAddSubjectModal = () => {
    resetSubjectModal();
    setShowSubjectModal(true);
  };

  const openEditSubjectModal = (subject: Subject) => {
    setEditingSubject(subject);

    setSubjectForm({
      name: subject.name,
      description: subject.description || '',
    });

    setShowSubjectModal(true);
  };

  // ==========================================================
  // CHECK FOR DUPLICATE SUBJECT
  // ==========================================================

  const checkDuplicateSubject = (name: string, excludeId?: string): boolean => {
    const trimmedName = name.trim().toLowerCase();

    return subjects.some((subject) => {
      // If editing, exclude the current subject from the check
      if (excludeId && subject.id === excludeId) {
        return false;
      }
      return subject.name.toLowerCase() === trimmedName;
    });
  };

  // ==========================================================
  // CREATE / UPDATE SUBJECT (with duplicate check)
  // ==========================================================

  const handleSaveSubject = async () => {
    const trimmedName = subjectForm.name.trim();

    if (!trimmedName) {
      toast.error('Subject name is required');
      return;
    }

    // ✅ Check for duplicate subject name
    const duplicateExists = checkDuplicateSubject(
      trimmedName,
      editingSubject?.id
    );

    if (duplicateExists) {
      toast.error(`A subject named "${trimmedName}" already exists. Please use a different name.`);
      return;
    }

    if (!token) {
      toast.error('Authentication required');
      return;
    }

    setSubmittingSubject(true);

    try {
      let res;

      if (editingSubject) {
        res = await api.put(
          `/subjects/${editingSubject.id}`,
          {
            name: trimmedName,
            description:
              subjectForm.description.trim() || undefined,
          },
          token
        );
      } else {
        res = await api.post(
          '/subjects',
          {
            name: trimmedName,
            description:
              subjectForm.description.trim() || undefined,
          },
          token
        );
      }

      if (!res.ok) {
        throw new Error(await res.text());
      }

      toast.success(
        editingSubject
          ? 'Subject updated successfully'
          : 'Subject created successfully'
      );

      await fetchSubjects();

      setShowSubjectModal(false);
      resetSubjectModal();
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.message || 'Failed to save subject'
      );
    } finally {
      setSubmittingSubject(false);
    }
  };

  // ==========================================================
  // DELETE SUBJECT
  // ==========================================================

  const handleDeleteSubject = async (subject: Subject) => {
    const result = await Swal.fire({
      title: 'Delete Subject?',
      text: `Delete "${subject.name}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      background:
        theme === 'dark' ? '#1f2937' : '#ffffff',
      color:
        theme === 'dark' ? '#ffffff' : '#000000',
    });

    if (!result.isConfirmed) return;

    if (!token) {
      toast.error('Authentication required');
      return;
    }

    try {
      const res = await api.del(
        `/subjects/${subject.id}`,
        token
      );

      if (!res.ok) {
        throw new Error(await res.text());
      }

      toast.success('Subject deleted successfully');

      await fetchSubjects();
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.message || 'Failed to delete subject'
      );
    }
  };

  // ==========================================================
  // FETCH CLASSES
  // ==========================================================

  const fetchClasses = async () => {
    if (!token) return;

    try {
      const res = await api.get('/classes', token);

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();

      setClasses(data);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
      toast.error('Failed to load classes');
    }
  };

  // ==========================================================
  // FETCH TEACHERS
  // ==========================================================

  const fetchAllTeachers = async () => {
    if (!token) return;

    try {
      const res = await api.get('/teachers', token);

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();

      setAllTeachers(data);
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
      toast.error('Failed to load teachers');
    }
  };

  useEffect(() => {
    if (!token) return;

    fetchClasses();
    fetchAllTeachers();
  }, [token]);

  // ==========================================================
  // CLASS CHANGE → LOAD ARMS
  // ==========================================================

  useEffect(() => {
    if (!selectedClassId) {
      setArms([]);
      setSelectedArmId('');
      setArmSubjects([]);
      return;
    }

    const selectedClass = classes.find(
      (cls) => cls.id === selectedClassId
    );

    setArms(selectedClass?.arms || []);
    setSelectedArmId('');
    setArmSubjects([]);
  }, [selectedClassId, classes]);

  // ==========================================================
  // ARM CHANGE → LOAD SUBJECTS
  // ==========================================================

  useEffect(() => {
    if (!selectedArmId) {
      setArmSubjects([]);
      return;
    }

    loadArmSubjects();
  }, [selectedArmId]);

  // ==========================================================
  // LOAD ARM SUBJECTS
  // ==========================================================

  const loadArmSubjects = async () => {
    if (!token || !selectedArmId) return;

    setLoadingArmSubjects(true);

    try {
      const res = await api.get(
        `/arms/${selectedArmId}/subjects`,
        token
      );

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();

      setArmSubjects(data);
    } catch (error: any) {
      console.error('Failed to load arm subjects:', error);

      toast.error(
        error?.message || 'Failed to load arm subjects'
      );
    } finally {
      setLoadingArmSubjects(false);
    }
  };

  // ==========================================================
  // GET AVAILABLE SUBJECTS (not already assigned to arm)
  // ==========================================================

  const getAvailableSubjects = () => {
    const assignedSubjectIds = new Set(
      armSubjects.map((as) => as.subjectId)
    );

    return subjects.filter(
      (subject) => !assignedSubjectIds.has(subject.id)
    );
  };

  // ==========================================================
  // ADD SUBJECT TO ARM - MULTI SELECT
  // ==========================================================

  const openAddArmSubjectModal = () => {
    setSelectedSubjectIds([]);
    setSelectAll(false);
    setSelectedTeacherId('');
    setShowAddArmSubjectModal(true);
  };

  const handleToggleSubjectSelection = (subjectId: string) => {
    setSelectedSubjectIds((prev) => {
      if (prev.includes(subjectId)) {
        return prev.filter((id) => id !== subjectId);
      } else {
        return [...prev, subjectId];
      }
    });
  };

  const handleToggleSelectAll = () => {
    const availableSubjects = getAvailableSubjects();
    if (selectAll) {
      setSelectedSubjectIds([]);
    } else {
      setSelectedSubjectIds(availableSubjects.map((s) => s.id));
    }
    setSelectAll(!selectAll);
  };

  const handleAddArmSubjects = async () => {
    if (!selectedArmId) {
      toast.error('Please select an arm');
      return;
    }

    if (selectedSubjectIds.length === 0) {
      toast.error('Please select at least one subject');
      return;
    }

    if (!token) {
      toast.error('Authentication required');
      return;
    }

    setSubmittingArmAction(true);

    try {
      // Process each selected subject
      const results = await Promise.allSettled(
        selectedSubjectIds.map(async (subjectId) => {
          // Check if already assigned (frontend check)
          const isDuplicate = armSubjects.some(
            (as) => as.subjectId === subjectId
          );

          if (isDuplicate) {
            const subjectName = subjects.find(
              (s) => s.id === subjectId
            )?.name;
            throw new Error(`"${subjectName || 'Subject'}" is already assigned`);
          }

          const res = await api.post(
            `/arms/${selectedArmId}/subjects`,
            {
              subjectId: subjectId,
              teacherId: selectedTeacherId || undefined,
            },
            token
          );

          if (!res.ok) {
            throw new Error(await res.text());
          }

          return subjectId;
        })
      );

      // Count successes and failures
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      if (succeeded > 0 && failed === 0) {
        toast.success(`${succeeded} subject(s) added successfully!`);
      } else if (succeeded > 0 && failed > 0) {
        toast.success(`${succeeded} subject(s) added, ${failed} failed.`);
      } else {
        toast.error('Failed to add subjects. Please try again.');
      }

      await loadArmSubjects();

      setShowAddArmSubjectModal(false);
      setSelectedSubjectIds([]);
      setSelectAll(false);
      setSelectedTeacherId('');
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Failed to add subjects');
    } finally {
      setSubmittingArmAction(false);
    }
  };

  // ==========================================================
  // TEACHER MODAL
  // ==========================================================

  const openTeacherModal = (
    armSubject: ArmSubject
  ) => {
    setCurrentArmSubject(armSubject);

    setSelectedTeacherId(
      armSubject.teacher?.id || ''
    );

    setShowTeacherModal(true);
  };

  // ==========================================================
  // UPDATE TEACHER
  // ==========================================================

  const handleUpdateTeacher = async () => {
    if (!currentArmSubject || !selectedArmId) {
      return;
    }

    if (!token) {
      toast.error('Authentication required');
      return;
    }

    setSubmittingArmAction(true);

    try {
      const res = await api.patch(
        `/arms/${selectedArmId}/subjects/${currentArmSubject.subjectId}/teacher`,
        {
          teacherId:
            selectedTeacherId || null,
        },
        token
      );

      if (!res.ok) {
        throw new Error(await res.text());
      }

      toast.success('Teacher updated successfully');

      await loadArmSubjects();

      setShowTeacherModal(false);
      setCurrentArmSubject(null);
    } catch (error: any) {
      console.error(error);

      toast.error(
        error?.message || 'Failed to update teacher'
      );
    } finally {
      setSubmittingArmAction(false);
    }
  };

  // ==========================================================
  // REMOVE SUBJECT FROM ARM
  // ==========================================================

  const handleRemoveArmSubject = async (
    armSubject: ArmSubject
  ) => {
    const result = await Swal.fire({
      title: 'Remove Subject?',
      text: `Remove "${armSubject.subject.name}" from this arm?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Remove',
      cancelButtonText: 'Cancel',
      background:
        theme === 'dark' ? '#1f2937' : '#ffffff',
      color:
        theme === 'dark' ? '#ffffff' : '#000000',
    });

    if (!result.isConfirmed) return;

    if (!token) {
      toast.error('Authentication required');
      return;
    }

    try {
      const res = await api.del(
        `/arms/${selectedArmId}/subjects/${armSubject.subjectId}`,
        token
      );

      if (!res.ok) {
        throw new Error(await res.text());
      }

      toast.success('Subject removed');

      await loadArmSubjects();
    } catch (error: any) {
      console.error(error);

      toast.error(
        error?.message || 'Failed to remove subject'
      );
    }
  };

  // ==========================================================
  // ARM DISPLAY
  // ==========================================================

  const getArmDisplay = () => {
    const arm = arms.find(
      (item) => item.id === selectedArmId
    );

    return formatArm(arm);
  };

  // ==========================================================
  // LOADING SCREEN
  // ==========================================================

  if (loadingSubjects) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          theme === 'dark'
            ? 'bg-[#0B1120]'
            : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
        }`}
      >
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />

          <p
            style={{
              color:
                theme === 'dark' ? '#D1D5DB' : '#000000',
            }}
          >
            Loading subjects...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className={`min-h-screen px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-300 ${
        theme === 'dark'
          ? 'bg-[#0B1120]'
          : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
      }`}
    >
      {/* DARK MODE BACKGROUND */}

      {theme === 'dark' && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                `linear-gradient(rgba(59,130,246,0.1) 1px,transparent 1px),` +
                `linear-gradient(90deg,rgba(59,130,246,0.1) 1px,transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto">

        {/* ====================================================
            SECTION 1 — SUBJECT MANAGEMENT
        ==================================================== */}

        <div className="mb-12">

          {/* HEADER */}

          <div className="sm:flex sm:items-center sm:justify-between mb-8">
            <div>
              <h2
                className={`text-2xl font-bold ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent'
                }`}
              >
                Subject Management
              </h2>

              <p
                className={`mt-2 text-sm ${
                  theme === 'dark'
                    ? 'text-gray-400'
                    : 'text-gray-600'
                }`}
              >
                Create, edit, or delete school subjects.
                These subjects can be assigned to arms below.
              </p>
            </div>

            <button
              onClick={openAddSubjectModal}
              className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Subject
            </button>
          </div>

          {/* SEARCH */}

          <div className="mb-6">
            <div className="relative max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />

              <input
                type="text"
                placeholder="Search subjects..."
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
                className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:ring-blue-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-400'
                }`}
              />
            </div>
          </div>

          {/* SUBJECT TABLE */}

          <div
            className={`overflow-x-auto rounded-2xl shadow-xl ${
              theme === 'dark'
                ? 'bg-gray-900/80 backdrop-blur-sm border border-white/10'
                : 'bg-white border border-gray-200'
            }`}
          >
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">

              <thead
                className={
                  theme === 'dark'
                    ? 'bg-gray-800/50'
                    : 'bg-gray-50'
                }
              >
                <tr>

                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{
                      color:
                        theme === 'dark'
                          ? '#9CA3AF'
                          : '#000000',
                    }}
                  >
                    Name
                  </th>

                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{
                      color:
                        theme === 'dark'
                          ? '#9CA3AF'
                          : '#000000',
                    }}
                  >
                    Description
                  </th>

                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{
                      color:
                        theme === 'dark'
                          ? '#9CA3AF'
                          : '#000000',
                    }}
                  >
                    Created At
                  </th>

                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{
                      color:
                        theme === 'dark'
                          ? '#9CA3AF'
                          : '#000000',
                    }}
                  >
                    Actions
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">

                {paginatedSubjects.map((subject) => (
                  <tr
                    key={subject.id}
                    className={
                      theme === 'dark'
                        ? 'hover:bg-white/5 transition'
                        : 'hover:bg-gray-50 transition'
                    }
                  >

                    <td
                      className="px-6 py-4 whitespace-nowrap text-sm font-medium"
                      style={{
                        color:
                          theme === 'dark'
                            ? '#E5E7EB'
                            : '#000000',
                      }}
                    >
                      {subject.name}
                    </td>

                    <td
                      className="px-6 py-4 text-sm max-w-md truncate"
                      style={{
                        color:
                          theme === 'dark'
                            ? '#E5E7EB'
                            : '#000000',
                      }}
                    >
                      {subject.description || '-'}
                    </td>

                    <td
                      className="px-6 py-4 whitespace-nowrap text-sm"
                      style={{
                        color:
                          theme === 'dark'
                            ? '#E5E7EB'
                            : '#000000',
                      }}
                    >
                      {subject.createdAt
                        ? new Date(
                            subject.createdAt
                          ).toLocaleDateString()
                        : '—'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-3">

                        <button
                          onClick={() =>
                            openEditSubjectModal(subject)
                          }
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>

                        <button
                          onClick={() =>
                            handleDeleteSubject(subject)
                          }
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>

                      </div>
                    </td>

                  </tr>
                ))}

                {paginatedSubjects.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-10 text-center"
                      style={{
                        color:
                          theme === 'dark'
                            ? '#9CA3AF'
                            : '#000000',
                      }}
                    >
                      No subjects found.
                      <br />

                      <button
                        onClick={openAddSubjectModal}
                        className="mt-2 text-blue-600 hover:underline"
                      >
                        Add your first subject
                      </button>
                    </td>
                  </tr>
                )}

              </tbody>
            </table>
          </div>

          {/* PAGINATION */}

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-6">

              <button
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.max(1, page - 1)
                  )
                }
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-300"
              >
                Previous
              </button>

              <span
                className="px-3 py-1.5 text-sm"
                style={{
                  color:
                    theme === 'dark'
                      ? '#D1D5DB'
                      : '#000000',
                }}
              >
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.min(totalPages, page + 1)
                  )
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-300"
              >
                Next
              </button>

            </div>
          )}
        </div>

        {/* ====================================================
            SECTION 2 — ARM SUBJECT ASSIGNMENTS
        ==================================================== */}

        <div className="border-t border-gray-200 dark:border-gray-700 pt-8">

          <h2
            className={`text-2xl font-bold mb-4 ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent'
                : 'bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent'
            }`}
          >
            Arm Subject Assignments
          </h2>

          <p
            className={`text-sm mb-6 ${
              theme === 'dark'
                ? 'text-gray-400'
                : 'text-gray-600'
            }`}
          >
            Select a class and arm to view assigned subjects,
            add new subjects, assign teachers, or remove subjects.
          </p>

          {/* CLASS / ARM SELECTORS */}

          <div className="flex flex-wrap gap-4 mb-6">

            <select
              value={selectedClassId}
              onChange={(e) =>
                setSelectedClassId(e.target.value)
              }
              className={`px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-400'
              }`}
            >
              <option value="">Select Class</option>

              {classes.map((cls) => (
                <option
                  key={cls.id}
                  value={cls.id}
                >
                  {cls.name}
                </option>
              ))}
            </select>

            {arms.length > 0 && (
              <select
                value={selectedArmId}
                onChange={(e) =>
                  setSelectedArmId(e.target.value)
                }
                className={`px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                    : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-400'
                }`}
              >
                <option value="">Select Arm</option>

                {arms.map((arm) => (
                  <option
                    key={arm.id}
                    value={arm.id}
                  >
                    {formatArm(arm)}
                  </option>
                ))}
              </select>
            )}

          </div>

          {/* SELECTED ARM */}

          {selectedArmId && (
            <>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">

                <h3
                  className={`text-lg font-semibold ${
                    theme === 'dark'
                      ? 'text-white'
                      : 'text-gray-900'
                  }`}
                >
                  Subjects offered in {getArmDisplay()}
                </h3>

                <button
                  onClick={openAddArmSubjectModal}
                  className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Subjects
                </button>

              </div>

              {/* LOADING */}

              {loadingArmSubjects ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : armSubjects.length === 0 ? (

                /* EMPTY */

                <div
                  className={`p-8 text-center rounded-2xl ${
                    theme === 'dark'
                      ? 'bg-white/5 border border-white/10'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <BookOpenIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />

                  <p
                    style={{
                      color:
                        theme === 'dark'
                          ? '#9CA3AF'
                          : '#000000',
                    }}
                  >
                    No subjects assigned to this arm yet.
                  </p>

                  <button
                    onClick={openAddArmSubjectModal}
                    className="mt-3 text-blue-600 hover:underline"
                  >
                    Add subjects
                  </button>
                </div>

              ) : (

                /* TABLE */

                <div
                  className={`overflow-x-auto rounded-2xl shadow-xl ${
                    theme === 'dark'
                      ? 'bg-gray-900/80 backdrop-blur-sm border border-white/10'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">

                    <thead
                      className={
                        theme === 'dark'
                          ? 'bg-gray-800/50'
                          : 'bg-gray-50'
                      }
                    >
                      <tr>

                        <th
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                          style={{
                            color:
                              theme === 'dark'
                                ? '#9CA3AF'
                                : '#000000',
                          }}
                        >
                          Subject
                        </th>

                        <th
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                          style={{
                            color:
                              theme === 'dark'
                                ? '#9CA3AF'
                                : '#000000',
                          }}
                        >
                          Teacher
                        </th>

                        <th
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                          style={{
                            color:
                              theme === 'dark'
                                ? '#9CA3AF'
                                : '#000000',
                          }}
                        >
                          Actions
                        </th>

                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">

                      {armSubjects.map((armSub) => (
                        <tr
                          key={armSub.id}
                          className={
                            theme === 'dark'
                              ? 'hover:bg-white/5 transition'
                              : 'hover:bg-gray-50 transition'
                          }
                        >

                          <td
                            className="px-6 py-4 whitespace-nowrap text-sm font-medium"
                            style={{
                              color:
                                theme === 'dark'
                                  ? '#E5E7EB'
                                  : '#000000',
                            }}
                          >
                            {armSub.subject.name}
                          </td>

                          <td
                            className="px-6 py-4 whitespace-nowrap text-sm"
                            style={{
                              color:
                                theme === 'dark'
                                  ? '#E5E7EB'
                                  : '#000000',
                            }}
                          >
                            {armSub.teacher?.name ||
                              'Not assigned'}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm">

                            <div className="flex items-center gap-3">

                              <button
                                onClick={() =>
                                  openTeacherModal(
                                    armSub
                                  )
                                }
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                title="Assign Teacher"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>

                              <button
                                onClick={() =>
                                  handleRemoveArmSubject(
                                    armSub
                                  )
                                }
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                title="Remove Subject"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>

                            </div>

                          </td>

                        </tr>
                      ))}

                    </tbody>
                  </table>
                </div>
              )}

              {/* =================================================
                  STUDENT SUBJECT EXCEPTIONS
              ================================================= */}

              <div className="mt-8">

                <h3
                  className={`text-lg font-semibold mb-4 ${
                    theme === 'dark'
                      ? 'text-white'
                      : 'text-gray-900'
                  }`}
                >
                  Student Subject Exceptions
                </h3>

                <div
                  className={`p-6 rounded-2xl ${
                    theme === 'dark'
                      ? 'bg-white/5 border border-white/10'
                      : 'bg-white border border-gray-200'
                  }`}
                >

                  <p
                    style={{
                      color:
                        theme === 'dark'
                          ? '#9CA3AF'
                          : '#000000',
                    }}
                  >
                    To assign different subjects to individual
                    students, such as a student who takes a subject
                    not offered by the arm or drops a subject, go to                    the student's profile and edit their subject
                    offerings.
                  </p>

                  <button
                    onClick={() =>
                      (window.location.href =
                        '/admin/students')
                    }
                    className="mt-3 inline-flex items-center text-blue-600 hover:underline"
                  >
                    <UserGroupIcon className="h-4 w-4 mr-1" />
                    Go to Student Management
                  </button>

                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ======================================================
          MODALS
      ====================================================== */}

      {/* ======================================================
          ADD / EDIT SUBJECT MODAL
      ====================================================== */}

      <AnimatePresence>
        {showSubjectModal && (
          <Modal
            onClose={() => {
              setShowSubjectModal(false);
              resetSubjectModal();
            }}
            title={
              editingSubject
                ? 'Edit Subject'
                : 'Add New Subject'
            }
            theme={theme}
          >
            <div className="space-y-4">

              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${
                    theme === 'dark'
                      ? 'text-gray-300'
                      : 'text-gray-700'
                  }`}
                >
                  Name *
                </label>

                <input
                  type="text"
                  value={subjectForm.name}
                  onChange={(e) =>
                    setSubjectForm({
                      ...subjectForm,
                      name: e.target.value,
                    })
                  }
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:ring-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-400'
                  }`}
                  placeholder="e.g., Mathematics"
                />

                {/* ✅ Show duplicate warning in real-time */}
                {subjectForm.name.trim() && (
                  <p
                    className={`mt-1 text-sm ${
                      checkDuplicateSubject(
                        subjectForm.name.trim(),
                        editingSubject?.id
                      )
                        ? 'text-red-500'
                        : 'text-green-500'
                    }`}
                  >
                    {checkDuplicateSubject(
                      subjectForm.name.trim(),
                      editingSubject?.id
                    )
                      ? '⚠️ A subject with this name already exists'
                      : '✓ Subject name is available'}
                  </p>
                )}
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${
                    theme === 'dark'
                      ? 'text-gray-300'
                      : 'text-gray-700'
                  }`}
                >
                  Description (optional)
                </label>

                <textarea
                  rows={3}
                  value={subjectForm.description}
                  onChange={(e) =>
                    setSubjectForm({
                      ...subjectForm,
                      description: e.target.value,
                    })
                  }
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:ring-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-400'
                  }`}
                  placeholder="Optional description"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">

                <button
                  onClick={() => {
                    setShowSubjectModal(false);
                    resetSubjectModal();
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSaveSubject}
                  disabled={
                    submittingSubject ||
                    !subjectForm.name.trim() ||
                    checkDuplicateSubject(
                      subjectForm.name.trim(),
                      editingSubject?.id
                    )
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 transition"
                >
                  {submittingSubject
                    ? 'Saving...'
                    : editingSubject
                    ? 'Update'
                    : 'Create'}
                </button>

              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ======================================================
          ADD SUBJECTS TO ARM MODAL - MULTI SELECT
      ====================================================== */}

      <AnimatePresence>
        {showAddArmSubjectModal && (
          <Modal
            onClose={() => {
              setShowAddArmSubjectModal(false);
              setSelectedSubjectIds([]);
              setSelectAll(false);
            }}
            title="Add Subjects to Arm"
            theme={theme}
          >
            <div className="space-y-4">
              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${
                    theme === 'dark'
                      ? 'text-gray-300'
                      : 'text-gray-700'
                  }`}
                >
                  Teacher (optional - will be assigned to all selected subjects)
                </label>

                <select
                  value={selectedTeacherId}
                  onChange={(e) =>
                    setSelectedTeacherId(e.target.value)
                  }
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-400'
                  }`}
                >
                  <option value="">
                    -- Not assigned --
                  </option>

                  {allTeachers.map((teacher) => (
                    <option
                      key={teacher.id}
                      value={teacher.id}
                    >
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    className={`block text-sm font-medium ${
                      theme === 'dark'
                        ? 'text-gray-300'
                        : 'text-gray-700'
                    }`}
                  >
                    Select Subjects
                  </label>

                  <button
                    onClick={handleToggleSelectAll}
                    className={`text-sm px-3 py-1 rounded-lg transition ${
                      theme === 'dark'
                        ? 'text-blue-400 hover:text-blue-300 hover:bg-white/10'
                        : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                    }`}
                  >
                    {selectAll ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div
                  className={`max-h-60 overflow-y-auto rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  {getAvailableSubjects().length === 0 ? (
                    <div
                      className={`p-4 text-center ${
                        theme === 'dark'
                          ? 'text-yellow-400'
                          : 'text-yellow-600'
                      }`}
                    >
                      ⚠️ All subjects are already assigned to this arm.
                    </div>
                  ) : (
                    getAvailableSubjects().map((subject) => {
                      const isChecked = selectedSubjectIds.includes(subject.id);
                      return (
                        <label
                          key={subject.id}
                          className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition ${
                            theme === 'dark'
                              ? 'hover:bg-white/5'
                              : 'hover:bg-gray-100'
                          } ${
                            isChecked
                              ? theme === 'dark'
                                ? 'bg-blue-900/20'
                                : 'bg-blue-50'
                              : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSubjectSelection(subject.id)}
                            className={`w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
                              theme === 'dark'
                                ? 'bg-gray-700 border-gray-600'
                                : 'bg-white'
                            }`}
                          />
                          <div className="flex-1">
                            <span
                              className={`text-sm font-medium ${
                                theme === 'dark'
                                  ? 'text-white'
                                  : 'text-gray-900'
                              }`}
                            >
                              {subject.name}
                            </span>
                            {subject.description && (
                              <span
                                className={`ml-2 text-xs ${
                                  theme === 'dark'
                                    ? 'text-gray-400'
                                    : 'text-gray-500'
                                }`}
                              >
                                - {subject.description}
                              </span>
                            )}
                          </div>
                          {isChecked && (
                            <CheckIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          )}
                        </label>
                      );
                    })
                  )}
                </div>

                <div
                  className={`mt-2 text-sm ${
                    theme === 'dark'
                      ? 'text-gray-400'
                      : 'text-gray-500'
                  }`}
                >
                  {selectedSubjectIds.length} subject(s) selected
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddArmSubjectModal(false);
                    setSelectedSubjectIds([]);
                    setSelectAll(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                >
                  Cancel
                </button>

                <button
                  onClick={handleAddArmSubjects}
                  disabled={
                    submittingArmAction ||
                    selectedSubjectIds.length === 0 ||
                    getAvailableSubjects().length === 0
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 transition"
                >
                  {submittingArmAction
                    ? `Adding ${selectedSubjectIds.length} subject(s)...`
                    : `Add ${selectedSubjectIds.length} Subject${selectedSubjectIds.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ======================================================
          ASSIGN TEACHER MODAL
      ====================================================== */}

      <AnimatePresence>
        {showTeacherModal &&
          currentArmSubject && (
            <Modal
              onClose={() => {
                setShowTeacherModal(false);
                setCurrentArmSubject(null);
              }}
              title="Assign Teacher"
              theme={theme}
            >
              <div className="space-y-4">

                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      theme === 'dark'
                        ? 'text-gray-300'
                        : 'text-gray-700'
                    }`}
                  >
                    Subject
                  </label>

                  <div
                    className={`px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-700 text-white'
                        : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}
                  >
                    {currentArmSubject.subject.name}
                  </div>
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      theme === 'dark'
                        ? 'text-gray-300'
                        : 'text-gray-700'
                    }`}
                  >
                    Teacher
                  </label>

                  <select
                    value={selectedTeacherId}
                    onChange={(e) =>
                      setSelectedTeacherId(
                        e.target.value
                      )
                    }
                    className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                        : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-400'
                    }`}
                  >
                    <option value="">
                      -- Not assigned --
                    </option>

                    {allTeachers.map((teacher) => (
                      <option
                        key={teacher.id}
                        value={teacher.id}
                      >
                        {teacher.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4">

                  <button
                    onClick={() => {
                      setShowTeacherModal(false);
                      setCurrentArmSubject(null);
                    }}
                    className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleUpdateTeacher}
                    disabled={submittingArmAction}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 transition"
                  >
                    {submittingArmAction
                      ? 'Saving...'
                      : 'Save'}
                  </button>

                </div>
              </div>
            </Modal>
          )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// REUSABLE MODAL COMPONENT
// ============================================================

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  theme: string;
}

function Modal({
  children,
  onClose,
  title,
  theme,
}: ModalProps) {
  return (
    <>
      {/* BACKDROP */}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
      />

      {/* MODAL */}

      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">

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
          onClick={(e) =>
            e.stopPropagation()
          }
          className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden pointer-events-auto ${
            theme === 'dark'
              ? 'bg-gray-900'
              : 'bg-white'
          }`}
        >

          {/* HEADER */}

          <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">

            <h3
              className={`text-xl font-bold ${
                theme === 'dark'
                  ? 'text-white'
                  : 'text-gray-900'
              }`}
            >
              {title}
            </h3>

            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              aria-label="Close modal"
            >
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>

          </div>

          {/* BODY */}

          <div className="p-6">
            {children}
          </div>

        </motion.div>
      </div>
    </>
  );
}