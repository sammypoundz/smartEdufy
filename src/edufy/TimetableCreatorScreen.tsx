import { useEffect, useState } from "react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { useEdufy } from "./EdufyContext";

// ---------------- mock option data (frontend demo only) ----------------
const CLASSES = ["JSS 1A", "JSS 2A", "JSS 3B", "SS 1A", "SS 2 Science"];
const SUBJECTS = [
  "Mathematics",
  "English",
  "Basic Science",
  "Social Studies",
  "Computer Studies",
  "Agricultural Science",
  "Physical Education",
];
const PERIODS_PER_DAY = [4, 5, 6, 7, 8];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

interface TeacherAvail {
  teacher: string;
  days: string[];
}

const MOCK_TEACHER_AVAILABILITY: TeacherAvail[] = [
  {
    teacher: "Mr. Okeke — Mathematics",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  },
  { teacher: "Mrs. Bala — English", days: ["Mon", "Tue", "Wed", "Fri"] },
  { teacher: "Ms. Danjuma — Basic Science", days: ["Tue", "Wed", "Thu"] },
  { teacher: "Mr. Eze — Social Studies", days: ["Mon", "Wed", "Thu", "Fri"] },
  {
    teacher: "Mrs. Uche — Computer Studies",
    days: ["Mon", "Tue", "Thu", "Fri"],
  },
];

// Deterministic mock timetable generator (frontend demo only).
// Respects the selected subjects and teacher availability days.
function generateMockTimetable(periods: number, chosen: string[], avail: Record<string, string[]>): string[][] {
  // A subject is only eligible on a day if at least one of its teachers is available.
  const subjectTeacherDayOk = (subject: string, day: string) =>
    Object.entries(avail).some(([teacher, days]) => teacher.includes(subject) && days.includes(day));

  return DAYS.map((day, di) =>
    Array.from({ length: periods }, (_, pi) => {
      if (pi === Math.floor(periods / 2)) return "Break";
      const eligible = chosen.filter((s) => subjectTeacherDayOk(s, day));
      const pool = eligible.length ? eligible : chosen;
      return pool[(di * periods + pi * 3) % pool.length];
    }),
  );
}

type Stage = "setup" | "generating" | "preview";

const GEN_STEPS = [
  "Loading class data…",
  "Checking teacher availability…",
  "Balancing subject load…",
  "Resolving clashes…",
  "Finalising layout…",
];

export default function TimetableCreatorScreen() {
  const { back } = useEdufy();
  const [stage, setStage] = useState<Stage>("setup");
  const [progress, setProgress] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);

  // preferences
  const [cls, setCls] = useState(CLASSES[1]);
  const [periods, setPeriods] = useState(6);
  const [subjects, setSubjects] = useState<string[]>(SUBJECTS.slice(0, 5));
  const [startTime, setStartTime] = useState("08:00");
  const [availability, setAvailability] = useState<Record<string, string[]>>(
    Object.fromEntries(
      MOCK_TEACHER_AVAILABILITY.map((t) => [t.teacher, [...t.days]]),
    ),
  );

  const toggle = <T,>(list: T[], item: T, set: (v: T[]) => void) =>
    set(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  // simulated generation — mock only
  useEffect(() => {
    if (stage !== "generating") return;
    setProgress(0);
    setStepIdx(0);
    const t = setInterval(() => {
      setProgress((p) => {
        const next = p + 5 + Math.random() * 7;
        if (next >= 100) {
          clearInterval(t);
          setTimeout(() => setStage("preview"), 400);
          return 100;
        }
        setStepIdx(Math.min(Math.floor(next / 20), GEN_STEPS.length - 1));
        return next;
      });
    }, 260);
    return () => clearInterval(t);
  }, [stage]);

  const timetable = generateMockTimetable(periods, subjects, availability);
  const periodLabel = (i: number) => {
    const [h, m] = startTime.split(":").map(Number);
    const start = h * 60 + m + i * 45;
    const fmt = (mins: number) =>
      `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
    return `${fmt(start)} – ${fmt(start + 45)}`;
  };

  return (
    <div className="flex h-full flex-col">
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
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            AI Timetable Creator
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Generate intelligent class timetables
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* ---------- setup stage ---------- */}
        {stage === "setup" && (
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Class
              </label>
              <select
                value={cls}
                onChange={(e) => setCls(e.target.value)}
                aria-label="Select class"
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:[color-scheme:dark]"
              >
                {CLASSES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Periods / day
                </label>
                <select
                  value={periods}
                  onChange={(e) => setPeriods(Number(e.target.value))}
                  aria-label="Periods per day"
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:[color-scheme:dark]"
                >
                  {PERIODS_PER_DAY.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Start time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  aria-label="Start time"
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:[color-scheme:dark]"
                />
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Subjects ({subjects.length})
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {SUBJECTS.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggle(subjects, s, setSubjects)}
                    className={`rounded-full px-3 py-1.5 text-[10px] font-semibold transition ${
                      subjects.includes(s)
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700/70 dark:text-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Teacher availability
              </p>
              <div className="mt-1.5 space-y-1.5">
                {Object.entries(availability).map(([teacher, days]) => (
                  <div
                    key={teacher}
                    className="rounded-xl border border-gray-200 p-2 dark:border-gray-700"
                  >
                    <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                      {teacher}
                    </p>
                    <div className="mt-1 flex gap-1">
                      {DAYS.map((d) => (
                        <button
                          key={d}
                          onClick={() =>
                            toggle(days, d, (v) =>
                              setAvailability({
                                ...availability,
                                [teacher]: v,
                              }),
                            )
                          }
                          className={`flex-1 rounded-md py-0.5 text-[9px] font-bold transition ${
                            days.includes(d)
                              ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                              : "bg-gray-100 text-gray-400 dark:bg-gray-700/70 dark:text-gray-500"
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStage("generating")}
              disabled={subjects.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:from-blue-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CalendarDaysIcon className="h-4 w-4" /> Generate Timetable
            </button>
          </div>
        )}

        {/* ---------- generating stage ---------- */}
        {stage === "generating" && (
          <div className="py-6">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
              <span className="flex items-center gap-1.5">
                <ArrowPathIcon className="h-4 w-4 animate-spin text-blue-600" />{" "}
                {GEN_STEPS[stepIdx]}
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
              {GEN_STEPS.map((s, i) => (
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
              Mock generation — sample timetable will be previewed.
            </p>
          </div>
        )}

        {/* ---------- preview stage ---------- */}
        {stage === "preview" && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-gray-100">
                <CheckCircleIcon className="h-4 w-4 text-green-500" /> {cls} —
                Weekly Timetable
              </h4>
              <button
                onClick={() => setStage("setup")}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
              >
                Adjust prefs
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full min-w-[420px] text-center text-[10px]">
                <thead className="bg-blue-600 text-white">
                  <tr>
                    <th className="px-1 py-1.5 font-semibold">Time</th>
                    {DAYS.map((d) => (
                      <th key={d} className="px-1 py-1.5 font-semibold">
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/70">
                  {Array.from({ length: periods }, (_, pi) => (
                    <tr key={pi} className="hover:bg-blue-50/40 dark:hover:bg-blue-500/10">
                      <td className="whitespace-nowrap bg-gray-50 px-1 py-1 text-[9px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        {periodLabel(pi)}
                      </td>
                      {DAYS.map((_, di) => {
                        const slot = timetable[di][pi];
                        const isBreak = slot === "Break";
                        return (
                          <td
                            key={di}
                            className={`px-1 py-1 ${isBreak ? "bg-amber-50 text-[9px] font-bold text-amber-600 dark:bg-amber-500/15 dark:text-amber-300" : "text-gray-700 dark:text-gray-200"}`}
                          >
                            {slot}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[9px] text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded bg-green-400" /> No teacher
                clashes
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded bg-amber-400" /> Break included
              </span>
              <span>45-min periods</span>
            </div>
            <button
              onClick={() => {
                /* mock save */
              }}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:from-blue-500 hover:to-indigo-500"
            >
              Apply to {cls}
            </button>
            <p className="mt-2 text-center text-[10px] text-gray-400 dark:text-gray-500">
              Mock apply — sample data only in this demo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
