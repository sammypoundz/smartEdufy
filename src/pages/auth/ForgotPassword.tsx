import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logoBlackUrl from "../../assets/smart edufy II.png";
import logoWhiteUrl from "../../assets/smart edufy.png";
import { useTheme } from "../../contexts/ThemeContext";
import toast from "react-hot-toast";
import { api } from "../../utils/api";
import {
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

/**
 * Combined "Forgot password" and "Reset password" page.
 * - /forgot-password : email entry → backend emails a reset link (via the
 *   pkluster.online mailer script).
 * - /reset-password?token=...&email=... : the emailed landing page; the user
 *   picks a new password and the single-use token is consumed.
 */
export default function ForgotPassword() {
  const { theme } = useTheme();
  const location = useLocation();
  const isReset = new URLSearchParams(location.search).has("token");

  const [email, setEmail] = useState(
    new URLSearchParams(location.search).get("email") || "",
  );
  const [token] = useState(
    new URLSearchParams(location.search).get("token") || "",
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Request failed");
      setDone(true);
      toast.success("Reset link sent — check your inbox.");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/auth/reset-password", {
        token,
        email,
        password,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Reset failed");
      setDone(true);
      toast.success("Password reset — log in with your new password.");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex justify-center">
          <img
            src={theme === "dark" ? logoWhiteUrl : logoBlackUrl}
            alt="SmartEdufy logo"
            className="h-14 w-auto object-contain"
            draggable={false}
          />
        </div>
        {isReset ? (
          <>
            <h1 className="text-xl font-bold text-gray-900">
              Choose a new password
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Enter a new password for{" "}
              <span className="font-semibold">{email || "your account"}</span>.
            </p>
            {done ? (
              <div className="mt-6 rounded-lg bg-green-50 p-4 text-sm text-green-800">
                Password updated.{" "}
                <Link to="/login" className="font-semibold underline">
                  Go to login
                </Link>
              </div>
            ) : !token ? (
              <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                Invalid reset link.{" "}
                <Link to="/forgot-password" className="font-semibold underline">
                  Request a new one
                </Link>
                .
              </div>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={submitReset}>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-700">
                    New password
                  </label>
                  <div className="relative">
                    <LockClosedIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-10 text-sm font-medium shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                      placeholder="At least 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Confirm password
                  </label>
                  <LockClosedIcon className="hidden" />
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 px-4 text-sm font-medium shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                    placeholder="Repeat new password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
                >
                  {loading ? (
                    "Resetting…"
                  ) : (
                    <>
                      Reset password <ArrowRightIcon className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-900">
              Forgot your password?
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Enter your account email and we'll send you a reset link.
            </p>
            {done ? (
              <div className="mt-6 rounded-lg bg-green-50 p-4 text-sm text-green-800">
                If an account exists for that email, a reset link is on its way.
                Check your inbox (and spam folder).{" "}
                <Link to="/login" className="font-semibold underline">
                  Back to login
                </Link>
              </div>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={submitRequest}>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Email address
                  </label>
                  <div className="relative">
                    <EnvelopeIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm font-medium shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                      placeholder="you@school.com"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
                >
                  {loading ? (
                    "Sending…"
                  ) : (
                    <>
                      Send reset link <ArrowRightIcon className="h-4 w-4" />
                    </>
                  )}
                </button>
                <p className="text-center text-sm text-gray-500">
                  <Link
                    to="/login"
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    Back to login
                  </Link>
                </p>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
