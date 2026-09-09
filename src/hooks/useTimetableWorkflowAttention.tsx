// Shared hook: does the timetable workflow need THIS user's action right now?
//  - teachers: an assignment has "changes requested" or incomplete slot
//    submission and the arm isn't locked
//  - admins: at least one arm is PENDING_REVIEW awaiting approval
// Used by the layouts to badge the Timetable nav item on desktop + mobile.
// NOTE: .tsx extension — this file contains JSX (AttentionDot component).
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../utils/api";

export type WorkflowRole = "teacher" | "admin";

export function useTimetableWorkflowAttention(role: WorkflowRole): {
  attention: boolean;
  loading: boolean;
} {
  const { token } = useAuth();
  const [attention, setAttention] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    const check = async () => {
      try {
        if (role === "teacher") {
          const res = await api.get("/timetable-workflow/mine", token);
          if (!res.ok) return;
          const data = await res.json();
          const assignments = (data.assignments || []) as {
            id: string;
            armId: string;
            periodsPerWeek: number;
            slots: { dayOfWeek: string; timeSlot: string }[];
          }[];
          const reviews = (data.reviews || []) as {
            armId: string;
            status: string;
            requestedChanges?: string | null;
          }[];
          const reviewFor = (armId: string) =>
            reviews.find((r) => r.armId === armId);
          // Per-assignment change flags: { assignmentId: note }.
          // Empty/absent map with CHANGES_REQUESTED = legacy arm-wide request.
          const flagsFor = (armId: string): Record<string, string> => {
            const raw = reviewFor(armId)?.requestedChanges;
            if (!raw) return {};
            try {
              const p = JSON.parse(raw);
              return p && typeof p === "object" ? p : {};
            } catch {
              return {};
            }
          };
          const needs = assignments.some((a) => {
            const review = reviewFor(a.armId);
            const status = review?.status || "DRAFT";
            if (status === "APPROVED") return false;
            if (status === "CHANGES_REQUESTED") {
              const flags = flagsFor(a.armId);
              return Boolean(flags[a.id]) || Object.keys(flags).length === 0;
            }
            return (a.slots?.length || 0) < a.periodsPerWeek;
          });
          if (!cancelled) setAttention(needs);
        } else {
          const res = await api.get("/timetable-workflow/reviews", token);
          if (!res.ok) return;
          const reviews = (await res.json()) as { status: string }[];
          if (!cancelled)
            setAttention(reviews.some((r) => r.status === "PENDING_REVIEW"));
        }
      } catch {
        /* best-effort indicator only */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    check();
    // Poll every 60s so the badge updates without a page reload.
    const interval = setInterval(check, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [role, token]);

  return { attention, loading };
}

/**
 * Intuitive attention badge for nav items: a red pill with a warning icon
 * and "Action needed" text. Rendered next to the Timetable nav item and
 * (compact variant) on the category group label when the folder is folded.
 */
export function AttentionBadge({
  show,
  compact = false,
}: {
  show: boolean;
  compact?: boolean;
}) {
  if (!show) return null;
  if (compact) {
    return (
      <span className="relative inline-flex flex-shrink-0 items-center justify-center ml-2 px-1.5 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold uppercase tracking-wide animate-pulse">
        !
      </span>
    );
  }
  return (
    <span className="relative inline-flex flex-shrink-0 items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold uppercase tracking-wide shadow-md animate-pulse">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        className="h-3 w-3"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
        />
      </svg>
      Action needed
    </span>
  );
}
