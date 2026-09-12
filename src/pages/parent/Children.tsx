import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AcademicCapIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useParentChildren, useChildStats } from "../../hooks/useParentData";

export default function ParentChildren() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const navigate = useNavigate();
  const isDark = theme === "dark";
  const { data, isLoading } = useParentChildren(token);
  const children = data?.children ?? [];
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      children.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          (c.class?.name ?? "").toLowerCase().includes(query.toLowerCase()),
      ),
    [children, query],
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="h-10 w-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          Loading children…
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 md:px-0 md:py-0">
      <h1
        className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}
      >
        My Children
      </h1>

      {/* Search */}
      <div
        className={`flex items-center gap-2 px-4 py-3 rounded-2xl border mb-4 ${
          isDark
            ? "bg-gray-900/70 border-white/10"
            : "bg-white border-gray-200 shadow-sm"
        }`}
      >
        <MagnifyingGlassIcon
          className={`h-5 w-5 ${isDark ? "text-gray-500" : "text-gray-400"}`}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or class…"
          className={`flex-1 bg-transparent text-sm outline-none ${
            isDark
              ? "text-white placeholder-gray-500"
              : "text-gray-900 placeholder-gray-400"
          }`}
        />
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {filtered.map((child) => (
          <ChildCard
            key={child.id}
            child={child}
            token={token}
            isDark={isDark}
            onOpen={() => navigate(`/parent/children/${child.id}`)}
          />
        ))}
        {filtered.length === 0 && (
          <p
            className={`py-10 text-center text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}
          >
            {query
              ? "No children match your search."
              : "No children linked to your account yet."}
          </p>
        )}
      </div>
    </div>
  );
}

function ChildCard({
  child,
  token,
  isDark,
  onOpen,
}: {
  child: NonNullable<
    ReturnType<typeof useParentChildren>["data"]
  >["children"][number];
  token?: string | null;
  isDark: boolean;
  onOpen: () => void;
}) {
  const { data: stats, isLoading } = useChildStats(child, token);
  const feeBalance = stats?.feeBalance ?? 0;

  return (
    <button
      onClick={onOpen}
      className={`w-full text-left rounded-3xl p-4 border active:scale-[0.98] transition-transform ${
        isDark
          ? "bg-gray-900/70 border-white/10"
          : "bg-white border-gray-200 shadow-sm"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`h-12 w-12 rounded-2xl flex items-center justify-center text-sm font-bold ${
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
        <div className="flex-1 min-w-0">
          <p
            className={`font-bold truncate ${isDark ? "text-white" : "text-gray-900"}`}
          >
            {child.name}
          </p>
          <p
            className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}
          >
            {child.class?.name || "No class"}
            {child.arm?.letter ? ` · Arm ${child.arm.letter}` : ""}
          </p>
        </div>
        <ChevronRightIcon
          className={`h-5 w-5 shrink-0 ${isDark ? "text-gray-500" : "text-gray-400"}`}
        />
      </div>

      {/* Mini stats row */}
      <div
        className={`mt-3 pt-3 flex gap-2 border-t ${isDark ? "border-white/5" : "border-gray-100"}`}
      >
        <MiniStat
          icon={<AcademicCapIcon className="h-3.5 w-3.5" />}
          label="Avg"
          value={isLoading ? "…" : `${stats?.averageScore ?? 0}%`}
          isDark={isDark}
        />
        <MiniStat
          label="Attendance"
          value={isLoading ? "…" : `${stats?.attendanceRate ?? 0}%`}
          isDark={isDark}
        />
        <MiniStat
          label="Balance"
          value={
            isLoading
              ? "…"
              : feeBalance > 0
                ? `₦${feeBalance.toLocaleString()}`
                : "Paid ✓"
          }
          danger={feeBalance > 0}
          isDark={isDark}
        />
      </div>
    </button>
  );
}

function MiniStat({
  icon,
  label,
  value,
  danger,
  isDark,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  danger?: boolean;
  isDark: boolean;
}) {
  return (
    <div
      className={`flex-1 rounded-xl px-2 py-2 text-center ${
        danger
          ? isDark
            ? "bg-red-900/30"
            : "bg-red-50"
          : isDark
            ? "bg-white/5"
            : "bg-gray-50"
      }`}
    >
      {icon && (
        <div className={`flex justify-center mb-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          {icon}
        </div>
      )}
      <p
        className={`text-[10px] font-medium uppercase tracking-wide ${isDark ? "text-gray-500" : "text-gray-400"}`}
      >
        {label}
      </p>
      <p
        className={`text-xs font-bold truncate ${danger ? (isDark ? "text-red-300" : "text-red-600") : isDark ? "text-gray-200" : "text-gray-800"}`}
      >
        {value}
      </p>
    </div>
  );
}
