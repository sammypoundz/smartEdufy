// Master Sheet — a fullscreen offcanvas broadsheet that compiles results for
// ALL subjects and ALL students of a class/arm in one view. For every subject
// the full record (1CA, 2CA, 3CA, Exam, Total) is shown, plus each student's
// overall total, average, grade and position. Downloadable as Excel.
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  XMarkIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import * as XLSX from "xlsx";
import { api } from "../utils/api";
import toast from "react-hot-toast";

interface Subject {
  id: string;
  name: string;
}
interface Student {
  id: string;
  name: string;
  admissionNumber?: string;
}
interface ApiResult {
  studentId: string;
  ca1?: number | null;
  ca2?: number | null;
  ca3?: number | null;
  ca?: number | null;
  exam?: number | null;
  total: number;
  grade?: string;
}

export interface MasterSheetCell {
  ca1: number | null;
  ca2: number | null;
  ca3: number | null;
  exam: number | null;
  total: number;
  grade: string;
}

export interface MasterSheetRow {
  studentId: string;
  studentName: string;
  admissionNumber?: string;
  // key = subjectId
  cells: Record<string, MasterSheetCell>;
  totalScore: number;
  average: number;
  overallGrade: string;
  position: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  dark: boolean;
  token: string | null;
  classes: { id: string; name: string }[];
  initialClassId?: string;
  initialArmId?: string;
  academicYears: { id: string; name: string; isActive?: boolean }[];
  initialYearId?: string;
  initialTerm?: string;
  computeGrade: (score: number) => string;
}

const TERMS = ["First Term", "Second Term", "Third Term"];

export default function MasterSheetOffcanvas({
  open,
  onClose,
  dark,
  token,
  classes,
  initialClassId,
  initialArmId,
  academicYears,
  initialYearId,
  initialTerm,
  computeGrade,
}: Props) {
  const [selectedClassId, setSelectedClassId] = useState(initialClassId || "");
  const [selectedArmId, setSelectedArmId] = useState(initialArmId || "");
  const [arms, setArms] = useState<{ id: string; letter: string }[]>([]);
  const [selectedYearId, setSelectedYearId] = useState(initialYearId || "");
  const [selectedTerm, setSelectedTerm] = useState(initialTerm || TERMS[0]);

  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rows, setRows] = useState<MasterSheetRow[]>([]);
  const [exporting, setExporting] = useState(false);

  // Sync the pre-selected values each time the offcanvas is opened
  useEffect(() => {
    if (open) {
      setSelectedClassId(initialClassId || classes[0]?.id || "");
      setSelectedYearId(initialYearId || "");
      setSelectedTerm(initialTerm || TERMS[0]);
      setRows([]);
      setSubjects([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Load arms whenever a class is chosen
  useEffect(() => {
    if (!open || !token || !selectedClassId) return;
    let cancelled = false;
    api
      .get(`/classes/${selectedClassId}/arms`, token)
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error("failed")),
      )
      .then((data: { id: string; letter: string }[]) => {
        if (cancelled) return;
        setArms(data);
        // Prefer the arm the user had open on the main page, else first arm
        const pick = data.find((a) => a.id === initialArmId) || data[0];
        setSelectedArmId(pick ? pick.id : "");
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load arms");
      });
    return () => {
      cancelled = true;
    };
  }, [open, token, selectedClassId]);

  // Default academic year
  useEffect(() => {
    if (!open || !academicYears.length) return;
    if (
      !selectedYearId ||
      !academicYears.some((y) => y.id === selectedYearId)
    ) {
      const active = academicYears.find((y) => y.isActive);
      setSelectedYearId(active?.id || academicYears[0].id);
    }
  }, [open, academicYears, selectedYearId]);

  const compile = useCallback(async () => {
    if (!token || !selectedArmId || !selectedTerm || !selectedYearId) {
      toast.error("Select a class, arm, term and academic year");
      return;
    }
    setLoading(true);
    setRows([]);
    setSubjects([]);
    try {
      const subjectsRes = await api.get(
        `/arms/${selectedArmId}/subjects/list`,
        token,
      );
      if (!subjectsRes.ok) throw new Error(await subjectsRes.text());
      const armSubjects: Subject[] = await subjectsRes.json();
      if (armSubjects.length === 0) {
        toast.error("No subjects found for this arm");
        return;
      }

      const studentsRes = await api.get(
        `/arms/${selectedArmId}/students`,
        token,
      );
      if (!studentsRes.ok) throw new Error(await studentsRes.text());
      const armStudents: Student[] = await studentsRes.json();
      if (armStudents.length === 0) {
        toast.error("No students in this arm");
        return;
      }

      // Fetch every subject's full score records (1CA..Exam) in parallel
      const subjectData = await Promise.all(
        armSubjects.map(async (sub) => {
          try {
            const res = await api.get(
              `/results?armId=${selectedArmId}&subjectId=${
                sub.id
              }&term=${encodeURIComponent(
                selectedTerm,
              )}&academicYearId=${selectedYearId}`,
              token,
            );
            if (!res.ok)
              return { subject: sub, map: new Map<string, ApiResult>() };
            const list = (await res.json()) as ApiResult[];
            return {
              subject: sub,
              map: new Map(list.map((r) => [r.studentId, r])),
            };
          } catch {
            return { subject: sub, map: new Map<string, ApiResult>() };
          }
        }),
      );

      const built: MasterSheetRow[] = armStudents.map((student) => {
        const cells: Record<string, MasterSheetCell> = {};
        let totalScore = 0;
        let subjectsWithScores = 0;
        for (const { subject, map } of subjectData) {
          const r = map.get(student.id);
          if (r) {
            subjectsWithScores++;
            totalScore += r.total ?? 0;
            cells[subject.id] = {
              ca1: r.ca1 ?? null,
              ca2: r.ca2 ?? null,
              ca3: r.ca3 ?? null,
              exam: r.exam ?? null,
              total: r.total ?? 0,
              grade: r.grade || computeGrade(r.total ?? 0),
            };
          } else {
            cells[subject.id] = {
              ca1: null,
              ca2: null,
              ca3: null,
              exam: null,
              total: 0,
              grade: "—",
            };
          }
        }
        const average =
          subjectsWithScores > 0 ? totalScore / subjectsWithScores : 0;
        return {
          studentId: student.id,
          studentName: student.name,
          admissionNumber: student.admissionNumber,
          cells,
          totalScore,
          average,
          overallGrade: computeGrade(average),
          position: 0,
        };
      });

      built.sort((a, b) => b.totalScore - a.totalScore);
      built.forEach((s, i) => {
        s.position = i + 1;
      });
      setSubjects(armSubjects);
      setRows(built);
      toast.success("Master sheet compiled successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to compile master sheet");
    } finally {
      setLoading(false);
    }
  }, [token, selectedArmId, selectedTerm, selectedYearId, computeGrade]);

  // Auto-compile when the offcanvas opens with a ready selection
  useEffect(() => {
    if (open && selectedArmId && selectedYearId && selectedTerm) compile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedArmId, selectedYearId, selectedTerm]);

  // Lock page scroll while the fullscreen offcanvas is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const hasData = rows.length > 0 && subjects.length > 0;

  // ---------- Excel export: two-row grouped header ----------
  const exportExcel = async () => {
    if (!hasData) {
      toast.error("Nothing to export — compile the master sheet first");
      return;
    }
    setExporting(true);
    try {
      // Row 1: student info + one merged cell per subject + summary; Row 2: sub-headers
      const topRow: (string | null)[] = ["Pos", "Adm. No", "Student Name"];
      const subRow: (string | null)[] = ["", "", ""];
      const mergeFrom = 3;
      const merges: XLSX.Range[] = [];
      subjects.forEach((sub, i) => {
        merges.push({
          s: { r: 0, c: mergeFrom + i * 5 },
          e: { r: 0, c: mergeFrom + i * 5 + 4 },
        });
        topRow.push(sub.name, null, null, null, null);
        subRow.push("1CA", "2CA", "3CA", "Exam", "Total");
      });
      topRow.push("Total", "Average", "Grade", "Position");
      subRow.push("", "", "", "");

      const dataRows = rows.map((r) => {
        const vals: (number | string)[] = [
          r.position,
          r.admissionNumber || "",
          r.studentName,
        ];
        for (const sub of subjects) {
          const c = r.cells[sub.id];
          vals.push(
            c.ca1 ?? "",
            c.ca2 ?? "",
            c.ca3 ?? "",
            c.exam ?? "",
            c.total || "",
          );
        }
        vals.push(
          r.totalScore,
          Number(r.average.toFixed(2)),
          r.overallGrade,
          r.position,
        );
        return vals;
      });

      const ws = XLSX.utils.aoa_to_sheet([topRow, subRow, ...dataRows]);
      (ws as any)["!merges"] = merges;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Master_Sheet");
      const cls =
        classes.find((c) => c.id === selectedClassId)?.name || "class";
      const arm = arms.find((a) => a.id === selectedArmId);
      const yearName =
        academicYears.find((y) => y.id === selectedYearId)?.name || "";
      XLSX.writeFile(
        wb,
        `master_sheet_${cls}${
          arm ? "_" + arm.letter : ""
        }_${yearName}_${selectedTerm}.xlsx`.replace(/\s+/g, "_"),
      );
      toast.success("Master sheet downloaded");
    } catch {
      toast.error("Failed to export master sheet");
    } finally {
      setExporting(false);
    }
  };

  if (!open) return null;

  const labelCls = `block text-xs font-medium mb-1 ${
    dark ? "text-gray-300" : "text-gray-700"
  }`;
  const selectCls = `w-full rounded-lg border-0 px-3 py-2 text-sm shadow focus:ring-2 focus:ring-blue-500 ${
    dark
      ? "bg-gray-800 text-white border border-white/10"
      : "bg-white text-gray-900 border border-gray-200"
  }`;
  const thCls = `px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide ${
    dark ? "text-gray-400" : "text-gray-600"
  }`;
  const tdCls = `px-2 py-2 text-center text-xs ${
    dark ? "text-gray-300" : "text-gray-700"
  }`;

  // Render through a portal into <body> so the fullscreen panel is never
  // clipped or re-stacked by ancestor containers (transforms/z-index) in the
  // admin layout — otherwise 'fixed inset-0' stops being viewport-relative.
  return createPortal(
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Fullscreen panel */}
      <div
        className={`absolute inset-0 flex flex-col ${
          dark
            ? "bg-[#0B1120]"
            : "bg-gradient-to-br from-blue-50 via-white to-blue-50"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b ${
            dark ? "border-white/10 bg-white/5" : "border-gray-200 bg-white/70"
          } sticky top-0 z-10`}
        >
          <div>
            <h2
              className={`text-lg sm:text-xl font-bold ${
                dark
                  ? "bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent"
                  : "bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent"
              }`}
            >
              Master Sheet
            </h2>
            <p
              className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}
            >
              All subjects & students for the selected class — full CA and exam
              records
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportExcel}
              disabled={!hasData || exporting}
              className="inline-flex items-center px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs sm:text-sm shadow-lg disabled:opacity-50"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-1.5" />
              {exporting ? "Exporting…" : "Download"}
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className={`p-2 rounded-lg ${
                dark
                  ? "bg-white/10 text-gray-300 hover:bg-white/20"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div
          className={`px-4 sm:px-6 py-3 grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-4 border-b ${
            dark ? "border-white/10" : "border-gray-200"
          }`}
        >
          <div>
            <label className={labelCls}>Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setRows([]);
                setSubjects([]);
              }}
              className={selectCls}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Arm</label>
            <select
              value={selectedArmId}
              onChange={(e) => setSelectedArmId(e.target.value)}
              disabled={!selectedClassId}
              className={`${selectCls} disabled:opacity-50`}
            >
              <option value="">Select arm</option>
              {arms.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.letter}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Academic Year</label>
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className={selectCls}
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className={selectCls}
            >
              {TERMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={compile}
              disabled={loading || !selectedArmId}
              className="w-full inline-flex items-center justify-center px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <ArrowPathIcon className="h-4 w-4 mr-1.5 animate-spin" />
              ) : null}
              {loading ? "Compiling…" : "Recompile"}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-4 sm:px-6 py-4">
          {loading ? (
            <div
              className={`text-center py-16 ${
                dark ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Compiling master sheet, please wait…
            </div>
          ) : !hasData ? (
            <div
              className={`text-center py-16 px-4 ${
                dark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              No master sheet data yet. Choose a class, arm, term and academic
              year, then click Recompile.
            </div>
          ) : (
            <div
              className={`rounded-2xl shadow-xl overflow-hidden ${
                dark
                  ? "bg-white/5 border border-white/10"
                  : "bg-white/60 border border-white/40"
              }`}
            >
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead
                    className={`sticky top-0 z-[5] ${
                      dark ? "bg-gray-900" : "bg-gray-100"
                    }`}
                  >
                    <tr
                      className={`border-b ${
                        dark ? "border-white/10" : "border-gray-300"
                      }`}
                    >
                      <th
                        rowSpan={2}
                        className={`${thCls} text-left px-3 sticky left-0 z-[6] ${
                          dark ? "bg-gray-900" : "bg-gray-100"
                        }`}
                      >
                        Pos
                      </th>
                      <th rowSpan={2} className={`${thCls} text-left px-3`}>
                        Adm. No
                      </th>
                      <th
                        rowSpan={2}
                        className={`${thCls} text-left px-3 sticky left-[44px] sm:left-[52px] ${
                          dark ? "bg-gray-900" : "bg-gray-100"
                        }`}
                      >
                        Student Name
                      </th>
                      {subjects.map((sub) => (
                        <th
                          key={sub.id}
                          colSpan={5}
                          className={`px-2 py-2 text-center text-xs font-bold ${
                            dark
                              ? "text-blue-300 bg-white/5"
                              : "text-blue-700 bg-blue-50"
                          }`}
                        >
                          {sub.name}
                        </th>
                      ))}
                      <th rowSpan={2} className={thCls}>
                        Total
                      </th>
                      <th rowSpan={2} className={thCls}>
                        Avg
                      </th>
                      <th rowSpan={2} className={thCls}>
                        Grade
                      </th>
                    </tr>
                    <tr className={dark ? "bg-gray-900" : "bg-gray-50"}>
                      {subjects.map((sub) =>
                        ["1CA", "2CA", "3CA", "Exam", "Total"].map((h) => (
                          <th key={`${sub.id}-${h}`} className={thCls}>
                            {h}
                          </th>
                        )),
                      )}
                    </tr>
                  </thead>
                  <tbody
                    className={`divide-y ${
                      dark ? "divide-white/10" : "divide-gray-200"
                    }`}
                  >
                    {rows.map((r) => (
                      <tr
                        key={r.studentId}
                        className={
                          dark ? "hover:bg-white/5" : "hover:bg-blue-50/40"
                        }
                      >
                        <td
                          className={`${tdCls} text-left font-bold sticky left-0 ${
                            dark ? "bg-[#0B1120]" : "bg-white"
                          }`}
                        >
                          {r.position}
                        </td>
                        <td className={`${tdCls} text-left whitespace-nowrap`}>
                          {r.admissionNumber || "—"}
                        </td>
                        <td
                          className={`${tdCls} text-left font-medium whitespace-nowrap sticky left-[44px] sm:left-[52px] ${
                            dark
                              ? "text-white bg-[#0B1120]"
                              : "text-gray-900 bg-white"
                          }`}
                        >
                          {r.studentName}
                        </td>
                        {subjects.map((sub) => {
                          const c = r.cells[sub.id];
                          const empty = c.grade === "—";
                          const fmt = (v: number | null) =>
                            v === null || v === undefined ? "" : v;
                          return (
                            <FragmentCells
                              key={sub.id}
                              empty={empty}
                              tdCls={tdCls}
                              dark={dark}
                              vals={[
                                fmt(c.ca1),
                                fmt(c.ca2),
                                fmt(c.ca3),
                                fmt(c.exam),
                                empty ? "" : c.total,
                              ]}
                            />
                          );
                        })}
                        <td
                          className={`${tdCls} font-bold ${
                            dark ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {r.totalScore}
                        </td>
                        <td className={tdCls}>{r.average.toFixed(2)}</td>
                        <td
                          className={`${tdCls} font-bold ${
                            dark ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {r.overallGrade}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div
                className={`px-4 py-3 text-[11px] ${
                  dark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {rows.length} student(s) × {subjects.length} subject(s) ·
                Students with no record for a subject show blank cells.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Renders the 5 score cells (1CA/2CA/3CA/Exam/Total) for one subject column group
function FragmentCells({
  vals,
  empty,
  tdCls,
  dark,
}: {
  vals: (number | string)[];
  empty: boolean;
  tdCls: string;
  dark: boolean;
}) {
  return (
    <>
      {vals.map((v, i) => (
        <td
          key={i}
          className={`${tdCls} ${
            i === 4 && !empty
              ? `font-semibold ${dark ? "text-white" : "text-gray-900"}`
              : ""
          }`}
        >
          {v}
        </td>
      ))}
    </>
  );
}
