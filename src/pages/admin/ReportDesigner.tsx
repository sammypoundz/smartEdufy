// AI Report Designer — dashboard, upload, AI generation, compare/approve and
// class assignment, all in one page with internal views (matches the app's
// single-page-module convention, e.g. Settings / OpenArm).
//
// API surface (backend/src/routes/reportTemplateRoutes.ts):
//   GET    /report-templates                 list + stats
//   GET    /report-templates/:id             full template
//   POST   /report-templates/upload          multipart (file, name, description, academicLevel)
//   POST   /report-templates/:id/generate    AI analyse + generate (2 tokens)
//   POST   /report-templates/:id/correct     AI correction pass (1 token)
//   POST   /report-templates/:id/regenerate  fresh AI attempt (2 tokens)
//   POST   /report-templates/:id/approve     accept template
//   POST   /report-templates/:id/assign      { classIds, academicSessionId, term, assignmentType }
//   GET    /report-template-assignments
//   GET    /report-templates/:id/preview     { html } bound with sample data
//   GET    /report-templates/class/:classId?academicSessionId=&term=

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  SparklesIcon,
  DocumentArrowUpIcon,
  CheckBadgeIcon,
  ArrowPathIcon,
  EyeIcon,
  UserGroupIcon,
  XMarkIcon,
  ArrowLeftIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ClockIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../utils/api";
import { useTheme } from "../../contexts/ThemeContext";

// ------------------------------------------------------------------ types

interface TemplateSummary {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  academicLevel?: string | null;
  originalFileUrl?: string | null;
  originalFileType?: string | null;
  originalPages?: number | null;
  version: number;
  aiModel?: string | null;
  createdAt: string;
  approvedAt?: string | null;
  _count?: { assignments: number };
}

interface TemplateFull extends TemplateSummary {
  htmlTemplate?: string | null;
  cssTemplate?: string | null;
  pageConfigurations?: string | null;
  generationError?: string | null;
}

interface ClassRow {
  id: string;
  name: string;
  arms?: { id: string; letter: string }[];
}
interface YearRow {
  id: string;
  name: string;
  isActive?: boolean;
  terms?: { id: string; name: string }[];
}

type View = "dashboard" | "upload" | "generating" | "compare" | "assign";

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  DRAFT: {
    label: "Draft",
    cls: "bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300",
  },
  PROCESSING: {
    label: "Processing…",
    cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  GENERATED: {
    label: "Generated",
    cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  },
  AWAITING_APPROVAL: {
    label: "Awaiting approval",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  APPROVED: {
    label: "Approved",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  ARCHIVED: {
    label: "Archived",
    cls: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  },
  FAILED: {
    label: "Failed",
    cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  },
};

const PROCESSING_STAGES = [
  "Extracting pages from your document…",
  "Analyzing report card layout (Edufy AI vision)…",
  "Identifying dynamic fields — students, subjects, grades…",
  "Generating HTML/CSS template…",
  "Validating placeholders & sanitising markup…",
  "Preparing side-by-side preview…",
];

export default function ReportDesigner() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const [view, setView] = useState<View>("dashboard");
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    approved: number;
    drafts: number;
    awaitingApproval: number;
    assigned: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<TemplateFull | null>(null);

  // upload form
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("PRIMARY");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // generation stage ticker (real backend state — stage text only, no fake %)
  const [stage, setStage] = useState(0);

  // compare view
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [correctionText, setCorrectionText] = useState("");
  const [showCorrection, setShowCorrection] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"original" | "preview">("preview");
  const [zoom, setZoom] = useState(1);

  // assign view
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [years, setYears] = useState<YearRow[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [term, setTerm] = useState("");
  const [assignmentType, setAssignmentType] = useState<
    "ALL_TERMS" | "SPECIFIC_TERM"
  >("ALL_TERMS");
  const [existingAssignments, setExistingAssignments] = useState<any[]>([]);

  // ------------------------------------------------------------ data

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/report-templates");
      if (!res.ok) throw new Error("Failed to load templates");
      const data = await res.json();
      setTemplates(data.templates || []);
      setStats(data.stats || null);
    } catch (e: any) {
      toast.error(e.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // processing stage ticker while a generation is in flight
  useEffect(() => {
    if (view !== "generating") return;
    const t = setInterval(
      () => setStage((s) => (s + 1) % PROCESSING_STAGES.length),
      6000,
    );
    return () => clearInterval(t);
  }, [view]);

  const openTemplate = async (t: TemplateSummary) => {
    try {
      const res = await api.get(`/report-templates/${t.id}`);
      if (!res.ok) throw new Error("Failed to load template");
      const full: TemplateFull = await res.json();
      setActive(full);
      if (
        full.status === "AWAITING_APPROVAL" ||
        full.status === "APPROVED" ||
        full.status === "GENERATED"
      ) {
        setView("compare");
        loadPreview(full);
      } else if (full.status === "DRAFT") {
        setView("generating");
        runGenerate(full);
      } else {
        setView("compare");
        setPreviewHtml("");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to open template");
    }
  };

  const loadPreview = async (t: TemplateFull) => {
    setPreviewLoading(true);
    try {
      const res = await api.get(`/report-templates/${t.id}/preview`);
      if (!res.ok) throw new Error("Preview unavailable");
      const data = await res.json();
      setPreviewHtml(data.html || "");
    } catch (e: any) {
      toast.error(e.message || "Failed to build preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  // ------------------------------------------------------------ actions

  const doUpload = async () => {
    if (!file) {
      toast.error("Choose a report card file first");
      return;
    }
    if (!name.trim()) {
      toast.error("Give the template a name");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", name.trim());
      if (description.trim()) fd.append("description", description.trim());
      fd.append("academicLevel", level);
      const res = await api.post("/report-templates/upload", fd);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error((data as any)?.error || "Upload failed");
      }
      const tpl: TemplateFull = await res.json();
      toast.success("Uploaded — starting Edufy AI generation…");
      setFile(null);
      setName("");
      setDescription("");
      setActive(tpl);
      setView("generating");
      runGenerate(tpl);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const runGenerate = async (t: TemplateFull) => {
    setStage(0);
    try {
      const res = await api.post(`/report-templates/${t.id}/generate`, {});
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error((data as any)?.error || "AI generation failed");
      }
      const updated: TemplateFull = await res.json();
      setActive(updated);
      setView("compare");
      loadPreview(updated);
      toast.success("Template generated — review and approve");
      loadTemplates();
    } catch (e: any) {
      toast.error(e.message || "AI generation failed");
      setView("dashboard");
      loadTemplates();
    }
  };

  const doCorrect = async () => {
    if (!active || correctionText.trim().length < 5) {
      toast.error("Describe the corrections to apply");
      return;
    }
    setBusy("correct");
    try {
      const res = await api.post(`/report-templates/${active.id}/correct`, {
        instructions: correctionText.trim(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error((data as any)?.error || "Correction failed");
      }
      const updated: TemplateFull = await res.json();
      setActive(updated);
      setShowCorrection(false);
      setCorrectionText("");
      loadPreview(updated);
      toast.success("AI applied your corrections");
    } catch (e: any) {
      toast.error(e.message || "Correction failed");
    } finally {
      setBusy(null);
    }
  };

  const doRegenerate = async () => {
    if (!active) return;
    setBusy("regen");
    try {
      const res = await api.post(`/report-templates/${active.id}/regenerate`, {});
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error((data as any)?.error || "Regeneration failed");
      }
      const updated: TemplateFull = await res.json();
      setActive(updated);
      loadPreview(updated);
      toast.success("Regenerated a fresh template");
    } catch (e: any) {
      toast.error(e.message || "Regeneration failed");
    } finally {
      setBusy(null);
    }
  };

  const doApprove = async () => {
    if (!active) return;
    setBusy("approve");
    try {
      const res = await api.post(`/report-templates/${active.id}/approve`, {});
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error((data as any)?.error || "Approval failed");
      }
      const updated: TemplateFull = await res.json();
      setActive(updated);
      toast.success("Template approved — you can now assign it to classes");
      setView("assign");
      loadAssignData();
    } catch (e: any) {
      toast.error(e.message || "Approval failed");
    } finally {
      setBusy(null);
    }
  };

  const loadAssignData = async () => {
    try {
      const [clsRes, yrRes, asgRes] = await Promise.all([
        api.get("/classes"),
        api.get("/academic-years"),
        api.get("/report-template-assignments"),
      ]);
      if (clsRes.ok) setClasses(await clsRes.json());
      if (yrRes.ok) {
        const yrs: YearRow[] = await yrRes.json();
        setYears(yrs);
        const activeYr = yrs.find((y) => y.isActive) || yrs[0];
        if (activeYr) {
          setSessionId(activeYr.id);
          setTerm(activeYr.terms?.[0]?.name || "");
        }
      }
      if (asgRes.ok) setExistingAssignments(await asgRes.json());
    } catch {
      /* selectors stay empty; user can retry via assign view */
    }
  };

  useEffect(() => {
    if (view === "assign") loadAssignData(); /* eslint-disable-next-line */
  }, [view]);

  const doAssign = async () => {
    if (!active) return;
    if (selectedClasses.length === 0) {
      toast.error("Select at least one class");
      return;
    }
    if (!sessionId) {
      toast.error("Choose an academic session");
      return;
    }
    if (assignmentType === "SPECIFIC_TERM" && !term) {
      toast.error("Choose a term");
      return;
    }
    setBusy("assign");
    try {
      const res = await api.post(`/report-templates/${active.id}/assign`, {
        classIds: selectedClasses,
        academicSessionId: sessionId,
        term: assignmentType === "SPECIFIC_TERM" ? term : undefined,
        assignmentType,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error((data as any)?.error || "Assignment failed");
      }
      toast.success(
        `Template assigned to ${selectedClasses.length} class${
          selectedClasses.length > 1 ? "es" : ""
        }`,
      );
      setSelectedClasses([]);
      loadTemplates();
      setView("dashboard");
    } catch (e: any) {
      toast.error(e.message || "Assignment failed");
    } finally {
      setBusy(null);
    }
  };

  const doDelete = async (t: TemplateSummary) => {
    if (!window.confirm(`Delete template "${t.name}"? This cannot be undone.`))
      return;
    try {
      const res = await api.del(`/report-templates/${t.id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error((data as any)?.error || "Delete failed");
      }
      toast.success("Template deleted");
      loadTemplates();
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    }
  };

  const doArchive = async (t: TemplateSummary) => {
    try {
      const res = await api.post(`/report-templates/${t.id}/archive`, {});
      if (!res.ok) throw new Error("Archive failed");
      toast.success("Template archived");
      loadTemplates();
    } catch (e: any) {
      toast.error(e.message || "Archive failed");
    }
  };

  // ------------------------------------------------------------ render helpers

  const card = "rounded-2xl border shadow-sm";
  const cardCls = dark
    ? "bg-gray-900/70 border-white/10 text-gray-100"
    : "bg-white border-gray-200 text-gray-900";
  const muted = dark ? "text-gray-400" : "text-gray-500";
  const btnPrimary =
    "inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50";
  const btnGhost = `inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
    dark
      ? "bg-gray-800 text-gray-200 hover:bg-gray-700"
      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
  }`;

  // =========================== DASHBOARD ===========================
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          {
            label: "Total templates",
            value: stats?.total ?? 0,
            icon: DocumentTextIcon,
            tone: "from-blue-500 to-cyan-400",
          },
          {
            label: "Approved",
            value: stats?.approved ?? 0,
            icon: CheckBadgeIcon,
            tone: "from-emerald-500 to-green-400",
          },
          {
            label: "Awaiting approval",
            value: stats?.awaitingApproval ?? 0,
            icon: ClockIcon,
            tone: "from-amber-500 to-orange-400",
          },
          {
            label: "Drafts",
            value: stats?.drafts ?? 0,
            icon: SparklesIcon,
            tone: "from-violet-500 to-fuchsia-400",
          },
          {
            label: "Assigned",
            value: stats?.assigned ?? 0,
            icon: UserGroupIcon,
            tone: "from-indigo-500 to-blue-400",
          },
        ].map((s) => (
          <div key={s.label} className={`p-4 ${card} ${cardCls}`}>
            <span
              className={`inline-flex p-2 rounded-xl bg-gradient-to-br ${s.tone} shadow`}
            >
              <s.icon className="h-4 w-4 text-white" />
            </span>
            <p className="text-2xl font-extrabold mt-2">{s.value}</p>
            <p className={`text-xs ${muted}`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* upload CTA */}
      <button
        onClick={() => {
          setView("upload");
        }}
        className={`w-full flex items-center gap-4 p-5 ${card} ${cardCls} text-left hover:shadow-md transition-all`}
      >
        <span className="p-3 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-md">
          <DocumentArrowUpIcon className="h-6 w-6 text-white" />
        </span>
        <span className="flex-1">
          <span className="block font-bold">Upload a report card design</span>
          <span className={`text-sm ${muted}`}>
            PDF, PNG or JPG — Edufy AI recreates it as an editable HTML/CSS
            template.
          </span>
        </span>
        <span className={`text-sm font-semibold text-blue-500`}>Start →</span>
      </button>

      {/* list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className={`text-center py-12 ${card} ${cardCls}`}>
          <SparklesIcon className="h-10 w-10 mx-auto text-violet-400" />
          <p className="mt-3 font-semibold">No templates yet</p>
          <p className={`text-sm mt-1 ${muted}`}>
            Upload your school's report card to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((t) => {
            const st = STATUS_STYLES[t.status] || STATUS_STYLES.DRAFT;
            return (
              <motion.div
                key={t.id}
                layout
                className={`p-4 ${card} ${cardCls} flex flex-col gap-3`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold truncate">{t.name}</p>
                    <p className={`text-xs ${muted}`}>
                      v{t.version} · {t.originalFileType?.toUpperCase()} ·{" "}
                      {t.originalPages ?? 1} page(s)
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs px-2 py-1 rounded-full font-semibold ${st.cls}`}
                  >
                    {st.label}
                  </span>
                </div>
                {t.description && (
                  <p className={`text-xs line-clamp-2 ${muted}`}>
                    {t.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs">
                  {t._count && t._count.assignments > 0 && (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <UserGroupIcon className="h-3.5 w-3.5" />{" "}
                      {t._count.assignments} class
                      {t._count.assignments > 1 ? "es" : ""}
                    </span>
                  )}
                  <span className={muted}>
                    {new Date(t.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {t.status === "FAILED" && (
                  <p className="text-xs text-rose-500 flex items-center gap-1">
                    <ExclamationTriangleIcon className="h-3.5 w-3.5" />{" "}
                    Generation failed — open to retry
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mt-auto pt-2 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => openTemplate(t)}
                    className={`${btnGhost} !py-1.5 !px-3`}
                  >
                    <EyeIcon className="h-4 w-4" />{" "}
                    {t.status === "DRAFT" || t.status === "FAILED"
                      ? "Generate"
                      : "View"}
                  </button>
                  {t.status === "APPROVED" && (
                    <button
                      onClick={async () => {
                        setActive(
                          await (async () => {
                            const r = await api.get(
                              `/report-templates/${t.id}`,
                            );
                            return r.ok ? await r.json() : t;
                          })(),
                        );
                        setView("assign");
                      }}
                      className={`${btnGhost} !py-1.5 !px-3`}
                    >
                      <UserGroupIcon className="h-4 w-4" /> Assign
                    </button>
                  )}
                  {t.status !== "ARCHIVED" && t.status !== "APPROVED" && (
                    <button
                      onClick={() => doArchive(t)}
                      className={`${btnGhost} !py-1.5 !px-3`}
                    >
                      <ArchiveBoxIcon className="h-4 w-4" /> Archive
                    </button>
                  )}
                  <button
                    onClick={() => doDelete(t)}
                    className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/30`}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );

  // =========================== UPLOAD ===========================
  const renderUpload = () => (
    <div className={`max-w-2xl mx-auto p-6 ${card} ${cardCls}`}>
      <h2 className="text-xl font-bold flex items-center gap-2">
        <DocumentArrowUpIcon className="h-6 w-6 text-violet-500" /> Upload
        report card design
      </h2>
      <p className={`text-sm mt-1 ${muted}`}>
        Edufy AI will recreate this design as an HTML/CSS template bound to your
        school's real result data.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) setFile(f);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`mt-5 border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
            : dark
            ? "border-gray-600 hover:border-gray-500"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setFile(f);
            e.target.value = "";
          }}
        />
        {file ? (
          <div>
            <p className="font-semibold">{file.name}</p>
            <p className={`text-xs mt-1 ${muted}`}>
              {(file.size / 1024 / 1024).toFixed(1)} MB — click to change
            </p>
          </div>
        ) : (
          <div>
            <DocumentArrowUpIcon className="h-10 w-10 mx-auto text-gray-400" />
            <p className="mt-2 font-medium">Drag & drop or click to browse</p>
            <p className={`text-xs mt-1 ${muted}`}>
              PDF (multi-page supported), PNG or JPG · max 15MB
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <label className={`block text-sm font-medium mb-1.5`}>
            Template name *
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Junior Secondary Report Card"
            className={`w-full rounded-xl border-0 px-4 py-3 ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-blue-500 ${
              dark ? "bg-gray-800 text-white" : "bg-white text-gray-900"
            }`}
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1.5`}>
            Description (optional)
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`w-full rounded-xl border-0 px-4 py-3 ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-blue-500 ${
              dark ? "bg-gray-800 text-white" : "bg-white text-gray-900"
            }`}
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1.5`}>
            Academic level
          </label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className={`w-full rounded-xl border-0 px-4 py-3 ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-blue-500 ${
              dark ? "bg-gray-800 text-white" : "bg-white text-gray-900"
            }`}
          >
            <option value="NURSERY">Nursery</option>
            <option value="PRIMARY">Primary</option>
            <option value="JUNIOR_SECONDARY">Junior Secondary</option>
            <option value="SENIOR_SECONDARY">Senior Secondary</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      <div className="mt-6 flex gap-3 justify-end">
        <button onClick={() => setView("dashboard")} className={btnGhost}>
          Cancel
        </button>
        <button
          onClick={doUpload}
          disabled={uploading || !file || !name.trim()}
          className={btnPrimary}
        >
          {uploading ? (
            "Uploading…"
          ) : (
            <>
              <SparklesIcon className="h-4 w-4" /> Upload & Generate with Edufy
              AI
            </>
          )}
        </button>
      </div>
      <p className={`text-xs mt-3 text-right ${muted}`}>
        Generation uses 2 Edufy AI tokens.
      </p>
    </div>
  );

  // =========================== GENERATING ===========================
  const renderGenerating = () => (
    <div className={`max-w-lg mx-auto p-10 text-center ${card} ${cardCls}`}>
      <div className="relative inline-flex">
        <span className="absolute inset-0 rounded-full bg-violet-500/20 animate-ping" />
        <span className="relative p-4 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg">
          <SparklesIcon className="h-8 w-8 text-white" />
        </span>
      </div>
      <h2 className="text-xl font-bold mt-5">
        Edufy AI is recreating your report card
      </h2>
      <p className={`text-sm mt-2 ${muted}`}>
        This usually takes 30–90 seconds. Keep this page open.
      </p>
      <div className="mt-6 space-y-2 text-left">
        {PROCESSING_STAGES.map((s, i) => (
          <div
            key={s}
            className={`flex items-center gap-3 text-sm px-3 py-2 rounded-xl ${
              i === stage
                ? dark
                  ? "bg-violet-900/30 text-violet-200"
                  : "bg-violet-50 text-violet-700"
                : muted
            }`}
          >
            {i < stage ? (
              <CheckBadgeIcon className="h-4 w-4 text-emerald-500" />
            ) : i === stage ? (
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            ) : (
              <span className="h-4 w-4 rounded-full border border-current opacity-40" />
            )}
            {s}
          </div>
        ))}
      </div>
    </div>
  );

  // =========================== COMPARE ===========================
  const renderCompare = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold flex-1 min-w-0 truncate">
          {active?.name}{" "}
          <span className={`text-sm font-normal ${muted}`}>
            (v{active?.version})
          </span>
        </h2>
        {active?.status === "APPROVED" && (
          <span className="text-xs px-2 py-1 rounded-full font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            Approved
          </span>
        )}
        {/* mobile tabs */}
        <div className="md:hidden flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
          {(["original", "preview"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setMobileTab(t)}
              className={`px-4 py-2 text-sm font-medium ${
                mobileTab === t
                  ? "bg-blue-600 text-white"
                  : dark
                  ? "text-gray-300"
                  : "text-gray-600"
              }`}
            >
              {t === "original" ? "Original" : "AI Preview"}
            </button>
          ))}
        </div>
        {/* zoom */}
        <div
          className={`hidden md:flex items-center gap-1 rounded-xl border px-1 py-1 ${
            dark ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <button
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}
            className={`px-2 rounded-lg ${
              dark ? "hover:bg-gray-700" : "hover:bg-gray-100"
            }`}
          >
            −
          </button>
          <span className="text-xs w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))}
            className={`px-2 rounded-lg ${
              dark ? "hover:bg-gray-700" : "hover:bg-gray-100"
            }`}
          >
            +
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* original upload */}
        <div
          className={`${card} ${cardCls} p-4 ${
            mobileTab === "original" ? "" : "hidden md:block"
          }`}
        >
          <p
            className={`text-xs font-semibold uppercase tracking-wide mb-2 ${muted}`}
          >
            Original uploaded design
          </p>
          {active?.originalFileUrl ? (
            active.originalFileType === "pdf" ? (
              <object
                data={active.originalFileUrl}
                type="application/pdf"
                className="w-full h-[70vh] rounded-xl"
              >
                <p className={`p-4 text-sm ${muted}`}>
                  PDF preview unavailable —{" "}
                  <a
                    className="text-blue-500 underline"
                    href={active.originalFileUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    open the file
                  </a>
                  .
                </p>
              </object>
            ) : (
              <img
                src={active.originalFileUrl}
                alt="Original report card"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700"
              />
            )
          ) : (
            <p className={muted}>No original file.</p>
          )}
        </div>

        {/* AI preview */}
        <div
          className={`${card} ${cardCls} p-4 ${
            mobileTab === "preview" ? "" : "hidden md:block"
          }`}
        >
          <p
            className={`text-xs font-semibold uppercase tracking-wide mb-2 ${muted}`}
          >
            AI recreation (sample data)
          </p>
          {previewLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : previewHtml ? (
            <div className="h-[70vh] overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white">
              <iframe
                title="Template preview"
                srcDoc={previewHtml}
                sandbox="allow-same-origin"
                style={{
                  width: `${100 / zoom}%`,
                  height: `${100 / zoom}%`,
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                  border: "none",
                  minHeight: "100%",
                }}
                className="h-full w-full"
              />
            </div>
          ) : (
            <p className={muted}>No generated template yet.</p>
          )}
        </div>
      </div>

      {active?.generationError && (
        <p className="text-sm text-rose-500 flex items-center gap-2">
          <ExclamationTriangleIcon className="h-4 w-4" />{" "}
          {active.generationError}
        </p>
      )}

      {/* actions */}
      <div className="flex flex-wrap gap-3 justify-end">
        <button
          onClick={() => {
            setView("dashboard");
            loadTemplates();
          }}
          className={btnGhost}
        >
          Back
        </button>
        {active?.status !== "APPROVED" && (
          <>
            <button
              onClick={() => setShowCorrection(true)}
              disabled={busy !== null || !previewHtml}
              className={btnGhost}
            >
              <SparklesIcon className="h-4 w-4" />{" "}
              {busy === "correct" ? "Applying…" : "Request AI Correction"}
            </button>
            <button
              onClick={doRegenerate}
              disabled={busy !== null}
              className={btnGhost}
            >
              <ArrowPathIcon
                className={`h-4 w-4 ${busy === "regen" ? "animate-spin" : ""}`}
              />{" "}
              {busy === "regen" ? "Regenerating…" : "Regenerate"}
            </button>
            <button
              onClick={doApprove}
              disabled={busy !== null || !previewHtml}
              className={btnPrimary}
            >
              <CheckBadgeIcon className="h-4 w-4" />{" "}
              {busy === "approve" ? "Approving…" : "Accept Template"}
            </button>
          </>
        )}
        {active?.status === "APPROVED" && (
          <button onClick={() => setView("assign")} className={btnPrimary}>
            <UserGroupIcon className="h-4 w-4" /> Assign to Classes
          </button>
        )}
      </div>

      {/* correction modal */}
      <AnimatePresence>
        {showCorrection && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCorrection(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-50"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className={`w-full max-w-lg rounded-3xl shadow-2xl p-6 ${
                  dark ? "bg-gray-900 text-white" : "bg-white"
                }`}
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold">Request AI correction</h3>
                  <button
                    onClick={() => setShowCorrection(false)}
                    className={`p-1 rounded-full ${
                      dark ? "hover:bg-gray-700" : "hover:bg-gray-100"
                    }`}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                <p className={`text-sm mb-3 ${muted}`}>
                  Describe what should change — e.g. "Move the logo to the
                  left", "Add a remarks column to the subject table".
                </p>
                <textarea
                  rows={4}
                  value={correctionText}
                  onChange={(e) => setCorrectionText(e.target.value)}
                  className={`w-full rounded-xl border-0 px-4 py-3 ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-blue-500 ${
                    dark ? "bg-gray-800 text-white" : "bg-white text-gray-900"
                  }`}
                />
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={() => setShowCorrection(false)}
                    className={btnGhost}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={doCorrect}
                    disabled={busy === "correct"}
                    className={btnPrimary}
                  >
                    {busy === "correct"
                      ? "Applying…"
                      : "Send to Edufy AI (1 token)"}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );

  // =========================== ASSIGN ===========================
  const renderAssign = () => {
    const year = years.find((y) => y.id === sessionId);
    const conflicting = new Set(
      existingAssignments
        .filter(
          (a: any) =>
            a.isActive &&
            a.templateId !== active?.id &&
            a.academicSessionId === sessionId &&
            (assignmentType === "ALL_TERMS"
              ? a.assignmentType === "ALL_TERMS" || !a.term
              : a.term === term),
        )
        .flatMap((a: any) => a.classIds || []),
    );
    return (
      <div className={`max-w-3xl mx-auto p-6 ${card} ${cardCls}`}>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <UserGroupIcon className="h-6 w-6 text-indigo-500" /> Assign "
          {active?.name}"
        </h2>
        <p className={`text-sm mt-1 ${muted}`}>
          Every student in an assigned class gets their report card rendered in
          this template. Unassigned classes keep the default report card.
        </p>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1.5`}>
              Academic session
            </label>
            <select
              value={sessionId}
              onChange={(e) => {
                setSessionId(e.target.value);
                const y = years.find((yy) => yy.id === e.target.value);
                setTerm(y?.terms?.[0]?.name || "");
              }}
              className={`w-full rounded-xl border-0 px-4 py-3 ring-1 ring-gray-200 dark:ring-gray-700 ${
                dark ? "bg-gray-800 text-white" : "bg-white"
              }`}
            >
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                  {y.isActive ? " (active)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1.5`}>
              Applies to
            </label>
            <select
              value={assignmentType}
              onChange={(e) => setAssignmentType(e.target.value as any)}
              className={`w-full rounded-xl border-0 px-4 py-3 ring-1 ring-gray-200 dark:ring-gray-700 ${
                dark ? "bg-gray-800 text-white" : "bg-white"
              }`}
            >
              <option value="ALL_TERMS">
                All terms of {year?.name || "the session"}
              </option>
              <option value="SPECIFIC_TERM">One specific term</option>
            </select>
          </div>
          {assignmentType === "SPECIFIC_TERM" && (
            <div>
              <label className={`block text-sm font-medium mb-1.5`}>Term</label>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className={`w-full rounded-xl border-0 px-4 py-3 ring-1 ring-gray-200 dark:ring-gray-700 ${
                  dark ? "bg-gray-800 text-white" : "bg-white"
                }`}
              >
                {(year?.terms || []).map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <p className={`text-sm font-medium mt-5 mb-2`}>Classes</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
          {classes.map((c) => {
            const conflict = conflicting.has(c.id);
            const sel = selectedClasses.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() =>
                  conflict
                    ? toast.error(
                        `${c.name} already has a template for this ${
                          assignmentType === "SPECIFIC_TERM"
                            ? "term"
                            : "session"
                        }`,
                      )
                    : setSelectedClasses((s) =>
                        sel ? s.filter((x) => x !== c.id) : [...s, c.id],
                      )
                }
                className={`relative p-3 rounded-xl border text-left text-sm transition-all ${
                  sel
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold"
                    : dark
                    ? "border-gray-700 hover:border-gray-500"
                    : "border-gray-200 hover:border-gray-400"
                } ${conflict ? "opacity-50" : ""}`}
              >
                {c.name}
                {(c.arms?.length || 0) > 0 && (
                  <span className={`block text-xs ${muted}`}>
                    {c.arms!.map((a) => a.letter).join(", ")}
                  </span>
                )}
                {conflict && (
                  <span className="absolute top-1.5 right-1.5">
                    <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setView("dashboard")} className={btnGhost}>
            Cancel
          </button>
          <button
            onClick={doAssign}
            disabled={busy === "assign"}
            className={btnPrimary}
          >
            {busy === "assign"
              ? "Assigning…"
              : `Assign ${selectedClasses.length || ""} class${
                  selectedClasses.length === 1 ? "" : "es"
                }`}
          </button>
        </div>
      </div>
    );
  };

  // ------------------------------------------------------------ page shell

  return (
    <div
      className={`min-h-screen ${
        dark
          ? "bg-[#0B1120] text-gray-100"
          : "bg-gradient-to-br from-blue-50 via-white to-blue-50 text-gray-900"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* header */}
        <div className="flex items-center gap-3 mb-6">
          {view !== "dashboard" && (
            <button
              onClick={() => {
                setView("dashboard");
                loadTemplates();
              }}
              className={`p-2 rounded-full ${
                dark ? "hover:bg-white/10" : "hover:bg-gray-200/60"
              }`}
              aria-label="Back"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-violet-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-300 bg-clip-text text-transparent">
              Report Designer
            </h1>
            <p className={`text-sm mt-0.5 ${muted}`}>
              Upload a report card — Edufy AI recreates it with your school's
              live data.
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            {view === "dashboard" && renderDashboard()}
            {view === "upload" && renderUpload()}
            {view === "generating" && renderGenerating()}
            {view === "compare" && renderCompare()}
            {view === "assign" && renderAssign()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
