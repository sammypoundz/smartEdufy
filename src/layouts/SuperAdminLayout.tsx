// Super Admin console layout — collapsible sidebar, sticky top bar, Module 15.
import { useState, useEffect, useRef } from "react";
import logoUrl from "../assets/smart edufy icon.png";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { usePlatformAuth } from "../contexts/PlatformAuthContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  HomeIcon,
  BuildingOffice2Icon,
  UsersIcon,
  CreditCardIcon,
  BanknotesIcon,
  WalletIcon,
  ChartBarIcon,
  ServerStackIcon,
  BellIcon,
  DocumentChartBarIcon,
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
  CogIcon,
  Bars3Icon,
  ChevronDoubleLeftIcon,
  SunIcon,
  MoonIcon,
  ArrowLeftOnRectangleIcon,
  Squares2X2Icon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";

const categories = [
  {
    name: "Overview",
    items: [
      { name: "Dashboard", href: "/platform", icon: HomeIcon },
      {
        name: "Growth Analytics",
        href: "/platform/growth",
        icon: ChartBarIcon,
      },
    ],
  },
  {
    name: "Platform Management",
    items: [
      { name: "Schools", href: "/platform/schools", icon: BuildingOffice2Icon },
      { name: "Students & Staff", href: "/platform/people", icon: UsersIcon },
      {
        name: "AI Onboarding Center",
        href: "/platform/onboarding",
        icon: AcademicCapIcon,
      },
    ],
  },
  {
    name: "Financial Management",
    items: [
      {
        name: "Subscriptions",
        href: "/platform/subscriptions",
        icon: CreditCardIcon,
      },
      {
        name: "Revenue & Finance",
        href: "/platform/revenue",
        icon: BanknotesIcon,
      },
      {
        name: "School Fee Analytics",
        href: "/platform/fees",
        icon: Squares2X2Icon,
      },
      { name: "Edufy Wallet", href: "/platform/wallets", icon: WalletIcon },
    ],
  },
  {
    name: "Operations",
    items: [
      {
        name: "System Health",
        href: "/platform/system",
        icon: ServerStackIcon,
      },
      {
        name: "Sync Monitoring",
        href: "/platform/sync",
        icon: ServerStackIcon,
      },
      {
        name: "Notifications",
        href: "/platform/notifications",
        icon: BellIcon,
      },
      {
        name: "Reports",
        href: "/platform/reports",
        icon: DocumentChartBarIcon,
      },
    ],
  },
  {
    name: "Administration",
    items: [
      { name: "Super Admin Users", href: "/platform/users", icon: UsersIcon },
      {
        name: "Roles & Permissions",
        href: "/platform/roles",
        icon: ShieldCheckIcon,
      },
      {
        name: "Audit Logs",
        href: "/platform/audit",
        icon: ClipboardDocumentListIcon,
      },
      { name: "Settings", href: "/platform/settings", icon: CogIcon },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  FINANCE_ADMIN: "Finance Administrator",
  ONBOARDING_OFFICER: "Onboarding Officer",
  SUPPORT_OFFICER: "Customer Support Officer",
  ANALYTICS_VIEWER: "Analytics Viewer",
};

export default function SuperAdminLayout() {
  const { user, logout } = usePlatformAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isActive = (href: string) => {
    if (href === "/platform") return location.pathname === "/platform";
    return location.pathname.startsWith(href);
  };

  const dark = theme === "dark";

  return (
    <div
      className={`min-h-screen ${
        dark ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-900"
      }`}
    >
      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 ${
          collapsed ? "w-20" : "w-64"
        } ${
          dark
            ? "bg-gray-900 border-r border-gray-800"
            : "bg-white border-r border-gray-200"
        } shadow-lg ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
          {!collapsed ? (
            <Link to="/platform" className="flex items-center gap-2.5 min-w-0">
              <img
                src={logoUrl}
                alt="SmartEdufy"
                className="h-9 w-9 rounded-lg object-contain"
              />
              <span className="font-extrabold tracking-tight text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent truncate">
                SmartEdufy
              </span>
            </Link>
          ) : (
            <Link to="/platform" title="SmartEdufy">
              <img
                src={logoUrl}
                alt="SmartEdufy"
                className="h-14 w-14 rounded-xl object-contain"
              />
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:block p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            title={collapsed ? "Expand" : "Collapse"}
          >
            <ChevronDoubleLeftIcon
              className={`w-5 h-5 transition-transform ${
                collapsed ? "rotate-180" : ""
              }`}
            />
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {categories.map((cat) => (
            <div key={cat.name} className="mb-2">
              {!collapsed && (
                <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {cat.name}
                </p>
              )}
              {cat.items.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  title={item.name}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                      : dark
                      ? "text-gray-300 hover:bg-gray-800 hover:text-white"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span className="truncate">{item.name}</span>}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={() => {
              logout();
              navigate("/platform/login");
            }}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
              dark
                ? "text-gray-300 hover:bg-gray-800"
                : "text-gray-600 hover:bg-red-50 hover:text-red-600"
            }`}
          >
            <ArrowLeftOnRectangleIcon className="w-5 h-5" />
            {!collapsed && "Sign Out"}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <div
        className={`transition-all duration-300 ${
          collapsed ? "md:pl-20" : "md:pl-64"
        }`}
      >
        {/* Sticky top bar */}
        <header
          className={`sticky top-0 z-20 h-16 flex items-center gap-3 px-4 md:px-6 border-b ${
            dark
              ? "bg-gray-900/80 backdrop-blur border-gray-800"
              : "bg-white/80 backdrop-blur border-gray-200"
          }`}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
          <Link to="/platform" className="flex items-center gap-2.5 min-w-0">
            <img
              src={logoUrl}
              alt="SmartEdufy"
              className="h-8 w-8 rounded-lg object-contain md:hidden"
            />
            <h1 className="font-bold text-lg truncate">Super Admin Console</h1>
          </Link>
          <div className="flex-1" />
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Toggle theme"
          >
            {dark ? (
              <SunIcon className="w-5 h-5" />
            ) : (
              <MoonIcon className="w-5 h-5" />
            )}
          </button>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold">{user?.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-blue-500 font-bold">
                {ROLE_LABELS[user?.role || ""] || user?.role}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold">
              {user?.name?.slice(0, 1).toUpperCase() || "S"}
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6 max-w-[1600px] mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
