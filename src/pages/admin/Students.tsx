import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import {
  UsersIcon,
  UserGroupIcon,
  UserIcon,
  ChartBarIcon,
  PlusIcon,
  ArrowUpTrayIcon,
  EyeIcon,
  AcademicCapIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  StopIcon,
  PlayIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';

// Helper functions
function getArmAlias(letter: string): string {
  const aliases: Record<string, string> = {
    A: 'Explorer', B: 'Pioneer', C: 'Voyager', D: 'Trailblazer',
    E: 'Navigator', F: 'Ranger', G: 'Pathfinder', H: 'Adventurer',
  };
  return aliases[letter.toUpperCase()] || 'Explorer';
}

function formatArmDisplay(letter: string): string {
  return `Arm ${letter} (${getArmAlias(letter)})`;
}

// Types
interface Student {
  id: string;
  name: string;
  gender: string;
  admissionNumber?: string;
  createdAt?: string;
  isActive?: boolean;
  class?: { id: string; name: string };
  arm?: { id: string; letter: string };
  parent?: { name: string; phone?: string; email?: string };
  results?: { term: string; score: number; subject: { name: string } }[];
}

interface ClassOption {
  id: string;
  name: string;
  arms?: { id: string; letter: string }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const SUMMARY_LIMIT = 5;

export default function Students() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedArmId, setSelectedArmId] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkDrawer, setShowBulkDrawer] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newStudentForm, setNewStudentForm] = useState({
    name: '',
    gender: 'male',
    admissionNumber: '',
    classId: '',
    armId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bulkClassId, setBulkClassId] = useState<string>('');
  const [bulkArmId, setBulkArmId] = useState<string>('');

  // All students modal states
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch data
  const fetchStudents = async () => {
    if (!token) return;
    try {
      const res = await api.get('/students', token);
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
        setAllStudents(data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load students');
    }
  };

  const fetchClasses = async () => {
    if (!token) return;
    try {
      const res = await api.get('/classes', token);
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    Promise.all([fetchStudents(), fetchClasses()]).finally(() => setLoading(false));
  }, [token]);

  // Compute growth data from student createdAt
  const computeGrowthData = () => {
    const yearMap = new Map<number, number>();
    students.forEach(student => {
      if (student.createdAt) {
        const year = new Date(student.createdAt).getFullYear();
        yearMap.set(year, (yearMap.get(year) || 0) + 1);
      }
    });
    const years = Array.from(yearMap.keys()).sort();
    let cumulative = 0;
    return years.map(year => {
      cumulative += yearMap.get(year) || 0;
      return { year: year.toString(), students: cumulative };
    });
  };
  const growthData = computeGrowthData();

  // Filtered students for main table
  const filteredStudents = students.filter((student) => {
    if (selectedClassId && student.class?.id !== selectedClassId) return false;
    if (selectedArmId && student.arm?.id !== selectedArmId) return false;
    return true;
  });

  // Summary students (first SUMMARY_LIMIT)
  const summaryStudents = filteredStudents.slice(0, SUMMARY_LIMIT);
  const hasMoreStudents = filteredStudents.length > SUMMARY_LIMIT;

  // Statistics
  const totalStudents = filteredStudents.length;
  const maleCount = filteredStudents.filter((s) => s.gender === 'male').length;
  const femaleCount = filteredStudents.filter((s) => s.gender === 'female').length;
  const classDistribution = filteredStudents.reduce((acc, student) => {
    const className = student.class?.name || 'Unassigned';
    acc[className] = (acc[className] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const classChartData = Object.entries(classDistribution).map(([name, value]) => ({ name, value }));

  // Create student
  const handleCreateStudent = async () => {
    if (!newStudentForm.name.trim()) {
      toast.error('Student name is required');
      return;
    }
    setIsSubmitting(true);
    try {
      const createRes = await api.post('/students', {
        name: newStudentForm.name,
        gender: newStudentForm.gender,
        admissionNumber: newStudentForm.admissionNumber || undefined,
        classId: newStudentForm.classId || undefined,
        armId: newStudentForm.armId || undefined,
      }, token);
      if (!createRes.ok) throw new Error(await createRes.text());
      toast.success('Student created');
      await fetchStudents();
      setShowAddModal(false);
      setNewStudentForm({ name: '', gender: 'male', admissionNumber: '', classId: '', armId: '' });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download template
  const downloadTemplate = () => {
    if (!bulkClassId) {
      toast.error('Please select a default class before downloading the template');
      return;
    }
    const selectedClass = classes.find(c => c.id === bulkClassId);
    const selectedArm = classes.find(c => c.id === bulkClassId)?.arms?.find(a => a.id === bulkArmId);
    const className = selectedClass?.name?.replace(/\s+/g, '') || 'Class';
    const armLetter = selectedArm?.letter || '';
    const fileName = armLetter ? `${className}_Arm${armLetter}_studentsSheet.xlsx` : `${className}_studentsSheet.xlsx`;
    
    const templateData = [
      { name: 'John Doe', gender: 'male', admissionNumber: 'ADM001', classId: bulkClassId, armId: bulkArmId || '' },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students_Template');
    XLSX.writeFile(wb, fileName);
    toast.success('Template downloaded');
  };

  // Upload processing
  const processUpload = async (file: File) => {
    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      let successCount = 0;
      let errorCount = 0;
      for (const row of rows) {
        let { name, gender, admissionNumber, classId, armId } = row as any;
        if (!name) {
          errorCount++;
          continue;
        }
        if (!classId && bulkClassId) classId = bulkClassId;
        if (!armId && bulkArmId) armId = bulkArmId;
        try {
          await api.post('/students', {
            name,
            gender: gender || 'male',
            admissionNumber,
            classId: classId || undefined,
            armId: armId || undefined,
          }, token);
          successCount++;
        } catch {
          errorCount++;
        }
      }
      toast.success(`Uploaded ${successCount} students, ${errorCount} failed`);
      await fetchStudents();
      setShowBulkDrawer(false);
      setBulkClassId('');
      setBulkArmId('');
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      setDragActive(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    const result = await Swal.fire({
      title: 'Confirm Upload',
      text: `You selected: ${file.name}. Do you want to proceed with the upload?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, upload',
      cancelButtonText: 'Cancel',
      background: theme === 'dark' ? '#1f2937' : '#fff',
      color: theme === 'dark' ? '#fff' : '#000',
    });
    if (result.isConfirmed) {
      await processUpload(file);
    }
  }, [theme, bulkClassId, bulkArmId, token]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] },
    multiple: false,
  });

  // Performance view
  const viewPerformance = async (student: Student) => {
    setSelectedStudent(student);
    if (!student.results) {
      try {
        const res = await api.get(`/results/student/${student.id}`, token);
        if (res.ok) {
          const results = await res.json();
          setSelectedStudent({ ...student, results });
        } else {
          setSelectedStudent({ ...student, results: [] });
        }
      } catch (err) {
        console.error(err);
        setSelectedStudent({ ...student, results: [] });
      }
    }
    setShowPerformanceModal(true);
  };

  const performanceData = selectedStudent?.results?.reduce((acc, result) => {
    const term = result.term;
    const existing = acc.find((item) => item.term === term);
    if (existing) {
      existing.totalScore += result.score;
      existing.count++;
      existing.average = existing.totalScore / existing.count;
    } else {
      acc.push({ term, totalScore: result.score, count: 1, average: result.score });
    }
    return acc;
  }, [] as { term: string; totalScore: number; count: number; average: number }[])
  .map(({ term, average }) => ({ term, average }));

  // All Students Modal handlers
  const handleEditStudent = (student: Student) => {
    navigate(`/admin/student/${student.id}`);
  };

  const handleSuspendStudent = async (student: Student) => {
    const newStatus = !student.isActive;
    setSuspendingId(student.id);
    try {
      const res = await api.patch(`/students/${student.id}`, { isActive: newStatus }, token);
      if (!res.ok) throw new Error(await res.text());
      toast.success(`Student ${newStatus ? 'activated' : 'suspended'} successfully`);
      await fetchStudents();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSuspendingId(null);
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Delete ${student.name}? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete',
      background: theme === 'dark' ? '#1f2937' : '#fff',
      color: theme === 'dark' ? '#fff' : '#000',
    });
    if (!result.isConfirmed) return;
    setDeletingId(student.id);
    try {
      const res = await api.del(`/students/${student.id}`, token);
      if (!res.ok) throw new Error(await res.text());
      toast.success('Student deleted');
      await fetchStudents();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // Filter and paginate allStudents
  const filteredAllStudents = allStudents.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.admissionNumber && student.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (student.parent?.name && student.parent.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  const totalPages = Math.ceil(filteredAllStudents.length / itemsPerPage);
  const paginatedStudents = filteredAllStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Loading students...</p>
        </div>
      </div>
    );
  }

  // Determine mode classes for CSS targeting
  const lightModeClass = theme === 'light' ? 'students-light-mode' : '';
  const darkModeClass = theme === 'dark' ? 'students-dark-mode' : '';

  return (
    <div className={`students-container min-h-screen px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-300 ${lightModeClass} ${darkModeClass} ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
      {/* CSS that forces black text in light mode and white text in dark mode for table/drawer content (excluding buttons) */}
      <style>{`
        /* Light mode: pure black text for table cells, labels, etc. (but not buttons) */
        .students-light-mode .student-table th,
        .students-light-mode .student-table td,
        .students-light-mode .drawer-content label,
        .students-light-mode .drawer-content p,
        .students-light-mode .drawer-content h4,
        .students-light-mode .drawer-content li,
        .students-light-mode .modal-content label,
        .students-light-mode .modal-content p,
        .students-light-mode .modal-content td,
        .students-light-mode .modal-content th,
        .students-light-mode .student-table .empty-state,
        .students-light-mode .pagination-text {
          color: #000000 !important;
        }
        /* Dark mode: pure white text for those elements */
        .students-dark-mode .student-table th,
        .students-dark-mode .student-table td,
        .students-dark-mode .drawer-content label,
        .students-dark-mode .drawer-content p,
        .students-dark-mode .drawer-content h4,
        .students-dark-mode .drawer-content li,
        .students-dark-mode .modal-content label,
        .students-dark-mode .modal-content p,
        .students-dark-mode .modal-content td,
        .students-dark-mode .modal-content th,
        .students-dark-mode .student-table .empty-state,
        .students-dark-mode .pagination-text {
          color: #ffffff !important;
        }
        /* Force white background for modal table header in light mode */
        .students-light-mode .modal-content thead {
          background-color: #ffffff !important;
        }
        /* Keep status badges and buttons as they are */
        .students-light-mode .student-table .status-badge,
        .students-dark-mode .student-table .status-badge {
          color: inherit !important;
        }
        /* Override for inputs/selects */
        .students-light-mode input,
        .students-light-mode select {
          color: #000000 !important;
        }
        .students-dark-mode input,
        .students-dark-mode select {
          color: #ffffff !important;
        }
        /* Ensure placeholders remain light in both modes */
        .students-light-mode input::placeholder {
          color: #6b7280 !important;
        }
        .students-dark-mode input::placeholder {
          color: #9ca3af !important;
        }
      `}</style>

      {/* Background grid */}
      {theme === 'dark' && (
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `linear-gradient(rgba(59,130,246,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.1) 1px,transparent 1px)`, backgroundSize: '60px 60px' }} />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="sm:flex sm:items-center sm:justify-between mb-8">
          <div>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent' : 'bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent'}`}>
              Student Management
            </h2>
            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage all students, view metrics, and perform bulk operations.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Student
            </button>
            <button
              onClick={() => setShowBulkDrawer(true)}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all"
            >
              <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
              Bulk Upload
            </button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className={`p-4 rounded-xl shadow-md ${theme === 'dark' ? 'bg-white/5 backdrop-blur-sm border border-white/10' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <div className="flex items-center justify-between">
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Students</p>
              <UsersIcon className="h-5 w-5 text-blue-500" />
            </div>
            <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{totalStudents}</p>
          </div>
          <div className={`p-4 rounded-xl shadow-md ${theme === 'dark' ? 'bg-white/5 backdrop-blur-sm border border-white/10' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <div className="flex items-center justify-between">
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Male</p>
              <UserIcon className="h-5 w-5 text-blue-500" />
            </div>
            <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{maleCount}</p>
          </div>
          <div className={`p-4 rounded-xl shadow-md ${theme === 'dark' ? 'bg-white/5 backdrop-blur-sm border border-white/10' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <div className="flex items-center justify-between">
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Female</p>
              <UserGroupIcon className="h-5 w-5 text-pink-500" />
            </div>
            <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{femaleCount}</p>
          </div>
          <div className={`p-4 rounded-xl shadow-md ${theme === 'dark' ? 'bg-white/5 backdrop-blur-sm border border-white/10' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <div className="flex items-center justify-between">
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Classes</p>
              <ChartBarIcon className="h-5 w-5 text-purple-500" />
            </div>
            <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{Object.keys(classDistribution).length}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className={`p-4 rounded-2xl shadow-xl ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/80 backdrop-blur-md border border-gray-200/60'}`}>
            <h3 className={`text-lg font-medium mb-4 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Student Growth (Year over Year)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="year" stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'} />
                <YAxis stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'} />
                <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#1f2937' : '#fff', borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }} />
                <Legend />
                <Line type="monotone" dataKey="students" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className={`p-4 rounded-2xl shadow-xl ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/80 backdrop-blur-md border border-gray-200/60'}`}>
            <h3 className={`text-lg font-medium mb-4 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Class Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={classChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {classChartData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#1f2937' : '#fff', borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Filters and View All button */}
        <div className="flex flex-wrap gap-4 mb-6 items-center justify-between">
          <div className="flex flex-wrap gap-4">
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedArmId('');
              }}
              className={`px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500' : 'bg-white border-gray-300 text-black focus:ring-blue-400'}`}
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
            {selectedClassId && (
              <select
                value={selectedArmId}
                onChange={(e) => setSelectedArmId(e.target.value)}
                className={`px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500' : 'bg-white border-gray-300 text-black focus:ring-blue-400'}`}
              >
                <option value="">All Arms</option>
                {classes.find(c => c.id === selectedClassId)?.arms?.map((arm) => (
                  <option key={arm.id} value={arm.id}>{formatArmDisplay(arm.letter)}</option>
                ))}
              </select>
            )}
          </div>
          <button
            onClick={() => setShowAllModal(true)}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition"
          >
            <UsersIcon className="h-4 w-4 mr-2" />
            View All Students
          </button>
        </div>

        {/* Main Student Table – Summary view */}
        <div className={`overflow-x-auto rounded-2xl shadow-xl student-table ${theme === 'dark' ? 'bg-gray-900/80 backdrop-blur-sm border border-white/10' : 'bg-white border border-gray-200'}`}>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className={theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900 dark:text-gray-300">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900 dark:text-gray-300">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900 dark:text-gray-300">Admission No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900 dark:text-gray-300">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900 dark:text-gray-300">Arm</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900 dark:text-gray-300">Parent</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {summaryStudents.map((student) => {
                const isSuspended = student.isActive === false;
                return (
                  <tr
                    key={student.id}
                    className={`transition-colors ${
                      isSuspended
                        ? theme === 'dark'
                          ? 'bg-red-900/20 hover:bg-red-900/30'
                          : 'bg-red-50/50 hover:bg-red-100/70'
                        : theme === 'dark'
                        ? 'hover:bg-white/5'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative group">
                        {isSuspended ? (
                          <>
                            <ExclamationCircleIcon className="h-5 w-5 text-red-500 dark:text-red-400" />
                            <div className="absolute left-0 top-full mt-1 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                              Suspended
                            </div>
                          </>
                        ) : (
                          <>
                            <CheckCircleIcon className="h-5 w-5 text-green-500 dark:text-green-400" />
                            <div className="absolute left-0 top-full mt-1 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                              Active
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{student.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{student.admissionNumber || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{student.class?.name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {student.arm?.letter ? formatArmDisplay(student.arm.letter) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{student.parent?.name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => navigate(`/admin/student/${student.id}`)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        title="View Bio"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => viewPerformance(student)}
                        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                        title="View Performance"
                      >
                        <AcademicCapIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-900 dark:text-gray-400 empty-state">
                    No students found. Try adjusting filters or add a student.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {hasMoreStudents && (
            <div className="p-4 text-center border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowAllModal(true)}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
              >
                + View all {filteredStudents.length} students
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals and Drawer */}
      <AnimatePresence>
        {showAddModal && (
          <CenteredModal onClose={() => setShowAddModal(false)} title="Add New Student" theme={theme} className="modal-content">
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Full Name *</label>
                <input
                  type="text"
                  value={newStudentForm.name}
                  onChange={e => setNewStudentForm({ ...newStudentForm, name: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                  placeholder="e.g., John Doe"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Gender</label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2">
                    <input type="radio" value="male" checked={newStudentForm.gender === 'male'} onChange={e => setNewStudentForm({ ...newStudentForm, gender: e.target.value })} />
                    <span className={theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}>Male</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="radio" value="female" checked={newStudentForm.gender === 'female'} onChange={e => setNewStudentForm({ ...newStudentForm, gender: e.target.value })} />
                    <span className={theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}>Female</span>
                  </label>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Admission Number (optional)</label>
                <input
                  type="text"
                  value={newStudentForm.admissionNumber}
                  onChange={e => setNewStudentForm({ ...newStudentForm, admissionNumber: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                  placeholder="e.g., ADM2024001"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Class (optional)</label>
                <select
                  value={newStudentForm.classId}
                  onChange={e => setNewStudentForm({ ...newStudentForm, classId: e.target.value, armId: '' })}
                  className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
              {newStudentForm.classId && (
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Arm (optional)</label>
                  <select
                    value={newStudentForm.armId}
                    onChange={e => setNewStudentForm({ ...newStudentForm, armId: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  >
                    <option value="">Select Arm</option>
                    {classes.find(c => c.id === newStudentForm.classId)?.arms?.map((arm) => (
                      <option key={arm.id} value={arm.id}>{formatArmDisplay(arm.letter)}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="pt-4">
                <button
                  onClick={handleCreateStudent}
                  disabled={isSubmitting || !newStudentForm.name.trim()}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Student'}
                </button>
              </div>
            </div>
          </CenteredModal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBulkDrawer && (
          <Drawer onClose={() => setShowBulkDrawer(false)} title="Bulk Upload Students" theme={theme} className="drawer-content">
            <div className="space-y-6">
              <div className="rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <AcademicCapIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">Default Class & Arm (Optional)</h4>
                </div>
                <p className="text-sm text-gray-900 dark:text-gray-300 mb-4">
                  If your Excel file does not contain classId or armId for a row, the selected values below will be used.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Default Class *</label>
                    <select
                      value={bulkClassId}
                      onChange={(e) => {
                        setBulkClassId(e.target.value);
                        setBulkArmId('');
                      }}
                      className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    >
                      <option value="">-- Select a class --</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </select>
                  </div>
                  {bulkClassId && (
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Default Arm (optional)</label>
                      <select
                        value={bulkArmId}
                        onChange={(e) => setBulkArmId(e.target.value)}
                        className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      >
                        <option value="">-- No default arm --</option>
                        {classes.find(c => c.id === bulkClassId)?.arms?.map((arm) => (
                          <option key={arm.id} value={arm.id}>{formatArmDisplay(arm.letter)}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <DocumentTextIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">Step 1: Download Template</h4>
                </div>
                <p className="text-sm text-gray-900 dark:text-gray-300 mb-4">
                  Get the Excel template with the correct columns: name, gender, admissionNumber, classId, armId.
                </p>
                <button
                  onClick={downloadTemplate}
                  disabled={!bulkClassId}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-gray-700 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <DocumentArrowDownIcon className="h-5 w-5 mr-2 text-green-600" />
                  Download Excel Template
                </button>
                {!bulkClassId && <p className="text-xs text-amber-600 mt-2">Please select a default class first to generate the template.</p>}
              </div>

              <div className="rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <CloudArrowUpIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">Step 2: Upload Your File</h4>
                </div>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 scale-[1.02]'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                  }`}
                  onDragEnter={() => setDragActive(true)}
                  onDragLeave={() => setDragActive(false)}
                >
                  <input {...getInputProps()} />
                  <ArrowUpTrayIcon className={`h-12 w-12 mx-auto mb-4 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
                  <p className="text-gray-900 dark:text-gray-300 font-medium">
                    {dragActive ? 'Drop the file here' : 'Drag & drop an Excel file here'}
                  </p>
                  <p className="text-sm text-gray-900 dark:text-gray-300 mt-2">or click to browse</p>
                  <p className="text-xs text-gray-900 dark:text-gray-300 mt-3">Supports .xlsx, .xls files</p>
                </div>
                {uploading && (
                  <div className="mt-4 text-center">
                    <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="mt-2 text-sm text-gray-900 dark:text-gray-300">Uploading and processing...</p>
                  </div>
                )}
              </div>

              <div className="text-xs text-gray-900 dark:text-gray-300 bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3">
                <p className="font-medium mb-1">📌 Important notes:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Only <strong>.xlsx</strong> or <strong>.xls</strong> files accepted</li>
                  <li>Required column: <strong>name</strong> (others optional)</li>
                  <li>Gender: "male" or "female" (defaults to male)</li>
                  <li>Leave classId/armId empty to use the default values selected above</li>
                  <li>If default class/arm are set, they will be applied to rows without those fields</li>
                </ul>
              </div>
            </div>
          </Drawer>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPerformanceModal && selectedStudent && (
          <CenteredModal onClose={() => setShowPerformanceModal(false)} title={`Performance - ${selectedStudent.name}`} theme={theme} size="lg" className="modal-content">
            {performanceData && performanceData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                    <XAxis dataKey="term" stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'} />
                    <YAxis domain={[0, 100]} stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'} />
                    <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#1f2937' : '#fff' }} />
                    <Legend />
                    <Bar dataKey="average" fill="#3b82f6" name="Average Score" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="text-left py-2 text-gray-900 dark:text-gray-300">Term</th>
                        <th className="text-left py-2 text-gray-900 dark:text-gray-300">Subject</th>
                        <th className="text-left py-2 text-gray-900 dark:text-gray-300">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStudent.results?.map((result, idx) => (
                        <tr key={idx} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-2 text-gray-900 dark:text-gray-100">{result.term}</td>
                          <td className="py-2 text-gray-900 dark:text-gray-100">{result.subject.name}</td>
                          <td className="py-2 text-gray-900 dark:text-gray-100">{result.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-center py-8 text-gray-900 dark:text-gray-400">No results found for this student.</p>
            )}
          </CenteredModal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAllModal && (
          <CenteredModal onClose={() => setShowAllModal(false)} title="All Students" theme={theme} size="lg" className="modal-content">
            <div className="space-y-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, admission number, or parent..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                />
              </div>

              <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-gray-900 dark:text-gray-300">Name</th>
                      <th className="px-4 py-2 text-left text-gray-900 dark:text-gray-300">Admission No.</th>
                      <th className="px-4 py-2 text-left text-gray-900 dark:text-gray-300">Class/Arm</th>
                      <th className="px-4 py-2 text-left text-gray-900 dark:text-gray-300">Parent</th>
                      <th className="px-4 py-2 text-left text-gray-900 dark:text-gray-300">Status</th>
                      <th className="px-4 py-2 text-left text-gray-900 dark:text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStudents.map((student) => (
                      <tr key={student.id} className={`border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'} hover:bg-gray-50 dark:hover:bg-gray-800/50`}>
                        <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{student.name}</td>
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{student.admissionNumber || '-'}</td>
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                          {student.class?.name || '-'} {student.arm?.letter ? `(Arm ${student.arm.letter})` : ''}
                        </td>
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{student.parent?.name || '-'}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            student.isActive !== false ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {student.isActive !== false ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="px-4 py-2 space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => handleEditStudent(student)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                            title="Edit Student"
                          >
                            <PencilIcon className="h-4 w-4 inline" /> Edit
                          </button>
                          <button
                            onClick={() => handleSuspendStudent(student)}
                            disabled={suspendingId === student.id}
                            className={`text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 disabled:opacity-50`}
                            title={student.isActive !== false ? 'Suspend Student' : 'Activate Student'}
                          >
                            {suspendingId === student.id ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block mr-1" />
                            ) : student.isActive !== false ? (
                              <StopIcon className="h-4 w-4 inline" />
                            ) : (
                              <PlayIcon className="h-4 w-4 inline" />
                            )}
                            {student.isActive !== false ? ' Suspend' : ' Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student)}
                            disabled={deletingId === student.id}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 disabled:opacity-50"
                            title="Delete Student"
                          >
                            <TrashIcon className="h-4 w-4 inline" /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {paginatedStudents.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-900 dark:text-gray-400">No students found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p-1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-gray-900 dark:text-gray-300 pagination-text">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </CenteredModal>
        )}
      </AnimatePresence>
    </div>
  );
}

// Centered Modal Component
function CenteredModal({ children, onClose, title, theme, size = 'md', className = '' }: any) {
  const maxWidth = size === 'lg' ? 'max-w-5xl' : 'max-w-md';
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
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className={`w-full ${maxWidth} max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} ${className}`}
        >
          <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition">
              <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto flex-1">{children}</div>
        </motion.div>
      </div>
    </>
  );
}

// Drawer Component (Offcanvas)
function Drawer({ children, onClose, title, theme, className = '' }: any) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.3 }}
        className={`fixed right-0 top-0 h-full w-full sm:w-[600px] shadow-2xl z-50 overflow-y-auto ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} ${className}`}
      >
        <div className="sticky top-0 flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 bg-inherit">
          <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition">
            <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </>
  );
}