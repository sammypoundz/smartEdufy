import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import {
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  PlusIcon,
  CloudArrowUpIcon,
  LinkIcon,
  DocumentArrowDownIcon,
  UsersIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  UserMinusIcon,
  CheckCircleIcon,
  XCircleIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  UserIcon,
  BookOpenIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

// ---------- Types ----------
interface SubjectAssignment {
  subject: string;
  class: string;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  teacherType: 'class_teacher' | 'subject_teacher' | null;
  assignedClass: string | null;
  assignedSubjects: SubjectAssignment[];
  isActive: boolean;
  createdAt?: string;
}

interface StaffFormData {
  name: string;
  email: string;
  role: string;
  teacherType: string;
  assignedClass: string;
  assignedSubjects: SubjectAssignment[];
}

// ---------- Constants ----------
const ROLES = ['Principal', 'Teacher', 'Accountant', 'Admin', 'Librarian', 'Bursar'];

const roleDisplayMap: Record<string, string> = {
  ADMIN: 'Admin',
  TEACHER: 'Teacher',
  PRINCIPAL: 'Principal',
  BURSAR: 'Bursar',
  ACCOUNTANT: 'Accountant',
  LIBRARIAN: 'Librarian',
};

// ---------- Badge styling (exact same pattern as AdminUsers) ----------
const ROLE_COLORS_DARK: Record<string, string> = {
  Principal: 'bg-gradient-to-r from-rose-900/30 to-red-900/30 text-rose-300 border-rose-800',
  Teacher: 'bg-gradient-to-r from-sky-900/30 to-blue-900/30 text-sky-300 border-sky-800',
  Accountant: 'bg-gradient-to-r from-cyan-900/30 to-teal-900/30 text-cyan-300 border-cyan-800',
  Admin: 'bg-gradient-to-r from-violet-900/30 to-purple-900/30 text-violet-300 border-violet-800',
  Librarian: 'bg-gradient-to-r from-pink-900/30 to-fuchsia-900/30 text-pink-300 border-pink-800',
  Bursar: 'bg-gradient-to-r from-indigo-900/30 to-violet-900/30 text-indigo-300 border-indigo-800',
};

const ROLE_COLORS_LIGHT: Record<string, string> = {
  Principal: 'bg-rose-600 text-white border-rose-700',
  Teacher: 'bg-sky-600 text-white border-sky-700',
  Accountant: 'bg-cyan-600 text-white border-cyan-700',
  Admin: 'bg-violet-600 text-white border-violet-700',
  Librarian: 'bg-pink-600 text-white border-pink-700',
  Bursar: 'bg-indigo-600 text-white border-indigo-700',
};

const getRoleBadgeClass = (role: string, theme: string) => {
  const base = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-sm border-2';
  const colorClass = theme === 'dark' ? ROLE_COLORS_DARK[role] : ROLE_COLORS_LIGHT[role];
  return `${base} ${colorClass}`;
};

// ---------- Status badge helper (matches AdminUsers) ----------
const getStatusBadgeClass = (isActive: boolean, theme: string) => {
  const base = 'inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold border-2';
  if (isActive) {
    const colorClass = theme === 'dark'
      ? 'bg-green-900/30 text-green-300 border-green-800'
      : 'bg-green-600 text-white border-green-700';
    return `${base} ${colorClass}`;
  } else {
    const colorClass = theme === 'dark'
      ? 'bg-red-900/30 text-red-300 border-red-800'
      : 'bg-red-600 text-white border-red-700';
    return `${base} ${colorClass}`;
  }
};

// Role icons
const roleIconMap: Record<string, any> = {
  Principal: ShieldCheckIcon,
  Teacher: AcademicCapIcon,
  Accountant: BriefcaseIcon,
  Admin: UserGroupIcon,
  Librarian: BookOpenIcon,
  Bursar: CurrencyDollarIcon,
};

// Helper to get initials
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// ---------- Animation variants ----------
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 },
};

// ---------- Staff Form Modal ----------
interface StaffModalProps {
  staff: StaffMember | null;
  onClose: () => void;
  onSave: (data: StaffFormData) => Promise<void>;
  theme: string;
  loading: boolean;
  armOptions: { display: string; className: string }[];
  subjectsList: string[];
}

const StaffModal = ({
  staff,
  onClose,
  onSave,
  theme,
  loading,
  armOptions,
  subjectsList,
}: StaffModalProps) => {
  const [formData, setFormData] = useState<StaffFormData>({
    name: staff?.name || '',
    email: staff?.email || '',
    role: staff?.role || 'Teacher',
    teacherType: staff?.teacherType || 'none',
    assignedClass: staff?.assignedClass || '',
    assignedSubjects: staff?.assignedSubjects || [],
  });

  const handleAddSubject = () => {
    setFormData({
      ...formData,
      assignedSubjects: [...formData.assignedSubjects, { subject: '', class: '' }],
    });
  };

  const handleSubjectChange = (index: number, field: keyof SubjectAssignment, value: string) => {
    const updated = [...formData.assignedSubjects];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, assignedSubjects: updated });
  };

  const handleRemoveSubject = (index: number) => {
    const updated = formData.assignedSubjects.filter((_, i) => i !== index);
    setFormData({ ...formData, assignedSubjects: updated });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.role) {
      toast.error('Name, email, and role are required');
      return;
    }
    if (formData.role === 'Teacher' && formData.teacherType === 'none') {
      toast.error('Please select a teacher type');
      return;
    }
    if (formData.role === 'Teacher' && formData.teacherType === 'class_teacher' && !formData.assignedClass) {
      toast.error('Please select a class for the class teacher');
      return;
    }
    await onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden ${
          theme === 'dark' ? 'bg-gray-900 border border-white/10' : 'bg-white border border-gray-200'
        }`}
      >
        <div className={`px-6 py-4 border-b flex justify-between items-center ${
          theme === 'dark' ? 'border-white/10' : 'border-gray-200'
        }`}>
          <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {staff ? `Edit Staff: ${staff.name}` : 'Add New Staff'}
          </h3>
          <button onClick={onClose} className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-4">
            <h4 className={`text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Personal Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full rounded-lg border-0 px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 ${
                    theme === 'dark'
                      ? 'bg-gray-800 text-white border border-gray-700'
                      : 'bg-white text-gray-900 border border-gray-300'
                  }`}
                  placeholder="e.g., Dr. Nnamdi Eze"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full rounded-lg border-0 px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 ${
                    theme === 'dark'
                      ? 'bg-gray-800 text-white border border-gray-700'
                      : 'bg-white text-gray-900 border border-gray-300'
                  }`}
                  placeholder="staff@school.com"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className={`text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Teaching Assignment
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className={`w-full rounded-lg border-0 px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 ${
                    theme === 'dark'
                      ? 'bg-gray-800 text-white border border-gray-700'
                      : 'bg-white text-gray-900 border border-gray-300'
                  }`}
                >
                  {ROLES.map((r) => (
                    <option key={r} className={theme === 'dark' ? 'bg-gray-800 text-white' : ''}>{r}</option>
                  ))}
                </select>
              </div>
              {formData.role === 'Teacher' && (
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Teacher Type *
                  </label>
                  <select
                    value={formData.teacherType}
                    onChange={(e) => setFormData({ ...formData, teacherType: e.target.value })}
                    className={`w-full rounded-lg border-0 px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 ${
                      theme === 'dark'
                        ? 'bg-gray-800 text-white border border-gray-700'
                        : 'bg-white text-gray-900 border border-gray-300'
                    }`}
                  >
                    <option value="none" className={theme === 'dark' ? 'bg-gray-800 text-white' : ''}>Select type</option>
                    <option value="class_teacher" className={theme === 'dark' ? 'bg-gray-800 text-white' : ''}>Class Teacher</option>
                    <option value="subject_teacher" className={theme === 'dark' ? 'bg-gray-800 text-white' : ''}>Subject Teacher</option>
                  </select>
                </div>
              )}
            </div>

            {formData.role === 'Teacher' && formData.teacherType === 'class_teacher' && (
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Assign Class *
                </label>
                <select
                  value={formData.assignedClass}
                  onChange={(e) => setFormData({ ...formData, assignedClass: e.target.value })}
                  className={`w-full rounded-lg border-0 px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 ${
                    theme === 'dark'
                      ? 'bg-gray-800 text-white border border-gray-700'
                      : 'bg-white text-gray-900 border border-gray-300'
                  }`}
                >
                  <option value="" className={theme === 'dark' ? 'bg-gray-800 text-white' : ''}>Select class</option>
                  {armOptions.map((opt) => (
                    <option key={opt.className} value={opt.className} className={theme === 'dark' ? 'bg-gray-800 text-white' : ''}>
                      {opt.display}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {formData.role === 'Teacher' && formData.teacherType === 'subject_teacher' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Assigned Subjects (with Class)
                  </label>
                  <button
                    onClick={handleAddSubject}
                    className={`text-sm px-3 py-1 rounded-lg transition-colors ${
                      theme === 'dark' ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    + Add Subject
                  </button>
                </div>
                {formData.assignedSubjects.map((subj, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={subj.subject}
                      onChange={(e) => handleSubjectChange(idx, 'subject', e.target.value)}
                      className={`flex-1 rounded-lg border-0 px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 ${
                        theme === 'dark'
                          ? 'bg-gray-800 text-white border border-gray-700'
                          : 'bg-white text-gray-900 border border-gray-300'
                      }`}
                    >
                      <option value="" className={theme === 'dark' ? 'bg-gray-800 text-white' : ''}>Subject</option>
                      {subjectsList.map((s) => (
                        <option key={s} className={theme === 'dark' ? 'bg-gray-800 text-white' : ''}>{s}</option>
                      ))}
                    </select>
                    <select
                      value={subj.class}
                      onChange={(e) => handleSubjectChange(idx, 'class', e.target.value)}
                      className={`flex-1 rounded-lg border-0 px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 ${
                        theme === 'dark'
                          ? 'bg-gray-800 text-white border border-gray-700'
                          : 'bg-white text-gray-900 border border-gray-300'
                      }`}
                    >
                      <option value="" className={theme === 'dark' ? 'bg-gray-800 text-white' : ''}>Class</option>
                      {armOptions.map((opt) => (
                        <option key={opt.className} value={opt.className} className={theme === 'dark' ? 'bg-gray-800 text-white' : ''}>
                          {opt.display}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleRemoveSubject(idx)}
                      className={`p-2 rounded-lg transition-colors ${
                        theme === 'dark' ? 'text-red-400 hover:bg-white/10' : 'text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {formData.assignedSubjects.length === 0 && (
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    No subjects assigned yet. Click "Add Subject" to start.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={`px-6 py-4 border-t flex justify-end gap-3 ${
          theme === 'dark' ? 'border-white/10' : 'border-gray-200'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg transition-colors ${
              theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {loading && <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {staff ? 'Update' : 'Add'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ---------- Bulk Upload Modal ----------
interface BulkModalProps {
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  theme: string;
  loading: boolean;
}

const BulkModal = ({ onClose, onUpload, theme, loading }: BulkModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleSubmit = () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }
    onUpload(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${
          theme === 'dark' ? 'bg-gray-900 border border-white/10' : 'bg-white border border-gray-200'
        }`}
      >
        <div className={`px-6 py-4 border-b flex justify-between items-center ${
          theme === 'dark' ? 'border-white/10' : 'border-gray-200'
        }`}>
          <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Bulk Upload Staff
          </h3>
          <button onClick={onClose} className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : theme === 'dark'
                ? 'border-gray-600'
                : 'border-gray-300'
            }`}
          >
            <CloudArrowUpIcon className={`h-12 w-12 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              {isDragging ? 'Drop your file here' : 'Drag & drop your Excel/CSV file here'}
            </p>
            <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>or</p>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="mt-2 block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {file && (
              <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                Selected: {file.name}
              </p>
            )}
          </div>
        </div>

        <div className={`px-6 py-4 border-t flex justify-end gap-3 ${
          theme === 'dark' ? 'border-white/10' : 'border-gray-200'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg transition-colors ${
              theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !file}
            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {loading && <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Upload
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ---------- Main Component ----------
export default function AdminStaff() {
  const { theme } = useTheme();

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);

  // Dynamic options from DB
  const [armOptions, setArmOptions] = useState<{ display: string; className: string }[]>([]);
  const [subjectsList, setSubjectsList] = useState<string[]>([]);

  // ---------- Fetch Options (arms & subjects) ----------
  const fetchOptions = async () => {
    try {
      const [armsRes, subjectsRes] = await Promise.all([
        api.get('/arms'),
        api.get('/subjects'),
      ]);

      const arms = armsRes.data || [];
      const armOpts = arms.map((arm: any) => {
        const className = arm.class?.name || arm.className || 'Unknown Class';
        const letter = arm.letter || '';
        return {
          display: `${className} Arm ${letter}`.trim(),
          className: className,
        };
      });
      setArmOptions(armOpts);

      const subjectNames = subjectsRes.data.map((s: any) => s.name);
      setSubjectsList(subjectNames);
    } catch (err) {
      console.error('Failed to fetch options for dropdowns', err);
      toast.error('Could not load classes/subjects');
    }
  };

  // ---------- Download Excel Template ----------
  const downloadTemplate = () => {
    const headers = [
      'name',
      'email',
      'role',
      'teacherType',
      'assignedClass',
      'assignedSubjects',
    ];
    const sampleData = [
      {
        name: 'Dr. Nnamdi Eze',
        email: 'nnamdi.eze@school.com',
        role: 'Teacher',
        teacherType: 'class_teacher',
        assignedClass: 'Primary 3',
        assignedSubjects: '',
      },
      {
        name: 'Mr. Kunle Adebayo',
        email: 'kunle.adebayo@school.com',
        role: 'Teacher',
        teacherType: 'subject_teacher',
        assignedClass: '',
        assignedSubjects: '[{"subject":"Mathematics","class":"JSS 1"},{"subject":"Physics","class":"SSS 2"}]',
      },
      {
        name: 'Mrs. Ada Okafor',
        email: 'ada.okafor@school.com',
        role: 'Admin',
        teacherType: '',
        assignedClass: '',
        assignedSubjects: '',
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    XLSX.utils.book_append_sheet(wb, ws, 'Staff');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'staff_upload_template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.success('Template downloaded');
  };

  // ---------- Fetch Staff (merge /staff and /teachers) ----------
  const fetchStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const [staffRes, teachersRes] = await Promise.all([
        api.get('/staff'),
        api.get('/teachers'),
      ]);

      const staffMap = new Map<string, any>();
      (staffRes.data || []).forEach((item: any) => {
        staffMap.set(item.email, {
          teacherType: item.teacherType || null,
          assignedClass: item.assignedClass || null,
          assignedSubjects: item.assignedSubjects || [],
          isActive: item.isActive ?? true,
          role: roleDisplayMap[item.role] || item.role,
          id: item.id,
        });
      });

      const mergedTeachers: StaffMember[] = (teachersRes.data || []).map((teacher: any) => {
        const staffInfo = staffMap.get(teacher.email);
        return {
          id: staffInfo?.id || teacher.id,
          name: teacher.name || '',
          email: teacher.email,
          role: staffInfo?.role || 'Teacher',
          teacherType: staffInfo?.teacherType || null,
          assignedClass: staffInfo?.assignedClass || null,
          assignedSubjects: staffInfo?.assignedSubjects || [],
          isActive: staffInfo?.isActive ?? true,
          createdAt: teacher.createdAt,
        };
      });

      const nonTeacherStaff: StaffMember[] = (staffRes.data || [])
        .filter((item: any) => item.role !== 'TEACHER')
        .map((item: any) => ({
          id: item.id,
          name: item.name || '',
          email: item.email,
          role: roleDisplayMap[item.role] || item.role,
          teacherType: null,
          assignedClass: null,
          assignedSubjects: [],
          isActive: item.isActive ?? true,
          createdAt: item.createdAt,
        }));

      const combinedMap = new Map<string, StaffMember>();
      mergedTeachers.forEach((t: StaffMember) => combinedMap.set(t.email, t));
      nonTeacherStaff.forEach((s: StaffMember) => {
        if (!combinedMap.has(s.email)) combinedMap.set(s.email, s);
      });

      setStaffList(Array.from(combinedMap.values()));
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to load staff';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchOptions();
  }, []);

  // ---------- CRUD ----------
  const createStaff = async (data: StaffFormData) => {
    setSubmitting(true);
    try {
      const res = await api.post('/staff', data);
      const newStaff = {
        ...res.data,
        role: roleDisplayMap[res.data.role] || res.data.role,
      };
      setStaffList((prev) => [...prev, newStaff]);
      toast.success('Staff added successfully');
      setShowCreateModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add staff');
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const updateStaff = async (data: StaffFormData) => {
    if (!editingStaff) return;
    setSubmitting(true);
    try {
      const res = await api.put(`/staff/${editingStaff.id}`, data);
      const updated = {
        ...res.data,
        role: roleDisplayMap[res.data.role] || res.data.role,
      };
      setStaffList((prev) =>
        prev.map((s) => (s.id === editingStaff.id ? updated : s))
      );
      toast.success('Staff updated');
      setEditingStaff(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update staff');
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const deleteStaff = async (id: string) => {
    const confirm = await Swal.fire({
      title: 'Delete Staff',
      text: 'Are you sure? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete',
    });
    if (!confirm.isConfirmed) return;

    setDeletingId(id);
    try {
      await api.delete(`/staff/${id}`);
      setStaffList((prev) => prev.filter((s) => s.id !== id));
      toast.success('Staff deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const bulkUpload = async (file: File) => {
    setSubmitting(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/staff/bulk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const created = (res.data.created || []).map((staff: any) => ({
        ...staff,
        role: roleDisplayMap[staff.role] || staff.role,
      }));
      setStaffList((prev) => [...prev, ...created]);
      toast.success('Bulk upload successful');
      setShowBulkModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Bulk upload failed');
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const generateRegistrationLink = async () => {
    setGeneratingLink(true);
    try {
      const res = await api.post('/staff/generate-link');
      const link = res.data.link;
      await navigator.clipboard.writeText(link);
      toast.success('Registration link copied to clipboard!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to generate link');
    } finally {
      setGeneratingLink(false);
    }
  };

  // ---------- Filter ----------
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === 'All' || s.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [staffList, search, roleFilter]);

  // ---------- Statistics ----------
  const totalStaff = filteredStaff.length;
  const totalTeachers = filteredStaff.filter((s) => s.role === 'Teacher').length;
  const totalAdmins = filteredStaff.filter((s) => s.role === 'Admin').length;
  const totalInactive = filteredStaff.filter((s) => !s.isActive).length;

  // ---------- Pagination ----------
  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / rowsPerPage));
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter]);

  const paginatedStaff = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredStaff.slice(start, start + rowsPerPage);
  }, [filteredStaff, currentPage, rowsPerPage]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(Math.max(1, Math.min(newPage, totalPages)));
  };

  // ---------- Loading / Error ----------
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
      }`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className={`mt-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Loading staff...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
      }`}>
        <div className="text-center text-red-600 dark:text-red-400">
          <p>{error}</p>
          <button onClick={fetchStaff} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
            Retry
          </button>
        </div>
      </div>
    );
  }

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
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className={`p-4 rounded-xl shadow-sm border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Total Staff</p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{totalStaff}</p>
              </div>
              <UsersIcon className={`h-8 w-8 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
            </div>
          </div>
          <div className={`p-4 rounded-xl shadow-sm border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Teachers</p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{totalTeachers}</p>
              </div>
              <AcademicCapIcon className={`h-8 w-8 ${theme === 'dark' ? 'text-green-400' : 'text-green-500'}`} />
            </div>
          </div>
          <div className={`p-4 rounded-xl shadow-sm border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Admins</p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{totalAdmins}</p>
              </div>
              <ShieldCheckIcon className={`h-8 w-8 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-500'}`} />
            </div>
          </div>
          <div className={`p-4 rounded-xl shadow-sm border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Inactive</p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{totalInactive}</p>
              </div>
              <UserMinusIcon className={`h-8 w-8 ${theme === 'dark' ? 'text-red-400' : 'text-red-500'}`} />
            </div>
          </div>
        </div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="sm:flex sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className={`text-2xl font-bold ${
              theme === 'dark' ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent' : 'bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent'
            }`}>Staff Management</h2>
            <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage all staff members, roles, and assignments.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 mt-4 sm:mt-0">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-5 w-5 mr-1" /> Add Staff
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowBulkModal(true)}
              className="inline-flex items-center justify-center rounded-lg bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <CloudArrowUpIcon className="h-5 w-5 mr-1" /> Bulk Upload
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={downloadTemplate}
              className="inline-flex items-center justify-center rounded-lg bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <DocumentArrowDownIcon className="h-5 w-5 mr-1" /> Download Template
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={generateRegistrationLink}
              disabled={generatingLink}
              className="inline-flex items-center justify-center rounded-lg bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {generatingLink ? (
                <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <LinkIcon className="h-5 w-5 mr-1" />
              )}
              Generate Link
            </motion.button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div variants={container} initial="hidden" animate="show" className="flex flex-wrap items-center gap-4 mb-6">
          <motion.div variants={item} className="relative flex-1 min-w-[200px]">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <MagnifyingGlassIcon className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`block w-full rounded-lg border-0 pl-12 pr-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark'
                  ? 'bg-gray-800 text-white placeholder-gray-400 border border-gray-700'
                  : 'bg-white text-gray-900 placeholder-gray-500 border border-gray-300 shadow-md'
              }`}
              placeholder="Search by name or email..."
            />
          </motion.div>

          <motion.div variants={item}>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={`w-40 rounded-lg border-0 px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark'
                  ? 'bg-gray-800 text-white border border-gray-700'
                  : 'bg-white text-gray-900 border border-gray-300 shadow-md'
              }`}
            >
              <option value="All" className={theme === 'dark' ? 'bg-gray-800 text-white' : ''}>All Roles</option>
              {ROLES.map((r) => (
                <option key={r} className={theme === 'dark' ? 'bg-gray-800 text-white' : ''}>{r}</option>
              ))}
            </select>
          </motion.div>
        </motion.div>

        {/* Staff Table */}
        <motion.div variants={container} initial="hidden" animate="show" className="rounded-xl shadow-sm border overflow-hidden">
          <div className={`overflow-x-auto ${theme === 'dark' ? 'bg-transparent' : 'bg-white'}`}>
            <table className="min-w-full">
              <thead>
                <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <th className={`py-3 pl-6 pr-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Staff
                  </th>
                  <th className={`px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Role
                  </th>
                  <th className={`px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Assignment
                  </th>
                  <th className={`px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Status
                  </th>
                  <th className={`relative py-3 pl-3 pr-6 text-right text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {paginatedStaff.map((staff) => {
                  const RoleIcon = roleIconMap[staff.role] || UserIcon;
                  return (
                    <motion.tr
                      key={staff.id}
                      variants={item}
                      whileHover={{ backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                      className="transition-colors"
                    >
                      <td className="whitespace-nowrap py-3 pl-6 pr-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-xs font-semibold ${
                            theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {getInitials(staff.name)}
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {staff.name}
                            </p>
                            <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                              {staff.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <RoleIcon className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                          <span className={getRoleBadgeClass(staff.role, theme)}>
                            {staff.role}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {staff.role === 'Teacher' ? (
                          staff.teacherType === 'class_teacher' ? (
                            <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              <span className="font-medium">Class Teacher</span>: {staff.assignedClass || 'None'}
                            </span>
                          ) : staff.teacherType === 'subject_teacher' ? (
                            <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              <span className="font-medium">{staff.assignedSubjects.length} subjects</span>
                              {staff.assignedSubjects.length > 0 && (
                                <span className="text-xs text-gray-400 dark:text-gray-500 block truncate max-w-xs">
                                  {staff.assignedSubjects.map((s) => s.subject).join(', ')}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No assignment</span>
                          )
                        ) : (
                          <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <span className={getStatusBadgeClass(staff.isActive, theme)}>
                          {staff.isActive ? (
                            <>
                              <CheckCircleIcon className="h-4 w-4" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircleIcon className="h-4 w-4" />
                              Inactive
                            </>
                          )}
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-3 pl-3 pr-6 text-right text-sm">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingStaff(staff)}
                            className={`p-2 rounded-full transition-colors ${
                              theme === 'dark'
                                ? 'bg-white/5 text-blue-400 hover:bg-white/10'
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:shadow-sm'
                            }`}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteStaff(staff.id)}
                            disabled={deletingId === staff.id}
                            className={`p-2 rounded-full transition-colors ${
                              theme === 'dark'
                                ? 'bg-white/5 text-red-400 hover:bg-white/10'
                                : 'bg-red-50 text-red-600 hover:bg-red-100 hover:shadow-sm'
                            } disabled:opacity-50`}
                          >
                            {deletingId === staff.id ? (
                              <div className="h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <TrashIcon className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
                {paginatedStaff.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                          <UsersIcon className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          No staff members found.
                        </p>
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                        >
                          Add your first staff member
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={`flex flex-wrap items-center justify-between px-4 py-3 mt-4 rounded-lg shadow-sm border ${
            theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Showing {((currentPage - 1) * rowsPerPage) + 1}–{Math.min(currentPage * rowsPerPage, filteredStaff.length)} of {filteredStaff.length}
              </span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className={`px-2 py-1 text-sm border rounded-md ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                {[5, 10, 20, 50].map((n) => (
                  <option key={n} value={n}>{n} per page</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
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
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`w-8 h-8 rounded-md text-sm transition-colors ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : theme === 'dark'
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
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

      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && (
          <StaffModal
            staff={null}
            onClose={() => setShowCreateModal(false)}
            onSave={createStaff}
            theme={theme}
            loading={submitting}
            armOptions={armOptions}
            subjectsList={subjectsList}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingStaff && (
          <StaffModal
            staff={editingStaff}
            onClose={() => setEditingStaff(null)}
            onSave={updateStaff}
            theme={theme}
            loading={submitting}
            armOptions={armOptions}
            subjectsList={subjectsList}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBulkModal && (
          <BulkModal
            onClose={() => setShowBulkModal(false)}
            onUpload={bulkUpload}
            theme={theme}
            loading={submitting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}