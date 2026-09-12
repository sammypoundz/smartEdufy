/**
 * Mobile stacked-cards support for data tables.
 *
 * On phones (<768px) index.css turns every <table> into a stack of cards
 * (one card per row) instead of a horizontally-scrolling grid. For that to
 * read well, each cell needs its column header shown next to the value.
 *
 * This module copies each <thead><th> label onto the matching <td> as a
 * `data-label` attribute so the CSS can render it. It does this globally,
 * via a MutationObserver, so no page needs to be edited — including tables
 * rendered dynamically (React re-mounts, modals, filters changing rows).
 *
 * Opt-out: add class "table-keep-scroll" to a <table> to keep the desktop
 * scroll behavior instead of stacking (used for grid-like tables such as
 * the timetable where the row/column structure IS the content).
 */

function labelTable(table: HTMLTableElement): void {
  if (table.classList.contains("table-keep-scroll")) return;
  if (table.dataset.stackLabeled === "1") return;
  table.dataset.stackLabeled = "1";

  const headerCells = Array.from(table.querySelectorAll("thead th"));
  if (headerCells.length === 0) return;

  const labels = headerCells.map((th) => (th.textContent || "").trim());

  table.querySelectorAll("tbody tr, tfoot tr").forEach((tr) => {
    Array.from(tr.children).forEach((cell, i) => {
      if (!(cell instanceof HTMLTableCellElement)) return;
      // Cells spanning several columns have no single label — leave unlabeled
      // so CSS renders them as a plain full-width block.
      if (cell.colSpan > 1) {
        cell.removeAttribute("data-label");
        return;
      }
      const label = labels[i];
      if (label) cell.setAttribute("data-label", label);
      // Icon-only cells (e.g. row action buttons) get an empty label so the
      // CSS can drop the label row entirely and show the control full-width.
      else cell.setAttribute("data-label", "");
    });
  });
}

function labelAll(root: ParentNode): void {
  root.querySelectorAll?.("table").forEach((t) => {
    if (t instanceof HTMLTableElement) labelTable(t);
  });
}

export function initTableStacking(): void {
  if (typeof window === "undefined" || typeof MutationObserver === "undefined")
    return;

  const start = () => {
    labelAll(document);
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (n instanceof HTMLTableElement) labelTable(n);
          else if (n instanceof HTMLElement) labelAll(n);
        });
        // Attribute flips (e.g. a table inside a container that was hidden
        // then shown) don't add nodes, but classes changing on a table means
        // it may now be stackable.
        if (
          m.type === "attributes" &&
          m.target instanceof HTMLTableElement &&
          m.attributeName === "class"
        ) {
          m.target.dataset.stackLabeled = "";
          labelTable(m.target);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}
