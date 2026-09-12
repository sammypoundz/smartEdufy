// frontend/src/pages/auth/TeacherRegister.tsx
// Teacher self-registration: creates a TEACHER user account tied to a school.
// After registering they're logged straight into their dashboard, where they
// are prompted to complete (set up) their profile.
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  AcademicCapIcon,
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowRightIcon,
  UserIcon,
  PhoneIcon,
  BuildingOffice2Icon,
  ArrowLeftIcon,
  SunIcon,
  MoonIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";

export default function TeacherRegister() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    password: "",
    confirm: "",
  });
  const [schoolId, setSchoolId] = useState("");
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    api
      .get("/auth/schools")
      .then((res) => setSchools(res.data.schools ?? []))
      .catch(() => toast.error("Could not load the list of schools"));
  }, []);

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!/^\S+@\S+\.\S+$/.test(form.email))
      e.email = "Enter a valid email address";
    if (!schoolId) e.schoolId = "Select your school";
    if (form.password.length < 6)
      e.password = "Password must be at least 6 characters";
    if (form.password !== form.confirm) e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const email = form.email.trim().toLowerCase();
      await api.post("/auth/register", {
        role: "TEACHER",
        name: form.name.trim(),
        email,
        phone: form.phone.trim() || undefined,
        gender: form.gender || undefined,
        password: form.password,
        schoolId,
        idMode: "AUTO",
      });
      toast.success("Account created! Welcome aboard 🎉");

      // Log the new teacher in (re-uses the normal login flow so the token,
      // tenant header and user state are all set correctly), then send them
      // straight to profile setup where they choose subject/form teacher
      // and their classes/subjects before landing on the dashboard.
      const result = await login(email, form.password);
      if (result.success) {
        navigate("/teacher/profile-setup");
      } else {
        toast.success("You can now log in with your new account");
        navigate("/login");
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error || "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const inputCls = `block w-full rounded-xl border-0 py-2.5 pl-11 pr-10 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 ${
    dark
      ? "bg-white/5 text-white placeholder-gray-500 border border-white/10"
      : "bg-white text-gray-900 placeholder-gray-400 border border-gray-200"
  }`;

  return (
    <div
      className={`min-h-screen flex items-center justify-center px-4 py-10 transition-colors duration-300 ${
        dark
          ? "bg-[#0B1120]"
          : "bg-gradient-to-br from-blue-50 via-white to-blue-50"
      }`}
    >
      {/* Theme toggle */}
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
        className={`w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border ${
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
            Teacher Registration
          </h1>
          <p
            className={`mt-1 text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}
          >
            Create your teacher account to access your dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label
              className={`text-xs font-medium mb-1 block ${dark ? "text-gray-300" : "text-gray-700"}`}
            >
              Full name
            </label>
            <div className="relative">
              <UserIcon
                className={`h-5 w-5 absolute left-3.5 top-1/2 -translate-y-1/2 ${dark ? "text-gray-500" : "text-gray-400"}`}
              />
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Amara Okafor"
                className={inputCls}
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label
              className={`text-xs font-medium mb-1 block ${dark ? "text-gray-300" : "text-gray-700"}`}
            >
              Email
            </label>
            <div className="relative">
              <EnvelopeIcon
                className={`h-5 w-5 absolute left-3.5 top-1/2 -translate-y-1/2 ${dark ? "text-gray-500" : "text-gray-400"}`}
              />
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="you@school.com"
                className={inputCls}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Phone (optional) */}
          <div>
            <label
              className={`text-xs font-medium mb-1 block ${dark ? "text-gray-300" : "text-gray-700"}`}
            >
              Phone{" "}
              <span className="font-normal opacity-60">
                (optional — you can add it later)
              </span>
            </label>
            <div className="relative">
              <PhoneIcon
                className={`h-5 w-5 absolute left-3.5 top-1/2 -translate-y-1/2 ${dark ? "text-gray-500" : "text-gray-400"}`}
              />
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="080…"
                className={inputCls}
              />
            </div>
          </div>

          {/* Gender (optional) */}
          <div>
            <label
              className={`text-xs font-medium mb-1 block ${dark ? "text-gray-300" : "text-gray-700"}`}
            >
              Gender
            </label>
            <div className="relative">
              <UserIcon
                className={`h-5 w-5 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${dark ? "text-gray-500" : "text-gray-400"}`}
              />
              <select
                value={form.gender}
                onChange={(e) => set("gender", e.target.value)}
                className={`${inputCls} pr-4 appearance-none ${dark ? "[&>option]:bg-gray-900" : "[&>option]:bg-white"}`}
              >
                <option value="">Select gender (optional)…</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          {/* School */}
          <div>
            <label
              className={`text-xs font-medium mb-1 block ${dark ? "text-gray-300" : "text-gray-700"}`}
            >
              School
            </label>
            <div className="relative">
              <BuildingOffice2Icon
                className={`h-5 w-5 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${dark ? "text-gray-500" : "text-gray-400"}`}
              />
              <select
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                className={`${inputCls} pr-4 appearance-none ${dark ? "[&>option]:bg-gray-900" : "[&>option]:bg-white"}`}
              >
                <option value="">Select your school…</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            {errors.schoolId && (
              <p className="mt-1 text-xs text-red-500">{errors.schoolId}</p>
            )}
          </div>

          {/* Passwords */}
          <div className="space-y-4">
            <div>
              <label
                className={`text-xs font-medium mb-1 block ${dark ? "text-gray-300" : "text-gray-700"}`}
              >
                Password
              </label>
              <div className="relative">
                <LockClosedIcon
                  className={`h-5 w-5 absolute left-3.5 top-1/2 -translate-y-1/2 ${dark ? "text-gray-500" : "text-gray-400"}`}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="Min. 6 characters"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${dark ? "text-gray-500" : "text-gray-400"}`}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password}</p>
              )}
            </div>
            <div>
              <label
                className={`text-xs font-medium mb-1 block ${dark ? "text-gray-300" : "text-gray-700"}`}
              >
                Confirm
              </label>
              <div className="relative">
                <LockClosedIcon
                  className={`h-5 w-5 absolute left-3.5 top-1/2 -translate-y-1/2 ${dark ? "text-gray-500" : "text-gray-400"}`}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.confirm}
                  onChange={(e) => set("confirm", e.target.value)}
                  placeholder="Repeat password"
                  className={inputCls}
                />
              </div>
              {errors.confirm && (
                <p className="mt-1 text-xs text-red-500">{errors.confirm}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating account…
              </>
            ) : (
              <>
                Create account <ArrowRightIcon className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div
          className={`mt-6 pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-2 text-sm ${dark ? "border-white/10" : "border-gray-200"}`}
        >
          <Link
            to="/login"
            className={`inline-flex items-center gap-1 ${dark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}
          >
            <ArrowLeftIcon className="h-4 w-4" /> Back to login
          </Link>
          <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>
            Already registered? Log in instead.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
