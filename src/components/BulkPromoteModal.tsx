import { useEffect, useMemo, useState } from "react";
import { createPortal } from 'react-dom';
import { motion } from "framer-motion";
import {
  XMarkIcon,
  ArrowsRightLeftIcon,
  UserMinusIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  PlusIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../contexts/ThemeContext";
import { api } from "../utils/api";
import { formatArm } from "../utils/arm";
import toast from "react-hot-toast";

interface Arm {
  id: string;
  letter: string;
  classId?: string;
}
interface Cls {
  id: string;
  name: string;
  arms: Arm[];
}
interface StudentLite {
  id: string;
  name: string;
  admissionNumber?: string;
}
interface FlowStep {
  id: string;
  fromClassId: string;
  fromArmId: string;
  toClassId: string;
  toArmId: string;
  omit: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  classes: Cls[];
  token: string;
  currentYearId: string;
  currentTermId: string;
  onPromoted: () => void;
}

let stepCounter = 0;
const newId = () => `step_${Date.now()}_${stepCounter++}`;

export default function BulkPromoteModal({ open, onClose, classes, token, currentYearId, currentTermId, onPromoted }: Props) {
  const { theme } = useTheme();
  const [steps, setSteps] = useState<FlowStep[]>([]);
  const [isPromoting, setIsPromoting] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);

  // Omit-student picker state (per step)
  const [omitForStep, setOmitForStep] = useState<string | null>(null);
  const [stepStudents, setStepStudents] = useState<StudentLite[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Initialize with a suggested flow: each class -> next class, matching arms by letter
  useEffect(() => {
    if (open && classes.length >= 2 && steps.length === 0) {
      const sorted = [...classes].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      const suggested: FlowStep[] = [];
      for (let i = 0; i < sorted.length - 1; i++) {
        const from = sorted[i];
        const to = sorted[i + 1];
        for (const arm of from.arms) {
          const matching = to.arms.find(a => a.letter === arm.letter) || to.arms[0];
          if (matching) {
            suggested.push({
              id: newId(),
              fromClassId: from.id,
              fromArmId: arm.id,
              toClassId: to.id,
              toArmId: matching.id,
              omit: [],
            });
          }
        }
      }
      setSteps(suggested);
    }
    if (!open) {
      setSteps([]);
      setConflict(null);
      setOmitForStep(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, classes]);

  const armsForClass = (classId: string) => classes.find(c => c.id === classId)?.arms || [];

  const updateStep = (id: string, patch: Partial<FlowStep>) =>
    setSteps(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));

  const removeStep = (id: string) => setSteps(prev => prev.filter(s => s.id !== id));

  const addStep = () =>
    setSteps(prev => [
      ...prev,
      { id: newId(), fromClassId: '', fromArmId: '', toClassId: '', toArmId: '', omit: [] },
    ]);

  // ---- Client-side conflict detection (mirrors backend rules) ----
  const conflicts = useMemo(() => {
    const issues: string[] = [];
    const sources = steps.map(s => s.fromArmId).filter(Boolean);
    const targets = steps.map(s => s.toArmId).filter(Boolean);
    sources.filter((s, i) => sources.indexOf(s) !== i).forEach(() => issues.push('A class is used as a source more than once.'));
    targets.filter((t, i) => targets.indexOf(t) !== i).forEach(() => issues.push('A target class receives students from more than one source.'));
    targets.filter(t => sources.includes(t)).forEach(() => issues.push('A target class is also a source class — students would be moved twice.'));
    steps.filter(s => s.fromArmId && s.fromArmId === s.toArmId).forEach(() => issues.push('A class cannot be promoted into itself.'));
    steps.filter(s => !s.fromArmId || !s.toArmId).forEach(() => issues.push('Every flow step needs both a source and a target.'));
    return issues;
  }, [steps]);

  // ---- Omit picker ----
  const openOmitPicker = async (step: FlowStep) => {
    if (omitForStep === step.id) {
      setOmitForStep(null);
      return;
    }
    setOmitForStep(step.id);
    setLoadingStudents(true);
    setStepStudents([]);
    try {
      const res = await api.get(`/students?armId=${step.fromArmId}`, token);
      if (res.ok) setStepStudents(await res.json());
    } catch (err) {
      console.error(err);
      toast.error('Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  };

  const toggleOmit = (stepId: string, studentId: string) =>
    setSteps(prev =>
      prev.map(s =>
        s.id === stepId
          ? { ...s, omit: s.omit.includes(studentId) ? s.omit.filter(x => x !== studentId) : [...s.omit, studentId] }
          : s
      )
    );

  const className = (id: string) => classes.find(c => c.id === id)?.name || '?';
  const armLabel = (armId: string) => {
    for (const c of classes) {
      const a = c.arms.find(x => x.id === armId);
      if (a) return formatArm(a);
    }
    return '?';
  };

  const handleBulkPromote = async () => {
    if (conflicts.length > 0) {
      setConflict(conflicts[0]);
      return;
    }
    setIsPromoting(true);
    setConflict(null);
    try {
      const payload = {
        flow: steps.map(s => ({ fromArmId: s.fromArmId, toArmId: s.toArmId, omitStudentIds: s.omit })),
        academicYearId: currentYearId,
        termId: currentTermId,
      };
      const res = await api.post('/bulk-promote', payload, token);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || (await res.text()) || 'Bulk promotion failed');
      }
      const result = await res.json();
      toast.success(`${result.promoted} student(s) promoted across ${steps.length} class step(s)!`);
      onPromoted();
      onClose();
    } catch (err: any) {
      setConflict(err.message || 'Bulk promotion failed');
      toast.error(err.message || 'Bulk promotion failed');
    } finally {
      setIsPromoting(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="h-full flex items-stretch justify-center p-0">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full h-full flex flex-col overflow-hidden ${
          theme === 'dark' ? 'bg-gray-900' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div>
            <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Bulk Promotion</h2>
            <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Configure the promotion flow for every class, then promote all at once.
            </p>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl transition ${theme === 'dark' ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-500'}`}>
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Conflict banner */}
        {conflict && (
          <div className="mx-6 mt-4 flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{conflict}</span>
            <button onClick={() => setConflict(null)} className="ml-auto"><XMarkIcon className="h-4 w-4" /></button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {steps.map((step, idx) => {
            const stepConflicts: string[] = [];
            if (step.fromArmId === step.toArmId) stepConflicts.push('cannot promote into itself');
            return (
              <div
                key={step.id}
                className={`rounded-2xl border p-4 ${
                  stepConflicts.length > 0
                    ? 'border-red-400/60 bg-red-500/5'
                    : theme === 'dark'
                    ? 'border-white/10 bg-white/5'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`text-sm font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 text-xs font-bold">
                      {idx + 1}
                    </span>
                    Flow Step {idx + 1}
                  </h4>
                  <button onClick={() => removeStep(step.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition" title="Remove step">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* From */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>From Class</label>
                      <select style={{ colorScheme: theme === 'dark' ? 'dark' : 'light', backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', color: theme === 'dark' ? '#f1f5f9' : '#0f172a' }}
                        value={step.fromClassId}
                        onChange={(e) => updateStep(step.id, { fromClassId: e.target.value, fromArmId: '', toClassId: '', toArmId: '', omit: [] })}
                        className={`w-full rounded-xl border-0 bg-transparent px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-emerald-500 ${theme === 'dark' ? 'bg-white/5 text-white border border-white/10' : 'bg-white text-gray-900 border border-gray-200'}`}
                      >
                        <option value="">Select class</option>
                        {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Arm</label>
                      <select style={{ colorScheme: theme === 'dark' ? 'dark' : 'light', backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', color: theme === 'dark' ? '#f1f5f9' : '#0f172a' }}
                        value={step.fromArmId}
                        onChange={(e) => updateStep(step.id, { fromArmId: e.target.value, omit: [] })}
                        disabled={!step.fromClassId}
                        className={`w-full rounded-xl border-0 bg-transparent px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 ${theme === 'dark' ? 'bg-white/5 text-white border border-white/10' : 'bg-white text-gray-900 border border-gray-200'}`}
                      >
                        <option value="">Select arm</option>
                        {armsForClass(step.fromClassId).map((a) => <option key={a.id} value={a.id}>{formatArm(a)}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* To */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>To Class</label>
                      <select style={{ colorScheme: theme === 'dark' ? 'dark' : 'light', backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', color: theme === 'dark' ? '#f1f5f9' : '#0f172a' }}
                        value={step.toClassId}
                        onChange={(e) => updateStep(step.id, { toClassId: e.target.value, toArmId: '' })}
                        className={`w-full rounded-xl border-0 bg-transparent px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-emerald-500 ${theme === 'dark' ? 'bg-white/5 text-white border border-white/10' : 'bg-white text-gray-900 border border-gray-200'}`}
                      >
                        <option value="">Select class</option>
                        {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Arm</label>
                      <select style={{ colorScheme: theme === 'dark' ? 'dark' : 'light', backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', color: theme === 'dark' ? '#f1f5f9' : '#0f172a' }}
                        value={step.toArmId}
                        onChange={(e) => updateStep(step.id, { toArmId: e.target.value })}
                        disabled={!step.toClassId}
                        className={`w-full rounded-xl border-0 bg-transparent px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 ${theme === 'dark' ? 'bg-white/5 text-white border border-white/10' : 'bg-white text-gray-900 border border-gray-200'}`}
                      >
                        <option value="">Select arm</option>
                        {armsForClass(step.toClassId).map((a) => <option key={a.id} value={a.id}>{formatArm(a)}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Omit students */}
                {step.fromArmId && (
                  <div className="mt-3">
                    <button
                      onClick={() => openOmitPicker(step)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        step.omit.length > 0
                          ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                          : theme === 'dark'
                          ? 'bg-white/5 text-gray-300 hover:bg-white/10'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <UserMinusIcon className="h-3.5 w-3.5" />
                      {step.omit.length > 0 ? `${step.omit.length} student(s) omitted` : 'Omit students'}
                    </button>

                    {omitForStep === step.id && (
                      <div className={`mt-2 rounded-xl border p-3 max-h-56 overflow-y-auto ${theme === 'dark' ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-white'}`}>
                        {loadingStudents ? (
                          <div className="flex justify-center py-4">
                            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : stepStudents.length === 0 ? (
                          <p className={`text-xs text-center py-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No students in this arm.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {stepStudents.map((st) => (
                              <label
                                key={st.id}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition ${
                                  step.omit.includes(st.id)
                                    ? 'bg-amber-500/15 text-amber-500'
                                    : theme === 'dark'
                                    ? 'hover:bg-white/5 text-gray-300'
                                    : 'hover:bg-gray-50 text-gray-700'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={step.omit.includes(st.id)}
                                  onChange={() => toggleOmit(step.id, st.id)}
                                  className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                                />
                                <span className="truncate">{st.name}</span>
                                {st.admissionNumber && <span className="text-xs opacity-60 ml-auto">{st.admissionNumber}</span>}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Flow summary arrow */}
                {step.fromArmId && step.toArmId && (
                  <p className={`mt-3 text-xs flex items-center gap-1.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    <span className="font-medium">{className(step.fromClassId)} {armLabel(step.fromArmId)}</span>
                    <ArrowRightIcon className="h-3 w-3 text-emerald-500" />
                    <span className="font-medium">{className(step.toClassId)} {armLabel(step.toArmId)}</span>
                    <ArrowsRightLeftIcon className="h-3 w-3 ml-1 text-gray-400" />
                  </p>
                )}
              </div>
            );
          })}

          <button
            onClick={addStep}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed text-sm font-medium transition ${
              theme === 'dark' ? 'border-white/15 text-gray-400 hover:border-emerald-500/40 hover:text-emerald-400' : 'border-gray-300 text-gray-500 hover:border-emerald-400 hover:text-emerald-600'
            }`}
          >
            <PlusIcon className="h-4 w-4" /> Add another flow step
          </button>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t shrink-0 flex items-center justify-between ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            {steps.length} step(s) configured
            {currentYearId && currentTermId ? ' • will be recorded under the active session' : ' • ⚠ no active session'}
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className={`px-5 py-2.5 rounded-xl text-sm font-medium ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
              Cancel
            </button>
            <button
              onClick={handleBulkPromote}
              disabled={isPromoting || conflicts.length > 0 || steps.length === 0 || !currentYearId || !currentTermId}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPromoting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <ArrowRightIcon className="h-4 w-4" />}
              {isPromoting ? 'Promoting...' : 'Promote All'}
            </button>
          </div>
        </div>
      </motion.div>
      </div>
    </div>,
    document.body
  );
}
