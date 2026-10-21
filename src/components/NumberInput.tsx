// Reusable number input with live thousands-separator (comma) formatting.
// Usage: <NumberInput value={number|string|null} onChange={(num|string)=>...} />
// The displayed value is "1,250,000" while typing; onChange receives the raw
// digits (as a string — parent decides whether to Number() it). Empty input
// yields ''.
import { useEffect, useState } from "react";

/** Strip everything except digits and a decimal point. */
export function parseNumericInput(raw: string): string {
  // Remove commas, spaces, currency symbols; keep digits + first dot
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  return parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : cleaned;
}

/** Format a numeric string with thousands separators, preserving decimals. */
export function formatWithCommas(numeric: string): string {
  if (numeric === "" || numeric === ".") return numeric;
  const [int, ...dec] = numeric.split(".");
  const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return dec.length ? `${withCommas}.${dec.join("")}` : withCommas;
}

interface NumberInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> {
  /** Raw numeric value: string or number. null/undefined → empty. */
  value: number | string | null | undefined;
  /** Receives the raw numeric string (no commas). '' when cleared. */
  onChange: (raw: string) => void;
  /** How many decimal places to allow (default: 2). Pass 0 for integers only. */
  maxDecimals?: number;
}

export default function NumberInput({
  value,
  onChange,
  maxDecimals = 2,
  className,
  ...rest
}: NumberInputProps) {
  // Local display state so the caret doesn't jump while formatting mid-typing.
  const [display, setDisplay] = useState(() =>
    formatWithCommas(
      value === null || value === undefined || value === ""
        ? ""
        : String(value),
    ),
  );
  const [focused, setFocused] = useState(false);

  // Sync from parent when not being edited (e.g. form reset, "Full" button).
  useEffect(() => {
    if (focused) return;
    const str =
      value === null || value === undefined || value === ""
        ? ""
        : String(value);
    setDisplay(formatWithCommas(str));
  }, [value, focused]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        const raw = parseNumericInput(display);
        // Normalize trailing dots/extra decimals on blur
        const trimmed = raw.endsWith(".") ? raw.slice(0, -1) : raw;
        setDisplay(formatWithCommas(trimmed));
        onChange(trimmed);
      }}
      onChange={(e) => {
        let raw = parseNumericInput(e.target.value);
        // Enforce max decimals
        const dot = raw.indexOf(".");
        if (dot !== -1 && raw.length - dot - 1 > maxDecimals) {
          raw = raw.slice(0, dot + 1 + maxDecimals);
        }
        setDisplay(formatWithCommas(raw));
        onChange(raw);
      }}
      className={className}
      {...rest}
    />
  );
}
