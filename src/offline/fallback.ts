// ============================================================
// offline/fallback.ts — offline data fallback for read queries.
//
// When a network request fails (offline) and the user has a cached
// bundle in IndexedDB, we serve the bundle's data instead so pages
// keep rendering students, classes, arms, timetable etc.
// ============================================================
import { loadCachedBundle, isServerReachable } from "./syncEngine";

export interface OfflineBundleData {
  generatedAt?: string;
  teacher?: { id: string; name: string; userId: string } | null;
  arms: {
    id: string;
    letter: string;
    alias?: string;
    classId: string;
    className: string;
    isFormTeacher: boolean;
    subjects: { id: string; name: string }[];
  }[];
  students: {
    id: string;
    name: string;
    gender: string;
    admissionNumber?: string;
    classId: string;
    armId: string;
  }[];
  subjects: { id: string; name: string }[];
  timetable: {
    id: string;
    armId: string;
    dayOfWeek: number;
    timeSlot: string;
    subjectId: string;
    subject?: { id: string; name: string };
  }[];
  lessonPlans: any[];
}

/** Load the cached bundle's data for the signed-in user (or null). */
export async function getCachedBundleData(): Promise<OfflineBundleData | null> {
  const bundle = await loadCachedBundle();
  return bundle?.data ?? null;
}

/** True when the fetch failure is a network failure (offline), not an HTTP error. */
export function isNetworkError(err: unknown): boolean {
  if (!err) return false;
  const msg = typeof err === "string" ? err : (err as Error).message || "";
  return (
    msg === "Failed to fetch" ||
    msg === "NetworkError when attempting to fetch resource." ||
    /network|fetch failed|load failed|aborted|ERR_INTERNET/i.test(msg)
  );
}

/**
 * Resilient query wrapper: tries the network; on network failure falls back
 * to the cached offline bundle (if one exists and the server is unreachable).
 */
export async function offlineAwareFetch<T>(
  networkFn: () => Promise<T>,
  fallbackFn: (bundle: OfflineBundleData) => T | null,
): Promise<T> {
  try {
    return await networkFn();
  } catch (err) {
    if (!isNetworkError(err)) throw err;
    const bundle = await getCachedBundleData();
    if (!bundle) throw err;
    const serverUp = await isServerReachable();
    if (serverUp) {
      // The API is reachable but this request failed — don't mask the error.
      throw err;
    }
    const fallback = fallbackFn(bundle);
    if (fallback === null) throw err;
    return fallback;
  }
}
