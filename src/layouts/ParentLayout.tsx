import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  HomeIcon,
  UserGroupIcon,
  BanknotesIcon,
  ChatBubbleLeftRightIcon,
  Bars3Icon,
  BellIcon,
  UserCircleIcon,
  ArrowLeftOnRectangleIcon,
  SunIcon,
  MoonIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ChevronDownIcon,
  XMarkIcon,
  FolderIcon,
  FolderOpenIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import ViewControls from "../components/ViewControls";
import LogoutConfirmModal from "../components/LogoutConfirmModal";

// ---------- Navigation categories (mirrors AdminLayout structure) ----------
const categories = [
  {
    name: "Dashboard",
    items: [{ name: "Overview", href: "/parent", icon: HomeIcon }],
  },
  {
    name: "Academic",
    items: [
      { name: "My Children", href: "/parent/children", icon: UserGroupIcon },
    ],
  },
  {
    name: "Finance",
    items: [{ name: "Fees", href: "/parent/fees", icon: BanknotesIcon }],
  },
  {
    name: "Communication",
    items: [
      {
        name: "Messages",
        href: "/parent/messages",
        icon: ChatBubbleLeftRightIcon,
      },
      { name: "Notifications", href: "/parent/notifications", icon: BellIcon },
    ],
  },
  {
    name: "Account",
    items: [
      { name: "Profile", href: "/parent/profile", icon: UserCircleIcon },
      { name: "More", href: "/parent/more", icon: Bars3Icon },
    ],
  },
];

const allNavItems = categories.flatMap((c) => c.items);

function isActiveLink(href: string, pathname: string) {
  if (href === "/parent") return pathname === "/parent";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function ParentLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // ---------- Sidebar states ----------
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const openSidebar = () => {
    setSidebarVisible(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setSidebarOpen(true));
    });
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
    setTimeout(() => setSidebarVisible(false), 350);
  };
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHoverExpanded, setIsHoverExpanded] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    categories.reduce((acc, cat) => ({ ...acc, [cat.name]: true }), {}),
  );
  const [openMobileCategory, setOpenMobileCategory] = useState<string | null>(
    null,
  );

  // ---------- Search (icon opens modal, mirrors AdminLayout) ----------
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<typeof allNavItems>([]);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isActive = (href: string) => isActiveLink(href, location.pathname);

  useEffect(() => {
    if (!searchModalOpen) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSearchModal();
    };
    document.addEventListener("keydown", onEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = "unset";
    };
  }, [searchModalOpen]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      return;
    }
    const queryLower = searchQuery.toLowerCase();
    setSearchResults(
      allNavItems.filter((item) =>
        item.name.toLowerCase().includes(queryLower),
      ),
    );
    setSelectedIndex(-1);
  }, [searchQuery]);

  const closeSearchModal = () => {
    setSearchModalOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedIndex(-1);
  };

  const handleResultClick = (href: string) => {
    navigate(href);
    closeSearchModal();
  };

  const handleModalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      closeSearchModal();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(
        (prev) => (prev + 1) % Math.max(searchResults.length, 1),
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(
        (prev) =>
          (prev - 1 + searchResults.length) % Math.max(searchResults.length, 1),
      );
    } else if (
      e.key === "Enter" &&
      selectedIndex >= 0 &&
      searchResults[selectedIndex]
    ) {
      e.preventDefault();
      handleResultClick(searchResults[selectedIndex].href);
    }
  };

  // ---------- Logout ----------
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate("/login");
  };

  const toggleSidebar = () => {
    setIsCollapsed((prev) => !prev);
    setIsHoverExpanded(false);
  };
  const toggleCategory = (name: string) =>
    setOpenCategories((prev) => ({ ...prev, [name]: !prev[name] }));

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [sidebarOpen]);

  const effectiveIsCollapsed = isCollapsed && !isHoverExpanded;

  // ---------- Render ----------
  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        theme === "dark"
          ? "bg-[#0B1120]"
          : "bg-gradient-to-br from-blue-50 via-white to-blue-50"
      }`}
    >
      {/* ====== Desktop Sidebar ====== */}
      <div
        className={`hidden md:fixed md:inset-y-0 md:flex md:flex-col z-20 transition-all duration-300 ${
          effectiveIsCollapsed ? "md:w-20" : "md:w-72"
        }`}
        onMouseEnter={() => {
          if (isCollapsed) setIsHoverExpanded(true);
        }}
        onMouseLeave={() => {
          setIsHoverExpanded(false);
        }}
      >
        <div
          className={`relative flex flex-grow flex-col overflow-y-auto overflow-x-hidden border-r pt-5 shadow-2xl transition-all duration-300 ${
            theme === "dark"
              ? "bg-white/5 backdrop-blur-xl border-white/10"
              : "bg-white/30 backdrop-blur-md border-white/20"
          }`}
        >
          {/* Logo */}
          <div
            className={`flex flex-shrink-0 items-center ${effectiveIsCollapsed ? "justify-center px-2" : "px-6"}`}
          >
            {effectiveIsCollapsed ? (
              <span
                className={`text-xl font-bold ${
                  theme === "dark"
                    ? "bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent"
                    : "bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent"
                }`}
              >
                SE
              </span>
            ) : (
              <>
                <h1
                  className={`text-xl font-bold ${
                    theme === "dark"
                      ? "bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent"
                      : "bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent"
                  }`}
                >
                  SmartEdufy
                </h1>
                <span
                  className={`ml-2 px-2 py-1 text-xs font-medium rounded-full border ${
                    theme === "dark"
                      ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                      : "bg-white/40 text-blue-800 border-white/30 backdrop-blur-sm"
                  }`}
                >
                  Parent
                </span>
              </>
            )}
          </div>

          {/* Navigation */}
          <div className="mt-8 flex flex-grow flex-col">
            <nav className="flex-1 space-y-2 px-2">
              {effectiveIsCollapsed
                ? allNavItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`group flex items-center justify-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                          active
                            ? theme === "dark"
                              ? "bg-gradient-to-r from-blue-500/30 to-indigo-500/30 shadow-lg shadow-blue-500/20 text-white"
                              : "bg-gradient-to-r from-blue-500/20 to-indigo-500/20 shadow-md shadow-blue-500/10 text-blue-900"
                            : theme === "dark"
                              ? "text-gray-300 hover:text-white hover:bg-white/10"
                              : "text-gray-700 hover:text-blue-900 hover:bg-white/40"
                        }`}
                        title={item.name}
                      >
                        <item.icon
                          className={`h-5 w-5 transition-colors ${
                            active
                              ? "text-blue-400"
                              : theme === "dark"
                                ? "text-gray-500 group-hover:text-blue-400"
                                : "text-gray-500 group-hover:text-blue-600"
                          }`}
                        />
                      </Link>
                    );
                  })
                : categories.map((category) => (
                    <div key={category.name} className="space-y-1">
                      <button
                        onClick={() => toggleCategory(category.name)}
                        className={`w-full flex items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors ${
                          theme === "dark"
                            ? "text-gray-400 hover:text-white hover:bg-white/5"
                            : "text-gray-500 hover:text-gray-700 hover:bg-black/5"
                        }`}
                      >
                        <span>{category.name}</span>
                        <ChevronDownIcon
                          className={`h-4 w-4 transition-transform duration-200 ${
                            openCategories[category.name]
                              ? "rotate-0"
                              : "-rotate-90"
                          }`}
                        />
                      </button>
                      {openCategories[category.name] && (
                        <div className="space-y-1 pl-2">
                          {category.items.map((item) => {
                            const active = isActive(item.href);
                            return (
                              <Link
                                key={item.name}
                                to={item.href}
                                className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                                  active
                                    ? theme === "dark"
                                      ? "bg-gradient-to-r from-blue-500/30 to-indigo-500/30 shadow-lg shadow-blue-500/20 text-white"
                                      : "bg-gradient-to-r from-blue-500/20 to-indigo-500/20 shadow-md shadow-blue-500/10 text-blue-900"
                                    : theme === "dark"
                                      ? "text-gray-300 hover:text-white hover:bg-white/10"
                                      : "text-gray-700 hover:text-blue-900 hover:bg-white/40"
                                }`}
                              >
                                <item.icon
                                  className={`mr-3 h-5 w-5 transition-colors ${
                                    active
                                      ? "text-blue-400"
                                      : theme === "dark"
                                        ? "text-gray-500 group-hover:text-blue-400"
                                        : "text-gray-500 group-hover:text-blue-600"
                                  }`}
                                />
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

          {/* User profile & logout */}
          <div
            className={`flex flex-shrink-0 border-t p-4 ${
              theme === "dark" ? "border-white/10" : "border-white/20"
            }`}
          >
            <div
              className={`flex items-center w-full ${effectiveIsCollapsed ? "justify-center" : ""}`}
            >
              {effectiveIsCollapsed ? (
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === "dark"
                      ? "text-gray-400 hover:text-white hover:bg-white/10"
                      : "text-gray-600 hover:text-gray-900 hover:bg-white/40"
                  }`}
                  title="Logout"
                >
                  <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                </button>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {user?.name}
                    </p>
                    <p
                      className={`text-xs truncate ${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {user?.role || "Parent"}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className={`ml-3 p-2 rounded-lg transition-colors ${
                      theme === "dark"
                        ? "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                        : "bg-white/40 hover:bg-white/60 text-gray-700 hover:text-gray-900"
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
          {theme === "dark" ? (
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
          ) : (
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />
          )}
        </div>
      </div>

      {/* ====== Mobile Sidebar — bottom drawer with grid menu ====== */}
      {sidebarVisible && (
        <>
          <div
            className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300 ${
              sidebarOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeSidebar}
          />
          <div
            className={`fixed inset-x-0 bottom-0 top-auto z-40 md:hidden max-h-[85vh] flex flex-col rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.35)] transition-transform duration-300 ease-in-out ${
              theme === "dark"
                ? "bg-[#111827]/95 backdrop-blur-xl border-t border-white/10"
                : "bg-white/95 backdrop-blur-xl border-t border-gray-200"
            } ${sidebarOpen ? "translate-y-0" : "translate-y-full"}`}
          >
            {/* Drag handle */}
            <button
              onClick={closeSidebar}
              className="w-full flex flex-col items-center pt-2.5 pb-1 cursor-pointer"
              aria-label="Close menu"
            >
              <span
                className={`h-1.5 w-12 rounded-full ${
                  theme === "dark" ? "bg-gray-600" : "bg-gray-300"
                }`}
              />
            </button>

            {/* Header */}
            <div
              className={`flex items-center justify-between px-5 pb-3 ${
                theme === "dark"
                  ? "border-b border-white/10"
                  : "border-b border-gray-200/70"
              }`}
            >
              <div className="flex items-center gap-2">
                <h1
                  className={`text-lg font-bold ${
                    theme === "dark"
                      ? "bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent"
                      : "bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent"
                  }`}
                >
                  SmartEdufy
                </h1>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                    theme === "dark"
                      ? "bg-blue-500/20 text-blue-300"
                      : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {user?.role || "Parent"}
                </span>
              </div>
              <button
                onClick={closeSidebar}
                className={`p-1.5 rounded-full ${
                  theme === "dark"
                    ? "text-gray-400 hover:text-white hover:bg-white/10"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                }`}
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Folder menu — one category open at a time */}
            <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {categories.map((category) => {
                const isOpen = openMobileCategory === category.name;
                return (
                  <div
                    key={category.name}
                    className={`rounded-2xl overflow-hidden transition-colors ${
                      isOpen
                        ? theme === "dark"
                          ? "bg-white/5 ring-1 ring-blue-400/30"
                          : "bg-blue-50/60 ring-1 ring-blue-200"
                        : theme === "dark"
                          ? "bg-white/[0.03] ring-1 ring-white/5"
                          : "bg-gray-50 ring-1 ring-gray-200/60"
                    }`}
                  >
                    <button
                      onClick={() =>
                        setOpenMobileCategory(isOpen ? null : category.name)
                      }
                      className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left"
                    >
                      {isOpen ? (
                        <FolderOpenIcon
                          className={`h-5 w-5 flex-shrink-0 ${
                            theme === "dark" ? "text-blue-400" : "text-blue-600"
                          }`}
                        />
                      ) : (
                        <FolderIcon
                          className={`h-5 w-5 flex-shrink-0 ${
                            theme === "dark" ? "text-gray-500" : "text-gray-400"
                          }`}
                        />
                      )}
                      <span
                        className={`flex-1 text-xs font-bold uppercase tracking-[0.15em] ${
                          isOpen
                            ? theme === "dark"
                              ? "text-white"
                              : "text-blue-900"
                            : theme === "dark"
                              ? "text-gray-400"
                              : "text-gray-600"
                        }`}
                      >
                        {category.name}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          theme === "dark"
                            ? "bg-white/10 text-gray-400"
                            : "bg-white text-gray-500"
                        }`}
                      >
                        {category.items.length}
                      </span>
                      <ChevronDownIcon
                        className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${
                          theme === "dark" ? "text-gray-500" : "text-gray-400"
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="grid grid-cols-3 gap-2.5 px-3 pb-3.5 pt-1">
                        {category.items.map((item, idx) => {
                          const active = isActive(item.href);
                          return (
                            <Link
                              key={item.name}
                              to={item.href}
                              onClick={closeSidebar}
                              style={{ animationDelay: `${idx * 45}ms` }}
                              className={`group flex flex-col items-center justify-center gap-1.5 px-2 py-3.5 rounded-2xl text-center transition-all duration-200 active:scale-95 animate-folder-content-in ${
                                active
                                  ? theme === "dark"
                                    ? "bg-gradient-to-br from-blue-500/40 to-indigo-500/30 shadow-lg shadow-blue-500/20 ring-1 ring-blue-400/40"
                                    : "bg-gradient-to-br from-blue-500/15 to-indigo-500/10 shadow-md shadow-blue-500/10 ring-1 ring-blue-500/30"
                                  : theme === "dark"
                                    ? "bg-white/5 hover:bg-white/10 ring-1 ring-white/5"
                                    : "bg-white hover:bg-blue-50 ring-1 ring-gray-200/60 hover:ring-blue-200"
                              }`}
                            >
                              <span
                                className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all ${
                                  active
                                    ? "bg-blue-500 text-white shadow-md shadow-blue-500/40"
                                    : theme === "dark"
                                      ? "bg-white/10 text-gray-300 group-hover:text-blue-400"
                                      : "bg-gray-50 text-gray-600 shadow-sm group-hover:text-blue-600"
                                }`}
                              >
                                <item.icon className="h-5 w-5" />
                              </span>
                              <span
                                className={`text-[11px] font-medium leading-tight line-clamp-2 ${
                                  active
                                    ? theme === "dark"
                                      ? "text-white"
                                      : "text-blue-900"
                                    : theme === "dark"
                                      ? "text-gray-300"
                                      : "text-gray-700"
                                }`}
                              >
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
            <div
              className={`flex items-center gap-3 flex-shrink-0 px-5 py-3.5 rounded-b-3xl ${
                theme === "dark"
                  ? "border-t border-white/10 bg-white/5"
                  : "border-t border-gray-200/70 bg-gray-50/80"
              }`}
            >
              <div
                className={`h-9 w-9 flex items-center justify-center rounded-full text-sm font-bold flex-shrink-0 ${
                  theme === "dark"
                    ? "bg-gradient-to-br from-blue-500 to-indigo-500 text-white"
                    : "bg-gradient-to-br from-blue-600 to-indigo-600 text-white"
                }`}
              >
                {(user?.name || "U").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-semibold truncate ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}
                >
                  {user?.name}
                </p>
                <p
                  className={`text-xs truncate ${
                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {user?.email || user?.role || "Parent"}
                </p>
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className={`p-2.5 rounded-xl transition-colors flex-shrink-0 ${
                  theme === "dark"
                    ? "bg-red-500/10 hover:bg-red-500/20 text-red-400"
                    : "bg-red-50 hover:bg-red-100 text-red-600"
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
      <div
        className={`flex flex-col flex-1 transition-all duration-300 ${
          effectiveIsCollapsed ? "md:pl-20" : "md:pl-72"
        }`}
      >
        <header
          className={`sticky top-0 z-50 flex h-16 items-center justify-between px-6 shadow-sm transition-all duration-300 ${
            theme === "dark"
              ? "bg-white/5 backdrop-blur-xl border-b border-white/10"
              : "bg-white/30 backdrop-blur-md border-b border-white/20"
          }`}
        >
          <div className="flex items-center flex-1 min-w-0">
            {/* Desktop collapse toggle */}
            <button
              onClick={toggleSidebar}
              className="hidden md:block p-2 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <ChevronDoubleRightIcon className="h-5 w-5" />
              ) : (
                <ChevronDoubleLeftIcon className="h-5 w-5" />
              )}
            </button>

            {/* Page context (desktop) */}
            <div className="hidden md:flex items-baseline space-x-2 ml-3 min-w-0 flex-1">
              <span
                className={`text-lg font-extrabold truncate cursor-default ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                Parent Portal
              </span>
            </div>
          </div>

          {/* Search — icon opens modal */}
          <div className="flex items-center justify-end flex-1 min-w-0 mr-2">
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              title="Search"
              aria-label="Open search"
              className={`p-2 rounded-full transition-colors ${
                theme === "dark"
                  ? "text-gray-400 hover:text-white hover:bg-white/10"
                  : "text-gray-500 hover:text-gray-900 hover:bg-white/40"
              }`}
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Right icons */}
          <div className="flex items-center space-x-4 flex-shrink-0">
            <div className="flex items-center space-x-1">
              <ViewControls />
            </div>
            <Link
              to="/parent/notifications"
              className={`relative p-2 rounded-lg transition-colors ${
                theme === "dark"
                  ? "text-gray-400 hover:text-white hover:bg-white/10"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/40"
              }`}
            >
              <BellIcon className="h-5 w-5" />
            </Link>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${
                theme === "dark"
                  ? "text-gray-400 hover:text-white hover:bg-white/10"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/40"
              }`}
            >
              {theme === "dark" ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 app-main-safe p-4 md:p-6 lg:p-8 pb-24 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* ====== Search Modal ====== */}
      {searchModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 pt-24"
            onClick={closeSearchModal}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${
                theme === "dark"
                  ? "bg-gray-900/95 backdrop-blur-xl border border-white/10"
                  : "bg-white/95 backdrop-blur-xl border border-white/30"
              }`}
            >
              <div
                className={`flex items-center gap-3 px-4 py-3 border-b ${
                  theme === "dark" ? "border-white/10" : "border-gray-200"
                }`}
              >
                <MagnifyingGlassIcon
                  className={`h-5 w-5 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}
                />
                <input
                  ref={searchInputRef}
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleModalKeyDown}
                  placeholder="Search menus, pages, actions..."
                  className={`flex-1 bg-transparent text-base focus:outline-none ${
                    theme === "dark"
                      ? "text-white placeholder-gray-500"
                      : "text-gray-900 placeholder-gray-400"
                  }`}
                />
                <button
                  type="button"
                  onClick={closeSearchModal}
                  aria-label="Close search"
                  className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                    theme === "dark"
                      ? "text-gray-400 hover:text-white hover:bg-white/10"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  ESC
                </button>
              </div>
              {searchQuery.trim() !== "" && (
                <div className="max-h-80 overflow-y-auto">
                  {searchResults.length === 0 ? (
                    <div
                      className={`px-4 py-6 text-sm text-center ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
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
                              ? theme === "dark"
                                ? "bg-white/10"
                                : "bg-black/5"
                              : ""
                          } ${
                            theme === "dark"
                              ? "hover:bg-white/10 text-gray-200"
                              : "hover:bg-black/5 text-gray-800"
                          }`}
                        >
                          <item.icon
                            className={`h-5 w-5 ${
                              theme === "dark"
                                ? "text-gray-400"
                                : "text-gray-500"
                            }`}
                          />
                          <span className="text-sm">{item.name}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}

      {/* ====== MOBILE FLOATING BOTTOM NAV ====== */}
      <nav
        className={`md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 px-2 py-1.5 rounded-full shadow-2xl border backdrop-blur-xl transition-opacity duration-300 ${
          theme === "dark"
            ? "bg-gray-900/85 border-white/10"
            : "bg-white/90 border-gray-200/70"
        } ${sidebarVisible ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        aria-label="Quick navigation"
      >
        <Link
          to="/parent"
          className={`flex flex-col items-center gap-0.5 px-5 py-2 rounded-full transition-colors ${
            isActive("/parent")
              ? "bg-blue-600/15 text-blue-600 dark:text-blue-400"
              : theme === "dark"
                ? "text-gray-400 active:bg-white/10"
                : "text-gray-500 active:bg-gray-100"
          }`}
          aria-label="Dashboard"
        >
          <HomeIcon className="h-6 w-6" />
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        <span
          className={`h-8 w-px ${theme === "dark" ? "bg-white/10" : "bg-gray-200"}`}
        />
        <button
          onClick={openSidebar}
          className={`flex flex-col items-center gap-0.5 px-5 py-2 rounded-full transition-colors ${
            theme === "dark"
              ? "text-gray-400 active:bg-white/10"
              : "text-gray-500 active:bg-gray-100"
          }`}
          aria-label="Open menu"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          <span className="text-[10px] font-medium">Menu</span>
        </button>
        <span
          className={`h-8 w-px ${theme === "dark" ? "bg-white/10" : "bg-gray-200"}`}
        />
        <Link
          to="/parent/profile"
          className={`flex flex-col items-center gap-0.5 px-5 py-2 rounded-full transition-colors ${
            isActive("/parent/profile")
              ? "bg-blue-600/15 text-blue-600 dark:text-blue-400"
              : theme === "dark"
                ? "text-gray-400 active:bg-white/10"
                : "text-gray-500 active:bg-gray-100"
          }`}
          aria-label="My profile"
        >
          <UserCircleIcon className="h-6 w-6" />
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
        <span
          className={`h-8 w-px ${theme === "dark" ? "bg-white/10" : "bg-gray-200"}`}
        />
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className={`flex flex-col items-center gap-0.5 px-5 py-2 rounded-full transition-colors ${
            theme === "dark"
              ? "text-gray-400 active:bg-white/10"
              : "text-gray-500 active:bg-gray-100"
          }`}
          aria-label="Log out"
        >
          <ArrowLeftOnRectangleIcon className="h-6 w-6" />
          <span className="text-[10px] font-medium">Logout</span>
        </button>
      </nav>

      {/* ====== Logout confirmation ====== */}
      <LogoutConfirmModal
        open={showLogoutConfirm}
        theme={theme as "light" | "dark"}
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}
