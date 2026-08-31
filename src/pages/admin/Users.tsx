import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import api from '../../services/api';
import { PAGE_PRIVILEGES, SYSTEM_ROLE_PRIVILEGES } from '../../utils/privileges';import { useNavigate } from 'react-router-dom';
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
interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  roles?: string[];
  isActive: boolean;
  allowedPages?: string[];
  createdAt?: string;
}

// Staff roles that can be granted page privileges (students/parents excluded)
const NON_PRIVILEGED_ROLES = ['STUDENT', 'PARENT'];
const isPrivilegeable = (role: string) => !NON_PRIVILEGED_ROLES.includes(role);

const ROLE_OPTIONS: string[] = [
  'ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL', 'TEACHER', 'BURSAR', 'ACCOUNTANT', 'LIBRARIAN', 'PARENT', 'STUDENT',
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin', PRINCIPAL: 'Principal', VICE_PRINCIPAL: 'Vice Principal',
  TEACHER: 'Teacher', BURSAR: 'Bursar', ACCOUNTANT: 'Accountant',
  LIBRARIAN: 'Librarian', PARENT: 'Parent', STUDENT: 'Student',
};

// Dark mode role badges (gradient + subtle background)
const ROLE_COLORS_DARK: Record<string, string> = {
  ADMIN: 'bg-gradient-to-r from-violet-900/30 to-purple-900/30 text-violet-300 border-violet-800',
  PRINCIPAL: 'bg-gradient-to-r from-rose-900/30 to-red-900/30 text-rose-300 border-rose-800',
  VICE_PRINCIPAL: 'bg-gradient-to-r from-orange-900/30 to-amber-900/30 text-orange-300 border-orange-800',
  TEACHER: 'bg-gradient-to-r from-sky-900/30 to-blue-900/30 text-sky-300 border-sky-800',
  PARENT: 'bg-gradient-to-r from-emerald-900/30 to-green-900/30 text-emerald-300 border-emerald-800',
  STUDENT: 'bg-gradient-to-r from-amber-900/30 to-yellow-900/30 text-amber-300 border-amber-800',
  BURSAR: 'bg-gradient-to-r from-indigo-900/30 to-violet-900/30 text-indigo-300 border-indigo-800',
  ACCOUNTANT: 'bg-gradient-to-r from-cyan-900/30 to-teal-900/30 text-cyan-300 border-cyan-800',
  LIBRARIAN: 'bg-gradient-to-r from-pink-900/30 to-fuchsia-900/30 text-pink-300 border-pink-800',
};

// Light mode role badges (solid colour, white text + darker border)
const ROLE_COLORS_LIGHT: Record<string, string> = {
  ADMIN: 'bg-violet-600 text-white border-violet-700',
  PRINCIPAL: 'bg-rose-600 text-white border-rose-700',
  VICE_PRINCIPAL: 'bg-orange-600 text-white border-orange-700',
  TEACHER: 'bg-sky-600 text-white border-sky-700',
  PARENT: 'bg-emerald-600 text-white border-emerald-700',
  STUDENT: 'bg-amber-600 text-white border-amber-700',
  BURSAR: 'bg-indigo-600 text-white border-indigo-700',
  ACCOUNTANT: 'bg-cyan-600 text-white border-cyan-700',
  LIBRARIAN: 'bg-pink-600 text-white border-pink-700',
};

const FALLBACK_BADGE_DARK = 'bg-gray-700/40 text-gray-300 border-gray-600';
const FALLBACK_BADGE_LIGHT = 'bg-gray-500 text-white border-gray-600';

// Helper to get role badge classes based on theme
const getRoleBadgeClass = (role: string, theme: string) => {
  const base = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-sm border-2';
  const colorClass = theme === 'dark'
    ? (ROLE_COLORS_DARK[role] || FALLBACK_BADGE_DARK)
    : (ROLE_COLORS_LIGHT[role] || FALLBACK_BADGE_LIGHT);
  return `${base} ${colorClass}`;
};

export default function AdminUsers() {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'STUDENT' as string,
    roles: [] as string[],
    password: '',
    isActive: true,
    allowedPages: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);

  // ---------- Per‑action loading states ----------
  const [actionLoading, setActionLoading] = useState<{ [key: string]: 'toggle' | 'delete' }>({});

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/users');
      let data = res.data;
      if (!Array.isArray(data)) data = [];
      setUsers(data);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to load users';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = user.name ? user.name.toLowerCase().includes(searchLower) : false;
      const emailMatch = user.email.toLowerCase().includes(searchLower);
      const matchesSearch = searchTerm === '' || nameMatch || emailMatch;
      const matchesRole = !roleFilter || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const handlePageChange = (newPage: number) => setCurrentPage(Math.max(1, Math.min(newPage, totalPages)));
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, rowsPerPage]);

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', role: 'STUDENT', roles: ['STUDENT'], password: '', isActive: true, allowedPages: [...SYSTEM_ROLE_PRIVILEGES['STUDENT']] });
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    const roles = user.roles?.length ? user.roles : [user.role].filter(Boolean);
    setFormData({
      name: user.name || '',
      email: user.email,
      role: user.role,
      roles,
      password: '',
      isActive: user.isActive,
      allowedPages: user.allowedPages || [],
    });
    setShowModal(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const defaultsForRoles = (roles: string[]): string[] =>
    Array.from(new Set(roles.flatMap(r => SYSTEM_ROLE_PRIVILEGES[r] || [])));

  const handleRoleToggle = (role: string) => {
    setFormData(prev => {
      const roles = prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role];
      // Whenever roles change, the privilege checkboxes follow the combined
      // defaults of the roles now selected (admin can still adjust after).
      return { ...prev, roles, role: roles[0] || '', allowedPages: defaultsForRoles(roles) };
    });
  };

  const handlePrivilegeToggle = (key: string) => {
    setFormData(prev => ({
      ...prev,
      allowedPages: prev.allowedPages.includes(key)
        ? prev.allowedPages.filter(p => p !== key)
        : [...prev.allowedPages, key],
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.role) {
      toast.error('Please fill all required fields');
      return;
    }
    if (!editingUser && !formData.password) {
      toast.error('Password is required for new users');
      return;
    }

    setSubmitting(true);
    try {
      const roles = formData.roles.length ? formData.roles : [formData.role].filter(Boolean);
      const showPrivileges = roles.some(isPrivilegeable);
      const payload = {
        name: formData.name,
        email: formData.email,
        role: roles[0] || formData.role,
        roles,
        isActive: formData.isActive,
        allowedPages: showPrivileges ? formData.allowedPages : [],
        ...(formData.password && { password: formData.password }),
      };
      if (editingUser) {
        const res = await api.put(`/users/${editingUser.id}`, payload);
        const updated = res.data;
        setUsers(prev => prev.map(u => u.id === editingUser.id ? updated : u));
        toast.success('User updated');
      } else {
        const res = await api.post('/users', payload);
        const created = res.data;
        setUsers(prev => [...prev, created]);
        toast.success('User added');
      }
      setShowModal(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (user: User) => {
    const result = await Swal.fire({
      title: 'Delete User',
      text: `Delete ${user.name || user.email}? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete',
    });
    if (!result.isConfirmed) return;

    setActionLoading(prev => ({ ...prev, [user.id]: 'delete' }));

    try {
      await api.delete(`/users/${user.id}`);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      toast.success('User deleted');
    } catch (err) {
      toast.error('Delete failed');
    } finally {
      setActionLoading(prev => {
        const newState = { ...prev };
        delete newState[user.id];
        return newState;
      });
    }
  };

  const toggleUserStatus = async (user: User) => {
    const newStatus = !user.isActive;

    setActionLoading(prev => ({ ...prev, [user.id]: 'toggle' }));

    try {
      const res = await api.patch(`/users/${user.id}/status`, { isActive: newStatus });
      const updated = res.data;
      setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
      toast.success(`User ${newStatus ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toast.error('Status update failed');
    } finally {
      setActionLoading(prev => {
        const newState = { ...prev };
        delete newState[user.id];
        return newState;
      });
    }
  };

  // Loading & Error states
  if (loading) {
    return (
      <div className={`flex items-center justify-center h-screen ${
        theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className={`mt-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-screen ${
        theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100'
      }`}>
        <div className="text-center text-red-600 dark:text-red-400">
          <p>{error}</p>
          <button onClick={fetchUsers} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Retry</button>
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
                User Management
              </h2>
              <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Manage all users (admins, teachers, parents, students). Assign roles and permissions.
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={openAddModal}
              className="mt-4 sm:mt-0 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg transition-shadow duration-200"
            >
              <PlusIcon className="h-5 w-5 mr-2" /> Add User
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
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`block w-full rounded-xl border-0 bg-transparent pl-12 pr-4 py-3 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark'
                  ? 'bg-white/5 backdrop-blur-xl text-white placeholder-gray-500 border border-white/10'
                  : 'bg-white/80 backdrop-blur-sm border border-gray-200/70 text-gray-900 placeholder-gray-400'
              }`}
            />
          </div>

          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={`w-full rounded-xl border-0 bg-transparent px-4 py-3 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark'
                  ? 'bg-white/5 backdrop-blur-xl text-white border border-white/10'
                  : 'bg-white/80 backdrop-blur-sm border border-gray-200/70 text-gray-900'
              }`}
              style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
            >
              <option value="" className={theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}>
                All Roles
              </option>
              {ROLE_OPTIONS.map(role => (
                <option key={role} value={role} className={theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}>
                  {role}
                </option>
              ))}
            </select>
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
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={`text-center py-8 text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      No users found. <button onClick={openAddModal} className="text-blue-500 underline">Add one</button>.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => {
                    const isToggling = actionLoading[user.id] === 'toggle';
                    const isDeleting = actionLoading[user.id] === 'delete';
                    const isBusy = isToggling || isDeleting;

                    return (
                      <motion.tr
                        key={user.id}
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
                            {user.role === 'TEACHER' && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => navigate(`/admin/teacher/${user.id}`)}
                                className={`p-1.5 rounded-full transition-colors ${
                                  theme === 'dark'
                                    ? 'bg-white/5 text-blue-400 hover:bg-white/10'
                                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                }`}
                                title="View Teacher Profile"
                                disabled={isBusy}
                              >
                                <EyeIcon className="h-4 w-4" />
                              </motion.button>
                            )}
                            <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                              {user.name || <span className="italic text-gray-400 dark:text-gray-500">No name</span>}
                            </span>
                          </div>
                        </td>
                        <td className={`whitespace-nowrap px-3 py-4 text-sm ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          {user.email}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {(user.roles?.length ? user.roles : [user.role].filter(Boolean)).map(r => (
                              <span key={r} className={getRoleBadgeClass(r, theme)}>
                                {ROLE_LABELS[r] || r}
                              </span>
                            ))}
                          </div>
                          {isPrivilegeable(user.role) && (user.allowedPages?.length || 0) > 0 && (
                            <p className={`mt-1 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                              {user.allowedPages!.length} page{user.allowedPages!.length === 1 ? '' : 's'} granted (custom list)
                            </p>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          {user.isActive ? (
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
                              onClick={() => openEditModal(user)}
                              className={`p-2 rounded-full transition-colors ${
                                theme === 'dark'
                                  ? 'bg-white/5 text-blue-400 hover:bg-white/10'
                                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                              } ${isBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
                              disabled={isBusy}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </motion.button>

                            {/* Toggle status button with loader */}
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => toggleUserStatus(user)}
                              className={`p-2 rounded-full transition-colors ${
                                user.isActive
                                  ? theme === 'dark'
                                    ? 'bg-white/5 text-yellow-400 hover:bg-white/10'
                                    : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                                  : theme === 'dark'
                                    ? 'bg-white/5 text-green-400 hover:bg-white/10'
                                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                              } ${isBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
                              disabled={isBusy}
                            >
                              {isToggling ? (
                                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : user.isActive ? (
                                <XCircleIcon className="h-4 w-4" />
                              ) : (
                                <CheckCircleIcon className="h-4 w-4" />
                              )}
                            </motion.button>

                            {/* Delete button with loader */}
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleDelete(user)}
                              className={`p-2 rounded-full transition-colors ${
                                theme === 'dark'
                                  ? 'bg-white/5 text-red-400 hover:bg-white/10'
                                  : 'bg-red-50 text-red-600 hover:bg-red-100'
                              } ${isBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
                              disabled={isBusy}
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
                  })
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
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className={`px-2 py-1 text-sm border rounded-md ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                {[5, 10, 20, 50].map(n => (
                  <option key={n} value={n} className={theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}>
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
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.98, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 10 }}
              className={`relative w-full h-full flex flex-col overflow-hidden ${
                theme === 'dark'
                  ? 'bg-gray-900'
                  : 'bg-white'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sticky header */}
              <div
                className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
                  theme === 'dark'
                    ? 'bg-gray-900 border-gray-700'
                    : 'bg-white border-gray-200'
                }`}
              >
                <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {editingUser ? 'Edit User' : 'Add User'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className={`p-2 rounded-full transition-colors ${
                    theme === 'dark'
                      ? 'text-gray-400 hover:bg-white/10'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Scrollable body: fields laid out horizontally */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-6 items-start">
                  <div className="space-y-4">
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
                        placeholder="e.g., John Doe"
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
                        placeholder="user@example.com"
                        required
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Password {!editingUser && '*'}
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
                        placeholder={editingUser ? 'Leave blank to keep unchanged' : 'Enter password'}
                        required={!editingUser}
                      />
                    </div>

                    <div className={`flex items-center gap-2 rounded-lg p-3 ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleFormChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Active (user can log in)
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Roles * <span className="text-xs font-normal">(a user can hold multiple roles — privileges are combined)</span>
                    </label>
                    <div className={`grid grid-cols-1 gap-2 rounded-lg p-3 ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                      {ROLE_OPTIONS.map(role => (
                        <label key={role} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.roles.includes(role)}
                            onChange={() => handleRoleToggle(role)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className={theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}>
                            {ROLE_LABELS[role] || role}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {formData.roles.some(isPrivilegeable) && (
                    <div className="lg:col-span-1 2xl:col-span-2">
                      <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Page Privileges
                      </label>
                      <div className="flex items-center justify-between mb-2">
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                          Tick exactly the pages this user should access — only those pages will show for them. Leave all unticked to give them their role's default pages. Dashboard, Settings and Profile are always available.
                        </p>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            allowedPages: Array.from(new Set(
                              (prev.roles.length ? prev.roles : [prev.role].filter(Boolean)).flatMap(
                                r => SYSTEM_ROLE_PRIVILEGES[r] || []
                              )
                            )),
                          }))}
                          className="ml-3 shrink-0 text-xs text-blue-600 hover:underline whitespace-nowrap"
                          title="Clear the list so the user falls back to their role's default pages"
                        >
                          Reset to role defaults
                        </button>
                      </div>
                      <div className={`grid grid-cols-1 md:grid-cols-2 gap-2 rounded-lg p-3 ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                        {PAGE_PRIVILEGES.map(priv => (
                          <label key={priv.key} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.allowedPages.includes(priv.key)}
                              onChange={() => handlePrivilegeToggle(priv.key)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className={theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}>{priv.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Fixed footer */}
              <div
                className={`flex justify-end gap-3 px-6 py-4 border-t shrink-0 ${
                  theme === 'dark'
                    ? 'bg-gray-900 border-gray-700'
                    : 'bg-white border-gray-200'
                }`}
              >
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
                  {editingUser ? 'Update' : 'Add'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}