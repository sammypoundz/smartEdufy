// Module 16 — Traffic & Activity monitor for the Super Admin console.
// Per-school traffic, school size (population + records), result-checker
// e-Pin visiting patterns, and user activity by role (staff/parents/etc).
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import platformApi from "../../utils/platformApi";
import { KpiCard, Badge, Loading, ErrorState, formatNumber } from "./shared";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useTheme } from "../../contexts/ThemeContext";

const useChartColors = () => {
  const { theme } = useTheme();
  const dark = theme === "dark";
  return {
    grid: dark ? "#1f2937" : "#f3f4f6",
    axis: dark ? "#6b7280" : "#9ca3af",
    tooltip: dark
      ? {
          background: "#111827",
          border: "1px solid #374151",
          borderRadius: 12,
          color: "#e5e7eb",
        }
      : {
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          color: "#111827",
        },
  };
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admins",
  TEACHER: "Teachers",
  PRINCIPAL: "Principals",
  VICE_PRINCIPAL: "Vice Principals",
  BURSAR: "Bursars",
  ACCOUNTANT: "Accountants",
  LIBRARIAN: "Librarians",
  PARENT: "Parents",
  STUDENT: "Students",
};

const ACTIVITY_TONES: Record<number, string> = {
  0: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  1: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  2: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
};

// Human-readable byte formatting for the storage & bandwidth panels
const formatBytes = (n: number) => {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
};

function activityTone(rate: number) {
  if (rate >= 40) return ACTIVITY_TONES[2];
  if (rate >= 5) return ACTIVITY_TONES[1];
  return ACTIVITY_TONES[0];
}

function activityLabel(rate: number) {
  if (rate >= 40) return "Very active";
  if (rate >= 5) return "Active";
  return "Dormant";
}

function ActivityChip({ rate }: { rate: number }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${activityTone(
        rate,
      )}`}
    >
      {activityLabel(rate)}
    </span>
  );
}

export default function TrafficPage() {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useQuery({
    queryKey: ["platform", "traffic", days],
    queryFn: async () => (await platformApi.get(`/traffic?days=${days}`)).data,
    refetchInterval: 60_000, // light live-refresh — this is a monitor
  });

  // Storage / disk / bandwidth panel (fetched separately so the main
  // traffic KPIs never wait on the Cloudinary API round-trip)
  const storage = useQuery({
    queryKey: ["platform", "storage"],
    queryFn: async () => (await platformApi.get("/storage")).data,
    refetchInterval: 120_000,
  });

  const c = useChartColors();

  if (isLoading) return <Loading />;
  if (error)
    return (
      <ErrorState
        message={
          (error as any)?.response?.data?.error ||
          "Failed to load traffic analytics"
        }
      />
    );

  const rows: any[] = data.schools || [];
  const totals = data.totals || {};
  const hourChart = (data.resultCheckerHours || []).map((h: any) => ({
    hour: `${h.hour.toString().padStart(2, "0")}:00`,
    visits: h.visits,
  }));
  const topActions = (data.activityByAction || []).slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Header + window selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Traffic & Activity
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Live school traffic, user engagement and result-checker visits —
            auto-refreshes every minute.
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-900 px-4 py-2.5 text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Platform-wide KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard
          label="Active Users"
          value={formatNumber(totals.activeUsers)}
          sub={`of ${formatNumber(totals.users)} accounts`}
          tone="blue"
        />
        <KpiCard
          label="Activity Rate"
          value={`${totals.activityRate || 0}%`}
          sub="users active this window"
          tone="emerald"
        />
        <KpiCard
          label="Recorded Actions"
          value={formatNumber(totals.actions)}
          sub={`${data.windowDays}-day window`}
          tone="violet"
        />
        <KpiCard
          label="Result-Checker Visits"
          value={formatNumber(totals.resultChecks)}
          sub={`${formatNumber(totals.resultVisitors)} unique visitors`}
          tone="amber"
        />
        <KpiCard
          label="Most-Called Action"
          value={topActions[0]?.action || "—"}
          sub={
            topActions[0]
              ? `${formatNumber(topActions[0].count)} events`
              : "no data"
          }
          tone="gray"
        />
      </div>

      {/* Result checker visiting pattern */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <h3 className="font-bold mb-1">Result-Checker Traffic by Hour</h3>
          <p className="text-[11px] text-gray-500 mb-3">
            When students & parents visit the online result-checking page (e-Pin
            redemptions)
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourChart}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
              <XAxis
                dataKey="hour"
                stroke={c.axis}
                fontSize={10}
                interval={2}
              />
              <YAxis stroke={c.axis} fontSize={11} />
              <Tooltip contentStyle={c.tooltip} />
              <Bar dataKey="visits" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <h3 className="font-bold mb-1">Top Actions (all schools)</h3>
          <p className="text-[11px] text-gray-500 mb-3">
            What users did most across the platform in this window
          </p>
          <div className="space-y-2">
            {topActions.length === 0 && (
              <p className="text-sm text-gray-500">No activity recorded yet.</p>
            )}
            {topActions.map((a: any) => {
              const max = topActions[0]?.count || 1;
              return (
                <div key={a.action} className="flex items-center gap-3 text-sm">
                  <span className="w-32 shrink-0 truncate font-semibold">
                    {a.action}
                  </span>
                  <div className="flex-1 h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                      style={{
                        width: `${Math.max(4, (a.count / max) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="w-16 text-right tabular-nums text-gray-500">
                    {formatNumber(a.count)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Most frequently checked results */}
      {(data.topCheckedResults || []).length > 0 && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <h3 className="font-bold mb-3">Most Frequently Checked Results</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-200 dark:border-gray-800">
                  <th className="py-2 pr-4">Student</th>
                  <th className="py-2 pr-4">Admission No.</th>
                  <th className="py-2 pr-4">Term</th>
                  <th className="py-2 pr-4 text-right">Times Checked</th>
                  <th className="py-2 text-right">Last Checked</th>
                </tr>
              </thead>
              <tbody>
                {data.topCheckedResults.map((r: any, i: number) => (
                  <tr
                    key={i}
                    className="border-b last:border-0 border-gray-100 dark:border-gray-800/60"
                  >
                    <td className="py-2 pr-4 font-semibold">
                      {r.studentName || "—"}
                    </td>
                    <td className="py-2 pr-4 text-gray-500">
                      {r.admissionNumber || "—"}
                    </td>
                    <td className="py-2 pr-4">{r.term}</td>
                    <td className="py-2 pr-4 text-right font-bold tabular-nums">
                      {r.uses}
                    </td>
                    <td className="py-2 text-right text-gray-500 text-xs">
                      {r.lastUsedAt
                        ? new Date(r.lastUsedAt).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ====== Server space, disk & bandwidth ====== */}
      {storage.data && (
        <>
          <h2 className="text-lg font-extrabold tracking-tight pt-2">
            Server Space, Disk & Bandwidth
          </h2>

          {/* Account-level usage from Cloudinary (the real server) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              label="Server Disk Used"
              value={formatBytes(storage.data.cloudinary?.storageUsedBytes ?? storage.data.totalStorageBytes)}
              sub={
                storage.data.cloudinary?.storageLimitBytes
                  ? `of ${formatBytes(storage.data.cloudinary.storageLimitBytes)} plan limit`
                  : "file storage (Cloudinary)"
              }
              tone="violet"
            />
            <KpiCard
              label="CDN Bandwidth Used"
              value={formatBytes(storage.data.cloudinary?.bandwidthUsedBytes ?? 0)}
              sub={
                storage.data.cloudinary?.bandwidthLimitBytes
                  ? `of ${formatBytes(storage.data.cloudinary.bandwidthLimitBytes)} this period`
                  : "delivery this billing period"
              }
              tone="blue"
            />
            <KpiCard
              label="Stored Files"
              value={formatNumber(storage.data.cloudinary?.objects ?? 0)}
              sub={`${formatNumber(storage.data.platformFiles)} on platform account`}
              tone="emerald"
            />
            <KpiCard
              label="API Traffic (30d)"
              value={formatBytes(storage.data.totalApiBytes)}
              sub={`${formatNumber(storage.data.totalApiRequests)} responses served`}
              tone="amber"
            />
          </div>

          {!storage.data.cloudinary && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Cloudinary usage API unavailable — account-level server disk &
              bandwidth totals are hidden; per-school figures below still work.
            </p>
          )}

          {/* Daily API bandwidth trend */}
          {(storage.data.dailyApiSeries || []).length > 0 && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
              <h3 className="font-bold mb-1">API Bandwidth per Day</h3>
              <p className="text-[11px] text-gray-500 mb-3">
                Total bytes the server sent to every school's API clients
                (responses served)
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={storage.data.dailyApiSeries.map((d: any) => ({
                    date: d.date.slice(5),
                    mb: Math.round((d.bytes / 1048576) * 10) / 10,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                  <XAxis dataKey="date" stroke={c.axis} fontSize={10} interval={4} />
                  <YAxis stroke={c.axis} fontSize={11} unit="MB" />
                  <Tooltip contentStyle={c.tooltip} />
                  <Bar dataKey="mb" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Per-school disk & bandwidth table */}
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-[11px] uppercase tracking-wider text-gray-400">
                  <th className="px-4 py-3">School</th>
                  <th className="px-4 py-3">Disk Used (files)</th>
                  <th className="px-4 py-3">API Bandwidth (30d)</th>
                  <th className="px-4 py-3">API Responses</th>
                </tr>
              </thead>
              <tbody>
                {(storage.data.perSchool || []).map((r: any) => (
                  <tr
                    key={r.schoolId}
                    className="border-b last:border-0 border-gray-100 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                  >
                    <td className="px-4 py-3 font-semibold">{r.schoolName}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatBytes(r.storageBytes)}
                      <span className="block text-[10px] text-gray-400">
                        {formatNumber(r.files)} files
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums font-bold">
                      {formatBytes(r.apiBytes)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatNumber(r.apiRequests)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ====== Per-school traffic table ====== */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-[11px] uppercase tracking-wider text-gray-400">
              <th className="px-4 py-3">School</th>
              <th className="px-4 py-3">School Size</th>
              <th className="px-4 py-3">Active Users</th>
              <th className="px-4 py-3">Actions</th>
              <th className="px-4 py-3">Result-Checker Visits</th>
              <th className="px-4 py-3">Activity by Role</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-b last:border-0 border-gray-100 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800/40"
              >
                <td className="px-4 py-3">
                  <span className="font-semibold">{r.name}</span>
                  <span className="block text-[10px] text-gray-400">
                    {r.ageDays >= 365
                      ? `${Math.floor(r.ageDays / 365)}y on platform`
                      : `${r.ageDays}d on platform`}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="block text-xs text-gray-500">
                    {formatNumber(r.size.students)} students ·{" "}
                    {formatNumber(r.size.results)} results
                  </span>
                  <span className="text-[11px]">
                    {formatNumber(r.population.students)} S ·{" "}
                    {formatNumber(r.population.staff)} staff ·{" "}
                    {formatNumber(r.population.parents)} parents
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-bold tabular-nums">
                    {formatNumber(r.activeUsers)}
                  </span>
                  <span className="block text-[10px] text-gray-400">
                    of {formatNumber(r.population.total)}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {formatNumber(r.actions)}
                  <span className="block text-[10px] text-gray-400">
                    {String(r.actionsPerUser)}/user
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {formatNumber(r.resultChecker.checks)}
                  <span className="block text-[10px] text-gray-400">
                    {r.resultChecker.visitorsPerStudent}% of students visited
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(r.activityByRole)
                      .sort((a: any, b: any) => b[1] - a[1])
                      .slice(0, 4)
                      .map(([role, count]) => (
                        <span
                          key={role}
                          title={`${
                            ROLE_LABELS[role] || role
                          }: ${count} actions`}
                          className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-semibold"
                        >
                          {ROLE_LABELS[role] || role} {count}
                        </span>
                      ))}
                    {Object.keys(r.activityByRole).length === 0 && (
                      <span className="text-[10px] text-gray-400">none</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 space-y-1">
                  <div>
                    <Badge status={r.isActive ? "ACTIVE" : "SUSPENDED"} />
                  </div>
                  <ActivityChip rate={r.activityRate} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
