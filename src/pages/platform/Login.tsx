// Super Admin console login — separate realm from the school login.
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import logoUrl from "../../assets/smart edufy icon.png";
import { usePlatformAuth } from "../../contexts/PlatformAuthContext";
import { useTheme } from "../../contexts/ThemeContext";

export default function PlatformLogin() {
  const { login } = usePlatformAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.success) navigate("/platform");
    else setError(res.error || "Login failed");
  };

  const dark = theme === "dark";
  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 ${
        dark ? "bg-gray-950" : "bg-gray-50"
      }`}
    >
      <div
        className={`w-full max-w-md rounded-3xl p-8 shadow-2xl border ${
          dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
        }`}
      >
        <div className="text-center mb-8">
          <img
            src={logoUrl}
            alt="SmartEdufy"
            className="h-16 w-16 mx-auto rounded-2xl object-contain mb-3 shadow-lg"
          />
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            SmartEdufy
          </h1>
          <p
            className={`mt-1 text-sm font-semibold ${
              dark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Super Admin Console
          </p>
        </div>
        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`mt-1 w-full rounded-xl px-4 py-3 border ${
                dark
                  ? "bg-gray-800 border-gray-700 text-white"
                  : "bg-white border-gray-300"
              } focus:ring-2 focus:ring-blue-500 outline-none`}
              placeholder="admin@smartedufy.ng"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`mt-1 w-full rounded-xl px-4 py-3 border ${
                dark
                  ? "bg-gray-800 border-gray-700 text-white"
                  : "bg-white border-gray-300"
              } focus:ring-2 focus:ring-blue-500 outline-none`}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 font-bold text-white shadow-lg hover:shadow-xl transition disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <p className="mt-6 text-center text-[11px] text-gray-500">
          Platform accounts are provisioned by SmartEdufy.{" "}
          <Link to="/login" className="text-blue-500 hover:underline">
            School login
          </Link>
        </p>
      </div>
    </div>
  );
}
