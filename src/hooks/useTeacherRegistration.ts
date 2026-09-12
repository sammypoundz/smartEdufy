// src/hooks/useTeacherRegistration.ts
// Admin review of teacher self-registrations.
//  - usePendingTeacherRegistrations: list of teachers awaiting review
//  - usePendingTeacherRegistrationCount: badge count for the Teachers nav item
//    (polls every 60s, mirrors usePendingLinkRequestCount)
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../utils/api";
import { useAuth } from "../contexts/AuthContext";

export interface PendingTeacherRegistration {
  id: string;
  name: string;
  email: string;
  gender?: string | null;
  phone?: string | null;
  teacherType: "FORM_TEACHER" | "SUBJECT_TEACHER" | "BOTH";
  briefSubjects?: {
    subjects?: string[];
    classes?: string[];
    // Form-teacher arms (only meaningful for FORM_TEACHER / BOTH)
    armIds?: string[];
    // subject name -> arm ids it is offered to (subject teacher)
    subjectArms?: { subject: string; armId: string }[];
  } | null;
  registrationStatus: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  user?: { id: string; email: string; isActive: boolean } | null;
}

export interface ApproveResult {
  teacherId: string;
  assignedArms: string[];
  assignedSubjects: string[];
}

export function usePendingTeacherRegistrations(token?: string | null) {
  return useQuery({
    queryKey: ["teacher-registrations-pending", token],
    enabled: !!token,
    queryFn: async () => {
      const res = await api.get("/teacher-registrations", token);
      if (!res.ok) return { pending: [] as PendingTeacherRegistration[] };
      const data = await res.json();
      return { pending: (data.pending ?? []) as PendingTeacherRegistration[] };
    },
  });
}

export function usePendingTeacherRegistrationCount(token?: string | null) {
  return useQuery({
    queryKey: ["teacher-registrations-pending-count", token],
    enabled: !!token,
    refetchInterval: 60_000,
    queryFn: async () => {
      const res = await api.get("/teacher-registrations/count", token);
      if (!res.ok) return { count: 0 };
      const data = await res.json();
      return { count: (data.count as number) || 0 };
    },
  });
}

export function useTeacherRegistrationActions(token?: string | null) {
  const queryClient = useQueryClient();
  const { token: t } = useAuth();
  const auth = token ?? t;

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: ["teacher-registrations-pending"],
    });
    queryClient.invalidateQueries({
      queryKey: ["teacher-registrations-pending-count"],
    });
    queryClient.invalidateQueries({ queryKey: ["teachers"] });
  };

  const approve = useMutation({
    mutationFn: async (id: string): Promise<ApproveResult> => {
      const res = await api.post(
        `/teacher-registrations/${id}/approve`,
        {},
        auth,
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data?.error || "Failed to approve registration");
      return data;
    },
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: async (vars: { id: string; note?: string }) => {
      const res = await api.post(
        `/teacher-registrations/${vars.id}/reject`,
        { note: vars.note },
        auth,
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data?.error || "Failed to reject registration");
      return data;
    },
    onSuccess: invalidate,
  });

  return { approve, reject };
}
