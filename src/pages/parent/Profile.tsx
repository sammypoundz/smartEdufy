// Parent profile page — mobile-app style, mirrors the More page look.
import { useNavigate } from "react-router-dom";
import {
  ChevronRightIcon,
  EnvelopeIcon,
  PhoneIcon,
  UserCircleIcon,
  ArrowLeftOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";
import { useState } from "react";
import { api } from "../../utils/api";
import { unwrapRes } from "../../hooks/queryHelpers";
import { useQuery } from "@tanstack/react-query";

interface ParentProfileData {
  name?: string;
  email?: string;
  phone?: string;
  children?: { id: string; name?: string; class?: string }[];
}

export default function ParentProfile() {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isDark = theme === "dark";
  const [logoutOpen, setLogoutOpen] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["parent-profile"],
    queryFn: () =>
      unwrapRes<ParentProfileData>(
        api.get("/parents/me").catch(() => api.get("/auth/me")),
      ),
    retry: false,
  });

  const profile = profileQuery.data || {};
  const name = profile.name || user?.name || "Parent";
  const email = profile.email || user?.email || "";
  const initials = name.slice(0, 1).toUpperCase();

  const doLogout = async () => {
    setLogoutOpen(false);
    await logout();
    navigate("/", { replace: true });
  };

  const card = isDark
    ? "bg-gray-900/70 border-white/10"
    : "bg-white border-gray-200 shadow-sm";
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-gray-400" : "text-gray-500";

  const rows: { label: string; value: string; icon: React.ReactNode }[] = [
    {
      label: "Email",
      value: email,
      icon: <EnvelopeIcon className="h-5 w-5" />,
    },
    ...(profile.phone
      ? [
          {
            label: "Phone",
            value: profile.phone,
            icon: <PhoneIcon className="h-5 w-5" />,
          },
        ]
      : []),
  ];

  return (
    <div className="max-w-lg mx-auto">
      <h1
        className={`text-xl font-bold mb-4 ${
          isDark ? "text-white" : "text-gray-900"
        }`}
      >
        My Profile
      </h1>

      {/* Profile header card */}
      <div
        className={`flex flex-col items-center gap-2 rounded-3xl p-6 border mb-4 ${card}`}
      >
        <span
          className={`h-20 w-20 rounded-full flex items-center justify-center text-2xl font-bold ${
            isDark
              ? "bg-gradient-to-br from-blue-500 to-indigo-500 text-white"
              : "bg-gradient-to-br from-blue-600 to-indigo-600 text-white"
          }`}
        >
          {initials}
        </span>
        <p className={`text-lg font-bold ${textPrimary}`}>{name}</p>
        <p className={`text-xs ${textSecondary}`}>Parent account</p>
      </div>

      {/* Contact details */}
      <div
        className={`rounded-3xl border overflow-hidden divide-y mb-4 ${card} ${
          isDark ? "divide-white/5" : "divide-gray-100"
        }`}
      >
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3 px-4 py-4">
            <span
              className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                isDark
                  ? "bg-blue-500/15 text-blue-400"
                  : "bg-blue-100 text-blue-600"
              }`}
            >
              {row.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`text-xs ${textSecondary}`}>{row.label}</p>
              <p className={`text-sm font-semibold truncate ${textPrimary}`}>
                {row.value || "—"}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Children summary */}
      {profile.children?.length ? (
        <div
          className={`rounded-3xl border overflow-hidden divide-y mb-4 ${card} ${
            isDark ? "divide-white/5" : "divide-gray-100"
          }`}
        >
          <p
            className={`px-4 pt-4 pb-2 text-xs font-bold uppercase tracking-wider ${textSecondary}`}
          >
            My children ({profile.children.length})
          </p>
          {profile.children.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                  isDark
                    ? "bg-gray-500/15 text-gray-400"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <UserCircleIcon className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${textPrimary}`}>
                  {c.name || "Child"}
                </p>
                {c.class && (
                  <p className={`text-xs ${textSecondary}`}>{c.class}</p>
                )}
              </div>
              <ChevronRightIcon
                className={`h-4 w-4 ${
                  isDark ? "text-gray-600" : "text-gray-400"
                }`}
              />
            </div>
          ))}
        </div>
      ) : null}

      {/* Logout */}
      <button
        onClick={() => setLogoutOpen(true)}
        className={`mt-2 w-full flex items-center justify-center gap-2 py-4 rounded-3xl text-sm font-bold text-red-600 dark:text-red-400 border active:scale-[0.98] transition-transform ${
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
