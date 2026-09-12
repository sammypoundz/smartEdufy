import { useState } from "react";
import {
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useParentChildren, useChildStats } from "../../hooks/useParentData";

export default function ParentFees() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const isDark = theme === "dark";
  const { data, isLoading } = useParentChildren(token);
  const children = data?.children ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = children.find((c) => c.id === selectedId) ?? children[0];
  const { data: stats, isLoading: statsLoading } = useChildStats(
    selected,
    token,
  );

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
        className={`py-24 text-center text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}
      >
        No children linked to your account yet.
      </p>
    );
  }

  return (
    <div>
      <h1
        className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}
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
              onClick={() => setSelectedId(child.id)}
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

      {statsLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        stats && (
          <>
            {/* Balance hero card */}
            <div
              className={`mt-4 rounded-3xl p-5 text-center ${
                stats.feeBalance > 0
                  ? isDark
                    ? "bg-gradient-to-br from-red-900/40 to-gray-900 border border-red-500/30"
                    : "bg-gradient-to-br from-red-500 to-rose-600"
                  : isDark
                    ? "bg-gradient-to-br from-green-900/40 to-gray-900 border border-green-500/30"
                    : "bg-gradient-to-br from-emerald-500 to-green-600"
              }`}
            >
              <span className="inline-flex h-14 w-14 rounded-2xl items-center justify-center bg-white/15 mb-3">
                {stats.feeBalance > 0 ? (
                  <ExclamationCircleIcon className="h-7 w-7 text-white" />
                ) : (
                  <CheckCircleIcon className="h-7 w-7 text-white" />
                )}
              </span>
              <p className="text-xs font-medium text-white/80 uppercase tracking-wide">
                {stats.feeBalance > 0
                  ? "Outstanding balance"
                  : "All paid up 🎉"}
              </p>
              <p className="mt-1 text-3xl font-extrabold text-white">
                ₦{stats.feeBalance.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-white/70">
                {selected?.name.split(" ")[0]} ·{" "}
                {selected?.class?.name || "No class"}
              </p>
            </div>

            {/* Paid vs total bar */}
            <div
              className={`mt-4 rounded-3xl p-4 border ${isDark ? "bg-gray-900/70 border-white/10" : "bg-white border-gray-200 shadow-sm"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <p
                  className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}
                >
                  <BanknotesIcon className="h-4 w-4 inline mr-1 -mt-0.5" />
                  Payment progress
                </p>
                <p
                  className={`text-xs font-bold ${isDark ? "text-gray-400" : "text-gray-500"}`}
                >
                  ₦{stats.feePaid.toLocaleString()} / ₦
                  {stats.feeTotal.toLocaleString()}
                </p>
              </div>
              <div
                className={`h-3 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-gray-100"}`}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-700"
                  style={{
                    width: `${stats.feeTotal ? Math.min(100, Math.round((stats.feePaid / stats.feeTotal) * 100)) : 100}%`,
                  }}
                />
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}
