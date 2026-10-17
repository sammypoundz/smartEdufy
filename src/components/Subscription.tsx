import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckIcon,
  SparklesIcon,
  ClockIcon,
  MinusIcon,
} from "@heroicons/react/24/solid";
import {
  PRICING,
  BILLING_PERIODS,
  computeSavings,
  planPriceLabel,
  type BillingPeriod,
  type PricingPlan,
} from "../config/pricing";
import { useTheme } from "../contexts/ThemeContext";

interface SubscriptionProps {
  /** The school's current plan id (Free by default until a real subscription exists). */
  currentPlan: string;
  /** Short human-readable subscription status, e.g. "Active — renews 12 Feb 2026". */
  statusText: string;
  /** Called when an administrator picks a plan. No payment flow is faked here —
   *  the parent decides how to hand off to the real subscription flow. */
  onSelectPlan: (planId: string, period: BillingPeriod) => void;
}

/** Reusable, theme-aware pricing section built on the centralised pricing config. */
export default function Subscription({
  currentPlan,
  statusText,
  onSelectPlan,
}: SubscriptionProps) {
  const { theme } = useTheme();
  const [period, setPeriod] = useState<BillingPeriod>("monthly");

  const cardBase =
    theme === "dark"
      ? "bg-gray-900/80 border-white/10"
      : "bg-white border-gray-200/80";
  const muted = theme === "dark" ? "text-gray-400" : "text-gray-500";

  const planState = (
    plan: PricingPlan,
  ): "current" | "upgrade" | "downgrade" => {
    const order = PRICING.map((p) => p.id);
    const cur = order.indexOf(currentPlan as never);
    const mine = order.indexOf(plan.id);
    if (mine === cur) return "current";
    return mine > cur ? "upgrade" : "downgrade";
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header + current plan status */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl p-4 ${
          theme === "dark" ? "bg-blue-900/20" : "bg-blue-50"
        }`}
      >
        <div>
          <p
            className={`text-sm font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}
          >
            Current plan:{" "}
            <span className="text-blue-600 dark:text-blue-400">
              {PRICING.find((p) => p.id === currentPlan)?.name ?? "Free"}
            </span>
          </p>
          <p className={`text-xs mt-0.5 ${muted}`}>{statusText}</p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
            Free entry plan
          </span>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
            Edufy AI on paid plans
          </span>
        </div>
      </div>

      {/* Billing switcher */}
      <div>
        <div
          className={`inline-flex w-full max-w-full flex-wrap rounded-2xl border p-1 gap-1 ${cardBase}`}
          role="tablist"
          aria-label="Billing period"
        >
          {BILLING_PERIODS.map((bp) => (
            <button
              key={bp.id}
              role="tab"
              aria-selected={period === bp.id}
              onClick={() => setPeriod(bp.id)}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-all sm:px-4 ${
                period === bp.id
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                  : theme === "dark"
                    ? "text-gray-300 hover:bg-white/10"
                    : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {bp.label}
            </button>
          ))}
        </div>
        <p className={`mt-2 text-xs ${muted}`}>
          {period === "termly" &&
            "Termly billing covers one academic term (3 months)."}
          {period === "annual" &&
            "Annual billing covers one academic session (12 months)."}
          {period === "monthly" &&
            "Monthly billing renews every calendar month. Switch to termly or annual to save."}
        </p>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {PRICING.map((plan, i) => {
          const state = planState(plan);
          const savings = computeSavings(plan, period);
          const price = planPriceLabel(plan, period);
          const highlighted = plan.recommended;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`relative flex flex-col rounded-3xl border p-4 sm:p-6 shadow-sm transition-shadow hover:shadow-lg ${
                highlighted
                  ? "border-blue-500 ring-2 ring-blue-500/30 shadow-lg"
                  : cardBase
              }`}
            >
              {highlighted && (
                <span className="absolute -top-3 left-4 sm:left-1/2 sm:-translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
                  <SparklesIcon className="h-3 w-3" /> Recommended
                </span>
              )}

              <h3
                className={`text-lg font-extrabold ${theme === "dark" ? "text-white" : "text-gray-900"}`}
              >
                {plan.name}
              </h3>
              <p className={`mt-0.5 text-xs ${muted}`}>{plan.tagline}</p>

              {/* Capacity */}
              <div
                className={`mt-3 rounded-xl px-3 py-2 text-xs font-semibold ${
                  theme === "dark"
                    ? "bg-gray-800/60 text-gray-200"
                    : "bg-gray-50 text-gray-700"
                }`}
              >
                👥 {plan.capacity}
                <span
                  className={`block mt-0.5 text-[10px] font-normal ${muted}`}
                >
                  {plan.capacityNote}
                </span>
              </div>

              {/* Price */}
              <div className="mt-4">
                <span
                  className={`text-xl sm:text-3xl font-black tracking-tight ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                >
                  {price.amount}
                </span>
                {price.suffix && (
                  <span className={`ml-1 text-xs font-medium ${muted}`}>
                    {price.suffix}
                  </span>
                )}
                {savings !== null && (
                  <p className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                    Save{" "}
                    {planPriceLabel(plan, "monthly").amount === "₦0"
                      ? ""
                      : `₦${savings.toLocaleString("en-NG")}`}{" "}
                    with {period} billing
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="mt-5 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f.label} className="flex items-start gap-2 text-xs leading-relaxed">
                    {f.comingSoon ? (
                      <>
                        <ClockIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
                        <span className={muted}>
                          {f.label}{" "}
                          <em className="not-italic text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            · Coming Soon
                          </em>
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                        <span
                          className={
                            theme === "dark" ? "text-gray-200" : "text-gray-700"
                          }
                        >
                          {f.label}
                        </span>
                      </>
                    )}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="mt-5">
                {state === "current" ? (
                  <div className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    <CheckIcon className="h-4 w-4" /> Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => onSelectPlan(plan.id, period)}
                    className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold shadow-md transition-all hover:shadow-lg ${
                      state === "downgrade" || plan.id === "free"
                        ? theme === "dark"
                          ? "bg-gray-700 text-gray-100"
                          : "bg-gray-100 text-gray-800"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                    }`}
                  >
                    {state === "downgrade" && <MinusIcon className="h-4 w-4" />}
                    {state === "upgrade" ? "Upgrade" : "Switch"} to {plan.name}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className={`text-center text-[11px] px-2 sm:px-0 ${muted}`}>
        Prices in Nigerian Naira. Enterprise pricing is customised after a
        consultation. Subscription enforcement (capacity &amp; AI limits) is
        applied on the server for your school.
      </p>
    </div>
  );
}
