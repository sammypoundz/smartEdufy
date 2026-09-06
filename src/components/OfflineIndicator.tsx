import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { SignalSlashIcon, WifiIcon } from "@heroicons/react/24/outline";

/** Shape of the connectivity state exposed by useConnectivity. */
export interface ConnectivityStatus {
  /** True when the browser reports an active connection AND a probe succeeds. */
  isOnline: boolean;
  /** True only while navigator.onLine is false (fast, event-driven). */
  browserOnline: boolean;
  /** True while we are still confirming connectivity after coming back online. */
  checking: boolean;
  /** Manually re-run the connectivity probe. */
  recheck: () => void;
}

/**
 * Tracks real internet connectivity. navigator.onLine alone is unreliable
 * (it only says whether there is a network interface, e.g. Wi-Fi without
 * internet still reports online), so we additionally probe a cheap endpoint.
 */
export function useConnectivity(): ConnectivityStatus {
  const [browserOnline, setBrowserOnline] = useState<boolean>(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [probeOk, setProbeOk] = useState<boolean>(true);
  const [checking, setChecking] = useState<boolean>(false);

  const probe = useCallback(async (): Promise<boolean> => {
    // favicon.ico on our own origin would succeed even if only the LAN is up;
    // hitting a public endpoint verifies actual internet access.
    // NOTE: must use mode "no-cors" — a cross-origin endpoint without CORS
    // headers makes a normal (cors-mode) fetch REJECT even when online.
    // With no-cors, a resolved (opaque) response means the request reached
    // the network; only a genuine network failure throws.
    try {
      const res = await fetch("https://www.gstatic.com/generate_204", {
        method: "GET",
        mode: "no-cors",
        cache: "no-store",
        redirect: "follow",
        signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined,
      });
      // no-cors returns an opaque response (status 0) on success; rejection
      // (timeout/DNS failure/no route) is the only offline signal.
      const ok = res.type === "opaque" || res.ok || res.status === 204;
      setProbeOk(ok);
      return ok;
    } catch {
      setProbeOk(false);
      return false;
    }
  }, []);

  // The first probe right after the `online` event often fails because the
  // network stack is still settling (Wi-Fi reassociated, DNS not ready yet),
  // so retry a few times with short delays before giving up.
  const probeWithRetry = useCallback(
    async (attempts = 3, delayMs = 1500) => {
      for (let i = 0; i < attempts; i++) {
        if (await probe()) return true;
        if (i < attempts - 1 && navigator.onLine) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
      return false;
    },
    [probe],
  );

  const recheck = useCallback(() => {
    if (!navigator.onLine) {
      setProbeOk(false);
      return;
    }
    setChecking(true);
    probeWithRetry().finally(() => setChecking(false));
  }, [probeWithRetry]);

  useEffect(() => {
    const goOffline = () => {
      setBrowserOnline(false);
      setProbeOk(false);
    };
    const goOnline = () => {
      setBrowserOnline(true);
      setChecking(true);
      probeWithRetry().finally(() => setChecking(false));
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    // Re-probe when the tab regains focus: the `online` event can fire before
    // connectivity is truly usable, and focus is a good moment to re-check.
    const onFocus = () => {
      if (navigator.onLine) probe();
    };
    window.addEventListener("focus", onFocus);

    // Initial check + periodic re-check so a silent drop is detected.
    if (navigator.onLine) {
      probe();
    } else {
      goOffline();
    }
    const interval = setInterval(() => {
      if (navigator.onLine) probe();
    }, 30_000);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, [probe, probeWithRetry]);

  return {
    isOnline: browserOnline && probeOk,
    browserOnline,
    checking,
    recheck,
  };
}

/**
 * Fixed banner shown when the app loses its internet connection. It stays
 * visible until connectivity is restored, then a short green "back online"
 * alert is shown before the banner disappears.
 * Render once at the app root; it overlays at the bottom of the viewport.
 */
export default function OfflineIndicator() {
  const { theme } = useTheme();
  const { isOnline, checking, recheck } = useConnectivity();

  // True once we have been offline in this session — only then do we show
  // the "back online" alert, never on first load with a healthy connection.
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowReconnected(false);
      clearTimeout(dismissTimer.current);
      return;
    }
    // Connection just came back after being offline → alert, then disappear.
    if (wasOffline) {
      setShowReconnected(true);
      clearTimeout(dismissTimer.current);
      dismissTimer.current = setTimeout(() => setShowReconnected(false), 4000);
    }
    return () => clearTimeout(dismissTimer.current);
  }, [isOnline, wasOffline]);

  useEffect(() => () => clearTimeout(dismissTimer.current), []);

  if (isOnline && !showReconnected) return null;

  const isReconnected = isOnline && showReconnected;

  return (
    <div
      role="alert"
      className={`fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 flex items-center gap-2 sm:gap-3 max-w-[calc(100vw-1.5rem)] w-auto rounded-2xl sm:rounded-full px-3.5 sm:px-5 py-2.5 shadow-2xl border backdrop-blur-md transition-colors ${
        isReconnected
          ? theme === "dark"
            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-100"
            : "bg-emerald-50 border-emerald-200 text-emerald-800"
          : theme === "dark"
            ? "bg-red-500/20 border-red-500/40 text-red-100"
            : "bg-red-50 border-red-200 text-red-800"
      }`}
    >
      {isReconnected ? (
        <WifiIcon className="h-5 w-5 flex-shrink-0" />
      ) : (
        <SignalSlashIcon className="h-5 w-5 flex-shrink-0" />
      )}
      <span className="text-xs sm:text-sm font-medium leading-snug">
        {isReconnected ? (
          <>
            <span className="hidden sm:inline">
              Back online — connection restored.
            </span>
            <span className="sm:hidden">Back online</span>
          </>
        ) : (
          <>
            <span className="hidden sm:inline">
              No internet connection — some features may be unavailable.
            </span>
            <span className="sm:hidden">No internet connection</span>
          </>
        )}
      </span>
      {!isReconnected && (
        <button
          onClick={recheck}
          disabled={checking}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 transition-colors ${
            theme === "dark"
              ? "bg-red-500/30 hover:bg-red-500/50 text-white"
              : "bg-red-100 hover:bg-red-200 text-red-900"
          } disabled:opacity-50`}
        >
          {checking ? "Checking…" : "Retry"}
        </button>
      )}
    </div>
  );
}
