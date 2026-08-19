import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';

// Types
interface AssessmentFormat {
  id: string;
  name: string;
  ca: number;
  exam: number;
  total: number;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 },
};

export default function AdminAssessmentFormat() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const [formats, setFormats] = useState<AssessmentFormat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFormat, setEditingFormat] = useState<AssessmentFormat | null>(null);
  const [formData, setFormData] = useState({ name: '', ca: 30, exam: 70 });
  const [submitting, setSubmitting] = useState(false);

  // Fetch all assessment formats
  const fetchFormats = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get('/assessment-formats', token);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setFormats(data);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load assessment formats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormats();
  }, [token]);

  // Open modal for create/edit
  const openCreateModal = () => {
    setEditingFormat(null);
    setFormData({ name: '', ca: 30, exam: 70 });
    setShowModal(true);
  };

  const openEditModal = (format: AssessmentFormat) => {
    setEditingFormat(format);
    setFormData({ name: format.name, ca: format.ca, exam: format.exam });
    setShowModal(true);
  };

  // ✅ Fixed: Explicitly handle each field to avoid computed property type error
  const handleChange = (field: keyof typeof formData, value: string | number) => {
    if (field === 'ca') {
      const ca = Number(value);
      const exam = 100 - ca;
      setFormData((prev) => ({ ...prev, ca, exam }));
    } else if (field === 'exam') {
      const exam = Number(value);
      const ca = 100 - exam;
      setFormData((prev) => ({ ...prev, exam, ca }));
    } else if (field === 'name') {
      // field is 'name', value is a string
      setFormData((prev) => ({ ...prev, name: String(value) }));
    }
  };

  // Validate and submit
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Format name is required');
      return;
    }
    if (formData.ca + formData.exam !== 100) {
      toast.error('CA and Exam must add up to 100%');
      return;
    }
    if (formData.ca < 0 || formData.ca > 100 || formData.exam < 0 || formData.exam > 100) {
      toast.error('Percentages must be between 0 and 100');
      return;
    }

    setSubmitting(true);
    try {
      let res;
      if (editingFormat) {
        res = await api.put(`/assessment-formats/${editingFormat.id}`, {
          name: formData.name,
          ca: formData.ca,
          exam: formData.exam,
        }, token);
        if (!res.ok) throw new Error(await res.text());
        toast.success('Assessment format updated');
      } else {
        res = await api.post('/assessment-formats', {
          name: formData.name,
          ca: formData.ca,
          exam: formData.exam,
        }, token);
        if (!res.ok) throw new Error(await res.text());
        toast.success('Assessment format created');
      }
      await fetchFormats();
      setShowModal(false);
      setEditingFormat(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete with confirmation
  const handleDelete = async (format: AssessmentFormat) => {
    const result = await Swal.fire({
      title: 'Delete Format',
      text: `Are you sure you want to delete "${format.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Yes, delete',
    });
    if (!result.isConfirmed) return;
    try {
      const res = await api.del(`/assessment-formats/${format.id}`, token);
      if (!res.ok) throw new Error(await res.text());
      toast.success('Assessment format deleted');
      await fetchFormats();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Loading assessment formats...</p>
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
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="sm:flex sm:items-center sm:justify-between mb-8">
          <div>
            <h2 className={`text-2xl font-bold ${
              theme === 'dark' ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent' : 'bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent'
            }`}>Assessment Format</h2>
            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Define CA and Exam weightings.</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openCreateModal}
            className="mt-4 sm:mt-0 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg hover:from-blue-600 hover:to-indigo-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" /> New Format
          </motion.button>
        </motion.div>

        {formats.length === 0 ? (
          <div className={`text-center py-12 rounded-2xl ${theme === 'dark' ? 'bg-white/5' : 'bg-white/50'}`}>
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>No assessment formats defined. Click "New Format" to create one.</p>
          </div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {formats.map((format) => (
              <motion.div key={format.id} variants={item} className={`group relative overflow-hidden rounded-2xl p-6 shadow-xl ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/30 backdrop-blur-md border border-white/20'}`}>
                <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{format.name}</h3>
                <div className="mt-4 space-y-2">
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Continuous Assessment: <span className="font-bold text-blue-400">{format.ca}%</span></p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Examination: <span className="font-bold text-blue-400">{format.exam}%</span></p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Total: <span className="font-bold text-blue-400">{format.total}%</span></p>
                </div>
                <div className="mt-4 flex space-x-3">
                  <button
                    onClick={() => openEditModal(format)}
                    className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300 hover:bg-white/10' : 'text-blue-600 hover:text-blue-800 hover:bg-blue-100/50'}`}
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(format)}
                    className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-red-400 hover:text-red-300 hover:bg-white/10' : 'text-red-600 hover:text-red-800 hover:bg-red-100/50'}`}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl transition-all group-hover:scale-110 ${theme === 'dark' ? 'bg-blue-500/20 group-hover:bg-blue-500/30' : 'bg-blue-200/30 group-hover:bg-blue-300/40'}`} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {editingFormat ? 'Edit Assessment Format' : 'New Assessment Format'}
                  </h3>
                  <button onClick={() => setShowModal(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                    <XMarkIcon className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Format Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      placeholder="e.g., Default, Science, Arts"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Continuous Assessment (CA) %</label>
                    <input
                      type="number"
                      value={formData.ca}
                      onChange={(e) => handleChange('ca', Number(e.target.value))}
                      min="0"
                      max="100"
                      step="5"
                      className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Examination %</label>
                    <input
                      type="number"
                      value={formData.exam}
                      onChange={(e) => handleChange('exam', Number(e.target.value))}
                      min="0"
                      max="100"
                      step="5"
                      className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    />
                  </div>
                  <div className={`text-sm ${formData.ca + formData.exam === 100 ? 'text-green-600' : 'text-red-500'}`}>
                    Total: {formData.ca + formData.exam}% {formData.ca + formData.exam !== 100 && '(must be 100%)'}
                  </div>
                </div>
                <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowModal(false)}
                    className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || formData.ca + formData.exam !== 100 || !formData.name.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Saving...' : (editingFormat ? 'Update' : 'Create')}
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