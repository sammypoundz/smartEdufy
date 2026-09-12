import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  SparklesIcon,
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowRightIcon,
  AcademicCapIcon,
  ChartBarIcon,
  BoltIcon,
  SunIcon,
  MoonIcon,
} from "@heroicons/react/24/outline";

/** Deterministic pseudo-random particle field (stable across re-renders). */
const PARTICLES = Array.from({ length: 26 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  top: (i * 53 + 7) % 100,
  size: 2 + (i % 3),
  duration: 10 + (i % 5) * 3,
  delay: (i % 8) * 1.5,
}));

/** Soft glowing particles that slowly drift upward across the whole page. */
function BackgroundParticles({ dark }: { dark: boolean }) {
  const particles = useMemo(() => PARTICLES, []);
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <style>{`
        @keyframes particle-drift {
          0% { transform: translate(0, 0) scale(1); opacity: 0; }
          12% { opacity: var(--particle-opacity, 0.6); }
          85% { opacity: var(--particle-opacity, 0.6); }
          100% { transform: translate(28px, -140px) scale(1.3); opacity: 0; }
        }
        .login-particle {
          position: absolute;
          border-radius: 9999px;
          animation: particle-drift linear infinite;
        }
      `}</style>
      {particles.map((p, i) => (
        <span
          key={i}
          className="login-particle"
          style={
            {
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
              background: dark
                ? "rgba(147, 197, 253, 0.55)"
                : "rgba(59, 130, 246, 0.4)",
              boxShadow: dark
                ? "0 0 8px 2px rgba(96, 165, 250, 0.35)"
                : "0 0 8px 2px rgba(59, 130, 246, 0.2)",
              "--particle-opacity": dark ? 0.6 : 0.45,
              animationDuration: `${p.duration}s`,
              animationDelay: `-${p.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success && result.user) {
      toast.success("Login successful! Redirecting...");
      setTimeout(() => {
        navigate(`/${result.user!.role!.toLowerCase()}`);
      }, 1000);
    } else {
      toast.error(result.error || "Login failed");
    }
  };

  const dark = theme === "dark";

  // Re-apply the persisted zoom so the login page honors the app-wide
  // zoom feature even before any ViewControls bar is mounted.
  useEffect(() => {
    const saved = Number(localStorage.getItem("app-zoom"));
    const zoom =
      Number.isFinite(saved) && saved >= 0.5 && saved <= 1.5 ? saved : 1;
    document.documentElement.style.zoom = String(zoom);
  }, []);

  const adjustZoom = (delta: number) => {
    const current = Number(localStorage.getItem("app-zoom")) || 1;
    const next = Math.min(
      1.5,
      Math.max(0.5, Math.round((current + delta) * 100) / 100),
    );
    document.documentElement.style.zoom = String(next);
    localStorage.setItem("app-zoom", String(next));
  };

  return (
    <div
      className={`min-h-dvh flex transition-colors duration-300 ${
        dark
          ? "bg-gray-900"
          : "bg-gradient-to-br from-blue-50 via-white to-indigo-100"
      }`}
    >
      {/* ===== Light / dark mode toggle ===== */}
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
        <motion.span
          key={theme}
          initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-center"
        >
          {dark ? (
            <SunIcon className="h-5 w-5" />
          ) : (
            <MoonIcon className="h-5 w-5" />
          )}
        </motion.span>
      </button>

      {/* ===== Hovering background particles ===== */}
      <BackgroundParticles dark={dark} />

      {/* ===== Left: animated AI branding panel ===== */}
      <div className="relative hidden lg:flex lg:w-[55%] flex-col justify-between overflow-hidden p-12">
        {/* Aurora / orb background */}
        <div className="absolute inset-0">
          <div
            className={`absolute -top-40 -left-40 w-[36rem] h-[36rem] rounded-full blur-[120px] animate-pulse ${
              dark ? "bg-blue-600/30" : "bg-blue-400/25"
            }`}
          />
          <div
            className={`absolute top-1/3 -right-40 w-[32rem] h-[32rem] rounded-full blur-[120px] animate-pulse [animation-delay:1s] ${
              dark ? "bg-purple-600/30" : "bg-purple-400/20"
            }`}
          />
          <div
            className={`absolute -bottom-40 left-1/3 w-[30rem] h-[30rem] rounded-full blur-[120px] animate-pulse [animation-delay:2s] ${
              dark ? "bg-indigo-500/25" : "bg-indigo-300/30"
            }`}
          />
          {/* Subtle grid */}
          <div
            className={`absolute inset-0 ${dark ? "opacity-[0.07]" : "opacity-[0.12]"}`}
            style={{
              backgroundImage: `
                linear-gradient(${dark ? "rgba(255,255,255,0.6)" : "rgba(30,58,138,0.5)"} 1px, transparent 1px),
                linear-gradient(90deg, ${dark ? "rgba(255,255,255,0.6)" : "rgba(30,58,138,0.5)"} 1px, transparent 1px)
              `,
              backgroundSize: "56px 56px",
              maskImage:
                "radial-gradient(ellipse at center, black 40%, transparent 100%)",
              WebkitMaskImage:
                "radial-gradient(ellipse at center, black 40%, transparent 100%)",
            }}
          />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <SparklesIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <span
              className={`block text-xl font-semibold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}
            >
              SmartEdufy
            </span>
            <span
              className={`block text-xs ${dark ? "text-slate-400" : "text-slate-600"}`}
            >
              The AI-Powered School Management System
            </span>
          </div>
        </div>

        {/* Headline + classroom illustration + feature cards */}
        <div className="relative z-10 max-w-lg space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div
              className={`inline-flex items-center gap-2 rounded-full border backdrop-blur px-3.5 py-2 text-xs font-medium mb-8 ${
                dark
                  ? "border-white/10 bg-white/5 text-blue-300"
                  : "border-blue-200 bg-white/60 text-blue-700"
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              AI-Powered School Management
            </div>
            <h1
              className={`text-4xl xl:text-5xl font-bold leading-tight tracking-tight ${
                dark ? "text-white" : "text-slate-900"
              }`}
            >
              The Future of School Management{" "}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
                Starts Here.
              </span>
            </h1>
          </motion.div>

          {/* ===== Classroom illustration: teacher + board + students ===== */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className={`mt-10 rounded-3xl border p-6 backdrop-blur-md transition-colors ${
              dark
                ? "border-white/10 bg-white/[0.04]"
                : "border-white bg-white/70 shadow-xl shadow-blue-900/5"
            }`}
          >
            <ClassroomIllustration dark={dark} />
          </motion.div>

          <div className="mt-7 space-y-4">
            {[
              {
                icon: BoltIcon,
                title: "AI-assisted grading",
                desc: "Score assessments in seconds, not hours.",
              },
              {
                icon: ChartBarIcon,
                title: "Live analytics",
                desc: "Real-time insight into class performance.",
              },
              {
                icon: AcademicCapIcon,
                title: "Personalised learning",
                desc: "Objectives tailored to every student.",
              },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  opacity: { duration: 0.5, delay: 0.3 + i * 0.15 },
                  x: { duration: 0.5, delay: 0.3 + i * 0.15 },
                }}
                className={`flex items-center gap-4 rounded-2xl border backdrop-blur-md p-4 transition-colors ${
                  dark
                    ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                    : "border-slate-200/80 bg-white/90 shadow-lg shadow-blue-900/5 hover:bg-white hover:shadow-xl"
                }`}
              >
                <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/10 flex items-center justify-center">
                  <f.icon className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <div
                    className={`text-sm font-semibold ${dark ? "text-white" : "text-slate-900"}`}
                  >
                    {f.title}
                  </div>
                  <div
                    className={`text-xs ${dark ? "text-slate-400" : "text-slate-600"}`}
                  >
                    {f.desc}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <p
          className={`relative z-10 mt-6 text-xs ${dark ? "text-slate-500" : "text-slate-500"}`}
        >
          © {new Date().getFullYear()} SmartEdufy — The AI-Powered School
          Management System.
        </p>
      </div>

      {/* ===== Right: form panel ===== */}
      <div className="relative flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-14 lg:px-8 min-h-screen">
        {/* Soft glow behind card (visible on mobile too) */}
        <div className="absolute inset-0 overflow-hidden lg:hidden">
          <div
            className={`absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[100px] ${dark ? "bg-blue-600/20" : "bg-blue-300/40"}`}
          />
          <div
            className={`absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-[100px] ${dark ? "bg-purple-600/20" : "bg-purple-300/40"}`}
          />
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center gap-2 mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <SparklesIcon className="h-5 w-5 text-white" />
              </div>
              <span
                className={`text-2xl font-semibold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}
              >
                SmartEdufy
              </span>
            </div>
            <span
              className={`block text-center text-xs ${dark ? "text-slate-400" : "text-slate-600"}`}
            >
              The AI-Powered School Management System
            </span>
          </div>

          <div
            className={`rounded-3xl border backdrop-blur-2xl shadow-2xl p-5 sm:p-8 lg:p-10 transition-colors duration-300 ${
              dark
                ? "border-white/10 bg-white/[0.03] shadow-black/40"
                : "border-slate-200 bg-white shadow-blue-900/15"
            }`}
          >
            {/* Badge */}
            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                dark
                  ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
                  : "border-blue-200 bg-blue-100 text-blue-700"
              }`}
            >
              <SparklesIcon className="h-3.5 w-3.5" />
              AI-Powered Platform
            </div>

            <h2
              className={`mt-5 text-2xl font-bold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}
            >
              Welcome back
            </h2>
            <p
              className={`mt-1.5 text-sm ${dark ? "text-slate-400" : "text-slate-600"}`}
            >
              Sign in to continue to your dashboard.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${dark ? "text-slate-400" : "text-slate-700"}`}
                >
                  Email address
                </label>
                <div className="relative">
                  <EnvelopeIcon
                    className={`pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 ${dark ? "text-slate-500" : "text-slate-500"}`}
                  />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full rounded-xl border py-3 pl-11 pr-4 text-sm font-medium transition-colors focus:outline-none focus:ring-2 ${
                      dark
                        ? "border-white/10 bg-white/[0.05] text-white placeholder-slate-500 focus:border-blue-500/50 focus:bg-white/[0.08] focus:ring-blue-500/30"
                        : "border-slate-300 bg-white text-slate-900 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:ring-blue-500/25"
                    }`}
                    placeholder="you@school.com"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${dark ? "text-slate-400" : "text-slate-700"}`}
                >
                  Password
                </label>
                <div className="relative">
                  <LockClosedIcon
                    className={`pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 ${dark ? "text-slate-500" : "text-slate-500"}`}
                  />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full rounded-xl border py-3 pl-11 pr-12 text-sm font-medium transition-colors focus:outline-none focus:ring-2 ${
                      dark
                        ? "border-white/10 bg-white/[0.05] text-white placeholder-slate-500 focus:border-blue-500/50 focus:bg-white/[0.08] focus:ring-blue-500/30"
                        : "border-slate-300 bg-white text-slate-900 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:ring-blue-500/25"
                    }`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${dark ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"}`}
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
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.01 }}
                whileTap={{ scale: loading ? 1 : 0.99 }}
                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {/* Shine sweep on hover */}
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Signing in…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    Sign in
                    <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                )}
              </motion.button>
            </form>

            {/* Teacher self-registration link */}
            <p className={`mt-4 text-center text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              Are you a teacher?{' '}
              <Link
                to="/register/teacher"
                className={`font-semibold ${dark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
              >
                Register here →
              </Link>
            </p>

            {/* Divider */}
            <div className="mt-8 flex items-center gap-3">
              <div
                className={`h-px flex-1 ${dark ? "bg-white/10" : "bg-slate-200"}`}
              />
              <span
                className={`text-[11px] uppercase tracking-widest ${dark ? "text-slate-500" : "text-slate-400"}`}
              >
                Demo accounts
              </span>
              <div
                className={`h-px flex-1 ${dark ? "bg-white/10" : "bg-slate-200"}`}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 min-[420px]:grid-cols-2 gap-2">
              {[
                ["admin@school.com", "admin123"],
                ["teacher@school.com", "teacher123"],
                ["parent@school.com", "parent123"],
                ["student@school.com", "student123"],
              ].map(([em, pw]) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => {
                    setEmail(em);
                    setPassword(pw);
                  }}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                    dark
                      ? "border-white/10 bg-white/[0.04] text-slate-300 hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-white"
                      : "border-slate-200 bg-white/70 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-slate-900"
                  }`}
                >
                  <span
                    className={`block truncate text-[11px] font-medium capitalize ${dark ? "text-slate-400" : "text-slate-500"}`}
                  >
                    {em.split("@")[0]}
                  </span>
                  {pw}
                </button>
              ))}
            </div>
          </div>

          <p
            className={`mt-6 text-center text-[11px] sm:text-xs ${dark ? "text-slate-500" : "text-slate-500"}`}
          >
            © {new Date().getFullYear()} SmartEdufy — The AI-Powered School
            Management System.
          </p>

          {/* Zoom controls (persists like the in-app ViewControls) */}
          <div className="mt-4 flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => adjustZoom(-0.1)}
              className={`h-11 w-11 sm:h-8 sm:w-8 rounded-lg border text-base sm:text-sm font-semibold transition-colors active:scale-95 ${
                dark
                  ? "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10"
                  : "border-slate-200 bg-white/70 text-slate-600 hover:bg-white"
              }`}
              aria-label="Zoom out"
              title="Zoom out"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => {
                document.documentElement.style.zoom = "1";
                localStorage.setItem("app-zoom", "1");
              }}
              className={`px-4 sm:px-3 h-11 sm:h-8 rounded-lg border text-xs font-medium transition-colors active:scale-95 ${
                dark
                  ? "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10"
                  : "border-slate-200 bg-white/70 text-slate-600 hover:bg-white"
              }`}
              title="Reset zoom"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => adjustZoom(0.1)}
              className={`h-11 w-11 sm:h-8 sm:w-8 rounded-lg border text-base sm:text-sm font-semibold transition-colors active:scale-95 ${
                dark
                  ? "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10"
                  : "border-slate-200 bg-white/70 text-slate-600 hover:bg-white"
              }`}
              aria-label="Zoom in"
              title="Zoom in"
            >
              +
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
/**
 * Decorative classroom scene: a teacher at an AI whiteboard with three
 * students at desks. Pure SVG so it adapts to dark/light via CSS variables.
 */
function ClassroomIllustration({ dark }: { dark: boolean }) {
  const line = dark ? "#334155" : "#cbd5e1"; // floor / desk strokes
  const board = dark ? "#0f172a" : "#ffffff"; // whiteboard fill
  const boardEdge = dark ? "#1e293b" : "#e2e8f0";
  const ink = dark ? "#93c5fd" : "#2563eb"; // writing on board
  const skin = dark ? "#fcd9b8" : "#f2c49b";
  const body1 = dark ? "#3b82f6" : "#2563eb";
  const body2 = dark ? "#8b5cf6" : "#7c3aed";
  const body3 = dark ? "#06b6d4" : "#0891b2";

  return (
    <svg
      viewBox="0 0 520 200"
      className="w-full h-auto"
      role="img"
      aria-label="Teacher and students in a smart classroom"
    >
      {/* Floor */}
      <line
        x1="10"
        y1="180"
        x2="510"
        y2="180"
        stroke={line}
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Whiteboard */}
      <rect
        x="30"
        y="20"
        width="220"
        height="110"
        rx="10"
        fill={board}
        stroke={boardEdge}
        strokeWidth="2"
      />
      {/* AI sparkle + writing */}
      <text
        x="48"
        y="55"
        fontSize="16"
        fontWeight="700"
        fill={ink}
        fontFamily="system-ui"
      >
        AI Insights
      </text>
      <line
        x1="48"
        y1="68"
        x2="220"
        y2="68"
        stroke={ink}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.7"
      />
      <line
        x1="48"
        y1="82"
        x2="190"
        y2="82"
        stroke={ink}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.5"
      />
      <line
        x1="48"
        y1="96"
        x2="205"
        y2="96"
        stroke={ink}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.35"
      />
      {/* Sparkle star */}
      <path
        d="M228 34 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4 z"
        fill={ink}
        opacity="0.9"
      />

      {/* Teacher (standing, pointing at board) */}
      <g>
        <circle cx="300" cy="60" r="14" fill={skin} />
        {/* hair */}
        <path
          d="M286 56 a14 14 0 0 1 28 0 l-4 -6 -20 0 z"
          fill={dark ? "#1e293b" : "#334155"}
        />
        <rect x="288" y="74" width="24" height="52" rx="10" fill={body1} />
        {/* pointing arm to board */}
        <line
          x1="292"
          y1="86"
          x2="256"
          y2="76"
          stroke={body1}
          strokeWidth="7"
          strokeLinecap="round"
        />
        <circle cx="256" cy="76" r="4" fill={skin} />
        {/* legs */}
        <line
          x1="294"
          y1="126"
          x2="294"
          y2="176"
          stroke={dark ? "#1e293b" : "#334155"}
          strokeWidth="7"
          strokeLinecap="round"
        />
        <line
          x1="306"
          y1="126"
          x2="306"
          y2="176"
          stroke={dark ? "#1e293b" : "#334155"}
          strokeWidth="7"
          strokeLinecap="round"
        />
      </g>

      {/* Desks + students */}
      {[
        { x: 380, body: body2 },
        { x: 440, body: body3 },
        { x: 500 - 20, body: "#f59e0b" },
      ].map((s, i) => (
        <g key={i}>
          {/* student head */}
          <circle cx={s.x} cy="118" r="11" fill={skin} />
          <path
            d={`M${s.x - 11} 114 a11 11 0 0 1 22 0 l-3 -5 -16 0 z`}
            fill={dark ? "#1e293b" : "#334155"}
          />
          {/* body behind desk */}
          <rect
            x={s.x - 12}
            y="130"
            width="24"
            height="26"
            rx="9"
            fill={s.body}
          />
          {/* desk */}
          <line
            x1={s.x - 26}
            y1="152"
            x2={s.x + 26}
            y2="152"
            stroke={line}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <line
            x1={s.x - 20}
            y1="152"
            x2={s.x - 20}
            y2="178"
            stroke={line}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <line
            x1={s.x + 20}
            y1="152"
            x2={s.x + 20}
            y2="178"
            stroke={line}
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>
      ))}
    </svg>
  );
}
