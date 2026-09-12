import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AcademicCapIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChevronRightIcon,
  MapPinIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  useParentChildren,
  useChildStats,
  type Child,
} from "../../hooks/useParentData";
import AddChildCard from "../../components/parent/AddChildCard";

/* ---------- Small building blocks ---------- */

function Ring({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col items-center">
      <svg className="h-20 w-20 -rotate-90">
        <circle
          cx="40"
          cy="40"
          r={r}
          strokeWidth="7"
          className="stroke-gray-200 dark:stroke-gray-700"
          fill="none"
        />
        <circle
          cx="40"
          cy="40"
          r={r}
          strokeWidth="7"
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text
          x="40"
          y="46"
          textAnchor="middle"
          className="rotate-90 fill-gray-900 dark:fill-white text-sm font-bold"
          transform="rotate(90 40 40)"
        >
          {Math.round(pct)}%
        </text>
      </svg>
      <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>
    </div>
  );
}

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-2.5 mt-5">
      <h2 className="text-[15px] font-bold text-gray-900 dark:text-white">
        {title}
      </h2>
      {action}
    </div>
  );
}

/* ---------- Page ---------- */

export default function ParentOverview() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const navigate = useNavigate();
  const isDark = theme === "dark";
  const { data, isLoading } = useParentChildren(token);
  const children = data?.children ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddChild, setShowAddChild] = useState(false);
  const selected: Child | undefined = useMemo(
    () => children.find((c) => c.id === selectedId) ?? children[0],
    [children, selectedId],
  );
  const { data: stats, isLoading: statsLoading } = useChildStats(
    selected,
    token,
  );

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="h-10 w-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          Loading dashboard…
        </p>
      </div>
    );
  }

  // ===== Onboarding: no linked children yet → "Add Your Child" card =====
  if (children.length === 0) {
    return (
      <div className="space-y-4">
        <AddChildCard isOnboarding />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Greeting card */}
      <div
        className={`rounded-3xl p-5 shadow-lg ${
          isDark
            ? "bg-gradient-to-br from-gray-800 via-gray-900 to-blue-950 border border-white/10"
            : "bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700"
        }`}
      >
        <p className={`text-xs ${isDark ? "text-gray-400" : "text-blue-100"}`}>
          {greeting} 👋
        </p>
        <h2
          className={`mt-0.5 text-xl font-bold ${isDark ? "text-white" : "text-white"}`}
        >
          {data?.parent?.name || "Parent"}
        </h2>
        <div
          className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${isDark ? "bg-white/10 text-gray-300" : "bg-white/15 text-white"}`}
        >
          <MapPinIcon className="h-3.5 w-3.5" />
          {children.length} {children.length === 1 ? "child" : "children"}{" "}
          enrolled
        </div>
      </div>

      {/* Child switcher chips */}
      <SectionHeader
        title="My Children"
        action={
          <button
            onClick={() => setShowAddChild((v) => !v)}
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full transition-colors ${
              isDark
                ? "bg-blue-500/15 text-blue-300 hover:bg-blue-500/25"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
          >
            <UserPlusIcon className="h-3.5 w-3.5" />
            Add Another Child
          </button>
        }
      />
      {showAddChild && (
        <div className="mb-4">
          <AddChildCard onLinked={() => setShowAddChild(false)} />
        </div>
      )}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
        {children.map((child) => {
          const active = selected?.id === child.id;
          return (
            <button
              key={child.id}
              onClick={() => setSelectedId(child.id)}
              className={`shrink-0 flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-full border active:scale-95 transition-all ${
                active
                  ? isDark
                    ? "bg-blue-500/20 border-blue-500/40 text-blue-100 shadow-lg shadow-blue-500/10"
                    : "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20"
                  : isDark
                    ? "bg-gray-900 border-white/10 text-gray-300 hover:border-white/20 hover:text-white"
                    : "bg-white border-gray-200 text-gray-700 shadow-sm hover:border-blue-200 hover:text-blue-900"
              }`}
            >
              <span
                className={`h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  child.gender === "female"
                    ? isDark
                      ? "bg-pink-500/20 text-pink-300"
                      : "bg-pink-100 text-pink-600"
                    : isDark
                      ? "bg-blue-500/20 text-blue-300"
                      : "bg-blue-100 text-blue-600"
                }`}
              >
                {child.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="text-sm font-semibold whitespace-nowrap">
                {child.name.split(" ")[0]}
              </span>
            </button>
          );
        })}
        {children.length === 0 && (
          <p
            className={`text-sm py-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}
          >
            No children linked to your account yet. Contact the school office.
          </p>
        )}
      </div>

      {/* Stats rings + fee summary for selected child */}
      {selected && (
        <div
          className={`mt-4 rounded-3xl p-4 border ${
            isDark
              ? "bg-gray-900/70 border-white/10"
              : "bg-white border-gray-200 shadow-sm"
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <span
              className={`h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold ${
                selected.gender === "female"
                  ? isDark
                    ? "bg-pink-500/20 text-pink-300"
                    : "bg-pink-100 text-pink-600"
                  : isDark
                    ? "bg-blue-500/20 text-blue-300"
                    : "bg-blue-100 text-blue-600"
              }`}
            >
              {selected.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="flex-1 min-w-0">
              <p
                className={`font-bold truncate ${isDark ? "text-white" : "text-gray-900"}`}
              >
                {selected.name}
              </p>
              <p
                className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}
              >
                {selected.class?.name || "No class"}
                {selected.arm?.letter ? ` · Arm ${selected.arm.letter}` : ""}
                {selected.admissionNumber
                  ? ` · ${selected.admissionNumber}`
                  : ""}
              </p>
            </div>
            <button
              onClick={() => navigate(`/parent/children/${selected.id}`)}
              className={`p-2 rounded-full active:scale-90 transition-transform ${isDark ? "text-gray-400 bg-white/5" : "text-gray-400 bg-gray-50"}`}
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>

          {statsLoading ? (
            <div className="flex justify-center py-6">
              <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="flex items-center justify-around py-2">
              <Ring
                value={stats?.attendanceRate ?? 0}
                label="Attendance"
                color="#3b82f6"
              />
              <Ring
                value={stats?.averageScore ?? 0}
                label="Average"
                color="#8b5cf6"
              />
              <Ring
                value={
                  stats?.feeTotal
                    ? Math.round((stats.feePaid / stats.feeTotal) * 100)
                    : 100
                }
                label="Fees paid"
                color="#10b981"
              />
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <SectionHeader
        title="Quick Actions"
        action={
          <span
            className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}
          >
            Tap to open
          </span>
        }
      />
      <div className="grid grid-cols-4 gap-2.5">
        {[
          {
            label: "Results",
            icon: ChartBarIcon,
            to: `/parent/children/${selected?.id ?? ""}`,
          },
          { label: "Fees", icon: BanknotesIcon, to: "/parent/fees" },
          {
            label: "Attendance",
            icon: CalendarDaysIcon,
            to: `/parent/children/${selected?.id ?? ""}`,
          },
          { label: "Messages", icon: AcademicCapIcon, to: "/parent/messages" },
        ].map((a) => (
          <Link
            key={a.label}
            to={a.to}
            className={`flex flex-col items-center gap-1.5 py-3.5 rounded-2xl border active:scale-95 transition-transform ${
              isDark
                ? "bg-gray-900/70 border-white/10"
                : "bg-white border-gray-200 shadow-sm"
            }`}
          >
            <span
              className={`h-10 w-10 rounded-xl flex items-center justify-center ${isDark ? "bg-blue-500/15" : "bg-blue-50"}`}
            >
              <a.icon
                className={`h-5 w-5 ${isDark ? "text-blue-300" : "text-blue-600"}`}
              />
            </span>
            <span
              className={`text-[11px] font-semibold ${isDark ? "text-gray-300" : "text-gray-600"}`}
            >
              {a.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Recent subject scores */}
      {selected && stats && stats.recentResults.length > 0 && (
        <>
          <SectionHeader
            title="Latest Subject Scores"
            action={
              <Link
                to={`/parent/children/${selected.id}`}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400"
              >
                See all
              </Link>
            }
          />
          <div
            className={`rounded-3xl border overflow-hidden ${
              isDark
                ? "bg-gray-900/70 border-white/10"
                : "bg-white border-gray-200 shadow-sm"
            }`}
          >
            {stats.recentResults.map((r, i) => (
              <div
                key={r.subject}
                className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? (isDark ? "border-t border-white/5" : "border-t border-gray-100") : ""}`}
              >
                <span
                  className={`h-9 w-9 rounded-xl flex items-center justify-center text-[11px] font-bold ${isDark ? "bg-white/5 text-gray-300" : "bg-gray-100 text-gray-600"}`}
                >
                  {r.subject.slice(0, 2).toUpperCase()}
                </span>
                <p
                  className={`flex-1 text-sm font-medium truncate ${isDark ? "text-gray-200" : "text-gray-800"}`}
                >
                  {r.subject}
                </p>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    r.score >= 70
                      ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      : r.score >= 50
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                  }`}
                >
                  {r.score}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Fee balance callout */}
      {selected && stats && stats.feeBalance > 0 && (
        <button
          onClick={() => navigate("/parent/fees")}
          className={`mt-5 w-full flex items-center gap-3 rounded-3xl p-4 border text-left active:scale-[0.98] transition-transform ${
            isDark
              ? "bg-red-900/20 border-red-500/30"
              : "bg-red-50 border-red-200"
          }`}
        >
          <span
            className={`h-11 w-11 rounded-2xl flex items-center justify-center ${isDark ? "bg-red-500/15" : "bg-red-100"}`}
          >
            <BanknotesIcon
              className={`h-5 w-5 ${isDark ? "text-red-300" : "text-red-600"}`}
            />
          </span>
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-bold ${isDark ? "text-red-200" : "text-red-700"}`}
            >
              Outstanding fees for {selected.name.split(" ")[0]}
            </p>
            <p
              className={`text-xs ${isDark ? "text-red-300/80" : "text-red-600/80"}`}
            >
              ₦{stats.feeBalance.toLocaleString()} remaining — tap to view
            </p>
          </div>
          <ChevronRightIcon
            className={`h-5 w-5 ${isDark ? "text-red-300" : "text-red-500"}`}
          />
        </button>
      )}
    </div>
  );
}
