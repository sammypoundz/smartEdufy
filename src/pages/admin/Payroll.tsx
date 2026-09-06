import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import api from '../../services/api';
import { unwrap, getErrorMessage } from '../../hooks/queryHelpers';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import './AdminPayroll.css';

// ---------- Interfaces ----------
interface PayrollEntry {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  amount: number;
  month: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  paymentDate?: string;
  notes?: string;
}

interface Staff {
  id: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const STATUS_OPTIONS = ['PAID', 'PENDING', 'OVERDUE'];

const getCurrentYearMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const formatMonthForDisplay = (month: string): string => {
  if (!month) return '';
  const [year, monthNum] = month.split('-');
  const monthName = MONTHS[parseInt(monthNum) - 1];
  return `${monthName} ${year}`;
};

export default function AdminPayroll() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const queryClient = useQueryClient();

  // ---------- State ----------
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PayrollEntry | null>(null);
  const [formData, setFormData] = useState({
    staffId: '',
    amount: '',
    month: getCurrentYearMonth(),
    status: 'PENDING' as 'PAID' | 'PENDING' | 'OVERDUE',
    notes: '',
  });

  // Filters & pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // ---------- Data Fetching (cached queries) ----------
  const staffQuery = useQuery<Staff[]>({
    queryKey: ['payroll-staff'],
    queryFn: async () => {
      const data = await unwrap<Staff[]>(
        api.get('/payroll/staff?roles=TEACHER,PRINCIPAL,ACCOUNTANT,BURSAR,ADMIN'),
      );
      return Array.isArray(data) ? data : [];
    },
    retry: false,
  });

  const payrollQuery = useQuery<PayrollEntry[]>({
    queryKey: ['payroll'],
    queryFn: async () => {
      const data = await unwrap<PayrollEntry[]>(api.get('/payroll'));
      return Array.isArray(data) ? data : [];
    },
  });

  const staffList = staffQuery.data ?? [];
  const payrollEntries = payrollQuery.data ?? [];
  const loading = payrollQuery.isLoading;
  const error = payrollQuery.error
    ? getErrorMessage(payrollQuery.error, 'Failed to load payroll')
    : null;

  const refetchAll = () => {
    staffQuery.refetch();
    payrollQuery.refetch();
  };

  useEffect(() => {
    if (staffQuery.error) {
      console.error('Staff fetch error:', staffQuery.error);
      toast.error('Failed to load staff list. Please check backend.');
    }
  }, [staffQuery.error]);

  // ---------- Filtered & Paginated Data ----------
  const filteredEntries = useMemo(() => {
    return payrollEntries.filter((entry) => {
      const matchesSearch = !searchTerm || entry.staffName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = !roleFilter || entry.role === roleFilter;
      const matchesStatus = !statusFilter || entry.status === statusFilter;
      const matchesMonth = !monthFilter || entry.month === monthFilter;
      return matchesSearch && matchesRole && matchesStatus && matchesMonth;
    });
  }, [payrollEntries, searchTerm, roleFilter, statusFilter, monthFilter]);

  const totalPages = Math.ceil(filteredEntries.length / rowsPerPage);
  const paginatedEntries = filteredEntries.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const handlePageChange = (newPage: number) => setCurrentPage(Math.max(1, Math.min(newPage, totalPages)));
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, statusFilter, monthFilter]);

  // Summary totals
  const totalPayroll = filteredEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalPaid = filteredEntries.filter(e => e.status === 'PAID').reduce((sum, e) => sum + e.amount, 0);
  const totalPending = filteredEntries.filter(e => e.status === 'PENDING').reduce((sum, e) => sum + e.amount, 0);
  const totalOverdue = filteredEntries.filter(e => e.status === 'OVERDUE').reduce((sum, e) => sum + e.amount, 0);

  const availableMonths = useMemo(() => {
    const monthsSet = new Set(payrollEntries.map(e => e.month));
    return Array.from(monthsSet).sort();
  }, [payrollEntries]);

  // ---------- CRUD Operations ----------
  const openAddModal = () => {
    setEditingEntry(null);
    setFormData({
      staffId: staffList.length > 0 ? staffList[0].id : '',
      amount: '',
      month: getCurrentYearMonth(),
      status: 'PENDING',
      notes: '',
    });
    setShowModal(true);
  };

  const openEditModal = (entry: PayrollEntry) => {
    setEditingEntry(entry);
    setFormData({
      staffId: entry.staffId,
      amount: entry.amount.toString(),
      month: entry.month,
      status: entry.status,
      notes: entry.notes || '',
    });
    setShowModal(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const invalidatePayroll = () => queryClient.invalidateQueries({ queryKey: ['payroll'] });

  const saveMutation = useMutation({
    mutationFn: async ({ editing, payload }: { editing: PayrollEntry | null; payload: { staffId: string; amount: number; month: string; status: string; notes: string } }) =>
      editing
        ? unwrap<PayrollEntry>(api.put(`/payroll/${editing.id}`, payload))
        : unwrap<PayrollEntry>(api.post('/payroll', payload)),
    onSuccess: (_data, vars) => {
      toast.success(vars.editing ? 'Payroll entry updated' : 'Payroll entry added');
      invalidatePayroll();
      setShowModal(false);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Operation failed')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => unwrap(api.delete(`/payroll/${id}`)),
    onSuccess: () => {
      toast.success('Entry deleted');
      invalidatePayroll();
    },
    onError: () => toast.error('Delete failed'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ entry, newStatus }: { entry: PayrollEntry; newStatus: 'PAID' | 'PENDING' | 'OVERDUE' }) =>
      unwrap<PayrollEntry>(api.put(`/payroll/${entry.id}`, { ...entry, status: newStatus })),
    onSuccess: (_data, vars) => {
      toast.success(`Status updated to ${vars.newStatus}`);
      invalidatePayroll();
    },
    onError: () => toast.error('Status update failed'),
  });

  const handleSubmit = () => {
    if (!formData.staffId || !formData.amount || !formData.month) {
      toast.error('Please fill all required fields');
      return;
    }
    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Amount must be a positive number');
      return;
    }
    saveMutation.mutate({
      editing: editingEntry,
      payload: {
        staffId: formData.staffId,
        amount: amountNum,
        month: formData.month,
        status: formData.status,
        notes: formData.notes,
      },
    });
  };

  const handleDelete = async (entry: PayrollEntry) => {
    const result = await Swal.fire({
      title: 'Delete Payroll Entry',
      text: `Delete entry for ${entry.staffName} (${formatMonthForDisplay(entry.month)})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete',
    });
    if (result.isConfirmed) deleteMutation.mutate(entry.id);
  };

  const updateStatus = (entry: PayrollEntry, newStatus: 'PAID' | 'PENDING' | 'OVERDUE') => {
    if (entry.status === newStatus) return;
    statusMutation.mutate({ entry, newStatus });
  };

  const exportToCSV = () => {
    const headers = ['Staff Name', 'Role', 'Amount (₦)', 'Month', 'Status', 'Payment Date', 'Notes'];
    const rows = filteredEntries.map(e => [
      e.staffName,
      e.role,
      e.amount,
      formatMonthForDisplay(e.month),
      e.status,
      e.paymentDate || '',
      e.notes || '',
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------- Loading & Error States ----------
  if (loading) {
    return (
      <div className={`loading-container ${isDark ? 'dark' : 'light'}`}>
        <div className="text-center">
          <div className="spinner"></div>
          <p className={`text ${isDark ? 'dark' : 'light'}`}>Loading payroll data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`error-container ${isDark ? 'dark' : 'light'}`}>
        <div className="text-center">
          <p className={`text error ${isDark ? 'dark' : 'light'}`}>{error}</p>
          <button onClick={refetchAll} className="btn-retry">Retry</button>
        </div>
      </div>
    );
  }

  // ---------- Render ----------
  return (
    <div className={`payroll-page ${isDark ? 'dark' : 'light'}`}>
      {isDark && (
        <div className="bg-effects">
          <div className="grid-overlay"></div>
          <div className="gradient-overlay"></div>
        </div>
      )}
      <div className="payroll-container">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="payroll-header">
          <div>
            <h2 className={`title ${isDark ? 'dark' : 'light'}`}>Payroll Management</h2>
            <p className={`subtitle ${isDark ? 'dark' : 'light'}`}>
              Manage staff salaries, track payments, and export reports.
            </p>
          </div>
          <div className="header-actions">
            <button onClick={exportToCSV} className="btn-primary btn-green">
              <DocumentArrowDownIcon className="btn-icon" /> Export CSV
            </button>
            <button onClick={openAddModal} className="btn-primary btn-blue">
              <PlusIcon className="btn-icon" /> Add Salary
            </button>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <motion.div variants={container} initial="hidden" animate="show" className="summary-grid">
          <motion.div variants={item} className={`summary-card ${isDark ? 'dark' : 'light'}`}>
            <p className={`label ${isDark ? 'dark' : 'light'}`}>Total Payroll (Filtered)</p>
            <p className={`value ${isDark ? 'dark' : 'light'}`}>₦ {totalPayroll.toLocaleString()}</p>
            <CurrencyDollarIcon className={`icon-bg ${isDark ? 'dark' : 'light'}`} />
          </motion.div>
          <motion.div variants={item} className={`summary-card ${isDark ? 'dark' : 'light'}`}>
            <p className={`label ${isDark ? 'dark' : 'light'}`}>Paid</p>
            <p className="value green">₦ {totalPaid.toLocaleString()}</p>
          </motion.div>
          <motion.div variants={item} className={`summary-card ${isDark ? 'dark' : 'light'}`}>
            <p className={`label ${isDark ? 'dark' : 'light'}`}>Pending</p>
            <p className="value yellow">₦ {totalPending.toLocaleString()}</p>
          </motion.div>
          <motion.div variants={item} className={`summary-card ${isDark ? 'dark' : 'light'}`}>
            <p className={`label ${isDark ? 'dark' : 'light'}`}>Overdue</p>
            <p className="value red">₦ {totalOverdue.toLocaleString()}</p>
          </motion.div>
        </motion.div>

        {/* Filters */}
        <div className="filters-bar">
          <div className="filter-search">
            <MagnifyingGlassIcon className="search-icon" />
            <input
              type="text"
              placeholder="Search by staff name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={isDark ? 'dark' : 'light'}
            />
          </div>
          <div className="filter-select-group">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={isDark ? 'dark' : 'light'}
            >
              <option value="">All Roles</option>
              {[...new Set(payrollEntries.map(e => e.role))].map(role => <option key={role}>{role}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={isDark ? 'dark' : 'light'}
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map(status => <option key={status}>{status}</option>)}
            </select>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className={isDark ? 'dark' : 'light'}
            >
              <option value="">All Months</option>
              {availableMonths.map(month => <option key={month} value={month}>{formatMonthForDisplay(month)}</option>)}
            </select>
            {(roleFilter || statusFilter || monthFilter || searchTerm) && (
              <button
                onClick={() => { setRoleFilter(''); setStatusFilter(''); setMonthFilter(''); setSearchTerm(''); }}
                className={`btn-clear ${isDark ? 'dark' : 'light'}`}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Payroll Table */}
        <motion.div variants={container} initial="hidden" animate="show" className="table-wrapper">
          <div className={`table-inner ${isDark ? 'dark' : 'light'}`}>
            <table>
              <thead>
                <tr className={isDark ? 'dark' : 'light'}>
                  <th className={isDark ? 'dark' : 'light'}>Staff</th>
                  <th className={isDark ? 'dark' : 'light'}>Role</th>
                  <th className={isDark ? 'dark' : 'light'}>Amount (₦)</th>
                  <th className={isDark ? 'dark' : 'light'}>Month</th>
                  <th className={isDark ? 'dark' : 'light'}>Status</th>
                  <th className={isDark ? 'dark' : 'light'}>Notes</th>
                  <th className={`text-right ${isDark ? 'dark' : 'light'}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={`text-center py-8 ${isDark ? 'dark-muted' : 'light-muted'}`}>
                      No payroll entries found. <button onClick={openAddModal} style={{ color: '#3b82f6', textDecoration: 'underline' }}>Add one</button>.
                    </td>
                  </tr>
                ) : (
                  paginatedEntries.map((entry) => (
                    <motion.tr key={entry.id} variants={item} className={isDark ? 'dark' : 'light'}>
                      <td className={isDark ? 'dark' : 'light'}>{entry.staffName}</td>
                      <td className={`body-text ${isDark ? 'dark' : 'light'}`}>{entry.role}</td>
                      <td className={`body-text ${isDark ? 'dark' : 'light'}`}>₦{entry.amount.toLocaleString()}</td>
                      <td className={`body-text ${isDark ? 'dark' : 'light'}`}>{formatMonthForDisplay(entry.month)}</td>
                      <td>
                        <select
                          value={entry.status}
                          onChange={(e) => updateStatus(entry, e.target.value as any)}
                          className={`status-select ${entry.status.toLowerCase()} ${isDark ? 'dark' : 'light'}`}
                        >
                          {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </td>
                      {/* Updated Notes Column - Now using notes-text class */}
                      <td>
                        <span className={`notes-text ${isDark ? 'dark' : 'light'}`}>
                          {entry.notes || '-'}
                        </span>
                      </td>
                      <td className="text-right">
                        <button onClick={() => openEditModal(entry)} className={`action-btn edit ${isDark ? 'dark' : 'light'}`}>
                          <PencilIcon className="icon" />
                        </button>
                        <button onClick={() => handleDelete(entry)} className={`action-btn delete ${isDark ? 'dark' : 'light'}`}>
                          <TrashIcon className="icon" />
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={`pagination ${isDark ? 'dark' : 'light'}`}>
            <div className="info">
              <span className={`text ${isDark ? 'dark' : 'light'}`}>Page {currentPage} of {totalPages}</span>
              <select
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className={isDark ? 'dark' : 'light'}
              >
                {[5,10,20,50].map(n => <option key={n}>{n} per page</option>)}
              </select>
            </div>
            <div className="controls">
              <button onClick={() => handlePageChange(currentPage-1)} disabled={currentPage===1} className={isDark ? 'dark' : 'light'}>
                Previous
              </button>
              <button onClick={() => handlePageChange(currentPage+1)} disabled={currentPage===totalPages} className={isDark ? 'dark' : 'light'}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <div className="modal-overlay" onClick={() => setShowModal(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content"
            >
              <div className={`modal-box ${isDark ? 'dark' : 'light'}`}>
                <div className={`modal-header ${isDark ? 'dark' : 'light'}`}>
                  <h3 className={isDark ? 'dark' : 'light'}>{editingEntry ? 'Edit Salary' : 'Add Salary'}</h3>
                  <button onClick={() => setShowModal(false)} className={`modal-close ${isDark ? 'dark' : 'light'}`}>
                    <XMarkIcon className="icon" />
                  </button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label className={isDark ? 'dark' : 'light'}>Staff Member *</label>
                    <select name="staffId" value={formData.staffId} onChange={handleFormChange} className={isDark ? 'dark' : 'light'}>
                      {staffList.length === 0 ? (
                        <option disabled>No staff available</option>
                      ) : (
                        staffList.map(staff => <option key={staff.id} value={staff.id}>{staff.name} ({staff.role})</option>)
                      )}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className={isDark ? 'dark' : 'light'}>Amount (₦) *</label>
                    <input type="number" name="amount" value={formData.amount} onChange={handleFormChange} className={isDark ? 'dark' : 'light'} placeholder="0" min="0" step="1000" />
                  </div>
                  <div className="form-group">
                    <label className={isDark ? 'dark' : 'light'}>Month *</label>
                    <input type="month" name="month" value={formData.month} onChange={handleFormChange} className={isDark ? 'dark' : 'light'} />
                  </div>
                  <div className="form-group">
                    <label className={isDark ? 'dark' : 'light'}>Status</label>
                    <select name="status" value={formData.status} onChange={handleFormChange} className={isDark ? 'dark' : 'light'}>
                      {STATUS_OPTIONS.map(status => <option key={status}>{status}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className={isDark ? 'dark' : 'light'}>Notes (Optional)</label>
                    <textarea name="notes" rows={3} value={formData.notes} onChange={handleFormChange} className={isDark ? 'dark' : 'light'} placeholder="e.g., Bonus, Deductions..." />
                  </div>
                </div>
                <div className={`modal-footer ${isDark ? 'dark' : 'light'}`}>
                  <button onClick={() => setShowModal(false)} className={`btn-cancel ${isDark ? 'dark' : 'light'}`}>Cancel</button>
                  <button onClick={handleSubmit} disabled={saveMutation.isPending} className="btn-submit">
                    {saveMutation.isPending ? 'Saving...' : (editingEntry ? 'Update' : 'Add')}
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

// ---------- Animation Variants ----------
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 },
};