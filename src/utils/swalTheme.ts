import Swal, { type SweetAlertOptions } from "sweetalert2";

/**
 * Global SweetAlert2 theme — makes every confirmation prompt (delete, etc.)
 * look like the app's LogoutConfirmModal: centered icon chip, rounded-3xl
 * card with pop-in animation, and a Cancel / confirm button pair.
 *
 * Imported once in main.tsx. Individual Swal.fire calls can still override
 * any option (title, text, icon, confirmButtonText, ...).
 */

// Detect dark mode from the <html> class set by ThemeContext ('dark' | 'light').
const isDark = () => document.documentElement.classList.contains("dark");

const baseTheme: SweetAlertOptions = {
  // Popup card background comes from CSS (.app-swal-popup) so the card is
  // always opaque in both themes — never transparent.
  background: undefined,
  // Soft dark backdrop behind every prompt modal (blurred via CSS)
  backdrop: "rgba(0, 0, 0, 0.7)",
  customClass: {
    popup: "app-swal-popup",
    title: "app-swal-title",
    htmlContainer: "app-swal-text",
    icon: "app-swal-icon",
    confirmButton: "app-swal-confirm",
    cancelButton: "app-swal-cancel",
    actions: "app-swal-actions",
  },
  buttonsStyling: false, // we style buttons with our own CSS classes
  showClass: {
    popup: "app-swal-show", // popIn animation
    backdrop: "app-swal-fade-in",
    icon: "app-swal-show",
  },
  hideClass: {
    popup: "app-swal-hide",
    backdrop: "app-swal-fade-out",
    icon: "app-swal-hide",
  },
  reverseButtons: true, // Cancel on the left, confirm on the right
  confirmButtonText: "Confirm",
  cancelButtonText: "Cancel",
};

// Rebuild per call so dark/light is resolved at show-time, not import-time.
const themed = (options: SweetAlertOptions) =>
  Swal.fire({
    ...baseTheme,
    ...options,
    // Keep our classes even if the caller passes customClass
    customClass: {
      ...baseTheme.customClass,
      ...(isDark() ? { popup: "app-swal-popup app-swal-dark" } : {}),
      ...options.customClass,
    },
  } as SweetAlertOptions);

// Wrap fire so every Swal.fire(...) call anywhere in the app is themed.
const originalFire = Swal.fire.bind(Swal);
Swal.fire = ((options?: SweetAlertOptions | string) => {
  if (typeof options === "string") return originalFire(options);
  const opts = (options ?? {}) as SweetAlertOptions;
  return originalFire({
    ...baseTheme,
    ...opts,
    customClass: {
      ...baseTheme.customClass,
      ...(isDark() ? { popup: "app-swal-popup app-swal-dark" } : {}),
      ...opts.customClass,
    },
  } as SweetAlertOptions);
}) as typeof Swal.fire;

export default themed;
