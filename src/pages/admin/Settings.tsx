import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import toast from 'react-hot-toast';
import { api } from '../../utils/api';
import { unwrapRes } from '../../hooks/queryHelpers';
import {
  BellIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  AcademicCapIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  XMarkIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';

// Types
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
  { id: 'id-generator', label: 'ID Generator', icon: CheckBadgeIcon, gradient: 'from-fuchsia-500 to-purple-400', bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/20' },
  { id: 'academic', label: 'Academic', icon: AcademicCapIcon, gradient: 'from-purple-500 to-pink-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  { id: 'financial', label: 'Financial', icon: CurrencyDollarIcon, gradient: 'from-green-500 to-emerald-400', bg: 'bg-green-50 dark:bg-green-900/20' },
  { id: 'templates', label: 'Report Cards', icon: DocumentTextIcon, gradient: 'from-indigo-500 to-blue-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  { id: 'notifications', label: 'Notifications', icon: BellIcon, gradient: 'from-pink-500 to-rose-400', bg: 'bg-pink-50 dark:bg-pink-900/20' },
  { id: 'security', label: 'Security', icon: ShieldCheckIcon, gradient: 'from-red-500 to-orange-400', bg: 'bg-red-50 dark:bg-red-900/20' },
  { id: 'backup', label: 'Backup', icon: ArrowPathIcon, gradient: 'from-teal-500 to-cyan-400', bg: 'bg-teal-50 dark:bg-teal-900/20' },
];

interface IdGeneratorConfig {
  id: string;
  role: string;
  format: string;
  counter: number;
  lastResetYear?: number | null;
}

const ID_ROLES = ['STUDENT', 'TEACHER', 'PARENT', 'ADMIN', 'PRINCIPAL', 'BURSAR', 'ACCOUNTANT', 'LIBRARIAN'];
const DEFAULT_ID_FORMATS: Record<string, string> = {
  STUDENT: 'STU-{YEAR}-{####}',
  TEACHER: 'TCH-{###}',
  PARENT: 'PAR-{###}',
  ADMIN: 'ADM-{###}',
  PRINCIPAL: 'PRN-{###}',
  BURSAR: 'BUR-{###}',
  ACCOUNTANT: 'ACC-{###}',
  LIBRARIAN: 'LIB-{###}',
};
/** Client-side mirror of the backend renderId() for live preview. */
const renderIdPreview = (format: string, counter: number, role: string) =>
  format
    .replace(/\{(#+)\}/g, (_m, h: string) => String(counter).padStart(h.length, '0'))
    .replace(/\{YEAR\}/g, String(new Date().getFullYear()))
    .replace(/\{ROLE\}/g, role);

export default function AdminSettings() {
  const { theme } = useTheme();
  const [activeCategory, setActiveCategory] = useState('general');
  // Mobile app-style navigation: 'menu' shows the category launcher grid,
  // 'detail' shows the selected category's content with a back button.
  const [mobileView, setMobileView] = useState<'menu' | 'detail'>('menu');
  const selectCategory = (id: string) => {
    setActiveCategory(id);
    setMobileView('detail');
  };
  // Scroll back to top when entering a category on mobile
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [mobileView, activeCategory]);

  // State for each section
  const [general, setGeneral] = useState<GeneralSettings>({ schoolName: '', language: 'en' });
  const [academic, setAcademic] = useState<AcademicSettings>({ currentTerm: '', currentTermId: null, academicYearId: null });
  const [bankDetails, setBankDetails] = useState<BankDetails>({ bankName: '', accountName: '', accountNumber: '', sortCode: '' });
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({ emailNotifications: true, smsNotifications: false });
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({ twoFactorAuth: true, sessionTimeout: 30 });
  const [backupSettings, setBackupSettings] = useState<BackupSettings>({ autoBackup: true });
  const [templates, setTemplates] = useState<ReportCardTemplate[]>([]);
  const [promotionRules, setPromotionRules] = useState<PromotionRule[]>([]);

  // ID Generator state
  const [idConfigs, setIdConfigs] = useState<IdGeneratorConfig[]>([]);
  const [idDrafts, setIdDrafts] = useState<Record<string, { format: string }>>({});

  // Modal states
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportCardTemplate | null>(null);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<PromotionRule | null>(null);

  // Term picker
  const [showTermPicker, setShowTermPicker] = useState(false);

  // Loading states for saves
  const [saving, setSaving] = useState(false);

  // ---------- Data fetching (cached queries) ----------
  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const [
        generalRes,
        academicRes,
        bankRes,
        notificationRes,
        securityRes,
        backupRes,
        templatesRes,
        promotionRes,
        idGenRes,
      ] = await Promise.all([
        api.get('/settings/general'),
        api.get('/settings/academic'),
        api.get('/settings/bank'),
        api.get('/settings/notifications'),
        api.get('/settings/security'),
        api.get('/settings/backup'),
        api.get('/settings/templates'),
        api.get('/settings/promotion-rules'),
        api.get('/settings/id-generator'),
      ]);

      const load = async <T,>(res: Response, fallback: T): Promise<T> =>
        res.ok ? ((await res.json()) as T) : fallback;

      return {
        general: await load<GeneralSettings>(generalRes, { schoolName: '', language: 'en' }),
        academic: await load<AcademicSettings>(academicRes, { currentTerm: '', currentTermId: null, academicYearId: null }),
        bankDetails: await load<BankDetails>(bankRes, { bankName: '', accountName: '', accountNumber: '', sortCode: '' }),
        notificationSettings: await load<NotificationSettings>(notificationRes, { emailNotifications: true, smsNotifications: false }),
        securitySettings: await load<SecuritySettings>(securityRes, { twoFactorAuth: true, sessionTimeout: 30 }),
        backupSettings: await load<BackupSettings>(backupRes, { autoBackup: true }),
        templates: await load<ReportCardTemplate[]>(templatesRes, []),
        promotionRules: await load<PromotionRule[]>(promotionRes, []),
        idConfigs: await load<IdGeneratorConfig[]>(idGenRes, []),
      };
    },
  });

  const yearsQuery = useQuery<AcademicYear[]>({
    queryKey: ['academic-years'],
    queryFn: () => unwrapRes<AcademicYear[]>(api.get('/academic-years')),
    enabled: false, // fetched lazily when the term picker opens
  });

  // Sync query data into local editable state
  useEffect(() => {
    const d = settingsQuery.data;
    if (!d) return;
    setGeneral(d.general);
    setAcademic(d.academic);
    setBankDetails(d.bankDetails);
    setNotificationSettings(d.notificationSettings);
    setSecuritySettings(d.securitySettings);
    setBackupSettings(d.backupSettings);
    setTemplates(d.templates);
    setPromotionRules(d.promotionRules);
    setIdConfigs(d.idConfigs);
    // Seed drafts: saved format, else the default format for the role.
    setIdDrafts(Object.fromEntries(
      ID_ROLES.map(role => {
        const saved = d.idConfigs.find(c => c.role === role);
        return [role, { format: saved?.format ?? DEFAULT_ID_FORMATS[role] }];
      })
    ));
  }, [settingsQuery.data]);

  useEffect(() => {
    if (settingsQuery.error) {
      console.error('Failed to load settings:', settingsQuery.error);
      toast.error('Failed to load settings');
    }
  }, [settingsQuery.error]);

  const loading = settingsQuery.isLoading;
  const academicYears = yearsQuery.data ?? [];
  const loadingTerms = yearsQuery.isFetching;

  const fetchAcademicYears = async () => {
    if (yearsQuery.dataUpdatedAt === 0) await yearsQuery.refetch();
    else yearsQuery.refetch();
  };

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

  // ---------- ID Generator handlers ----------
  const saveIdConfig = async (role: string) => {
    const draft = idDrafts[role];
    if (!draft?.format.trim()) {
      toast.error('Format is required');
      return;
    }
    setSaving(true);
    try {
      const res = await api.put('/settings/id-generator', { role, format: draft.format.trim() });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error((data as any)?.error || await res.text() || 'Failed to save');
      }
      const saved = await res.json();
      setIdConfigs(prev => {
        const others = prev.filter(c => c.role !== role);
        return [...others, saved];
      });
      toast.success(`${role} ID format saved`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const resetIdCounter = async (role: string) => {
    setSaving(true);
    try {
      const res = await api.put('/settings/id-generator', { role, format: idDrafts[role]?.format || DEFAULT_ID_FORMATS[role], resetCounter: true });
      if (!res.ok) throw new Error('Failed to reset counter');
      const saved = await res.json();
      setIdConfigs(prev => {
        const others = prev.filter(c => c.role !== role);
        return [...others, saved];
      });
      toast.success(`${role} counter reset to 0`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset');
    } finally {
      setSaving(false);
    }
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

      case 'id-generator':
        return (
          <div className="space-y-6">
            <div className={`rounded-2xl p-4 text-sm ${theme === 'dark' ? 'bg-fuchsia-900/20 text-fuchsia-200' : 'bg-fuchsia-50 text-fuchsia-800'}`}>
              Configure how IDs are auto-generated for each role. Tokens: <code className="font-mono font-semibold">{'{####}'}</code> = zero-padded counter, <code className="font-mono font-semibold">{'{YEAR}'}</code> = current year, <code className="font-mono font-semibold">{'{ROLE}'}</code> = role name. Formats with <code className="font-mono">{'{YEAR}'}</code> reset their counter each year automatically.
            </div>
            {ID_ROLES.map(role => {
              const saved = idConfigs.find(c => c.role === role);
              const draft = idDrafts[role]?.format ?? DEFAULT_ID_FORMATS[role];
              const preview = renderIdPreview(draft, (saved?.counter ?? 0) + 1, role);
              return (
                <div key={role} className={`rounded-2xl border p-4 ${theme === 'dark' ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-gray-50/60'}`}>
                  <div className="flex flex-col md:flex-row md:items-end gap-3">
                    <div className="md:w-40">
                      <label className={`block text-sm font-medium ${labelTextClass} mb-2`}>{role}</label>
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        Counter: <strong>{saved?.counter ?? 0}</strong>{saved ? '' : ' (default format)'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={draft}
                        onChange={(e) => setIdDrafts(prev => ({ ...prev, [role]: { format: e.target.value } }))}
                        className={`w-full rounded-2xl border-0 ${inputBgClass} ${inputTextClass} px-5 py-3 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-blue-500 transition-all font-mono`}
                      />
                    </div>
                    <div className="md:w-56">
                      <span className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Next ID preview</span>
                      <span className="inline-block rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 px-4 py-2.5 text-sm font-mono font-semibold text-white shadow-md">
                        {preview}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveIdConfig(role)}
                        disabled={saving}
                        className="inline-flex items-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                      >
                        Save
                      </button>
                      {saved && (
                        <button
                          onClick={() => resetIdCounter(role)}
                          disabled={saving}
                          className={`inline-flex items-center rounded-2xl px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50 ${
                            theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Reset counter
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
              <div className={`hidden md:block overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 ${tableBgClass}`}>
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
              {/* Mobile: card list */}
              <div className="md:hidden space-y-3">
                {promotionRules.map((rule) => (
                  <div key={rule.id} className={`rounded-2xl border p-4 ${tableBgClass} border-gray-200 dark:border-gray-700`}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`text-sm font-semibold ${tableCellTextClass}`}>{rule.fromClass} → {rule.toClass}</span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${rule.isAutomatic ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {rule.isAutomatic ? 'Auto' : 'Manual'}
                      </span>
                    </div>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      Minimum average: {rule.minAverage !== null ? `${rule.minAverage}%` : '-'}
                    </p>
                    <div className="flex justify-end gap-3 mt-3 pt-3 border-t border-gray-200/60 dark:border-gray-700/60">
                      <button onClick={() => openPromotionModal(rule)} className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400"><PencilIcon className="h-4 w-4" /> Edit</button>
                      <button onClick={() => deletePromotionRule(rule.id)} className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400"><TrashIcon className="h-4 w-4" /> Delete</button>
                    </div>
                  </div>
                ))}
                {promotionRules.length === 0 && (
                  <p className={`text-center py-6 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No promotion rules yet.</p>
                )}
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

      case 'templates':
        return (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button onClick={() => openTemplateModal()} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white"><PlusIcon className="h-4 w-4" /> Add Template</button>
            </div>
            <div className={`hidden md:block overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 ${tableBgClass}`}>
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
            {/* Mobile: card list */}
            <div className="md:hidden space-y-3">
              {templates.map(tpl => (
                <div key={tpl.id} className={`rounded-2xl border p-4 ${tableBgClass} border-gray-200 dark:border-gray-700`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-semibold ${tableCellTextClass}`}>{tpl.name}</span>
                    {tpl.isDefault ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-2.5 py-1 text-xs font-medium"><CheckBadgeIcon className="h-3.5 w-3.5" /> Default</span>
                    ) : (
                      <button onClick={() => setDefaultTemplate(tpl.id)} className="text-xs text-blue-600 dark:text-blue-400 font-medium">Set Default</button>
                    )}
                  </div>
                  {tpl.description && (
                    <p className={`text-xs mt-1.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{tpl.description}</p>
                  )}
                  <div className="flex justify-end gap-3 mt-3 pt-3 border-t border-gray-200/60 dark:border-gray-700/60">
                    <button onClick={() => openTemplateModal(tpl)} className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400"><PencilIcon className="h-4 w-4" /> Edit</button>
                    <button onClick={() => deleteTemplate(tpl.id)} className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400"><TrashIcon className="h-4 w-4" /> Delete</button>
                  </div>
                </div>
              ))}
              {templates.length === 0 && (
                <p className={`text-center py-6 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No templates yet.</p>
              )}
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

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 sm:mb-12 text-center lg:text-left ${
            mobileView === 'detail' ? 'hidden md:block' : ''
          }`}
        >
          <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300 bg-clip-text text-transparent inline-block">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-base sm:text-lg">Configure your school's preferences, security, and workflows</p>
        </motion.div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* ========== DESKTOP SIDEBAR NAV ========== */}
          <aside className="hidden md:block w-64 shrink-0">
            <div
              className={`sticky top-6 rounded-3xl border p-3 space-y-1 shadow-lg ${
                theme === 'dark'
                  ? 'bg-gray-800/50 border border-white/10'
                  : 'bg-white border border-gray-200/80'
              }`}
            >
              {categories.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? `bg-gradient-to-r ${cat.gradient} text-white shadow-md`
                        : theme === 'dark'
                          ? 'text-gray-300 hover:bg-white/10'
                          : 'text-gray-700 hover:bg-gray-100/80'
                    }`}
                  >
                    <span
                      className={`p-1.5 rounded-lg ${
                        isActive
                          ? 'bg-white/20'
                          : `bg-gradient-to-br ${cat.gradient} bg-clip-text`
                      }`}
                    >
                      <cat.icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                    </span>
                    <span>{cat.label}</span>
                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />}
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {/* ========== MOBILE LAUNCHER GRID (app-style home) ========== */}
            {mobileView === 'menu' && (
              <div className="md:hidden">
                <div className="grid grid-cols-2 gap-3">
                  {categories.map((cat, i) => (
                    <motion.button
                      key={cat.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => selectCategory(cat.id)}
                      className={`flex flex-col items-start gap-3 p-4 rounded-3xl border text-left shadow-sm transition-colors ${
                        theme === 'dark'
                          ? 'bg-gray-900/80 border-white/10 active:bg-white/10'
                          : 'bg-white border-gray-200/80 active:bg-gray-50'
                      }`}
                    >
                      <span className={`p-2.5 rounded-2xl bg-gradient-to-br ${cat.gradient} shadow-md`}>
                        <cat.icon className="h-5 w-5 text-white" />
                      </span>
                      <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>{cat.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* ========== MOBILE DETAIL HEADER (app-style app bar) ========== */}
            {mobileView === 'detail' && (
              <div className="md:hidden sticky top-0 z-20 -mx-4 px-4 py-3 mb-4 flex items-center gap-3 backdrop-blur-xl bg-gradient-to-b from-white/95 to-white/85 dark:from-[#0B1120]/95 dark:to-[#0B1120]/85 border-b border-gray-200/60 dark:border-white/10">
                <button
                  onClick={() => setMobileView('menu')}
                  className={`p-2 -ml-1 rounded-full transition-colors ${
                    theme === 'dark' ? 'hover:bg-white/10 text-gray-200' : 'hover:bg-gray-100 text-gray-700'
                  }`}
                  aria-label="Back to settings menu"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <div className={`p-2 rounded-xl bg-gradient-to-br ${activeCat.gradient} shadow-md`}>
                  <activeCat.icon className="h-5 w-5 text-white" />
                </div>
                <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{activeCat.label}</h2>
              </div>
            )}

            {/* ========== CONTENT ========== */}
            <div className={mobileView === 'menu' ? 'hidden md:block' : ''}>
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

                <div className="hidden md:flex px-8 pt-8 pb-4 items-center gap-3 border-b border-gray-200/50 dark:border-gray-700/50">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${activeCat.gradient} shadow-md`}>
                    <activeCat.icon className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300 bg-clip-text text-transparent">
                    {activeCat.label}
                  </h2>
                </div>

                <div className="p-4 sm:p-8">{renderContent()}</div>
              </motion.div>
            </AnimatePresence>
            </div>
          </div>
        </div>
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