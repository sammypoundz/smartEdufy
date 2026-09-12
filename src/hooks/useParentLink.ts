// src/hooks/useParentLink.ts
// Parent–Student linking: search students, submit link requests, and track
// their approval status (Timetable workflow states: PENDING_REVIEW |
// CHANGES_REQUESTED | APPROVED | REJECTED).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../utils/api";
import { useAuth } from "../contexts/AuthContext";

export interface LinkRequest {
  id: string;
  status: "PENDING_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "REJECTED";
  parentNote?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  student?: {
    id: string;
    name: string;
    admissionNumber?: string | null;
    class?: { name: string } | null;
    arm?: { letter: string } | null;
  } | null;
  parent?: { id: string; name: string; email: string } | null;
}

export interface StudentSearchResult {
  id: string;
  name: string;
  admissionNumber?: string | null;
  class?: { name: string } | null;
  arm?: { letter: string } | null;
  linkedToMe?: boolean;
  hasOpenRequest?: boolean;
  openRequestIsMine?: boolean;
}

export function useParentLinkRequests(token?: string | null) {
  return useQuery({
    queryKey: ["parent-link-requests", token],
    enabled: !!token,
    queryFn: async () => {
      const res = await api.get("/parent-links/mine", token);
      if (!res.ok) return { requests: [] as LinkRequest[] };
      const data = await res.json();
      return { requests: (data.requests ?? []) as LinkRequest[] };
    },
  });
}

/**
 * Admin attention flag: number of parent→student link requests currently
 * awaiting review (PENDING_REVIEW). Polls every 60s so the nav badge stays
 * fresh without a page reload. Mirrors useTimetableWorkflowAttention.
 */
export function usePendingLinkRequestCount(token?: string | null) {
  return useQuery({
    queryKey: ["parent-link-pending-count", token],
    enabled: !!token,
    refetchInterval: 60_000,
    queryFn: async () => {
      const res = await api.get("/parent-links/pending-count", token);
      if (!res.ok) return { count: 0 };
      const data = await res.json();
      return { count: (data.count as number) || 0 };
    },
  });
}

export function useStudentSearch(
  query: string,
  token?: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["parent-student-search", query, token],
    enabled: enabled && !!token && query.trim().length >= 2,
    queryFn: async (): Promise<StudentSearchResult[]> => {
      const res = await api.get(
        `/parent-links/search?q=${encodeURIComponent(query.trim())}`,
        token,
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results ?? []) as StudentSearchResult[];
    },
  });
}

export function useCreateLinkRequest(token?: string | null) {
  const queryClient = useQueryClient();
  const { token: t } = useAuth();
  return useMutation({
    mutationFn: async (vars: { studentId: string; note?: string }) => {
      const res = await api.post(
        "/parent-links/requests",
        { studentId: vars.studentId, note: vars.note },
        token ?? t,
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to submit request");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-link-requests"] });
    },
  });
}
