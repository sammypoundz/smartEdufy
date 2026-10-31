// Shared platform dashboard primitives (KPI cards, chart cards, tables).
import type { ReactNode } from "react";
import logoUrl from "../../assets/smart edufy icon.png";
import { useTheme } from "../../contexts/ThemeContext";

export const formatNGN = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);

export const formatNumber = (n: number) =>
  new Intl.NumberFormat("en-US").format(n || 0);

export function KpiCard({
  label,
  value,
  sub,
  icon,
  tone = "blue",
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: ReactNode;
  tone?: "blue" | "emerald" | "amber" | "rose" | "violet" | "gray";
}) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const tones: Record<string, string> = {
    blue: "from-blue-500 to-indigo-600",
    emerald: "from-emerald-500 to-teal-600",
    amber: "from-amber-500 to-orange-600",
    rose: "from-rose-500 to-red-600",
    violet: "from-violet-500 to-purple-600",
    gray: "from-gray-500 to-gray-700",
  };
  return (
    <div
      className={`rounded-2xl p-4 md:p-5 border transition-shadow hover:shadow-lg ${
        dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className={`text-[11px] font-bold uppercase tracking-wider ${
              dark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {label}
          </p>
          <p className="mt-1 text-xl md:text-2xl font-extrabold tracking-tight truncate">
            {value}
          </p>
          {sub && <p className="mt-0.5 text-[11px] text-gray-500">{sub}</p>}
        </div>
        {icon && (
          <span
            className={`h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br ${tones[tone]} text-white shadow-md`}
          >
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}

export function ChartCard({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  return (
    <div
      className={`rounded-2xl p-4 md:p-5 border ${
        dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="font-bold">{title}</h3>
          {subtitle && (
            <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function DataTable({
  columns,
  rows,
  empty,
}: {
  columns: {
    key: string;
    label: string;
    render?: (row: any) => ReactNode;
    align?: "right";
  }[];
  rows: any[];
  empty?: string;
}) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  if (!rows.length) {
    return (
      <div
        className={`rounded-2xl border p-10 text-center text-sm ${
          dark
            ? "bg-gray-900 border-gray-800 text-gray-400"
            : "bg-white border-gray-200 text-gray-500"
        }`}
      >
        {empty || "No data yet."}
      </div>
    );
  }
  return (
    <div
      className={`overflow-x-auto rounded-2xl border ${
        dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
      }`}
    >
      <table className="w-full text-sm">
        <thead>
          <tr
            className={`border-b ${
              dark
                ? "border-gray-800 bg-gray-800/50"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider ${
                  dark ? "text-gray-400" : "text-gray-500"
                } ${c.align === "right" ? "text-right" : ""}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id || i}
              className={`border-b last:border-0 ${
                dark
                  ? "border-gray-800/60 hover:bg-gray-800/40"
                  : "border-gray-100 hover:bg-gray-50"
              }`}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-4 py-3 ${
                    c.align === "right" ? "text-right" : ""
                  }`}
                >
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Badge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    EXPIRED: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    TRIAL:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    SUSPENDED:
      "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    PENDING_RENEWAL:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    SUCCESS:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    FAILED: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
        map[status] ||
        "bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export function Loading() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      {/* Branded preloader — pulsing SmartEdufy logo */}
      <img
        src={logoUrl}
        alt="Loading SmartEdufy…"
        className="h-20 w-20 object-contain animate-pulse"
      />
      <div className="flex gap-1.5">
        <div
          className={`h-2 w-2 rounded-full animate-bounce bg-blue-600 dark:bg-blue-400`}
          style={{ animationDelay: "-0.32s" }}
        />
        <div
          className={`h-2 w-2 rounded-full animate-bounce bg-blue-600 dark:bg-blue-400`}
          style={{ animationDelay: "-0.16s" }}
        />
        <div
          className={`h-2 w-2 rounded-full animate-bounce bg-blue-600 dark:bg-blue-400`}
          style={{ animationDelay: "0s" }}
        />
      </div>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-rose-300 bg-rose-50 dark:bg-rose-500/10 dark:border-rose-500/30 p-6 text-rose-700 dark:text-rose-300 text-sm">
      {message}
    </div>
  );
}
