// src/components/parent/AddChildCard.tsx
// "Add Your Child" onboarding card + "Add Another Child" flow for parents.
// Parents search by admission number and/or student name, submit a link
// request, and see its approval status using the same status indicators as
// the Timetable workflow (PENDING_REVIEW / CHANGES_REQUESTED / APPROVED /
// REJECTED).
import { useState } from "react";
import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  ArrowPathIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  useParentLinkRequests,
  useStudentSearch,
  useCreateLinkRequest,
  type LinkRequest,
  type StudentSearchResult,
} from "../../hooks/useParentLink";

/** Timetable-workflow style status badge. */
export function LinkStatusBadge({
  status,
  isDark,
}: {
  status: LinkRequest["status"];
  isDark: boolean;
}) {
  const map: Record<
    LinkRequest["status"],
    { label: string; cls: string; icon: React.ReactNode }
  > = {
    PENDING_REVIEW: {
      label: "Awaiting approval",
      cls: isDark
        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
        : "bg-amber-50 text-amber-700 border-amber-200",
      icon: <ClockIcon className="h-3.5 w-3.5" />,
    },
    APPROVED: {
      label: "Approved",
      cls: isDark
        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
        : "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <CheckCircleIcon className="h-3.5 w-3.5" />,
    },
    REJECTED: {
      label: "Rejected",
      cls: isDark
        ? "bg-red-500/15 text-red-300 border-red-500/30"
        : "bg-red-50 text-red-700 border-red-200",
      icon: <XCircleIcon className="h-3.5 w-3.5" />,
    },
    CHANGES_REQUESTED: {
      label: "Changes requested",
      cls: isDark
        ? "bg-orange-500/15 text-orange-300 border-orange-500/30"
        : "bg-orange-50 text-orange-700 border-orange-200",
      icon: <ExclamationTriangleIcon className="h-3.5 w-3.5" />,
    },
  };
  const s = map[status] ?? map.PENDING_REVIEW;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${s.cls}`}
    >
      {s.icon}
      {s.label}
    </span>
  );
}

/** One submitted request, with its workflow status. */
function RequestRow({
  request,
  isDark,
}: {
  request: LinkRequest;
  isDark: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-2xl border ${
        isDark
          ? "bg-white/5 border-white/10"
          : "bg-white border-gray-200 shadow-sm"
      }`}
    >
      <span
        className={`h-9 w-9 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
          isDark ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-600"
        }`}
      >
        {(request.student?.name || "?").slice(0, 2).toUpperCase()}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-semibold truncate ${isDark ? "text-white" : "text-gray-900"}`}
        >
          {request.student?.name || "Student"}
        </p>
        <p
          className={`text-xs truncate ${isDark ? "text-gray-400" : "text-gray-500"}`}
        >
          {request.student?.class?.name || "—"}
          {request.student?.arm?.letter
            ? ` · Arm ${request.student.arm.letter}`
            : ""}
        </p>
        {request.reviewNote && request.status !== "APPROVED" && (
          <p
            className={`text-xs mt-1 ${isDark ? "text-orange-300" : "text-orange-600"}`}
          >
            Note from school: {request.reviewNote}
          </p>
        )}
      </div>
      <LinkStatusBadge status={request.status} isDark={isDark} />
    </div>
  );
}

export default function AddChildCard({
  isOnboarding = false,
  onLinked,
}: {
  /** Onboarding mode: shown instead of the dashboard when no children are linked. */
  isOnboarding?: boolean;
  onLinked?: () => void;
}) {
  const { theme } = useTheme();
  const { token } = useAuth();
  const isDark = theme === "dark";
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<StudentSearchResult | null>(null);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const enableSearch = query.trim().length >= 2 && !selected;
  // Hoisted before the JSX: TS narrows `selected` to null inside the
  // `enableSearch &&` block (aliased-condition narrowing), which would make
  // `selected?.id` type `never` there.
  const selectedId = selected?.id;
  const { data: results = [], isFetching: isSearching } = useStudentSearch(
    query,
    token,
    enableSearch,
  );
  const { data: requestData } = useParentLinkRequests(token);
  const requests = requestData?.requests ?? [];
  const openRequests = requests.filter(
    (r) => r.status === "PENDING_REVIEW" || r.status === "CHANGES_REQUESTED",
  );

  const createRequest = useCreateLinkRequest(token);

  const cardCls = `rounded-3xl p-5 border ${
    isDark
      ? "bg-gradient-to-br from-gray-800 via-gray-900 to-blue-950 border-white/10"
      : "bg-white border-gray-200 shadow-sm"
  }`;

  const handleSubmit = () => {
    setLocalError(null);
    if (!selected) return;
    createRequest.mutate(
      { studentId: selected.id, note: note.trim() || undefined },
      {
        onSuccess: () => {
          setSelected(null);
          setQuery("");
          setNote("");
          setSubmitted(true);
          onLinked?.();
        },
        onError: (err: Error) => setLocalError(err.message),
      },
    );
  };

  return (
    <div className="space-y-4">
      {isOnboarding && (
        <div className={cardCls}>
          <div className="flex flex-col items-center text-center py-2">
            <span
              className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-3 ${
                isDark
                  ? "bg-blue-500/20 text-blue-300"
                  : "bg-blue-100 text-blue-600"
              }`}
            >
              <UserPlusIcon className="h-7 w-7" />
            </span>
            <h2
              className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}
            >
              Add Your Child
            </h2>
            <p
              className={`mt-1 text-sm max-w-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              Search for your child by admission number or name and send a link
              request. The school will review and approve it before the child
              appears on your dashboard.
            </p>
          </div>
        </div>
      )}

      {/* Search & submit */}
      <div className={cardCls}>
        <label
          className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
            isDark ? "text-gray-400" : "text-gray-500"
          }`}
        >
          Find your child
        </label>
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl border ${
            isDark
              ? "bg-gray-900/70 border-white/10"
              : "bg-white border-gray-200 shadow-sm"
          }`}
        >
          <MagnifyingGlassIcon
            className={`h-5 w-5 ${isDark ? "text-gray-500" : "text-gray-400"}`}
          />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
              setLocalError(null);
              setSubmitted(false);
            }}
            placeholder="Admission number or student name…"
            className={`flex-1 bg-transparent text-sm outline-none ${
              isDark
                ? "text-white placeholder-gray-500"
                : "text-gray-900 placeholder-gray-400"
            }`}
          />
          {isSearching && (
            <ArrowPathIcon
              className={`h-4 w-4 animate-spin ${isDark ? "text-gray-500" : "text-gray-400"}`}
            />
          )}
        </div>

        {/* Search results */}
        {enableSearch && results.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {results.map((s) => {
              const disabled =
                s.linkedToMe || (s.hasOpenRequest && !s.openRequestIsMine);
              return (
                <button
                  key={s.id}
                  disabled={disabled}
                  onClick={() => setSelected(s)}
                  className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors ${
                    selectedId === s.id
                      ? isDark
                        ? "bg-blue-500/20 border-blue-500/40 text-blue-100"
                        : "bg-blue-50 border-blue-300 text-blue-900"
                      : isDark
                        ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                        : "bg-white border-gray-200 text-gray-700 hover:border-blue-200"
                  } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <span
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                      isDark
                        ? "bg-blue-500/20 text-blue-300"
                        : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    {s.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold truncate">
                      {s.name}
                    </span>
                    <span
                      className={`block text-xs truncate ${isDark ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {s.admissionNumber || "No admission number"}
                      {s.class?.name ? ` · ${s.class.name}` : ""}
                    </span>
                  </span>
                  {s.linkedToMe && (
                    <span
                      className={`text-[10px] font-bold ${isDark ? "text-emerald-300" : "text-emerald-600"}`}
                    >
                      Already yours
                    </span>
                  )}
                  {s.hasOpenRequest && !s.linkedToMe && (
                    <span
                      className={`text-[10px] font-bold ${isDark ? "text-amber-300" : "text-amber-600"}`}
                    >
                      {s.openRequestIsMine
                        ? "Your request pending"
                        : "Request pending"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        {enableSearch && !isSearching && results.length === 0 && (
          <p
            className={`mt-2 text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}
          >
            No students match "{query.trim()}". Check the admission number with
            the school office.
          </p>
        )}

        {/* Selected → note + submit */}
        {selected && (
          <div className="mt-3 space-y-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note to the school (e.g. relationship to the child)…"
              rows={2}
              className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark
                  ? "bg-gray-900/70 border-white/10 text-white placeholder-gray-500"
                  : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
              }`}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSubmit}
                disabled={createRequest.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold shadow-md hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
              >
                {createRequest.isPending ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlusIcon className="h-4 w-4" />
                )}
                Submit link request
              </button>
              <button
                onClick={() => {
                  setSelected(null);
                  setQuery("");
                }}
                className={`px-3 py-2 rounded-xl text-sm ${
                  isDark
                    ? "text-gray-400 hover:text-white"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {localError && (
          <p
            className={`mt-2 text-xs ${isDark ? "text-red-300" : "text-red-600"}`}
          >
            {localError}
          </p>
        )}
        {submitted && !localError && (
          <p
            className={`mt-2 text-xs flex items-center gap-1.5 ${
              isDark ? "text-emerald-300" : "text-emerald-600"
            }`}
          >
            <CheckCircleIcon className="h-4 w-4" />
            Request submitted — awaiting school approval.
          </p>
        )}
      </div>

      {/* My requests + their workflow status */}
      {requests.length > 0 && (
        <div>
          <h3
            className={`mb-2 text-[15px] font-bold ${isDark ? "text-white" : "text-gray-900"}`}
          >
            My Link Requests
          </h3>
          <div className="space-y-2">
            {requests.map((r) => (
              <RequestRow key={r.id} request={r} isDark={isDark} />
            ))}
          </div>
        </div>
      )}

      {openRequests.length > 0 && (
        <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          {openRequests.length} request{openRequests.length > 1 ? "s" : ""}{" "}
          awaiting school approval. Your child(ren) will appear here
          automatically once approved.
        </p>
      )}
    </div>
  );
}
