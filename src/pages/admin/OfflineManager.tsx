// ============================================================
// OfflineManager — offline data area.
// Download/refresh the authorised offline bundle, review pending and
// failed changes, retry or discard failed syncs.
// ============================================================
import { useEffect, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useOffline } from "../../offline/OfflineContext";
import { discardOp } from "../../offline/offlineWrites";
import { loadCachedBundle } from "../../offline/syncEngine";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import {
  CloudArrowDownIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  TrashIcon,
  ArrowPathIcon,
  WifiIcon,
  SignalSlashIcon,
} from "@heroicons/react/24/outline";

const OP_LABELS: Record<string, string> = {
  ATTENDANCE_SAVE: "Attendance",
  RESULTS_SAVE: "Score entry",
  LESSON_PLAN_CREATE: "New lesson note",
  LESSON_PLAN_UPDATE: "Lesson note update",
};

function fmtDate(ts: number | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

export default function OfflineManager() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const {
    isOnline,
    hasBundle,
    downloadedAt,
    pendingOps,
    pendingCount,
    failedCount,
    lastSyncAt,
    lastSyncResult,
    download,
    syncNow,
    resetFailed,
    refreshCounts,
  } = useOffline();
  const [busy, setBusy] = useState<"download" | "sync" | null>(null);
  const [bundleSize, setBundleSize] = useState<{
    students: number;
    arms: number;
    timetable: number;
    lessonPlans: number;
  } | null>(null);

  const loadBundleStats = async () => {
    const b = await loadCachedBundle();
    if (b?.data) {
      setBundleSize({
        students: b.data.students?.length ?? 0,
        arms: b.data.arms?.length ?? 0,
        timetable: b.data.timetable?.length ?? 0,
        lessonPlans: b.data.lessonPlans?.length ?? 0,
      });
    }
  };
  // Load stats once on mount + after downloads.
  useEffect(() => {
    loadBundleStats();
  }, []);

  const handleDownload = async () => {
    setBusy("download");
    try {
      await download();
      toast.success("Offline data downloaded");
      await loadBundleStats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setBusy(null);
    }
  };

  const handleSync = async () => {
    setBusy("sync");
    try {
      const r = await syncNow();
      if (r.failed === 0 && r.synced > 0)
        toast.success(`Synced ${r.synced} change(s)`);
      else if (r.failed > 0)
        toast.error(`${r.failed} change(s) failed to sync`);
      else if (r.synced === 0) toast.success("Everything is already in sync");
    } finally {
      setBusy(null);
    }
  };

  const handleDiscard = async (opId: string, label: string) => {
    const res = await Swal.fire({
      title: "Discard change?",
      text: `This ${label} will be permanently deleted from your device without syncing.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Discard",
    });
    if (!res.isConfirmed) return;
    await discardOp(opId);
    refreshCounts();
    toast.success("Change discarded");
  };

  const handleRetryFailed = async () => {
    resetFailed();
    await handleSync();
  };

  const cardCls = `rounded-2xl p-4 border ${
    dark ? "bg-white/5 border-white/10" : "bg-white/40 border-white/20"
  }`;
  const btnBase =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50";

  const queued = pendingOps.filter((o) => o.status !== "failed");
  const failed = pendingOps.filter((o) => o.status === "failed");

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Offline Mode</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage the data available without internet and any changes waiting to
          synchronise.
        </p>
      </div>

      {/* connectivity card */}
      <div className={cardCls}>
        <div className="flex items-center gap-3">
          {isOnline ? (
            <WifiIcon className="h-8 w-8 text-emerald-500" />
          ) : (
            <SignalSlashIcon className="h-8 w-8 text-gray-400" />
          )}
          <div className="flex-1">
            <p className="font-semibold">
              {isOnline ? "Connected to the internet" : "Offline"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isOnline
                ? "Changes sync automatically as you work."
                : "You can keep working — attendance, scores and lesson notes are saved on this device and sync when you reconnect."}
            </p>
          </div>
        </div>
      </div>

      {/* offline bundle card */}
      <div className={cardCls}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 font-semibold">
              <CloudArrowDownIcon className="h-5 w-5 text-blue-500" />
              Downloaded data
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {hasBundle
                ? `Last updated: ${fmtDate(downloadedAt)}`
                : "No offline data yet. Download your classes while online."}
            </p>
            {hasBundle && bundleSize && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-blue-500/10 px-2.5 py-1 font-semibold text-blue-600 dark:text-blue-300">
                  {bundleSize.arms} classes
                </span>
                <span className="rounded-full bg-blue-500/10 px-2.5 py-1 font-semibold text-blue-600 dark:text-blue-300">
                  {bundleSize.students} students
                </span>
                <span className="rounded-full bg-blue-500/10 px-2.5 py-1 font-semibold text-blue-600 dark:text-blue-300">
                  {bundleSize.timetable} timetable entries
                </span>
                <span className="rounded-full bg-blue-500/10 px-2.5 py-1 font-semibold text-blue-600 dark:text-blue-300">
                  {bundleSize.lessonPlans} lesson plans
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleDownload}
            disabled={busy === "download" || !isOnline}
            className={`${btnBase} bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:from-blue-500 hover:to-indigo-500 ${
              busy === "download" ? "opacity-60" : ""
            }`}
          >
            <CloudArrowDownIcon
              className={`h-4 w-4 ${busy === "download" ? "animate-pulse" : ""}`}
            />
            {hasBundle ? "Refresh offline data" : "Download for offline use"}
          </button>
        </div>
        {!isOnline && !hasBundle && (
          <p className="mt-3 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-300">
            Connect to the internet once to download your classes, students,
            timetables and lesson plans for offline use.
          </p>
        )}
      </div>

      {/* sync card */}
      <div className={cardCls}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 font-semibold">
              <CloudArrowUpIcon className="h-5 w-5 text-indigo-500" />
              Pending synchronisation
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {pendingCount === 0
                ? lastSyncAt
                  ? `All changes synced. Last sync: ${fmtDate(lastSyncAt)}`
                  : "No pending changes."
                : `${pendingCount} change(s) waiting — ${queued.length} queued, ${failed.length} failed.`}
            </p>
            {lastSyncResult && lastSyncResult.failed > 0 && (
              <p className="mt-1 text-xs text-red-500">
                Last sync: {lastSyncResult.synced} synced,{" "}
                {lastSyncResult.failed} failed.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {failedCount > 0 && (
              <button
                onClick={handleRetryFailed}
                disabled={busy === "sync" || !isOnline}
                className={`${btnBase} border ${
                  dark
                    ? "border-white/20 text-gray-200 hover:bg-white/10"
                    : "border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                <ArrowPathIcon className="h-4 w-4" /> Retry failed
              </button>
            )}
            <button
              onClick={handleSync}
              disabled={busy === "sync" || !isOnline || pendingCount === 0}
              className={`${btnBase} bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:from-blue-500 hover:to-indigo-500`}
            >
              <CloudArrowUpIcon
                className={`h-4 w-4 ${busy === "sync" ? "animate-pulse" : ""}`}
              />
              Sync now
            </button>
          </div>
        </div>

        {/* pending op list */}
        {pendingOps.length > 0 && (
          <ul className="mt-4 space-y-2">
            {pendingOps.map((op) => (
              <li
                key={op.opId}
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  op.status === "failed"
                    ? dark
                      ? "border-red-500/30 bg-red-500/5"
                      : "border-red-200 bg-red-50"
                    : dark
                      ? "border-white/10 bg-white/5"
                      : "border-gray-200 bg-white/60"
                }`}
              >
                {op.status === "failed" ? (
                  <ExclamationCircleIcon className="h-5 w-5 shrink-0 text-red-500" />
                ) : op.status === "syncing" ? (
                  <ArrowPathIcon className="h-5 w-5 shrink-0 animate-spin text-blue-500" />
                ) : (
                  <ClockIcon className="h-5 w-5 shrink-0 text-amber-500" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {OP_LABELS[op.type] ?? op.type}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {op.status === "failed"
                      ? `Failed: ${op.lastError ?? "unknown error"} (${op.attempts} attempt${op.attempts === 1 ? "" : "s"})`
                      : `Queued ${fmtDate(op.createdAt)} · will sync automatically`}
                  </p>
                </div>
                {op.status === "failed" && (
                  <button
                    onClick={() =>
                      handleDiscard(op.opId, OP_LABELS[op.type] ?? "change")
                    }
                    className="rounded-lg p-1.5 text-gray-400 transition hover:text-red-500"
                    title="Discard this change"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* what works offline */}
      <div className={cardCls}>
        <p className="font-semibold">Available offline</p>
        <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          {[
            "Your assigned classes & student lists",
            "Class timetables",
            "Marking & editing attendance",
            "Entering & editing scores",
            "Creating & editing lesson notes",
          ].map((t) => (
            <li
              key={t}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-300"
            >
              <CheckCircleIcon className="h-4 w-4 text-emerald-500" /> {t}
            </li>
          ))}
        </ul>
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-blue-500/10 p-3 text-xs text-blue-600 dark:text-blue-300">
          <ExclamationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          Edufy AI, AI timetable generation and the AI Result Scanner need an
          internet connection — they use cloud processing and cannot run
          offline.
        </p>
      </div>
      </div>
    </div>
  );
}
