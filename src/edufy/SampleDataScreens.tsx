import { useEffect, useState } from 'react';
import {
  ArrowPathIcon, CheckCircleIcon, SparklesIcon, PencilSquareIcon,
  ExclamationTriangleIcon, TrashIcon, ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { useEdufy } from './EdufyContext';

// ------------------------------------------------------------------
// Full interactive flows (frontend demo only — mock data throughout).
// Lesson Plan Assistant · Student Performance Insights · AI Report Assistant
// ------------------------------------------------------------------

function ScreenHeader({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-700/70">
      <button onClick={onBack} aria-label="Back to Edufy AI menu"
        className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700/60 dark:hover:text-gray-200">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
      </button>
      <div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">{subtitle}</p>
      </div>
    </div>
  );
}

function ProgressBlock({ steps, stepIdx, progress, hint }: { steps: string[]; stepIdx: number; progress: number; hint?: string }) {
  return (
    <div className="py-6">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
        <span className="flex items-center gap-1.5">
          <ArrowPathIcon className="h-4 w-4 animate-spin text-blue-600" /> {steps[stepIdx]}
        </span>
        <span className="text-blue-600 dark:text-blue-400">{Math.round(progress)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-200" style={{ width: `${progress}%` }} />
      </div>
      <ul className="mt-4 space-y-1.5">
        {steps.map((s, i) => (
          <li key={s} className={`flex items-center gap-2 text-[11px] ${i <= stepIdx ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>
            {i < stepIdx ? <CheckCircleIcon className="h-3.5 w-3.5 text-green-500" />
              : i === stepIdx ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin text-blue-500" />
              : <span className="ml-3.5 h-3.5 w-3.5 rounded-full border border-gray-300 dark:border-gray-600" />}
            {s}
          </li>
        ))}
      </ul>
      {hint && <p className="mt-4 text-center text-[10px] text-gray-400 dark:text-gray-500">{hint}</p>}
    </div>
  );
}

function SavedBlock({ title, body, onRestart, onBack }: { title: string; body: string; onRestart: () => void; onBack: () => void }) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/20">
        <CheckCircleIcon className="h-9 w-9 text-green-600 dark:text-green-400" />
      </div>
      <h4 className="mt-4 text-sm font-bold text-gray-900 dark:text-gray-100">{title}</h4>
      <p className="mt-1 max-w-[250px] text-[11px] text-gray-500 dark:text-gray-400">{body}</p>
      <div className="mt-4 flex gap-2">
        <button onClick={onRestart} className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Start Over</button>
        <button onClick={onBack} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500">Back to Menu</button>
      </div>
    </div>
  );
}

/** Simulated async "AI" progress — mock only. */
function useFakeGeneration(run: boolean, done: () => void, msPerTick = 240) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!run) return;
    setProgress(0);
    const t = setInterval(() => {
      setProgress((p) => {
        const next = p + 5 + Math.random() * 8;
        if (next >= 100) { clearInterval(t); setTimeout(done, 350); return 100; }
        return next;
      });
    }, msPerTick);
    return () => clearInterval(t);
  }, [run]); // eslint-disable-line react-hooks/exhaustive-deps
  return Math.min(progress, 100);
}

// ============================ Lesson Plan Assistant ============================
const LP_SUBJECTS = ['Mathematics', 'English', 'Basic Science', 'Social Studies', 'Computer Studies'];
const LP_CLASSES = ['JSS 1A', 'JSS 2A', 'SS 1A'];

const LP_PLAN = {
  topic: 'Fractions — Introduction',
  duration: '45 minutes',
  objectives: [
    'Identify fractions as parts of a whole',
    'Represent fractions using diagrams',
    'Compare simple fractions with like denominators',
  ],
  activities: [
    { time: '0–10 min', title: 'Warm-up', detail: 'Quick oral quiz: “If I cut an orange into 4 equal parts, what is 1 part called?”' },
    { time: '10–25 min', title: 'Guided practice', detail: 'Fold paper strips into halves/quarters; label each fraction together on the board.' },
    { time: '25–40 min', title: 'Group task', detail: 'In pairs, match fraction cards to shaded shapes and present one match each.' },
    { time: '40–45 min', title: 'Exit ticket', detail: 'Write one fraction you saw today and draw it.' },
  ],
  materials: ['Paper strips', 'Fraction cards', 'Coloured markers', 'Whiteboard'],
};

type LPStage = 'setup' | 'generating' | 'review' | 'saved';
const LP_STEPS = ['Reading curriculum topics…', 'Drafting learning objectives…', 'Planning timed activities…', 'Suggesting materials…', 'Formatting the plan…'];

export function LessonPlanScreen() {
  const { back } = useEdufy();
  const [stage, setStage] = useState<LPStage>('setup');
  const [subject, setSubject] = useState(LP_SUBJECTS[0]);
  const [cls, setCls] = useState(LP_CLASSES[1]);
  const [topic, setTopic] = useState('Fractions');
  const [error, setError] = useState<string | null>(null);
  const [objectives, setObjectives] = useState<string[]>(LP_PLAN.objectives);
  const [activities, setActivities] = useState(LP_PLAN.activities);

  const progress = useFakeGeneration(stage === 'generating', () => setStage('review'), 220);
  const stepIdx = Math.min(Math.floor(progress / 20), LP_STEPS.length - 1);

  const start = () => {
    if (!topic.trim()) { setError('Please enter a lesson topic first.'); return; }
    setError(null);
    setObjectives(LP_PLAN.objectives);
    setActivities(LP_PLAN.activities);
    setStage('generating');
  };

  const restart = () => { setStage('setup'); setTopic('Fractions'); setError(null); };

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Lesson Plan Assistant" subtitle="Create lesson plans & teaching activities" onBack={back} />
      <div className="flex-1 overflow-y-auto p-4">
        {/* ---------- setup ---------- */}
        {stage === 'setup' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Subject</label>
                <select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Subject"
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:[color-scheme:dark]">
                  {LP_SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Class</label>
                <select value={cls} onChange={(e) => setCls(e.target.value)} aria-label="Class"
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:[color-scheme:dark]">
                  {LP_CLASSES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Topic</label>
              <input value={topic} onChange={(e) => { setTopic(e.target.value); if (error) setError(null); }}
                placeholder="e.g. Fractions, Photosynthesis…" aria-label="Topic"
                className={`mt-1 w-full rounded-xl border bg-white px-3 py-2 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 ${error ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-blue-500 dark:border-gray-600'}`} />
            </div>
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-[11px] text-red-700 dark:bg-red-500/10 dark:text-red-300" role="alert">
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            <button onClick={start}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:from-blue-500 hover:to-indigo-500">
              <SparklesIcon className="h-4 w-4" /> Generate Lesson Plan
            </button>
          </div>
        )}

        {/* ---------- generating ---------- */}
        {stage === 'generating' && (
          <ProgressBlock steps={LP_STEPS} stepIdx={stepIdx} progress={progress} hint="Mock generation — a sample plan will be drafted for review." />
        )}

        {/* ---------- review (editable) ---------- */}
        {stage === 'review' && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-gray-100">
                <PencilSquareIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Draft Plan — {subject}, {cls}
              </h4>
              <button onClick={restart} className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">Adjust inputs</button>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">{LP_PLAN.topic} · {LP_PLAN.duration}</p>

            <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Learning objectives</p>
            <ul className="mt-1 space-y-1">
              {objectives.map((o, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <input value={o} aria-label={`Objective ${i + 1}`}
                    onChange={(e) => setObjectives(objectives.map((x, j) => (j === i ? e.target.value : x)))}
                    className="flex-1 rounded-lg border border-gray-200 bg-transparent px-2 py-1 text-[11px] text-gray-800 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:text-gray-100" />
                  <button onClick={() => setObjectives(objectives.filter((_, j) => j !== i))} aria-label={`Remove objective ${i + 1}`}
                    className="text-gray-400 transition hover:text-red-500 dark:hover:text-red-400"><TrashIcon className="h-3.5 w-3.5" /></button>
                </li>
              ))}
              <li>
                <button onClick={() => setObjectives([...objectives, 'New objective — edit me'])}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">+ Add objective</button>
              </li>
            </ul>

            <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Activities</p>
            <ul className="mt-1 space-y-1.5">
              {activities.map((a, i) => (
                <li key={i} className="rounded-xl border border-gray-200 p-2 dark:border-gray-700">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">{a.time}</span>
                    <button onClick={() => setActivities(activities.filter((_, j) => j !== i))} aria-label={`Remove activity ${i + 1}`}
                      className="text-gray-400 transition hover:text-red-500 dark:hover:text-red-400"><TrashIcon className="h-3.5 w-3.5" /></button>
                  </div>
                  <input value={a.title} aria-label={`Activity ${i + 1} title`}
                    onChange={(e) => setActivities(activities.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent px-2 py-1 text-[11px] font-semibold text-gray-800 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:text-gray-100" />
                  <textarea value={a.detail} rows={2} aria-label={`Activity ${i + 1} detail`}
                    onChange={(e) => setActivities(activities.map((x, j) => (j === i ? { ...x, detail: e.target.value } : x)))}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent px-2 py-1 text-[11px] text-gray-600 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:text-gray-400" />
                </li>
              ))}
            </ul>

            <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Materials</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {LP_PLAN.materials.map((m) => (
                <span key={m} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">{m}</span>
              ))}
            </div>

            <button
              onClick={() => setStage('saved')}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:from-blue-500 hover:to-indigo-500">
              <CheckCircleIcon className="h-4 w-4" /> Save Lesson Plan
            </button>
            <p className="mt-2 text-center text-[10px] text-gray-400 dark:text-gray-500">Mock save — no data is sent anywhere in this demo.</p>
          </div>
        )}

        {/* ---------- saved ---------- */}
        {stage === 'saved' && (
          <SavedBlock
            title="Lesson Plan Saved!"
            body={`Your ${subject} plan for ${cls} was saved as a draft. You can edit it anytime in the Lesson Plan module.`}
            onRestart={restart} onBack={back} />
        )}
      </div>
    </div>
  );
}

// ======================= Student Performance Insights =======================
const INS_CLASSES = ['JSS 2A', 'JSS 3B', 'SS 1A'];

interface InsStudent {
  name: string; avg: number; trend: 'up' | 'down' | 'flat';
  subjects: { subject: string; score: number }[]; note: string;
}
const INS_DATA: Record<string, { avg: number; prevAvg: number; students: InsStudent[] }> = {
  'JSS 2A': {
    avg: 78, prevAvg: 74.8,
    students: [
      { name: 'Adaeze Okafor', avg: 92, trend: 'up', subjects: [{ subject: 'Mathematics', score: 95 }, { subject: 'English', score: 90 }, { subject: 'Basic Science', score: 91 }], note: 'Top of class — consistently strong across all subjects.' },
      { name: 'Fatima Bello', avg: 88, trend: 'up', subjects: [{ subject: 'Mathematics', score: 84 }, { subject: 'English', score: 92 }, { subject: 'Basic Science', score: 88 }], note: 'Improved 6% since mid-term — excellent English performance.' },
      { name: 'Chidi Nwosu', avg: 74, trend: 'flat', subjects: [{ subject: 'Mathematics', score: 70 }, { subject: 'English', score: 76 }, { subject: 'Basic Science', score: 61 }], note: 'Consistent overall; borderline in Basic Science.' },
      { name: 'Emeka Obi', avg: 58, trend: 'down', subjects: [{ subject: 'Mathematics', score: 55 }, { subject: 'English', score: 60 }, { subject: 'Basic Science', score: 52 }], note: 'Declining trend — recommend intervention support in exams.' },
    ],
  },
  'JSS 3B': { avg: 71, prevAvg: 73, students: [] },
  'SS 1A': { avg: 80, prevAvg: 78, students: [] },
};

const INS_STEPS = ['Loading class results…', 'Computing averages…', 'Detecting performance trends…', 'Generating insights…'];

type InsStage = 'select' | 'loading' | 'dashboard';

export function InsightsScreen() {
  const { back } = useEdufy();
  const [stage, setStage] = useState<InsStage>('select');
  const [cls, setCls] = useState(INS_CLASSES[0]);
  const [studentIdx, setStudentIdx] = useState<number | null>(null);

  const data = INS_DATA[cls];
  const progress = useFakeGeneration(stage === 'loading', () => setStage('dashboard'), 260);
  const stepIdx = Math.min(Math.floor(progress / 25), INS_STEPS.length - 1);

  const delta = data.avg - data.prevAvg;
  const student = studentIdx !== null ? data.students[studentIdx] : null;

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Student Performance Insights" subtitle="Explore results & performance (sample data)" onBack={back} />
      <div className="flex-1 overflow-y-auto p-4">
        {/* ---------- select ---------- */}
        {stage === 'select' && (
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Class</label>
              <select value={cls} onChange={(e) => setCls(e.target.value)} aria-label="Select class"
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:[color-scheme:dark]">
                {INS_CLASSES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <button
              onClick={() => setStage('loading')}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:from-blue-500 hover:to-indigo-500">
              <SparklesIcon className="h-4 w-4" /> Analyse {cls}
            </button>
            <p className="text-center text-[10px] text-gray-400 dark:text-gray-500">Insights use compiled results for the current term.</p>
          </div>
        )}

        {/* ---------- loading ---------- */}
        {stage === 'loading' && (
          <ProgressBlock steps={INS_STEPS} stepIdx={stepIdx} progress={progress} hint="Mock analysis — sample insights will be shown." />
        )}

        {/* ---------- dashboard ---------- */}
        {stage === 'dashboard' && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-gray-100">
                <CheckCircleIcon className="h-4 w-4 text-green-500" /> {cls} — Insights
              </h4>
              <button onClick={() => setStage('select')} className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">Change class</button>
            </div>

            <div className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-3 text-white shadow-md">
              <p className="text-[10px] font-bold uppercase tracking-wide text-blue-100">Class Average</p>
              <p className="text-2xl font-black">{data.avg}%</p>
              <p className={`text-[10px] ${delta >= 0 ? 'text-blue-100' : 'text-red-200'}`}>
                {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}% vs. last term
              </p>
            </div>

            {data.students.length === 0 ? (
              <div className="mt-4 rounded-xl bg-gray-50 p-4 text-center text-[11px] text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
                No compiled results for this class yet. Compile results in the Result Compiler first, then re-run the analysis.
              </div>
            ) : (
              <ul className="mt-4 space-y-2">
                {data.students.map((s, i) => (
                  <li key={s.name}>
                    <button onClick={() => setStudentIdx(i)}
                      className="w-full rounded-xl border border-gray-200 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50/40 focus-visible:ring-2 focus-visible:ring-blue-300 dark:border-gray-700 dark:hover:border-blue-500 dark:hover:bg-blue-500/10">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{s.name}</p>
                        <span className={`text-[10px] font-bold ${s.trend === 'up' ? 'text-green-600 dark:text-green-400' : s.trend === 'down' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {s.trend === 'up' ? '▲' : s.trend === 'down' ? '▼' : '—'} {s.avg}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                        <div className={`h-full rounded-full ${s.avg >= 80 ? 'bg-green-500' : s.avg >= 60 ? 'bg-blue-500' : 'bg-red-400'}`} style={{ width: `${s.avg}%` }} />
                      </div>
                      <p className="mt-1.5 flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                        {s.note} <ChevronRightIcon className="h-3 w-3 text-blue-400" />
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ---------- student detail modal ---------- */}
        {student && (
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/30 sm:items-center"
            role="dialog" aria-modal="true" aria-label={`Insights for ${student.name}`}
            onClick={() => setStudentIdx(null)}>
            <div className="w-full max-w-sm rounded-t-3xl bg-white p-4 shadow-2xl dark:bg-gray-800 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">{student.name}</h4>
                <button onClick={() => setStudentIdx(null)} aria-label="Close details" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
              </div>
              <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">{student.note}</p>
              <div className="mt-3 space-y-2">
                {student.subjects.map((sub) => (
                  <div key={sub.subject}>
                    <div className="flex justify-between text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                      <span>{sub.subject}</span><span>{sub.score}%</span>
                    </div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                      <div className={`h-full rounded-full ${sub.score >= 80 ? 'bg-green-500' : sub.score >= 60 ? 'bg-blue-500' : 'bg-red-400'}`} style={{ width: `${sub.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-center text-[10px] text-gray-400 dark:text-gray-500">Sample data — live insights arrive with full AI integration.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================ AI Report Assistant ============================
const REP_CLASSES = ['JSS 2A', 'SS 1A'];
const REP_TERMS = ['First Term 2025/2026', 'Second Term 2024/2025'];

const REP_HIGHLIGHTS = [
  'Class average improved from 74.8% to 78% this term.',
  'Mathematics recorded the highest pass rate (92%).',
  '4 students need follow-up on exam performance.',
  'Attendance steady at 96% across the term.',
];

const REP_STUDENTS = [
  { id: 1, name: 'Adaeze Okafor', remark: 'Adaeze is an outstanding and diligent student. Her consistency in Mathematics and active class participation are commendable. Keep it up!' },
  { id: 2, name: 'Fatima Bello', remark: 'Fatima made excellent progress this term, particularly in English. A little more focus on Mathematics will make her results even stronger.' },
  { id: 3, name: 'Emeka Obi', remark: 'Emeka is a cheerful member of the class but his exam performance declined this term. Closer supervision and a structured study plan are recommended.' },
];

type RepStage = 'setup' | 'generating' | 'review' | 'saved';
const REP_STEPS = ['Loading compiled results…', 'Summarising term performance…', 'Writing student remarks…', 'Validating highlights…'];

export function ReportsScreen() {
  const { back } = useEdufy();
  const [stage, setStage] = useState<RepStage>('setup');
  const [cls, setCls] = useState(REP_CLASSES[0]);
  const [term, setTerm] = useState(REP_TERMS[0]);
  const [remarks, setRemarks] = useState(REP_STUDENTS.map((s) => ({ ...s })));

  const progress = useFakeGeneration(stage === 'generating', () => setStage('review'), 240);
  const stepIdx = Math.min(Math.floor(progress / 25), REP_STEPS.length - 1);

  const restart = () => { setStage('setup'); setRemarks(REP_STUDENTS.map((s) => ({ ...s }))); };

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="AI Report Assistant" subtitle="Academic summaries & report remarks" onBack={back} />
      <div className="flex-1 overflow-y-auto p-4">
        {/* ---------- setup ---------- */}
        {stage === 'setup' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Class</label>
                <select value={cls} onChange={(e) => setCls(e.target.value)} aria-label="Select class"
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:[color-scheme:dark]">
                  {REP_CLASSES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Term</label>
                <select value={term} onChange={(e) => setTerm(e.target.value)} aria-label="Select term"
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:[color-scheme:dark]">
                  {REP_TERMS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="rounded-xl bg-blue-50 p-3 text-[11px] leading-relaxed text-blue-800 dark:bg-blue-500/10 dark:text-blue-200">
              The assistant drafts a term summary with highlights and an AI-written remark for each student, ready for review before saving.
            </div>
            <button onClick={() => setStage('generating')}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:from-blue-500 hover:to-indigo-500">
              <SparklesIcon className="h-4 w-4" /> Draft Term Summary
            </button>
          </div>
        )}

        {/* ---------- generating ---------- */}
        {stage === 'generating' && (
          <ProgressBlock steps={REP_STEPS} stepIdx={stepIdx} progress={progress} hint="Mock drafting — sample remarks will be produced for review." />
        )}

        {/* ---------- review (editable) ---------- */}
        {stage === 'review' && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-gray-100">
                <PencilSquareIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" /> {term} · {cls}
              </h4>
              <button onClick={restart} className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">Change inputs</button>
            </div>

            <div className="rounded-xl bg-blue-50 p-3 dark:bg-blue-500/10">
              <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">Term Highlights</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-blue-900 dark:text-blue-200">
                {REP_HIGHLIGHTS.map((h) => <li key={h}>{h}</li>)}
              </ul>
            </div>

            <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Student remarks ({remarks.length})</p>
            <ul className="mt-1 space-y-2">
              {remarks.map((s) => (
                <li key={s.id} className="rounded-xl border border-gray-200 p-2 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-900 dark:text-gray-100">{s.name}</span>
                    <button onClick={() => setRemarks(remarks.filter((x) => x.id !== s.id))} aria-label={`Remove remark for ${s.name}`}
                      className="text-gray-400 transition hover:text-red-500 dark:hover:text-red-400"><TrashIcon className="h-3.5 w-3.5" /></button>
                  </div>
                  <textarea value={s.remark} rows={3} aria-label={`Remark for ${s.name}`}
                    onChange={(e) => setRemarks(remarks.map((x) => (x.id === s.id ? { ...x, remark: e.target.value } : x)))}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent px-2 py-1 text-[11px] italic leading-relaxed text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:text-gray-300" />
                </li>
              ))}
              {remarks.length === 0 && (
                <li className="rounded-xl bg-gray-50 p-4 text-center text-[11px] text-gray-400 dark:bg-gray-800/60 dark:text-gray-500">
                  No remarks left. Restart the draft to regenerate them.
                </li>
              )}
            </ul>

            <button
              onClick={() => setStage('saved')}
              disabled={remarks.length === 0}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:from-blue-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50">
              <CheckCircleIcon className="h-4 w-4" /> Review &amp; Save {remarks.length} Remarks
            </button>
            <p className="mt-2 text-center text-[10px] text-gray-400 dark:text-gray-500">Mock save — remarks would sync to Report Cards in the full integration.</p>
          </div>
        )}

        {/* ---------- saved ---------- */}
        {stage === 'saved' && (
          <SavedBlock
            title="Summary Drafted!"
            body={`${remarks.length} remarks for ${cls} (${term}) were saved as a draft. They are ready to publish via Report Cards.`}
            onRestart={restart} onBack={back} />
          )}
      </div>
    </div>
  );
}
