import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { effectivePrivileges } from '../utils/privileges';
import { api } from '../utils/api';
import { getUnreadNotificationCount } from '../data/notifications';
import { useTimetableWorkflowAttention, AttentionBadge } from '../hooks/useTimetableWorkflowAttention';
import ViewControls from '../components/ViewControls';
import LogoutConfirmModal from '../components/LogoutConfirmModal';
import toast from 'react-hot-toast';
import {
  FolderIcon,
  FolderOpenIcon,
  HomeIcon,
  AcademicCapIcon,
  BookOpenIcon,
  ChartBarIcon,
  DocumentChartBarIcon,
  ClipboardDocumentListIcon,
  CalendarIcon,
  CogIcon,
  QuestionMarkCircleIcon,
  ArrowLeftOnRectangleIcon,
  SunIcon,
  MoonIcon,
  BellIcon,
  UserCircleIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ChevronDownIcon,
  XMarkIcon,
  UserGroupIcon,
  UserIcon,
  MagnifyingGlassIcon,
  BanknotesIcon,
  ReceiptPercentIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ChatBubbleLeftIcon,
  CubeIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

// ---------- Teacher Categories ----------
// `privilege` links a nav item to a page privilege key granted by the admin.
// `anyRole` requires the user to hold one of the listed system roles.
// Items with neither are always visible.
const categories: { name: string; items: { name: string; href: string; icon: typeof HomeIcon; privilege?: string; anyRole?: string[] }[] }[] = [
  {
    name: 'Dashboard',
    items: [{ name: 'Overview', href: '/teacher', icon: HomeIcon }],
  },
  {
    name: 'Academic',
    items: [
      { name: 'My Classes', href: '/teacher/classes', icon: AcademicCapIcon, privilege: 'classes' },
      { name: 'My Subjects', href: '/teacher/subjects', icon: BookOpenIcon, privilege: 'subjects' },
      { name: 'Students', href: '/teacher/students', icon: UserGroupIcon, privilege: 'students' },
      { name: 'Results', href: '/teacher/results', icon: ChartBarIcon, privilege: 'results' },
      { name: 'Reports', href: '/teacher/reports', icon: DocumentChartBarIcon, privilege: 'reports' },
      { name: 'Assessment Format', href: '/teacher/assessment-format', icon: ClipboardDocumentListIcon, privilege: 'assessment-format' },
      { name: 'Lesson Plan', href: '/teacher/lesson-plan', icon: ClipboardDocumentListIcon, privilege: 'lesson-plan' },
      { name: 'Timetable', href: '/teacher/timetable', icon: CalendarIcon, privilege: 'timetable' },
      { name: 'Broadsheet', href: '/teacher/broadsheet', icon: ChartBarIcon, privilege: 'broadsheet' },
      { name: 'CBT', href: '/teacher/cbt', icon: AcademicCapIcon, privilege: 'cbt' },
      { name: 'Exam Questions', href: '/teacher/questions', icon: DocumentTextIcon, anyRole: ['TEACHER', 'ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL'] },
    ],
  },
  {
    name: 'Administration',
    // Admin-side pages (no teacher equivalent). Each is only visible when the
    // corresponding privilege has been granted to the user by an admin.
    items: [
      { name: 'Fees', href: '/admin/fees', icon: BanknotesIcon, privilege: 'fees' },
      { name: 'Expenses & Budgeting', href: '/admin/expenses', icon: ReceiptPercentIcon, privilege: 'expenses' },
      { name: 'Payroll', href: '/admin/payroll', icon: CurrencyDollarIcon, privilege: 'payroll' },
      { name: 'Staff', href: '/admin/staff', icon: UserIcon, privilege: 'staff' },
      { name: 'Teachers', href: '/admin/teachers', icon: UserIcon, privilege: 'teachers' },
      { name: 'Parents', href: '/admin/parent', icon: UserGroupIcon, privilege: 'parents' },
      { name: 'Messaging', href: '/admin/messaging', icon: ChatBubbleLeftIcon, privilege: 'messaging' },
      { name: 'User Management', href: '/admin/users', icon: UsersIcon, privilege: 'users' },
      { name: 'Roles & Privileges', href: '/admin/roles', icon: UsersIcon, privilege: 'roles' },
      { name: 'Inventory', href: '/admin/inventory', icon: CubeIcon, privilege: 'inventory' },
      { name: 'Academic Setup', href: '/admin/academic', icon: CogIcon, privilege: 'academic' },
    ],
  },
  {
    name: 'System',
    items: [
      { name: 'Help', href: '/teacher/help', icon: QuestionMarkCircleIcon },
    ],
  },
];

const allNavItems = categories.flatMap(cat => cat.items);

/**
 * Pick a font-size class based on the length of the school name so long
 * names shrink instead of overflowing the top bar.
 */
function getSchoolNameTextClass(name: string): string {
  const len = name.trim().length;
  if (len <= 20) return 'text-xl';
  if (len <= 30) return 'text-lg';
  if (len <= 45) return 'text-base';
  return 'text-sm';
}

export default function TeacherLayout() {
  const { user, logout, token } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const unreadCount = getUnreadNotificationCount();
  const navigate = useNavigate();
  const location = useLocation();

  // ---------- Sidebar states ----------
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHoverExpanded, setIsHoverExpanded] = useState(false);
  // Temporary collapse while hovering the school name in the top bar.
  // Never touches isCollapsed, so the sidebar restores its former state on leave.
  // Debounced timers avoid flicker from quick mouse pass-overs.
  const [tempCollapsedBySchoolName, setTempCollapsedBySchoolName] = useState(false);
  const nameFoldTimers = useRef<{ fold?: ReturnType<typeof setTimeout>; restore?: ReturnType<typeof setTimeout> }>({});

  const handleSchoolNameEnter = () => {
    clearTimeout(nameFoldTimers.current.restore);
    nameFoldTimers.current.fold = setTimeout(() => {
      setTempCollapsedBySchoolName(true);
      setIsHoverExpanded(false);
    }, 500);
  };

  const handleSchoolNameLeave = () => {
    clearTimeout(nameFoldTimers.current.fold);
    nameFoldTimers.current.restore = setTimeout(() => {
      setTempCollapsedBySchoolName(false);
    }, 400);
  };
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    categories.reduce((acc, cat) => ({ ...acc, [cat.name]: true }), {})
  );
  // Mobile drawer: only one category folder open at a time
  const [openMobileCategory, setOpenMobileCategory] = useState<string | null>(null);

  // ---------- Top bar info states ----------
  // ---------- Top bar info (cached query) ----------
  const { data: topBar } = useQuery({
    queryKey: ['topbar-info'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [generalRes, academicRes] = await Promise.all([
        api.get('/settings/general'),
        api.get('/settings/academic'),
      ]);
      const general = generalRes.ok ? await generalRes.json() : {};
      const academic = academicRes.ok ? await academicRes.json() : {};
      return {
        schoolName: (general.schoolName as string) || '',
        currentTerm: (academic.currentTerm as string) || '',
      };
    },
  });
  const schoolName = topBar?.schoolName ?? '';
  const currentTerm = topBar?.currentTerm ?? '';
  // ---------- Teacher profile (cached query) ----------
  const teacherProfileQuery = useQuery({
    queryKey: ['teacher-profile', token, user?.id],
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const profileRes = await api.get('/teachers/me', token!);
      if (profileRes.ok) {
        const data = await profileRes.json();
        return data;
      }
      if (profileRes.status === 404) {
        toast.error('Teacher profile not found. Please contact your administrator.', { duration: 5000 });
        return {
          id: user?.id || 'unknown',
          name: user?.name || 'Teacher',
          arms: [],
          subjectArms: [],
          __profileError: 'Teacher profile not found. Please contact your administrator.',
        };
      }
      const errorData = await profileRes.json().catch(() => ({}));
      throw new Error(errorData?.message || 'Failed to load teacher profile');
    },
  });

  useEffect(() => {
    if (teacherProfileQuery.error) {
      const msg =
        teacherProfileQuery.error instanceof Error
          ? teacherProfileQuery.error.message
          : 'Network error while loading teacher profile';
      toast.error(msg.includes('profile') ? msg : 'Could not load teacher profile. Please check your connection.');
    }
  }, [teacherProfileQuery.error]);

  const teacherProfile = teacherProfileQuery.data ?? null;
  const profileError =
    teacherProfile?.__profileError ??
    (teacherProfileQuery.error ? 'Failed to load teacher profile' : null);

  // ---------- Search states ----------
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof allNavItems>([]);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // ---------- Privileged navigation (based on roles + privileges) ----------
  const allowedCategories = (() => {
    const userRoles = [...(user?.roles || []), user?.role].filter(Boolean) as string[];
    const privileges = effectivePrivileges({
      roles: userRoles,
      privileges: user?.privileges,
      allowedPages: user?.allowedPages,
    });
    return categories
      .map(cat => ({
        ...cat,
        items: cat.items.filter(
          item =>
            (!item.privilege || privileges.includes(item.privilege)) &&
            (!item.anyRole || item.anyRole.some((r: string) => userRoles.includes(r)))
        ),
      }))
      .filter(cat => cat.items.length > 0);
  })();
  const allowedNavItems = allowedCategories.flatMap(cat => cat.items);

  // Red badge on the Timetable nav item when the workflow needs this teacher.
  const { attention: timetableAttention } = useTimetableWorkflowAttention('teacher');
  const isTimetableItem = (href: string) => href.endsWith('/timetable');
  // A category folder shows the badge when ANY of its items needs attention.
  const categoryNeedsAttention = (categoryName: string) =>
    timetableAttention &&
    allowedCategories
      .find((c) => c.name === categoryName)
      ?.items.some((i) => isTimetableItem(i.href)) === true;
  const [, setShowSearchDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // ---------- Helper to check active link ----------
  const isActiveLink = (href: string) => {
    if (href === '/teacher') return location.pathname === '/teacher';
    if (href === '/teacher/dashboard') return location.pathname === '/teacher' || location.pathname === '/teacher/';
    return location.pathname.startsWith(href);
  };

  // ---------- Search logic ----------
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    const queryLower = searchQuery.toLowerCase();
    const filtered = allowedNavItems.filter(item =>
      item.name.toLowerCase().includes(queryLower)
    );
    setSearchResults(filtered);
    setShowSearchDropdown(filtered.length > 0);
    setSelectedIndex(-1);
  }, [searchQuery]);

  const closeSearchModal = () => {
    setSearchModalOpen(false);
    setSearchQuery('');
    setSelectedIndex(-1);
  };

  const handleModalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, searchResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + searchResults.length) % Math.max(1, searchResults.length));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const selected = searchResults[selectedIndex];
      if (selected) {
        navigate(selected.href);
        closeSearchModal();
      }
    } else if (e.key === 'Escape') {
      closeSearchModal();
    }
  };

  const handleResultClick = (href: string) => {
    navigate(href);
    closeSearchModal();
  };

  // ---------- Handlers ----------
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setIsCollapsed(prev => !prev);
    setIsHoverExpanded(false);
  };

  const toggleCategory = (categoryName: string) => {
    setOpenCategories(prev => ({ ...prev, [categoryName]: !prev[categoryName] }));
  };

  // ---------- Body scroll lock for mobile sidebar ----------
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [sidebarOpen]);

  // ---------- Effective collapsed state ----------
  const effectiveIsCollapsed =
    (isCollapsed || tempCollapsedBySchoolName) && !isHoverExpanded;

  // ---------- Handlers ----------
  // ---------- Render ----------
  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
    }`}>
      {/* ====== Desktop Sidebar ====== */}
      <div
        className={`hidden md:fixed md:inset-y-0 md:left-0 md:flex md:flex-col z-20 transition-all duration-300 ${
          effectiveIsCollapsed ? 'md:w-20' : 'md:w-72'
        }`}
        onMouseEnter={() => {
          if (isCollapsed) setIsHoverExpanded(true);
        }}
        onMouseLeave={() => {
          setIsHoverExpanded(false);
        }}
      >
        <div className={`relative flex flex-grow flex-col overflow-y-auto overflow-x-hidden border-r pt-5 shadow-2xl transition-all duration-300 ${
          theme === 'dark'
            ? 'bg-white/5 backdrop-blur-xl border-white/10'
            : 'bg-white/30 backdrop-blur-md border-white/20'
        }`}>
          {/* Logo */}
          <div className={`flex flex-shrink-0 items-center ${effectiveIsCollapsed ? 'justify-center px-2' : 'px-6'}`}>
            {effectiveIsCollapsed ? (
              <span className={`text-xl font-bold ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent'
              }`}>SE</span>
            ) : (
              <>
                <h1 className={`text-xl font-bold ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent'
                }`}>
                  SmartEdufy
                </h1>
                <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full border ${
                  theme === 'dark'
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                    : 'bg-white/40 text-blue-800 border-white/30 backdrop-blur-sm'
                }`}>
                  Teacher
                </span>
              </>
            )}
          </div>

          {/* Navigation */}
          <div className="mt-8 flex flex-grow flex-col">
            <nav className="flex-1 space-y-2 px-2">
              {effectiveIsCollapsed ? (
                allowedCategories.flatMap(category => category.items).map((item) => {
                  const active = isActiveLink(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`group flex items-center justify-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                        active
                          ? theme === 'dark'
                            ? 'bg-gradient-to-r from-blue-500/30 to-indigo-500/30 shadow-lg shadow-blue-500/20 text-white'
                            : 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 shadow-md shadow-blue-500/10 text-blue-900'
                          : theme === 'dark'
                            ? 'text-gray-300 hover:text-white hover:bg-white/10'
                            : 'text-gray-700 hover:text-blue-900 hover:bg-white/40'
                      }`}
                      title={item.name}
                    >
                      <item.icon className={`h-5 w-5 transition-colors ${
                        active
                          ? 'text-blue-400'
                          : theme === 'dark'
                            ? 'text-gray-500 group-hover:text-blue-400'
                            : 'text-gray-500 group-hover:text-blue-600'
                      }`} />
                      {isTimetableItem(item.href) && <AttentionBadge show={timetableAttention} />}
                    </Link>
                  );
                })
              ) : (
                allowedCategories.map((category) => (
                  <div key={category.name} className="space-y-1">
                    <button
                      onClick={() => toggleCategory(category.name)}
                      className={`w-full flex items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors ${
                        theme === 'dark'
                          ? 'text-gray-400 hover:text-white hover:bg-white/5'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-black/5'
                      }`}
                    >
                      <span>{category.name}</span>
                      <AttentionBadge show={categoryNeedsAttention(category.name)} compact />
                      <ChevronDownIcon
                        className={`h-4 w-4 transition-transform duration-200 ${
                          openCategories[category.name] ? 'rotate-0' : '-rotate-90'
                        }`}
                      />
                    </button>
                    {openCategories[category.name] && (
                      <div className="space-y-1 pl-2">
                        {category.items.map((item) => {
                          const active = isActiveLink(item.href);
                          return (
                            <Link
                              key={item.name}
                              to={item.href}
                              className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                                active
                                  ? theme === 'dark'
                                    ? 'bg-gradient-to-r from-blue-500/30 to-indigo-500/30 shadow-lg shadow-blue-500/20 text-white'
                                    : 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 shadow-md shadow-blue-500/10 text-blue-900'
                                  : theme === 'dark'
                                    ? 'text-gray-300 hover:text-white hover:bg-white/10'
                                    : 'text-gray-700 hover:text-blue-900 hover:bg-white/40'
                              }`}
                            >
                              <item.icon className={`mr-3 h-5 w-5 transition-colors ${
                                active
                                  ? 'text-blue-400'
                                  : theme === 'dark'
                                    ? 'text-gray-500 group-hover:text-blue-400'
                                    : 'text-gray-500 group-hover:text-blue-600'
                              }`} />
                              {item.name}
                              {isTimetableItem(item.href) && <AttentionBadge show={timetableAttention} />}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </nav>
          </div>

          {/* User profile & logout */}
          <div className={`flex flex-shrink-0 border-t p-4 ${
            theme === 'dark' ? 'border-white/10' : 'border-white/20'
          }`}>
            <div className={`flex items-center w-full ${effectiveIsCollapsed ? 'justify-center' : ''}`}>
              {effectiveIsCollapsed ? (
                <button
                  onClick={handleLogout}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'text-gray-400 hover:text-white hover:bg-white/10'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
                  }`}
                  title="Logout"
                >
                  <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                </button>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {user?.name}
                    </p>
                    <p className={`text-xs truncate ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {user?.role}
                    </p>
                    {teacherProfile && (
                      <p className={`text-xs truncate ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        {teacherProfile.arms?.length || 0} classes
                      </p>
                    )}
                    {profileError && (
                      <p className={`text-xs truncate text-red-500`}>
                        ⚠️ Profile not found
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleLogout}
                    className={`ml-3 p-2 rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
                        : 'bg-white/40 hover:bg-white/60 text-gray-700 hover:text-gray-900'
                    }`}
                    title="Logout"
                  >
                    <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Glow */}
          {theme === 'dark' ? (
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
          ) : (
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />
          )}
        </div>
      </div>

      {/* ====== Mobile Sidebar — bottom drawer with grid menu ====== */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden animate-fade-in"
            onClick={() => setSidebarOpen(false)}
          />
          <div
            className={`fixed inset-x-0 bottom-0 z-40 md:hidden max-h-[85vh] flex flex-col rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.35)] animate-sheet-up ${
              theme === 'dark'
                ? 'bg-[#111827]/95 backdrop-blur-xl border-t border-white/10'
                : 'bg-white/95 backdrop-blur-xl border-t border-gray-200'
            } ${sidebarOpen ? 'translate-y-0' : 'translate-y-full'}`}
          >
            <div className={`relative flex flex-col flex-1 overflow-y-auto`}>
              {/* Drag handle */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-full flex justify-center pt-2.5 pb-1"
                aria-label="Close menu"
              >
                <span className={`h-1.5 w-12 rounded-full ${
                  theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                }`} />
              </button>

              <div className="flex items-center justify-between px-5 pb-3">
                <div className="flex items-center gap-2">
                  <h1 className={`text-lg font-bold ${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent'
                  }`}>
                    SmartEdufy
                  </h1>
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                    theme === 'dark'
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-blue-50 text-blue-700'
                  }`}>
                    Teacher
                  </span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className={`p-1.5 rounded-full ${
                    theme === 'dark'
                      ? 'text-gray-400 hover:text-white hover:bg-white/10'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  aria-label="Close"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Folder menu — one category open at a time */}
              <nav className="flex-1 px-3 py-2 space-y-2">
                {allowedCategories.map((category) => {
                  const isOpen = openMobileCategory === category.name;
                  return (
                    <div
                      key={category.name}
                      className={`rounded-2xl overflow-hidden transition-colors ${
                        isOpen
                          ? theme === 'dark'
                            ? 'bg-white/5 ring-1 ring-blue-400/30'
                            : 'bg-blue-50/60 ring-1 ring-blue-200'
                          : theme === 'dark'
                            ? 'bg-white/[0.03] ring-1 ring-white/5'
                            : 'bg-gray-50 ring-1 ring-gray-200/60'
                      }`}
                    >
                      <button
                        onClick={() =>
                          setOpenMobileCategory(isOpen ? null : category.name)
                        }
                        className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left"
                      >
                        {isOpen ? (
                          <FolderOpenIcon className={`h-5 w-5 flex-shrink-0 ${
                            theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                          }`} />
                        ) : (
                          <FolderIcon className={`h-5 w-5 flex-shrink-0 ${
                            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                          }`} />
                        )}
                        <span className={`flex-1 text-xs font-bold uppercase tracking-[0.15em] ${
                          isOpen
                            ? theme === 'dark' ? 'text-white' : 'text-blue-900'
                            : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {category.name}
                        </span>
                        <AttentionBadge show={categoryNeedsAttention(category.name)} compact />
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          theme === 'dark' ? 'bg-white/10 text-gray-400' : 'bg-white text-gray-500'
                        }`}>
                          {category.items.length}
                        </span>
                        <ChevronDownIcon
                          className={`h-4 w-4 transition-transform duration-200 ${
                            isOpen ? 'rotate-180' : ''
                          } ${
                            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="grid grid-cols-3 gap-2.5 px-3 pb-3.5 pt-1">
                          {category.items.map((item, idx) => {
                            const active = isActiveLink(item.href);
                            return (
                              <Link
                                key={item.name}
                                to={item.href}
                                onClick={() => setSidebarOpen(false)}
                                style={{ animationDelay: `${idx * 45}ms` }}
                                className={`group flex flex-col items-center justify-center gap-1.5 px-2 py-3.5 rounded-2xl text-center transition-all duration-200 active:scale-95 animate-folder-content-in ${
                                  active
                                    ? theme === 'dark'
                                      ? 'bg-gradient-to-br from-blue-500/40 to-indigo-500/30 shadow-lg shadow-blue-500/20 ring-1 ring-blue-400/40'
                                      : 'bg-gradient-to-br from-blue-500/15 to-indigo-500/10 shadow-md shadow-blue-500/10 ring-1 ring-blue-500/30'
                                    : theme === 'dark'
                                      ? 'bg-white/5 hover:bg-white/10 ring-1 ring-white/5'
                                      : 'bg-white hover:bg-blue-50 ring-1 ring-gray-200/60 hover:ring-blue-200'
                                }`}
                              >
                                <span className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all ${
                                  active
                                    ? 'bg-blue-500 text-white shadow-md shadow-blue-500/40'
                                    : theme === 'dark'
                                      ? 'bg-white/10 text-gray-300 group-hover:text-blue-400'
                                      : 'bg-gray-50 text-gray-600 shadow-sm group-hover:text-blue-600'
                                }`}>
                                  <item.icon className="h-5 w-5" />
                                  {isTimetableItem(item.href) && <AttentionBadge show={timetableAttention} />}
                                </span>
                                <span className={`text-[11px] font-medium leading-tight line-clamp-2 ${
                                  active
                                    ? theme === 'dark' ? 'text-white' : 'text-blue-900'
                                    : theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                                }`}>
                                  {item.name}
                                </span>
                                {active && (
                                  <span className="h-1 w-1 rounded-full bg-blue-500" />
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>

              {/* Footer: user + logout */}
              <div className={`sticky bottom-0 flex items-center gap-3 flex-shrink-0 px-5 py-3.5 ${
                theme === 'dark'
                  ? 'border-t border-white/10 bg-white/5'
                  : 'border-t border-gray-200/70 bg-gray-50/90'
              }`}>
                <div className={`h-9 w-9 flex items-center justify-center rounded-full text-sm font-bold flex-shrink-0 text-white bg-gradient-to-br ${
                  theme === 'dark' ? 'from-blue-500 to-indigo-500' : 'from-blue-600 to-indigo-600'
                }`}>
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {user?.name}
                  </p>
                  <p className={`text-xs truncate ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {user?.email || user?.role}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className={`p-2.5 rounded-xl transition-colors flex-shrink-0 ${
                    theme === 'dark'
                      ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                      : 'bg-red-50 hover:bg-red-100 text-red-600'
                  }`}
                  title="Logout"
                >
                  <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                </button>
              </div>

              {theme === 'dark' ? (
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
              ) : (
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />
              )}
            </div>
          </div>
        </>
      )}

      {/* ====== Main content area with top bar ====== */}
      <div className={`flex flex-col flex-1 transition-all duration-300 ${
        effectiveIsCollapsed ? 'md:pl-20' : 'md:pl-72'
      }`}>
        <header className={`sticky top-0 z-50 flex h-16 items-center justify-between px-4 md:px-6 shadow-sm transition-all duration-300 ${
          theme === 'dark'
            ? 'bg-white/5 backdrop-blur-xl border-b border-white/10'
            : 'bg-white/30 backdrop-blur-md border-b border-white/20'
        }`}>
          {/* Left side: sidebar toggle buttons + school/term info */}
          <div className="flex items-center flex-1 min-w-0">
            {/* Desktop collapse toggle */}
            <button
              onClick={toggleSidebar}
              className="hidden md:block p-2 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronDoubleRightIcon className="h-5 w-5" />
              ) : (
                <ChevronDoubleLeftIcon className="h-5 w-5" />
              )}
            </button>

            {/* School & Term Info (desktop only). Hover handlers live on this
                wide wrapper (not the text) so that when the sidebar folds the
                content shifts left but the cursor stays inside the wrapper —
                otherwise the name slides out from under the cursor, fires
                mouseLeave and the sidebar pops back open. */}
            <div
              className="hidden md:flex items-baseline space-x-2 ml-3 min-w-0 flex-1"
              onMouseEnter={handleSchoolNameEnter}
              onMouseLeave={handleSchoolNameLeave}
            >
              {schoolName && (
                <span
                  className={`${getSchoolNameTextClass(schoolName)} font-extrabold truncate cursor-default ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}
                  title="Hover to fold the sidebar"
                >
                  {schoolName}
                </span>
              )}
              {currentTerm && (
                <span className={`text-xs font-medium whitespace-nowrap ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {currentTerm}
                </span>
              )}
            </div>
          </div>

          {/* ====== Search Bar - icon opens a search modal (spans across like the parent dashboard) ====== */}
          <div className="flex items-center justify-end flex-1 min-w-0 mr-2 relative" ref={searchContainerRef}>
            <div className="relative">
              <button
                type="button"
                onClick={() => setSearchModalOpen(true)}
                title="Search"
                aria-label="Open search"
                className={`p-2 -m-2 rounded-full transition-colors ${
                  theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-900 hover:bg-white/40'
                }`}
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* ====== Search Modal (ported to body so the backdrop covers the full viewport) ====== */}
          {searchModalOpen && createPortal(
            <div
              className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 pt-24"
              onClick={closeSearchModal}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${
                  theme === 'dark'
                    ? 'bg-gray-900/95 backdrop-blur-xl border border-white/10'
                    : 'bg-white/95 backdrop-blur-xl border border-white/30'
                }`}
              >
                {/* Modal search input */}
                <div className={`flex items-center gap-3 px-4 py-3 border-b ${
                  theme === 'dark' ? 'border-white/10' : 'border-gray-200'
                }`}>
                  <MagnifyingGlassIcon className={`h-5 w-5 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                  <input
                    ref={searchInputRef}
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleModalKeyDown}
                    placeholder="Search menus, pages, actions..."
                    className={`flex-1 bg-transparent text-base focus:outline-none ${
                      theme === 'dark' ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={closeSearchModal}
                    aria-label="Close search"
                    className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                      theme === 'dark'
                        ? 'text-gray-400 hover:text-white hover:bg-white/10'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    ESC
                  </button>
                </div>

                {/* Results */}
                {searchQuery.trim() !== '' && (
                  <div className="max-h-80 overflow-y-auto">
                    {searchResults.length === 0 ? (
                      <div className={`px-4 py-6 text-sm text-center ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        No results found
                      </div>
                    ) : (
                      <ul className="py-2">
                        {searchResults.map((item, idx) => (
                          <li
                            key={item.href}
                            onClick={() => handleResultClick(item.href)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={`px-4 py-2.5 flex items-center gap-3 cursor-pointer transition-colors ${
                              selectedIndex === idx
                                ? theme === 'dark'
                                  ? 'bg-white/10'
                                  : 'bg-black/5'
                                : ''
                            } ${
                              theme === 'dark'
                                ? 'hover:bg-white/10 text-gray-200'
                                : 'hover:bg-black/5 text-gray-800'
                            }`}
                          >
                            <item.icon className={`h-5 w-5 ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                            }`} />
                            <span className="text-sm">{item.name}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>,
            document.body
          )}

          {/* Logout confirmation dialog */}
          <LogoutConfirmModal
            open={showLogoutConfirm}
            theme={theme as 'light' | 'dark'}
            onConfirm={confirmLogout}
            onCancel={() => setShowLogoutConfirm(false)}
          />

          {/* Right icons */}
          <div className="flex items-center space-x-4 flex-shrink-0">
            <div className="flex items-center space-x-1">
              <ViewControls />
            </div>
            <Link
              to="/teacher/notifications"
              className={`relative p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'text-gray-400 hover:text-white hover:bg-white/10'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
              }`}
            >
              <BellIcon className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-900">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'text-gray-400 hover:text-white hover:bg-white/10'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
              }`}
            >
              {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>
          </div>
        </header>

        <main className="flex-1 app-main-safe px-4 sm:px-6 py-4 sm:py-6 pb-24 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* ====== MOBILE FLOATING BOTTOM NAV (app-style, mobile only) ====== */}
      <nav
        className={`md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 px-2 py-1.5 rounded-full shadow-2xl border backdrop-blur-xl transition-opacity duration-300 ${
          theme === 'dark'
            ? 'bg-gray-900/85 border-white/10'
            : 'bg-white/90 border-gray-200/70'
        } ${sidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        aria-label="Quick navigation"
      >
        {/* Home — dashboard */}
        <Link
          to="/teacher"
          className={`flex flex-col items-center gap-0.5 px-5 py-2 rounded-full transition-colors ${
            isActiveLink('/teacher')
              ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400'
              : theme === 'dark'
                ? 'text-gray-400 active:bg-white/10'
                : 'text-gray-500 active:bg-gray-100'
          }`}
          aria-label="Dashboard"
        >
          <HomeIcon className="h-6 w-6" />
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        {/* Divider */}
        <span className={`h-8 w-px ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`} />
        {/* Menu — opens the folder drawer */}
        <button
          onClick={() => setSidebarOpen(true)}
          className={`flex flex-col items-center gap-0.5 px-5 py-2 rounded-full transition-colors ${
            theme === 'dark'
              ? 'text-gray-400 active:bg-white/10'
              : 'text-gray-500 active:bg-gray-100'
          }`}
          aria-label="Open menu"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="text-[10px] font-medium">Menu</span>
        </button>
        {/* Divider */}
        <span className={`h-8 w-px ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`} />
        {/* Profile */}
        <Link
          to="/teacher/profile"
          className={`flex flex-col items-center gap-0.5 px-5 py-2 rounded-full transition-colors ${
            isActiveLink('/teacher/profile')
              ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400'
              : theme === 'dark'
                ? 'text-gray-400 active:bg-white/10'
                : 'text-gray-500 active:bg-gray-100'
          }`}
          aria-label="My profile"
        >
          <UserCircleIcon className="h-6 w-6" />
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
        {/* Divider */}
        <span className={`h-8 w-px ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`} />
        {/* Logout */}
        <button
          onClick={handleLogout}
          className={`flex flex-col items-center gap-0.5 px-5 py-2 rounded-full transition-colors ${
            theme === 'dark'
              ? 'text-gray-400 active:bg-white/10'
              : 'text-gray-500 active:bg-gray-100'
          }`}
          aria-label="Log out"
        >
          <ArrowLeftOnRectangleIcon className="h-6 w-6" />
          <span className="text-[10px] font-medium">Logout</span>
        </button>
      </nav>
    </div>
  );
}