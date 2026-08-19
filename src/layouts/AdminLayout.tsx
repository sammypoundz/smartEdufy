import { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../utils/api';
import {
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
      { name: 'Classes', href: '/admin/classes', icon: AcademicCapIcon },
      { name: 'Students', href: '/admin/students', icon: UserGroupIcon },
      { name: 'Subjects', href: '/admin/subjects', icon: BookOpenIcon },
      { name: 'Broadsheet', href: '/admin/broadsheet', icon: DocumentTextIcon },
      { name: 'CBT', href: '/admin/cbt', icon: ComputerDesktopIcon },
      { name: 'Lesson Plan', href: '/admin/lesson-plan', icon: BookOpenIcon },
      { name: 'Time Table', href: '/admin/timetable', icon: CalendarIcon },
      { name: 'Assessment Format', href: '/admin/assessment-format', icon: ClipboardDocumentListIcon },
      { name: 'Result Compiler', href: '/admin/results', icon: ChartBarIcon },
      { name: 'Report Cards', href: '/admin/reports', icon: DocumentChartBarIcon },
      { name: 'Academic Setup', href: '/admin/academic', icon: CogIcon },
    ],
  },
  {
    name: 'Finance',
    items: [
      { name: 'Fees', href: '/admin/fees', icon: BanknotesIcon },
      { name: 'Expenses & Budgeting', href: '/admin/expenses', icon: ReceiptPercentIcon },
      { name: 'Payroll', href: '/admin/payroll', icon: CurrencyDollarIcon },
    ],
  },
  {
    name: 'People',
    items: [
      { name: 'User Management', href: '/admin/users', icon: UsersIcon },
      { name: 'Staff', href: '/admin/staff', icon: UserIcon },
      { name: 'Teachers', href: '/admin/teachers', icon: UserIcon },
      { name: 'Parent', href: '/admin/parent', icon: UserGroupIcon },
    ],
  },
  {
    name: 'Communication',
    items: [{ name: 'Messaging', href: '/admin/messaging', icon: ChatBubbleLeftIcon }],
  },
  {
    name: 'Inventory',
    items: [{ name: 'Inventory', href: '/admin/inventory', icon: CubeIcon }],
  },
  {
    name: 'System',
    items: [
      { name: 'Settings', href: '/admin/settings', icon: CogIcon },
      { name: 'Help', href: '/admin/help', icon: QuestionMarkCircleIcon },
    ],
  },
];

const allNavItems = categories.flatMap(cat => cat.items);

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // ---------- Sidebar states ----------
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHoverExpanded, setIsHoverExpanded] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    categories.reduce((acc, cat) => ({ ...acc, [cat.name]: true }), {})
  );

  // ---------- Top bar info states ----------
  const [schoolName, setSchoolName] = useState<string>('');
  const [currentTerm, setCurrentTerm] = useState<string>('');

  // ---------- Search states ----------
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof allNavItems>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // ---------- Helper to check active link ----------
  const isActiveLink = (href: string) => {
    if (href === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(href);
  };

  // ---------- Fetch school & term info ----------
  useEffect(() => {
    const fetchTopBarInfo = async () => {
      try {
        const [generalRes, academicRes] = await Promise.all([
          api.get('/settings/general'),
          api.get('/settings/academic'),
        ]);
        if (generalRes.ok) {
          const data = await generalRes.json();
          setSchoolName(data.schoolName || '');
        }
        if (academicRes.ok) {
          const data = await academicRes.json();
          setCurrentTerm(data.currentTerm || '');
        }
      } catch (err) {
        console.error('Failed to load top bar info', err);
      }
    };
    fetchTopBarInfo();
  }, []);

  // ---------- Search logic ----------
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    const queryLower = searchQuery.toLowerCase();
    const filtered = allNavItems.filter(item =>
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

  const handleResultClick = (href: string) => {
    navigate(href);
    setShowSearchDropdown(false);
    setSearchQuery('');
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
  const effectiveIsCollapsed = isCollapsed && !isHoverExpanded;

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
    searchInputRef.current?.focus();
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
                categories.flatMap(category => category.items).map((item) => {
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
                categories.map((category) => (
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

      {/* ====== Mobile Sidebar ====== */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className={`fixed inset-y-0 left-0 w-72 z-40 md:hidden transition-transform duration-300 ease-in-out transform ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            <div className={`relative h-full flex flex-col overflow-y-auto border-r pt-5 shadow-2xl ${
              theme === 'dark'
                ? 'bg-white/10 backdrop-blur-xl border-white/10'
                : 'bg-white/30 backdrop-blur-md border-white/20'
            }`}>
              <button
                onClick={() => setSidebarOpen(false)}
                className={`absolute top-4 right-4 p-2 rounded-lg ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-white hover:bg-white/10'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
                }`}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>

              <div className="flex flex-shrink-0 items-center px-6">
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
              </div>

              <div className="mt-8 flex flex-grow flex-col">
                <nav className="flex-1 space-y-2 px-4">
                  {categories.map((category) => (
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
                                onClick={() => setSidebarOpen(false)}
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
                  ))}
                </nav>
              </div>

              <div className={`flex flex-shrink-0 border-t p-6 ${
                theme === 'dark' ? 'border-white/10' : 'border-white/20'
              }`}>
                <div className="flex items-center w-full">
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
                </div>
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

            {/* School & Term Info (desktop only) - full name by default, truncate only when search is expanded */}
            <div className="hidden md:flex items-baseline space-x-2 ml-3 min-w-0 flex-1">
              {schoolName && (
                <span className={`text-xl font-extrabold ${searchExpanded ? 'truncate' : ''} ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
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

          {/* ====== Search Bar – expands on focus ====== */}
          <div className="flex items-center justify-end flex-1 max-w-xs mx-4 relative" ref={searchContainerRef}>
            <div
              className={`relative transition-all duration-300 ease-in-out ${
                searchExpanded ? 'w-full' : 'w-10'
              }`}
            >
              <div className="relative">
                <MagnifyingGlassIcon
                  className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 cursor-pointer transition-colors ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  } ${searchExpanded ? 'pointer-events-none' : 'pointer-events-auto'}`}
                  onClick={handleIconClick}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={handleSearchFocus}
                  onBlur={handleSearchBlur}
                  placeholder={searchExpanded ? "Search menus, pages, actions..." : ""}
                  className={`w-full pl-10 pr-4 py-2 rounded-xl border transition-all duration-300 focus:outline-none focus:ring-2 ${
                    searchExpanded
                      ? 'opacity-100'
                      : 'opacity-0 pointer-events-none'
                  } ${
                    theme === 'dark'
                      ? 'bg-white/10 border-white/20 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
                      : 'bg-white/50 border-white/30 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  style={{
                    width: searchExpanded ? '100%' : '0px',
                    paddingLeft: searchExpanded ? '2.5rem' : '0',
                    paddingRight: searchExpanded ? '1rem' : '0',
                  }}
                />
              </div>

              {/* Search dropdown – only when expanded */}
              {showSearchDropdown && searchExpanded && (
                <div
                  ref={searchDropdownRef}
                  className={`absolute top-full left-0 right-0 mt-2 rounded-xl shadow-xl overflow-hidden z-50 ${
                    theme === 'dark'
                      ? 'bg-gray-900/95 backdrop-blur-xl border border-white/10'
                      : 'bg-white/95 backdrop-blur-xl border border-white/30'
                  }`}
                >
                  {searchResults.length === 0 ? (
                    <div className={`px-4 py-3 text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      No results found
                    </div>
                  ) : (
                    <ul className="max-h-96 overflow-y-auto py-2">
                      {searchResults.map((item, idx) => (
                        <li
                          key={item.href}
                          onClick={() => handleResultClick(item.href)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`px-4 py-2 flex items-center gap-3 cursor-pointer transition-colors ${
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

          {/* Right icons */}
          <div className="flex items-center space-x-4 flex-shrink-0">
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