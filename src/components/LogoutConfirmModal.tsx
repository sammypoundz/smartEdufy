import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ArrowLeftOnRectangleIcon } from "@heroicons/react/24/outline";

interface LogoutConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** "light" | "dark" from ThemeContext */
  theme?: "light" | "dark";
}

/**
 * App-style logout confirmation dialog.
 * Renders via portal, fades/scales in, traps focus, supports
 * Enter (confirm), Escape (cancel) and backdrop-click (cancel).
 */
export default function LogoutConfirmModal({
  open,
  onConfirm,
  onCancel,
  theme = "light",
}: LogoutConfirmModalProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const isDark = theme === "dark";

  // Animate via CSS classes toggled after mount (no framer-motion needed)
  useEffect(() => {
    if (!open) return;
    // Focus the confirm button once shown
    const t = setTimeout(() => confirmBtnRef.current?.focus(), 50);
    // Esc to cancel
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.15s_ease-out]"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Confirm logout"
        className={`w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-[popIn_0.2s_cubic-bezier(0.34,1.56,0.64,1)] ${
          isDark
            ? "bg-gray-900 border border-white/10"
            : "bg-white border border-gray-200"
        }`}
      >
        {/* Icon header */}
        <div className="flex flex-col items-center pt-8 pb-4 px-6 text-center">
          <div
            className={`h-16 w-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg ${
              isDark
                ? "bg-red-500/15 text-red-400 shadow-red-500/10"
                : "bg-red-100 text-red-600 shadow-red-200/40"
            }`}
          >
            <ArrowLeftOnRectangleIcon className="h-8 w-8" />
          </div>
          <h2
            className={`text-lg font-bold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Log out?
          </h2>
          <p
            className={`mt-2 text-sm leading-relaxed ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            You'll need to sign in again to access your account.
          </p>
        </div>

        {/* Actions */}
        <div
          className={`flex gap-3 px-6 pb-6 pt-2 ${isDark ? "border-t border-white/10" : "border-t border-gray-100"}`}
        >
          <button
            type="button"
            onClick={onCancel}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
              isDark
                ? "bg-white/5 text-gray-200 hover:bg-white/10 border border-white/10"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            ref={confirmBtnRef}
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] transition-all shadow-lg shadow-red-600/25"
          >
            Log out
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
