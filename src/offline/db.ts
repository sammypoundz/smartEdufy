// ============================================================
// offline/db.ts — Dexie (IndexedDB) schema for SmartEdufy offline mode.
//
// Security model:
//  - Every record is keyed by userId + schoolId so cached data can never
//    leak across users or schools.
//  - NO tokens, passwords or credentials are ever stored here. Auth stays
//    in localStorage / memory and is attached by the existing api helpers.
// ============================================================
import Dexie, { type Table } from "dexie";

/* eslint-disable @typescript-eslint/no-explicit-any -- op payloads mirror
   backend request bodies whose shapes vary per operation type. */

/** One queued offline mutation. */
export interface PendingOp {
  /** Client-generated UUID — the idempotency key sent to /offline/sync. */
  opId: string;
  /** owner = `${userId}:${schoolId}` — isolates ops per user+school. */
  owner: string;
  /** ATTENDANCE_SAVE | RESULTS_SAVE | LESSON_PLAN_CREATE | LESSON_PLAN_UPDATE */
  type: string;
  payload: any;
  /** queued | syncing | synced | failed */
  status: "queued" | "syncing" | "synced" | "failed";
  attempts: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
}

/** Cached copy of the teacher's authorised offline bundle. */
export interface CachedBundle {
  owner: string;
  userId: string;
  schoolId: string;
  data: any; // bundle from GET /api/offline/bundle
  downloadedAt: number;
}

export const ownerKey = (userId: string, schoolId: string) =>
  `${userId}:${schoolId}`;

class SmartEdufyOfflineDB extends Dexie {
  pendingOps!: Table<PendingOp, string>;
  bundles!: Table<CachedBundle, string>;

  constructor() {
    super("SmartEdufyOffline");
    this.version(1).stores({
      // Indexed by opId; owner+status are queryable indexes.
      pendingOps: "opId, owner, status, [owner+status]",
      bundles: "owner, [userId+schoolId]",
    });
  }
}

export const db = new SmartEdufyOfflineDB();

/**
 * Lightweight channel for non-React modules (e.g. offlineWrites) to nudge
 * the OfflineProvider to re-read op counts from IndexedDB. Lives here to
 * avoid a react-refresh violation (event constants can't share a component
 * file).
 */
export const OFFLINE_COUNTS_EVENT = "edufy:offline-counts";
export const refreshOfflineCounts = () =>
  window.dispatchEvent(new Event(OFFLINE_COUNTS_EVENT));

// ---------- Pending ops helpers ----------

export async function enqueueOp(
  owner: string,
  type: string,
  payload: any,
): Promise<PendingOp> {
  const opId =
    globalThis.crypto?.randomUUID?.() ??
    `op-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const now = Date.now();
  const op: PendingOp = {
    opId,
    owner,
    type,
    payload,
    status: "queued",
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };
  await db.pendingOps.put(op);
  return op;
}

/** Pending (queued | syncing | failed) ops for an owner, oldest first. */
export async function getPendingOps(owner: string) {
  const all = await db.pendingOps.where("owner").equals(owner).toArray();
  return all
    .filter((o) => o.status !== "synced")
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function getFailedOps(owner: string) {
  const all = await db.pendingOps.where("owner").equals(owner).toArray();
  return all
    .filter((o) => o.status === "failed")
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function updateOp(opId: string, patch: Partial<PendingOp>) {
  await db.pendingOps.update(opId, { ...patch, updatedAt: Date.now() });
}

export async function markOpsSynced(opIds: string[]) {
  const now = Date.now();
  await db.pendingOps.bulkPut(
    // We read each then write back so updatedAt refreshes.
    await Promise.all(
      opIds.map(async (opId) => {
        const op = await db.pendingOps.get(opId);
        return {
          ...(op as PendingOp),
          status: "synced" as const,
          updatedAt: now,
        };
      }),
    ),
  );
}

export async function markOpsFailed(items: { opId: string; error: string }[]) {
  const now = Date.now();
  for (const { opId, error } of items) {
    const op = await db.pendingOps.get(opId);
    if (!op) continue;
    await db.pendingOps.put({
      ...op,
      status: "failed",
      attempts: (op.attempts ?? 0) + 1,
      lastError: error,
      updatedAt: now,
    });
  }
}

/**
 * Remove ops from the queue. Used after confirmed sync (synced ops are pruned
 * after a short grace period so the UI can show "synchronised") or when the
 * user explicitly discards a failed op.
 */
export async function pruneSyncedOps(owner: string, graceMs = 30_000) {
  const cutoff = Date.now() - graceMs;
  await db.pendingOps
    .where("owner")
    .equals(owner)
    .filter((o) => o.status === "synced" && o.updatedAt < cutoff)
    .delete();
}

export async function deleteOp(opId: string) {
  await db.pendingOps.delete(opId);
}

/** Discard ALL pending ops for an owner (logout flow — user confirmed). */
export async function discardAllOps(owner: string) {
  await db.pendingOps.where("owner").equals(owner).delete();
}

// ---------- Bundle helpers ----------

export async function saveBundle(bundle: CachedBundle) {
  await db.bundles.put(bundle);
}

export async function getBundle(owner: string) {
  return db.bundles.get(owner);
}

/** Wipe all user-specific cached data (logout / account switch). */
export async function wipeAll() {
  await db.pendingOps.clear();
  await db.bundles.clear();
}

/** Wipe everything except pending ops (refresh cache but keep local work). */
export async function wipeBundles() {
  await db.bundles.clear();
}
