import { useCallback } from "react";
import {
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";
import {
  exportDomTableToExcel,
  exportDomTableToPDF,
} from "../utils/exportData";

interface Props {
  /** Export as Excel */
  onExcel?: () => void;
  /** Export as PDF */
  onPDF?: () => void;
  /**
   * Flexible mode: CSS selector (class, id, etc.) for the <table> to extract
   * from the current page. When provided, Excel/PDF handlers are generated
   * automatically unless onExcel/onPDF are also passed.
   * e.g. tableSelector=".students-table"
   */
  tableSelector?: string;
  /** File name (without extension) used with tableSelector */
  filename?: string;
  /** Title printed on the exported PDF (defaults to filename) */
  pdfTitle?: string;
  /** Which table to use when tableSelector matches several (default: first) */
  tableIndex?: number;
  /** Disable both buttons (e.g. while data is loading or list is empty) */
  disabled?: boolean;
  dark?: boolean;
}

/**
 * Paired Excel/PDF export buttons with a consistent look for list pages.
 *
 * Two ways to use it:
 *  1. Callback mode (existing behaviour):
 *     <ExportButtons onExcel={...} onPDF={...} />
 *  2. Selector mode (no column mapping needed — pulls the table from the DOM):
 *     <ExportButtons tableSelector=".data-table" filename="students" />
 */
export default function ExportButtons({
  onExcel,
  onPDF,
  tableSelector,
  filename = "export",
  pdfTitle,
  tableIndex,
  disabled,
}: Props) {
  const handleExcel = useCallback(() => {
    if (onExcel) return onExcel();
    if (tableSelector) {
      const ok = exportDomTableToExcel(tableSelector, filename, { tableIndex });
      if (!ok)
        console.warn(`ExportButtons: no table matched "${tableSelector}"`);
    }
  }, [onExcel, tableSelector, filename, tableIndex]);

  const handlePDF = useCallback(() => {
    if (onPDF) return onPDF();
    if (tableSelector) {
      const ok = exportDomTableToPDF(
        tableSelector,
        filename,
        pdfTitle || filename,
        { tableIndex },
      );
      if (!ok)
        console.warn(`ExportButtons: no table matched "${tableSelector}"`);
    }
  }, [onPDF, tableSelector, filename, pdfTitle, tableIndex]);
  const base =
    "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed";
  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={handleExcel}
        disabled={disabled || (!onExcel && !tableSelector)}
        title={
          tableSelector
            ? `Export the "${tableSelector}" table as Excel`
            : "Export as Excel"
        }
        className={`${base} bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg`}
      >
        <ArrowDownTrayIcon className="h-4 w-4" />
        Excel
      </button>
      <button
        onClick={handlePDF}
        disabled={disabled || (!onPDF && !tableSelector)}
        title={
          tableSelector
            ? `Export the "${tableSelector}" table as PDF`
            : "Export as PDF"
        }
        className={`${base} bg-gradient-to-r from-red-600 to-rose-600 text-white hover:shadow-lg`}
      >
        <DocumentArrowDownIcon className="h-4 w-4" />
        PDF
      </button>
    </div>
  );
}
