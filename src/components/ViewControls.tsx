import { useEffect, useState } from "react";

const ZOOM_STORAGE_KEY = "app-zoom";
import { useTheme } from "../contexts/ThemeContext";
import {
  ArrowsPointingInIcon,
  MinusIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

/**
 * Small / Large / Fullscreen view controls for the top bar.
 * "Small" and "Large" emulate browser zoom (Ctrl - / Ctrl +) by scaling
 * the whole document. "Fullscreen" toggles the browser fullscreen API.
 */
export default function ViewControls() {
  const { theme } = useTheme();
  // Restore persisted zoom so it survives page refreshes.
  const [zoom, setZoom] = useState<number>(() => {
    const saved = Number(localStorage.getItem(ZOOM_STORAGE_KEY));
    return Number.isFinite(saved) && saved >= 0.5 && saved <= 1.5
      ? saved
      : 1;
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Re-apply the restored zoom on mount (style.zoom is not persisted by
  // the browser, so the document would otherwise reset to 100%).
  useEffect(() => {
    document.documentElement.style.zoom = String(zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track browser-initiated fullscreen changes (Esc, F11, etc.)
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Apply zoom to the whole document (Ctrl+- / Ctrl+ equivalents)
  const applyZoom = (value: number) => {
    const clamped = Math.min(1.5, Math.max(0.5, Math.round(value * 100) / 100));
    setZoom(clamped);
    document.documentElement.style.zoom = String(clamped);
    try {
      localStorage.setItem(ZOOM_STORAGE_KEY, String(clamped));
    } catch {
      // Storage may be unavailable (private mode); zoom still works in-session.
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Fullscreen may be blocked by the browser (e.g. not user-initiated)
    }
  };

  const btnClass = `p-2 rounded-lg transition-colors ${
    theme === "dark"
      ? "text-gray-400 hover:text-white hover:bg-white/10"
      : "text-gray-600 hover:text-gray-900 hover:bg-white/40"
  }`;

  return (
    <>
      <button
        onClick={() => applyZoom(zoom - 0.1)}
        className={btnClass}
        title="Smaller view (like Ctrl -)"
        aria-label="Zoom out"
      >
        <MinusIcon className="h-5 w-5" />
      </button>
      <button
        onClick={() => applyZoom(1)}
        className={`hidden sm:block text-xs font-medium px-1 rounded-lg transition-colors ${btnClass}`}
        title={`Zoom ${Math.round(zoom * 100)}% – click to reset`}
        aria-label="Reset zoom"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        onClick={() => applyZoom(zoom + 0.1)}
        className={btnClass}
        title="Larger view (like Ctrl +)"
        aria-label="Zoom in"
      >
        <PlusIcon className="h-5 w-5" />
      </button>
      <button
        onClick={toggleFullscreen}
        className={btnClass}
        title={isFullscreen ? "Exit full screen" : "Full screen browser"}
        aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
      >
        {isFullscreen ? (
          <ArrowsPointingInIcon className="h-5 w-5" />
        ) : (
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 20.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
            />
          </svg>
        )}
      </button>
    </>
  );
}
