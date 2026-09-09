// src/pages/admin/AuditLog.tsx
import { useState, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../utils/api";
import { unwrapRes } from "../../hooks/queryHelpers";
import { useTheme } from "../../contexts/ThemeContext";
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";

interface AuditLog {
  id: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  entity?: string;
  entityId?: string;
  description: string;
  method?: string;
  path?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

const ACTIONS = [
  "",
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "VIEW",
  "EXPORT",
];

const actionColor = (action: string) => {
  switch (action) {
    case "CREATE":
      return "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300";
    case "UPDATE":
      return "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300";
    case "DELETE":
      return "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300";
    case "LOGIN":
      return "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300";
    case "LOGOUT":
      return "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300";
    default:
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300";
  }
};

export default function AuditLogPage() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const {
    data,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: ["audit-logs", page, limit, search.trim(), action, from, to],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search.trim()) params.set("search", search.trim());
      if (action) params.set("action", action);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      return unwrapRes<{ logs: AuditLog[]; total?: number; pages?: number }>(
        api.get(`/audit-logs?${params.toString()}`),
      );
    },
  });
  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  const card = dark
    ? "bg-white/5 backdrop-blur-xl border-white/10"
    : "bg-white border-gray-200";
  const inputCls = `px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    dark
      ? "bg-white/10 border-white/20 text-white [color-scheme:dark]"
      : "bg-white border-gray-300 text-gray-900 [color-scheme:light]"
  }`;
  const selectCls = `${inputCls} ${dark ? "dark-select-dark" : "dark-select-light"}`;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });

  /** Turn a raw user-agent string into a friendly device description. */
  const formatUserAgent = (ua?: string) => {
    if (!ua) return "Unknown device";
    const browser = /Firefox/i.test(ua)
      ? "Firefox"
      : /Edg\//i.test(ua)
        ? "Edge"
        : /Chrome/i.test(ua)
          ? "Chrome"
          : /Safari/i.test(ua)
            ? "Safari"
            : "a browser";
    const os = /Windows/i.test(ua)
      ? "Windows"
      : /Android/i.test(ua)
        ? "Android"
        : /iPhone|iPad|iOS/i.test(ua)
          ? "iOS"
          : /Mac OS/i.test(ua)
            ? "macOS"
            : /Linux/i.test(ua)
              ? "Linux"
              : "";
    return os ? `${browser} on ${os}` : browser;
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1
            className={`text-2xl font-bold flex items-center gap-2 ${dark ? "text-white" : "text-gray-900"}`}
          >
            <ClipboardDocumentListIcon className="h-7 w-7 text-blue-500" />
            Audit Logs
          </h1>
          <p
            className={`text-sm mt-1 ${dark ? "text-gray-400" : "text-gray-500"}`}
          >
            {loading ? "Loading…" : `${total} activities recorded`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border ${
              dark
                ? "border-white/20 text-gray-300 hover:bg-white/10"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <FunnelIcon className="h-4 w-4" /> Filters
          </button>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
          >
            <ArrowPathIcon
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />{" "}
            Refresh
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className={`rounded-xl border p-4 space-y-3 ${card}`}>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by user, description or path…"
            className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              dark
                ? "bg-white/10 border-white/20 text-white"
                : "bg-white border-gray-300 text-gray-900"
            }`}
          />
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              className={selectCls}
            >
              {ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a || "All actions"}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              className={inputCls}
            />
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              className={inputCls}
            />
          </div>
        )}
      </div>

      {/* Table */}
      <div className={`rounded-xl border overflow-hidden ${card}`}>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className={dark ? "bg-white/5" : "bg-gray-50"}>
              <tr className={dark ? "text-gray-400" : "text-gray-500"}>
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Action</th>
                <th className="text-left px-4 py-3 font-medium">Description</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">
                  IP
                </th>
                <th className="text-left px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className={dark ? "text-gray-200" : "text-gray-700"}>
              {logs.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-gray-400"
                  >
                    No audit entries found.
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <Fragment key={log.id}>
                  <tr
                    className={`border-t ${dark ? "border-white/10" : "border-gray-100"}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {log.userName || "Unknown"}
                      </div>
                      <div
                        className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}
                      >
                        {log.userEmail || ""}
                        {log.userRole ? ` · ${log.userRole}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${actionColor(log.action)}`}
                      >
                        {log.action}
                      </span>
                      {log.entity && (
                        <div
                          className={`text-xs mt-1 ${dark ? "text-gray-400" : "text-gray-500"}`}
                        >
                          {log.entity}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="truncate" title={log.description}>
                        {log.description}
                      </div>
                    </td>
                    <td
                      className={`px-4 py-3 hidden md:table-cell font-mono text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {log.ipAddress || "—"}
                    </td>
                    <td
                      className={`px-4 py-3 whitespace-nowrap text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {fmtDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() =>
                          setExpanded(expanded === log.id ? null : log.id)
                        }
                        className={`text-xs underline ${dark ? "text-blue-300" : "text-blue-600"}`}
                      >
                        {expanded === log.id ? "Hide" : "Details"}
                      </button>
                    </td>
                  </tr>
                  {expanded === log.id && (
                    <tr className={dark ? "bg-white/5" : "bg-gray-50"}>
                      <td colSpan={6} className="px-4 py-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="font-semibold">What:</span>{" "}
                            {log.userName || "Someone"} {log.description}
                          </div>
                          <div>
                            <span className="font-semibold">Page:</span>{" "}
                            {log.path || "—"}
                          </div>
                          <div>
                            <span className="font-semibold">IP Address:</span>{" "}
                            {log.ipAddress || "—"}
                          </div>
                          <div>
                            <span className="font-semibold">Device:</span>{" "}
                            {formatUserAgent(log.userAgent)}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: app-style activity feed */}
        <div className="md:hidden divide-y divide-gray-100 dark:divide-white/10">
          {logs.length === 0 && !loading && (
            <p className="px-4 py-10 text-center text-gray-400 text-sm">
              No audit entries found.
            </p>
          )}
          {logs.map((log) => (
            <div key={log.id} className="px-4 py-3.5">
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${actionColor(log.action)}`}
                >
                  {log.action}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium leading-snug ${dark ? "text-gray-100" : "text-gray-900"}`}
                  >
                    {log.description}
                  </p>
                  <p
                    className={`text-xs mt-0.5 truncate ${dark ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {log.userName || "Unknown"}
                    {log.userEmail ? ` · ${log.userEmail}` : ""}
                  </p>
                  <div
                    className={`flex items-center gap-2 mt-1.5 text-[11px] ${dark ? "text-gray-500" : "text-gray-400"}`}
                  >
                    <span>{fmtDate(log.createdAt)}</span>
                    {log.entity && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="truncate">{log.entity}</span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      setExpanded(expanded === log.id ? null : log.id)
                    }
                    className={`mt-1.5 text-xs font-medium underline-offset-2 ${dark ? "text-blue-300" : "text-blue-600"} underline`}
                  >
                    {expanded === log.id ? "Hide details" : "View details"}
                  </button>
                  {expanded === log.id && (
                    <div
                      className={`mt-2 rounded-xl p-3 grid grid-cols-1 gap-1.5 text-xs ${dark ? "bg-white/5 text-gray-300" : "bg-gray-50 text-gray-600"}`}
                    >
                      <div>
                        <span className="font-semibold">User:</span>{" "}
                        {log.userName || "Someone"}
                        {log.userRole ? ` (${log.userRole})` : ""}
                      </div>
                      <div>
                        <span className="font-semibold">Page:</span>{" "}
                        {log.path || "—"}
                      </div>
                      <div>
                        <span className="font-semibold">IP Address:</span>{" "}
                        {log.ipAddress || "—"}
                      </div>
                      <div>
                        <span className="font-semibold">Device:</span>{" "}
                        {formatUserAgent(log.userAgent)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div
            className={`flex items-center justify-between px-4 py-3 border-t ${dark ? "border-white/10" : "border-gray-100"}`}
          >
            <span
              className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}
            >
              Page {page} of {pages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={`p-2 rounded-lg disabled:opacity-40 ${dark ? "hover:bg-white/10" : "hover:bg-gray-100"}`}
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                className={`p-2 rounded-lg disabled:opacity-40 ${dark ? "hover:bg-white/10" : "hover:bg-gray-100"}`}
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
