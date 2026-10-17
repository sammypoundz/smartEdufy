import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import Subscription from "../../components/Subscription";
import type { BillingPeriod } from "../../config/pricing";
import toast from "react-hot-toast";

/** Standalone Subscription page — route: /admin/subscription (and /teacher/subscription). */
export default function SubscriptionPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();

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
            Manage your school's SmartEdufy plan, student capacity and Edufy AI
            access.
          </p>
        </motion.div>

        <Subscription
          currentPlan="free"
          statusText="You are on the Free plan. Upgrade any time — pricing updates instantly with the billing period."
          onSelectPlan={(planId: string, _billing: BillingPeriod) => {
            // TODO: hand off to the real subscription/payment flow once implemented.
            toast.error(
              planId === "enterprise"
                ? "Contact sales to set up an Enterprise subscription."
                : `Online subscription for the ${planId} plan is coming soon.`,
            );
          }}
        />
      </div>
    </div>
  );
}
