import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { authService } from "../../services/authService";
import toast from "react-hot-toast";

const formatNGN = (amount: number) =>
  `₦${Number(amount || 0).toLocaleString("en-NG")}`;

import { api } from "../../utils/api";

const formatNumberToken = (n: number) =>
  Number(n || 0).toLocaleString("en-NG");

/** The school's subscription as returned by /api/auth/me. */
interface SchoolSubscription {
  planName: string;
  planType: "FREE" | "FIXED" | "STUDENT_BASED";
  perStudentRate?: number | null;
  aiTokenAllowance?: number | null;
  billingCycle: string;
  pricePerCycle: number;
  studentSnapshotCount?: number | null;
  status: string;
  trial: boolean;
  endDate?: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  TRIAL:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  PENDING_PAYMENT:
    "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  PENDING_RENEWAL:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  EXPIRED: "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
};

function billingLabel(cycle: string) {
  return cycle.replace("_", ".").toLowerCase();
}

/**
 * Standalone Subscription page — route: /admin/subscription (and
 * /teacher/subscription). Shows ONLY the plan assigned to this school by the
 * platform — no marketing/pricing cards.
 */
export default function SubscriptionPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [sub, setSub] = useState<SchoolSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService
      .getMe()
      .then((me: any) => setSub(me.subscription ?? null))
      .catch(() => toast.error("Could not load your subscription"))
      .finally(() => setLoading(false));
  }, []);

  const priceText =
    sub?.planType === "STUDENT_BASED" && sub.studentSnapshotCount != null
      ? `${formatNGN(sub.pricePerCycle)} (${sub.studentSnapshotCount} students × ${formatNGN(sub.perStudentRate || 0)})`
      : sub
        ? formatNGN(sub.pricePerCycle)
        : "";

  // Token model of the assigned plan: bundled tokens per paid cycle, or zero →
  // the school buys its own AI tokens (top-up) instead of receiving an allowance.
  const tokenAllowance = sub?.aiTokenAllowance ?? 0;
  const noTokens = tokenAllowance === 0;

  return (
    <div
      className={`min-h-screen px-3 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 md:pb-8 ${
        theme === "dark"
          ? "bg-[#0B1120]"
          : "bg-gradient-to-br from-blue-50 via-white to-blue-50"
      }`}
    >
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-10"
        >
          <button
            onClick={() => navigate(-1)}
            className="mb-4 inline-flex items-center gap-1.5 rounded-xl bg-white/80 px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm ring-1 ring-gray-200 transition hover:bg-white hover:text-gray-900 dark:bg-gray-800/80 dark:text-gray-300 dark:ring-gray-700 dark:hover:text-white"
          >
            <svg
              className="h-4 w-4"
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
            Back
          </button>
          <h1 className="text-2xl sm:text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300 bg-clip-text text-transparent inline-block">
            Subscription
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-base sm:text-lg">
            Your school's SmartEdufy plan, billing and Edufy AI access — as
            assigned by the platform.
          </p>
        </motion.div>

        {/* ---- The school's actual assigned subscription & billing (only) ---- */}
        {loading ? (
          <div className="animate-pulse rounded-2xl bg-gray-200/60 dark:bg-gray-800/60 h-28" />
        ) : sub ? (
          <div className="rounded-2xl bg-white dark:bg-gray-900/70 border border-gray-200/80 dark:border-white/10 shadow-sm p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Current plan
                </p>
                <p className="mt-1 text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">
                  {sub.planName}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {sub.planType === "STUDENT_BASED"
                    ? "Billing type: Pay Per Student — priced from your enrolled-student snapshot"
                    : "Billing type: Subscription — flat fee per cycle"}
                  {" · "}
                  billed {billingLabel(sub.billingCycle)}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  STATUS_STYLES[sub.status] || STATUS_STYLES.EXPIRED
                }`}
              >
                {sub.trial ? "TRIAL" : sub.status.replace("_", " ")}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                  {sub.planType === "STUDENT_BASED"
                    ? "Subscription fee (per cycle)"
                    : "Subscription fee"}
                </p>
                <p className="mt-1 text-lg font-extrabold text-blue-900 dark:text-blue-200">
                  {priceText}
                </p>
                {sub.planType === "STUDENT_BASED" && (
                  <p className="mt-1 text-[11px] text-blue-600 dark:text-blue-400">
                    New enrollments bill at the next cycle's snapshot.
                  </p>
                )}
              </div>
              {sub.endDate && (
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    {sub.status === "ACTIVE" ? "Renews / expires" : "Valid until"}
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-gray-900 dark:text-white">
                    {new Date(sub.endDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              <div
                className={`rounded-xl p-4 ${
                  noTokens
                    ? "bg-amber-50 dark:bg-amber-500/10"
                    : "bg-emerald-50 dark:bg-emerald-500/10"
                }`}
              >
                <p
                  className={`text-xs font-bold uppercase tracking-wider ${
                    noTokens
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  Edufy AI tokens
                </p>
                {noTokens ? (
                  <>
                    <p className="mt-1 text-lg font-extrabold text-amber-900 dark:text-amber-200">
                      No bundled tokens
                    </p>
                    <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                      Your plan does not include AI tokens. Buy tokens from the
                      Buy Tokens section in Settings to top up your wallet and
                      keep Edufy AI running.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-lg font-extrabold text-emerald-900 dark:text-emerald-200">
                      {formatNumberToken(tokenAllowance)} / cycle
                    </p>
                    <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                      Credited to your wallet each paid billing cycle. Need more?
                      Top up any time from Buy Tokens in Settings.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-gray-900/70 border border-gray-200/80 dark:border-white/10 shadow-sm p-5 sm:p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No subscription plan has been assigned to your school yet. Your
              SmartEdufy finance contact assigns one — it will appear here once
              active.
            </p>
          </div>
        )}

        {/* ---- This school's invoices (generated by the platform billing
             system; paid invoices show their payment reference) ---- */}
        <SchoolInvoices />
      </div>
    </div>
  );
}

/** The school's own invoices, fetched from /api/tokens/billing/invoices. */
function SchoolInvoices() {
  const { theme } = useTheme();
  const [invoices, setInvoices] = useState<
    {
      id: string;
      invoiceNo: string;
      periodKey: string;
      amount: number;
      status: string;
      dueDate: string;
      description?: string | null;
      paymentRef?: string | null;
    }[]
  >([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    api
      .get("/tokens/billing/invoices")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setInvoices(Array.isArray(data) ? data : []);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  const cardBase =
    theme === "dark"
      ? "bg-gray-900/80 border-white/10"
      : "bg-white border-gray-200/80";
  const muted = theme === "dark" ? "text-gray-400" : "text-gray-500";

  if (state === "loading")
    return <div className="mt-8 animate-pulse rounded-2xl bg-gray-200/60 dark:bg-gray-800/60 h-24" />;
  if (state === "error") return null; // non-critical section

  return (
    <div className="mt-8">
      <h2
        className={`text-lg font-extrabold ${theme === "dark" ? "text-white" : "text-gray-900"}`}
      >
        Billing & Invoices
      </h2>
      <p className={`text-xs mt-1 ${muted}`}>
        Invoices generated by SmartEdufy for your plan, per billing cycle.
      </p>
      {invoices.length === 0 ? (
        <div className={`mt-4 rounded-2xl border p-6 text-sm ${cardBase} ${muted}`}>
          No invoices yet — they appear here once your billing cycle generates one.
        </div>
      ) : (
        <div className={`mt-4 overflow-x-auto rounded-2xl border ${cardBase}`}>
          <table className="w-full text-sm">
            <thead>
              <tr
                className={`border-b ${theme === "dark" ? "border-gray-800" : "border-gray-200"}`}
              >
                {["Invoice", "Period", "Amount", "Due", "Status"].map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider ${muted}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className={`border-b last:border-0 ${theme === "dark" ? "border-gray-800/60" : "border-gray-100"}`}
                >
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{inv.invoiceNo}</td>
                  <td className="px-4 py-3">{inv.periodKey}</td>
                  <td className="px-4 py-3 font-bold">{formatNGN(inv.amount)}</td>
                  <td className="px-4 py-3">{new Date(inv.dueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        inv.status === "PAID"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                          : inv.status === "VOID"
                            ? "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                      }`}
                    >
                      {inv.status}
                    </span>
                    {inv.paymentRef && (
                      <span className={`block mt-0.5 text-[10px] ${muted}`}>
                        Ref: {inv.paymentRef}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
