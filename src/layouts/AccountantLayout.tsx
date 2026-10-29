import { useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import iconUrl from "../assets/smart edufy icon.png";
import logoDarkUrl from "../assets/smart edufy.png";
import logoLightUrl from "../assets/smart edufy II.png";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { effectivePrivileges, ALL_PRIVILEGES } from "../utils/privileges";
import LogoutConfirmModal from "../components/LogoutConfirmModal";
import { api } from "../utils/api";
import {
  HomeIcon,
  BanknotesIcon,
  ReceiptPercentIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  QuestionMarkCircleIcon,
  ArrowLeftOnRectangleIcon,
  BellIcon,
  Bars3Icon,
  XMarkIcon,
  AcademicCapIcon,
  UsersIcon,
  CubeIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  BookOpenIcon,
  ClockIcon,
  AdjustmentsHorizontalIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

// ---------- Accountant menus ----------
// Each item is tied to a page privilege key. The default accountant
// privileges (see SYSTEM_ROLE_PRIVILEGES in utils/privileges.ts) are:
//   fees, expenses, payroll   (Reports is intentionally NOT granted to
//   accountants — financial reports are restricted to admin/bursar roles)
// An admin can still grant extra privileges (e.g. reports) via
// User Management / Roles & Privileges, and the menu adapts automatically.
const menus: {
  name: string;
  href: string;
  icon: typeof HomeIcon;
  privilege: string;
  desc: string;
}[] = [
  {
    name: "Fees",
    href: "/accountant/fees",
    icon: BanknotesIcon,
    privilege: "fees",
    desc: "Fee structures, invoices & collections",
  },
  {
    name: "Expenses",
    href: "/accountant/expenses",
    icon: ReceiptPercentIcon,
    privilege: "expenses",
    desc: "Record & track school spending",
  },
  {
    name: "Payroll",
    href: "/accountant/payroll",
    icon: CurrencyDollarIcon,
    privilege: "payroll",
    desc: "Staff salaries & payment runs",
  },
];

// Always-available pages
const alwaysVisible = [
  {
    name: "Help",
    href: "/accountant/help",
    icon: QuestionMarkCircleIcon,
    privilege: undefined,
  },
];

// Icons for extra privileges an admin may grant beyond the finance defaults.
const EXTRA_PRIVILEGE_ICONS: Record<string, typeof HomeIcon> = {
  students: AcademicCapIcon,
  staff: UsersIcon,
  inventory: CubeIcon,
  reports: ChartBarIcon,
  messaging: ChatBubbleLeftRightIcon,
  "audit-logs": ClipboardDocumentListIcon,
  academic: CalendarDaysIcon,
  classes: AcademicCapIcon,
  subjects: BookOpenIcon,
  timetable: ClockIcon,
};

// Privileges that don't map to an accountant-portal or admin page link.
const NON_LINKABLE_PRIVILEGES = new Set([
  "fees", "expenses", "payroll", // already in the Finance section
  "reports",
  "settings", // admin-only
  "users", "roles", "question-review", // no standalone renderable page here
]);

/** Extra (non-finance) privileges the accountant holds → admin sidebar links. */
function extraMenus(privileges: string[]) {
  const seen = new Set(menus.map((m) => m.privilege));
  return ALL_PRIVILEGES.filter(
    (p) =>
      privileges.includes(p.key) &&
      !seen.has(p.key) &&
      !NON_LINKABLE_PRIVILEGES.has(p.key) &&
      (p.adminHref || p.href),
  ).map((p) => ({
    name: p.label,
    href: p.adminHref || p.href!,
    icon: EXTRA_PRIVILEGE_ICONS[p.key] || AdjustmentsHorizontalIcon,
    privilege: p.key,
    desc: p.group,
  }));
}

export default function AccountantLayout() {
  const { user, logout, token } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const userRoles = [...(user?.roles || []), user?.role].filter(
    Boolean,
  ) as string[];
  const privileges = effectivePrivileges({
    roles: userRoles,
    privileges: user?.privileges,
    allowedPages: user?.allowedPages,
  });

  const allowedMenus = menus.filter((m) => privileges.includes(m.privilege));
  const extraMenusList = extraMenus(privileges);

  // ---------- School name (top bar) ----------
  const { data: topBar } = useQuery({
    queryKey: ["accountant-topbar"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!token) return { schoolName: "" };
      const res = await api.get("/settings/general", token);
      const data = res.ok ? await res.json() : {};
      return { schoolName: (data.schoolName as string) || "", logoUrl: (data.logoUrl as string) || null };
    },
  });

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + "/");

  const handleLogoutConfirm = () => {
    setLogoutOpen(false);
    logout();
    navigate("/login");
  };

  const initials = (user?.name || "A").charAt(0).toUpperCase();
  const dark = theme === "dark";

  return (
    <div
      className={`min-h-screen ${dark ? "bg-gray-950 text-gray-100" : "bg-gray-100 text-gray-900"}`}
    >
      {/* ===== Sidebar ===== */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col transition-transform duration-300 md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${dark ? "bg-gray-900 border-r border-white/10" : "bg-white border-r border-gray-200"}`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 h-16 flex-shrink-0">
          <img
            src={dark ? logoDarkUrl : logoLightUrl}
            alt="SmartEdufy"
            className="h-10 w-auto object-contain flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="text-[11px] text-blue-500 font-semibold uppercase tracking-wider">
              Accounts Portal
            </p>
          </div>
          <button
            className="ml-auto md:hidden p-2 rounded-lg"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Menus */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p
            className={`px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider ${dark ? "text-gray-500" : "text-gray-400"}`}
          >
            Main
          </p>
          <Link
            to="/accountant"
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive("/accountant") && location.pathname === "/accountant"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : dark
                  ? "text-gray-300 hover:bg-white/5"
                  : "text-gray-600 hover:bg-blue-50 hover:text-blue-700"
            }`}
          >
            <HomeIcon className="h-5 w-5 flex-shrink-0" />
            Dashboard
          </Link>

          <p
            className={`px-3 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-wider ${dark ? "text-gray-500" : "text-gray-400"}`}
          >
            Finance
          </p>
          {allowedMenus.map((m) => (
            <Link
              key={m.name}
              to={m.href}
              onClick={() => setSidebarOpen(false)}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(m.href)
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : dark
                    ? "text-gray-300 hover:bg-white/5"
                    : "text-gray-600 hover:bg-blue-50 hover:text-blue-700"
              }`}
            >
              <m.icon
                className={`h-5 w-5 flex-shrink-0 ${isActive(m.href) ? "text-white" : "text-blue-500"}`}
              />
              <span className="flex-1">{m.name}</span>
              <ChevronRightIcon
                className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 ${isActive(m.href) ? "text-white/70" : dark ? "text-gray-600" : "text-gray-300"}`}
              />
            </Link>
          ))}

          {extraMenusList.length > 0 && (
            <>
              <p
                className={`px-3 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-wider ${dark ? "text-gray-500" : "text-gray-400"}`}
              >
                More
              </p>
              {extraMenusList.map((m) => (
                <Link
                  key={m.name}
                  to={m.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive(m.href)
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : dark
                        ? "text-gray-300 hover:bg-white/5"
                        : "text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  <m.icon
                    className={`h-5 w-5 flex-shrink-0 ${isActive(m.href) ? "text-white" : "text-blue-500"}`}
                  />
                  <span className="flex-1">{m.name}</span>
                  <ChevronRightIcon
                    className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 ${isActive(m.href) ? "text-white/70" : dark ? "text-gray-600" : "text-gray-300"}`}
                  />
                </Link>
              ))}
            </>
          )}

          <p
            className={`px-3 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-wider ${dark ? "text-gray-500" : "text-gray-400"}`}
          >
            System
          </p>
          {alwaysVisible.map((m) => (
            <Link
              key={m.name}
              to={m.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(m.href)
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                                     : dark
                                       ? "text-gray-300 hover:bg-white/5"
                                       : "text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                                 }`}
                               >
                                 <m.icon className="h-5 w-5 flex-shrink-0 text-blue-500" />
              {m.name}
            </Link>
          ))}
        </nav>

        {/* User footer */}
        <div
          className={`flex items-center gap-3 px-5 py-3.5 flex-shrink-0 border-t ${dark ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"}`}
        >
          <div className="h-9 w-9 flex items-center justify-center rounded-full text-sm font-bold text-white bg-gradient-to-br from-blue-500 to-indigo-600 flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">
              {user?.name || "Accountant"}
            </p>
            <p
              className={`text-xs truncate ${dark ? "text-gray-400" : "text-gray-500"}`}
            >
              {user?.email}
            </p>
          </div>
          <button
            onClick={() => setLogoutOpen(true)}
            className={`p-2.5 rounded-xl flex-shrink-0 ${dark ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-red-50 text-red-600 hover:bg-red-100"}`}
            title="Logout"
          >
            <ArrowLeftOnRectangleIcon className="h-5 w-5" />
          </button>
        </div>
      </aside>

      {/* ===== Main area ===== */}
      <div className="md:pl-72 flex flex-col min-h-screen">
        {/* Top bar */}
        <header
          className={`sticky top-0 z-30 flex h-16 items-center justify-between px-4 md:px-6 border-b backdrop-blur-xl ${
            dark
              ? "bg-gray-900/80 border-white/10"
              : "bg-white/80 border-gray-200"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="md:hidden p-2 rounded-lg hover:bg-black/5 flex-shrink-0"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            {/* Mobile brand icon (visible only on small screens) */}
            <img
              src={iconUrl}
              alt="SmartEdufy"
              className="md:hidden h-9 w-9 rounded-xl object-contain flex-shrink-0"
              draggable={false}
            />
            <div className="flex items-center gap-2 min-w-0">
              {topBar?.logoUrl && (
                <img
                  src={topBar.logoUrl}
                  alt="School logo"
                  className="h-8 w-8 rounded-full object-cover flex-shrink-0 ring-1 ring-black/10 dark:ring-white/10"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight truncate">
                  {topBar?.schoolName || "Accounts Dashboard"}
                </p>
                <p
                  className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}
                >
                {allowedMenus.length + extraMenusList.length} module
                {allowedMenus.length + extraMenusList.length === 1 ? "" : "s"} unlocked for your role
              </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/accountant/notifications"
              className={`relative p-2.5 rounded-xl transition-colors ${dark ? "hover:bg-white/10" : "hover:bg-gray-100"}`}
              title="Notifications"
            >
              <BellIcon className="h-5 w-5" />
            </Link>
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl transition-colors ${dark ? "hover:bg-white/10" : "hover:bg-gray-100"}`}
              title="Toggle theme"
            >
              {dark ? "☀️" : "🌙"}
            </button>
            <Link
              to="/accountant/profile"
              className={`flex items-center gap-2 rounded-full pl-1 pr-3 py-1 transition-colors ${dark ? "hover:bg-white/10" : "hover:bg-gray-100"}`}
              title="My profile"
            >
              <span className="h-8 w-8 flex items-center justify-center rounded-full text-sm font-bold text-white bg-gradient-to-br from-blue-500 to-indigo-600">
                {initials}
              </span>
              <span className="hidden sm:block text-sm font-medium">
                {user?.name?.split(" ")[0]}
              </span>
            </Link>
          </div>
        </header>

        {/* Routed page */}
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      <LogoutConfirmModal open={logoutOpen} onConfirm={handleLogoutConfirm} onCancel={() => setLogoutOpen(false)} theme={theme} />
    </div>
  );
}
