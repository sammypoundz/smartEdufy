import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import {
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  XMarkIcon,
  PlusIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  UsersIcon,
  UserPlusIcon,
  UserMinusIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { getErrorMessage, unwrap } from '../../hooks/queryHelpers';
import { formatArm } from '../../utils/arm';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { exportToExcel, exportToPDF, type ExportColumn } from '../../utils/exportData';
import ExportButtons from '../../components/ExportButtons';

// ---------- Types ----------
interface ParentLinkRequest {
  id: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
  parentNote?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  parent?: { id: string; name: string; email: string } | null;
  student?: {
    id: string;
    name: string;
    admissionNumber?: string;
    class?: { name: string } | null;
    arm?: { letter: string } | null;
  } | null;
}

interface Parent {
  id: string;
  name: string;
  email: string;
  phone?: string;
  children?: Student[];
  createdAt?: string;
  updatedAt?: string;
}

interface Student {
  id: string;
  name: string;
  admissionNumber?: string;
  class?: { name: string };
  arm?: { letter: string };
  parentId?: string | null;
}

// ---------- Constants ----------
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 },
};

// ---------- Main Component ----------
export default function AdminParent() {
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modal states
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Children assignment
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const parentExportColumns: ExportColumn<Parent>[] = [
    { header: 'Name', value: p => p.name },
    { header: 'Email', value: p => p.email },
    { header: 'Phone', value: p => p.phone || '' },
    { header: 'Children', value: p => String(childCountMap.get(p.id) ?? p.children?.length ?? 0) },
  ];

  // ---------- Queries ----------
  const studentsQuery = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: () => unwrap(api.get<Student[]>('/students')),
  });
  const allStudents = studentsQuery.data ?? [];

  // ---------- Compute child count per parent from allStudents ----------
  const childCountMap = useMemo(() => {
    const map = new Map<string, number>();
    allStudents.forEach((student) => {
      if (student.parentId) {
        map.set(student.parentId, (map.get(student.parentId) || 0) + 1);
      }
    });
    return map;
  }, [allStudents]);

  const parentsQuery = useQuery<Parent[]>({
    queryKey: ['parents'],
    queryFn: () => unwrap(api.get<Parent[]>('/parents')),
  });
  const parents = parentsQuery.data ?? [];
  const loading = parentsQuery.isLoading;
  const error = parentsQuery.error ? getErrorMessage(parentsQuery.error, 'Failed to load parents') : null;

  const invalidateParents = () => queryClient.invalidateQueries({ queryKey: ['parents'] });

  // ---------- Parent → child link requests (approve / reject) ----------
  const linkRequestsQuery = useQuery<ParentLinkRequest[]>({
    queryKey: ['parent-link-requests-admin'],
    queryFn: async () => {
      const res = await api.get<{ requests: ParentLinkRequest[] }>('/parent-links/requests');
      return res.data.requests ?? [];
    },
  });
  const linkRequests = linkRequestsQuery.data ?? [];
  const pendingLinkRequests = linkRequests.filter((r) => r.status === 'PENDING_REVIEW');

  // Requests panel: status tab, search, pagination (handles large volumes)
  const [linkTab, setLinkTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [linkSearch, setLinkSearch] = useState('');
  const [linkPage, setLinkPage] = useState(1);
  const LINK_PAGE_SIZE = 5;

  const filteredLinkRequests = useMemo(() => {
    const q = linkSearch.trim().toLowerCase();
    return linkRequests.filter((r) => {
      if (linkTab !== 'ALL') {
        if (linkTab === 'PENDING') {
          if (r.status !== 'PENDING_REVIEW' && r.status !== 'CHANGES_REQUESTED') return false;
        } else if (r.status !== linkTab) return false;
      }
      if (!q) return true;
      return [
        r.student?.name, r.student?.admissionNumber, r.student?.class?.name,
        r.parent?.name, r.parent?.email, r.parentNote,
      ].some((f) => (f || '').toLowerCase().includes(q));
    });
  }, [linkRequests, linkTab, linkSearch]);

  const linkPageCount = Math.max(1, Math.ceil(filteredLinkRequests.length / LINK_PAGE_SIZE));
  const safeLinkPage = Math.min(linkPage, linkPageCount);
  const pagedLinkRequests = filteredLinkRequests.slice(
    (safeLinkPage - 1) * LINK_PAGE_SIZE,
    safeLinkPage * LINK_PAGE_SIZE,
  );

  const reviewLinkRequest = useMutation({
    mutationFn: (vars: { id: string; action: 'approve' | 'reject'; note?: string }) =>
      api.post(`/parent-links/requests/${vars.id}/${vars.action}`, { reviewNote: vars.note }),
    onSuccess: (_data, vars) => {
      toast.success(vars.action === 'approve' ? 'Request approved — child linked to parent' : 'Request rejected');
      queryClient.invalidateQueries({ queryKey: ['parent-link-requests-admin'] });
      queryClient.invalidateQueries({ queryKey: ['parent-link-pending-count'] });
      queryClient.invalidateQueries({ queryKey: ['parents'] });
    },
    onError: (err: unknown) =>
      toast.error(getErrorMessage(err, 'Failed to update link request')),
  });

  const handleReview = (req: ParentLinkRequest, action: 'approve' | 'reject') => {
    if (action === 'approve') {
      Swal.fire({
        title: 'Approve link request?',
        text: `${req.parent?.name || 'This parent'} will be linked to ${req.student?.name || 'the student'}.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, approve',
      }).then((r) => {
        if (r.isConfirmed) reviewLinkRequest.mutate({ id: req.id, action });
      });
    } else {
      Swal.fire({
        title: 'Reject link request?',
        input: 'text',
        inputPlaceholder: 'Reason (optional) — sent to the parent',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, reject',
      }).then((r) => {
        if (r.isConfirmed) reviewLinkRequest.mutate({ id: req.id, action, note: r.value || undefined });
      });
    }
  };

  useEffect(() => {
    if (parentsQuery.error) toast.error(getErrorMessage(parentsQuery.error, 'Failed to load parents'));
  }, [parentsQuery.error]);

  // ---------- Filter & Pagination ----------
  const filteredParents = useMemo(() => {
    return parents.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
    );
  }, [parents, search]);

  const totalPages = Math.max(1, Math.ceil(filteredParents.length / rowsPerPage));
  const paginatedParents = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredParents.slice(start, start + rowsPerPage);
  }, [filteredParents, currentPage, rowsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(Math.max(1, Math.min(newPage, totalPages)));
  };

  // ---------- Mutations: Create ----------
  const addParentMutation = useMutation({
    mutationFn: (body: typeof formData) => unwrap(api.post<Parent>('/parents', body)),
    onSuccess: () => {
      toast.success('Parent added successfully');
      setShowAddModal(false);
      setFormData({ name: '', email: '', phone: '' });
      invalidateParents();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, 'Failed to add parent')),
    onSettled: () => setSubmitting(false),
  });

  const updateParentMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: typeof formData }) =>
      unwrap(api.put<Parent>(`/parents/${id}`, body)),
    onSuccess: (updated) => {
      toast.success('Parent updated successfully');
      setShowEditModal(false);
      setSelectedParent(updated);
      invalidateParents();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, 'Failed to update parent')),
    onSettled: () => setSubmitting(false),
  });

  const deleteParentMutation = useMutation({
    mutationFn: (id: string) => unwrap(api.delete(`/parents/${id}`)),
    onSuccess: () => {
      toast.success('Parent deleted');
      invalidateParents();
    },
    onError: () => toast.error('Delete failed'),
  });

  // ---------- CRUD: Create ----------
  const handleAddParent = async () => {
    if (!formData.name || !formData.email) {
      toast.error('Name and email are required');
      return;
    }
    setSubmitting(true);
    addParentMutation.mutate(formData);
  };

  // ---------- CRUD: Update ----------
  const handleUpdateParent = async () => {
    if (!selectedParent || !formData.name || !formData.email) {
      toast.error('Name and email are required');
      return;
    }
    setSubmitting(true);
    updateParentMutation.mutate({ id: selectedParent.id, body: formData });
  };

  // ---------- CRUD: Delete ----------
  const handleDeleteParent = async (parent: Parent) => {
    const result = await Swal.fire({
      title: 'Delete Parent',
      text: `Delete ${parent.name}? This will unlink them from their children.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete',
    });
    if (!result.isConfirmed) return;
    deleteParentMutation.mutate(parent.id);
  };

  // ---------- View Parent (with children) ----------
  const viewParent = async (parent: Parent) => {
    try {
      const res = await api.get(`/parents/${parent.id}`);
      setSelectedParent(res.data);
      setShowViewModal(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load parent details');
    }
  };

  // ---------- Mutations: assign / unassign child ----------
  const assignChildMutation = useMutation({
    mutationFn: ({ studentId, parentId }: { studentId: string; parentId: string }) =>
      unwrap(api.patch(`/students/${studentId}`, { parentId })),
    onSuccess: async (_d, vars) => {
      toast.success('Child assigned successfully');
      const res = await api.get(`/parents/${vars.parentId}`);
      setSelectedParent(res.data);
      setSelectedStudentId('');
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, 'Assignment failed')),
    onSettled: () => setAssigning(false),
  });

  const unassignChildMutation = useMutation({
    mutationFn: (studentId: string) =>
      unwrap(api.patch(`/students/${studentId}/unassign-parent`)),
    onSuccess: async (_d) => {
      toast.success('Child unassigned');
      const res = await api.get(`/parents/${selectedParent!.id}`);
      setSelectedParent(res.data);
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, 'Failed to unassign child')),
  });

  // ---------- Assign Child to Parent ----------
  const assignChild = async () => {
    if (!selectedParent || !selectedStudentId) {
      toast.error('Please select a student');
      return;
    }
    setAssigning(true);
    assignChildMutation.mutate({ studentId: selectedStudentId, parentId: selectedParent.id });
  };

  // ---------- Remove Child from Parent ----------
  const removeChild = async (student: Student) => {
    const result = await Swal.fire({
      title: 'Unassign Child',
      text: `Remove ${student.name} from ${selectedParent?.name}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Remove',
    });
    if (!result.isConfirmed) return;
    unassignChildMutation.mutate(student.id);
  };

  // ---------- Helper: get available students (not assigned to this parent) ----------
  const availableStudents = useMemo(() => {
    if (!selectedParent) return allStudents;
    const assignedIds = (selectedParent.children || []).map((c) => c.id);
    return allStudents.filter((s) => !assignedIds.includes(s.id));
  }, [allStudents, selectedParent]);

  // ---------- Loading / Error ----------
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
      }`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className={`mt-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Loading parents...</p>
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
          <button onClick={() => parentsQuery.refetch()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ---------- Main Render ----------
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
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="sm:flex sm:items-center sm:justify-between mb-8">
          <div>
            <h2 className={`text-2xl font-bold ${
              theme === 'dark' ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent' : 'bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent'
            }`}>Parent Management</h2>
            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Manage parents, view children, and assign students.</p>
          </div>
          <div className="flex flex-wrap gap-3 mt-4 sm:mt-0">
            <ExportButtons
              disabled={filteredParents.length === 0}
              onExcel={() => exportToExcel('parents', parentExportColumns, filteredParents)}
              onPDF={() => exportToPDF('parents', 'Parents List', parentExportColumns, filteredParents)}
            />
            <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setFormData({ name: '', email: '', phone: '' });
              setShowAddModal(true);
            }}
            className="mt-4 sm:mt-0 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg hover:from-blue-600 hover:to-indigo-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" /> Add Parent
            </motion.button>
          </div>
        </motion.div>

        {/* Child Link Requests (from parents) */}
        <motion.div variants={item} initial="hidden" animate="show" className="mb-6 rounded-2xl shadow-xl overflow-hidden">
          {/* Header: title + refresh */}
          <div className={`px-4 sm:px-5 py-4 flex items-center justify-between gap-3 border-b ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border-white/10' : 'bg-white/60 backdrop-blur-md border-white/20'}`}>
            <div className="flex items-center gap-2 min-w-0">
              <UserPlusIcon className={`h-5 w-5 flex-shrink-0 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-500'}`} />
              <h3 className={`text-sm font-bold uppercase tracking-wide truncate ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                Child Link Requests
              </h3>
              {pendingLinkRequests.length > 0 && (
                <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold animate-pulse">
                  {pendingLinkRequests.length} pending
                </span>
              )}
            </div>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['parent-link-requests-admin'] })}
              className={`flex-shrink-0 text-xs font-medium ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}
            >
              Refresh
            </button>
          </div>

          {/* Status tabs (horizontally scrollable on small screens) */}
          <div className={`px-4 sm:px-5 pt-3 pb-2 flex gap-1.5 overflow-x-auto border-b ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border-white/10' : 'bg-white/40 backdrop-blur-md border-gray-200/60'}`}>
            {([
              ['PENDING', `Pending (${pendingLinkRequests.length})`],
              ['APPROVED', 'Approved'],
              ['REJECTED', 'Rejected'],
              ['ALL', 'All'],
            ] as const).map(([key, label]) => {
              const active = linkTab === key;
              return (
                <button
                  key={key}
                  onClick={() => { setLinkTab(key); setLinkPage(1); }}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-blue-600 text-white shadow'
                      : theme === 'dark'
                        ? 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                        : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Requests search */}
          <div className={`px-4 sm:px-5 py-2.5 border-b ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white/40 border-gray-200/60'}`}>
            <input
              type="text"
              value={linkSearch}
              onChange={(e) => { setLinkSearch(e.target.value); setLinkPage(1); }}
              placeholder="Search by student, parent, or class…"
              className={`w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark'
                  ? 'bg-white/5 text-white placeholder-gray-500 border border-white/10'
                  : 'bg-white text-gray-900 placeholder-gray-400 border border-gray-200'
              }`}
            />
          </div>

          <div className={`divide-y ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl divide-white/10' : 'bg-white/40 backdrop-blur-md divide-gray-200/60'}`}>
            {linkRequestsQuery.isLoading ? (
              <p className={`px-4 sm:px-5 py-6 text-sm text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Loading link requests…</p>
            ) : pagedLinkRequests.length === 0 ? (
              <p className={`px-4 sm:px-5 py-6 text-sm text-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                {linkRequests.length === 0
                  ? 'No link requests from parents yet.'
                  : 'No requests match this filter.'}
              </p>
            ) : (
              pagedLinkRequests.map((req) => {
                const pending = req.status === 'PENDING_REVIEW' || req.status === 'CHANGES_REQUESTED';
                const statusCls =
                  req.status === 'APPROVED'
                    ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                    : req.status === 'REJECTED'
                      ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                      : 'bg-orange-500/20 text-orange-600 dark:text-orange-300';
                return (
                  <div key={req.id} className="px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-semibold min-w-0 break-words ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {req.student?.name || 'Unknown student'}
                          {req.student?.admissionNumber ? ` (${req.student.admissionNumber})` : ''}
                        </p>
                        {/* Status pill — shown inline on mobile, moved to the right column on sm+ via hidden ordering */}
                        <span className={`sm:hidden flex-shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${statusCls}`}>
                          {req.status.replace('_', ' ').toLowerCase()}
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 break-words ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {req.student?.class?.name || 'No class'}
                        {req.student?.arm?.letter ? ` · Arm ${req.student.arm.letter}` : ''}
                        {' — '}
                        requested by <span className="font-medium">{req.parent?.name || 'Unknown parent'}</span>
                        {req.createdAt ? ` · ${new Date(req.createdAt).toLocaleDateString()}` : ''}
                      </p>
                      {req.parent?.email && (
                        <p className={`text-xs break-all sm:hidden ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                          {req.parent.email}
                        </p>
                      )}
                      {req.parentNote && (
                        <p className={`mt-1 text-xs italic break-words ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          “{req.parentNote}”
                        </p>
                      )}
                      {req.reviewNote && !pending && (
                        <p className={`mt-1 text-xs italic break-words ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                          Reviewer note: “{req.reviewNote}”
                        </p>
                      )}
                    </div>
                    <div className="flex sm:flex-col sm:items-end items-center justify-between sm:justify-center gap-2 flex-shrink-0">
                      <span className={`hidden sm:inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusCls}`}>
                        {req.status.replace('_', ' ').toLowerCase()}
                      </span>
                      {pending && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleReview(req, 'approve')}
                            disabled={reviewLinkRequest.isPending}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold shadow disabled:opacity-50"
                          >
                            <CheckIcon className="h-4 w-4" /> Approve
                          </button>
                          <button
                            onClick={() => handleReview(req, 'reject')}
                            disabled={reviewLinkRequest.isPending}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow disabled:opacity-50"
                          >
                            <XMarkIcon className="h-4 w-4" /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination footer */}
          {filteredLinkRequests.length > LINK_PAGE_SIZE && (
            <div className={`px-4 sm:px-5 py-3 flex items-center justify-between gap-3 border-t ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white/40 border-gray-200/60'}`}>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {(safeLinkPage - 1) * LINK_PAGE_SIZE + 1}–{Math.min(safeLinkPage * LINK_PAGE_SIZE, filteredLinkRequests.length)} of{' '}
                {filteredLinkRequests.length} requests
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setLinkPage((p) => Math.max(1, p - 1))}
                  disabled={safeLinkPage <= 1}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium disabled:opacity-40 ${
                    theme === 'dark' ? 'bg-white/5 text-gray-300 hover:bg-white/10' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Prev
                </button>
                <span className={`px-2 text-xs font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {safeLinkPage} / {linkPageCount}
                </span>
                <button
                  onClick={() => setLinkPage((p) => Math.min(linkPageCount, p + 1))}
                  disabled={safeLinkPage >= linkPageCount}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium disabled:opacity-40 ${
                    theme === 'dark' ? 'bg-white/5 text-gray-300 hover:bg-white/10' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Search */}
        <motion.div variants={item} initial="hidden" animate="show" className="mb-6">
          <div className={`relative rounded-xl shadow-xl ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/30 backdrop-blur-md border border-white/20'}`}>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <MagnifyingGlassIcon className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`block w-full rounded-xl border-0 bg-transparent pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark' ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
              }`}
              placeholder="Search parents..."
            />
          </div>
        </motion.div>

        {/* Table */}
        <motion.div variants={container} initial="hidden" animate="show" className="rounded-2xl shadow-xl overflow-hidden">
          <div className={`overflow-x-auto ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/30 backdrop-blur-md border border-white/20'}`}>
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className={`py-4 pl-6 pr-3 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Name</th>
                  <th className={`px-3 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Email</th>
                  <th className={`px-3 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Phone</th>
                  <th className={`px-3 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Children</th>
                  <th className={`relative py-4 pl-3 pr-6 text-right text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/10' : 'divide-gray-200/50'}`}>
                {paginatedParents.map((parent) => {
                  const childCount = childCountMap.get(parent.id) ?? 0;
                  return (
                    <motion.tr
                      key={parent.id}
                      variants={item}
                      whileHover={{ backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(59,130,246,0.05)' }}
                      className="transition-colors"
                    >
                      <td className={`whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {parent.name}
                      </td>
                      <td className={`whitespace-nowrap px-3 py-4 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {parent.email}
                      </td>
                      <td className={`whitespace-nowrap px-3 py-4 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {parent.phone || '—'}
                      </td>
                      <td className={`whitespace-nowrap px-3 py-4 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {childCount}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm">
                        <button
                          onClick={() => viewParent(parent)}
                          className={`mr-2 p-1 rounded-lg transition-colors ${
                            theme === 'dark' ? 'text-blue-400 hover:text-blue-300 hover:bg-white/10' : 'text-blue-600 hover:text-blue-800 hover:bg-blue-100/50'
                          }`}
                          title="View Details"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedParent(parent);
                            setFormData({
                              name: parent.name,
                              email: parent.email,
                              phone: parent.phone || '',
                            });
                            setShowEditModal(true);
                          }}
                          className={`mr-2 p-1 rounded-lg transition-colors ${
                            theme === 'dark' ? 'text-blue-400 hover:text-blue-300 hover:bg-white/10' : 'text-blue-600 hover:text-blue-800 hover:bg-blue-100/50'
                          }`}
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteParent(parent)}
                          className={`p-1 rounded-lg transition-colors ${
                            theme === 'dark' ? 'text-red-400 hover:text-red-300 hover:bg-white/10' : 'text-red-600 hover:text-red-800 hover:bg-red-100/50'
                          }`}
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
                {paginatedParents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      No parents found.
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
            theme === 'dark' ? 'bg-gray-800/50 backdrop-blur border border-white/20' : 'bg-white/30 backdrop-blur border border-white/20'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Page {currentPage} of {totalPages}
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

      {/* ========== MODALS ========== */}

      {/* View Parent Modal */}
      <AnimatePresence>
        {showViewModal && selectedParent && (
          <Modal
            onClose={() => setShowViewModal(false)}
            title={`Parent: ${selectedParent.name}`}
            theme={theme}
            size="lg"
          >
            <div className="space-y-6">
              {/* Parent Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Name</p>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{selectedParent.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Email</p>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{selectedParent.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <PhoneIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Phone</p>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{selectedParent.phone || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <UsersIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Total Children</p>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{selectedParent.children?.length || 0}</p>
                  </div>
                </div>
              </div>

              {/* Children List & Assignment */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Assigned Children
                </h4>
                {selectedParent.children && selectedParent.children.length > 0 ? (
                  <ul className="space-y-2">
                    {selectedParent.children.map((child) => (
                      <li
                        key={child.id}
                        className={`flex flex-wrap items-center justify-between p-2 rounded-lg ${
                          theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'
                        }`}
                      >
                        <div>
                          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {child.name}
                          </p>
                          <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {child.class?.name || ''} {child.arm ? formatArm(child.arm) : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => removeChild(child)}
                          className={`p-1 rounded-lg transition-colors ${
                            theme === 'dark' ? 'text-red-400 hover:bg-white/10' : 'text-red-500 hover:bg-red-50'
                          }`}
                          title="Unassign"
                        >
                          <UserMinusIcon className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    No children assigned.
                  </p>
                )}

                {/* Assign Child */}
                <div className="mt-4">
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Assign a Child
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className={`flex-1 min-w-[150px] rounded-lg border-0 px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 ${
                        theme === 'dark'
                          ? 'bg-gray-800 text-white border border-gray-700'
                          : 'bg-white text-gray-900 border border-gray-300'
                      }`}
                    >
                      <option value="">Select a student</option>
                      {availableStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.admissionNumber ? `(${s.admissionNumber})` : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={assignChild}
                      disabled={assigning || !selectedStudentId}
                      className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {assigning ? (
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <UserPlusIcon className="h-4 w-4 mr-1" />
                      )}
                      Assign
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Add Parent Modal */}
      <AnimatePresence>
        {showAddModal && (
          <Modal
            onClose={() => setShowAddModal(false)}
            title="Add New Parent"
            theme={theme}
          >
            <div className="space-y-4">
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
                  placeholder="e.g., Mr. John Okonkwo"
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
                  placeholder="parent@example.com"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Phone
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`w-full rounded-lg border-0 px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 ${
                    theme === 'dark'
                      ? 'bg-gray-800 text-white border border-gray-700'
                      : 'bg-white text-gray-900 border border-gray-300'
                  }`}
                  placeholder="+234 800 000 0000"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowAddModal(false)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddParent}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Add
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Edit Parent Modal */}
      <AnimatePresence>
        {showEditModal && selectedParent && (
          <Modal
            onClose={() => setShowEditModal(false)}
            title={`Edit ${selectedParent.name}`}
            theme={theme}
          >
            <div className="space-y-4">
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
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Phone
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`w-full rounded-lg border-0 px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 ${
                    theme === 'dark'
                      ? 'bg-gray-800 text-white border border-gray-700'
                      : 'bg-white text-gray-900 border border-gray-300'
                  }`}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowEditModal(false)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateParent}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Update
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- Modal Helper with scrollable content ----------
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
          className={`w-full ${maxWidth} rounded-2xl shadow-2xl overflow-hidden ${
            theme === 'dark' ? 'bg-gray-900 border border-white/10' : 'bg-white/90 backdrop-blur-xl border border-gray-200/60'
          }`}
        >
          <div className={`flex justify-between items-center p-6 border-b ${
            theme === 'dark' ? 'border-white/10' : 'border-gray-200'
          }`}>
            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {children}
          </div>
        </motion.div>
      </div>
    </>
  );
}