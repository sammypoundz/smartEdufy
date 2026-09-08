// src/pages/admin/QuestionReview.tsx
// Admin review of teacher question-document submissions. Approve or reject
// each document with optional feedback; teachers see the outcome on their
// own page.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../utils/api";
import { useTheme } from "../../contexts/ThemeContext";
import toast from "react-hot-toast";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  DocumentTextIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

interface QuestionDoc {
  id: string;
  title: string;
  description?: string;
  subjectName?: string;
  className?: string;
  armName?: string;
  term?: string;
  fileName: string;
  fileSize?: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
  teacher?: { id: string; name?: string; email?: string };
}

const STATUS_BADGE: Record<string, string> = {
  PENDING:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300",
  APPROVED:
    "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
};

const fmtSize = (bytes?: number) => {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function QuestionReviewPage() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<
    "" | "PENDING" | "APPROVED" | "REJECTED"
  >("");
  const [search, setSearch] = useState("");
  const [rejecting, setRejecting] = useState<QuestionDoc | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const {
    data: docs = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["question-docs", status],
    queryFn: async () => {
      const q = status ? `?status=${status}` : "";
      const res = await api.get(`/question-docs${q}`);
      if (!res.ok) throw new Error("Failed to load submissions");
      return res.json() as Promise<QuestionDoc[]>;
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      id,
      decision,
      reviewNote,
    }: {
      id: string;
      decision: string;
      reviewNote?: string;
    }) => {
      const res = await api.patch(`/question-docs/${id}/review`, {
        decision,
        reviewNote,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Review failed" }));
        throw new Error(err.error || "Review failed");
      }
      return res.json();
    },
    onSuccess: (_d, vars) => {
      toast.success(
        vars.decision === "APPROVED"
          ? "Submission approved"
          : "Submission rejected",
      );
      setRejecting(null);
      setRejectNote("");
      setRejectError("");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["question-docs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const download = async (doc: QuestionDoc) => {
    setDownloadingId(doc.id);
    try {
      const res = await api.get(`/question-docs/${doc.id}/download`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = doc.fileName;
        a.click();
        URL.revokeObjectURL(url);
      } else toast.error("Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  const q = search.trim().toLowerCase();
  const visible = docs.filter((d) => {
    const teacher = d.teacher?.name || d.teacher?.email || "";
    return (
      !q ||
      d.title.toLowerCase().includes(q) ||
      teacher.toLowerCase().includes(q) ||
      (d.subjectName || "").toLowerCase().includes(q)
    );
  });

  const card = dark
    ? "bg-white/5 backdrop-blur-xl border-white/10"
    : "bg-white border-gray-200";
  const inputCls = `rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    dark
      ? "bg-white/10 border-white/20 text-white placeholder-gray-500"
      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
  }`;

  const pendingCount = docs.filter((d) => d.status === "PENDING").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1
            className={`text-2xl font-bold flex items-center gap-2 ${dark ? "text-white" : "text-gray-900"}`}
          >
            <ClipboardDocumentCheckIcon className="h-7 w-7 text-blue-500" />
            Question Review
          </h1>
          <p
            className={`text-sm mt-1 ${dark ? "text-gray-400" : "text-gray-500"}`}
          >
            {isLoading
              ? "Loading…"
              : `${pendingCount} pending review of ${docs.length} submissions`}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
        >
          <ArrowPathIcon
            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />{" "}
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div
        className={`rounded-xl border p-4 flex flex-col sm:flex-row gap-3 sm:items-center ${card}`}
      >
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by teacher, title or subject…"
            className={`w-full pl-9 ${inputCls}`}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(["", "PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
            <button
              key={s || "all"}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                status === s
                  ? "bg-blue-600 border-blue-600 text-white"
                  : dark
                    ? "border-white/20 text-gray-300 hover:bg-white/10"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading && docs.length === 0 ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`h-24 rounded-xl animate-pulse ${dark ? "bg-white/5" : "bg-gray-100"}`}
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className={`rounded-xl border p-10 text-center ${card}`}>
          <DocumentTextIcon
            className={`h-10 w-10 mx-auto mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}
          />
          <p className={dark ? "text-gray-300" : "text-gray-600"}>
            {docs.length === 0
              ? "No question submissions yet."
              : "No submissions match your search or filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((doc) => (
            <div key={doc.id} className={`rounded-xl border p-4 ${card}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`h-10 w-10 flex-shrink-0 rounded-lg flex items-center justify-center ${dark ? "bg-white/5" : "bg-blue-50"}`}
                  >
                    <DocumentTextIcon className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <div
                      className={`font-semibold truncate ${dark ? "text-white" : "text-gray-900"}`}
                    >
                      {doc.title}
                    </div>
                    <div
                      className={`text-xs mt-0.5 flex flex-wrap gap-2 ${dark ? "text-gray-400" : "text-gray-500"}`}
                    >
                      <span className="font-medium">
                        {doc.teacher?.name ||
                          doc.teacher?.email ||
                          "Unknown teacher"}
                      </span>
                      {[doc.subjectName, doc.className, doc.armName, doc.term]
                        .filter(Boolean)
                        .map((x) => (
                          <span key={x}>· {x}</span>
                        ))}
                      <span>
                        · {doc.fileName} {fmtSize(doc.fileSize)}
                      </span>
                      <span>
                        · {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {doc.description && (
                      <p
                        className={`text-xs mt-1 ${dark ? "text-gray-400" : "text-gray-500"}`}
                      >
                        {doc.description}
                      </p>
                    )}
                    {doc.status !== "PENDING" && (
                      <div
                        className={`mt-2 text-xs ${doc.status === "APPROVED" ? (dark ? "text-green-300" : "text-green-700") : dark ? "text-red-300" : "text-red-700"}`}
                      >
                        {doc.status === "APPROVED" ? "Approved" : "Rejected"}
                        {doc.reviewNote ? ` — ${doc.reviewNote}` : ""}
                        {doc.reviewedAt
                          ? ` · ${new Date(doc.reviewedAt).toLocaleString()}`
                          : ""}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${STATUS_BADGE[doc.status]}`}
                  >
                    {doc.status === "PENDING" && (
                      <ClockIcon className="h-3.5 w-3.5" />
                    )}
                    {doc.status === "APPROVED" && (
                      <CheckCircleIcon className="h-3.5 w-3.5" />
                    )}
                    {doc.status === "REJECTED" && (
                      <XCircleIcon className="h-3.5 w-3.5" />
                    )}
                    {doc.status}
                  </span>
                  <button
                    onClick={() => download(doc)}
                    disabled={downloadingId === doc.id}
                    title="Download document"
                    className={`p-2 rounded-lg disabled:opacity-50 ${dark ? "hover:bg-white/10 text-gray-300" : "hover:bg-gray-100 text-gray-600"}`}
                  >
                    {downloadingId === doc.id ? (
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowDownTrayIcon className="h-4 w-4" />
                    )}
                  </button>
                  {doc.status === "PENDING" && (
                    <>
                      <button
                        onClick={() =>
                          reviewMutation.mutate({
                            id: doc.id,
                            decision: "APPROVED",
                          })
                        }
                        disabled={reviewMutation.isPending}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {reviewMutation.isPending &&
                        reviewMutation.variables?.id === doc.id ? (
                          <>
                            <ArrowPathIcon className="h-4 w-4 animate-spin" />
                            Approving…
                          </>
                        ) : (
                          <>
                            <CheckCircleIcon className="h-4 w-4" /> Approve
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setRejecting(doc);
                          setRejectNote("");
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700"
                      >
                        <XCircleIcon className="h-4 w-4" /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className={`w-full max-w-md rounded-xl p-5 space-y-4 ${dark ? "bg-[#111827] border border-white/10" : "bg-white"}`}
          >
            <h3
              className={`font-semibold ${dark ? "text-white" : "text-gray-900"}`}
            >
              Reject "{rejecting.title}"
            </h3>
            <p
              className={`text-sm ${dark ? "text-gray-400" : "text-gray-600"}`}
            >
              Add a reason for rejecting — the teacher will see this on their
              page:
            </p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={3}
              placeholder="e.g. Questions don't cover the term's topics — please revise and resubmit."
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 ${
                rejectError
                  ? "border-red-500"
                  : dark
                    ? "border-white/20"
                    : "border-gray-300"
              } ${
                dark
                  ? "bg-white/10 text-white placeholder-gray-500"
                  : "bg-white text-gray-900 placeholder-gray-400"
              }`}
            />
            {rejectError && (
              <p className="text-xs text-red-500">{rejectError}</p>
            )}
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => {
                  setRejecting(null);
                  setRejectError("");
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                  dark
                    ? "border-white/20 text-gray-300 hover:bg-white/10"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!rejectNote.trim()) {
                    setRejectError(
                      "Please provide a reason for rejecting this submission.",
                    );
                    return;
                  }
                  setRejectError("");
                  reviewMutation.mutate({
                    id: rejecting.id,
                    decision: "REJECTED",
                    reviewNote: rejectNote.trim(),
                  });
                }}
                disabled={reviewMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {reviewMutation.isPending && (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                )}
                {reviewMutation.isPending ? "Rejecting…" : "Reject submission"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
