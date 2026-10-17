// ============================================================
// offline/syncEngine.ts — queue replay + bundle download.
//
/* eslint-disable @typescript-eslint/no-explicit-any -- op payloads mirror
   backend request bodies whose shapes vary per operation type. */
//
// Safety properties:
//  - Idempotency: every op carries a client opId; server ops are natural
//    upserts (attendance by studentId+date, results by unique composite).
//  - Only server-confirmed success marks an op as synced; network/HTTP
//    failures mark it failed for retry.
//  - The browser's online flag is NOT treated as proof the server is
//    reachable — sync only proceeds after a real API request succeeds.
// ============================================================
import { API_BASE_URL } from "../config/server";
import {
  db,
  enqueueOp,
  getPendingOps,
  getFailedOps,
  updateOp,
  markOpsSynced,
  markOpsFailed,
  pruneSyncedOps,
  saveBundle,
  getBundle,
  ownerKey,
  type PendingOp,
} from "./db";

export type SyncState =
  | "idle"
  | "online"
  | "offline"
  | "pending"
  | "syncing"
  | "synced"
  | "failed";

export interface SyncOutcome {
  synced: number;
  failed: number;
  errors: string[];
}

const authHeaders = (): Record<string, string> => {
  const h: Record<string, string> = {};
  const token = localStorage.getItem("token");
  const tenant = localStorage.getItem("tenantId");
  if (token) h.Authorization = `Bearer ${token}`;
  if (tenant) h["X-Tenant-ID"] = tenant;
  return h;
};

const currentOwner = (): string | null => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user?.id || !user?.schoolId) return null;
    return ownerKey(user.id, user.schoolId);
  } catch {
    return null;
  }
};

/** Download (or refresh) the teacher's authorised offline bundle. */
export async function downloadBundle(): Promise<any> {
  const owner = currentOwner();
  if (!owner) throw new Error("Not signed in");
  const res = await fetch(`${API_BASE_URL}/offline/bundle`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error((await res.text()) || "Bundle download failed");
  const data = await res.json();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  await saveBundle({
    owner,
    userId: user.id,
    schoolId: user.schoolId,
    data,
    downloadedAt: Date.now(),
  });
  return data;
}

export async function loadCachedBundle() {
  const owner = currentOwner();
  if (!owner) return null;
  return getBundle(owner);
}

/**
 * Replay the pending op queue against the server.
 * Returns a per-op outcome summary. Never throws.
 */
export async function syncPendingOps(
  onProgress?: (done: number, total: number) => void,
): Promise<SyncOutcome> {
  const owner = currentOwner();
  const outcome: SyncOutcome = { synced: 0, failed: 0, errors: [] };
  if (!owner) return outcome;

  const ops = await getPendingOps(owner);
  if (ops.length === 0) {
    await pruneSyncedOps(owner, 0);
    return outcome;
  }

  // Mark all as syncing so a concurrent tab doesn't double-send.
  const ids = ops.map((o) => o.opId);
  for (const id of ids) await updateOp(id, { status: "syncing" });

  try {
    const res = await fetch(`${API_BASE_URL}/offline/sync`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        ops: ops.map((o) => ({
          opId: o.opId,
          type: o.type,
          payload: o.payload,
        })),
      }),
    });

    if (!res.ok) {
      throw new Error(`Server error ${res.status}`);
    }

    const body = (await res.json()) as {
      results: { opId: string; status: "synced" | "failed"; error?: string }[];
    };
    const byId = new Map(body.results.map((r) => [r.opId, r]));

    const syncedIds: string[] = [];
    const failedItems: { opId: string; error: string }[] = [];
    for (const op of ops) {
      const r = byId.get(op.opId);
      if (r?.status === "synced") {
        syncedIds.push(op.opId);
      } else {
        failedItems.push({
          opId: op.opId,
          error: r?.error || "Server rejected operation",
        });
      }
    }

    if (syncedIds.length) {
      await markOpsSynced(syncedIds);
      outcome.synced = syncedIds.length;
    }
    if (failedItems.length) {
      await markOpsFailed(failedItems);
      outcome.failed = failedItems.length;
      outcome.errors = failedItems.map((f) => f.error);
    }

    // Prune old synced entries immediately after a successful round.
    await pruneSyncedOps(owner, 0);
  } catch (err: any) {
    // Network or server failure — return all to 'failed' for retry.
    await markOpsFailed(
      ops.map((o) => ({
        opId: o.opId,
        error: err?.message || "Network error",
      })),
    );
    outcome.failed = ops.length;
    outcome.errors = [err?.message || "Network error"];
  } finally {
    onProgress?.(ops.length, ops.length);
  }

  return outcome;
}

/** True when the API itself answers (not just the network interface). */
export async function isServerReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export { enqueueOp, getPendingOps, getFailedOps, db, type PendingOp };
