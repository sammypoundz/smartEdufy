import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { api } from '../../utils/api';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArchiveBoxIcon,
  CubeIcon,
  TagIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

// ---------- Types ----------
interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  category: string;
  status: 'Good' | 'Needs Repair' | 'Broken' | 'Low Stock';
}

interface Stats {
  totalItems: number;
  totalQuantity: number;
  lowStockItems: number;
  categories: number;
}

// ✅ Updated statusColors – bold, visible backgrounds in light mode
const statusColors = {
  Good: 'bg-green-600 text-white dark:bg-green-900/40 dark:text-green-300',
  'Needs Repair': 'bg-yellow-500 text-white dark:bg-yellow-900/40 dark:text-yellow-300',
  Broken: 'bg-red-600 text-white dark:bg-red-900/40 dark:text-red-300',
  'Low Stock': 'bg-orange-500 text-white dark:bg-orange-900/40 dark:text-orange-300',
};

const statusIcons = {
  Good: CheckCircleIcon,
  'Needs Repair': ExclamationCircleIcon,
  Broken: XCircleIcon,
  'Low Stock': ExclamationCircleIcon,
};

const categories = ['All', 'Furniture', 'Electronics', 'Books', 'Science', 'Sports'];
const statusOptions = ['All', 'Good', 'Needs Repair', 'Broken', 'Low Stock'];

export default function AdminInventory() {
  const { theme } = useTheme();

  // State
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalItems: 0,
    totalQuantity: 0,
    lowStockItems: 0,
    categories: 0,
  });

  // Filters & pagination
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<Omit<InventoryItem, 'id'>>({
    name: '',
    quantity: 0,
    category: 'Furniture',
    status: 'Good',
  });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null); // track which item is being deleted

  // Fetch items with filters & pagination
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(search && { search }),
        ...(categoryFilter !== 'All' && { category: categoryFilter }),
        ...(statusFilter !== 'All' && { status: statusFilter }),
      });
      const res = await api.get(`/inventory?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setItems(data.data || []);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load inventory');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, categoryFilter, statusFilter]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/inventory/stats');
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to fetch stats', err);
    }
  }, []);

  // Load data when dependencies change
  useEffect(() => {
    fetchItems();
    fetchStats();
  }, [fetchItems, fetchStats]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, statusFilter]);

  // ---------- CRUD Handlers ----------
  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ name: '', quantity: 0, category: 'Furniture', status: 'Good' });
    setIsModalOpen(true);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  // ✅ SweetAlert2 confirmation for delete
  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete Item?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete',
      background: theme === 'dark' ? '#1f2937' : '#fff',
      color: theme === 'dark' ? '#fff' : '#000',
    });

    if (!result.isConfirmed) return;

    setDeletingId(id);
    try {
      const res = await api.del(`/inventory/${id}`);
      if (!res.ok) throw new Error(await res.text());
      toast.success('Item deleted');
      await Promise.all([fetchItems(), fetchStats()]);
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.quantity < 0) {
      toast.error('Please fill in all fields correctly');
      return;
    }
    setSubmitting(true);
    try {
      const endpoint = editingItem ? `/inventory/${editingItem.id}` : '/inventory';
      const method = editingItem ? 'put' : 'post';
      const res = await api[method](endpoint, formData);
      if (!res.ok) throw new Error(await res.text());
      toast.success(editingItem ? 'Item updated' : 'Item added');
      await Promise.all([fetchItems(), fetchStats()]);
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({ name: '', quantity: 0, category: 'Furniture', status: 'Good' });
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Render ----------
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
            }`}>Inventory</h2>
            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Manage school assets and supplies.</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAdd}
            disabled={submitting}
            className="mt-4 sm:mt-0 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <PlusIcon className="h-5 w-5 mr-2" />
            )}
            {submitting ? 'Processing...' : 'Add Item'}
          </motion.button>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className={`rounded-xl p-4 shadow-md ${
            theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-white/80 backdrop-blur-sm border border-gray-200/60'
          }`}>
            <div className="flex items-center gap-3">
              <ArchiveBoxIcon className="h-8 w-8 text-blue-500" />
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Total Items</p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.totalItems}</p>
              </div>
            </div>
          </div>
          <div className={`rounded-xl p-4 shadow-md ${
            theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-white/80 backdrop-blur-sm border border-gray-200/60'
          }`}>
            <div className="flex items-center gap-3">
              <CubeIcon className="h-8 w-8 text-emerald-500" />
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Total Quantity</p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.totalQuantity}</p>
              </div>
            </div>
          </div>
          <div className={`rounded-xl p-4 shadow-md ${
            theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-white/80 backdrop-blur-sm border border-gray-200/60'
          }`}>
            <div className="flex items-center gap-3">
              <TagIcon className="h-8 w-8 text-amber-500" />
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Categories</p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.categories}</p>
              </div>
            </div>
          </div>
          <div className={`rounded-xl p-4 shadow-md ${
            theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-white/80 backdrop-blur-sm border border-gray-200/60'
          }`}>
            <div className="flex items-center gap-3">
              <ChartBarIcon className="h-8 w-8 text-red-500" />
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Low Stock (&lt;10)</p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.lowStockItems}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className={`relative flex-1 min-w-[200px] rounded-xl shadow-xl ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/30 backdrop-blur-md border border-white/20'}`}>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <MagnifyingGlassIcon className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`block w-full rounded-xl border-0 bg-transparent pl-12 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
              placeholder="Search by name or category..."
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={`rounded-xl border-0 px-4 py-2 text-sm shadow-xl focus:ring-2 focus:ring-blue-500 ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white/30 backdrop-blur-md border border-white/20 text-gray-900'
            }`}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`rounded-xl border-0 px-4 py-2 text-sm shadow-xl focus:ring-2 focus:ring-blue-500 ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white/30 backdrop-blur-md border border-white/20 text-gray-900'
            }`}
          >
            {statusOptions.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl shadow-xl overflow-hidden">
          <div className={`overflow-x-auto ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/30 backdrop-blur-md border border-white/20'}`}>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className={`py-4 pl-6 pr-3 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Item</th>
                    <th className={`px-3 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Quantity</th>
                    <th className={`px-3 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Category</th>
                    <th className={`px-3 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Status</th>
                    <th className={`relative py-4 pl-3 pr-6 text-right text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/10' : 'divide-gray-200/50'}`}>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={`py-8 text-center text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No items found</td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const StatusIcon = statusIcons[item.status];
                      const isDeleting = deletingId === item.id;
                      return (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{ backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(59,130,246,0.05)' }}
                          className="transition-colors"
                        >
                          <td className={`whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{item.name}</td>
                          <td className={`whitespace-nowrap px-3 py-4 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{item.quantity}</td>
                          <td className={`whitespace-nowrap px-3 py-4 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{item.category}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusColors[item.status]}`}>
                              <StatusIcon className="h-4 w-4" />
                              {item.status}
                            </span>
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm">
                            <button
                              onClick={() => handleEdit(item)}
                              disabled={isDeleting}
                              className={`mr-3 p-1 rounded-lg transition-colors ${
                                theme === 'dark'
                                  ? 'text-blue-400 hover:text-blue-300 hover:bg-white/10'
                                  : 'text-blue-600 hover:text-blue-800 hover:bg-blue-100/50'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              disabled={isDeleting}
                              className={`p-1 rounded-lg transition-colors ${
                                theme === 'dark'
                                  ? 'text-red-400 hover:text-red-300 hover:bg-white/10'
                                  : 'text-red-600 hover:text-red-800 hover:bg-red-100/50'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {isDeleting ? (
                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <TrashIcon className="h-5 w-5" />
                              )}
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={`flex items-center justify-between px-4 py-3 mt-4 rounded-xl shadow-sm ${
            theme === 'dark' ? 'bg-gray-800/50 backdrop-blur border border-white/20' : 'bg-white/80 backdrop-blur border border-gray-200/60'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Page {currentPage} of {totalPages}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-md text-sm transition-colors disabled:opacity-50 ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:bg-gray-800'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:bg-gray-100'
                }`}
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-md text-sm transition-colors disabled:opacity-50 ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:bg-gray-800'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:bg-gray-100'
                }`}
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal for Add/Edit */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className={`relative w-full max-w-md rounded-2xl shadow-2xl ${
                theme === 'dark' ? 'bg-gray-900 border border-gray-700' : 'bg-white/90 backdrop-blur-xl border border-gray-200/60'
              } p-6`}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className={`absolute top-3 right-3 p-1 rounded-full transition-colors ${
                  theme === 'dark' ? 'text-gray-400 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>

              <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Item name"
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    {categories.filter(c => c !== 'All').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as InventoryItem['status'] })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    {statusOptions.filter(s => s !== 'All').map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={`px-4 py-2 border rounded-lg transition-colors ${
                      theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {submitting && <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {editingItem ? 'Update' : 'Add'}
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