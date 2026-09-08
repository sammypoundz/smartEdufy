// src/pages/teacher/Questions.tsx
// Teacher "Exam Questions" page — upload question documents (PDF/DOC/DOCX,
// PPT/TXT/images) for admin review. Shows submission status (Pending /
// Approved / Rejected) plus reviewer feedback.
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../utils/api";
import { useTheme } from "../../contexts/ThemeContext";
import { useAcademicSession } from "../../contexts/AcademicSessionContext";
import toast from "react-hot-toast";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  TrashIcon,
  XCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  BookOpenIcon,
  MagnifyingGlassIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";

interface BankQuestion {
  id: string;
  text: string;
  options: string[];
  correctOption: number;
  marks: number;
  subjectId?: string | null;
  subject?: { id: string; name: string } | null;
  test?: { id: string; name: string; status: string } | null;
  createdAt: string;
}

interface QuestionDoc {
  id: string;
  title: string;
  description?: string;
  subjectName?: string;
  className?: string;
  armName?: string;
  term?: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
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

export default function TeacherQuestions() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [showUpload, setShowUpload] = useState(false);
  const [editing, setEditing] = useState<QuestionDoc | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    subjectName: "",
    className: "",
    armName: "",
    term: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch subjects, classes and terms from the school's database
  const { academicYears, currentYear } = useAcademicSession();
  const { data: subjects = [] } = useQuery({
    queryKey: ["qb-subjects"],
    queryFn: async () => {
      const res = await api.get("/subjects");
      if (!res.ok) throw new Error("Failed to load subjects");
      return res.json() as Promise<{ id: string; name: string }[]>;
    },
    staleTime: 5 * 60 * 1000,
  });
  const { data: classes = [] } = useQuery({
    queryKey: ["qb-classes"],
    queryFn: async () => {
      const res = await api.get("/classes");
      if (!res.ok) throw new Error("Failed to load classes");
      return res.json() as Promise<
        { id: string; name: string; arms?: { id: string; letter: string; alias?: string }[] }[]
      >;
    },
    staleTime: 5 * 60 * 1000,
  });
  const selectedClassArms =
    classes.find((c) => c.name === form.className)?.arms ?? [];
  const armLabel = (a: { letter: string; alias?: string }) => a.alias || a.letter;
  const termOptions = Array.from(
    new Map(
      (currentYear?.terms ??
        academicYears.flatMap((y: { terms?: { id: string; name: string }[] }) => y.terms ?? [])
      ).map((t: { name: string }) => [t.name, t.name]),
    ).values(),
  );

  // Tabs: "submissions" (uploaded docs) | "bank" (question bank)
  const [tab, setTab] = useState<"submissions" | "bank">("submissions");
  const [bankSearch, setBankSearch] = useState("");
  const [bankSubject, setBankSubject] = useState("");

  const {
    data: bankQuestions = [],
    isLoading: bankLoading,
    refetch: refetchBank,
  } = useQuery({
    queryKey: ["question-bank"],
    queryFn: async () => {
      const res = await api.get("/questions/bank");
      if (!res.ok) throw new Error("Failed to load question bank");
      return res.json() as Promise<BankQuestion[]>;
    },
    enabled: tab === "bank",
  });

  const bankSubjects = Array.from(
    new Set(
      bankQuestions.map((q) => q.subject?.name || "General"),
    ),
  );

  const visibleBank = bankQuestions.filter((q) => {
    const s = bankSearch.trim().toLowerCase();
    const subj = q.subject?.name || "General";
    return (
      (!s ||
        q.text.toLowerCase().includes(s) ||
        (q.test?.name || "").toLowerCase().includes(s) ||
        subj.toLowerCase().includes(s)) &&
      (!bankSubject || subj === bankSubject)
    );
  });

  const {
    data: docs = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["my-question-docs"],
    queryFn: async () => {
      const res = await api.get("/question-docs/mine");
      if (!res.ok) throw new Error("Failed to load submissions");
      return res.json() as Promise<QuestionDoc[]>;
    },
  });

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      subjectName: "",
      className: "",
      armName: "",
      term: "",
    });
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("file", selectedFile as File);
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("subjectName", form.subjectName);
      fd.append("className", form.className);
      fd.append("armName", form.armName);
      fd.append("term", form.term);
      const res = await api.post("/question-docs", fd);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Questions submitted for review");
      setShowUpload(false);
      resetForm();
      refetch();
      queryClient.invalidateQueries({ queryKey: ["my-question-docs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      if (selectedFile) fd.append("file", selectedFile);
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("subjectName", form.subjectName);
      fd.append("className", form.className);
      fd.append("armName", form.armName);
      fd.append("term", form.term);
      const res = await api.put(`/question-docs/${editing!.id}`, fd);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Update failed" }));
        throw new Error(err.error || "Update failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Submission updated");
      setEditing(null);
      resetForm();
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.del(`/question-docs/${id}`);
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Submission deleted");
      refetch();
    },
    onError: () => toast.error("Could not delete submission"),
  });

  const startEdit = (doc: QuestionDoc) => {
    setEditing(doc);
    setForm({
      title: doc.title,
      description: doc.description || "",
      subjectName: doc.subjectName || "",
      className: doc.className || "",
      armName: doc.armName || "",
      term: doc.term || "",
    });
    setSelectedFile(null);
    setShowUpload(false);
  };

  const card = dark
    ? "bg-white/5 backdrop-blur-xl border-white/10"
    : "bg-white border-gray-200";
  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    dark
      ? "bg-white/10 border-white/20 text-white placeholder-gray-500"
      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
  }`;

  const formOpen = showUpload || editing !== null;
  const pendingCount = docs.filter((d) => d.status === "PENDING").length;

  const tabBtn = (active: boolean) =>
    `inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      active
        ? "bg-blue-600 text-white shadow"
        : dark
          ? "text-gray-300 hover:bg-white/10"
          : "text-gray-600 hover:bg-gray-100"
    }`;

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1
            className={`text-xl sm:text-2xl font-bold flex items-center gap-2 ${dark ? "text-white" : "text-gray-900"}`}
          >
            <DocumentTextIcon className="h-6 w-6 sm:h-7 sm:w-7 text-blue-500" />
            Exam Questions
          </h1>
          <p
            className={`text-sm mt-1 ${dark ? "text-gray-400" : "text-gray-500"}`}
          >
            Upload your question documents for review.{" "}
            {pendingCount > 0 ? `${pendingCount} awaiting approval.` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => refetch()}
            className="inline-flex flex-1 sm:flex-initial items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-lg text-sm font-medium border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 active:scale-[0.98] transition-transform"
          >
            <ArrowPathIcon
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />{" "}
            Refresh
          </button>
          <button
            onClick={() => {
              setShowUpload(true);
              setEditing(null);
              resetForm();
            }}
            className="inline-flex flex-1 sm:flex-initial items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition-transform"
          >
            <CloudArrowUpIcon className="h-4 w-4" /> Upload Questions
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        className={`inline-flex flex-wrap gap-1 p-1 rounded-xl border ${card}`}
      >
        <button
          onClick={() => setTab("submissions")}
          className={tabBtn(tab === "submissions")}
        >
          <DocumentTextIcon className="h-4 w-4" /> My Submissions
        </button>
        <button
          onClick={() => setTab("bank")}
          className={tabBtn(tab === "bank")}
        >
          <BookOpenIcon className="h-4 w-4" /> Question Bank
        </button>
      </div>

      {/* Upload / edit form — bottom sheet on mobile, centered dialog on desktop */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => {
            setShowUpload(false);
            setEditing(null);
            resetForm();
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border p-5 space-y-4 ${card} animate-[slideUp_0.25s_ease-out]`}
          >
            {/* Drag handle (mobile) */}
            <div className={`mx-auto sm:hidden h-1.5 w-12 rounded-full ${dark ? "bg-white/20" : "bg-gray-300"}`} />
            <h3
              className={`font-semibold ${dark ? "text-white" : "text-gray-900"}`}
            >
              {editing ? "Edit submission" : "Upload question document"}
            </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label
                className={`block text-xs font-semibold mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}
              >
                Title *
              </label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. First Term Examination — Algebra"
                className={inputCls}
              />
            </div>
            <div>
              <label
                className={`block text-xs font-semibold mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}
              >
                Subject
              </label>
              <select
                value={form.subjectName}
                onChange={(e) =>
                  setForm({ ...form, subjectName: e.target.value })
                }
                className={inputCls}
              >
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.name} className={dark ? "bg-gray-800" : ""}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className={`block text-xs font-semibold mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}
              >
                Class
              </label>
              <select
                value={form.className}
                onChange={(e) =>
                  setForm({
                    ...form,
                    className: e.target.value,
                    armName: "",
                  })
                }
                className={inputCls}
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.name} className={dark ? "bg-gray-800" : ""}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className={`block text-xs font-semibold mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}
              >
                Arm
              </label>
              <select
                value={form.armName}
                onChange={(e) =>
                  setForm({ ...form, armName: e.target.value })
                }
                disabled={!form.className}
                className={`${inputCls} disabled:opacity-50`}
              >
                <option value="">
                  {form.className ? "Select arm (optional)" : "Select class first"}
                </option>
                {selectedClassArms.map((a) => (
                  <option
                    key={a.id}
                    value={armLabel(a)}
                    className={dark ? "bg-gray-800" : ""}
                  >
                    {form.className} {armLabel(a)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className={`block text-xs font-semibold mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}
              >
                Term
              </label>
              <select
                value={form.term}
                onChange={(e) => setForm({ ...form, term: e.target.value })}
                className={inputCls}
              >
                <option value="">Select term</option>
                {termOptions.map((t) => (
                  <option key={t} value={t} className={dark ? "bg-gray-800" : ""}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className={`block text-xs font-semibold mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}
              >
                {editing ? "Replace file (optional)" : "File *"}
              </label>
              <input
                ref={editing ? editFileInputRef : fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className={`block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium ${
                  dark
                    ? "text-gray-300 file:bg-blue-600 file:text-white"
                    : "text-gray-700 file:bg-blue-600 file:text-white"
                }`}
              />
              {editing && !selectedFile && (
                <p
                  className={`mt-1 text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}
                >
                  Keeping current file: {editing.fileName}
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label
                className={`block text-xs font-semibold mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}
              >
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
                placeholder="Optional notes for the reviewer (topics covered, instructions…)"
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <button
              disabled={uploadMutation.isPending || updateMutation.isPending}
              onClick={() =>
                editing ? updateMutation.mutate() : uploadMutation.mutate()
              }
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              {uploadMutation.isPending || updateMutation.isPending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <CloudArrowUpIcon className="h-4 w-4" />
              )}
              {editing ? "Save changes" : "Submit for review"}
            </button>
            <button
              onClick={() => {
                setShowUpload(false);
                setEditing(null);
                resetForm();
              }}
              className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium border ${
                dark
                  ? "border-white/20 text-gray-300 hover:bg-white/10"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Cancel
            </button>
          </div>
          </div>
        </div>
      )}

      {/* Question Bank tab */}
      {tab === "bank" && (
        <div className="space-y-4">
          {/* Filters */}
          <div
            className={`rounded-xl border p-4 flex flex-col sm:flex-row gap-3 sm:items-center ${card}`}
          >
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                placeholder="Search question text, test or subject…"
                className={`w-full pl-9 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  dark
                    ? "bg-white/10 border-white/20 text-white placeholder-gray-500"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                }`}
              />
            </div>
            <select
              value={bankSubject}
              onChange={(e) => setBankSubject(e.target.value)}
              className={`rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                dark
                  ? "bg-white/10 border-white/20 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            >
              <option value="">All subjects</option>
              {bankSubjects.map((s) => (
                <option key={s} value={s} className={dark ? "bg-gray-800" : ""}>
                  {s}
                </option>
              ))}
            </select>
            <button
              onClick={() => refetchBank()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10"
            >
              <ArrowPathIcon
                className={`h-4 w-4 ${bankLoading ? "animate-spin" : ""}`}
              />{" "}
              Refresh
            </button>
          </div>

          {bankLoading && bankQuestions.length === 0 ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`h-24 rounded-xl animate-pulse ${dark ? "bg-white/5" : "bg-gray-100"}`}
                />
              ))}
            </div>
          ) : visibleBank.length === 0 ? (
            <div className={`rounded-xl border p-10 text-center ${card}`}>
              <BookOpenIcon
                className={`h-10 w-10 mx-auto mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}
              />
              <p className={dark ? "text-gray-300" : "text-gray-600"}>
                {bankQuestions.length === 0
                  ? "The question bank is empty. Add questions to your CBT tests to build the bank."
                  : "No questions match your search or filter."}
              </p>
            </div>
          ) : (
            <>
              <p
                className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}
              >
                {visibleBank.length} of {bankQuestions.length} questions
              </p>
              <div className="space-y-3">
                {visibleBank.map((q) => (
                  <div key={q.id} className={`rounded-xl border p-4 ${card}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p
                          className={`font-medium ${dark ? "text-white" : "text-gray-900"}`}
                        >
                          {q.text}
                        </p>
                        <ul className="mt-2 space-y-1">
                          {q.options.map((opt, idx) => (
                            <li
                              key={idx}
                              className={`text-sm flex items-center gap-2 ${
                                idx === q.correctOption
                                  ? "text-green-600 dark:text-green-400 font-semibold"
                                  : dark
                                    ? "text-gray-400"
                                    : "text-gray-600"
                              }`}
                            >
                              <span
                                className={`h-5 w-5 flex-shrink-0 flex items-center justify-center rounded-full text-xs ${
                                  idx === q.correctOption
                                    ? "bg-green-500/20"
                                    : dark
                                      ? "bg-white/10"
                                      : "bg-gray-100"
                                }`}
                              >
                                {String.fromCharCode(65 + idx)}
                              </span>
                              {opt}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 text-xs">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 font-semibold">
                          <AcademicCapIcon className="h-3.5 w-3.5" />
                          {q.subject?.name || "General"}
                        </span>
                        {q.test?.name && (
                          <span
                            className={`px-2.5 py-1 rounded-full ${dark ? "bg-white/10 text-gray-300" : "bg-gray-100 text-gray-700"}`}
                          >
                            {q.test.name}
                          </span>
                        )}
                        <span
                          className={dark ? "text-gray-500" : "text-gray-400"}
                        >
                          {q.marks} mark{q.marks === 1 ? "" : "s"} ·{" "}
                          {new Date(q.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Submissions list */}
      {tab === "submissions" && isLoading && docs.length === 0 ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={`h-20 rounded-xl animate-pulse ${dark ? "bg-white/5" : "bg-gray-100"}`}
            />
          ))}
        </div>
      ) : tab === "submissions" && docs.length === 0 ? (
        <div className={`rounded-xl border p-10 text-center ${card}`}>
          <DocumentTextIcon
            className={`h-10 w-10 mx-auto mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}
          />
          <p className={dark ? "text-gray-300" : "text-gray-600"}>
            No question documents yet. Click "Upload Questions" to submit your
            first document for review.
          </p>
        </div>
      ) : tab === "submissions" && (
        <div className="space-y-3">
          {docs.map((doc) => (
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
                      {[doc.subjectName, doc.className, doc.armName, doc.term]
                        .filter(Boolean)
                        .map((x) => (
                          <span key={x}>{x}</span>
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
                    {doc.status === "REJECTED" && doc.reviewNote && (
                      <div
                        className={`mt-2 flex items-start gap-1.5 text-xs rounded-lg p-2 ${
                          dark
                            ? "bg-red-500/10 text-red-300"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
                        <span>
                          <strong>Reviewer:</strong> {doc.reviewNote}
                        </span>
                      </div>
                    )}
                    {doc.status === "APPROVED" && doc.reviewNote && (
                      <div
                        className={`mt-2 text-xs ${dark ? "text-green-300" : "text-green-700"}`}
                      >
                        Reviewer: {doc.reviewNote}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
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
                  <a
                    href="#"
                    onClick={async (e) => {
                      e.preventDefault();
                      const res = await api.get(
                        `/question-docs/${doc.id}/download`,
                      );
                      if (res.ok) {
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = doc.fileName;
                        a.click();
                        URL.revokeObjectURL(url);
                      } else toast.error("Download failed");
                    }}
                    title="Download"
                    className={`p-2 rounded-lg ${dark ? "hover:bg-white/10 text-gray-300" : "hover:bg-gray-100 text-gray-600"}`}
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                  </a>
                  {doc.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => startEdit(doc)}
                        title="Edit"
                        className={`p-2 rounded-lg active:scale-95 transition-transform ${dark ? "hover:bg-white/10 text-gray-300" : "hover:bg-gray-100 text-gray-600"}`}
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Delete this submission?"))
                            deleteMutation.mutate(doc.id);
                        }}
                        title="Delete"
                        className={`p-2 rounded-lg active:scale-95 transition-transform ${dark ? "hover:bg-red-500/10 text-red-400" : "hover:bg-red-50 text-red-500"}`}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
