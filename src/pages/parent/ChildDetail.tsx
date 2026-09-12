import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeftIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  useParentChildren,
  useChildStats,
  type Child,
} from "../../hooks/useParentData";

type Tab = "attendance" | "results" | "fees";

const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "attendance", label: "Attendance", icon: CalendarDaysIcon },
  { key: "results", label: "Results", icon: ChartBarIcon },
  { key: "fees", label: "Fees", icon: BanknotesIcon },
];

export default function ParentChildDetail() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const navigate = useNavigate();
  const { childId } = useParams<{ childId: string }>();
  const isDark = theme === "dark";
  const { data, isLoading } = useParentChildren(token);
  const child = useMemo(
    () => data?.children.find((c: Child) => c.id === childId),
    [data, childId],
  );
  const [tab, setTab] = useState<Tab>("attendance");

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="h-10 w-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          Loading…
        </p>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <ExclamationTriangleIcon
          className={`h-10 w-10 ${isDark ? "text-gray-500" : "text-gray-400"}`}
        />
        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          Child not found or not linked to your account.
        </p>
        <button
          onClick={() => navigate("/parent/children")}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all"
        >
          Back to children
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => navigate("/parent/children")}
        className={`flex items-center gap-1 text-sm font-semibold mb-3 active:scale-95 transition-transform ${
          isDark ? "text-gray-300" : "text-gray-600"
        }`}
      >
        <ChevronLeftIcon className="h-5 w-5" />
        Back
      </button>

      {/* Profile header card */}
      <div
        className={`rounded-3xl p-5 mb-4 border ${
          isDark
            ? "bg-gray-900/70 border-white/10"
            : "bg-white border-gray-200 shadow-sm"
        }`}
      >
        <div className="flex items-center gap-4">
          <span
            className={`h-16 w-16 rounded-2xl flex items-center justify-center text-lg font-bold ${
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
          <div className="min-w-0">
            <h1
              className={`text-lg font-bold truncate ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              {child.name}
            </h1>
            <p
              className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              {child.class?.name || "No class"}
              {child.arm?.letter ? ` · Arm ${child.arm.letter}` : ""}
            </p>
            {child.admissionNumber && (
              <p
                className={`text-[11px] mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}
              >
                Adm. No: {child.admissionNumber}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Segmented tabs (app-style) */}
      <div
        className={`flex p-1 rounded-2xl mb-4 ${
          isDark ? "bg-white/5" : "bg-gray-100"
        }`}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
              tab === t.key
                ? isDark
                  ? "bg-gray-800 text-white shadow"
                  : "bg-white text-blue-600 shadow-sm"
                : isDark
                  ? "text-gray-400"
                  : "text-gray-500"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <ChildTabContent child={child} tab={tab} token={token} isDark={isDark} />
    </div>
  );
}

function ChildTabContent({
  child,
  tab,
  token,
  isDark,
}: {
  child: Child;
  tab: Tab;
  token?: string | null;
  isDark: boolean;
}) {
  const { data: stats, isLoading } = useChildStats(child, token);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!stats) return null;

  if (tab === "attendance") {
    return (
      <div className="space-y-3">
        <SummaryGrid
          items={[
            { label: "Attendance rate", value: `${stats.attendanceRate}%` },
            {
              label: "Present",
              value: String(stats.attendanceSummary.present),
            },
            { label: "Absent", value: String(stats.attendanceSummary.absent) },
            {
              label: "Total days",
              value: String(stats.attendanceSummary.total),
            },
          ]}
          isDark={isDark}
        />
        <p
          className={`text-center text-xs py-6 ${
            isDark ? "text-gray-500" : "text-gray-400"
          }`}
        >
          Detailed daily attendance records coming soon.
        </p>
      </div>
    );
  }

  if (tab === "results") {
    return (
      <div className="space-y-3">
        <SummaryGrid
          items={[
            { label: "Average score", value: `${stats.averageScore}%` },
            { label: "Subjects", value: String(stats.recentResults.length) },
          ]}
          isDark={isDark}
        />
        <div className="space-y-2">
          {stats.recentResults.map((r) => (
            <div
              key={r.subject}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${
                isDark
                  ? "bg-gray-900/70 border-white/10"
                  : "bg-white border-gray-200 shadow-sm"
              }`}
            >
              <span
                className={`flex-1 text-sm font-medium truncate ${
                  isDark ? "text-gray-200" : "text-gray-700"
                }`}
              >
                {r.subject}
              </span>
              <span
                className={`text-sm font-bold ${
                  r.score >= 50
                    ? isDark
                      ? "text-green-400"
                      : "text-green-600"
                    : isDark
                      ? "text-red-400"
                      : "text-red-600"
                }`}
              >
                {r.score}%
              </span>
            </div>
          ))}
          {stats.recentResults.length === 0 && (
            <p
              className={`py-8 text-center text-sm ${
                isDark ? "text-gray-500" : "text-gray-400"
              }`}
            >
              No results published yet.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Fees
  const balance = stats.feeBalance;
  return (
    <div className="space-y-3">
      <div
        className={`rounded-3xl p-5 border ${
          balance > 0
            ? isDark
              ? "bg-red-900/20 border-red-500/20"
              : "bg-red-50 border-red-100"
            : isDark
              ? "bg-green-900/20 border-green-500/20"
              : "bg-green-50 border-green-100"
        }`}
      >
        <p
          className={`text-xs font-medium uppercase tracking-wide ${
            isDark ? "text-gray-400" : "text-gray-500"
          }`}
        >
          Outstanding balance
        </p>
        <p
          className={`mt-1 text-2xl font-bold ${
            balance > 0
              ? isDark
                ? "text-red-300"
                : "text-red-600"
              : isDark
                ? "text-green-400"
                : "text-green-600"
          }`}
        >
          {balance > 0 ? `₦${balance.toLocaleString()}` : "Fully paid ✓"}
        </p>
        <div
          className={`mt-3 pt-3 flex gap-6 text-xs border-t ${
            isDark
              ? "border-white/10 text-gray-400"
              : "border-black/5 text-gray-500"
          }`}
        >
          <span>
            Total billed:{" "}
            <b className={isDark ? "text-gray-200" : "text-gray-700"}>
              ₦{stats.feeTotal.toLocaleString()}
            </b>
          </span>
          <span>
            Paid:{" "}
            <b className={isDark ? "text-gray-200" : "text-gray-700"}>
              ₦{stats.feePaid.toLocaleString()}
            </b>
          </span>
        </div>
      </div>
      <p
        className={`text-center text-xs py-6 ${
          isDark ? "text-gray-500" : "text-gray-400"
        }`}
      >
        Detailed fee breakdown coming soon.
      </p>
    </div>
  );
}

function SummaryGrid({
  items,
  isDark,
}: {
  items: { label: string; value: string }[];
  isDark: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((it) => (
        <div
          key={it.label}
          className={`rounded-2xl p-4 border ${
            isDark
              ? "bg-gray-900/70 border-white/10"
              : "bg-white border-gray-200 shadow-sm"
          }`}
        >
          <p
            className={`text-[10px] font-medium uppercase tracking-wide ${
              isDark ? "text-gray-500" : "text-gray-400"
            }`}
          >
            {it.label}
          </p>
          <p
            className={`mt-1 text-xl font-bold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            {it.value}
          </p>
        </div>
      ))}
    </div>
  );
}
