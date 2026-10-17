import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import {
  SparklesIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";
import { EdufyProvider, useEdufy, type EdufyScreen as Screen } from "./EdufyContext";
import {
  EDUFY_FEATURES,
  EdufyLogo,
  PremiumBadge,
  ComingSoonBadge,
  UpgradePrompt,
  FeatureIcon,
  PlanBadge,
} from "./shared";
import { MOCK_SUBSCRIPTION } from "./mockData";
import { useOfflineSafe } from "../components/OfflineIndicator";
import ResultScannerScreen from "./ResultScannerScreen";
import TimetableCreatorScreen from "./TimetableCreatorScreen";
import ChatScreen from "./ChatScreen";
import {
  LessonPlanScreen,
  InsightsScreen,
  ReportsScreen,
} from "./SampleDataScreens";

// ============================ Floating Button ============================
function FloatingEdufyButton() {
  const { open, togglePanel } = useEdufy();
  return (
    <button
      onClick={togglePanel}
      aria-label={open ? "Close Edufy AI assistant" : "Open Edufy AI assistant"}
      aria-expanded={open}
      className="group fixed bottom-24 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-600/40 outline-none transition-all duration-300 hover:scale-105 focus-visible:ring-4 focus-visible:ring-blue-300 md:bottom-6 md:right-6"
    >
      {/* glow pulse */}
      <span
        className="absolute inset-0 -z-10 animate-ping rounded-full bg-blue-500/25 [animation-duration:2.5s]"
        aria-hidden="true"
      />
      {/* tooltip */}
      <span
        className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg ring-1 ring-white/10 transition-all duration-200 group-hover:-translate-x-0.5 group-hover:opacity-100 dark:bg-gray-700 md:block"
        role="tooltip"
      >
        Edufy AI
      </span>
      <SparklesIcon
        className={`h-7 w-7 transition-transform duration-300 ${open ? "rotate-180" : "group-hover:rotate-12"}`}
        aria-hidden="true"
      />
    </button>
  );
}

// ============================ Feature Card ============================
function FeatureCard({ id }: { id: Screen }) {
  const { go } = useEdufy();
  const feature = EDUFY_FEATURES.find((f) => f.id === id)!;
  const locked = feature.premium && !MOCK_SUBSCRIPTION.premium;
  const disabled = feature.comingSoon || locked;

  return (
    <button
      onClick={() => !disabled && go(id)}
      disabled={disabled}
      aria-label={`${feature.title}${feature.comingSoon ? " (coming soon)" : locked ? " (premium)" : ""}`}
      className={`group flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-all ${
        disabled
          ? "cursor-not-allowed border-gray-100 bg-gray-50/80 opacity-80 dark:border-gray-700/60 dark:bg-gray-800/60"
          : "border-gray-200 bg-white shadow-sm hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-blue-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500 dark:hover:bg-gray-700/70"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          disabled
            ? "bg-gray-100 text-gray-400 dark:bg-gray-700/70 dark:text-gray-500"
            : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm"
        }`}
      >
        <FeatureIcon icon={feature.icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span
            className={`truncate text-xs font-bold ${
              disabled ? "text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-gray-100"
            }`}
          >
            {feature.title}
          </span>
          {feature.comingSoon && <ComingSoonBadge />}
          {!feature.comingSoon && locked && <PremiumBadge />}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-gray-500 dark:text-gray-400">
          {feature.description}
        </span>
      </span>
      {!disabled && (
        <ChevronLeftIcon
          className="mt-2 h-4 w-4 shrink-0 rotate-180 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500 dark:text-gray-600"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

// ============================ Menu Screen ============================
function MenuScreen() {
  const offline = useOfflineSafe();
  return (
    <div className="flex h-full flex-col">
      {/* branding header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-4 text-white">
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-3">
            <EdufyLogo size={42} />
            <div className="min-w-0">
              <h2 className="flex items-center gap-1.5 text-sm font-black tracking-tight">
                Edufy AI <SparklesIcon className="h-4 w-4 text-blue-200" />
              </h2>
              <p className="text-[11px] text-blue-100">
                Your SmartEdufy AI Assistant.
              </p>
            </div>
          </div>
          {/* Plan badge lives under the branding, clear of the top-right
              expand/close buttons that previously covered it. */}
          <div className="mt-2 flex items-center gap-1.5">
            <PlanBadge plan={MOCK_SUBSCRIPTION.plan} />
          </div>
        </div>
        {/* decorative corner sparkles — keeps the header balanced now the
            badge has moved to the content block */}
        <SparklesIcon
          className="h-8 w-8 shrink-0 text-blue-400/40"
          aria-hidden="true"
        />
      </div>

      {/* offline notice — Edufy AI is a cloud feature */}
      {!offline.isOnline && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="flex items-start gap-2 text-[11px] leading-snug text-amber-700 dark:text-amber-300">
            <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>You're offline.</strong> Edufy AI needs an internet
              connection for cloud processing — please reconnect to use it.
            </span>
          </p>
        </div>
      )}

      {/* welcome message */}
      <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700/70">
        <div className="rounded-2xl bg-blue-50 p-3 text-[11px] leading-relaxed text-blue-900 dark:bg-blue-500/10 dark:text-blue-200">
          <span className="font-bold">👋 Welcome!</span> I'm here to help you
          run your school smarter — scan results, build timetables, draft lesson
          plans and more. Pick a feature below or ask me anything.
        </div>
      </div>

      {/* feature cards */}
      <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          AI Features
        </p>
        {EDUFY_FEATURES.map((f) => (
          <FeatureCard key={f.id} id={f.id} />
        ))}
        <p className="pt-1 text-center text-[10px] text-gray-400 dark:text-gray-500">
          Mock subscription only — billing is not implemented in this demo.
        </p>
      </div>

      <UpgradePrompt />
    </div>
  );
}

// ============================ Screen Router ============================
function ActiveScreen({ screen }: { screen: Screen }) {
  switch (screen) {
    case "result-scanner":
      return <ResultScannerScreen />;
    case "timetable-creator":
      return <TimetableCreatorScreen />;
    case "chat":
      return <ChatScreen />;
    case "lesson-plan":
      return <LessonPlanScreen />;
    case "insights":
      return <InsightsScreen />;
    case "reports":
      return <ReportsScreen />;
    default:
      return <MenuScreen />;
  }
}

// ============================ Panel Shell ============================
function EdufyPanel() {
  const { open, screen, closePanel } = useEdufy();
  const [expanded, setExpanded] = useState(false);

  // Escape closes the panel; state is preserved on close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closePanel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closePanel]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* backdrop (mobile emphasis) */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePanel}
            className="fixed inset-0 z-[65] bg-black/30 backdrop-blur-[1px] md:bg-transparent"
            aria-hidden="true"
          />
          <motion.aside
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label="Edufy AI Assistant"
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.4 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className={`fixed inset-y-0 right-0 z-[70] flex w-full flex-col bg-white shadow-2xl md:inset-y-4 md:right-4 md:rounded-3xl md:border md:border-gray-200 dark:bg-gray-900 dark:shadow-black/40 dark:md:border-gray-700 ${
              expanded
                ? "md:w-[min(90vw,900px)]"
                : "md:w-[400px]"
            }`}
          >
            {/* top chrome: close + expand (desktop only) */}
            <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
              <button
                onClick={() => setExpanded((e) => !e)}
                aria-label={expanded ? "Collapse Edufy AI" : "Expand Edufy AI"}
                title={expanded ? "Collapse" : "Expand"}
                className="hidden rounded-full bg-gray-100/90 p-1.5 text-gray-500 ring-1 ring-black/5 transition hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800/90 dark:text-gray-400 dark:ring-white/10 dark:hover:bg-gray-700 dark:hover:text-gray-200 md:block"
              >
                {expanded ? (
                  <ArrowsPointingInIcon className="h-4 w-4" />
                ) : (
                  <ArrowsPointingOutIcon className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={closePanel}
                aria-label="Close Edufy AI"
                className="rounded-full bg-gray-100/90 p-1.5 text-gray-500 ring-1 ring-black/5 transition hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800/90 dark:text-gray-400 dark:ring-white/10 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <ActiveScreen screen={screen} />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================ Exported Root ============================
export default function EdufyAI() {
  // The assistant (and its floating button) are only available to logged-in
  // users — the login page and other public views stay clean.
  const auth = useAuth();
  const isLoggedIn = !!auth?.user && !!auth?.token;
  if (!isLoggedIn) return null;
  return (
    <EdufyProvider>
      <FloatingEdufyButton />
      <EdufyPanel />
    </EdufyProvider>
  );
}
