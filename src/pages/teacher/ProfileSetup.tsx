// frontend/src/pages/teacher/ProfileSetup.tsx
// Profile setup page shown to teachers right after registration.
// Lets them pick whether they are a subject teacher / form teacher (or both),
// then declare which classes they teach (form teacher) and which
// subjects/classes they handle (subject teacher), plus their phone number.
// Saves everything to the Teacher record via PATCH /teachers/me.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  AcademicCapIcon,
  BookOpenIcon,
  HomeIcon,
  SunIcon,
  MoonIcon,
  CheckIcon,
  XMarkIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { formatArm } from "../../utils/arm";

const TEACHER_TYPES = [
  {
    value: "SUBJECT_TEACHER",
    label: "Subject Teacher",
    desc: "I teach specific subjects across classes",
  },
  {
    value: "FORM_TEACHER",
    label: "Form Teacher",
    desc: "I am in charge of one class/arm",
  },
  {
    value: "BOTH",
    label: "Both",
    desc: "I teach subjects and also head a class",
  },
] as const;

type TeacherType = (typeof TEACHER_TYPES)[number]["value"];

interface TeacherMe {
  id: string;
  name: string;
  phone: string | null;
  email: string;
  teacherType?: string | null;
  briefSubjects?: {
    subjects?: string[];
    classes?: string[];
    armIds?: string[];
    subjectArms?: { subject: string; armId: string }[];
  } | null;
}

interface ClassWithArms {
  id: string;
  name: string;
  arms: { id: string; letter: string; alias?: string | null; classId?: string }[];
}

export default function ProfileSetup() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const { data: teacher } = useQuery<TeacherMe>({
    queryKey: ["teacher-me-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const res = await api.get("/teachers/me");
      return res.data?.teacher ?? res.data;
    },
  });

  const { data: classes = [] } = useQuery<ClassWithArms[]>({
    queryKey: ["classes-for-setup"],
    enabled: !!user,
    queryFn: async () => {
      const res = await api.get("/classes");
      return res.data?.classes ?? res.data ?? [];
    },
  });

  const { data: subjects = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["subjects-for-setup"],
    enabled: !!user,
    queryFn: async () => {
      const res = await api.get("/subjects");
      return res.data?.subjects ?? res.data ?? [];
    },
  });

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState("");
  const [teacherType, setTeacherType] = useState<TeacherType | "">("");
  const [myArmIds, setMyArmIds] = useState<string[]>([]); // Arm ids (form teacher)
  const [mySubjects, setMySubjects] = useState<string[]>([]); // Subject names (subject teacher)
  // subject name -> arm ids it is offered to (subject teacher)
  const [subjectArmIds, setSubjectArmIds] = useState<Record<string, string[]>>({});
  // Modal for choosing which class arm(s) a chosen subject is offered to
  const [armPickerSubject, setArmPickerSubject] = useState<string | null>(null);

  // Pre-fill once the teacher profile loads
  useEffect(() => {
    if (!teacher || classes.length === 0) return;
    setName(teacher.name || user?.name || "");
    setPhone(teacher.phone || "");
    if (teacher.teacherType) setTeacherType(teacher.teacherType as TeacherType);
    if (teacher.briefSubjects) {
      const b = teacher.briefSubjects;
      setMySubjects(b.subjects || []);
      const wantsFormRole =
        !teacher.teacherType ||
        teacher.teacherType === "FORM_TEACHER" ||
        teacher.teacherType === "BOTH";
      if (wantsFormRole && b.armIds?.length) {
        setMyArmIds(b.armIds);
      } else if (wantsFormRole) {
        // Legacy briefs stored class names only — fall back to every arm of
        // those classes so the teacher's existing setup still shows selected.
        const names = b.classes || [];
        setMyArmIds(
          classes
            .filter((c) => names.includes(c.name))
            .flatMap((c) => c.arms.map((a) => a.id)),
        );
      }
      const map: Record<string, string[]> = {};
      for (const sa of b.subjectArms || []) {
        (map[sa.subject] ||= []).push(sa.armId);
      }
      setSubjectArmIds(map);
    }
  }, [teacher, user?.name, classes]);

  const toggle = (
    list: string[],
    setList: (v: string[]) => void,
    value: string,
  ) =>
    setList(
      list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
    );

  const save = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {};
      if (phone.trim()) body.phone = phone.trim();
      if (name.trim() && name.trim() !== teacher?.name) body.name = name.trim();
      if (teacherType) body.teacherType = teacherType;
      // Also resolve class names so the admin review card can display the
      // preferences (and legacy approval fallbacks still work).
      const classIds = new Set(
        classes
          .filter((c) =>
            showClassPicker
              ? c.arms.some((a) => myArmIds.includes(a.id))
              : mySubjects.some((s) =>
                  c.arms.some((a) => (subjectArmIds[s] || []).includes(a.id)),
                ),
          )
          .map((c) => c.id),
      );
      body.briefSubjects = {
        subjects: mySubjects,
        classes: classes
          .filter((c) => classIds.has(c.id))
          .map((c) => c.name),
        // armIds = form-teacher arms — only sent for form teachers (or BOTH).
        // A pure subject teacher's subject-arm choices live in subjectArms.
        armIds: showClassPicker ? myArmIds : [],
        subjectArms: mySubjects.flatMap((s) =>
          (subjectArmIds[s] || []).map((armId) => ({ subject: s, armId })),
        ),
      };
      return api.patch("/teachers/me", body);
    },
    onSuccess: async () => {
      toast.success("Profile set up! Welcome aboard 🎉");
      await refreshUser();
      navigate("/teacher", { replace: true });
    },
    onError: () =>
      toast.error("Could not save your profile. Please try again."),
  });

  const showClassPicker =
    teacherType === "FORM_TEACHER" || teacherType === "BOTH";
  const showSubjectPicker =
    teacherType === "SUBJECT_TEACHER" || teacherType === "BOTH";
  const canSubmit =
    !!teacherType &&
    (!showClassPicker || myArmIds.length > 0) &&
    (!showSubjectPicker ||
      (mySubjects.length > 0 &&
        mySubjects.every((s) => (subjectArmIds[s] || []).length > 0)));

  const inputCls = `block w-full rounded-xl border-0 py-2.5 pl-11 pr-3 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 ${
    dark
      ? "bg-white/5 text-white placeholder-gray-500 border border-white/10"
      : "bg-white text-gray-900 placeholder-gray-400 border border-gray-200"
  }`;

  // Helper: all arms across all classes, with display labels
  const allArms = classes.flatMap((c) =>
    c.arms.map((a) => ({
      arm: { ...a, classId: c.id },
      label: `${c.name} – ${formatArm(a)}`,
    })),
  );

  const chipCls = (selected: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
      selected
        ? "bg-blue-600 text-white border-blue-600"
        : dark
          ? "bg-white/5 text-gray-300 border-white/10 hover:border-blue-400"
          : "bg-white text-gray-700 border-gray-200 hover:border-blue-400"
    }`;

  return (
    <div
      className={`min-h-screen px-4 py-10 transition-colors duration-300 ${
        dark
          ? "bg-[#0B1120]"
          : "bg-gradient-to-br from-blue-50 via-white to-blue-50"
      }`}
    >
      <button
        onClick={toggleTheme}
        className={`fixed top-4 right-4 p-2.5 rounded-full z-10 ${
          dark
            ? "bg-white/10 text-gray-300 hover:bg-white/20"
            : "bg-white/70 text-gray-600 hover:bg-white shadow"
        }`}
        aria-label="Toggle theme"
      >
        {dark ? (
          <SunIcon className="h-5 w-5" />
        ) : (
          <MoonIcon className="h-5 w-5" />
        )}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`max-w-2xl mx-auto rounded-3xl p-6 sm:p-8 shadow-2xl border ${
          dark
            ? "bg-white/5 backdrop-blur-xl border-white/10"
            : "bg-white/80 backdrop-blur-md border-white/40"
        }`}
      >
        <div className="text-center mb-6">
          <span
            className={`inline-flex items-center justify-center h-14 w-14 rounded-2xl mb-3 ${
              dark
                ? "bg-blue-500/20 text-blue-300"
                : "bg-blue-100 text-blue-600"
            }`}
          >
            <AcademicCapIcon className="h-8 w-8" />
          </span>
          <h1
            className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}
          >
            Set up your profile
          </h1>
          <p
            className={`mt-1 text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}
          >
            Tell the school whether you're a subject teacher or form teacher,
            and which classes/subjects you handle.
          </p>
        </div>

        <div className="space-y-6">
          {/* Step 1: teacher type */}
          <section>
            <h2
              className={`text-sm font-semibold mb-2 ${dark ? "text-gray-200" : "text-gray-800"}`}
            >
              1. What kind of teacher are you?
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {TEACHER_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => {
                    setTeacherType(t.value);
                    // armIds are the FORM-TEACHER arms. If the teacher switches
                    // to a pure subject teacher, drop any stale form-teacher
                    // arm picks so approval never turns them into a form
                    // teacher of a class they didn't choose for that role.
                    if (t.value === "SUBJECT_TEACHER") setMyArmIds([]);
                  }}
                  className={`text-left rounded-2xl p-3 border-2 transition-all ${
                    teacherType === t.value
                      ? "border-blue-500 bg-blue-500/10"
                      : dark
                        ? "border-white/10 hover:border-white/30 bg-white/5"
                        : "border-gray-200 hover:border-blue-300 bg-white"
                  }`}
                >
                  <p
                    className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}
                  >
                    {t.label}
                  </p>
                  <p
                    className={`mt-0.5 text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {t.desc}
                  </p>
                </button>
              ))}
            </div>
          </section>

          {/* Step 2: classes (form teacher) */}
          {showClassPicker && (
            <section>
              <h2
                className={`text-sm font-semibold mb-2 flex items-center gap-1.5 ${dark ? "text-gray-200" : "text-gray-800"}`}
              >
                <HomeIcon className="h-4 w-4" />{" "}
                {teacherType === "BOTH"
                  ? "2. Which class do you head?"
                  : "2. Which class are you the form teacher of?"}
              </h2>
              <div className="flex flex-wrap gap-2">
                {classes.map((c) =>
                  (c.arms.length ? c.arms : [{ id: `cls-${c.id}`, letter: "" }]).map((a) => {
                    const label = a.letter
                      ? `${c.name} – ${formatArm(a)}`
                      : c.name;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() =>
                          a.letter && toggle(myArmIds, setMyArmIds, a.id)
                        }
                        className={chipCls(
                          a.letter ? myArmIds.includes(a.id) : false,
                        )}
                      >
                        {label}
                      </button>
                    );
                  }),
                )}
                {classes.length === 0 && (
                  <p
                    className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}
                  >
                    No classes have been created yet — you can skip this for
                    now.
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Step 2/3: subjects (subject teacher) */}
          {showSubjectPicker && (
            <section>
              <h2
                className={`text-sm font-semibold mb-2 flex items-center gap-1.5 ${dark ? "text-gray-200" : "text-gray-800"}`}
              >
                <BookOpenIcon className="h-4 w-4" /> Which subjects do you
                teach?
              </h2>
              <p
                className={`text-xs mb-2 ${dark ? "text-gray-400" : "text-gray-500"}`}
              >
                Tap a subject, then choose the class arm(s) you offer it to —
                each subject can go to different classes.
              </p>
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      if (mySubjects.includes(s.name)) {
                        setArmPickerSubject(s.name);
                      } else {
                        toggle(mySubjects, setMySubjects, s.name);
                        setArmPickerSubject(s.name);
                      }
                    }}
                    className={chipCls(mySubjects.includes(s.name))}
                  >
                    {s.name}
                    {mySubjects.includes(s.name) &&
                      (subjectArmIds[s.name]?.length || 0) > 0 &&
                      ` · ${subjectArmIds[s.name].length}`}
                  </button>
                ))}
                {subjects.length === 0 && (
                  <p
                    className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}
                  >
                    No subjects have been created yet — the admin can add these
                    later.
                  </p>
                )}
              </div>
              {/* Summary of subject → class arm assignments */}
              {mySubjects.length > 0 && (
                <div
                  className={`mt-4 rounded-2xl p-3 border ${
                    dark
                      ? "bg-white/5 border-white/10"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <p
                    className={`text-xs font-semibold mb-2 ${dark ? "text-gray-300" : "text-gray-600"}`}
                  >
                    Your teaching assignments
                  </p>
                  <ul className="space-y-1.5">
                    {mySubjects.map((s) => {
                      const chosen = subjectArmIds[s] || [];
                      const labels = allArms
                        .filter(({ arm }) => chosen.includes(arm.id))
                        .map(({ label }) => label);
                      return (
                        <li
                          key={s}
                          className="flex items-start gap-2 text-xs"
                        >
                          <span
                            className={`font-semibold ${dark ? "text-white" : "text-gray-900"}`}
                          >
                            {s}
                          </span>
                          <span
                            className={
                              labels.length
                                ? dark
                                  ? "text-gray-400"
                                  : "text-gray-500"
                                : "text-amber-500"
                            }
                          >
                            → {labels.length ? labels.join(", ") : "tap to choose classes"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setArmPickerSubject(s)}
                            className={`ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium ${
                              dark
                                ? "bg-white/10 text-gray-300 hover:bg-white/20"
                                : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                            }`}
                          >
                            <PencilSquareIcon className="h-3 w-3" /> Edit
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* Step 3: contact details */}
          <section>
            <h2
              className={`text-sm font-semibold mb-2 ${dark ? "text-gray-200" : "text-gray-800"}`}
            >
              3. Contact details
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  className={`text-xs font-medium mb-1 block ${dark ? "text-gray-300" : "text-gray-700"}`}
                >
                  Full name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className={inputCls}
                />
              </div>
              <div>
                <label
                  className={`text-xs font-medium mb-1 block ${dark ? "text-gray-300" : "text-gray-700"}`}
                >
                  Phone number
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 080…"
                  inputMode="tel"
                  className={inputCls}
                />
              </div>
            </div>
          </section>

          <button
            onClick={() => {
              if (!teacherType) {
                toast.error("Please choose your teacher type");
                return;
              }
              if (showClassPicker && myArmIds.length === 0) {
                toast.error("Please select at least one class arm");
                return;
              }
              if (showSubjectPicker && mySubjects.length === 0) {
                toast.error("Please select at least one subject");
                return;
              }
              if (
                showSubjectPicker &&
                mySubjects.some((s) => (subjectArmIds[s] || []).length === 0)
              ) {
                toast.error(
                  "Choose which class arm(s) each selected subject is offered to",
                );
                return;
              }
              save.mutate();
            }}
            disabled={save.isPending || !canSubmit}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-3 shadow-lg disabled:opacity-60"
          >
            {save.isPending ? (
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckIcon className="h-4 w-4" />
            )}
            Finish setup & go to dashboard
          </button>
        </div>
      </motion.div>

      {/* Modal: choose which class arm(s) a subject is offered to */}
      {armPickerSubject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setArmPickerSubject(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border ${
              dark
                ? "bg-[#0f172a] border-white/10"
                : "bg-white border-gray-200"
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-1">
              <h3
                className={`text-lg font-bold ${dark ? "text-white" : "text-gray-900"}`}
              >
                {armPickerSubject}
              </h3>
              <button
                type="button"
                onClick={() => setArmPickerSubject(null)}
                className={`p-1.5 rounded-lg ${
                  dark
                    ? "text-gray-400 hover:bg-white/10"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <p
              className={`text-xs mb-4 ${dark ? "text-gray-400" : "text-gray-500"}`}
            >
              Which class arm(s) do you offer {armPickerSubject} to?
            </p>
            <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
              {allArms.map(({ arm, label }) => {
                const chosen = subjectArmIds[armPickerSubject] || [];
                return (
                  <button
                    key={arm.id}
                    type="button"
                    onClick={() =>
                      setSubjectArmIds((m) => ({
                        ...m,
                        [armPickerSubject]: chosen.includes(arm.id)
                          ? chosen.filter((x) => x !== arm.id)
                          : [...chosen, arm.id],
                      }))
                    }
                    className={chipCls(chosen.includes(arm.id))}
                  >
                    {label}
                  </button>
                );
              })}
              {allArms.length === 0 && (
                <p
                  className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}
                >
                  No class arms exist yet — ask the admin to create classes
                  first.
                </p>
              )}
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  // Removing the subject entirely (unassign its arms too)
                  setSubjectArmIds((m) => {
                    const { [armPickerSubject]: _, ...rest } = m;
                    return rest;
                  });
                  setMySubjects((list) =>
                    list.filter((s) => s !== armPickerSubject),
                  );
                  setArmPickerSubject(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-medium ${
                  dark
                    ? "bg-white/10 text-gray-300 hover:bg-white/20"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Remove subject
              </button>
              <button
                type="button"
                onClick={() => setArmPickerSubject(null)}
                className="ml-auto px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
