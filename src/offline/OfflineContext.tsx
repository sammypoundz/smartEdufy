// ============================================================
// offline/OfflineContext.tsx — central offline state.
//
// Exposes: connectivity, cached-bundle presence, pending/failed op counts
// and the current sync state machine used by the status badge, the offline
// manager page and the logout warning.
// ============================================================
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "../contexts/AuthContext";
import { useConnectivity } from "../components/OfflineIndicator";
import {
  db,
  getPendingOps,
  pruneSyncedOps,
  ownerKey,
  type PendingOp,
} from "./db";
import {
  downloadBundle,
  loadCachedBundle,
  syncPendingOps,
  type SyncOutcome,
} from "./syncEngine";
import { OFFLINE_COUNTS_EVENT, refreshOfflineCounts } from "./db";
export { OFFLINE_COUNTS_EVENT, refreshOfflineCounts };

export type SyncStatus =
  | "online"
  | "offline"
  | "pending"
  | "syncing"
  | "synced"
  | "failed";

interface OfflineContextValue {
  /** Derived sync status shown in the UI badge. */
  status: SyncStatus;
  /** Internet reachability (browser events + probe). */
  isOnline: boolean;
  /** True once a bundle has been downloaded for the signed-in user. */
  hasBundle: boolean;
  downloadedAt: number | null;
  pendingOps: PendingOp[];
  pendingCount: number;
  failedCount: number;
  lastSyncAt: number | null;
  lastSyncResult: SyncOutcome | null;
  /** Download/refresh the authorised offline bundle. */
  download: () => Promise<void>;
  /** Manual sync trigger. */
  syncNow: () => Promise<SyncOutcome>;
  /** Clear 'failed' state on all ops so they retry on next sync. */
  resetFailed: () => void;
  /** Refresh counts from IndexedDB. */
  refreshCounts: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextValue | undefined>(
  undefined,
);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const { isOnline, checking } = useConnectivity();
  const [hasBundle, setHasBundle] = useState(false);
  const [downloadedAt, setDownloadedAt] = useState<number | null>(null);
  const [pendingOps, setPendingOps] = useState<PendingOp[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<SyncOutcome | null>(
    null,
  );

  const owner = user && token ? ownerKey(user.id, user.schoolId) : null;

  const refreshCounts = useCallback(async () => {
    // Prune synced ops older than 30s so "synchronised" eventually clears.
    if (owner) await pruneSyncedOps(owner);
    const ops = owner ? await getPendingOps(owner) : [];
    setPendingOps(ops);
  }, [owner]);

  // Load cached bundle state + op counts for the signed-in user.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!owner) {
        setHasBundle(false);
        setDownloadedAt(null);
        setPendingOps([]);
        return;
      }
      const bundle = await loadCachedBundle();
      if (!cancelled) {
        setHasBundle(!!bundle);
        setDownloadedAt(bundle?.downloadedAt ?? null);
      }
      await refreshCounts();
    })();
    return () => {
      cancelled = true;
    };
  }, [owner, refreshCounts]);

  // External modules enqueue ops via the event channel.
  useEffect(() => {
    const handler = () => {
      refreshCounts();
    };
    window.addEventListener(OFFLINE_COUNTS_EVENT, handler);
    return () => window.removeEventListener(OFFLINE_COUNTS_EVENT, handler);
  }, [refreshCounts]);

  const download = useCallback(async () => {
    if (!owner) throw new Error("Not signed in");
    const data = await downloadBundle();
    setHasBundle(true);
    setDownloadedAt(Date.now());
    await refreshCounts();
    return data;
  }, [owner, refreshCounts]);

  const syncNow = useCallback(async () => {
    if (!owner || syncing) {
      return { synced: 0, failed: 0, errors: [] };
    }
    setSyncing(true);
    try {
      const result = await syncPendingOps();
      setLastSyncResult(result);
      setLastSyncAt(Date.now());
      if (result.failed === 0) setJustSynced(true);
      await refreshCounts();
      return result;
    } finally {
      setSyncing(false);
    }
  }, [owner, syncing, refreshCounts]);

  const resetFailed = useCallback(async () => {
    if (!owner) return;
    const failed = await db.pendingOps
      .where("owner")
      .equals(owner)
      .filter((o) => o.status === "failed")
      .toArray();
    for (const op of failed) {
      await db.pendingOps.update(op.opId, {
        status: "queued",
        lastError: undefined,
      });
    }
    await refreshCounts();
  }, [owner, refreshCounts]);

  // Auto-sync when connectivity returns and there is pending work.
  useEffect(() => {
    if (isOnline && !syncing && owner && pendingOps.length > 0) {
      const onlyFailed = pendingOps.every((o) => o.status === "failed");
      // Failed ops need an explicit retry OR a fresh connectivity event.
      // Auto-sync only newly queued/syncing ops to avoid hammering.
      if (!onlyFailed) {
        const t = setTimeout(() => {
          syncNow().catch(() => {});
        }, 1200);
        return () => clearTimeout(t);
      }
    }
  }, [isOnline, owner, pendingOps, syncing, syncNow]);

  const pendingCount = pendingOps.filter((o) => o.status !== "synced").length;
  const failedCount = pendingOps.filter((o) => o.status === "failed").length;

  const status: SyncStatus = useMemo(() => {
    if (checking && isOnline) return "online";
    if (syncing) return "syncing";
    if (!isOnline) {
      return pendingCount > 0 ? "pending" : "offline";
    }
    if (failedCount > 0) return "failed";
    if (pendingCount > 0) return "pending";
    if (justSynced) return "synced";
    return "online";
  }, [checking, isOnline, syncing, pendingCount, failedCount, justSynced]);

  const value = useMemo(
    () => ({
      status,
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
    }),
    [
      status,
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
    ],
  );

  return (
    <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
  );
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error("useOffline must be used within OfflineProvider");
  return ctx;
}
