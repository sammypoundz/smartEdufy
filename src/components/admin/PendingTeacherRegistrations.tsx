// frontend/src/components/admin/PendingTeacherRegistrations.tsx
// Admin review card: lists teachers awaiting approval of their self-registration.
// Approving auto-assigns them to their registered class/subject (the backend
// returns what was assigned and we show it as a success summary).
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { api } from "../../utils/api";
import {
  UserPlusIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  usePendingTeacherRegistrations,
  useTeacherRegistrationActions,
  type PendingTeacherRegistration,
} from "../../hooks/useTeacherRegistration";

const TYPE_LABEL: Record<string, string> = {
  FORM_TEACHER: "Form Teacher",
  SUBJECT_TEACHER: "Subject Teacher",
  BOTH: "Form + Subject Teacher",
};

interface ClassWithArms {
  id: string;
  name: string;
  arms: { id: string; letter: string; alias?: string | null }[];
}

/** Resolve arm ids to human labels ("BASIC 1 – A") from the school's classes. */
function useArmLabelMap() {
  const { token } = useAuth();
  const { data: classes = [] } = useQuery<ClassWithArms[]>({
    queryKey: ["classes-for-pending-registrations"],
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await api.get("/classes", token!);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.classes ?? data ?? []) as ClassWithArms[];
    },
  });
  const map = new Map<string, string>();
  for (const c of classes)
    for (const a of c.arms)
      map.set(a.id, a.alias ? `${c.name} – ${a.alias}` : `${c.name} – ${a.letter || "A"}`);
  return map;
}

export default function PendingTeacherRegistrations() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const { data, isLoading } = usePendingTeacherRegistrations(token);
  const { approve, reject } = useTeacherRegistrationActions(token);
  const [busyId, setBusyId] = useState<string | null>(null);

  const pending = data?.pending ?? [];
  const isDark = theme === "dark";
  const armLabels = useArmLabelMap();

  const handleApprove = async (t: PendingTeacherRegistration) => {
    setBusyId(t.id);
    try {
      const result = await approve.mutateAsync(t.id);
      const lines: string[] = [];
      if (result.assignedArms?.length)
        lines.push(`<b>Classes (form):</b> ${result.assignedArms.join(", ")}`);
      if (result.assignedSubjects?.length)
        lines.push(`<b>Subjects:</b> ${result.assignedSubjects.join(", ")}`);
      Swal.fire({
        icon: "success",
        title: "Registration approved",
        html: `<p class="mb-2">${t.name} can now log in.</p>${
          lines.map((l) => `<p class="text-sm">${l}</p>`).join("") ||
          '<p class="text-sm">No auto-assignments matched their preferences.</p>'
        }`,
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to approve");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (t: PendingTeacherRegistration) => {
    const { value: note } = await Swal.fire({
      icon: "warning",
      title: `Reject ${t.name}?`,
      input: "textarea",
      inputPlaceholder: "Optional note for the rejection…",
      showCancelButton: true,
      confirmButtonText: "Reject",
      confirmButtonColor: "#dc2626",
    });
    if (!note && note !== "") return; // cancelled
    setBusyId(t.id);
    try {
      await reject.mutateAsync({ id: t.id, note: note || undefined });
      toast.success("Registration rejected");
    } catch (err: any) {
      toast.error(err.message || "Failed to reject");
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) return null;

  return (
    <div
      className={`rounded-2xl p-6 mb-8 border ${
        isDark
          ? "bg-amber-500/5 border-amber-500/20 backdrop-blur-xl"
          : "bg-amber-50/80 border-amber-200 shadow-lg backdrop-blur-xl"
      }`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`p-2 rounded-full ${
            isDark
              ? "bg-amber-500/20 text-amber-300"
              : "bg-amber-100 text-amber-600"
          }`}
        >
          <UserPlusIcon className="h-5 w-5" />
        </div>
        <div>
          <h3
            className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}
          >
            Pending Registrations
          </h3>
          <p
            className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
          >
            {pending.length > 0
              ? `${pending.length} teacher${pending.length > 1 ? "s" : ""} awaiting approval — approving auto-assigns them to their registered class/subject.`
              : "No teachers awaiting approval."}
          </p>
        </div>
      </div>

      {pending.length === 0 ? (
        <div
          className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl ${
            isDark ? "bg-white/5 text-gray-400" : "bg-white text-gray-500"
          }`}
        >
          <CheckCircleIcon className="h-4 w-4 text-green-500" />
          All caught up!
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((t) => {
            const busy = busyId === t.id;
            const brief = t.briefSubjects || {};
            const showForm =
              t.teacherType === "FORM_TEACHER" || t.teacherType === "BOTH";
            const showSubject =
              t.teacherType === "SUBJECT_TEACHER" || t.teacherType === "BOTH";
            // Form-teacher arms resolved to labels (fall back to class names
            // for legacy briefs that stored names only).
            const formArmLabels = showForm
              ? (brief.armIds || [])
                  .map((id) => armLabels.get(id))
                  .filter((l): l is string => !!l)
              : [];
            if (showForm && formArmLabels.length === 0 && !brief.armIds?.length)
              formArmLabels.push(...(brief.classes || []));
            // Group subjectArms pairings by subject: [{subject, arms: labels[]}]
            const grouped: { subject: string; arms: string[] }[] = [];
            if (showSubject) {
              const bySubject = new Map<string, string[]>();
              const pairs = brief.subjectArms || [];
              for (const sa of pairs) {
                const list = bySubject.get(sa.subject) || [];
                list.push(armLabels.get(sa.armId) || sa.armId);
                bySubject.set(sa.subject, list);
              }
              for (const [subject, arms] of bySubject) {
                grouped.push({ subject, arms });
              }
            }
            const groupedSubjects = grouped;
            return (
              <div
                key={t.id}
                className={`flex flex-col md:flex-row md:items-center gap-3 justify-between rounded-xl p-4 ${
                  isDark ? "bg-white/5" : "bg-white"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
                    >
                      {t.name || t.email}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isDark
                          ? "bg-sky-900/40 text-sky-300"
                          : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      {TYPE_LABEL[t.teacherType] || t.teacherType}
                    </span>
                    {t.gender && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isDark
                            ? "bg-purple-900/40 text-purple-300"
                            : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {t.gender === "MALE"
                          ? "♂ Male"
                          : t.gender === "FEMALE"
                            ? "♀ Female"
                            : t.gender}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-sm mt-0.5 ${isDark ? "text-gray-400" : "text-gray-600"}`}
                  >
                    {t.email}
                    {t.phone ? ` • ${t.phone}` : ""}
                  </p>
                  <div className="flex flex-col gap-1.5 mt-2">
                    {/* Form-teacher arms (only for FORM_TEACHER / BOTH) */}
                    {showForm && (
                      <div className="flex flex-wrap gap-1.5 items-baseline">
                        <span
                          className={`text-[11px] font-semibold ${isDark ? "text-gray-300" : "text-gray-600"}`}
                        >
                          Form teacher of:
                        </span>
                        {formArmLabels.length > 0 ? (
                          formArmLabels.map((c) => (
                            <span
                              key={c}
                              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                isDark
                                  ? "bg-white/10 text-gray-300"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              🏫 {c}
                            </span>
                          ))
                        ) : (
                          <span
                            className={`text-[11px] ${isDark ? "text-gray-500" : "text-gray-400"}`}
                          >
                            no arms chosen
                          </span>
                        )}
                      </div>
                    )}
                    {/* Subject → class-arm pairings (SUBJECT_TEACHER / BOTH) */}
                    {showSubject && (
                      <div className="flex flex-col gap-1">
                        <span
                          className={`text-[11px] font-semibold ${isDark ? "text-gray-300" : "text-gray-600"}`}
                        >
                          Teaching:
                        </span>
                        {groupedSubjects.length > 0 ? (
                          groupedSubjects.map(({ subject, arms }) => (
                            <div
                              key={subject}
                              className="flex items-start gap-1.5 flex-wrap"
                            >
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                  isDark
                                    ? "bg-sky-900/40 text-sky-300"
                                    : "bg-sky-100 text-sky-700"
                                }`}
                              >
                                📚 {subject}
                              </span>
                              <span
                                className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}
                              >
                                → {arms.length ? arms.join(", ") : "no arms chosen"}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span
                            className={`text-[11px] ${isDark ? "text-gray-500" : "text-gray-400"}`}
                          >
                            no subjects chosen
                          </span>
                        )}
                      </div>
                    )}
                    {formArmLabels.length === 0 && groupedSubjects.length === 0 && (
                      <span
                        className={`text-[11px] ${isDark ? "text-gray-500" : "text-gray-400"}`}
                      >
                        No class/subject preferences declared
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    disabled={busy}
                    onClick={() => handleApprove(t)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                    {busy ? "Approving…" : "Approve"}
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => handleReject(t)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    <XCircleIcon className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
