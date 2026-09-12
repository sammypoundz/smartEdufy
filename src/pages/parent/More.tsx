import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftOnRectangleIcon,
  BellIcon,
  ChevronRightIcon,
  CircleStackIcon,
  MoonIcon,
  QuestionMarkCircleIcon,
  SunIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";

export default function ParentMore() {
  const { theme, toggleTheme } = useTheme();
  const { token, user, logout } = useAuth();
  void token;
  const navigate = useNavigate();
  const isDark = theme === "dark";
  const [logoutOpen, setLogoutOpen] = useState(false);

  const doLogout = async () => {
    setLogoutOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  const items = [
    {
      icon: <UserCircleIcon className="h-5 w-5" />,
      label: "My profile",
      tint: "blue",
      onClick: () => navigate("/parent/profile"),
    },
    {
      icon: <BellIcon className="h-5 w-5" />,
      label: "Notifications",
      tint: "amber",
      onClick: () => navigate("/parent/notifications"),
    },
    {
      icon: <QuestionMarkCircleIcon className="h-5 w-5" />,
      label: "Help & support",
      tint: "violet",
      onClick: () => navigate("/parent/support"),
    },
  ] as const;

  const tints: Record<string, string> = {
    blue: isDark ? "bg-blue-500/15 text-blue-400" : "bg-blue-100 text-blue-600",
    amber: isDark
      ? "bg-amber-500/15 text-amber-400"
      : "bg-amber-100 text-amber-600",
    violet: isDark
      ? "bg-violet-500/15 text-violet-400"
      : "bg-violet-100 text-violet-600",
    emerald: isDark
      ? "bg-emerald-500/15 text-emerald-400"
      : "bg-emerald-100 text-emerald-600",
  };

  return (
    <div>
      <h1
        className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}
      >
        More
      </h1>

      {/* Profile card */}
      <div
        className={`flex items-center gap-3 rounded-3xl p-4 border mb-4 ${
          isDark
            ? "bg-gray-900/70 border-white/10"
            : "bg-white border-gray-200 shadow-sm"
        }`}
      >
        <span
          className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold ${tints.blue}`}
        >
          {(user?.name ?? "P").slice(0, 1).toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <p
            className={`font-bold truncate ${isDark ? "text-white" : "text-gray-900"}`}
          >
            {user?.name ?? "Parent"}
          </p>
          <p
            className={`text-xs truncate ${isDark ? "text-gray-400" : "text-gray-500"}`}
          >
            {user?.email ?? ""}
          </p>
        </div>
      </div>

      {/* Menu list */}
      <div
        className={`rounded-3xl border overflow-hidden divide-y ${
          isDark
            ? "bg-gray-900/70 border-white/10 divide-white/5"
            : "bg-white border-gray-200 shadow-sm divide-gray-100"
        }`}
      >
        {items.map((item) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-black/5 dark:active:bg-white/5 transition-colors"
          >
            <span
              className={`h-9 w-9 rounded-xl flex items-center justify-center ${tints[item.tint]}`}
            >
              {item.icon}
            </span>
            <span
              className={`flex-1 text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}
            >
              {item.label}
            </span>
            <ChevronRightIcon
              className={`h-4 w-4 ${isDark ? "text-gray-600" : "text-gray-400"}`}
            />
          </button>
        ))}

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-black/5 dark:active:bg-white/5 transition-colors"
        >
          <span
            className={`h-9 w-9 rounded-xl flex items-center justify-center ${tints.emerald}`}
          >
            {isDark ? (
              <MoonIcon className="h-5 w-5" />
            ) : (
              <SunIcon className="h-5 w-5" />
            )}
          </span>
          <span
            className={`flex-1 text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}
          >
            {isDark ? "Dark mode" : "Light mode"}
          </span>
          <span
            className={`relative h-6 w-11 rounded-full transition-colors ${isDark ? "bg-blue-600" : "bg-gray-300"}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                isDark ? "left-[22px]" : "left-0.5"
              }`}
            />
          </span>
        </button>

        {/* Cache clear (optional util) */}
        <button
          onClick={() => navigate(0)}
          className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-black/5 dark:active:bg-white/5 transition-colors"
        >
          <span
            className={`h-9 w-9 rounded-xl flex items-center justify-center ${isDark ? "bg-gray-500/15 text-gray-400" : "bg-gray-100 text-gray-600"}`}
          >
            <CircleStackIcon className="h-5 w-5" />
          </span>
          <span
            className={`flex-1 text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}
          >
            Refresh app data
          </span>
          <ChevronRightIcon
            className={`h-4 w-4 ${isDark ? "text-gray-600" : "text-gray-400"}`}
          />
        </button>
      </div>

      {/* Logout */}
      <button
        onClick={() => setLogoutOpen(true)}
        className={`mt-4 w-full flex items-center justify-center gap-2 py-4 rounded-3xl text-sm font-bold text-red-600 dark:text-red-400 border active:scale-[0.98] transition-transform ${
          isDark
            ? "bg-red-500/10 border-red-500/20"
            : "bg-red-50 border-red-100"
        }`}
      >
        <ArrowLeftOnRectangleIcon className="h-5 w-5" />
        Log out
      </button>

      <LogoutConfirmModal
        open={logoutOpen}
        onConfirm={doLogout}
        onCancel={() => setLogoutOpen(false)}
        theme={theme}
      />
    </div>
  );
}
