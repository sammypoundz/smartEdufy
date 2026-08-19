import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

// ---------- Interfaces ----------
interface Teacher {
  id: string;
  name: string | null;
  email: string;
  phone?: string | null;
  isActive: boolean;
  createdAt?: string;
}

// Dark mode role badges (gradient + subtle background)
const ROLE_COLORS_DARK: Record<string, string> = {
  TEACHER: 'bg-gradient-to-r from-sky-900/30 to-blue-900/30 text-sky-300 border-sky-800',
};

// Light mode role badges (solid colour, white text)
const ROLE_COLORS_LIGHT: Record<string, string> = {
  TEACHER: 'bg-sky-600 text-white border-sky-700',
};

// Helper to get role badge classes based on theme
const getRoleBadgeClass = (role: string, theme: string) => {
  const base = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-sm border-2';
  const colorClass = theme === 'dark' ? ROLE_COLORS_DARK[role] : ROLE_COLORS_LIGHT[role];
  return `${base} ${colorClass}`;
};

export default function AdminTeachers() {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    isActive: true,
  });

  const [submitting, setSubmitting] = useState(false);

  // ---------- Per‑action loading states ----------
  const [actionLoading, setActionLoading] = useState<{ [key: string]: 'toggle' | 'delete' }>({});

  // ---------- Fetch Teachers ----------
  const fetchTeachers = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get('/teachers');
      let data = res.data;
      if (!Array.isArray(data)) data = [];
      setTeachers(data);
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        'Failed to load teachers';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  // ---------- Filter Teachers ----------
  const filteredTeachers = useMemo(() => {
    return teachers.filter((teacher) => {
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = teacher.name
        ? teacher.name.toLowerCase().includes(searchLower)
        : false;
      const emailMatch = teacher.email.toLowerCase().includes(searchLower);
      const phoneMatch = teacher.phone
        ? teacher.phone.toLowerCase().includes(searchLower)
        : false;
      const matchesSearch =
        searchTerm === '' || nameMatch || emailMatch || phoneMatch;
      return matchesSearch;
    });
  }, [teachers, searchTerm]);

  // ---------- Pagination ----------
  const totalPages = Math.max(
    1,
    Math.ceil(filteredTeachers.length / rowsPerPage)
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, rowsPerPage]);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const paginatedTeachers = filteredTeachers.slice(
    startIndex,
    endIndex
  );

  const handlePageChange = (newPage: number) => {
    setCurrentPage(Math.max(1, Math.min(newPage, totalPages)));
  };

  // ---------- CRUD ----------
  const openAddModal = () => {
    setEditingTeacher(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      isActive: true,
    });
    setShowModal(true);
  };

  const openEditModal = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      name: teacher.name || '',
      email: teacher.email,
      phone: teacher.phone || '',
      password: '',
      isActive: teacher.isActive,
    });
    setShowModal(true);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email) {
      toast.error('Name and email are required');
      return;
    }
    if (!editingTeacher && !formData.password) {
      toast.error('Password is required for new teachers');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        isActive: formData.isActive,
        ...(formData.password && { password: formData.password }),
      };

      if (editingTeacher) {
        const res = await api.put(`/teachers/${editingTeacher.id}`, payload);
        const updated = res.data;
        setTeachers((prev) =>
          prev.map((t) => (t.id === editingTeacher.id ? updated : t))
        );
        toast.success('Teacher updated');
      } else {
        const res = await api.post('/teachers', payload);
        const created = res.data;
        setTeachers((prev) => [...prev, created]);
        toast.success('Teacher added');
      }
      setShowModal(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (teacher: Teacher) => {
    const result = await Swal.fire({
      title: 'Delete Teacher',
      text: `Delete ${teacher.name || teacher.email}? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete',
    });

    if (!result.isConfirmed) return;

    // Set loading state for this teacher's delete button
    setActionLoading((prev) => ({ ...prev, [teacher.id]: 'delete' }));

    try {
      await api.delete(`/teachers/${teacher.id}`);
      setTeachers((prev) => prev.filter((t) => t.id !== teacher.id));
      toast.success('Teacher deleted');
    } catch {
      toast.error('Delete failed');
    } finally {
      setActionLoading((prev) => {
        const newState = { ...prev };
        delete newState[teacher.id];
        return newState;
      });
    }
  };

  // Toggle status with loading state
  const toggleTeacherStatus = async (teacher: Teacher) => {
    const newStatus = !teacher.isActive;

    // Set loading state for this teacher's toggle button
    setActionLoading((prev) => ({ ...prev, [teacher.id]: 'toggle' }));

    try {
      const res = await api.patch(`/teachers/${teacher.id}`, {
        isActive: newStatus,
      });
      const updated = res.data;
      setTeachers((prev) =>
        prev.map((t) => (t.id === teacher.id ? updated : t))
      );
      toast.success(`Teacher ${newStatus ? 'activated' : 'deactivated'}`);
    } catch (err) {
      console.error(err);
      toast.error('Status update failed');
    } finally {
      setActionLoading((prev) => {
        const newState = { ...prev };
        delete newState[teacher.id];
        return newState;
      });
    }
  };

  // ---------- Loading ----------
  if (loading) {
    return (
      <div className={`flex items-center justify-center h-screen ${
        theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className={`mt-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Loading teachers...
          </p>
        </div>
      </div>
    );
  }

  // ---------- Error ----------
  if (error) {
    return (
      <div className={`flex items-center justify-center h-screen ${
        theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100'
      }`}>
        <div className="text-center text-red-600 dark:text-red-400">
          <p>{error}</p>
          <button
            onClick={fetchTeachers}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ---------- Main Render ----------
  return (
    <div className={`min-h-screen px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100'
    }`}>
      {/* Dark mode grid background */}
      {theme === 'dark' && (
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `linear-gradient(rgba(59,130,246,0.1) 1px,transparent 1px), linear-gradient(90deg,rgba(59,130,246,0.1) 1px,transparent 1px)`, backgroundSize: '60px 60px' }} />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header card */}
        <div
          className={`rounded-2xl p-6 mb-8 ${
            theme === 'dark'
              ? 'bg-white/5 backdrop-blur-xl border border-white/10'
              : 'bg-white/80 backdrop-blur-xl shadow-lg border border-gray-200/60'
          }`}
        >
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h2 className={`text-2xl font-bold ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent'
              }`}>
                Teacher Management
              </h2>
              <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Manage all teachers in the system. View, edit, or add new teachers.
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={openAddModal}
              className="mt-4 sm:mt-0 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg transition-shadow duration-200"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Teacher
            </motion.button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <MagnifyingGlassIcon className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`block w-full rounded-xl border-0 bg-transparent pl-12 pr-4 py-3 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark'
                  ? 'bg-white/5 backdrop-blur-xl text-white placeholder-gray-500 border border-white/10'
                  : 'bg-white/80 backdrop-blur-sm border border-gray-200/70 text-gray-900 placeholder-gray-400'
              }`}
              placeholder="Search by name, email, or phone..."
            />
          </div>
        </div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl shadow-md overflow-hidden"
        >
          <div className={`overflow-x-auto ${
            theme === 'dark'
              ? 'bg-white/5 backdrop-blur-xl border border-white/10'
              : 'bg-white/80 backdrop-blur-xl border border-gray-200/60'
          }`}>
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className={`py-4 pl-6 pr-3 text-left text-xs font-semibold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Name
                  </th>
                  <th className={`px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Email
                  </th>
                  <th className={`px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Role
                  </th>
                  <th className={`px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Phone
                  </th>
                  <th className={`px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Status
                  </th>
                  <th className={`relative py-4 pl-3 pr-6 text-right text-xs font-semibold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                theme === 'dark' ? 'divide-white/10' : 'divide-gray-200/70'
              }`}>
                {paginatedTeachers.map((teacher) => {
                  const isToggling = actionLoading[teacher.id] === 'toggle';
                  const isDeleting = actionLoading[teacher.id] === 'delete';

                  return (
                    <motion.tr
                      key={teacher.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      whileHover={{
                        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(59,130,246,0.04)',
                      }}
                      transition={{ duration: 0.15 }}
                      className="cursor-default"
                    >
                      <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => navigate(`/admin/teacher/${teacher.id}`)}
                            className={`p-1.5 rounded-full transition-colors ${
                              theme === 'dark'
                                ? 'bg-white/5 text-blue-400 hover:bg-white/10'
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                            }`}
                            title="View Teacher Profile"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </motion.button>
                          <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                            {teacher.name || '—'}
                          </span>
                        </div>
                      </td>
                      <td className={`whitespace-nowrap px-3 py-4 text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        {teacher.email}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={getRoleBadgeClass('TEACHER', theme)}>
                          Teacher
                        </span>
                      </td>
                      <td className={`whitespace-nowrap px-3 py-4 text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        {teacher.phone || '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        {teacher.isActive ? (
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold border-2 ${
                            theme === 'dark'
                              ? 'bg-green-900/30 text-green-300 border-green-800'
                              : 'bg-green-600 text-white border-green-700'
                          }`}>
                            <CheckCircleIcon className="h-4 w-4" />
                            Active
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold border-2 ${
                            theme === 'dark'
                              ? 'bg-red-900/30 text-red-300 border-red-800'
                              : 'bg-red-600 text-white border-red-700'
                          }`}>
                            <XCircleIcon className="h-4 w-4" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm">
                        <div className="flex items-center justify-end gap-1">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => openEditModal(teacher)}
                            className={`p-2 rounded-full transition-colors ${
                              theme === 'dark'
                                ? 'bg-white/5 text-blue-400 hover:bg-white/10'
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                            }`}
                            disabled={isToggling || isDeleting}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </motion.button>

                          {/* Toggle status button with loader */}
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => toggleTeacherStatus(teacher)}
                            className={`p-2 rounded-full transition-colors ${
                              teacher.isActive
                                ? theme === 'dark'
                                  ? 'bg-white/5 text-yellow-400 hover:bg-white/10'
                                  : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                                : theme === 'dark'
                                  ? 'bg-white/5 text-green-400 hover:bg-white/10'
                                  : 'bg-green-50 text-green-600 hover:bg-green-100'
                            } ${(isToggling || isDeleting) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={isToggling || isDeleting}
                          >
                            {isToggling ? (
                              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : teacher.isActive ? (
                              <XCircleIcon className="h-4 w-4" />
                            ) : (
                              <CheckCircleIcon className="h-4 w-4" />
                            )}
                          </motion.button>

                          {/* Delete button with loader */}
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDelete(teacher)}
                            className={`p-2 rounded-full transition-colors ${
                              theme === 'dark'
                                ? 'bg-white/5 text-red-400 hover:bg-white/10'
                                : 'bg-red-50 text-red-600 hover:bg-red-100'
                            } ${(isToggling || isDeleting) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={isToggling || isDeleting}
                          >
                            {isDeleting ? (
                              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <TrashIcon className="h-4 w-4" />
                            )}
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
                {paginatedTeachers.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className={`px-6 py-8 text-center text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}
                    >
                      No teachers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={`flex items-center justify-between px-4 py-3 mt-4 rounded-xl shadow-sm ${
            theme === 'dark'
              ? 'bg-gray-800/50 backdrop-blur border border-white/20'
              : 'bg-white/80 backdrop-blur border border-gray-200/60'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Page {currentPage} of {totalPages}
              </span>
              <select
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                className={`px-2 py-1 text-sm border rounded-md ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                {[5, 10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n} per page
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-md text-sm transition-colors disabled:opacity-50 ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:bg-gray-800'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:bg-gray-100'
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-md text-sm transition-colors disabled:opacity-50 ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:bg-gray-800'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:bg-gray-100'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className={`relative w-full max-w-md rounded-2xl shadow-2xl ${
                theme === 'dark'
                  ? 'bg-gray-900 border border-gray-700'
                  : 'bg-white/90 backdrop-blur-xl border border-gray-200/60'
              } p-6`}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowModal(false)}
                className={`absolute top-3 right-3 p-1 rounded-full transition-colors ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:bg-white/10'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>

              <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
              </h2>

              <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="e.g., Dr. Nnamdi Eze"
                    required
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="teacher@school.com"
                    required
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Phone
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleFormChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="+234 800 000 0000"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Password {!editingTeacher && '*'}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleFormChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder={editingTeacher ? 'Leave blank to keep current' : 'Enter password'}
                    required={!editingTeacher}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleFormChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Active (teacher can log in)
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className={`px-4 py-2 border rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-800'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {submitting && (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    {editingTeacher ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}