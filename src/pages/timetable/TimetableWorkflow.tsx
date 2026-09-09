// src/pages/timetable/TimetableWorkflow.tsx
// Timetable workflow UI shared by admins and teachers.
//  - Teachers: see assigned subjects (allowed days + required periods) and
//    pick their available slots; occupied/conflicting slots are disabled.
//  - Admins: manage subject→teacher assignments per arm, review submissions
//    with a conflict report, request changes, approve & lock.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../utils/api";
import toast from "react-hot-toast";
import {
  ArrowPathIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const TIME_SLOTS = [
  "8:00–8:45",
  "8:45–9:30",
  "9:30–10:15",
  "10:30–11:15",
  "11:15–12:00",
  "13:00–13:45",
  "13:45–14:30",
];

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300",
  PENDING_REVIEW:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300",
  CHANGES_REQUESTED:
    "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",
  APPROVED:
    "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300",
};

interface Slot {
  dayOfWeek: string;
  timeSlot: string;
  assignmentId?: string;
}
interface Assignment {
  id: string;
  subjectId: string;
  armId: string;
  teacherId: string;
  allowedDays: string[];
  periodsPerWeek: number;
  subject?: { id: string; name: string };
  arm?: {
    id: string;
    letter: string;
    alias?: string;
    class?: { name: string };
    classId: string;
  };
  teacher?: { id: string; name: string; email: string };
  slots: Slot[];
}
interface Review {
  armId: string;
  status: string;
  reviewNote?: string;
  // JSON map of { assignmentId: note } — per-subject change requests.
  requestedChanges?: string | null;
}

// Parse the per-assignment change-request flags stored on an arm review.
const parseChangeFlags = (
  review?: Review | null,
): Record<string, string> => {
  if (!review?.requestedChanges) return {};
  try {
    const parsed = JSON.parse(review.requestedChanges);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

type Role = "admin" | "teacher";

const Spinner = () => (
  <ArrowPathIcon className="h-4 w-4 animate-spin flex-shrink-0" />
);

export default function TimetableWorkflowPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const role: Role = window.location.pathname.startsWith("/admin")
    ? "admin"
    : "teacher";
  const dark = useMemo(
    () => document.documentElement.classList.contains("dark"),
    [],
  );
  const card = dark ? "bg-white/5 border-white/10" : "bg-white border-gray-200";
  const text = dark ? "text-white" : "text-gray-900";
  const sub = dark ? "text-gray-400" : "text-gray-500";

  // ----- teacher state -----
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [occupied, setOccupied] = useState<Slot[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Slot[]>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [teacherLoading, setTeacherLoading] = useState(true);

  // ----- admin state -----
  const [armAssignments, setArmAssignments] = useState<Assignment[]>([]);
  const [issues, setIssues] = useState<
    { type: string; message: string; dayOfWeek?: string; timeSlot?: string }[]
  >([]);
  const [reviewStatus, setReviewStatus] = useState<Review | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const setBusyScope = (scope: string | null) => setBusy(scope);
  const [editing, setEditing] = useState<{
    id?: string;
    subjectId: string;
    armId: string;
    teacherId: string;
    allowedDays: string[];
    periodsPerWeek: number;
  } | null>(null);
  const [requestChangesTarget, setRequestChangesTarget] =
    useState<Assignment | null>(null);
  const [changeNote, setChangeNote] = useState("");
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);
  const [arms, setArms] = useState<{ id: string; label: string }[]>([]);
  const [selectedArmId, setSelectedArmId] = useState("");
  // All arm review statuses — powers the "Action needed" banner for admins.
  const [allReviews, setAllReviews] = useState<Review[]>([]);

  const fetchTeacher = useCallback(async () => {
    setTeacherLoading(true);
    try {
      const res = await api.get("/timetable-workflow/mine", token);
      if (!res.ok) return toast.error("Failed to load your assignments");
      const data = await res.json();
      setAssignments(data.assignments || []);
      setOccupied(data.occupiedSlots || []);
      setReviews(data.reviews || []);
      setDrafts(
        Object.fromEntries(
          (data.assignments || []).map((a: Assignment) => [a.id, a.slots]),
        ),
      );
    } finally {
      setTeacherLoading(false);
    }
  }, [token]);

  const fetchAdmin = useCallback(
    async (armId: string) => {
      setLoading(true);
      try {
        const res = await api.get(`/timetable-workflow/arm/${armId}`, token);
        if (!res.ok) {
          toast.error("Failed to load arm review");
          return;
        }
        const data = await res.json();
        setArmAssignments(data.assignments || []);
        setIssues(data.issues || []);
        setReviewStatus(data.review);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (role === "teacher") fetchTeacher();
  }, [role, fetchTeacher]);

  useEffect(() => {
    if (role !== "admin") return;
    (async () => {
      const [s, t, c] = await Promise.all([
        api.get("/subjects", token),
        api.get("/teachers", token),
        api.get("/classes", token),
      ]);
      if (s.ok) setSubjects(await s.json());
      if (t.ok) setTeachers(await t.json());
      if (c.ok) {
        const classes = await c.json();
        setArms(
          classes.flatMap((cl: any) =>
            (cl.arms || []).map((a: any) => ({
              id: a.id,
              label: `${cl.name} ${a.letter || a.alias || ""}`.trim(),
            })),
          ),
        );
      }
      const rv = await api.get("/timetable-workflow/reviews", token);
      if (rv.ok) setAllReviews(await rv.json());
    })();
  }, [role, token]);

  useEffect(() => {
    if (role === "admin" && selectedArmId) fetchAdmin(selectedArmId);
  }, [role, selectedArmId, fetchAdmin]);

  const reviewFor = (armId: string) => reviews.find((r) => r.armId === armId);

  // ----- teacher slot toggling with client-side conflict prevention -----
  const toggleSlot = (a: Assignment, day: string, slot: string) => {
    const draft = drafts[a.id] || [];
    const idx = draft.findIndex(
      (s) => s.dayOfWeek === day && s.timeSlot === slot,
    );
    if (idx >= 0) {
      setDrafts((p) => ({ ...p, [a.id]: draft.filter((_, i) => i !== idx) }));
      return;
    }
    if (!a.allowedDays.includes(day))
      return toast.error(`${day} is not an allowed day for this subject`);
    if (draft.length >= a.periodsPerWeek)
      return toast.error(`Max ${a.periodsPerWeek} period(s) for this subject`);
    if (
      occupied.some(
        (o) =>
          o.dayOfWeek === day && o.timeSlot === slot && o.assignmentId !== a.id,
      )
    )
      return toast.error("You already occupy this slot in another subject");
    for (const [otherId, list] of Object.entries(drafts)) {
      if (otherId === a.id) continue;
      if (list.some((s) => s.dayOfWeek === day && s.timeSlot === slot))
        return toast.error(
          "This slot clashes with your selection in another subject",
        );
    }
    setDrafts((p) => ({
      ...p,
      [a.id]: [...draft, { dayOfWeek: day, timeSlot: slot }],
    }));
  };

  const saveSlots = async (a: Assignment) => {
    setSavingId(a.id);
    try {
      const res = await api.put(
        `/timetable-workflow/assignments/${a.id}/slots`,
        { slots: drafts[a.id] || [] },
        token,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Save failed" }));
        toast.error(err.error || "Save failed");
        return;
      }
      toast.success("Slots submitted for review");
      await fetchTeacher();
    } finally {
      setSavingId(null);
    }
  };

  // ----- admin actions -----
  const saveAssignment = async () => {
    if (!editing) return;
    setBusyScope("saveAssignment");
    try {
      const body = {
        subjectId: editing.subjectId,
        armId: editing.armId,
        teacherId: editing.teacherId,
        allowedDays: editing.allowedDays,
        periodsPerWeek: editing.periodsPerWeek,
      };
      const res = editing.id
        ? await api.patch(
            `/timetable-workflow/assignments/${editing.id}`,
            body,
            token,
          )
        : await api.post("/timetable-workflow/assignments", body, token);
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        toast.error(e.error || "Save failed");
        return;
      }
      toast.success("Assignment saved");
      setEditing(null);
      fetchAdmin(selectedArmId);
      refreshAllReviews();
    } finally {
      setBusyScope(null);
    }
  };

  const deleteAssignment = async (id: string) => {
    setBusyScope(`delete:${id}`);
    try {
      const res = await api.del(`/timetable-workflow/assignments/${id}`, token);
      if (!res.ok) return toast.error("Delete failed");
      toast.success("Assignment deleted");
      fetchAdmin(selectedArmId);
    } finally {
      setBusyScope(null);
    }
  };

  const requestChanges = async () => {
    if (!requestChangesTarget) return;
    setBusyScope("requestChanges");
    try {
      const res = await api.post(
        `/timetable-workflow/assignments/${requestChangesTarget.id}/request-changes`,
        { note: changeNote },
        token,
      );
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        toast.error(e.error || "Failed");
        return;
      }
      toast.success(
        `Changes requested for ${requestChangesTarget.subject?.name}`,
      );
      setRequestChangesTarget(null);
      setChangeNote("");
      fetchAdmin(selectedArmId);
      refreshAllReviews();
    } finally {
      setBusyScope(null);
    }
  };

  const approve = async () => {
    setBusyScope("approve");
    try {
      const res = await api.post(
        `/timetable-workflow/arm/${selectedArmId}/approve`,
        { force: true },
        token,
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Approval failed");
        if (data.issues) setIssues(data.issues);
        return;
      }
      toast.success(`Timetable approved & locked (${data.entries} periods)`);
      fetchAdmin(selectedArmId);
      refreshAllReviews();
    } finally {
      setBusyScope(null);
    }
  };

  const unlock = async () => {
    setBusyScope("unlock");
    try {
      const res = await api.post(
        `/timetable-workflow/arm/${selectedArmId}/unlock`,
        {},
        token,
      );
      if (!res.ok) return toast.error("Unlock failed");
      toast.success("Timetable unlocked");
      fetchAdmin(selectedArmId);
    } finally {
      setBusyScope(null);
    }
  };

  const status = reviewStatus?.status || "DRAFT";
  const locked = status === "APPROVED";

  // Arms whose timetable is awaiting the admin's approval right now.
  const pendingArms = useMemo(
    () =>
      allReviews
        .filter((r) => r.status === "PENDING_REVIEW")
        .map((r) => ({
          ...r,
          label: arms.find((a) => a.id === r.armId)?.label || "Unknown class",
        })),
    [allReviews, arms],
  );

  // For each pending arm, drill into its assignments so the banner can name
  // the exact subject–teacher pairs the admin should chase.
  const [pendingDetails, setPendingDetails] = useState<
    Record<string, { subject: string; teacher: string; missing: number }[]>
  >({});
  const pendingArmIds = pendingArms.map((p) => p.armId).join(",");
  useEffect(() => {
    if (role !== "admin" || !pendingArmIds) return;
    let cancelled = false;
    (async () => {
      const next: Record<
        string,
        { subject: string; teacher: string; missing: number }[]
      > = {};
      await Promise.all(
        pendingArmIds.split(",").map(async (armId) => {
          try {
            const res = await api.get(`/timetable-workflow/arm/${armId}`, token);
            if (!res.ok) return;
            const data = await res.json();
            next[armId] = (data.assignments || [])
              .filter((a: Assignment) => a.slots.length < a.periodsPerWeek)
              .map((a: Assignment) => ({
                subject: a.subject?.name || "Unknown subject",
                teacher: a.teacher?.name || "Unknown teacher",
                missing: a.periodsPerWeek - a.slots.length,
              }));
          } catch {
            /* best-effort */
          }
        }),
      );
      if (!cancelled) setPendingDetails(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [role, pendingArmIds, token]);

  // Re-check review statuses after any admin action on an arm.
  const refreshAllReviews = useCallback(async () => {
    if (!token) return;
    try {
      const rv = await api.get("/timetable-workflow/reviews", token);
      if (rv.ok) setAllReviews(await rv.json());
    } catch {
      /* best-effort */
    }
  }, [token]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            onClick={() => navigate(-1)}
            className={`mb-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              dark
                ? "border-white/20 text-gray-300 hover:bg-white/10"
                : "border-gray-300 text-gray-600 hover:bg-gray-100"
            }`}
          >
            <ArrowLeftIcon className="h-4 w-4" /> Back
          </button>
          <h1 className={`text-2xl font-bold flex items-center gap-2 ${text}`}>
            <ClockIcon className="h-7 w-7 text-blue-500" />
            {role === "admin" ? "Timetable Workflow" : "My Teaching Slots"}
          </h1>
          <p className={`text-sm mt-1 ${sub}`}>
            {role === "admin"
              ? "Assign subjects to teachers, review slot and lock the timetable."
              : "Pick your available periods for each assigned subject."}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${STATUS_BADGE[status] || STATUS_BADGE.DRAFT}`}
        >
          {locked && <LockClosedIcon className="h-3.5 w-3.5" />}
          {status.replace("_", " ")}
        </span>
      </div>

      {/* Admin: name the arms AND the exact subject/teacher pairs to chase */}
      {role === "admin" && pendingArms.length > 0 && (
        <div
          className={`rounded-xl border p-4 text-sm flex gap-2 items-start ${
            dark
              ? "bg-red-500/10 border-red-500/30 text-red-300"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="font-semibold">
              Action needed — {pendingArms.length} timetable
              {pendingArms.length > 1 ? "s" : ""} awaiting your approval.
              Focus on:
            </span>
            <ul className="mt-2 space-y-2">
              {pendingArms.map((p) => (
                <li key={p.armId}>
                  <button
                    onClick={() => setSelectedArmId(p.armId)}
                    className="font-semibold underline hover:opacity-80 text-left"
                  >
                    {p.label}
                  </button>
                  {(pendingDetails[p.armId] || []).length > 0 ? (
                    <ul className="mt-1 ml-4 list-disc space-y-0.5">
                      {pendingDetails[p.armId].map((d, i) => (
                        <li key={i} className="font-normal">
                          <span className="font-medium">{d.subject}</span> —{" "}
                          {d.teacher} ({d.missing} period
                          {d.missing > 1 ? "s" : ""} not yet submitted)
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="font-normal">
                      {" "}
                      — all teachers submitted; review the conflict report and
                      approve &amp; lock.
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {reviewStatus?.reviewNote && status === "CHANGES_REQUESTED" && (
        <div
          className={`rounded-xl border p-4 text-sm flex gap-2 ${card} ${dark ? "text-orange-300" : "text-orange-700"}`}
        >
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
          <div>
            <span className="font-semibold">Changes requested: </span>
            {reviewStatus.reviewNote}
          </div>
        </div>
      )}

      {/* ---------------- ADMIN ---------------- */}
      {role === "admin" && (
        <>
          <div
            className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${card}`}
          >
            <select
              value={selectedArmId}
              onChange={(e) => setSelectedArmId(e.target.value)}
              className={`rounded-lg border px-3 py-2 text-sm ${dark ? "bg-white/10 border-white/20 text-white" : "bg-white border-gray-300 text-gray-900"}`}
            >
              <option value="">-- Choose a class arm --</option>
              {arms.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
            {selectedArmId && (
              <>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:ml-auto">
                  <button
                    onClick={() =>
                      setEditing({
                        subjectId: "",
                        armId: selectedArmId,
                        teacherId: "",
                        allowedDays: [],
                        periodsPerWeek: 1,
                      })
                    }
                    disabled={busy !== null}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {busy === "saveAssignment" ? <Spinner /> : null}+ Assign
                    Subject
                  </button>
                  {locked ? (
                    <button
                      onClick={unlock}
                      disabled={busy !== null}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-400 text-gray-600 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {busy === "unlock" && <Spinner />}
                      Unlock
                    </button>
                  ) : (
                    <button
                      onClick={approve}
                      disabled={busy !== null}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {busy === "approve" && <Spinner />}
                      Approve &amp; Lock
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {selectedArmId && issues.length > 0 && (
            <div className={`rounded-xl border p-4 ${card}`}>
              <h3
                className={`font-semibold text-sm mb-2 flex items-center gap-2 ${dark ? "text-orange-300" : "text-orange-700"}`}
              >
                <ExclamationTriangleIcon className="h-4 w-4" /> Conflict report
                ({issues.length})
              </h3>
              <ul className="space-y-1 text-sm">
                {issues.map((i, idx) => (
                  <li
                    key={idx}
                    className={dark ? "text-gray-300" : "text-gray-600"}
                  >
                    <span
                      className={`font-semibold mr-1 ${i.type === "REQUIREMENT" ? (dark ? "text-yellow-300" : "text-yellow-700") : dark ? "text-red-300" : "text-red-700"}`}
                    >
                      [{i.type}]
                    </span>
                    {i.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selectedArmId && loading ? (
            <div className="flex justify-center py-12">
              <ArrowPathIcon className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : (
            selectedArmId && (
              <div
                className={`rounded-xl border divide-y ${card} ${dark ? "divide-white/10" : "divide-gray-100"}`}
              >
                {armAssignments.length === 0 && (
                  <p className={`p-6 text-center text-sm ${sub}`}>
                    No subjects assigned yet — click “Assign Subject”.
                  </p>
                )}
                {armAssignments.map((a) => {
                  // Flag rows where the teacher still owes periods for this
                  // subject (unless the arm is locked) so the admin can see
                  // exactly what's holding up approval.
                  const armReview = allReviews.find((r) => r.armId === a.armId);
                  const flagged = parseChangeFlags(armReview);
                  const subjectNote = flagged[a.id];
                  const incomplete =
                    !locked && a.slots.length < a.periodsPerWeek;
                  return (
                  <div
                    key={a.id}
                    className={`p-4 flex flex-wrap items-center gap-3 ${
                      incomplete
                        ? dark
                          ? "bg-red-500/10 ring-1 ring-inset ring-red-500/40"
                          : "bg-red-50 ring-1 ring-inset ring-red-400"
                        : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold flex items-center gap-2 flex-wrap ${text}`}>
                        {a.subject?.name} — {a.teacher?.name}
                        {incomplete && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-600 text-white animate-pulse">
                            <ExclamationTriangleIcon className="h-3 w-3" />
                            Action needed
                          </span>
                        )}
                      </p>
                      <p className={`text-xs mt-0.5 ${sub}`}>
                        {a.periodsPerWeek} period(s)/week · Days:{" "}
                        {a.allowedDays.join(", ") || "any"} · Submitted:{" "}
                        {a.slots.length}
                        {a.slots.length > 0 &&
                          ` (${a.slots.map((s) => `${s.dayOfWeek.slice(0, 3)} ${s.timeSlot}`).join(", ")})`}
                      </p>
                      {incomplete && (
                        <p
                          className={`text-xs mt-1 font-medium ${
                            dark ? "text-red-300" : "text-red-600"
                          }`}
                        >
                          Teacher still needs to submit{" "}
                          {a.periodsPerWeek - a.slots.length} more period(s)
                        </p>
                      )}
                      {subjectNote && (
                        <p
                          className={`text-xs mt-1 font-medium ${
                            dark ? "text-orange-300" : "text-orange-700"
                          }`}
                        >
                          Change requested: {subjectNote}
                        </p>
                      )}
                    </div>
                    {!locked && (
                      <>
                        <button
                          onClick={() =>
                            setEditing({
                              id: a.id,
                              subjectId: a.subjectId,
                              armId: a.armId,
                              teacherId: a.teacherId,
                              allowedDays: a.allowedDays,
                              periodsPerWeek: a.periodsPerWeek,
                            })
                          }
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteAssignment(a.id)}
                          disabled={busy !== null}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {busy === `delete:${a.id}` ? (
                            <Spinner />
                          ) : (
                            <TrashIcon className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setChangeNote(subjectNote || "");
                            setRequestChangesTarget(a);
                          }}
                          disabled={busy !== null}
                          title="Ask this teacher to revise this subject's slots"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <PencilSquareIcon className="h-3.5 w-3.5" />
                          {subjectNote ? "Edit Request" : "Request Changes"}
                        </button>
                      </>
                    )}
                  </div>
                  );
                })}
              </div>
            )
          )}

          {/* assignment modal */}
          {editing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div
                className={`w-full max-w-md rounded-xl p-5 space-y-4 ${dark ? "bg-[#111827]" : "bg-white"}`}
              >
                <h3 className={`font-semibold ${text}`}>
                  {editing.id ? "Edit" : "New"} subject assignment
                </h3>
                <select
                  value={editing.subjectId}
                  onChange={(e) =>
                    setEditing({ ...editing, subjectId: e.target.value })
                  }
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${dark ? "bg-white/10 border-white/20 text-white" : "bg-white border-gray-300"}`}
                >
                  <option value="">-- Subject --</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {!editing.id && (
                  <select
                    value={editing.armId}
                    onChange={(e) =>
                      setEditing({ ...editing, armId: e.target.value })
                    }
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${dark ? "bg-white/10 border-white/20 text-white" : "bg-white border-gray-300"}`}
                  >
                    {arms.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                )}
                <select
                  value={editing.teacherId}
                  onChange={(e) =>
                    setEditing({ ...editing, teacherId: e.target.value })
                  }
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${dark ? "bg-white/10 border-white/20 text-white" : "bg-white border-gray-300"}`}
                >
                  <option value="">-- Teacher --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((d) => (
                    <button
                      key={d}
                      onClick={() =>
                        setEditing({
                          ...editing,
                          allowedDays: editing.allowedDays.includes(d)
                            ? editing.allowedDays.filter((x) => x !== d)
                            : [...editing.allowedDays, d],
                        })
                      }
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border ${editing.allowedDays.includes(d) ? "bg-blue-600 border-blue-600 text-white" : dark ? "border-white/20 text-gray-300" : "border-gray-300 text-gray-700"}`}
                    >
                      {d.slice(0, 3)}
                    </button>
                  ))}
                </div>
                <label className={`text-sm ${sub}`}>Periods per week</label>
                <input
                  type="number"
                  min={1}
                  value={editing.periodsPerWeek}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      periodsPerWeek: Number(e.target.value),
                    })
                  }
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${dark ? "bg-white/10 border-white/20 text-white" : "bg-white border-gray-300"}`}
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEditing(null)}
                    className={`px-4 py-2 rounded-lg text-sm border ${dark ? "border-white/20 text-gray-300" : "border-gray-300 text-gray-700"}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveAssignment}
                    disabled={
                      !editing.subjectId ||
                      !editing.teacherId ||
                      busy === "saveAssignment"
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {busy === "saveAssignment" && <Spinner />}
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* request-changes modal — targeted at ONE subject/assignment */}
          {requestChangesTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div
                className={`w-full max-w-md rounded-xl p-5 space-y-4 ${dark ? "bg-[#111827]" : "bg-white"}`}
              >
                <div>
                  <h3 className={`font-semibold ${text}`}>
                    Request changes from teacher
                  </h3>
                  <p className={`text-xs mt-1 ${sub}`}>
                    Only{" "}
                    <span className="font-medium">
                      {requestChangesTarget.subject?.name}
                    </span>{" "}
                    — {requestChangesTarget.teacher?.name} will be asked to
                    revise. Other subjects are unaffected.
                  </p>
                </div>
                <textarea
                  rows={3}
                  value={changeNote}
                  onChange={(e) => setChangeNote(e.target.value)}
                  placeholder="Describe what needs to change…"
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${dark ? "bg-white/10 border-white/20 text-white" : "bg-white border-gray-300"}`}
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setRequestChangesTarget(null)}
                    className={`px-4 py-2 rounded-lg text-sm border ${dark ? "border-white/20 text-gray-300" : "border-gray-300 text-gray-700"}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={requestChanges}
                    disabled={!changeNote.trim() || busy === "requestChanges"}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-orange-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {busy === "requestChanges" && <Spinner />}
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ---------------- TEACHER ---------------- */}
      {role === "teacher" && (
        <div className="space-y-4">
          {teacherLoading ? (
            <div
              className={`rounded-xl border p-12 flex flex-col items-center justify-center gap-3 ${card}`}
            >
              <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-500" />
              <p className={`text-sm ${sub}`}>Loading your teaching slots…</p>
            </div>
          ) : (
            <>
          {(() => {
            // Summary of assignments that need the teacher's action,
            // grouped by class/arm so they know exactly where to act.
            // Only subjects specifically flagged by the admin count as
            // "changes requested" — arm-wide status alone isn't enough.
            const isFlagged = (a: Assignment) => {
              const review = reviewFor(a.armId);
              if (review?.status !== "CHANGES_REQUESTED") return false;
              const flags = parseChangeFlags(review);
              // Per-subject flag if set; empty map = legacy arm-wide request.
              return Boolean(flags[a.id]) || Object.keys(flags).length === 0;
            };
            const needing = assignments.filter((a) => {
              const st = reviewFor(a.armId)?.status || "DRAFT";
              if (st === "APPROVED") return false;
              if (st === "CHANGES_REQUESTED") return isFlagged(a);
              return (drafts[a.id] || []).length < a.periodsPerWeek;
            });
            if (!needing.length) return null;
            const byArm = new Map<string, string>();
            for (const a of needing) {
              const label = `${a.arm?.class?.name || ""} ${a.arm?.letter || ""}`.trim();
              byArm.set(a.armId, label);
            }
            return (
              <div
                className={`rounded-xl border p-4 flex gap-2 text-sm items-start ${
                  dark
                    ? "bg-red-500/10 border-red-500/30 text-red-300"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}
              >
                <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">
                    Action needed in {byArm.size} class{byArm.size > 1 ? "es" : ""}:{" "}
                  </span>
                  {[...byArm.values()].join(", ")} — submit or revise your periods
                  below.
                </div>
              </div>
            );
          })()}
          {assignments.length === 0 && (
            <div
              className={`rounded-xl border p-10 text-center text-sm ${card} ${sub}`}
            >
              No subjects assigned to you yet.
            </div>
          )}
          {assignments.map((a) => {
            const review = reviewFor(a.armId);
            const armLocked = review?.status === "APPROVED";
            const draft = drafts[a.id] || [];
            const flags = parseChangeFlags(review);
            const flaggedForThis =
              review?.status === "CHANGES_REQUESTED" &&
              (Boolean(flags[a.id]) || Object.keys(flags).length === 0);
            const changeNoteForMe = flags[a.id] || review?.reviewNote;
            const changesRequested = flaggedForThis;
            const incomplete = !armLocked && draft.length < a.periodsPerWeek;
            const needsAction = changesRequested || incomplete;
            const armLabel = `${a.arm?.class?.name || ""} ${a.arm?.letter || ""}`.trim();
            const actionReason = changesRequested
              ? `Admin requested changes${changeNoteForMe ? `: ${changeNoteForMe}` : ""}`
              : incomplete
                ? `Select ${a.periodsPerWeek - draft.length} more period(s) for ${armLabel}`
                : "";
            return (
              <div
                key={a.id}
                className={`rounded-xl border p-4 ${card} ${
                  needsAction ? (dark ? "ring-1 ring-red-500/40" : "ring-1 ring-red-400") : ""
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-semibold ${text}`}>
                        {a.subject?.name}
                      </p>
                      {needsAction && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-600 text-white animate-pulse">
                          <ExclamationTriangleIcon className="h-3 w-3" />
                          Action needed · {armLabel}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mt-0.5 ${sub}`}>
                      {armLabel} · {a.periodsPerWeek}{" "}
                      period(s)/week · Allowed days:{" "}
                      {a.allowedDays.join(", ") || "any"}
                    </p>
                    {needsAction && (
                      <p className={`text-xs mt-1 font-medium ${dark ? "text-red-300" : "text-red-600"}`}>
                        {actionReason}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[review?.status || "DRAFT"]}`}
                    >
                      {(review?.status || "DRAFT").replace("_", " ")}
                    </span>
                    <span className={`text-xs ${sub}`}>
                      {draft.length}/{a.periodsPerWeek} selected
                    </span>
                    {!armLocked && (
                      <button
                        onClick={() => saveSlots(a)}
                        disabled={savingId === a.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {savingId === a.id ? (
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircleIcon className="h-4 w-4" />
                        )}
                        Submit
                      </button>
                    )}
                  </div>
                </div>
                {armLocked ? (
                  <div
                    className={`text-xs ${dark ? "text-green-300" : "text-green-700"}`}
                  >
                    Locked:{" "}
                    {a.slots
                      .map((s) => `${s.dayOfWeek} ${s.timeSlot}`)
                      .join(" · ") || "no periods"}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr>
                          <th />
                          {TIME_SLOTS.map((s) => (
                            <th
                              key={s}
                              className={`p-1 text-[10px] font-medium ${sub}`}
                            >
                              {s}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {DAYS.map((day) => (
                          <tr key={day}>
                            <td
                              className={`p-1 text-xs font-medium whitespace-nowrap ${text} ${a.allowedDays.length && !a.allowedDays.includes(day) ? "opacity-40" : ""}`}
                            >
                              {day}
                            </td>
                            {TIME_SLOTS.map((slot) => {
                              const picked = draft.some(
                                (s) =>
                                  s.dayOfWeek === day && s.timeSlot === slot,
                              );
                              const occupiedElsewhere = occupied.some(
                                (o) =>
                                  o.dayOfWeek === day &&
                                  o.timeSlot === slot &&
                                  o.assignmentId !== a.id,
                              );
                              const clashOtherDraft = Object.entries(
                                drafts,
                              ).some(
                                ([id, list]) =>
                                  id !== a.id &&
                                  list.some(
                                    (s) =>
                                      s.dayOfWeek === day &&
                                      s.timeSlot === slot,
                                  ),
                              );
                              const dayDisallowed =
                                a.allowedDays.length > 0 &&
                                !a.allowedDays.includes(day);
                              return (
                                <td key={slot} className="p-1">
                                  <button
                                    onClick={() => toggleSlot(a, day, slot)}
                                    disabled={dayDisallowed}
                                    title={
                                      occupiedElsewhere || clashOtherDraft
                                        ? "Occupied"
                                        : dayDisallowed
                                          ? "Day not allowed"
                                          : ""
                                    }
                                    className={`w-16 h-7 rounded text-[10px] font-medium transition-colors ${
                                      picked
                                        ? "bg-blue-600 text-white"
                                        : occupiedElsewhere || clashOtherDraft
                                          ? dark
                                            ? "bg-red-500/20 text-red-300 cursor-not-allowed"
                                            : "bg-red-100 text-red-400 cursor-not-allowed"
                                          : dayDisallowed
                                            ? dark
                                              ? "bg-white/5 text-gray-600 cursor-not-allowed"
                                              : "bg-gray-100 text-gray-300 cursor-not-allowed"
                                            : dark
                                              ? "bg-white/10 text-gray-400 hover:bg-blue-500/30"
                                              : "bg-gray-100 text-gray-600 hover:bg-blue-100"
                                    }`}
                                  >
                                    {picked
                                      ? "✓"
                                      : occupiedElsewhere || clashOtherDraft
                                        ? "×"
                                        : ""}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
