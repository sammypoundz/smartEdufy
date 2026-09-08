import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ALL_PRIVILEGES } from '../utils/privileges';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../utils/api';
import ViewControls from '../components/ViewControls';
import {
  FolderIcon,
  FolderOpenIcon,
  HomeIcon,
  UsersIcon,
  AcademicCapIcon,
  UserGroupIcon,
  BanknotesIcon,
  DocumentTextIcon,
  ComputerDesktopIcon,
  BookOpenIcon,
  ChatBubbleLeftIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  ReceiptPercentIcon,
  CubeIcon,
  CurrencyDollarIcon,
  CogIcon,
  ChartBarIcon,
  DocumentChartBarIcon,
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
  UserIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';

// ---------- Categories ----------
const categories = [
  {
    name: 'Dashboard',
    items: [{ name: 'Overview', href: '/admin', icon: HomeIcon }],
  },
  {
    name: 'Academic',
    items: [
      { name: 'Classes', href: '/admin/classes', icon: AcademicCapIcon, privilege: 'classes' },
      { name: 'Students', href: '/admin/students', icon: UserGroupIcon, privilege: 'students' },
      { name: 'Subjects', href: '/admin/subjects', icon: BookOpenIcon, privilege: 'subjects' },
      { name: 'Broadsheet', href: '/admin/broadsheet', icon: DocumentTextIcon, privilege: 'broadsheet' },
      { name: 'CBT', href: '/admin/cbt', icon: ComputerDesktopIcon, privilege: 'cbt' },
      { name: 'Question Review', href: '/admin/question-review', icon: ClipboardDocumentCheckIcon, privilege: 'question-review' },
      { name: 'Lesson Plan', href: '/admin/lesson-plan', icon: BookOpenIcon, privilege: 'lesson-plan' },
      { name: 'Time Table', href: '/admin/timetable', icon: CalendarIcon, privilege: 'timetable' },
      { name: 'Assessment Format', href: '/admin/assessment-format', icon: ClipboardDocumentListIcon, privilege: 'assessment-format' },
      { name: 'Result Compiler', href: '/admin/results', icon: ChartBarIcon, privilege: 'results' },
      { name: 'Report Cards', href: '/admin/reports', icon: DocumentChartBarIcon, privilege: 'reports' },
      { name: 'Academic Setup', href: '/admin/academic', icon: CogIcon, privilege: 'academic' },
    ],
  },
  {
    name: 'Finance',
    items: [
      { name: 'Fees', href: '/admin/fees', icon: BanknotesIcon, privilege: 'fees' },
      { name: 'Expenses & Budgeting', href: '/admin/expenses', icon: ReceiptPercentIcon, privilege: 'expenses' },
      { name: 'Payroll', href: '/admin/payroll', icon: CurrencyDollarIcon, privilege: 'payroll' },
    ],
  },
  {
    name: 'People',
    items: [
      { name: 'User Management', href: '/admin/users', icon: UsersIcon, privilege: 'users' },
      { name: 'Roles & Privileges', href: '/admin/roles', icon: UsersIcon, privilege: 'roles' },
      { name: 'Staff', href: '/admin/staff', icon: UserIcon, privilege: 'staff' },
      { name: 'Teachers', href: '/admin/teachers', icon: UserIcon, privilege: 'teachers' },
      { name: 'Parent', href: '/admin/parent', icon: UserGroupIcon, privilege: 'parents' },
    ],
  },
  {
    name: 'Communication',
    items: [{ name: 'Messaging', href: '/admin/messaging', icon: ChatBubbleLeftIcon, privilege: 'messaging' }],
  },
  {
    name: 'Inventory',
    items: [{ name: 'Inventory', href: '/admin/inventory', icon: CubeIcon, privilege: 'inventory' }],
  },
  {
    name: 'System',
    items: [
      { name: 'Settings', href: '/admin/settings', icon: CogIcon, privilege: 'settings' },
      { name: 'Audit Logs', href: '/admin/audit-logs', icon: ClipboardDocumentCheckIcon, privilege: 'audit-logs' },
      { name: 'Help', href: '/admin/help', icon: QuestionMarkCircleIcon },
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

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Users whose default dashboard is the teacher workspace (e.g. a teacher
  // granted admin privileges) get a quick way back home from the top bar.
  const staffRoles = [...(user?.roles || []), user?.role].filter(Boolean) as string[];
  const isPureAdmin = staffRoles.includes('ADMIN') || staffRoles.includes('PRINCIPAL');
  const hasTeacherWorkspace = !isPureAdmin && (
    staffRoles.includes('TEACHER') ||
    (user?.privileges?.length || 0) > 0 ||
    (user?.allowedPages?.length || 0) > 0
  );
  // Role label for the "back to my dashboard" button, e.g. "Teacher Dashboard"
  const homeRoleLabel =
    staffRoles.find(r => r !== 'ADMIN' && r !== 'PRINCIPAL') || 'My';
  const homeDashboardLabel = `${homeRoleLabel.charAt(0) + homeRoleLabel.slice(1).toLowerCase().replace(/_/g, ' ')} Dashboard`
    .replace('My Dashboard', 'My Dashboard');

  // ---------- Privileged navigation (based on roles + privileges) ----------
  // ADMIN/PRINCIPAL implicitly hold every privilege; other users only see
  // pages granted to them via their roles or direct privilege grants.
  const allowedCategories = (() => {
    const staffRoles = [...(user?.roles || []), user?.role].filter(Boolean) as string[];
    // ADMIN/PRINCIPAL see every admin page. Everyone else (e.g. a teacher
    // granted access to the admin panel) sees ONLY the pages explicitly
    // granted to them via User.allowedPages — never their role defaults.
    const isAdminUser = staffRoles.some(r => r === 'ADMIN' || r === 'PRINCIPAL');
    const privileges = isAdminUser
      ? ALL_PRIVILEGES.map(p => p.key)
      : (user?.allowedPages || []);
    return categories
      .map(cat => ({
        ...cat,
        items: cat.items.filter(
          item => !item.privilege || privileges.includes(item.privilege)
        ),
      }))
      .filter(cat => cat.items.length > 0);
  })();
  const allowedNavItems = allowedCategories.flatMap(cat => cat.items);

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
  // ---------- Search states ----------
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof allNavItems>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // ---------- Helper to check active link ----------
  const isActiveLink = (href: string) => {
    if (href === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(href);
  };

  // Close search modal on Escape and reset its state
  useEffect(() => {
    if (!searchModalOpen) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchModalOpen(false);
        setSearchQuery('');
        setSearchResults([]);
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('keydown', onEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEscape);
      document.body.style.overflow = 'unset';
    };
  }, [searchModalOpen]);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSearchDropdown(false);
        setSearchQuery('');
        setSearchExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSearchDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const selected = searchResults[selectedIndex];
      if (selected) {
        navigate(selected.href);
        setShowSearchDropdown(false);
        setSearchQuery('');
        setSearchExpanded(false);
      }
    } else if (e.key === 'Escape') {
      setShowSearchDropdown(false);
      setSearchQuery('');
      setSearchExpanded(false);
    }
  };

  const closeSearchModal = () => {
    setSearchModalOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchDropdown(false);
  };

  const handleResultClick = (href: string) => {
    navigate(href);
    closeSearchModal();
    setSearchExpanded(false);
  };

  // ---------- Handlers ----------
  const handleLogout = () => {
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

  // ---------- Search focus handling ----------
  const handleSearchFocus = () => {
    setSearchExpanded(true);
    if (searchQuery.trim() !== '') {
      setShowSearchDropdown(true);
    }
  };

  // ✅ FIX: removed unused `e` parameter
  const handleSearchBlur = () => {
    setTimeout(() => {
      if (!searchDropdownRef.current?.contains(document.activeElement)) {
        setSearchExpanded(false);
        setShowSearchDropdown(false);
      }
    }, 150);
  };

  const handleIconClick = () => {
    setSearchModalOpen(true);
  };

  const handleModalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      closeSearchModal();
      return;
    }
    if (!showSearchDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const selected = searchResults[selectedIndex];
      if (selected) {
        navigate(selected.href);
        closeSearchModal();
      }
    }
  };

  // ---------- Render ----------
  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
    }`}>
      {/* ====== Desktop Sidebar ====== */}
      <div
        className={`hidden md:fixed md:inset-y-0 md:flex md:flex-col z-20 transition-all duration-300 ${
          effectiveIsCollapsed ? 'md:w-20' : 'md:w-72'
        }`}
        onMouseEnter={() => {
          if (isCollapsed) setIsHoverExpanded(true);
        }}
        onMouseLeave={() => {
          setIsHoverExpanded(false);
        }}
      >
        <div className={`relative flex flex-grow flex-col overflow-y-auto border-r pt-5 shadow-2xl transition-all duration-300 ${
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
                  Admin
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
            className={`fixed inset-x-0 bottom-0 top-auto z-40 md:hidden max-h-[85vh] flex flex-col rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.35)] animate-sheet-up ${
              theme === 'dark'
                ? 'bg-[#111827]/95 backdrop-blur-xl border-t border-white/10'
                : 'bg-white/95 backdrop-blur-xl border-t border-gray-200'
            } ${
              sidebarOpen ? 'translate-y-0' : 'translate-y-full'
            }`}
          >
            {/* Drag handle */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="w-full flex flex-col items-center pt-2.5 pb-1 cursor-pointer"
              aria-label="Close menu"
            >
              <span className={`h-1.5 w-12 rounded-full ${
                theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
              }`} />
            </button>

            {/* Header */}
            <div className={`flex items-center justify-between px-5 pb-3 ${
              theme === 'dark' ? 'border-b border-white/10' : 'border-b border-gray-200/70'
            }`}>
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
                  {user?.role || 'Admin'}
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
            <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
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
            <div className={`flex items-center gap-3 flex-shrink-0 px-5 py-3.5 rounded-b-3xl ${
              theme === 'dark'
                ? 'border-t border-white/10 bg-white/5'
                : 'border-t border-gray-200/70 bg-gray-50/80'
            }`}>
              <div className={`h-9 w-9 flex items-center justify-center rounded-full text-sm font-bold flex-shrink-0 ${
                theme === 'dark'
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white'
                  : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
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
          </div>
        </>
      )}

      {/* ====== Main content area with top bar ====== */}
      <div className={`flex flex-col flex-1 transition-all duration-300 ${
        effectiveIsCollapsed ? 'md:pl-20' : 'md:pl-72'
      }`}>
        <header className={`sticky top-0 z-50 flex h-16 items-center justify-between px-6 shadow-sm transition-all duration-300 ${
          theme === 'dark'
            ? 'bg-white/5 backdrop-blur-xl border-b border-white/10'
            : 'bg-white/30 backdrop-blur-md border-b border-white/20'
        }`}>
          {/* Left side: sidebar toggle buttons + school/term info */}
          <div className="flex items-center flex-1 min-w-0">
            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700"
              onClick={() => setSidebarOpen(true)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

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

            {/* Back to my default (teacher) dashboard */}
            {hasTeacherWorkspace && (
              <button
                onClick={() => navigate('/teacher')}
                className={`hidden md:inline-flex items-center gap-1.5 ml-3 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  theme === 'dark'
                    ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
                title="Back to my dashboard"
              >
                <HomeIcon className="h-4 w-4" />
                {hasTeacherWorkspace ? homeDashboardLabel : 'My Dashboard'}
              </button>
            )}

            {/* School & Term Info (desktop only) - full name by default, truncate only when search is expanded */}
            {/* Hover handlers on the wide wrapper (not the text) so folding
                the sidebar — which shifts the top bar content left — does not
                slide the name out from under the cursor and fire mouseLeave. */}
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

          {/* ====== Search Bar – icon opens a search modal ====== */}
          <div className="flex items-center justify-end flex-1 min-w-0 max-w-xs ml-10 md:ml-20 mr-2 relative" ref={searchContainerRef}>
            <div
              className={`relative transition-all duration-300 ease-in-out ${
                searchExpanded ? 'w-full' : 'w-10'
              }`}
            >
              <div className="relative">
                <button
                  type="button"
                  onClick={handleIconClick}
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
          </div>

          {/* ====== Search Modal ====== */}
          {searchModalOpen && (
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
            </div>
          )}

          {/* Right icons */}
          <div className="flex items-center space-x-4 flex-shrink-0">
            <div className="flex items-center space-x-1">
              <ViewControls />
            </div>
            <Link
              to="/admin/notifications"
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'text-gray-400 hover:text-white hover:bg-white/10'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
              }`}
            >
              <BellIcon className="h-5 w-5" />
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
            <Link
              to="/admin/profile"
              className={`p-1 rounded-full transition-colors ${
                theme === 'dark'
                  ? 'text-gray-400 hover:text-white hover:bg-white/10'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
              }`}
            >
              <UserCircleIcon className="h-8 w-8" />
            </Link>
          </div>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}