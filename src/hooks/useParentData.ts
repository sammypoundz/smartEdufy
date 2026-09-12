import { useQuery } from "@tanstack/react-query";
import { api } from "../utils/api";

export interface Child {
  id: string;
  name: string;
  gender: string;
  admissionNumber?: string;
  isActive?: boolean;
  class?: { id: string; name: string } | null;
  arm?: { id: string; letter: string; alias?: string } | null;
}

export interface ChildStats {
  attendanceRate: number;
  averageScore: number;
  feeBalance: number;
  feeTotal: number;
  feePaid: number;
  recentResults: { subject: string; score: number }[];
  attendanceSummary: { present: number; absent: number; total: number };
}

const emptyStats: ChildStats = {
  attendanceRate: 0,
  averageScore: 0,
  feeBalance: 0,
  feeTotal: 0,
  feePaid: 0,
  recentResults: [],
  attendanceSummary: { present: 0, absent: 0, total: 0 },
};

/**
 * Fetches the logged-in parent's profile + children and per-child stats
 * (attendance, results, fees) from the existing backend endpoints.
 */
export function useParentChildren(token?: string | null) {
  return useQuery({
    queryKey: ["parent-children", token],
    enabled: !!token,
    async queryFn() {
      // 1. Get the parent profile (id + children) via /auth/me -> /parents/:id
      const meRes = await api.get("/auth/me", token);
      if (!meRes.ok) throw new Error("Failed to load profile");
      const me = await meRes.json();
      const parentId = me.profile?.id;
      if (!parentId)
        return { parent: me.profile ?? null, children: [] as Child[] };

      const parentRes = await api.get(`/parents/${parentId}`, token);
      const parent = parentRes.ok ? await parentRes.json() : null;
      const children: Child[] = parent?.children ?? [];

      return { parent, children };
    },
  });
}

/** Per-child stats: attendance, results, fees (parallel fetches, tolerant). */
export function useChildStats(child: Child | undefined, token?: string | null) {
  return useQuery({
    queryKey: ["child-stats", child?.id, token],
    enabled: !!child && !!token,
    async queryFn(): Promise<ChildStats> {
      if (!child) return emptyStats;
      const [feesRes, resultsRes, attendanceRes] = await Promise.all([
        api.get(`/students/${child.id}/fees`, token),
        api.get(`/students/${child.id}/results`, token),
        api.get(`/students/${child.id}/attendance`, token),
      ]);

      // --- Fees ---
      let feeTotal = 0;
      let feePaid = 0;
      if (feesRes.ok) {
        const fees = await feesRes.json().catch(() => []);
        const list = Array.isArray(fees) ? fees : (fees?.data ?? []);
        for (const f of list) {
          feeTotal += Number(f.amount || f.amountDue || f.totalFee || 0);
          feePaid += Number(f.amountPaid || 0);
        }
      }

      // --- Results (latest per subject average) ---
      const recentResults: { subject: string; score: number }[] = [];
      let averageScore = 0;
      if (resultsRes.ok) {
        const results = await resultsRes.json().catch(() => []);
        const list = Array.isArray(results) ? results : [];
        const bySubject = new Map<string, number[]>();
        for (const r of list) {
          const subject = r.subject?.name || r.subjectName || "Subject";
          const arr = bySubject.get(subject) ?? [];
          arr.push(Number(r.score ?? 0));
          bySubject.set(subject, arr);
        }
        let sum = 0;
        let count = 0;
        for (const [subject, scores] of bySubject) {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          recentResults.push({ subject, score: Math.round(avg) });
          sum += avg;
          count++;
        }
        averageScore = count ? Math.round(sum / count) : 0;
      }

      // --- Attendance ---
      let present = 0;
      let total = 0;
      if (attendanceRes.ok) {
        const attendance = await attendanceRes.json().catch(() => []);
        const list = Array.isArray(attendance) ? attendance : [];
        for (const a of list) {
          total++;
          if (a.status === "present" || a.present === true) present++;
        }
      }
      const attendanceRate = total ? Math.round((present / total) * 100) : 0;

      return {
        attendanceRate,
        averageScore,
        feeTotal,
        feePaid,
        feeBalance: Math.max(0, feeTotal - feePaid),
        recentResults: recentResults
          .sort((a, b) => b.score - a.score)
          .slice(0, 4),
        attendanceSummary: { present, absent: total - present, total },
      };
    },
  });
}

export { emptyStats };
