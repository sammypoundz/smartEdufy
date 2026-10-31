// AI Onboarding Center — onboard students to registered schools by uploading
// scanned documents or photos of student registers/admission forms.
// Flow: pick school → upload document (photo/scan/CSV/XLSX) → AI extracts
// students → review & correct → approve → register into the school.
import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CloudArrowUpIcon,
  PhotoIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  DocumentArrowUpIcon,
  UserPlusIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import platformApi from "../../utils/platformApi";
import { Loading, ErrorState, Badge, formatNumber } from "./shared";
import { useTheme } from "../../contexts/ThemeContext";

interface ExtractedStudent {
  id: string;
  name: string;
  gender: string | null;
  religion: string | null;
  className: string | null;
  admissionNumber: string | null;
  confidence: string;
  status: string; // PENDING | APPROVED | REJECTED | DUPLICATE | REGISTERED
  flags: string[];
  duplicateOfId?: string | null;
}

interface Batch {
  id: string;
  schoolId: string;
  schoolName?: string;
  status: string; // EXTRACTED | COMPLETED | FAILED
  fileName: string;
  source: string; // AI | SPREADSHEET
  extracted: number;
  registered?: number;
  duplicates?: number;
  rejected?: number;
  createdAt: string;
}

interface School {
  id: string;
  name: string;
  subdomain: string;
  isActive: boolean;
}

const RELIGIONS = ["CHRISTIANITY", "ISLAM", "TRADITIONAL", "OTHER"];

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  medium:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  low: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

const STATUS_STYLES: Record<string, string> = {
  PENDING:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  APPROVED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  REJECTED: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  DUPLICATE:
    "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  REGISTERED:
    "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
};

export default function PlatformOnboarding() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const reviewPanelRef = useRef<HTMLDivElement>(null);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busyRecordId, setBusyRecordId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [confirmClasses, setConfirmClasses] = useState<{
    batchId: string;
    missing: string[];
  } | null>(null);
  const [reportModal, setReportModal] = useState<
    "duplicates" | "rejected" | null
  >(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // ---- data ----
  const schools = useQuery({
    queryKey: ["platform", "schools", "onboarding"],
    queryFn: async () =>
      (await platformApi.get("/schools?page=1&pageSize=100")).data
        .schools as School[],
  });

  const batches = useQuery({
    queryKey: ["platform", "onboarding", "batches"],
    queryFn: async () => (await platformApi.get("/onboarding")).data as Batch[],
    refetchInterval: 10_000,
  });

  const batch = useQuery({
    queryKey: ["platform", "onboarding", "batch", activeBatchId],
    queryFn: async () =>
      (await platformApi.get(`/onboarding/${activeBatchId}`)).data,
    enabled: !!activeBatchId,
  });

  const activeBatch = (batches.data || []).find((b) => b.id === activeBatchId);

  // ---- mutations ----
  const upload = useMutation({
    mutationFn: async () => {
      if (!selectedSchool || !file) throw new Error("Pick a school and a file");
      const fd = new FormData();
      fd.append("schoolId", selectedSchool);
      fd.append("file", file);
      const res = await platformApi.post("/onboarding", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data as { batch: Batch; records: ExtractedStudent[] };
    },
    onSuccess: (data) => {
      setActiveBatchId(data.batch.id);
      setFile(null);
      setPreviewUrl(null);
      if (fileInput.current) fileInput.current.value = "";
      if (cameraInput.current) cameraInput.current.value = "";
      notify(
        `AI extracted ${data.batch.extracted} students — review & approve below`,
      );
      qc.invalidateQueries({ queryKey: ["platform", "onboarding", "batches"] });
      qc.invalidateQueries({
        queryKey: ["platform", "onboarding", "batch", data.batch.id],
      });
      // Scroll down to the extracted-data preview once it has rendered.
      setTimeout(() => {
        reviewPanelRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 300);
    },
    onError: (e: any) =>
      notify(e?.response?.data?.error || e?.message || "Upload failed"),
  });

  // Reset selection & busy state when switching batches, then scroll the
  // extraction preview (review panel) into view.
  const selectActiveBatch = (id: string) => {
    setActiveBatchId(id);
    setSelectedIds(new Set());
    setBusyRecordId(null);
    setBusyAction(null);
    // Wait a tick so the review panel renders before scrolling to it.
    setTimeout(() => {
      reviewPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const updateRecord = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      gender?: string | null;
      religion?: string | null;
      className?: string | null;
      admissionNumber?: string | null;
      status?: string;
    }) => (await platformApi.patch(`/onboarding/records/${id}`, data)).data,
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["platform", "onboarding", "batch", activeBatchId],
      }),
  });

  // Bulk-approve / bulk-reject every selected record (one PATCH per record).
  const bulkUpdateStatus = useMutation({
    mutationFn: async ({
      ids,
      status,
    }: {
      ids: string[];
      status: string;
    }) => {
      const results = await Promise.allSettled(
        ids.map((id) =>
          platformApi.patch(`/onboarding/records/${id}`, { status }),
        ),
      );
      return {
        status,
        ok: results.filter((r) => r.status === "fulfilled").length,
        failed: results.filter((r) => r.status === "rejected").length,
      };
    },
    onSuccess: (data) => {
      notify(
        `Bulk ${data.status.toLowerCase()}: ${data.ok} record(s)${
          data.failed ? ` · ${data.failed} failed` : ""
        }`,
      );
      setSelectedIds(new Set());
      qc.invalidateQueries({
        queryKey: ["platform", "onboarding", "batch", activeBatchId],
      });
    },
    onError: () => notify("Bulk update failed"),
  });

  // Single approve/reject with a per-row, per-action loading indicator.
  const setRecordStatus = (id: string, status: string) => {
    setBusyRecordId(id);
    setBusyAction(status);
    updateRecord.mutate(
      { id, status },
      {
        onSuccess: () => {
          setBusyRecordId(null);
          setBusyAction(null);
        },
        onError: () => {
          setBusyRecordId(null);
          setBusyAction(null);
        },
      },
    );
  };

  const approveAll = useMutation({
    mutationFn: async (batchId: string) =>
      (await platformApi.post(`/onboarding/${batchId}/approve-all`)).data,
    onSuccess: (data) => {
      notify(`Approved ${data.approved} validated students`);
      qc.invalidateQueries({ queryKey: ["platform", "onboarding"] });
    },
    onError: (e: any) =>
      notify(e?.response?.data?.error || "Approve-all failed"),
  });

  const register = useMutation({
    mutationFn: async (batchId: string) =>
      (await platformApi.post(`/onboarding/${batchId}/register`)).data as {
        registered: number;
        duplicates: number;
        failed: number;
        total: number;
      },
    onSuccess: (data) => {
      notify(
        `Registered ${data.registered} students into the school · ${data.duplicates} duplicates skipped · ${data.failed} failed`,
      );
      qc.invalidateQueries({ queryKey: ["platform", "onboarding"] });
    },
    onError: (e: any) =>
      notify(e?.response?.data?.error || "Registration failed"),
  });

  // Create missing classes (each with an "Arm A" arm) after confirmation,
  // then register the approved students straight away.
  const ensureClasses = useMutation({
    mutationFn: async (batchId: string) =>
      (await platformApi.post(`/onboarding/${batchId}/ensure-classes`)).data as {
        createdClasses: string[];
        createdArms: string[];
      },
    onSuccess: (data, batchId) => {
      notify(
        `Created ${data.createdClasses.length} class(es) with Arm A — registering students…`,
      );
      setConfirmClasses(null);
      qc.invalidateQueries({ queryKey: ["platform", "onboarding"] });
      register.mutate(batchId);
    },
    onError: (e: any) =>
      notify(e?.response?.data?.error || "Could not create classes"),
  });

  // Register flow: first check for classes referenced by the batch that don't
  // exist in the target school. If any, prompt for confirmation to create
  // them (each with an "Arm A") so students land in a class + arm.
  const startRegistration = async (batchId: string) => {
    try {
      const { data } = await platformApi.get(
        `/onboarding/${batchId}/missing-classes`,
      );
      const missing: string[] = data?.missingClasses || [];
      if (missing.length > 0) {
        setConfirmClasses({ batchId, missing });
        return;
      }
      register.mutate(batchId);
    } catch {
      register.mutate(batchId);
    }
  };

  // ---- file handling (upload or camera capture) ----
  const acceptFile = useCallback((f: File | null) => {
    if (!f) return;
    const ok = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/pdf",
    ];
    if (!ok.includes(f.type)) {
      notify("Unsupported file type — use a photo, scan, CSV, XLSX or PDF");
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      notify("File is too large (max 20 MB)");
      return;
    }
    setFile(f);
    setPreviewUrl(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  }, []);

  const records: ExtractedStudent[] = batch.data?.records || [];
  // Display extracted students alphabetically by name (case-insensitive)
  const sorted = [...records].sort((a, b) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
  );
  const filtered = search
    ? sorted.filter((r) =>
        `${r.name} ${r.admissionNumber || ""} ${r.className || ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
    : sorted;
  const counts = {
    pending: records.filter((r) => r.status === "PENDING").length,
    approved: records.filter((r) => r.status === "APPROVED").length,
    duplicates: records.filter((r) => r.status === "DUPLICATE").length,
    registered: records.filter((r) => r.status === "REGISTERED").length,
  };
  const isImage = previewUrl !== null;

  // Records behind the clickable "duplicates skipped" / "rejected/failed"
  // numbers in the batch-completed report.
  const duplicateRecords = records.filter((r) => r.status === "DUPLICATE");
  const rejectedRecords = records.filter(
    (r) => r.status === "REJECTED" || r.flags?.includes("FAILED"),
  );

  // Selection helpers for the bulk check & approve feature
  const pendingIds = records
    .filter((r) => r.status === "PENDING")
    .map((r) => r.id);
  const allPendingSelected =
    pendingIds.length > 0 && pendingIds.every((id) => selectedIds.has(id));
  const toggleSelectAll = () =>
    setSelectedIds(allPendingSelected ? new Set() : new Set(pendingIds));
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selectedCount = selectedIds.size;
  const checkboxCls =
    "w-4 h-4 accent-blue-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="space-y-6">
      {/* Confirm: create missing classes + Arm A before registering */}
      {confirmClasses && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            className={`w-full max-w-md rounded-2xl p-6 shadow-2xl border ${
              dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center">
                <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-extrabold">Create missing classes?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  These classes don't exist in the target school yet.
                </p>
              </div>
            </div>
            <ul className="mt-4 space-y-1.5">
              {confirmClasses.missing.map((name) => (
                <li
                  key={name}
                  className="rounded-lg bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 text-sm font-semibold text-amber-700 dark:text-amber-300"
                >
                  {name}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              If confirmed, each class is created with an <b>Arm A</b> so the
              approved students can be registered into a class + arm right
              away.
            </p>
            <div className="mt-5 flex gap-2 justify-end">
              <button
                onClick={() => setConfirmClasses(null)}
                className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => ensureClasses.mutate(confirmClasses.batchId)}
                disabled={ensureClasses.isPending}
                className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow disabled:opacity-50"
              >
                {ensureClasses.isPending
                  ? "Creating…"
                  : "Create classes & register"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch report modal — duplicates / rejected details */}
      {reportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setReportModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl rounded-2xl p-6 shadow-2xl border max-h-[85vh] overflow-y-auto ${
              dark
                ? "bg-gray-900 border-gray-700 text-gray-100"
                : "bg-white border-gray-200"
            }`}
          >
            {(() => {
              const isDupes = reportModal === "duplicates";
              const list = isDupes ? duplicateRecords : rejectedRecords;
              return (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                          isDupes
                            ? "bg-violet-100 dark:bg-violet-500/15"
                            : "bg-rose-100 dark:bg-rose-500/15"
                        }`}
                      >
                        {isDupes ? (
                          <ExclamationTriangleIcon className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                        ) : (
                          <XCircleIcon className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-extrabold">
                          {isDupes
                            ? `Duplicates skipped (${list.length})`
                            : `Rejected / failed (${list.length})`}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {isDupes
                            ? "These students were already registered in this school, so they were skipped."
                            : "These records were rejected or failed validation."}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setReportModal(null)}
                      className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs font-bold"
                    >
                      Close
                    </button>
                  </div>

                  {list.length === 0 ? (
                    <p className="mt-6 text-center text-sm text-gray-500 py-6">
                      Nothing to show here.
                    </p>
                  ) : (
                    <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                      <table className="w-full text-sm">
                        <thead>
                          <tr
                            className={`text-left text-[11px] uppercase tracking-wider ${
                              dark ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            <th className="px-4 py-2 font-bold">Student</th>
                            <th className="px-3 py-2 font-bold">Class</th>
                            <th className="px-3 py-2 font-bold">Admission No</th>
                            <th className="px-4 py-2 font-bold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                          {list.map((r) => (
                            <tr key={r.id}>
                              <td className="px-4 py-2 font-semibold">
                                {r.name}
                              </td>
                              <td className="px-3 py-2 text-xs">
                                {r.className || "—"}
                              </td>
                              <td className="px-3 py-2 text-xs">
                                {r.admissionNumber || "—"}
                              </td>
                              <td className="px-4 py-2">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    STATUS_STYLES[r.status] ||
                                    "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {r.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {!isDupes && list.length > 0 && (
                    <div className="mt-5 flex justify-end gap-2">
                      <button
                        onClick={() => setReportModal(null)}
                        className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          setReportModal(null);
                          startRegistration(activeBatchId!);
                        }}
                        disabled={
                          register.isPending ||
                          ensureClasses.isPending ||
                          counts.approved === 0
                        }
                        className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        <UserPlusIcon className="w-4 h-4" />
                        {register.isPending || ensureClasses.isPending
                          ? "Registering…"
                          : `Register approved students (${counts.approved})`}
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 max-w-sm rounded-2xl px-4 py-3 text-sm font-semibold shadow-2xl border ${
            dark
              ? "bg-gray-900 border-gray-700 text-gray-100"
              : "bg-white border-gray-200 text-gray-800"
          }`}
        >
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
          <AcademicCapIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold">AI Onboarding Center</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Upload scanned documents or photos of student registers — AI reads
            every student row and onboards them into the registered school.
          </p>
        </div>
      </div>

      {/* Upload card */}
      <div
        className={`rounded-2xl border p-5 md:p-6 ${
          dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
        }`}
      >
        <div className="grid md:grid-cols-3 gap-4">
          {/* School select */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
              1 · Target school
            </label>
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className={`mt-1.5 w-full rounded-xl px-3 py-2.5 border text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                dark
                  ? "bg-gray-800 border-gray-700 text-white"
                  : "bg-white border-gray-300"
              }`}
            >
              <option value="">Select a school…</option>
              {(schools.data || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.isActive ? "" : "(inactive)"}
                </option>
              ))}
            </select>
          </div>

          {/* File dropzone */}
          <div className="md:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
              2 · Document (photo, scan, CSV, XLSX, PDF)
            </label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                acceptFile(e.dataTransfer.files?.[0] || null);
              }}
              className={`mt-1.5 rounded-xl border-2 border-dashed p-4 flex items-center gap-4 transition ${
                dark
                  ? "border-gray-700 bg-gray-800/40 hover:border-blue-500"
                  : "border-gray-300 bg-gray-50 hover:border-blue-400"
              }`}
            >
              {file ? (
                <>
                  {isImage ? (
                    <img
                      src={previewUrl!}
                      alt="Document preview"
                      className="h-20 w-20 rounded-xl object-cover border border-gray-300 dark:border-gray-700"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <DocumentArrowUpIcon className="w-10 h-10 text-blue-500" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(0)} KB · ready to extract
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => upload.mutate()}
                        disabled={!selectedSchool || upload.isPending}
                        className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow disabled:opacity-50"
                      >
                        {upload.isPending
                          ? "AI extracting…"
                          : "Extract with AI"}
                      </button>
                      <button
                        onClick={() => {
                          setFile(null);
                          setPreviewUrl(null);
                          if (fileInput.current) fileInput.current.value = "";
                          if (cameraInput.current)
                            cameraInput.current.value = "";
                        }}
                        className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs font-semibold"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <CloudArrowUpIcon className="w-10 h-10 text-blue-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      Drag a document here, or
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => fileInput.current?.click()}
                        className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow"
                      >
                        Choose file
                      </button>
                      <button
                        onClick={() => cameraInput.current?.click()}
                        className="rounded-lg border border-blue-500 text-blue-600 dark:text-blue-400 px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5"
                      >
                        <PhotoIcon className="w-4 h-4" /> Take photo
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] text-gray-500">
                      Photograph the student register / admission form — AI
                      reads handwriting too. Max 20 MB.
                    </p>
                  </div>
                </>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp,text/csv,.csv,.xlsx,.xls,application/pdf"
                className="hidden"
                onChange={(e) => acceptFile(e.target.files?.[0] || null)}
              />
              {/* Camera capture (mobile) */}
              <input
                ref={cameraInput}
                type="file"
                accept="image/jpeg,image/png"
                capture="environment"
                className="hidden"
                onChange={(e) => acceptFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
        </div>

        {upload.isPending && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
            <ArrowPathIcon className="w-5 h-5 animate-spin" />
            AI is reading the document — extracting student rows, validating
            against the school's classes and flagging duplicates…
          </div>
        )}
      </div>

      {/* Recent batches */}
      {batches.data && batches.data.length > 0 && (
        <div
          className={`rounded-2xl border ${
            dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
          }`}
        >
          <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h3 className="font-bold text-sm">Recent onboarding batches</h3>
            <span className="text-xs text-gray-500">
              {batches.data.length} total
            </span>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {batches.data.slice(0, 8).map((b) => (
              <button
                key={b.id}
                onClick={() => selectActiveBatch(b.id)}
                className={`w-full px-5 py-3 flex items-center gap-4 text-left transition ${
                  b.id === activeBatchId
                    ? "bg-blue-50 dark:bg-blue-500/10"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                }`}
              >
                <DocumentArrowUpIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{b.fileName}</p>
                  <p className="text-xs text-gray-500">
                    {b.schoolName || b.schoolId} ·{" "}
                    {new Date(b.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="text-xs font-bold text-gray-500">
                  {formatNumber(b.extracted)} students
                </span>
                <Badge status={b.status} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Review panel */}
      {activeBatchId && (
        <div
          ref={reviewPanelRef}
          className={`rounded-2xl border scroll-mt-24 ${
            dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
          }`}
        >
          {batch.isLoading ? (
            <Loading />
          ) : batch.error ? (
            <ErrorState message="Failed to load batch records" />
          ) : (
            <>
              {/* Batch header + summary + actions */}
              <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm truncate">
                    {activeBatch?.fileName} · {formatNumber(records.length)}{" "}
                    students extracted
                  </h3>
                  <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] font-bold">
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                      {counts.pending} pending review
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                      {counts.approved} approved
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                      {counts.duplicates} duplicates
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                      {counts.registered} registered
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      bulkUpdateStatus.mutate({
                        ids: [...selectedIds],
                        status: "APPROVED",
                      })
                    }
                    disabled={bulkUpdateStatus.isPending || selectedCount === 0}
                    className="rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 px-3 py-2 text-xs font-bold text-white shadow disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <CheckCircleIcon
                      className={`w-4 h-4 ${
                        bulkUpdateStatus.isPending ? "animate-pulse" : ""
                      }`}
                    />
                    {bulkUpdateStatus.isPending
                      ? "Working…"
                      : `Approve selected (${selectedCount})`}
                  </button>
                  <button
                    onClick={() =>
                      bulkUpdateStatus.mutate({
                        ids: [...selectedIds],
                        status: "REJECTED",
                      })
                    }
                    disabled={bulkUpdateStatus.isPending || selectedCount === 0}
                    className="rounded-lg border border-rose-500 text-rose-600 dark:text-rose-400 px-3 py-2 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <XCircleIcon className="w-4 h-4" />
                    {bulkUpdateStatus.isPending
                      ? "Working…"
                      : `Reject selected (${selectedCount})`}
                  </button>
                  <button
                    onClick={() => approveAll.mutate(activeBatchId!)}
                    disabled={approveAll.isPending || counts.pending === 0}
                    className="rounded-lg border border-emerald-500 text-emerald-600 dark:text-emerald-400 px-3 py-2 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircleIcon className="w-4 h-4" /> Approve all valid
                  </button>
                  <button
                    onClick={() => startRegistration(activeBatchId!)}
                    disabled={
                      register.isPending ||
                      ensureClasses.isPending ||
                      (counts.approved === 0 && counts.pending === 0)
                    }
                    className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <UserPlusIcon className="w-4 h-4" />
                    {register.isPending || ensureClasses.isPending
                      ? "Registering…"
                      : `Register approved students`}
                  </button>
                </div>
              </div>

              {register.isPending && (
                <div className="px-5 py-3 flex items-center gap-3 text-sm text-blue-600 dark:text-blue-400">
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  Creating student accounts in the school tenant — rechecking
                  duplicates before each registration…
                </div>
              )}

              {/* Search */}
              <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800">
                <div className="relative max-w-sm">
                  <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, admission no, class…"
                    className={`w-full rounded-xl pl-9 pr-3 py-2 text-sm border outline-none focus:ring-2 focus:ring-blue-500 ${
                      dark
                        ? "bg-gray-800 border-gray-700 text-white"
                        : "bg-white border-gray-300"
                    }`}
                  />
                </div>
              </div>

              {/* Records table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className={`text-left text-[11px] uppercase tracking-wider ${
                        dark ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      <th className="px-5 py-2.5 font-bold">
                        <input
                          type="checkbox"
                          checked={allPendingSelected}
                          onChange={toggleSelectAll}
                          disabled={pendingIds.length === 0}
                          title="Select all pending"
                          className={checkboxCls}
                        />
                      </th>
                      <th className="px-3 py-2.5 font-bold">Student</th>
                      <th className="px-3 py-2.5 font-bold">Gender</th>
                      <th className="px-3 py-2.5 font-bold">Religion</th>
                      <th className="px-3 py-2.5 font-bold">Class</th>
                      <th className="px-3 py-2.5 font-bold">Admission No</th>
                      <th className="px-3 py-2.5 font-bold">Confidence</th>
                      <th className="px-3 py-2.5 font-bold">Status</th>
                      <th className="px-5 py-2.5 font-bold text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {filtered.map((r) => (
                      <tr key={r.id}>
                        <td className="px-5 py-2.5">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(r.id)}
                            onChange={() => toggleSelect(r.id)}
                            disabled={
                              r.status !== "PENDING" ||
                              bulkUpdateStatus.isPending
                            }
                            className={checkboxCls}
                          />
                        </td>
                        <td className="px-5 py-2.5">
                          <input
                            value={r.name}
                            disabled={r.status === "REGISTERED"}
                            onChange={(e) =>
                              updateRecord.mutate({
                                id: r.id,
                                name: e.target.value,
                              })
                            }
                            className={`bg-transparent font-semibold outline-none rounded px-1 py-0.5 focus:ring-2 focus:ring-blue-500 ${
                              dark ? "text-white" : "text-gray-900"
                            }`}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <select
                            value={r.gender || ""}
                            disabled={r.status === "REGISTERED"}
                            onChange={(e) =>
                              updateRecord.mutate({
                                id: r.id,
                                gender: e.target.value || null,
                              })
                            }
                            className={`bg-transparent text-xs outline-none rounded px-1 py-0.5 ${
                              dark ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            <option value="">—</option>
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                          </select>
                        </td>
                        <td className="px-3 py-2.5">
                          <select
                            value={r.religion || ""}
                            disabled={r.status === "REGISTERED"}
                            onChange={(e) =>
                              updateRecord.mutate({
                                id: r.id,
                                religion: e.target.value || null,
                              })
                            }
                            className={`bg-transparent text-xs outline-none rounded px-1 py-0.5 ${
                              dark ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            <option value="">—</option>
                            {RELIGIONS.map((rel) => (
                              <option key={rel} value={rel}>
                                {rel.charAt(0) + rel.slice(1).toLowerCase()}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            value={r.className || ""}
                            disabled={r.status === "REGISTERED"}
                            onChange={(e) =>
                              updateRecord.mutate({
                                id: r.id,
                                className: e.target.value || null,
                              })
                            }
                            className={`bg-transparent text-xs outline-none rounded px-1 py-0.5 focus:ring-2 focus:ring-blue-500 ${
                              dark ? "text-gray-300" : "text-gray-700"
                            }`}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            value={r.admissionNumber || ""}
                            disabled={r.status === "REGISTERED"}
                            onChange={(e) =>
                              updateRecord.mutate({
                                id: r.id,
                                admissionNumber: e.target.value || null,
                              })
                            }
                            className={`bg-transparent text-xs outline-none rounded px-1 py-0.5 focus:ring-2 focus:ring-blue-500 ${
                              dark ? "text-gray-300" : "text-gray-700"
                            }`}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              CONFIDENCE_STYLES[r.confidence] ||
                              "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {r.confidence}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              STATUS_STYLES[r.status] ||
                              "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {r.status}
                          </span>
                          {r.flags?.includes("CLASS_NOT_FOUND") && (
                            <span
                              title="Class not found in this school"
                              className="ml-1 inline-flex text-amber-500"
                            >
                              <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {r.status === "DUPLICATE" && (
                            <span
                              title="Already registered in this school"
                              className="ml-1 inline-flex text-violet-500"
                            >
                              <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-2.5 text-right whitespace-nowrap">
                          {r.status !== "REGISTERED" &&
                            r.status !== "DUPLICATE" && (
                              <button
                                onClick={() =>
                                  setRecordStatus(r.id, "APPROVED")
                                }
                                title="Approve"
                                disabled={busyRecordId === r.id}
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 disabled:opacity-50"
                              >
                                {busyRecordId === r.id &&
                                busyAction === "APPROVED" ? (
                                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                ) : (
                                  <CheckCircleIcon className="w-5 h-5" />
                                )}
                              </button>
                            )}
                          {r.status === "PENDING" && (
                            <button
                              onClick={() =>
                                setRecordStatus(r.id, "REJECTED")
                              }
                              title="Reject"
                              disabled={busyRecordId === r.id}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-50"
                            >
                              {busyRecordId === r.id &&
                              busyAction === "REJECTED" ? (
                                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                              ) : (
                                <XCircleIcon className="w-5 h-5" />
                              )}
                            </button>
                          )}
                          {(r.status === "REJECTED" ||
                            r.status === "APPROVED") && (
                            <button
                              onClick={() =>
                                updateRecord.mutate({
                                  id: r.id,
                                  status: "PENDING",
                                })
                              }
                              title="Reset to pending"
                              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              <ArrowPathIcon className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <p className="px-5 py-8 text-center text-sm text-gray-500">
                    No records match your search.
                  </p>
                )}
              </div>

              {/* Registration report */}
              {activeBatch?.status === "COMPLETED" && (
                <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800">
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-4 py-3 flex items-start gap-3">
                    <CheckCircleIcon className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-emerald-800 dark:text-emerald-300">
                      <p className="font-bold">Batch completed</p>
                      <p>
                        {formatNumber(activeBatch?.registered || 0)} students
                        registered ·{" "}
                        <button
                          onClick={() => setReportModal("duplicates")}
                          className="underline font-bold hover:text-emerald-600 dark:hover:text-emerald-200"
                        >
                          {formatNumber(activeBatch?.duplicates || 0)} duplicates
                        </button>{" "}
                        skipped ·{" "}
                        <button
                          onClick={() => setReportModal("rejected")}
                          className="underline font-bold hover:text-emerald-600 dark:hover:text-emerald-200"
                        >
                          {formatNumber(activeBatch?.rejected || 0)}
                          rejected/failed
                        </button>{" "}
                        of {formatNumber(activeBatch?.extracted || 0)}{" "}
                        extracted.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
