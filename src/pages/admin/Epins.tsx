// Result Checker e-Pins — admin page
// Select class/arm + term + academic year, generate a fresh unique e-Pin
// (serial + PIN) per active student for that term, view them and export the
// scratch-card list to Excel. Generation is idempotent per student/term —
// regenerating only fills in students that don't have a pin yet.
import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useAcademicSession } from "../../contexts/AcademicSessionContext";
import { api } from "../../utils/api";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { formatArm } from "../../utils/arm";
import {
  KeyIcon,
  DocumentArrowDownIcon,
  BoltIcon,
  ArrowPathIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";

interface Class {
  id: string;
  name: string;
}
interface Arm {
  id: string;
  letter: string;
}

interface EpinRow {
  id: string;
  serial: string;
  pin: string;
  studentId: string;
  studentName: string;
  admissionNumber?: string | null;
  className?: string | null;
  armLetter?: string | null;
  term: string;
  uses: number;
  maxUses: number;
  usedAt: string | null;
  expiresAt: string | null;
}

const TERMS = ["First Term", "Second Term", "Third Term"];

export default function Epins() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const { academicYears } = useAcademicSession();
  const dark = theme === "dark";

  const [classes, setClasses] = useState<Class[]>([]);
  const [arms, setArms] = useState<Arm[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedArmId, setSelectedArmId] = useState("");
  const [selectedYearId, setSelectedYearId] = useState("");
  const [selectedTerm, setSelectedTerm] = useState(TERMS[0]);

  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pins, setPins] = useState<EpinRow[]>([]);

  const selectCls = `mt-1 w-full rounded-xl border-0 px-4 py-3 text-sm shadow-lg focus:ring-2 focus:ring-blue-500 ${
    dark
      ? "bg-gray-800 text-white border border-white/10"
      : "bg-white/40 text-gray-900 border border-white/20"
  }`;

  // Classes + default academic year
  useEffect(() => {
    if (!token) return;
    api
      .get("/classes", token)
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error("failed")),
      )
      .then((data: Class[]) => {
        setClasses(data);
        if (data.length > 0) setSelectedClassId(data[0].id);
      })
      .catch(() => toast.error("Failed to load classes"));
  }, [token]);

  useEffect(() => {
    if (academicYears.length > 0 && !selectedYearId) {
      const active = academicYears.find((y) => y.isActive);
      setSelectedYearId(active?.id || academicYears[0].id);
    }
  }, [academicYears, selectedYearId]);

  // Arms for the selected class
  useEffect(() => {
    if (!token || !selectedClassId) return;
    api
      .get(`/classes/${selectedClassId}/arms`, token)
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error("failed")),
      )
      .then((data: Arm[]) => {
        setArms(data);
        setSelectedArmId(data[0]?.id || "");
      })
      .catch(() => toast.error("Failed to load arms"));
  }, [token, selectedClassId]);

  const loadPins = useCallback(async () => {
    if (!token || !selectedArmId || !selectedYearId || !selectedTerm) return;
    setLoading(true);
    try {
      const url = `/epins?armId=${selectedArmId}&academicYearId=${selectedYearId}&term=${encodeURIComponent(
        selectedTerm,
      )}`;
      const res = await api.get(url, token);
      if (!res.ok) throw new Error(await res.text());
      setPins(await res.json());
    } catch {
      toast.error("Failed to load e-Pins");
      setPins([]);
    } finally {
      setLoading(false);
    }
  }, [token, selectedArmId, selectedYearId, selectedTerm]);

  useEffect(() => {
    loadPins();
  }, [loadPins]);

  const generate = async () => {
    if (!selectedArmId || !selectedYearId || !selectedTerm) {
      toast.error("Select an arm, term and academic year first");
      return;
    }
    setGenerating(true);
    try {
      const res = await api.post(
        "/epins/generate",
        {
          armId: selectedArmId,
          academicYearId: selectedYearId,
          term: selectedTerm,
          maxUses: 5,
        },
        token,
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data.generated > 0) {
        toast.success(
          `Generated ${data.generated} new e-Pin(s) (${data.skipped} already had one)`,
        );
      } else {
        toast(
          "Every student in this arm already has an e-Pin for this term",
        );
      }
      loadPins();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate e-Pins");
    } finally {
      setGenerating(false);
    }
  };

  const exportExcel = () => {
    if (pins.length === 0) {
      toast.error("No e-Pins to export — generate them first");
      return;
    }
    const rows = pins.map((p, i) => ({
      "S/N": i + 1,
      "Serial No": p.serial,
      PIN: p.pin,
      "Admission No": p.admissionNumber || "",
      "Student Name": p.studentName,
      Class: p.className || "",
      Arm: p.armLetter || "",
      Term: p.term,
      Uses: `${p.uses}/${p.maxUses}`,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "E-Pins");
    const cls = classes.find((c) => c.id === selectedClassId)?.name || "class";
    const arm = arms.find((a) => a.id === selectedArmId)?.letter || "";
    const yearName =
      academicYears.find((y) => y.id === selectedYearId)?.name || "";
    XLSX.writeFile(
      wb,
      `epins_${cls}_${arm}_${yearName}_${selectedTerm}.xlsx`.replace(
        /\s+/g,
        "_",
      ),
    );
    toast.success("e-Pins exported");
  };

  const yearName =
    academicYears.find((y) => y.id === selectedYearId)?.name || "";
  const clsName = classes.find((c) => c.id === selectedClassId)?.name || "";
  const armLetter = arms.find((a) => a.id === selectedArmId)?.letter || "";
  const resultUrl = `${window.location.origin}/student/result-checker`;

  return (
    <div
      className={`min-h-screen px-4 sm:px-6 lg:px-8 py-8 ${
        dark
          ? "bg-[#0B1120]"
          : "bg-gradient-to-br from-blue-50 via-white to-blue-50"
      }`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="sm:flex sm:items-center sm:justify-between mb-6 sm:mb-8">
          <div>
            <h2
              className={`text-xl sm:text-2xl font-bold ${
                dark
                  ? "bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent"
                  : "bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent"
              }`}
            >
              Result Checker e-Pins
            </h2>
            <p
              className={`text-sm mt-1 ${
                dark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Generate unique serial + PIN cards per student per term for result
              checking
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex flex-wrap gap-2">
            <button
              onClick={generate}
              disabled={generating || !selectedArmId}
              className="inline-flex items-center px-4 py-2.5 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm shadow-lg disabled:opacity-50"
            >
              {generating ? (
                <ArrowPathIcon className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <BoltIcon className="h-4 w-4 mr-1.5" />
              )}
              {generating ? "Generating…" : "Generate e-Pins"}
            </button>
            <button
              onClick={exportExcel}
              disabled={pins.length === 0}
              className="inline-flex items-center px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm shadow-lg disabled:opacity-50"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-1.5" />
              Export (Excel)
            </button>
            <button
              onClick={() => window.print()}
              disabled={pins.length === 0}
              className="inline-flex items-center px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm shadow-lg disabled:opacity-50 print:hidden"
            >
              <PrinterIcon className="h-4 w-4 mr-1.5" />
              Print Cards
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-6 mb-6">
          <div>
            <label
              className={`block text-sm font-medium ${
                dark ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Class
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
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
            <label
              className={`block text-sm font-medium ${
                dark ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Arm
            </label>
            <select
              value={selectedArmId}
              onChange={(e) => setSelectedArmId(e.target.value)}
              disabled={!selectedClassId}
              className={`${selectCls} disabled:opacity-50`}
            >
              <option value="">Select arm</option>
              {arms.map((a) => (
                <option key={a.id} value={a.id}>
                  {formatArm(a)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              className={`block text-sm font-medium ${
                dark ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Academic Year
            </label>
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
            <label
              className={`block text-sm font-medium ${
                dark ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Term
            </label>
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
        </div>

        {/* Cards preview (screen) / print sheet */}
        {pins.length > 0 && (
          <div className="mt-6 print:block">
            <h3
              className={`text-sm font-semibold uppercase tracking-wide mb-3 print:hidden ${
                dark ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Scratch cards preview
            </h3>
            <div className="epin-print-sheet print-area grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 print:grid print:grid-cols-3 print:gap-3">
              {pins.map((p, i) => (
                <div
                  key={p.id}
                  className="epin-card relative rounded-xl border-2 border-blue-700/70 bg-white text-gray-900 overflow-hidden shadow-md print:shadow-none print:break-inside-avoid"
                >
                  <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-3 py-1.5 print:bg-blue-800">
                    <div className="flex items-center justify-between text-white">
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        Result Checker e-Pin
                      </span>
                      <span className="text-[10px] font-semibold">
                        #{i + 1}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-500">Name</span>
                      <span className="font-semibold text-right">
                        {p.studentName}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-500">Adm. No</span>
                      <span className="font-mono font-semibold">
                        {p.admissionNumber || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-500">Class</span>
                      <span className="font-semibold">
                        {p.className || clsName}
                        {p.armLetter || armLetter
                          ? ` ${p.armLetter || armLetter}`
                          : ""}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-500">Term / Session</span>
                      <span className="font-semibold">
                        {p.term} · {yearName}
                      </span>
                    </div>
                    <div className="mt-2 rounded-lg bg-gray-900 px-3 py-2 text-center print:bg-white print:border print:border-gray-800">
                      <div className="text-[8px] uppercase tracking-widest text-gray-400 print:text-gray-600">
                        Serial No
                      </div>
                      <div className="font-mono text-sm font-bold tracking-[0.15em] text-white print:text-gray-900">
                        {p.serial}
                      </div>
                      <div className="text-[8px] uppercase tracking-widest text-gray-400 print:text-gray-600 mt-1">
                        PIN
                      </div>
                      <div className="font-mono text-xl sm:text-2xl font-black tracking-[0.25em] text-amber-300 print:text-blue-800 break-all">
                        {p.pin}
                      </div>
                    </div>
                    <div className="mt-1.5 text-center text-[9px] text-gray-600 print:text-gray-700">
                      Check your result at
                      <span className="font-semibold break-all">
                        {resultUrl.replace(/^https?:\/\//, "")}
                      </span>
                    </div>
                    <div className="flex justify-between text-[9px] text-gray-500 pt-0.5 print:text-gray-600">
                      <span>Scratch to reveal · {p.maxUses} uses</span>
                      <span>Keep this card safe</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div
            className={`text-center py-8 text-sm ${
              dark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Loading…
          </div>
        ) : pins.length === 0 ? (
          <div
            className={`text-center py-10 px-4 ${
              dark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            <KeyIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No e-Pins generated for this arm/term yet. Click "Generate e-Pins"
            to create one per student.
          </div>
        ) : null}
      </div>
    </div>
  );
}
