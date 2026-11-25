// Parent School Fees page — shows each child's fee account (per fee
// structure/term) with an outstanding balance and a "Pay now" button that
// starts a Paystack hosted checkout. The page NEVER confirms the payment
// itself; the backend verifies with Paystack and records the payment.
import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useParentChildren } from "../../hooks/useParentData";
import { api } from "../../utils/api";
import { getErrorMessage } from "../../hooks/queryHelpers";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface FeeRow {
  id: string;
  className: string;
  term: string;
  amount: number;
  amountPaid: number;
  status: string;
  deadline?: string | null;
}

const fmtN = (n: number) => `₦${Number(n || 0).toLocaleString()}`;

export default function ParentFees() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const isDark = theme === "dark";
  const { data, isLoading } = useParentChildren(token);
  const children = data?.children ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = children.find((c) => c.id === selectedId) ?? children[0];

  const [paying, setPaying] = useState(false);
  const [payAmount, setPayAmount] = useState("");

  // Real fee rows from /students/:id/fees (now backed by StudentFee rows).
  const feesQuery = useQuery({
    queryKey: ["parent-child-fees", selected?.id],
    queryFn: async () => {
      const res = await api.get(`/students/${selected!.id}/fees`, token);
      const body = await res.json().catch(() => []);
      return (Array.isArray(body) ? body : body?.data || []) as FeeRow[];
    },
    enabled: !!selected && !!token,
  });
  const feeRows = useMemo(() => feesQuery.data || [], [feesQuery.data]);
  const feeTotal = feeRows.reduce((s, f) => s + Number(f.amount || 0), 0);
  const feePaid = feeRows.reduce((s, f) => s + Number(f.amountPaid || 0), 0);
  const feeBalance = Math.max(0, feeTotal - feePaid);

  /** Start a Paystack checkout for the child's outstanding balance. */
  const startPayment = async () => {
    if (!selected) return;
    setPaying(true);
    try {
      const body: any = { studentId: selected.id };
      const amt = Number(payAmount);
      if (amt > 0) body.amount = amt;
      const res = await api.post(
        "/payments/school-fees/initialize",
        body,
        token,
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.authorizationUrl) {
        throw new Error(
          json?.error || json?.message || "Could not start payment",
        );
      }
      toast.success("Redirecting to secure Paystack checkout…");
      // Hosted checkout — Paystack redirects back to /payment/callback,
      // which verifies server-side before any success state is shown.
      window.location.href = json.authorizationUrl;
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not start payment"));
      setPaying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="h-10 w-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          Loading fees…
        </p>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <p
        className={`py-24 text-center text-sm ${
          isDark ? "text-gray-500" : "text-gray-400"
        }`}
      >
        No children linked to your account yet.
      </p>
    );
  }

  const card = isDark
    ? "bg-gray-900/70 border-white/10"
    : "bg-white border-gray-200 shadow-sm";

  return (
    <div className="max-w-lg mx-auto">
      <h1
        className={`text-xl font-bold mb-4 ${
          isDark ? "text-white" : "text-gray-900"
        }`}
      >
        School Fees
      </h1>

      {/* Child chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
        {children.map((child) => {
          const active = selected?.id === child.id;
          return (
            <button
              key={child.id}
              onClick={() => {
                setSelectedId(child.id);
                setPayAmount("");
              }}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border active:scale-95 transition-transform ${
                active
                  ? "bg-blue-600 border-blue-600 text-white"
                  : isDark
                  ? "bg-gray-900 border-white/10 text-gray-300"
                  : "bg-white border-gray-200 text-gray-700 shadow-sm"
              }`}
            >
              {child.name.split(" ")[0]}
            </button>
          );
        })}
      </div>

      {feesQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          {/* Balance hero card */}
          <div
            className={`mt-4 rounded-3xl p-5 text-center ${
              feeBalance > 0
                ? isDark
                  ? "bg-gradient-to-br from-red-900/40 to-gray-900 border border-red-500/30"
                  : "bg-gradient-to-br from-red-500 to-rose-600"
                : isDark
                ? "bg-gradient-to-br from-green-900/40 to-gray-900 border border-green-500/30"
                : "bg-gradient-to-br from-emerald-500 to-green-600"
            }`}
          >
            <span className="inline-flex h-14 w-14 rounded-2xl items-center justify-center bg-white/15 mb-3">
              {feeBalance > 0 ? (
                <ExclamationCircleIcon className="h-7 w-7 text-white" />
              ) : (
                <CheckCircleIcon className="h-7 w-7 text-white" />
              )}
            </span>
            <p className="text-xs font-medium text-white/80 uppercase tracking-wide">
              {feeBalance > 0 ? "Outstanding balance" : "All paid up 🎉"}
            </p>
            <p className="mt-1 text-3xl font-extrabold text-white">
              {fmtN(feeBalance)}
            </p>
            <p className="mt-1 text-xs text-white/70">
              {selected?.name.split(" ")[0]} ·{" "}
              {selected?.class?.name || "No class"}
            </p>
          </div>

          {/* Pay now */}
          {feeBalance > 0 && (
            <div className={`mt-4 rounded-3xl p-4 border ${card}`}>
              <p
                className={`text-sm font-semibold mb-3 ${
                  isDark ? "text-gray-200" : "text-gray-800"
                }`}
              >
                <CreditCardIcon className="h-4 w-4 inline mr-1 -mt-0.5" />
                Pay online (secured by Paystack)
              </p>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  max={feeBalance}
                  inputMode="decimal"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder={`Full balance ${fmtN(feeBalance)}`}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark
                      ? "bg-gray-800 border-white/10 text-white"
                      : "bg-white border-gray-200 text-gray-900"
                  }`}
                />
                <button
                  disabled={paying}
                  onClick={startPayment}
                  className="inline-flex items-center gap-1.5 shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {paying ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>
                      Starting…
                    </>
                  ) : (
                    <>
                      <BanknotesIcon className="h-4 w-4" />
                      Pay now
                    </>
                  )}
                </button>
              </div>
              <p
                className={`mt-2 text-xs ${
                  isDark ? "text-gray-500" : "text-gray-400"
                }`}
              >
                Leave the amount blank to pay the full outstanding balance.
              </p>
            </div>
          )}

          {/* Paid vs total bar */}
          <div className={`mt-4 rounded-3xl p-4 border ${card}`}>
            <div className="flex items-center justify-between mb-2">
              <p
                className={`text-sm font-semibold ${
                  isDark ? "text-gray-200" : "text-gray-800"
                }`}
              >
                <BanknotesIcon className="h-4 w-4 inline mr-1 -mt-0.5" />
                Payment progress
              </p>
              <p
                className={`text-xs font-bold ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {fmtN(feePaid)} / {fmtN(feeTotal)}
              </p>
            </div>
            <div
              className={`h-3 rounded-full overflow-hidden ${
                isDark ? "bg-white/10" : "bg-gray-100"
              }`}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-700"
                style={{
                  width: `${
                    feeTotal
                      ? Math.min(100, Math.round((feePaid / feeTotal) * 100))
                      : 100
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Fee items */}
          <div
            className={`mt-4 rounded-3xl border overflow-hidden divide-y ${card} ${
              isDark ? "divide-white/5" : "divide-gray-100"
            }`}
          >
            <p
              className={`px-4 pt-4 pb-2 text-xs font-bold uppercase tracking-wider ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Fee breakdown ({feeRows.length}{" "}
              {feeRows.length === 1 ? "item" : "items"})
            </p>
            {feeRows.length === 0 ? (
              <p
                className={`px-4 pb-4 text-sm ${
                  isDark ? "text-gray-500" : "text-gray-400"
                }`}
              >
                No fees have been assigned yet.
              </p>
            ) : (
              feeRows.map((f) => {
                const paid = f.status === "PAID";
                const partial = Number(f.amountPaid) > 0 && !paid;
                return (
                  <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                    <span
                      className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                        paid
                          ? isDark
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-emerald-100 text-emerald-600"
                          : partial
                          ? isDark
                            ? "bg-amber-500/15 text-amber-400"
                            : "bg-amber-100 text-amber-600"
                          : isDark
                          ? "bg-red-500/15 text-red-400"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {paid ? (
                        <CheckCircleIcon className="h-5 w-5" />
                      ) : (
                        <ExclamationCircleIcon className="h-5 w-5" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-semibold truncate ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {f.term || "Fee"}
                        {f.className ? ` · ${f.className}` : ""}
                      </p>
                      <p
                        className={`text-xs ${
                          isDark ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {fmtN(f.amountPaid)} paid of {fmtN(f.amount)} ·{" "}
                        {paid ? "Paid" : partial ? "Partial" : "Pending"}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-bold shrink-0 ${
                        paid
                          ? "text-emerald-500"
                          : isDark
                          ? "text-white"
                          : "text-gray-900"
                      }`}
                    >
                      {fmtN(Math.max(0, f.amount - f.amountPaid))}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
