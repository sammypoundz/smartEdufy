import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import toast from 'react-hot-toast';
import { api } from '../../utils/api';
import {
  BellIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  AcademicCapIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ChartBarIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  XMarkIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';

// Types
interface GradingScale {
  id: string;
  minScore: number | null;
  maxScore: number | null;
  grade: string;
  points?: number | null;
}

interface ReportCardTemplate {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
}

interface PromotionRule {
  id: string;
  fromClass: string;
  toClass: string;
  minAverage: number | null;
  isAutomatic: boolean;
}

interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  sortCode: string;
}

interface GeneralSettings {
  schoolName: string;
  language: string;
}

interface AcademicSettings {
  currentTerm: string;
  currentTermId: string | null;
  academicYearId: string | null;
}

interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
}

interface SecuritySettings {
  twoFactorAuth: boolean;
  sessionTimeout: number;
}

interface BackupSettings {
  autoBackup: boolean;
}

interface Term {
  id: string;
  name: string;
  order?: number;
  academicYearId: string;
}

interface AcademicYear {
  id: string;
  name: string;
  isActive?: boolean;
  terms: Term[];
}

const categories = [
  { id: 'general', label: 'General', icon: Cog6ToothIcon, gradient: 'from-blue-500 to-cyan-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { id: 'academic', label: 'Academic', icon: AcademicCapIcon, gradient: 'from-purple-500 to-pink-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  { id: 'financial', label: 'Financial', icon: CurrencyDollarIcon, gradient: 'from-green-500 to-emerald-400', bg: 'bg-green-50 dark:bg-green-900/20' },
  { id: 'grading', label: 'Grading', icon: ChartBarIcon, gradient: 'from-orange-500 to-amber-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  { id: 'templates', label: 'Report Cards', icon: DocumentTextIcon, gradient: 'from-indigo-500 to-blue-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  { id: 'notifications', label: 'Notifications', icon: BellIcon, gradient: 'from-pink-500 to-rose-400', bg: 'bg-pink-50 dark:bg-pink-900/20' },
  { id: 'security', label: 'Security', icon: ShieldCheckIcon, gradient: 'from-red-500 to-orange-400', bg: 'bg-red-50 dark:bg-red-900/20' },
  { id: 'backup', label: 'Backup', icon: ArrowPathIcon, gradient: 'from-teal-500 to-cyan-400', bg: 'bg-teal-50 dark:bg-teal-900/20' },
];

export default function AdminSettings() {
  const { theme } = useTheme();
  const [activeCategory, setActiveCategory] = useState('general');
  const [loading, setLoading] = useState(true);

  // State for each section
  const [general, setGeneral] = useState<GeneralSettings>({ schoolName: '', language: 'en' });
  const [academic, setAcademic] = useState<AcademicSettings>({ currentTerm: '', currentTermId: null, academicYearId: null });
  const [bankDetails, setBankDetails] = useState<BankDetails>({ bankName: '', accountName: '', accountNumber: '', sortCode: '' });
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({ emailNotifications: true, smsNotifications: false });
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({ twoFactorAuth: true, sessionTimeout: 30 });
  const [backupSettings, setBackupSettings] = useState<BackupSettings>({ autoBackup: true });
  const [templates, setTemplates] = useState<ReportCardTemplate[]>([]);
  const [promotionRules, setPromotionRules] = useState<PromotionRule[]>([]);
  const [gradingScales, setGradingScales] = useState<GradingScale[]>([]);

  // Modal states
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [editingScale, setEditingScale] = useState<GradingScale | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportCardTemplate | null>(null);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<PromotionRule | null>(null);

  // Term picker
  const [showTermPicker, setShowTermPicker] = useState(false);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loadingTerms, setLoadingTerms] = useState(false);

  // Loading states for saves
  const [saving, setSaving] = useState(false);

  // ---------- Data fetching ----------
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [
        generalRes,
        academicRes,
        bankRes,
        notificationRes,
        securityRes,
        backupRes,
        templatesRes,
        promotionRes,
        gradingRes,
      ] = await Promise.all([
        api.get('/settings/general'),
        api.get('/settings/academic'),
        api.get('/settings/bank'),
        api.get('/settings/notifications'),
        api.get('/settings/security'),
        api.get('/settings/backup'),
        api.get('/settings/templates'),
        api.get('/settings/promotion-rules'),
        api.get('/grading-scales'),
      ]);

      if (generalRes.ok) setGeneral(await generalRes.json());
      if (academicRes.ok) setAcademic(await academicRes.json());
      if (bankRes.ok) setBankDetails(await bankRes.json());
      if (notificationRes.ok) setNotificationSettings(await notificationRes.json());
      if (securityRes.ok) setSecuritySettings(await securityRes.json());
      if (backupRes.ok) setBackupSettings(await backupRes.json());
      if (templatesRes.ok) setTemplates(await templatesRes.json());
      if (promotionRes.ok) setPromotionRules(await promotionRes.json());
      if (gradingRes.ok) setGradingScales(await gradingRes.json());
    } catch (err) {
      console.error('Failed to load settings:', err);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchAcademicYears = async () => {
    setLoadingTerms(true);
    try {
      const res = await api.get('/academic-years');
      if (res.ok) {
        const data = await res.json();
        setAcademicYears(data);
      } else {
        toast.error('Failed to load academic years');
      }
    } catch (err) {
      toast.error('Failed to load terms');
    } finally {
      setLoadingTerms(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // ---------- Save handlers ----------
  const saveGeneral = async () => {
    setSaving(true);
    try {
      const res = await api.put('/settings/general', general);
      if (!res.ok) throw new Error(await res.text());
      toast.success('General settings saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const saveAcademic = async (termId?: string) => {
    const id = termId || academic.currentTermId;
    if (!id) {
      toast.error('Please select a valid term');
      return;
    }
    setSaving(true);
    try {
      const res = await api.put('/settings/academic', { currentTermId: id });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Academic settings saved');
      const academicRes = await api.get('/settings/academic');
      if (academicRes.ok) setAcademic(await academicRes.json());
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const saveBank = async () => {
    setSaving(true);
    try {
      const res = await api.put('/settings/bank', bankDetails);
      if (!res.ok) throw new Error(await res.text());
      toast.success('Bank details saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const saveNotifications = async () => {
    setSaving(true);
    try {
      const res = await api.put('/settings/notifications', notificationSettings);
      if (!res.ok) throw new Error(await res.text());
      toast.success('Notification settings saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const saveSecurity = async () => {
    setSaving(true);
    try {
      const res = await api.put('/settings/security', securitySettings);
      if (!res.ok) throw new Error(await res.text());
      toast.success('Security settings saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const saveBackup = async () => {
    setSaving(true);
    try {
      const res = await api.put('/settings/backup', backupSettings);
      if (!res.ok) throw new Error(await res.text());
      toast.success('Backup settings saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ---------- CRUD for Promotion Rules ----------
  const createPromotionRule = async (data: Omit<PromotionRule, 'id'>) => {
    try {
      const res = await api.post('/settings/promotion-rules', data);
      if (!res.ok) throw new Error(await res.text());
      const newRule = await res.json();
      setPromotionRules([...promotionRules, newRule]);
      toast.success('Promotion rule added');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add');
    }
  };

  const updatePromotionRule = async (id: string, data: Partial<PromotionRule>) => {
    try {
      const res = await api.put(`/settings/promotion-rules/${id}`, data);
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setPromotionRules(rules => rules.map(r => r.id === id ? updated : r));
      toast.success('Promotion rule updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    }
  };

  const deletePromotionRule = async (id: string) => {
    try {
      const res = await api.del(`/settings/promotion-rules/${id}`);
      if (!res.ok) throw new Error(await res.text());
      setPromotionRules(rules => rules.filter(r => r.id !== id));
      toast.success('Promotion rule deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  // ---------- CRUD for Report Card Templates ----------
  const createTemplate = async (data: Omit<ReportCardTemplate, 'id'>) => {
    try {
      const res = await api.post('/settings/templates', data);
      if (!res.ok) throw new Error(await res.text());
      const newTemplate = await res.json();
      setTemplates(prev => {
        const updated = [...prev, newTemplate];
        if (newTemplate.isDefault) {
          return updated.map(t => ({ ...t, isDefault: t.id === newTemplate.id }));
        }
        return updated;
      });
      toast.success('Template added');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add');
    }
  };

  const updateTemplate = async (id: string, data: Partial<ReportCardTemplate>) => {
    try {
      const res = await api.put(`/settings/templates/${id}`, data);
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setTemplates(prev => {
        const newList = prev.map(t => t.id === id ? updated : t);
        if (updated.isDefault) {
          return newList.map(t => ({ ...t, isDefault: t.id === id }));
        }
        return newList;
      });
      toast.success('Template updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const res = await api.del(`/settings/templates/${id}`);
      if (!res.ok) throw new Error(await res.text());
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast.success('Template deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const setDefaultTemplate = async (id: string) => {
    const template = templates.find(t => t.id === id);
    if (!template) return;
    try {
      const res = await api.put(`/settings/templates/${id}`, { isDefault: true });
      if (!res.ok) throw new Error(await res.text());
      setTemplates(prev => prev.map(t => ({ ...t, isDefault: t.id === id })));
      toast.success('Default template set');
    } catch (err: any) {
      toast.error(err.message || 'Failed to set default');
    }
  };

  // ---------- Grading Scales ----------
  const openGradingModal = (scale?: GradingScale) => {
    if (scale) {
      setEditingScale({ ...scale });
    } else {
      setEditingScale({ 
        id: Date.now().toString(), 
        minScore: null, 
        maxScore: null, 
        grade: '', 
        points: null 
      });
    }
    setShowGradingModal(true);
  };

  const saveGradingScale = () => {
    if (!editingScale) return;
    if (editingScale.grade.trim() === '') {
      toast.error('Grade letter is required');
      return;
    }
    if (editingScale.minScore === null || editingScale.minScore === undefined) {
      toast.error('Min score is required');
      return;
    }
    if (editingScale.maxScore === null || editingScale.maxScore === undefined) {
      toast.error('Max score is required');
      return;
    }
    if (editingScale.minScore >= editingScale.maxScore) {
      toast.error('Min score must be less than max score');
      return;
    }
    const exists = gradingScales.find(s => s.id === editingScale.id);
    let newScales;
    if (exists) {
      newScales = gradingScales.map(s => s.id === editingScale.id ? editingScale : s);
    } else {
      newScales = [...gradingScales, editingScale];
    }
    setGradingScales(newScales);
    setShowGradingModal(false);
    setEditingScale(null);
    toast.success('Grading scale saved');
  };

  const deleteGradingScale = (id: string) => {
    setGradingScales(scales => scales.filter(s => s.id !== id));
    toast.success('Grading scale deleted');
  };

  const openTemplateModal = (template?: ReportCardTemplate) => {
    if (template) setEditingTemplate(template);
    else setEditingTemplate({ id: Date.now().toString(), name: '', description: '', isDefault: false });
    setShowTemplateModal(true);
  };

  const saveTemplate = () => {
    if (!editingTemplate) return;
    if (!editingTemplate.name.trim()) {
      toast.error('Template name is required');
      return;
    }
    if (editingTemplate.id && templates.find(t => t.id === editingTemplate.id)) {
      updateTemplate(editingTemplate.id, editingTemplate);
    } else {
      createTemplate(editingTemplate);
    }
    setShowTemplateModal(false);
    setEditingTemplate(null);
  };

  const openPromotionModal = (rule?: PromotionRule) => {
    if (rule) {
      setEditingPromotion({ ...rule });
    } else {
      setEditingPromotion({ 
        id: Date.now().toString(), 
        fromClass: '', 
        toClass: '', 
        minAverage: null, 
        isAutomatic: true 
      });
    }
    setShowPromotionModal(true);
  };

  const savePromotionRule = () => {
    if (!editingPromotion) return;
    if (!editingPromotion.fromClass.trim() || !editingPromotion.toClass.trim()) {
      toast.error('From Class and To Class are required');
      return;
    }
    if (editingPromotion.minAverage === null || editingPromotion.minAverage === undefined) {
      toast.error('Minimum average score is required');
      return;
    }
    if (editingPromotion.id && promotionRules.find(r => r.id === editingPromotion.id)) {
      updatePromotionRule(editingPromotion.id, editingPromotion);
    } else {
      createPromotionRule(editingPromotion);
    }
    setShowPromotionModal(false);
    setEditingPromotion(null);
  };

  // ---------- Term picker ----------
  const openTermPicker = async () => {
    await fetchAcademicYears();
    setShowTermPicker(true);
  };

  const selectTerm = (termId: string, termName: string, academicYearName: string) => {
    setAcademic({
      ...academic,
      currentTermId: termId,
      currentTerm: `${termName} ${academicYearName}`,
    });
    setShowTermPicker(false);
    saveAcademic(termId);
  };

  // ---------- Render content ----------
  const renderContent = () => {
    const inputBgClass = theme === 'dark' ? 'bg-gray-800/80' : 'bg-white';
    const inputTextClass = theme === 'dark' ? 'text-white' : 'text-gray-900';
    const labelTextClass = theme === 'dark' ? 'text-gray-300' : 'text-gray-900';
    const tableBgClass = theme === 'dark' ? 'bg-gray-800/30' : 'bg-white';
    const tableHeaderBgClass = theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50';
    const tableCellTextClass = theme === 'dark' ? 'text-white' : 'text-gray-900';

    switch (activeCategory) {
      case 'general':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className={`block text-sm font-medium ${labelTextClass} mb-2`}>🏫 School Name</label>
              <input
                type="text"
                value={general.schoolName}
                onChange={(e) => setGeneral({ ...general, schoolName: e.target.value })}
                className={`w-full rounded-2xl border-0 ${inputBgClass} ${inputTextClass} px-5 py-3.5 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-blue-500 transition-all`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${labelTextClass} mb-2`}>🌐 Language</label>
              <select
                value={general.language}
                onChange={(e) => setGeneral({ ...general, language: e.target.value })}
                className={`w-full rounded-2xl border-0 ${inputBgClass} ${inputTextClass} px-5 py-3.5 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-blue-500 transition-all`}
              >
                <option value="en" className={inputTextClass}>English</option>
                <option value="fr" className={inputTextClass}>French</option>
                <option value="es" className={inputTextClass}>Spanish</option>
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                onClick={saveGeneral}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        );

      case 'academic':
        return (
          <div className="space-y-10">
            <div>
              <label className={`block text-sm font-medium ${labelTextClass} mb-2`}>📅 Current Term</label>
              <div className="flex flex-wrap items-center gap-4">
                <input
                  type="text"
                  value={academic.currentTerm}
                  readOnly
                  className={`w-full max-w-md rounded-2xl border-0 bg-gray-100 dark:bg-gray-700/50 ${inputTextClass} px-5 py-3.5 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 cursor-not-allowed`}
                />
                <button
                  onClick={openTermPicker}
                  className={`
                    inline-flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-medium shadow-sm transition
                    ${
                      theme === 'dark'
                        ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-800/30 border border-blue-700/30'
                        : 'bg-white text-blue-700 border border-blue-600 hover:bg-blue-50'
                    }
                  `}
                >
                  Change Term
                </button>
                <button
                  onClick={() => saveAcademic()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-lg font-semibold ${labelTextClass}`}>📈 Promotion Rules</h3>
                <button
                  onClick={() => openPromotionModal()}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all"
                >
                  <PlusIcon className="h-4 w-4" /> Add Rule
                </button>
              </div>
              <div className={`overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 ${tableBgClass}`}>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className={tableHeaderBgClass}>
                    <tr>
                      <th className={`px-6 py-4 text-left text-xs font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>From Class</th>
                      <th className={`px-6 py-4 text-left text-xs font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>To Class</th>
                      <th className={`px-6 py-4 text-left text-xs font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Min Avg</th>
                      <th className={`px-6 py-4 text-left text-xs font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Auto</th>
                      <th className={`px-6 py-4 text-left text-xs font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {promotionRules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-gray-50/80 dark:hover:bg-white/5 transition">
                        <td className={`px-6 py-4 text-sm font-medium ${tableCellTextClass}`}>{rule.fromClass}</td>
                        <td className={`px-6 py-4 text-sm ${tableCellTextClass}`}>{rule.toClass}</td>
                        <td className={`px-6 py-4 text-sm ${tableCellTextClass}`}>{rule.minAverage !== null ? `${rule.minAverage}%` : '-'}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${rule.isAutomatic ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                            {rule.isAutomatic ? 'Auto' : 'Manual'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm space-x-2">
                          <button onClick={() => openPromotionModal(rule)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400"><PencilIcon className="h-4 w-4" /></button>
                          <button onClick={() => deletePromotionRule(rule.id)} className="text-red-600 hover:text-red-800 dark:text-red-400"><TrashIcon className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'financial':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className={`block text-sm font-medium ${labelTextClass} mb-2`}>🏦 Bank Name</label>
              <input
                type="text"
                value={bankDetails.bankName}
                onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                className={`w-full rounded-2xl border-0 ${inputBgClass} ${inputTextClass} px-5 py-3.5 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-blue-500 transition-all`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${labelTextClass} mb-2`}>👤 Account Name</label>
              <input
                type="text"
                value={bankDetails.accountName}
                onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })}
                className={`w-full rounded-2xl border-0 ${inputBgClass} ${inputTextClass} px-5 py-3.5 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-blue-500 transition-all`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${labelTextClass} mb-2`}>🔢 Account Number</label>
              <input
                type="text"
                value={bankDetails.accountNumber}
                onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                className={`w-full rounded-2xl border-0 ${inputBgClass} ${inputTextClass} px-5 py-3.5 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-blue-500 transition-all`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${labelTextClass} mb-2`}>⚙️ Sort Code</label>
              <input
                type="text"
                value={bankDetails.sortCode}
                onChange={(e) => setBankDetails({ ...bankDetails, sortCode: e.target.value })}
                className={`w-full rounded-2xl border-0 ${inputBgClass} ${inputTextClass} px-5 py-3.5 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-blue-500 transition-all`}
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                onClick={saveBank}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        );

      case 'grading':
        return (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button onClick={() => openGradingModal()} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md"><PlusIcon className="h-4 w-4" /> Add Grade</button>
            </div>
            <div className={`overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 ${tableBgClass}`}>
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className={tableHeaderBgClass}>
                  <tr>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-500'}`}>Min</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-500'}`}>Max</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-500'}`}>Grade</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-500'}`}>Points</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-500'}`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {gradingScales.map(scale => (
                    <tr key={scale.id} className="hover:bg-gray-50/80 dark:hover:bg-white/5">
                      <td className={`px-6 py-4 ${tableCellTextClass}`}>{scale.minScore !== null ? scale.minScore : '-'}</td>
                      <td className={`px-6 py-4 ${tableCellTextClass}`}>{scale.maxScore !== null ? scale.maxScore : '-'}</td>
                      <td className={`px-6 py-4 font-bold text-blue-600 dark:text-blue-400`}>{scale.grade}</td>
                      <td className={`px-6 py-4 ${tableCellTextClass}`}>{scale.points !== null ? scale.points : '-'}</td>
                      <td className="px-6 py-4">
                        <button onClick={() => openGradingModal(scale)} className="text-blue-600 mr-3 dark:text-blue-400"><PencilIcon className="h-4 w-4" /></button>
                        <button onClick={() => deleteGradingScale(scale.id)} className="text-red-600 dark:text-red-400"><TrashIcon className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'templates':
        return (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button onClick={() => openTemplateModal()} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white"><PlusIcon className="h-4 w-4" /> Add Template</button>
            </div>
            <div className={`overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 ${tableBgClass}`}>
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className={tableHeaderBgClass}>
                  <tr>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-500'}`}>Name</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-500'}`}>Description</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-500'}`}>Default</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-500'}`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map(tpl => (
                    <tr key={tpl.id} className="hover:bg-gray-50/80 dark:hover:bg-white/5">
                      <td className={`px-6 py-4 font-medium ${tableCellTextClass}`}>{tpl.name}</td>
                      <td className={`px-6 py-4 ${tableCellTextClass}`}>{tpl.description}</td>
                      <td className="px-6 py-4">
                        {tpl.isDefault ? (
                          <CheckBadgeIcon className="h-5 w-5 text-green-500" />
                        ) : (
                          <button onClick={() => setDefaultTemplate(tpl.id)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                            Set Default
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => openTemplateModal(tpl)} className="text-blue-600 mr-3 dark:text-blue-400"><PencilIcon className="h-4 w-4" /></button>
                        <button onClick={() => deleteTemplate(tpl.id)} className="text-red-600 dark:text-red-400"><TrashIcon className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <ToggleSwitch
              label="📧 Email Notifications"
              enabled={notificationSettings.emailNotifications}
              onChange={(val: boolean) => setNotificationSettings({ ...notificationSettings, emailNotifications: val })}
              theme={theme}
            />
            <ToggleSwitch
              label="📱 SMS Notifications"
              enabled={notificationSettings.smsNotifications}
              onChange={(val: boolean) => setNotificationSettings({ ...notificationSettings, smsNotifications: val })}
              theme={theme}
            />
            <div className="flex justify-end">
              <button
                onClick={saveNotifications}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-8">
            <ToggleSwitch
              label="🔐 Two-Factor Authentication"
              enabled={securitySettings.twoFactorAuth}
              onChange={(val: boolean) => setSecuritySettings({ ...securitySettings, twoFactorAuth: val })}
              theme={theme}
            />
            <div>
              <label className={`block text-sm font-medium ${labelTextClass} mb-2`}>⏱️ Session Timeout (minutes)</label>
              <input
                type="number"
                value={securitySettings.sessionTimeout}
                onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) || 30 })}
                className={`w-36 rounded-2xl border-0 ${inputBgClass} ${inputTextClass} px-5 py-3 text-center shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-blue-500 transition-all`}
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={saveSecurity}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        );

      case 'backup':
        return (
          <div className="space-y-8">
            <ToggleSwitch
              label="💾 Automatic Daily Backup"
              enabled={backupSettings.autoBackup}
              onChange={(val: boolean) => setBackupSettings({ ...backupSettings, autoBackup: val })}
              theme={theme}
            />
            <button className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all">Backup Now</button>
            <div className="flex justify-end">
              <button
                onClick={saveBackup}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const activeCat = categories.find(c => c.id === activeCategory)!;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
      {theme === 'dark' && (
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `linear-gradient(rgba(59,130,246,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.1) 1px,transparent 1px)`, backgroundSize: '60px 60px' }} />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12 text-center lg:text-left">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300 bg-clip-text text-transparent inline-block">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">Configure your school's preferences, security, and workflows</p>
        </motion.div>

        {/* ========== TOP TABS ========== */}
        <div className="mb-8 overflow-x-auto scrollbar-hide">
          <div className={`flex gap-1 p-1 rounded-2xl shadow-lg min-w-max ${
            theme === 'dark'
              ? 'bg-gray-800/50 border border-white/10'
              : 'bg-white border border-gray-200/80'
          }`}>
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <motion.button
                  key={cat.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? `bg-gradient-to-r ${cat.gradient} text-white shadow-md`
                      : theme === 'dark'
                        ? 'text-gray-300 hover:bg-white/10'
                        : 'text-gray-700 hover:bg-gray-100/80'
                  }`}
                >
                  <cat.icon className="h-4 w-4" />
                  <span>{cat.label}</span>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse ml-1" />}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ========== CONTENT ========== */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25, type: 'spring', stiffness: 300, damping: 25 }}
            className={`relative overflow-hidden rounded-3xl shadow-2xl border ${
              theme === 'dark'
                ? 'bg-gray-900/80 backdrop-blur-md border-white/10'
                : 'bg-white border-gray-200/80'
            }`}
          >
            <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${activeCat.gradient}`} />

            <div className="px-8 pt-8 pb-4 flex items-center gap-3 border-b border-gray-200/50 dark:border-gray-700/50">
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${activeCat.gradient} shadow-md`}>
                <activeCat.icon className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300 bg-clip-text text-transparent">
                {activeCat.label}
              </h2>
            </div>

            <div className="p-8">{renderContent()}</div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ====== TERM PICKER MODAL ====== */}
      <AnimatePresence>
        {showTermPicker && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTermPicker(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-50"
            />
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className={`w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden ${
                  theme === 'dark' ? 'bg-gray-900' : 'bg-white'
                }`}
              >
                <div className={`flex justify-between items-center p-6 border-b ${
                  theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <h3 className={`text-xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Select Current Term</h3>
                  <button
                    onClick={() => setShowTermPicker(false)}
                    className={`p-1 rounded-full transition-colors ${
                      theme === 'dark'
                        ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                        : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                  {loadingTerms ? (
                    <div className="flex justify-center py-8">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : academicYears.length === 0 ? (
                    <p className={`text-center py-8 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>No academic years found.</p>
                  ) : (
                    academicYears.map((year) => (
                      <div key={year.id} className="mb-4">
                        <h4 className={`text-sm font-semibold mb-2 ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {year.name} {year.isActive && <span className="text-xs text-green-500">(Active)</span>}
                        </h4>
                        <div className="space-y-1 ml-4">
                          {year.terms.map((term) => (
                            <button
                              key={term.id}
                              onClick={() => selectTerm(term.id, term.name, year.name)}
                              className={`
                                w-full text-left px-3 py-2 rounded-lg text-sm transition-all
                                ${
                                  academic.currentTermId === term.id
                                    ? theme === 'dark'
                                      ? 'border-2 border-blue-400 bg-blue-900/30 text-blue-300'
                                      : 'border-2 border-blue-600 bg-white text-blue-700 shadow-sm'
                                    : theme === 'dark'
                                      ? 'hover:bg-gray-800 text-gray-300'
                                      : 'hover:bg-gray-100 text-gray-700 bg-gray-50'
                                }
                                ${academic.currentTermId === term.id ? 'font-medium' : ''}
                              `}
                            >
                              {term.name} {term.order !== undefined && `(Order ${term.order})`}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ====== MODALS ====== */}
      <AnimatePresence>
        {showGradingModal && editingScale && (
          <Modal onClose={() => setShowGradingModal(false)} title="Grading Scale Entry" theme={theme}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Min Score</label>
                  <input
                    type="number"
                    value={editingScale.minScore !== null ? editingScale.minScore : ''}
                    onChange={(e) => setEditingScale({ ...editingScale, minScore: e.target.value === '' ? null : parseInt(e.target.value) || 0 })}
                    placeholder="-"
                    className={`mt-1 w-full rounded-xl border ${theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Max Score</label>
                  <input
                    type="number"
                    value={editingScale.maxScore !== null ? editingScale.maxScore : ''}
                    onChange={(e) => setEditingScale({ ...editingScale, maxScore: e.target.value === '' ? null : parseInt(e.target.value) || 0 })}
                    placeholder="-"
                    className={`mt-1 w-full rounded-xl border ${theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none`}
                  />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Grade</label>
                <input
                  type="text"
                  value={editingScale.grade}
                  onChange={(e) => setEditingScale({ ...editingScale, grade: e.target.value.toUpperCase() })}
                  className={`mt-1 w-full rounded-xl border ${theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Points (optional)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editingScale.points !== null ? editingScale.points : ''}
                  onChange={(e) => setEditingScale({ ...editingScale, points: e.target.value === '' ? null : parseFloat(e.target.value) || 0 })}
                  placeholder="-"
                  className={`mt-1 w-full rounded-xl border ${theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none`}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowGradingModal(false)} className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>Cancel</button>
                <button onClick={saveGradingScale} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Save</button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTemplateModal && editingTemplate && (
          <Modal onClose={() => setShowTemplateModal(false)} title="Report Card Template" theme={theme}>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Name</label>
                <input
                  type="text"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  className={`mt-1 w-full rounded-xl border ${theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Description</label>
                <textarea
                  rows={3}
                  value={editingTemplate.description || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  className={`mt-1 w-full rounded-xl border ${theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none`}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingTemplate.isDefault}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, isDefault: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Set as default template</label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowTemplateModal(false)} className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>Cancel</button>
                <button onClick={saveTemplate} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Save</button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPromotionModal && editingPromotion && (
          <Modal onClose={() => setShowPromotionModal(false)} title="Promotion Rule" theme={theme}>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>From Class</label>
                <input
                  type="text"
                  value={editingPromotion.fromClass}
                  onChange={(e) => setEditingPromotion({ ...editingPromotion, fromClass: e.target.value })}
                  className={`mt-1 w-full rounded-xl border ${theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>To Class</label>
                <input
                  type="text"
                  value={editingPromotion.toClass}
                  onChange={(e) => setEditingPromotion({ ...editingPromotion, toClass: e.target.value })}
                  className={`mt-1 w-full rounded-xl border ${theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Minimum Average Score (%)</label>
                <input
                  type="number"
                  value={editingPromotion.minAverage !== null ? editingPromotion.minAverage : ''}
                  onChange={(e) => setEditingPromotion({ ...editingPromotion, minAverage: e.target.value === '' ? null : parseInt(e.target.value) || 0 })}
                  placeholder="-"
                  className={`mt-1 w-full rounded-xl border ${theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none`}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingPromotion.isAutomatic}
                  onChange={(e) => setEditingPromotion({ ...editingPromotion, isAutomatic: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Automatic promotion</label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowPromotionModal(false)} className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>Cancel</button>
                <button onClick={savePromotionRule} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Save</button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper Components
const ToggleSwitch = ({ label, enabled, onChange, theme }: any) => {
  const bgClass = theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300';
  return (
    <div className={`flex items-center justify-between p-4 rounded-2xl ${theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-100'} border border-gray-200/50 dark:border-gray-700/50`}>
      <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{label}</span>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ${enabled ? 'bg-blue-600' : bgClass}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
    </div>
  );
};

const Modal = ({ children, onClose, title, theme }: any) => (
  <>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-md z-50" />
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
        <div className={`flex justify-between items-center p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
          <button onClick={onClose} className={`p-1 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}>
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </div>
  </>
);