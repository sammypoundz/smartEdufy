import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ExportColumn<T> {
  /** Column header text */
  header: string;
  /** Extract the cell value from a row */
  value: (row: T) => string | number | null | undefined;
}

/** Strip characters that are unsafe in file names */
export interface ExtractedTable {
  headers: string[];
  rows: string[][];
  caption?: string;
}

export interface DomExtractOptions {
  /** Which <table> to use when the selector matches several (default: first) */
  tableIndex?: number;
  /** Skip the table's header row(s) from the body (default: true when <th> in thead is found) */
  includeHeaderInBody?: boolean;
}

/**
 * Flexibly extract a table straight from the DOM by CSS selector (class, id, etc).
 * Handles colspan, repeats header text for rowspan-less layouts, and skips empty rows.
 * Returns null when nothing matches.
 */
export function extractTableFromDom(
  selector: string,
  options: DomExtractOptions = {},
): ExtractedTable | null {
  const tables = Array.from(document.querySelectorAll<HTMLTableElement>(selector));
  if (tables.length === 0) return null;

  const table = tables[Math.min(options.tableIndex ?? 0, tables.length - 1)];
  const caption = table.querySelector("caption")?.textContent?.trim() || undefined;

  const cellText = (cell: HTMLTableCellElement) =>
    (cell.textContent || "").replace(/\s+/g, " ").trim();

  // Header row: prefer <thead>, otherwise first row containing <th>
  let headers: string[] = [];
  const headRow = table.querySelector("thead tr");
  let bodyRows: HTMLTableRowElement[] = [];

  if (headRow) {
    headers = Array.from(headRow.querySelectorAll<HTMLTableCellElement>("th,td"), cellText);
    bodyRows = Array.from(table.querySelectorAll("tbody tr"));
  } else {
    const allRows = Array.from(table.querySelectorAll("tr"));
    const first = allRows[0];
    if (first && first.querySelector("th")) {
      headers = Array.from(first.querySelectorAll<HTMLTableCellElement>("th,td"), cellText);
      bodyRows = allRows.slice(1);
    } else {
      bodyRows = allRows;
    }
  }

  const expandColspan = (cells: HTMLTableCellElement[]): string[] => {
    const out: string[] = [];
    for (const cell of cells) {
      const span = Math.max(1, cell.colSpan || 1);
      const text = cellText(cell);
      for (let i = 0; i < span; i++) out.push(i === 0 ? text : "");
    }
    return out;
  };

  // Normalise row length to the widest row so ragged tables still export cleanly
  const rawRows = bodyRows.map((tr) => expandColspan(Array.from(tr.querySelectorAll("td,th"))));
  const width = Math.max(headers.length, ...rawRows.map((r) => r.length), 0);
  if (headers.length < width) headers = [...headers, ...Array.from({ length: width - headers.length }, (_, i) => `Column ${headers.length + i + 1}`)];
  const rows = rawRows
    .map((r) => (r.length < width ? [...r, ...Array(width - r.length).fill("")] : r.slice(0, width)))
    .filter((r) => r.some((c) => c !== "")); // drop fully-empty rows

  return { headers, rows, caption };
}

/**
 * Export a DOM table (found by CSS selector) to Excel.
 * Returns false when no table matched the selector.
 */
export function exportDomTableToExcel(
  selector: string,
  filename: string,
  options: DomExtractOptions = {},
): boolean {
  const t = extractTableFromDom(selector, options);
  if (!t) return false;
  exportToExcel(filename, t.headers, t.rows);
  return true;
}

/**
 * Export a DOM table (found by CSS selector) to a styled PDF.
 * Returns false when no table matched the selector.
 */
export function exportDomTableToPDF(
  selector: string,
  filename: string,
  title: string,
  options: DomExtractOptions = {},
): boolean {
  const t = extractTableFromDom(selector, options);
  if (!t) return false;
  exportToPDF(filename, title, t.headers, t.rows);
  return true;
}

/** Strip characters that are unsafe in file names */
export function safeFileName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/_+/g, "_");
}

type Cell = string | number | null | undefined;

/** Convert the ExportColumn<T> form into plain headers + row arrays */
function normalise<T>(
  columns: ExportColumn<T>[] | readonly string[],
  rows: T[] | readonly (readonly Cell[])[],
): { headers: string[]; rows: (Cell)[][] } {
  if (typeof columns[0] === "string" || columns.length === 0) {
    return { headers: columns as string[], rows: rows as (Cell)[][] };
  }
  const cols = columns as ExportColumn<T>[];
  return {
    headers: cols.map((c) => c.header),
    rows: (rows as T[]).map((row) =>
      cols.map((c) => {
        const v = c.value(row);
        return v === null || v === undefined ? "" : v;
      }),
    ),
  };
}

/**
 * Export rows to an Excel (.xlsx) file.
 * Accepts either ExportColumn<T> definitions with typed rows, or
 * plain header strings with an array-of-arrays (e.g. extracted DOM tables).
 */
export function exportToExcel<T>(
  filename: string,
  columns: ExportColumn<T>[] | readonly string[],
  rows: T[] | readonly (readonly Cell[])[],
): void {
  const { headers, rows: normalised } = normalise(columns, rows);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...normalised]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(
    wb,
    safeFileName(filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`),
  );
}

/**
 * Export rows to a styled PDF table.
 * Accepts either ExportColumn<T> definitions with typed rows, or
 * plain header strings with an array-of-arrays (e.g. extracted DOM tables).
 */
export function exportToPDF<T>(
  filename: string,
  title: string,
  columns: ExportColumn<T>[] | readonly string[],
  rows: T[] | readonly (readonly Cell[])[],
): void {
  const doc = new jsPDF({
    orientation: columns.length > 6 ? "landscape" : "portrait",
  });

  const { headers, rows: normalised } = normalise(columns, rows);
  const body = normalised.map((row) => row.map((v) => (v === null || v === undefined ? "" : String(v))));

  doc.setFontSize(14);
  doc.setTextColor(30, 64, 175); // blue-700
  doc.text(title, 14, 16);

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    `Generated ${new Date().toLocaleString()} • ${rows.length} record(s)`,
    14,
    23,
  );

  autoTable(doc, {
    head: [headers],
    body,
    startY: 27,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    alternateRowStyles: { fillColor: [243, 244, 246] },
    margin: { left: 14, right: 14 },
  });

  doc.save(
    safeFileName(filename.endsWith(".pdf") ? filename : `${filename}.pdf`),
  );
}
