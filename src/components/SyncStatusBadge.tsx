// ============================================================
// SyncStatusBadge — compact connectivity/sync pill for the navbar.
// States: online · offline · pending · syncing · synced · failed
// ============================================================
import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  WifiIcon,
  CloudArrowDownIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  SignalSlashIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { useOffline } from "../offline/OfflineContext";
import { useTheme } from "../contexts/ThemeContext";

export default function SyncStatusBadge({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { status, pendingCount, failedCount, syncNow, isOnline } = useOffline();
  const { theme } = useTheme();
  const dark = theme === "dark";

  // Auto-dismiss the transient "synced" state via the provider.
  useEffect(() => {
    if (status !== "failed") return;
  }, [status]);

  const base = `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
    dark ? "ring-1 ring-white/10" : "ring-1 ring-black/5"
  }`;

  const styles: Record<string, string> = {
    online: dark
      ? "bg-emerald-500/15 text-emerald-300"
      : "bg-emerald-100 text-emerald-700",
    offline: dark
      ? "bg-gray-500/20 text-gray-300"
      : "bg-gray-200 text-gray-600",
    pending: dark
      ? "bg-amber-500/15 text-amber-300"
      : "bg-amber-100 text-amber-700",
    syncing: dark
      ? "bg-blue-500/15 text-blue-300"
      : "bg-blue-100 text-blue-700",
    synced: dark
      ? "bg-emerald-500/15 text-emerald-300"
      : "bg-emerald-100 text-emerald-700",
    failed: dark ? "bg-red-500/15 text-red-300" : "bg-red-100 text-red-700",
  };

  const labels: Record<string, string> = {
    online: "Online",
    offline: "Offline",
    pending: `${pendingCount} pending`,
    syncing: "Syncing…",
    synced: "Synced",
    failed: `${failedCount} failed`,
  };

  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    online: WifiIcon,
    offline: SignalSlashIcon,
    pending: CloudArrowDownIcon,
    syncing: CloudArrowUpIcon,
    synced: CheckCircleIcon,
    failed: ExclamationCircleIcon,
  };

  const Icon = icons[status] ?? WifiIcon;
  const clickable = isOnline && (status === "failed" || status === "pending");

  return (
    <button
      onClick={() => clickable && syncNow().catch(() => {})}
      disabled={!clickable}
      title={
        clickable
          ? "Click to sync now"
          : status === "offline"
            ? "You are offline — changes are saved locally and will sync later"
            : undefined
      }
      className={`${base} ${styles[status]} ${clickable ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
      data-sync-status={status}
    >
      <Icon
        className={`h-3.5 w-3.5 ${status === "syncing" ? "animate-spin" : ""}`}
      />
      {!compact && <span>{labels[status]}</span>}
      {compact && status !== "online" && <span>{pendingCount || ""}</span>}
    </button>
  );
}

/** Small "Offline" hint pill that navigates to the offline manager. */
export function OfflineManagerLink() {
  const { pendingCount, hasBundle } = useOffline();
  if (!hasBundle && pendingCount === 0) return null;
  return (
    <Link
      to="/admin/offline"
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-500 hover:text-blue-600 dark:text-blue-400"
    >
      <ArrowPathIcon className="h-3.5 w-3.5" />
      Offline data
      {pendingCount > 0 && (
        <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
          {pendingCount}
        </span>
      )}
    </Link>
  );
}
