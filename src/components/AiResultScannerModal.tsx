// AI Result Scanner modal — take a photo / upload an image of a (possibly
// handwritten) result sheet, send it to the backend AI endpoint, review the
// extracted marks, then push them into the Result Compiler's score table.
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { api } from "../utils/api";
import { useAuth } from "../contexts/AuthContext";
import {
  XMarkIcon,
  CameraIcon,
  ArrowUpTrayIcon,
  SparklesIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface ExtractedRow {
  name: string;
  admissionNumber?: string | null;
  ca1: number | null;
  ca2: number | null;
  ca3: number | null;
  exam: number | null;
  confidence: "high" | "medium" | "low";
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called with the reviewed rows once the user confirms — parent matches names to its student list. */
  onApply: (rows: ExtractedRow[]) => void;
  /** Students already in the selected arm (for matching and warnings). */
  rosterNames: string[];
}

type Stage = "pick" | "scanning" | "review";

const numOrNull = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
};

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  medium:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  low: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
};

export default function AiResultScannerModal({
  open,
  onClose,
  onApply,
  rosterNames,
}: Props) {
  const { token } = useAuth();
  const [stage, setStage] = useState<Stage>("pick");
  const [rows, setRows] = useState<ExtractedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [startingCamera, setStartingCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  // Reset everything whenever the modal closes
  useEffect(() => {
    if (!open) {
      stopCamera();
      setStage("pick");
      setRows([]);
      setError(null);
      setPreviewUrl(null);
    }
  }, [open, stopCamera]);

  useEffect(() => stopCamera, [stopCamera]);

  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOn]);

  if (!open) return null;

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
        "Camera unavailable. Allow camera access or upload a photo instead.",
      );
    } finally {
      setStartingCamera(false);
    }
  };

  const scan = async (file: File) => {
    setError(null);
    setStage("scanning");
    setPreviewUrl(
      file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    );
    try {
      const fd = new FormData();
      fd.append("image", file);
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
        students.map((s) => ({
          name: String(s.name ?? "").trim(),
          admissionNumber: s.admissionNumber ?? null,
          ca1: numOrNull(s.ca1),
          ca2: numOrNull(s.ca2),
          ca3: numOrNull(s.ca3),
          exam: numOrNull(s.exam),
          confidence: ["high", "medium", "low"].includes(s.confidence)
            ? s.confidence
            : "medium",
        })),
      );
      setStage("review");
    } catch (err: any) {
      setError(err.message || "AI scan failed");
      setStage("pick");
    }
  };

  const pickFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = () => {
      const f = input.files?.[0];
      if (f) scan(f);
    };
    input.click();
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
        stopCamera();
        scan(
          new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" }),
        );
      },
      "image/jpeg",
      0.92,
    );
  };

  const updateRow = (
    idx: number,
    field: "name" | "ca1" | "ca2" | "ca3" | "exam",
    value: string,
  ) => {
    setRows((rs) =>
      rs.map((r, i) => {
        if (i !== idx) return r;
        if (field === "name") return { ...r, name: value };
        return {
          ...r,
          [field]:
            value === ""
              ? null
              : Math.max(0, Math.min(100, Number(value) || 0)),
        };
      }),
    );
  };

  const apply = () => {
    const valid = rows.filter((r) => r.name.trim());
    if (valid.length === 0) {
      toast.error("No rows with a student name to apply");
      return;
    }
    const unmatched = valid.filter(
      (r) =>
        !rosterNames.some(
          (n) => n.toLowerCase().trim() === r.name.toLowerCase().trim(),
        ),
    );
    if (unmatched.length > 0) {
      toast.error(
        `${unmatched.length} name(s) don't match the class roster (e.g. "${unmatched[0].name}"). Fix or remove them first.`,
      );
      return;
    }
    onApply(valid);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60"
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-indigo-500" />
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                AI Result Scanner
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Photo of a result sheet → marks extracted (works with
                handwriting)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close scanner"
            className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* ---------- pick stage ---------- */}
          {stage === "pick" && (
            <div>
              <button
                onClick={startCamera}
                disabled={startingCamera}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-bold text-white shadow-md transition hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60"
              >
                <CameraIcon className="h-5 w-5" />
                {startingCamera
                  ? "Starting camera…"
                  : "Take a photo of the sheet"}
              </button>
              <button
                onClick={pickFile}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <ArrowUpTrayIcon className="h-5 w-5" /> Upload a photo instead
              </button>

              {cameraOn && (
                <div className="mt-4 overflow-hidden rounded-2xl border border-gray-300 bg-black dark:border-gray-600">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="max-h-72 w-full object-contain"
                  />
                  <div className="flex gap-2 bg-white p-2 dark:bg-gray-800">
                    <button
                      onClick={capturePhoto}
                      className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2 text-xs font-bold text-white"
                    >
                      Capture & Scan
                    </button>
                    <button
                      onClick={stopCamera}
                      aria-label="Close camera"
                      className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 dark:border-gray-600 dark:text-gray-300"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div
                  className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300"
                  role="alert"
                >
                  <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />{" "}
                  {error}
                </div>
              )}

              <div className="mt-4 rounded-xl bg-indigo-50 p-3 text-[11px] leading-relaxed text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-200">
                <strong>Tip:</strong> photograph the full table flat and
                well-lit. The AI reads both printed and handwritten marks;
                you'll review everything before it's applied.
              </div>
            </div>
          )}

          {/* ---------- scanning stage ---------- */}
          {stage === "scanning" && (
            <div className="flex flex-col items-center py-10">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Sheet preview"
                  className="mb-4 max-h-48 rounded-xl border border-gray-200 dark:border-gray-700"
                />
              )}
              <ArrowPathIcon className="h-8 w-8 animate-spin text-indigo-500" />
              <p className="mt-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
                AI is reading the sheet — names, handwriting and marks…
              </p>
              <p className="mt-1 text-[11px] text-gray-400">
                This usually takes a few seconds.
              </p>
            </div>
          )}

          {/* ---------- review stage ---------- */}
          {stage === "review" && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">
                  Extracted marks ({rows.length} students) — review before
                  applying
                </h4>
                <button
                  onClick={() => {
                    setStage("pick");
                    setRows([]);
                  }}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Scan another
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead className="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    <tr>
                      <th className="px-2 py-2">Student</th>
                      <th className="px-2 py-2">1CA</th>
                      <th className="px-2 py-2">2CA</th>
                      <th className="px-2 py-2">3CA</th>
                      <th className="px-2 py-2">Exam</th>
                      <th className="px-2 py-2">AI</th>
                      <th className="px-2 py-2">
                        <span className="sr-only">Remove</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/70">
                    {rows.map((r, idx) => {
                      const inRoster = rosterNames.some(
                        (n) =>
                          n.toLowerCase().trim() ===
                          r.name.toLowerCase().trim(),
                      );
                      return (
                        <tr
                          key={idx}
                          className="hover:bg-indigo-50/40 dark:hover:bg-indigo-500/10"
                        >
                          <td className="px-2 py-1.5">
                            <input
                              value={r.name}
                              onChange={(e) =>
                                updateRow(idx, "name", e.target.value)
                              }
                              aria-label={`Edit name for row ${idx + 1}`}
                              className={`w-36 rounded-md border bg-transparent px-1 py-0.5 text-gray-800 focus:outline-none dark:text-gray-100 ${
                                inRoster
                                  ? "border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                                  : "border-red-300 dark:border-red-500/60"
                              }`}
                            />
                            {r.admissionNumber && (
                              <span className="ml-1 text-[9px] text-gray-400">
                                {r.admissionNumber}
                              </span>
                            )}
                          </td>
                          {(["ca1", "ca2", "ca3", "exam"] as const).map((f) => (
                            <td key={f} className="px-2 py-1.5">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={r[f] ?? ""}
                                onChange={(e) =>
                                  updateRow(idx, f, e.target.value)
                                }
                                aria-label={`${f} for ${r.name}`}
                                className="w-12 rounded-md border border-gray-200 bg-transparent px-1 py-0.5 text-center text-gray-800 focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:text-gray-100"
                              />
                            </td>
                          ))}
                          <td className="px-2 py-1.5">
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${CONFIDENCE_STYLES[r.confidence]}`}
                            >
                              {r.confidence}
                            </span>
                          </td>
                          <td className="px-2 py-1.5">
                            <button
                              onClick={() =>
                                setRows((rs) => rs.filter((_, i) => i !== idx))
                              }
                              aria-label={`Remove ${r.name}`}
                              className="text-gray-400 transition hover:text-red-500"
                            >
                              <TrashIcon className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {rows.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-3 py-6 text-center text-gray-400"
                        >
                          No rows extracted.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-[11px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                Names must exactly match a student in the selected class/arm
                (red names need fixing). Blank cells stay untouched.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {stage === "review" && (
          <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3 dark:border-gray-700">
            <button
              onClick={() => {
                setStage("pick");
                setRows([]);
              }}
              className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Back
            </button>
            <button
              onClick={apply}
              disabled={rows.length === 0}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2 text-xs font-bold text-white shadow-md transition hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50"
            >
              <SparklesIcon className="h-4 w-4" /> Apply {rows.length} to score
              table
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
