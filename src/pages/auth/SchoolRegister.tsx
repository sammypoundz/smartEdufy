// frontend/src/pages/auth/SchoolRegister.tsx
// School self-signup: creates a brand-new school (tenant) together with its
// first ADMIN account. After signup the admin is logged straight in.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
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

export default function SchoolRegister() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  const navigate = useNavigate();

  const [form, setForm] = useState({
    schoolName: "",
    adminName: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.schoolName.trim().length < 2)
      e.schoolName = "School name is required";
    if (form.adminName.trim().length < 2)
      e.adminName = "Admin full name is required";
    if (!/^\S+@\S+\.\S+$/.test(form.email))
      e.email = "Enter a valid email address";
    if (form.password.length < 6)
      e.password = "Password must be at least 6 characters";
    if (form.confirm !== form.password) e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.post("/auth/register-school", {
        schoolName: form.schoolName.trim(),
        adminName: form.adminName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        password: form.password,
      });
      // Persist the session directly from the signup response (token + user),
      // then land the new admin on their dashboard.
      try {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        localStorage.setItem("tenantId", res.data.user.schoolId);
      } catch {
        /* storage unavailable – ignore */
      }
      toast.success("School account created! Welcome aboard 🎉");
      setTimeout(() => navigate("/admin", { replace: true }), 1200);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error || "Could not create the school account",
      );
    } finally {
      setLoading(false);
    }
  };

  const inputCls = `w-full rounded-xl border py-3 pl-11 pr-4 text-sm font-medium transition-colors focus:outline-none focus:ring-2 ${
    dark
      ? "border-white/10 bg-white/[0.05] text-white placeholder-slate-500 focus:border-blue-500/50 focus:bg-white/[0.08] focus:ring-blue-500/30"
      : "border-slate-300 bg-white text-slate-900 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:ring-blue-500/25"
  }`;
  const labelCls = `block text-xs font-semibold uppercase tracking-wider mb-2 ${
    dark ? "text-slate-400" : "text-slate-700"
  }`;
  const errCls = "mt-1.5 text-xs text-red-500";

  return (
    <div
      className={`min-h-dvh flex items-center justify-center px-4 py-10 transition-colors duration-300 ${
        dark
          ? "bg-gray-900"
          : "bg-gradient-to-br from-blue-50 via-white to-indigo-100"
      }`}
    >
      {/* Theme toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        className={`fixed top-4 right-4 sm:top-6 sm:right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md transition-all active:scale-90 ${
          dark
            ? "border-white/10 bg-white/[0.06] text-amber-300 shadow-lg shadow-black/30 hover:bg-white/[0.12]"
            : "border-slate-200 bg-white/80 text-slate-600 shadow-lg shadow-blue-900/10 hover:bg-white"
        }`}
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        title={dark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {dark ? (
          <SunIcon className="h-5 w-5" />
        ) : (
          <MoonIcon className="h-5 w-5" />
        )}
      </button>

      {/* Back link */}
      <Link
        to="/login"
        className={`fixed top-4 left-4 sm:top-6 sm:left-6 z-50 flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold backdrop-blur-md transition-colors ${
          dark
            ? "border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/[0.12]"
            : "border-slate-200 bg-white/80 text-slate-600 hover:bg-white"
        }`}
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to login
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-lg"
      >
        <div
          className={`rounded-3xl border backdrop-blur-2xl shadow-2xl p-5 sm:p-8 lg:p-10 transition-colors duration-300 ${
            dark
              ? "border-white/10 bg-white/[0.03] shadow-black/40"
              : "border-slate-200 bg-white shadow-blue-900/15"
          }`}
        >
          {/* Heading */}
          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${
              dark
                ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
                : "border-blue-200 bg-blue-100 text-blue-700"
            }`}
          >
            <BuildingOffice2Icon className="h-3.5 w-3.5" />
            For schools
          </div>
          <h2
            className={`mt-4 text-2xl font-bold tracking-tight ${
              dark ? "text-white" : "text-slate-900"
            }`}
          >
            Create your school account
          </h2>
          <p
            className={`mt-1.5 text-sm ${
              dark ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Register your school and get an admin account to manage students,
            teachers, results and more.
          </p>

          <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="schoolName" className={labelCls}>
                School name
              </label>
              <div className="relative">
                <BuildingOffice2Icon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  id="schoolName"
                  type="text"
                  required
                  value={form.schoolName}
                  onChange={(e) => set("schoolName", e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Golden Light Academy"
                />
              </div>
              {errors.schoolName && (
                <p className={errCls}>{errors.schoolName}</p>
              )}
            </div>

            <div>
              <label htmlFor="adminName" className={labelCls}>
                Admin full name
              </label>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  id="adminName"
                  type="text"
                  required
                  value={form.adminName}
                  onChange={(e) => set("adminName", e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Mrs. Adaeze Okafor"
                />
              </div>
              {errors.adminName && <p className={errCls}>{errors.adminName}</p>}
            </div>

            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className={labelCls}>
                  Admin email
                </label>
                <div className="relative">
                  <EnvelopeIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    className={inputCls}
                    placeholder="admin@school.com"
                  />
                </div>
                {errors.email && <p className={errCls}>{errors.email}</p>}
              </div>
              <div>
                <label htmlFor="phone" className={labelCls}>
                  Phone (optional)
                </label>
                <div className="relative">
                  <PhoneIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    className={inputCls}
                    placeholder="0803 000 0000"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className={labelCls}>
                  Password
                </label>
                <div className="relative">
                  <LockClosedIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    className={`${inputCls} pr-12`}
                    placeholder="At least 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && <p className={errCls}>{errors.password}</p>}
              </div>
              <div>
                <label htmlFor="confirm" className={labelCls}>
                  Confirm password
                </label>
                <div className="relative">
                  <LockClosedIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <input
                    id="confirm"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={form.confirm}
                    onChange={(e) => set("confirm", e.target.value)}
                    className={inputCls}
                    placeholder="Repeat password"
                  />
                </div>
                {errors.confirm && <p className={errCls}>{errors.confirm}</p>}
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.99 }}
              className="group relative mt-2 w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating school account…
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  Create school account
                  <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              )}
            </motion.button>
          </form>

          <p
            className={`mt-5 text-center text-sm ${
              dark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Already have an account?{" "}
            <Link
              to="/login"
              className={`font-semibold ${
                dark
                  ? "text-blue-400 hover:text-blue-300"
                  : "text-blue-600 hover:text-blue-700"
              }`}
            >
              Sign in →
            </Link>
          </p>
        </div>

        <p
          className={`mt-6 text-center text-xs ${
            dark ? "text-slate-500" : "text-slate-500"
          }`}
        >
          © {new Date().getFullYear()} SmartEdufy — The AI-Powered School
          Management System.
        </p>
      </motion.div>
    </div>
  );
}
