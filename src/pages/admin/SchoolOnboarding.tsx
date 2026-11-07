// School Self-Onboarding Wizard — the school's own admin sets up SmartEdufy
// for their school instead of waiting on the Super Admin. 8 guided, resumable
// stages: PROFILE → ACADEMIC → CLASSES → SUBJECTS → STAFF → STUDENTS → FEES
// → FINISH. Progress is stored per-school (SchoolOnboardingProgress) so the
// wizard can be resumed at any time from Settings or the Overview page.
//
// IMPORTANT: every stage is a STABLE top-level component (declared outside
// the parent render). Inline stage components were remounted by every
// react-query refetch, wiping typed input mid-entry — which looked like
// "nothing persists to the DB".
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  BuildingOffice2Icon,
  CalendarIcon,
  AcademicCapIcon,
  BookOpenIcon,
  UserIcon,
  UserGroupIcon,
  BanknotesIcon,
  FlagIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  SparklesIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../utils/api";
import { useTheme } from "../../contexts/ThemeContext";
import logoDarkUrl from "../../assets/smart edufy.png";
import logoLightUrl from "../../assets/smart edufy II.png";

const STAGES = [
  { key: "PROFILE", label: "School Profile", icon: BuildingOffice2Icon },
  { key: "ACADEMIC", label: "Academic Setup", icon: CalendarIcon },
  { key: "CLASSES", label: "Classes", icon: AcademicCapIcon },
  { key: "SUBJECTS", label: "Subjects", icon: BookOpenIcon },
  { key: "STAFF", label: "Staff & Teachers", icon: UserIcon },
  { key: "STUDENTS", label: "Students", icon: UserGroupIcon },
  { key: "FEES", label: "Fee Structure", icon: BanknotesIcon },
  { key: "FINISH", label: "Finish", icon: FlagIcon },
];

interface Progress {
  completedStages: string[];
  stageData: Record<string, any> | null;
  currentStage: string;
  startedAt: string;
  completedAt: string | null;
}
interface Snapshot {
  school: { name: string; logoUrl: string | null } | null;
  counts: {
    classes: number;
    subjects: number;
    teachers: number;
    students: number;
    feeStructures: number;
    terms: number;
    activeYear: { id: string; name: string } | null;
  };
  classList: { id: string; name: string }[];
  subjectList: { id: string; name: string }[];
}

const stageCls = "px-3 py-1.5 rounded-full text-[11px] font-bold";
const doneCls =
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";

// Common Nigerian class/subject presets for one-tap setup
const CLASS_PRESETS = [
  { label: "Nursery (3)", names: ["Nursery 1", "Nursery 2", "Nursery 3"] },
  {
    label: "Primary (6)",
    names: [
      "Primary 1",
      "Primary 2",
      "Primary 3",
      "Primary 4",
      "Primary 5",
      "Primary 6",
    ],
  },
  {
    label: "JSS (3)",
    names: ["JSS 1", "JSS 2", "JSS 3"],
  },
  {
    label: "SSS (3)",
    names: ["SS 1", "SS 2", "SS 3"],
  },
];

const SUBJECT_PRESETS = [
  {
    label: "Primary",
    names: [
      "English Language",
      "Mathematics",
      "Basic Science",
      "Social Studies",
      "Civic Education",
    ],
  },
  {
    label: "JSS",
    names: [
      "English Language",
      "Mathematics",
      "Basic Science",
      "Social Studies",
      "Civic Education",
      "Business Studies",
    ],
  },
  {
    label: "SS",
    names: [
      "English Language",
      "Mathematics",
      "Physics",
      "Chemistry",
      "Biology",
      "Economics",
      "Government",
      "Literature-in-English",
    ],
  },
];

// ============================ Shared stage props ============================
interface StageProps {
  dark: boolean;
  inputCls: string;
  labelCls: string;
  primaryBtn: string;
  secondaryBtn: string;
  invalidate: () => void;
  complete: any; // useMutation for /onboarding/progress/:stage/complete
}

// ============================ Stage: Profile ============================
function StageProfile({
  inputCls, labelCls, primaryBtn, complete, dark, name: initialName,
}: StageProps & { name: string }) {
  const [name, setName] = useState(initialName);
  void dark;
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>School name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Graceland International School"
          className={`mt-1.5 ${inputCls}`}
        />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Your school name appears on report cards, receipts and the parent
        portal. You can change it later from Settings.
      </p>
      <div className="flex justify-end">
        <button
          onClick={() =>
            name.trim() &&
            complete.mutate({
              stageKey: "PROFILE",
              data: { name: name.trim() },
            })
          }
          disabled={!name.trim() || complete.isPending}
          className={primaryBtn}
        >
          {complete.isPending ? "Saving…" : "Save & continue"}
          <ArrowRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================ Stage: Academic ============================
function StageAcademic({
  inputCls, labelCls, primaryBtn, complete, saved,
}: StageProps & { saved: any }) {
  const [yearName, setYearName] = useState(saved?.yearName || "2025/2026");
  const [termNames, setTermNames] = useState<string[]>(
    saved?.termNames || ["First Term", "Second Term", "Third Term"],
  );
  const setup = useMutation({
    mutationFn: async () =>
      (
        await api.post("/onboarding/academic", {
          yearName: yearName.trim(),
          termNames: termNames.map((t) => t.trim()).filter(Boolean),
        })
      ).json(),
    onError: (e: any) =>
      toast.error(e?.message || "Could not create the year"),
  });
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Academic session</label>
        <input
          value={yearName}
          onChange={(e) => setYearName(e.target.value)}
          placeholder="e.g. 2025/2026"
          className={`mt-1.5 ${inputCls}`}
        />
      </div>
      <div>
        <label className={labelCls}>Terms</label>
        <div className="mt-1.5 space-y-2">
          {termNames.map((t, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={t}
                onChange={(e) =>
                  setTermNames(
                    termNames.map((x, j) => (j === i ? e.target.value : x)),
                  )
                }
                className={inputCls}
              />
              {termNames.length > 1 && (
                <button
                  onClick={() =>
                    setTermNames(termNames.filter((_, j) => j !== i))
                  }
                  className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {termNames.length < 4 && (
            <button
              onClick={() => setTermNames([...termNames, ""])}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1"
            >
              <PlusIcon className="w-4 h-4" /> Add another term
            </button>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={async () => {
            await setup.mutateAsync();
            complete.mutate({
              stageKey: "ACADEMIC",
              data: { yearName, termNames },
            });
          }}
          disabled={setup.isPending || complete.isPending || !yearName.trim()}
          className={primaryBtn}
        >
          {setup.isPending || complete.isPending
            ? "Saving…"
            : "Create & activate"}
          <ArrowRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================ Stage: Classes ============================
function StageClasses({
  inputCls, labelCls, primaryBtn, secondaryBtn, invalidate, complete, classList, dark,
}: StageProps & { classList: { id: string; name: string }[] }) {
  void dark;
  const create = useMutation({
    mutationFn: async (names: string[]) =>
      (await api.post("/onboarding/classes", { names })).json(),
    onSuccess: (data: any) => {
      toast.success(
        `Created ${data.created.length} class(es)${
          data.skipped ? ` · ${data.skipped} already existed` : ""
        } — each with an Arm A`,
      );
      invalidate();
    },
    onError: (e: any) =>
      toast.error(e?.message || "Could not create classes"),
  });
  const existing = classList;
  const presetsToUse = CLASS_PRESETS.filter(
    (p) =>
      !p.names.every((n) =>
        existing.some((c) => c.name.toLowerCase() === n.toLowerCase()),
      ),
  );
  const [queued, setQueued] = useState<string[]>([]);
  const [name, setName] = useState("");
  return (
    <div className="space-y-4">
      {existing.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {existing.map((c) => (
            <span key={c.id} className={`${stageCls} ${doneCls}`}>
              {c.name}
            </span>
          ))}
        </div>
      )}
      {presetsToUse.length > 0 && (
        <div>
          <label className={labelCls}>Quick add (Nigerian curriculum)</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {presetsToUse.map((p) => (
              <button
                key={p.label}
                onClick={() =>
                  setQueued((prev) => [...new Set([...prev, ...p.names])])
                }
                className="rounded-lg border border-blue-500 text-blue-600 dark:text-blue-400 px-3 py-1.5 text-xs font-bold"
              >
                + {p.label}
              </button>
            ))}
          </div>
          {queued.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {queued.map((n) => (
                <span
                  key={n}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 px-2.5 py-0.5 text-[11px] font-bold"
                >
                  {n}
                  <button
                    onClick={() =>
                      setQueued(queued.filter((x) => x !== n))
                    }
                  >
                    <TrashIcon className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Or type a custom class name…"
          className={inputCls}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) {
              setQueued([...queued, name.trim()]);
              setName("");
            }
          }}
        />
        <button
          onClick={() => {
            if (name.trim()) {
              setQueued([...queued, name.trim()]);
              setName("");
            }
          }}
          className={secondaryBtn}
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={() => {
            const names = queued.length ? queued : name.trim() ? [name.trim()] : [];
            if (names.length) create.mutate(names);
          }}
          disabled={
            create.isPending || (queued.length === 0 && !name.trim())
          }
          className={primaryBtn}
        >
          {create.isPending ? "Creating…" : "Create classes"}
        </button>
        <button
          onClick={() => complete.mutate({ stageKey: "CLASSES" })}
          disabled={complete.isPending}
          className={secondaryBtn}
        >
          {existing.length > 0 || queued.length > 0
            ? "Done with classes"
            : "Skip for now"}
          <ArrowRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================ Stage: Subjects ============================
function StageSubjects({
  inputCls, labelCls, primaryBtn, secondaryBtn, invalidate, complete, subjectList, dark,
}: StageProps & { subjectList: { id: string; name: string }[] }) {
  void dark;
  const create = useMutation({
    mutationFn: async (names: string[]) =>
      (await api.post("/onboarding/subjects", { names })).json(),
    onSuccess: (data: any) => {
      toast.success(
        `Created ${data.created.length} subject(s)${
          data.skipped ? ` · ${data.skipped} already existed` : ""
        }`,
      );
      invalidate();
    },
    onError: (e: any) =>
      toast.error(e?.message || "Could not create subjects"),
  });
  const existing = subjectList;
  const presetsToUse = SUBJECT_PRESETS.filter(
    (p) =>
      !p.names.every((n) =>
        existing.some((s) => s.name.toLowerCase() === n.toLowerCase()),
      ),
  );
  const [queued, setQueued] = useState<string[]>([]);
  const [name, setName] = useState("");
  return (
    <div className="space-y-4">
      {existing.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {existing.map((s) => (
            <span key={s.id} className={`${stageCls} ${doneCls}`}>
              {s.name}
            </span>
          ))}
        </div>
      )}
      {presetsToUse.length > 0 && (
        <div>
          <label className={labelCls}>Quick add (Nigerian curriculum)</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {presetsToUse.map((p) => (
              <button
                key={p.label}
                onClick={() =>
                  setQueued((prev) => [...new Set([...prev, ...p.names])])
                }
                className="rounded-lg border border-blue-500 text-blue-600 dark:text-blue-400 px-3 py-1.5 text-xs font-bold"
              >
                + {p.label}
              </button>
            ))}
          </div>
          {queued.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {queued.map((n) => (
                <span
                  key={n}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 px-2.5 py-0.5 text-[11px] font-bold"
                >
                  {n}
                  <button
                    onClick={() =>
                      setQueued(queued.filter((x) => x !== n))
                    }
                  >
                    <TrashIcon className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Or type a custom subject…"
          className={inputCls}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) {
              setQueued([...queued, name.trim()]);
              setName("");
            }
          }}
        />
        <button
          onClick={() => {
            if (name.trim()) {
              setQueued([...queued, name.trim()]);
              setName("");
            }
          }}
          className={secondaryBtn}
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={() => {
            const names = queued.length ? queued : name.trim() ? [name.trim()] : [];
            if (names.length) create.mutate(names);
          }}
          disabled={
            create.isPending || (queued.length === 0 && !name.trim())
          }
          className={primaryBtn}
        >
          {create.isPending ? "Creating…" : "Create subjects"}
        </button>
        <button
          onClick={() => complete.mutate({ stageKey: "SUBJECTS" })}
          disabled={complete.isPending}
          className={secondaryBtn}
        >
          Done with subjects
          <ArrowRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================ Stage: Jump ============================
function StageJump({
  secondaryBtn, complete, target, navigate,
}: StageProps & { target: string; navigate: (to: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
        <SparklesIcon className="w-5 h-5 flex-shrink-0" />
        <p>
          This stage is done in its own page.{" "}
          <button
            onClick={() => {
              complete.mutate({ stageKey: target });
              navigate(
                target === "STAFF"
                  ? "/admin/staff"
                  : target === "STUDENTS"
                  ? "/admin/students"
                  : "/admin/fees",
              );
            }}
            className="underline font-bold"
          >
            Continue there →
          </button>
        </p>
      </div>
      <div className="flex justify-end">
        <button
          onClick={() => complete.mutate({ stageKey: target })}
          disabled={complete.isPending}
          className={secondaryBtn}
        >
          I'll do it later — mark stage done anyway
        </button>
      </div>
    </div>
  );
}

// ============================ Stage: Finish ============================
function StageFinish({
  dark, primaryBtn, complete, snapshot, navigate,
}: StageProps & { snapshot: Snapshot | undefined; navigate: (to: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          { label: "Classes", count: snapshot?.counts.classes },
          { label: "Subjects", count: snapshot?.counts.subjects },
          { label: "Teachers", count: snapshot?.counts.teachers },
          { label: "Students", count: snapshot?.counts.students },
          { label: "Fee structures", count: snapshot?.counts.feeStructures },
          { label: "Active session", value: snapshot?.counts.activeYear?.name },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-xl border p-3 ${
              dark
                ? "border-gray-800 bg-gray-800/40"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {s.label}
            </p>
            <p className="text-lg font-extrabold">
              {s.value ?? s.count ?? "—"}
            </p>
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Your school is ready to go. You can refine any of these later from the
        sidebar — nothing here is locked in.
      </p>
      <div className="flex justify-end gap-2">
        <button
          onClick={() => {
            complete.mutate({ stageKey: "FINISH" });
            toast.success("🎉 Setup complete — welcome to SmartEdufy!");
            navigate("/admin");
          }}
          disabled={complete.isPending}
          className={primaryBtn}
        >
          {complete.isPending ? "Finishing…" : "Finish setup"}
          <CheckCircleIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================ Root ============================
export default function SchoolOnboarding() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [stage, setStage] = useState<string | null>(null);

  // ---- data ----
  const wizard = useQuery({
    queryKey: ["onboarding-wizard"],
    queryFn: async () =>
      (await api.get("/onboarding/progress")).json() as unknown as {
        progress: Progress;
        snapshot: Snapshot;
        stages: string[];
        required: boolean;
        completed: boolean;
      },
  });

  const progress = wizard.data?.progress;
  const snapshot = wizard.data?.snapshot;
  const activeStage = stage || progress?.currentStage || "PROFILE";

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["onboarding-wizard"] });
    qc.invalidateQueries({ queryKey: ["onboarding-gate"] });
  };

  const complete = useMutation({
    mutationFn: async ({ stageKey, data }: { stageKey: string; data?: any }) =>
      (
        await api.post(`/onboarding/progress/${stageKey}/complete`, data || {})
      ).json(),
    onSuccess: (updated: Progress) => {
      setStage(updated.currentStage);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "Could not save this stage"),
  });

  const cardCls = `rounded-2xl border p-5 md:p-6 ${
    dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
  }`;
  const inputCls = `w-full rounded-xl px-3 py-2.5 border text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
    dark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300"
  }`;
  const labelCls =
    "text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400";
  const primaryBtn =
    "rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow disabled:opacity-50 inline-flex items-center gap-1.5";
  const secondaryBtn =
    "rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-xs font-bold disabled:opacity-50";

  const stageProps: StageProps = {
    dark, inputCls, labelCls, primaryBtn, secondaryBtn, invalidate, complete,
  };

  // NOTE: stage components are stable top-level components — switching stages
  // (or refetching) does NOT remount them, so typed input survives.
  const stageContent: Record<string, React.ReactNode> = {
    PROFILE: <StageProfile {...stageProps} name={snapshot?.school?.name || ""} />,
    ACADEMIC: <StageAcademic {...stageProps} saved={progress?.stageData?.ACADEMIC} />,
    CLASSES: <StageClasses {...stageProps} classList={snapshot?.classList || []} />,
    SUBJECTS: <StageSubjects {...stageProps} subjectList={snapshot?.subjectList || []} />,
    STAFF: <StageJump {...stageProps} target="STAFF" navigate={navigate} />,
    STUDENTS: <StageJump {...stageProps} target="STUDENTS" navigate={navigate} />,
    FEES: <StageJump {...stageProps} target="FEES" navigate={navigate} />,
    FINISH: <StageFinish {...stageProps} snapshot={snapshot} navigate={navigate} />,
  };

  if (wizard.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }
  if (wizard.error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-sm text-gray-500">
        Could not load your onboarding progress.
      </div>
    );
  }

  const completed = new Set(progress?.completedStages || []);
  const percent = Math.round((completed.size / STAGES.length) * 100);

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 md:py-10 max-w-4xl mx-auto w-full">
      {/* Brand */}
      <div className="flex justify-center mb-6">
        <img
          src={dark ? logoDarkUrl : logoLightUrl}
          alt="SmartEdufy"
          className="h-12 md:h-14 w-auto"
        />
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
          <SparklesIcon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-extrabold">Set up your school</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Step-by-step setup — resume anytime, everything saves as you go.
          </p>
        </div>
        <span className={`${stageCls} ${doneCls}`}>
          {completed.size}/{STAGES.length} done · {percent}%
        </span>
      </div>

      {/* Stepper — compact scrollable strip on mobile, wrap grid on desktop */}
      <div className={`rounded-2xl border p-4 ${cardCls} min-w-0 overflow-hidden`}>
        {/* Overall progress bar (all sizes) */}
        <div className="mb-3 flex items-center gap-3 min-w-0">
          <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-[11px] font-extrabold text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {percent}%
          </span>
        </div>

        {/*
          Mobile (<640px): horizontally scrollable numbered dots, no visible
          scrollbar, snap-to-step momentum, and the active step is
          auto-scrolled into view. Labels are hidden — the caption below shows
          the current step's name.
          Desktop (≥640px): steps wrap onto multiple rows with full labels.
        */}
        <StepStrip
          stages={STAGES}
          completed={completed}
          activeStage={activeStage}
          dark={dark}
          onSelect={(key) => setStage(key)}
        />

        {/* Mobile: readable stage label under the strip */}
        <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500 sm:hidden text-center">
          Step {STAGES.findIndex((s) => s.key === activeStage) + 1} of{" "}
          {STAGES.length} · <b className="text-gray-600 dark:text-gray-300">{STAGES.find((s) => s.key === activeStage)?.label}</b> — swipe or tap a dot to jump
        </p>
        {percent === 100 && (
          <p className="mt-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            🎉 Setup complete — you can redo any stage by clicking it above.
          </p>
        )}
      </div>

      {/* Free navigation note */}
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 mb-2 sm:-mt-3">
        You can browse any stage freely — nothing is saved until you press the
        stage's save/continue button.
      </p>

      {/* Active stage card */}
      <div className={cardCls}>
        <h3 className="font-bold text-sm mb-4">
          {STAGES.find((s) => s.key === activeStage)?.label}
        </h3>
        {stageContent[activeStage] || (
          <p className="text-sm text-gray-500">Unknown stage.</p>
        )}
      </div>

      {/* Footer nav — stacks on mobile */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 mt-2">
        <button
          onClick={() => {
            const idx = STAGES.findIndex((s) => s.key === activeStage);
            if (idx > 0) setStage(STAGES[idx - 1].key);
          }}
          disabled={activeStage === "PROFILE"}
          className={secondaryBtn}
        >
          <ArrowLeftIcon className="w-4 h-4" /> Back
        </button>
        {/* Cancel — leave the wizard and go to the main dashboard. Progress
            is kept server-side so the admin can resume from the dashboard
            CTA banner at any time. */}
        <button
          onClick={() => {
            qc.invalidateQueries({ queryKey: ["onboarding-gate"] });
            navigate("/admin");
          }}
          className={`${secondaryBtn} text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-500/40`}
        >
          <XMarkIcon className="w-4 h-4" /> Cancel & go to dashboard
        </button>
      </div>

      {/* Snapshot summary */}
      {snapshot && (
        <div className={cardCls + " mt-6"}>
          <h3 className="font-bold text-sm mb-3">
            What your school already has
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {[
              { label: "Classes", count: snapshot.counts.classes, href: "/admin/classes" },
              { label: "Subjects", count: snapshot.counts.subjects, href: "/admin/subjects" },
              { label: "Teachers", count: snapshot.counts.teachers, href: "/admin/teachers" },
              { label: "Students", count: snapshot.counts.students, href: "/admin/students" },
            ].map((s) => (
              <button
                key={s.label}
                onClick={() => navigate(s.href)}
                className={`rounded-xl border p-3 hover:border-blue-400 transition ${
                  dark
                    ? "border-gray-800 bg-gray-800/40"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {s.label}
                </p>
                <p className="text-lg font-extrabold">{s.count}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================ Step Strip ============================
// Compact labels used on sm/md desktop widths so all 8 steps fit within
// the card without pushing steps 6-8 out of the viewport.
const SHORT_LABELS: Record<string, string> = {
  PROFILE: "Profile",
  ACADEMIC: "Academic",
  CLASSES: "Classes",
  SUBJECTS: "Subjects",
  STAFF: "Staff",
  STUDENTS: "Students",
  FEES: "Fees",
  FINISH: "Finish",
};
// Mobile-first stepper: a horizontally scrollable row of numbered dots with
// connecting segments, hidden scrollbar, scroll snapping and momentum — the
// active dot is auto-scrolled into view so the current step is ALWAYS visible.
// On ≥640px it becomes a wrapping row of full labelled steps.
function StepStrip({
  stages,
  completed,
  activeStage,
  dark,
  onSelect,
}: {
  stages: { key: string; label: string; icon: any }[];
  completed: Set<string>;
  activeStage: string;
  dark: boolean;
  onSelect: (key: string) => void;
}) {
  const activeRef = (el: HTMLButtonElement | null) => {
    // Scroll the ACTIVE step into view whenever it changes (mobile strip).
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  };
  return (
    <>
      {/* --- Mobile (<640px): scrollable dot strip --- */}
      <div
        className="no-bar sm:hidden flex items-center gap-1.5 overflow-x-auto pb-1"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
          scrollSnapType: "x proximity",
        }}
      >
        {stages.map((s, i) => {
          const isDone = completed.has(s.key);
          const isActive = s.key === activeStage;
          return (
            <div
              key={s.key}
              className="flex items-center flex-shrink-0"
              style={{ scrollSnapAlign: "center" }}
            >
              <button
                ref={isActive ? activeRef : undefined}
                onClick={() => onSelect(s.key)}
                aria-label={`Step ${i + 1}: ${s.label}${isDone ? " (done)" : ""}`}
                aria-current={isActive ? "step" : undefined}
                className={`flex items-center justify-center h-8 w-8 rounded-full text-[11px] font-extrabold border transition-all ${
                  isActive
                    ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-transparent shadow scale-110"
                    : isDone
                    ? dark
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-emerald-100 text-emerald-600 border-emerald-300"
                    : dark
                    ? "bg-gray-800 text-gray-500 border-gray-700"
                    : "bg-white text-gray-400 border-gray-300"
                }`}
              >
                {isDone ? <CheckCircleIcon className="w-4 h-4" /> : i + 1}
              </button>
              {i < stages.length - 1 && (
                <div
                  className={`h-0.5 w-3 rounded ${
                    isDone
                      ? "bg-emerald-400"
                      : dark
                      ? "bg-gray-700"
                      : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* --- Desktop (≥640px): horizontally scrollable labelled steps --- */}
      <div
        className="no-bar hidden sm:flex items-center overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {stages.map((s, i) => {
          const isDone = completed.has(s.key);
          const isActive = s.key === activeStage;
          return (
            <div key={s.key} className="flex items-center flex-shrink-0">
              <button
                onClick={() => onSelect(s.key)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold transition ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow"
                    : isDone
                    ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {isDone ? (
                  <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <s.icon className="w-4 h-4 flex-shrink-0" />
                )}
                {/* Short labels on small desktops to prevent overflow,
                    full labels from lg up. */}
                <span className="hidden lg:inline">{s.label}</span>
                <span className="lg:hidden">{SHORT_LABELS[s.key]}</span>
              </button>
              {i < stages.length - 1 && (
                <div
                  className={`h-0.5 w-4 mx-0.5 rounded ${
                    completed.has(stages[i + 1].key)
                      ? "bg-emerald-400"
                      : dark
                      ? "bg-gray-700"
                      : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
