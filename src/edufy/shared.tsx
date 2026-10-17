import {
  SparklesIcon,
  LockClosedIcon,
  ClockIcon,
} from "@heroicons/react/24/solid";
import { useNavigate } from "react-router-dom";
import { EDUFY_FEATURES, type EdufyFeature } from "./mockData";
import { useEdufy } from "./EdufyContext";

/** Edufy AI brand mark — gradient spark orb. */
export function EdufyLogo({ size = 40 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 shadow-lg shadow-blue-500/30"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <SparklesIcon
        className="text-white"
        style={{ width: size * 0.55, height: size * 0.55 }}
      />
    </div>
  );
}

export function PremiumBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
      <SparklesIcon className="h-3 w-3" /> Premium
    </span>
  );
}

export function ComingSoonBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-600 dark:bg-gray-700 dark:text-gray-300">
      <ClockIcon className="h-3 w-3" /> Coming Soon
    </span>
  );
}

export function LockedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
      <LockClosedIcon className="h-3 w-3" /> Premium
    </span>
  );
}

/**
 * Rich plan badge for the Edufy AI menu header — a glassy pill with a mini
 * gradient orb, the plan name and a subtle sparkle. Rendered inside the
 * header's content block (left side, under the title) so it is never covered
 * by the expand/close buttons that live in the top-right corner.
 */
export function PlanBadge({ plan }: { plan: string }) {
  const isFree = plan.toLowerCase() === "free";
  return (
    <span
      className="mt-1.5 inline-flex max-w-full items-center gap-1.5 self-start overflow-hidden rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-sm"
      title={`Current plan: ${plan}`}
    >
      {/* mini orb — emerald for free, amber for paid plans */}
      <span
        className={`relative flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${
          isFree
            ? "bg-gradient-to-br from-emerald-400 to-teal-600"
            : "bg-gradient-to-br from-amber-400 to-yellow-600"
        }`}
        aria-hidden="true"
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-20 [animation-duration:3s]" />
        <SparklesIcon
          className="h-2 w-2 text-white drop-shadow"
          aria-hidden="true"
        />
      </span>
      <span className="truncate">{plan} Plan</span>
      {/* tick / lock glyph */}
      {isFree ? (
        <svg
          className="h-3 w-3 shrink-0 text-emerald-300"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      ) : (
        <LockClosedIcon className="h-3 w-3 shrink-0 text-amber-300" aria-hidden="true" />
      )}
    </span>
  );
}

/** Simple feature icon mapping using Heroicons. */
export function FeatureIcon({
  icon,
  className = "h-6 w-6",
}: {
  icon: EdufyFeature["icon"];
  className?: string;
}) {
  const icons = {
    scanner:
      "M2.25 15.75l5.159-5.159a6 6 0 018.682 0l5.159 5.159M2.25 9a6 6 0 0112 0m0 6a6 6 0 01-12 0",
    calendar:
      "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
    chat: "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.362-2.567 5.532 5.532 0 01-1.804-4.259C3.494 9.445 6.846 6 11 6c4.154 0 7.506 3.445 7.506 8.25z",
    lesson:
      "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.033 0 3.94.678 5.75 1.848V6.042zM12 6.042V18m9-7.5a8.967 8.967 0 016 2.292 8.987 8.987 0 00-3-.512m-3 0V17.25m0-10.5v10.5M3.75 3.75h16.5",
    chart:
      "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
    report:
      "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  } as const;
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.6}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={icons[icon]} />
    </svg>
  );
}

/** Sample upgrade prompt shown for locked/premium states. Navigates to the Subscription page. */
export function UpgradePrompt({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate();
  const closePanel = useEdufy().closePanel;
  const target = window.location.pathname.startsWith('/teacher')
    ? '/teacher/subscription'
    : '/admin/subscription';
  const goSubscribe = () => {
    closePanel();
    navigate(target);
  };
  return (
    <div className="mx-3 mb-3 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-3 dark:border-blue-500/20 dark:from-blue-500/10 dark:to-indigo-500/10">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-blue-900 dark:text-blue-200">
            Unlock Edufy AI Premium
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-blue-700 dark:text-blue-300">
            Insights &amp; Reports — one subscription for the whole school.
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Dismiss upgrade prompt"
            className="text-blue-400 hover:text-blue-600 dark:text-blue-400/70 dark:hover:text-blue-300"
          >
            ✕
          </button>
        )}
      </div>
      <button
        onClick={goSubscribe}
        className="mt-2 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:from-blue-500 hover:to-indigo-500"
      >
        Upgrade Plan
      </button>
    </div>
  );
}

export { EDUFY_FEATURES };
export type { EdufyFeature };
