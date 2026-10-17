// ============================================================
// offline/offlineWrites.ts — offline-aware save helpers.
//
/* eslint-disable @typescript-eslint/no-explicit-any -- op payloads mirror
   backend request bodies whose shapes vary per operation type. */
//
// Each helper posts to the existing API when online; if the request fails
// because there is no connectivity, it enqueues the equivalent operation in
// the IndexedDB outbox so it syncs later. The caller gets a uniform result:
//   { mode: 'saved' | 'queued', opId? }
// ============================================================
import { API_BASE_URL } from "../config/server";
import { enqueueOp, getFailedOps, deleteOp, ownerKey } from "./db";
import { refreshOfflineCounts } from "./OfflineContext";

const authHeaders = (): Record<string, string> => {
  const h: Record<string, string> = { "Content-Type": "application/json" };
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

export type SaveResult = { mode: "saved" | "queued"; opId?: string };

/**
 * POST to the server; on network failure queue instead.
 * HTTP 4xx (validation/permission) errors are surfaced — those shouldn't be
 * silently queued because retrying won't fix them.
 */
export async function saveOrQueue(
  endpoint: string,
  body: any,
  queueType: string,
  queuePayload: any,
): Promise<SaveResult> {
  const owner = currentOwner();
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Server error ${res.status}`);
    }
    return { mode: "saved" };
  } catch (err: any) {
    // Network-level failure (offline / DNS / timeout) → queue it.
    // Server-rejected requests (HTTP error) → propagate to the caller.
    const isNetwork =
      err instanceof TypeError ||
      err?.name === "AbortError" ||
      /network|fetch|Failed to fetch/i.test(err?.message || "");
    if (!isNetwork) throw err;
    if (!owner) throw err;
    const op = await enqueueOp(owner, queueType, queuePayload);
    refreshOfflineCounts();
    return { mode: "queued", opId: op.opId };
  }
}

// ---------- Typed wrappers for the three supported workflows ----------

/** Attendance: POST /attendance/arm/:armId equivalent. */
export const saveAttendanceOffline = (
  armId: string,
  date: string,
  records: { studentId: string; present: boolean }[],
) =>
  saveOrQueue(
    `/attendance/arm/${armId}`,
    { date, records },
    "ATTENDANCE_SAVE",
    { armId, date, records },
  );

/** Score entry: POST /results/bulk equivalent. */
export const saveResultsOffline = (results: any[]) =>
  saveOrQueue("/results/bulk", { results }, "RESULTS_SAVE", { results });

/** Lesson note create: text-only lesson plan. */
/* * Create a text-only lesson note (offline-first).
 * The existing /lesson-plans POST requires a multipart file, so text-only
 * notes always go through the sync queue (LESSON_PLAN_CREATE) — online or
 * offline. The sync endpoint creates them server-side without a file.
 */
export const saveLessonNote = async (payload: {
  title: string;
  description: string;
  classId: string;
  armId: string;
  subjectId: string;
}): Promise<SaveResult> => {
  const owner = currentOwner();
  if (!owner) throw new Error("Not signed in");
  const op = await enqueueOp(owner, "LESSON_PLAN_CREATE", payload);
  refreshOfflineCounts();
  return { mode: "queued", opId: op.opId };
};

/** Discard a failed op after user confirmation. */
export const discardOp = async (opId: string) => {
  await deleteOp(opId);
  refreshOfflineCounts();
};

/** Failed ops for the manager UI. */
export const listFailedOps = () => {
  const owner = currentOwner();
  return owner ? getFailedOps(owner) : Promise.resolve([]);
};
