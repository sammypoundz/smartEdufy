import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { useDropzone } from "react-dropzone";
import {
  ArrowUpTrayIcon,
  TrashIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  EyeIcon,
  PencilSquareIcon,
  ExclamationTriangleIcon,
  CameraIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useEdufy } from "./EdufyContext";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../utils/api";

// Real extraction: the file is sent to POST /api/ai-scan/result-sheet, which
// uses Gemini vision to read the table (printed or handwritten). The scanned
// rows are then reviewed here and can be pushed into the Result Compiler via
// the Results page.

interface ExtractedRow {
  id: number;
  name: string;
  admissionNumber?: string | null;
  ca1: number | null;
  ca2: number | null;
  ca3: number | null;
  exam: number | null;
  confidence: "high" | "medium" | "low";
}

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  low: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
};

type Stage = "upload" | "scanning" | "review" | "saved";

const clampMark = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
};

const PROGRESS_STEPS = [
  "Uploading image…",
  "Detecting table structure…",
  "Reading student names…",
  "Extracting marks…",
  "Validating totals…",
];

export default function ResultScannerScreen() {
  const { back, scannerHandoff, resetToMenu } = useEdufy();
  const { token } = useAuth();
  const rosterNames = scannerHandoff?.rosterNames ?? [];
  const onApply = scannerHandoff?.onApply;
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("upload");
  const [progress, setProgress] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [rows, setRows] = useState<ExtractedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [isMobileView, setIsMobileView] = useState(
    typeof window !== "undefined" && window.innerWidth < 768,
  );
  const [startingCamera, setStartingCamera] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Send the file to the real backend and map the response into review rows.
  const scan = async (f: File) => {
    setError(null);
    setRows([]);
    try {
      const fd = new FormData();
      fd.append("image", f);
      const res = await api.post("/ai-scan/result-sheet", fd, token);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "AI scan failed");
      const students: any[] = Array.isArray(data.students) ? data.students : [];
      if (students.length === 0) {
        throw new Error(
          "No student rows could be read from this image. Try a clearer, well-lit photo of the full table.",
        );
      }
      setRows(
        students.map((s, i) => ({
          id: i + 1,
          name: String(s.name ?? "").trim(),
          admissionNumber: s.admissionNumber ?? null,
          ca1: clampMark(s.ca1),
          ca2: clampMark(s.ca2),
          ca3: clampMark(s.ca3),
          exam: clampMark(s.exam),
          confidence: ["high", "medium", "low"].includes(s.confidence)
            ? s.confidence
            : "medium",
        })),
      );
      setStage("review");
    } catch (err: any) {
      setError(err.message || "AI scan failed");
      setStage("upload");
    }
  };

  const onDrop = useCallback(
    (accepted: File[], rejected: { file: File }[]) => {
      if (rejected.length) {
        setError("Unsupported file. Please upload a JPG or PNG result sheet.");
        return;
      }
      setError(null);
      const f = accepted[0];
      if (!f) return;
      setFile(f);
      if (f.type.startsWith("image/")) setPreviewUrl(URL.createObjectURL(f));
      else setPreviewUrl(null);
      setStage("scanning");
      scan(f);
    },
    [token],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [] },
    maxFiles: 1,
  });

  // Indeterminate progress animation while the real request is in flight.
  // The stage advances to "review" when the scan resolves (not from here).
  useEffect(() => {
    if (stage !== "scanning") return;
    setProgress(0);
    setStepIdx(0);
    timer.current = setInterval(() => {
      setProgress((p) => Math.min(p + 4 + Math.random() * 6, 95));
      setProgress((p) => {
        setStepIdx(Math.min(Math.floor(p / 20), PROGRESS_STEPS.length - 1));
        return p;
      });
    }, 220);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [stage]);

  // Stop the camera stream when it is turned off or the screen unmounts.
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  // Track viewport so the camera renders in exactly one place (the ref must
  // not be shared between the full-screen portal and the inline preview).
  useEffect(() => {
    const onResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Attach the stream once the video element mounts.
  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOn]);

  const startCamera = async () => {
    setError(null);
    setStartingCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
    } catch {
      setError(
        "Camera unavailable. Please allow camera access or upload a file instead.",
      );
    } finally {
      setStartingCamera(false);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const f = new File([blob], `camera-capture-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        stopCamera();
        setFile(f);
        setPreviewUrl(URL.createObjectURL(blob));
        setStage("scanning");
        scan(f);
      },
      "image/jpeg",
      0.92,
    );
  };

  const updateRow = (
    id: number,
    field: "name" | "ca1" | "ca2" | "ca3" | "exam",
    value: string,
  ) => {
    setRows((rs) =>
      rs.map((r) => {
        if (r.id !== id) return r;
        if (field === "name") return { ...r, name: value };
        return {
          ...r,
          [field]: value === "" ? null : Math.max(0, Math.min(100, Number(value) || 0)),
        };
      }),
    );
  };

  const removeRow = (id: number) =>
    setRows((rs) => rs.filter((r) => r.id !== id));

  const restart = () => {
    stopCamera();
    setFile(null);
    setPreviewUrl(null);
    setStage("upload");
    setProgress(0);
    setRows([]);
  };

  const total = (r: ExtractedRow) =>
    (r.ca1 ?? 0) + (r.ca2 ?? 0) + (r.ca3 ?? 0) + (r.exam ?? 0);

  const inRoster = (name: string) =>
    rosterNames.some((n) => n.toLowerCase().trim() === name.toLowerCase().trim());

  // Apply the reviewed rows to the host page (e.g. the Results score table).
  // Only available when the scanner was opened with a handoff.
  const applyToHost = () => {
    if (!onApply) return;
    const valid = rows.filter((r) => r.name.trim());
    if (valid.length === 0) {
      toast.error("No rows with a student name to apply");
      return;
    }
    const unmatched = valid.filter((r) => !inRoster(r.name));
    if (unmatched.length > 0) {
      toast.error(
        `${unmatched.length} name(s) don't match the class roster (e.g. "${unmatched[0].name}"). Fix or remove them first.`,
      );
      return;
    }
    onApply(valid);
    restart();
    resetToMenu();
  };

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-700/70">
        <button
          onClick={back}
          aria-label="Back to Edufy AI menu"
          className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700/60 dark:hover:text-gray-200"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">AI Result Scanner</h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Photo of a result sheet → marks extracted
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* ---------- upload stage ---------- */}
        {stage === "upload" && (
          <div>
            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition ${
                isDragActive
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                  : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50 dark:border-gray-600 dark:bg-gray-800/60 dark:hover:border-blue-500 dark:hover:bg-blue-500/10"
              }`}
              role="button"
              tabIndex={0}
              aria-label="Upload result sheet"
            >
              <input {...getInputProps()} data-testid="edufy-scanner-input" />
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/20">
                <ArrowUpTrayIcon className="h-6 w-6 text-blue-600 dark:text-blue-300" />
              </div>
              <p className="mt-3 text-sm font-semibold text-gray-800 dark:text-gray-200">
                {isDragActive
                  ? "Drop the file here…"
                  : "Drag & drop a result sheet"}
              </p>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              or click to browse — JPG, PNG or PDF (max 1 file)
            </p>
          </div>

          <button
            onClick={startCamera}
            disabled={startingCamera}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-xs font-bold text-blue-700 shadow-sm transition hover:bg-blue-50 disabled:opacity-60 dark:border-blue-500/40 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-blue-500/10"
          >
            <CameraIcon className="h-4 w-4" />
            {startingCamera ? "Starting camera…" : "Take photo with camera"}
          </button>

          {cameraOn && isMobileView && createPortal(
            // Full-screen camera on phones (portal to body so it escapes the
            // panel's width); inline preview on desktop.
            <div
              className="fixed inset-0 z-[10000] flex flex-col bg-black md:hidden"
              style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
            >
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="min-h-0 w-full flex-1 object-contain"
                aria-label="Live camera preview"
              />
              <div className="flex shrink-0 items-center justify-center gap-4 bg-black px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
                <button
                  onClick={capturePhoto}
                  className="h-16 w-16 rounded-full border-4 border-white bg-white/20 transition active:scale-95"
                  aria-label="Capture photo"
                >
                  <CameraIcon className="mx-auto h-7 w-7 text-white" />
                </button>
                <button
                  onClick={stopCamera}
                  aria-label="Close camera"
                  className="absolute right-6 top-6 rounded-full bg-white/15 p-3 text-white"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>,
            document.body,
          )}

          {cameraOn && !isMobileView && (
            <div className="mt-3 hidden overflow-hidden rounded-2xl border border-gray-300 bg-black dark:border-gray-600 md:block">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="max-h-64 w-full object-contain"
                aria-label="Live camera preview"
              />
              <div className="flex gap-2 bg-white p-2 dark:bg-gray-800">
                <button
                  onClick={capturePhoto}
                  className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:from-blue-500 hover:to-indigo-500"
                >
                  Capture
                </button>
                <button
                  onClick={stopCamera}
                  aria-label="Close camera"
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

            {error && (
              <div
                className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-[11px] text-red-700 dark:bg-red-500/10 dark:text-red-300"
                role="alert"
              >
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />{" "}
                {error}
              </div>
            )}

            <div className="mt-4 rounded-xl bg-blue-50 p-3 text-[11px] leading-relaxed text-blue-800 dark:bg-blue-500/10 dark:text-blue-200">
              <strong>Tip:</strong> For best extraction, photograph the full
              sheet on a flat surface with good lighting. AI extraction accuracy
              improves with clear printed tables.
            </div>
          </div>
        )}

        {/* ---------- scanning stage ---------- */}
        {stage === "scanning" && (
          <div className="py-6">
            {previewUrl && (
              <div className="mb-4 overflow-hidden rounded-xl border border-gray-200 shadow-sm dark:border-gray-700">
                <img
                  src={previewUrl}
                  alt="Uploaded result sheet preview"
                  className="max-h-40 w-full object-cover"
                />
              </div>
            )}
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
              <span className="flex items-center gap-1.5">
                <ArrowPathIcon className="h-4 w-4 animate-spin text-blue-600" />{" "}
                {PROGRESS_STEPS[stepIdx]}
              </span>
              <span className="text-blue-600">{Math.round(progress)}%</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <ul className="mt-4 space-y-1.5">
              {PROGRESS_STEPS.map((s, i) => (
                <li
                  key={s}
                  className={`flex items-center gap-2 text-[11px] ${
                    i <= stepIdx
                      ? "text-gray-800 dark:text-gray-200"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {i < stepIdx ? (
                    <CheckCircleIcon className="h-3.5 w-3.5 text-green-500" />
                  ) : i === stepIdx ? (
                    <ArrowPathIcon className="h-3.5 w-3.5 animate-spin text-blue-500" />
                  ) : (
                    <span className="ml-3.5 h-3.5 w-3.5 rounded-full border border-gray-300 dark:border-gray-600" />
                  )}
                  {s}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-center text-[10px] text-gray-400 dark:text-gray-500">
              AI is reading the sheet — this usually takes a few seconds.
            </p>
          </div>
        )}

        {/* ---------- review stage ---------- */}
        {stage === "review" && (
          <div>
            {previewUrl && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800/60">
                {previewUrl && <EyeIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />}
                <span className="truncate text-[11px] text-gray-600 dark:text-gray-300">
                  {file?.name}
                </span>
              </div>
            )}
            <div className="mb-3 flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-gray-100">
                <PencilSquareIcon className="h-4 w-4 text-blue-600" /> Extracted
                Marks ({rows.length} students)
              </h4>
              <button
                onClick={restart}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
              >
                Scan another
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full min-w-[380px] text-left text-[11px]">
                <thead className="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  <tr>
                    <th className="px-2 py-2">Student</th>
                    <th className="px-2 py-2">1CA</th>
                    <th className="px-2 py-2">2CA</th>
                    <th className="px-2 py-2">3CA</th>
                    <th className="px-2 py-2">Exam</th>
                    <th className="px-2 py-2">Total</th>
                    <th className="px-2 py-2">AI</th>
                    <th className="px-2 py-2">
                      <span className="sr-only">Remove</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/70">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-blue-50/40 dark:hover:bg-blue-500/10">
                      <td className="px-2 py-1.5">
                        <input
                          value={r.name}
                          onChange={(e) =>
                            setRows((rs) =>
                              rs.map((x) =>
                                x.id === r.id
                                  ? { ...x, name: e.target.value }
                                  : x,
                              ),
                            )
                          }
                          className={`w-24 rounded-md border bg-transparent px-1 py-0.5 text-gray-800 focus:border-blue-500 focus:outline-none dark:text-gray-100 ${
                            inRoster(r.name)
                              ? "border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                              : "border-red-300 dark:border-red-500/60"
                          }`}
                          aria-label={`Edit name for ${r.name}`}
                        />
                        <span className="ml-1 text-[9px] text-gray-400 dark:text-gray-500">
                          {r.admissionNumber}
                        </span>
                      </td>
                      {(["ca1", "ca2", "ca3", "exam"] as const).map((f) => (
                        <td key={f} className="px-2 py-1.5">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={r[f] ?? ""}
                            onChange={(e) => updateRow(r.id, f, e.target.value)}
                            className="w-12 rounded-md border border-gray-200 bg-transparent px-1 py-0.5 text-center text-gray-800 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:text-gray-100"
                            aria-label={`${f} for ${r.name}`}
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1.5 font-bold text-blue-700 dark:text-blue-300">
                        {total(r)}
                      </td>
                      <td className="px-2 py-1.5">
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${CONFIDENCE_STYLES[r.confidence]}`}
                        >
                          {r.confidence}
                        </span>
                      </td>
                      <td className="px-2 py-1.5">
                        <button
                          onClick={() => removeRow(r.id)}
                          aria-label={`Remove ${r.name}`}
                          className="text-gray-400 transition hover:text-red-500"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-3 py-6 text-center text-gray-400"
                      >
                        No rows extracted. Scan another sheet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <button
              onClick={onApply ? applyToHost : () => setStage("saved")}
              disabled={rows.length === 0}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:from-blue-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircleIcon className="h-4 w-4" />{" "}
              {onApply
                ? `Apply ${rows.length} to score table`
                : "Done — review extraction"}
            </button>
            <p className="mt-2 text-center text-[10px] text-gray-400">
              {onApply
                ? "Names must match a student in the selected class (red names need fixing). Blank cells stay untouched."
                : "These marks were read from your sheet. Open the Results module and use the AI Scanner button to apply them to a class score table."}
            </p>
          </div>
        )}

        {/* ---------- saved stage ---------- */}
        {stage === "saved" && (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/20">
              <CheckCircleIcon className="h-9 w-9 text-green-600 dark:text-green-400" />
            </div>
            <h4 className="mt-4 text-sm font-bold text-gray-900 dark:text-gray-100">
              Extraction Complete!
            </h4>
            <p className="mt-1 max-w-[240px] text-[11px] text-gray-500 dark:text-gray-400">
              {rows.length} students were extracted. To push them into a class
              score table, open the <strong>Results</strong> module, pick the
              class and subject, and tap the AI Scanner button there.
            </p>
            <div className="mt-4 flex w-full items-center justify-center rounded-xl bg-blue-50 p-3 text-[11px] text-blue-800 dark:bg-blue-500/10 dark:text-blue-200">
              <DocumentTextIcon className="mr-2 h-4 w-4" /> Apply in{" "}
              <strong className="mx-1">Results</strong> module
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={restart}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Scan Another
              </button>
              <button
                onClick={back}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
              >
                Back to Menu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
