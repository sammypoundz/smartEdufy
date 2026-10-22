import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import SchoolLogo from "../../components/SchoolLogo";
import { useTheme } from "../../contexts/ThemeContext";
import { effectivePrivileges } from "../../utils/privileges";
import { api } from "../../utils/api";
import {
  BanknotesIcon,
  ReceiptPercentIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowRightIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface FeeStructure {
  id: string;
  className: string;
  title?: string;
  totalAmount: number;
  deadline?: string;
}
interface Student {
  id: string;
  classId?: string;
  class?: { id: string; name: string };
}
interface Payment {
  id: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod?: string;
  student?: {
    name: string;
    admissionNumber?: string;
    class?: { name: string };
  };
  feeStructure?: { title?: string; className?: string };
}
interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}
interface Budget {
  id: string;
  category: string;
  amount: number;
  monthYear: string;
}
interface PayrollEntry {
  id: string;
  staffName: string;
  role: string;
  amount: number;
  month: string;
  status: string;
}

const fmt = (n: number) =>
  `₦${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function AccountantDashboard() {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const dark = theme === "dark";

  const userRoles = [...(user?.roles || []), user?.role].filter(
    Boolean,
  ) as string[];
  const privileges = effectivePrivileges({
    roles: userRoles,
    privileges: user?.privileges,
    allowedPages: user?.allowedPages,
  });
  const can = (key: string) => privileges.includes(key);

  // ---------- Data ----------
  const { data, isLoading } = useQuery({
    queryKey: ["accountant-dashboard", token],
    enabled: !!token,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const safe = async <T,>(url: string, fallback: T): Promise<T> => {
        try {
          const res = await api.get(url, token!);
          if (!res.ok) return fallback;
          const json = await res.json();
          return (Array.isArray(json) ? json : fallback) as T;
        } catch {
          return fallback;
        }
      };

      const [feeStructures, students, payments, expenses, payroll, budgets] =
        await Promise.all([
          safe<FeeStructure[]>("/fees/structures", []),
          safe<Student[]>("/students", []),
          safe<Payment[]>("/fees/payments?limit=500", []),
          safe<Expense[]>("/expenses", []),
          safe<PayrollEntry[]>("/payroll", []),
          safe<Budget[]>("/budgets", []),
        ]);

      return { feeStructures, students, payments, expenses, payroll, budgets };
    },
  });

  const feeStructures = data?.feeStructures ?? [];
  const payments = data?.payments ?? [];
  const expenses = data?.expenses ?? [];
  const payroll = data?.payroll ?? [];
  const budgets = data?.budgets ?? [];

  // ---------- Derived metrics ----------
  const totalExpected = useMemo(
    () =>
      // totalAmount is already the class-wide total (per-student fee x student
      // count), computed when the structure was created — don't multiply again.
      feeStructures.reduce((sum, f) => sum + (f.totalAmount || 0), 0),
    [feeStructures],
  );

  const totalCollected = useMemo(
    () => payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0),
    [payments],
  );

  const totalOutstanding = Math.max(0, totalExpected - totalCollected);
  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
    [expenses],
  );

  const now = new Date();
  const thisMonthStr = now.toLocaleString("en-US", { month: "long" });
  // Payroll months are stored as "YYYY-MM" (see admin Payroll page), not as
  // the month name — compare in the same format or this month's entries never match.
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const collectedThisMonth = useMemo(
    () =>
      payments
        .filter((p) => new Date(p.paymentDate) >= monthStart)
        .reduce((sum, p) => sum + (p.amountPaid || 0), 0),
    [payments, monthStart],
  );

  const expensesThisMonth = useMemo(
    () =>
      expenses
        .filter((e) => new Date(e.date) >= monthStart)
        .reduce((sum, e) => sum + (e.amount || 0), 0),
    [expenses, monthStart],
  );

  const payrollThisMonth = useMemo(
    () => payroll.filter((p) => p.month === thisMonthKey),
    [payroll, thisMonthKey],
  );
  const payrollTotalThisMonth = payrollThisMonth.reduce(
    (sum, p) => sum + (p.amount || 0),
    0,
  );
  const payrollPending = payrollThisMonth.filter((p) => p.status !== "PAID");
  const payrollPendingTotal = payrollPending.reduce(
    (sum, p) => sum + (p.amount || 0),
    0,
  );

  // Recent activity feeds
  const recentPayments = useMemo(
    () =>
      [...payments]
        .sort(
          (a, b) =>
            new Date(b.paymentDate).getTime() -
            new Date(a.paymentDate).getTime(),
        )
        .slice(0, 5),
    [payments],
  );
  const recentExpenses = useMemo(() => expenses.slice(0, 5), [expenses]);

  // ---------- Budgets (current month, budget vs actual) ----------
  const budgetRows = useMemo(() => {
    const spentByCategory = new Map<string, number>();
    for (const e of expenses) {
      const d = new Date(e.date);
      if (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth()
      ) {
        spentByCategory.set(
          e.category,
          (spentByCategory.get(e.category) || 0) + (e.amount || 0),
        );
      }
    }
    return budgets
      .filter((b) => b.monthYear === thisMonthKey)
      .map((b) => ({
        ...b,
        spent: spentByCategory.get(b.category) || 0,
        pct: b.amount > 0 ? Math.min(100, Math.round(((spentByCategory.get(b.category) || 0) / b.amount) * 100)) : 100,
        over: (spentByCategory.get(b.category) || 0) > b.amount,
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);
  }, [budgets, expenses, thisMonthKey, now]);

  // Module cards — driven by the accountant's privileges
  const modules = [
    {
      key: "fees",
      name: "Fees",
      href: "/accountant/fees",
      icon: BanknotesIcon,
      value: fmt(totalCollected),
      sub: `${fmt(totalOutstanding)} outstanding`,
      tone: "emerald",
    },
    {
      key: "expenses",
      name: "Expenses",
      href: "/accountant/expenses",
      icon: ReceiptPercentIcon,
      value: fmt(totalExpenses),
      sub: `${fmt(expensesThisMonth)} this month`,
      tone: "rose",
    },
    {
      key: "payroll",
      name: "Payroll",
      href: "/accountant/payroll",
      icon: CurrencyDollarIcon,
      value: fmt(payrollTotalThisMonth),
      sub: payrollPending.length
        ? `${payrollPending.length} pending (${fmt(payrollPendingTotal)})`
        : "All paid this month",
      tone: "amber",
    },
  ].filter((m) => can(m.key));

  const toneClasses: Record<
    string,
    { icon: string; ring: string; text: string }
  > = {
    emerald: {
      icon: dark
        ? "bg-blue-500/15 text-blue-400"
        : "bg-blue-50 text-blue-600",
      ring: "ring-blue-500/20",
      text: "text-blue-500",
    },
    rose: {
      icon: dark
        ? "bg-indigo-500/15 text-indigo-400"
        : "bg-indigo-50 text-indigo-600",
      ring: "ring-indigo-500/20",
      text: "text-indigo-500",
    },
    amber: {
      icon: dark
        ? "bg-violet-500/15 text-violet-400"
        : "bg-violet-50 text-violet-600",
      ring: "ring-violet-500/20",
      text: "text-violet-500",
    },
    sky: {
      icon: dark
        ? "bg-sky-500/15 text-sky-400"
        : "bg-sky-50 text-sky-600",
      ring: "ring-sky-500/20",
      text: "text-sky-500",
    },
  };

  const collectionRate =
    totalExpected > 0
      ? Math.min(100, Math.round((totalCollected / totalExpected) * 100))
      : 0;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-6">
      {/* ===== Header ===== */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <SchoolLogo className="h-10 w-10" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {greeting}, {user?.name?.split(" ")[0] || "Accountant"} 👋
            </h1>
            <p
              className={`mt-1 text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}
            >
              Here's the financial position of the school at a glance.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
              dark
                ? "bg-blue-500/10 text-blue-400"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            <CheckCircleIcon className="h-4 w-4" />
            {thisMonthStr} {now.getFullYear()}
          </span>
        </div>
      </div>

      {/* ===== KPI strip ===== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={`h-32 animate-pulse rounded-2xl ${dark ? "bg-white/5" : "bg-white"}`}
              />
            ))
          : modules.map((m) => {
              const t = toneClasses[m.tone];
              return (
                <Link
                  key={m.key}
                  to={m.href}
                  className={`group rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                    dark
                      ? "bg-white/5 hover:bg-white/10"
                      : "bg-white hover:shadow-gray-200/60"
                  } ring-1 ${t.ring}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${t.icon}`}
                    >
                      <m.icon className="h-5 w-5" />
                    </span>
                    <ArrowRightIcon
                      className={`h-4 w-4 transition-transform group-hover:translate-x-1 ${
                        dark ? "text-gray-600" : "text-gray-300"
                      }`}
                    />
                  </div>
                  <p
                    className={`mt-4 text-xs font-medium uppercase tracking-wide ${dark ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {m.name}
                  </p>
                  <p className="mt-1 text-2xl font-bold tracking-tight">
                    {m.value}
                  </p>
                  <p
                    className={`mt-1 text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}
                  >
                    {m.sub}
                  </p>
                </Link>
              );
            })}
      </div>

      {/* ===== Collection progress + month summary ===== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Collection progress */}
        <div
          className={`rounded-2xl p-5 lg:col-span-2 ${dark ? "bg-white/5" : "bg-white"} ring-1 ${dark ? "ring-white/10" : "ring-gray-200"}`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide">
              Fee Collection Progress
            </h2>
            <span
              className={`text-2xl font-bold ${
                collectionRate >= 75
                  ? "text-blue-500"
                  : collectionRate >= 40
                    ? "text-indigo-500"
                    : "text-violet-500"
              }`}
            >
              {collectionRate}%
            </span>
          </div>
          <div
            className={`mt-3 h-3 w-full overflow-hidden rounded-full ${dark ? "bg-white/10" : "bg-gray-100"}`}
          >
            <div
              className={`h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-700`}
              style={{ width: `${collectionRate}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <p
                className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}
              >
                Expected
              </p>
              <p className="mt-0.5 text-sm font-bold">{fmt(totalExpected)}</p>
            </div>
            <div>
              <p
                className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}
              >
                Collected
              </p>
              <p className="mt-0.5 text-sm font-bold text-blue-500">
                {fmt(totalCollected)}
              </p>
            </div>
            <div>
              <p
                className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}
              >
                Outstanding
              </p>
              <p className="mt-0.5 text-sm font-bold text-indigo-500">
                {fmt(totalOutstanding)}
              </p>
            </div>
          </div>
        </div>

        {/* This month snapshot */}
        <div
          className={`rounded-2xl p-5 ${dark ? "bg-white/5" : "bg-white"} ring-1 ${dark ? "ring-white/10" : "ring-gray-200"}`}
        >
          <h2 className="text-sm font-bold uppercase tracking-wide">
            {thisMonthStr} Snapshot
          </h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span
                className={`flex items-center gap-2 text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}
              >
                <ArrowTrendingUpIcon className="h-4 w-4 text-blue-500" />{" "}
                Collected
              </span>
              <span className="text-sm font-bold text-blue-500">
                {fmt(collectedThisMonth)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span
                className={`flex items-center gap-2 text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}
              >
                <ArrowTrendingDownIcon className="h-4 w-4 text-indigo-500" />{" "}
                Expenses
              </span>
              <span className="text-sm font-bold text-indigo-500">
                {fmt(expensesThisMonth)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span
                className={`flex items-center gap-2 text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}
              >
                <CurrencyDollarIcon className="h-4 w-4 text-violet-500" />{" "}
                Payroll
              </span>
              <span className="text-sm font-bold text-violet-500">
                {fmt(payrollTotalThisMonth)}
              </span>
            </div>
            <div
              className={`border-t pt-3 ${dark ? "border-white/10" : "border-gray-100"}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">Net</span>
                <span
                  className={`text-sm font-bold ${collectedThisMonth - expensesThisMonth >= 0 ? "text-blue-500" : "text-indigo-500"}`}
                >
                  {collectedThisMonth - expensesThisMonth >= 0 ? "+" : ""}
                  {fmt(collectedThisMonth - expensesThisMonth)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Payroll alert (only when pending and payroll module unlocked) ===== */}
      {can("payroll") && payrollPending.length > 0 && (
        <div
          className={`flex items-center gap-3 rounded-2xl p-4 ${dark ? "bg-amber-500/10 ring-1 ring-amber-500/20" : "bg-amber-50 ring-1 ring-amber-200"}`}
        >
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 text-amber-500" />
          <p
            className={`flex-1 text-sm ${dark ? "text-amber-200" : "text-amber-800"}`}
          >
            <strong>
              {payrollPending.length} payroll entr
              {payrollPending.length === 1 ? "y" : "ies"}
            </strong>{" "}
            for {thisMonthStr} are awaiting payment ({fmt(payrollPendingTotal)}
            ).
          </p>
          <Link
            to="/accountant/payroll"
            className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition-colors hover:from-blue-600 hover:to-indigo-700"
          >
            Review payroll
          </Link>
        </div>
      )}

      {/* ===== Recent activity ===== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent payments */}
        <div
          className={`rounded-2xl p-5 ${dark ? "bg-white/5" : "bg-white"} ring-1 ${dark ? "ring-white/10" : "ring-gray-200"}`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide">
              Recent Payments
            </h2>
            {can("fees") && (
              <Link
                to="/accountant/fees"
                className={`text-xs font-semibold ${dark ? "text-blue-400" : "text-blue-600"}`}
              >
                View all →
              </Link>
            )}
          </div>
          <div className="mt-4 space-y-3">
            {recentPayments.length === 0 ? (
              <p
                className={`py-6 text-center text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}
              >
                No payments recorded yet.
              </p>
            ) : (
              recentPayments.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${dark ? "bg-blue-500/15 text-blue-400" : "bg-blue-50 text-blue-600"}`}
                  >
                    <BanknotesIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {p.student?.name || "Unknown student"}
                    </p>
                    <p
                      className={`truncate text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}
                    >
                      {p.feeStructure?.title ||
                        p.feeStructure?.className ||
                        "Fee"}{" "}
                      · {p.paymentMethod || "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-500">
                      {fmt(p.amountPaid)}
                    </p>
                    <p
                      className={`text-[11px] ${dark ? "text-gray-500" : "text-gray-400"}`}
                    >
                      {new Date(p.paymentDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent expenses */}
        <div
          className={`rounded-2xl p-5 ${dark ? "bg-white/5" : "bg-white"} ring-1 ${dark ? "ring-white/10" : "ring-gray-200"}`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide">
              Recent Expenses
            </h2>
            {can("expenses") && (
              <Link
                to="/accountant/expenses"
                className={`text-xs font-semibold ${dark ? "text-indigo-400" : "text-indigo-600"}`}
              >
                View all →
              </Link>
            )}
          </div>
          <div className="mt-4 space-y-3">
            {recentExpenses.length === 0 ? (
              <p
                className={`py-6 text-center text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}
              >
                No expenses recorded yet.
              </p>
            ) : (
              recentExpenses.map((e) => (
                <div key={e.id} className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${dark ? "bg-indigo-500/15 text-indigo-400" : "bg-indigo-50 text-indigo-600"}`}
                  >
                    <ReceiptPercentIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {e.description}
                    </p>
                    <p
                      className={`text-xs capitalize ${dark ? "text-gray-500" : "text-gray-400"}`}
                    >
                      {e.category}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-indigo-500">
                      −{fmt(e.amount)}
                    </p>
                    <p
                      className={`text-[11px] ${dark ? "text-gray-500" : "text-gray-400"}`}
                    >
                      {new Date(e.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ===== Budget vs actual (current month) ===== */}
      {can("expenses") && budgetRows.length > 0 && (
        <div
          className={`rounded-2xl p-5 ${dark ? "bg-white/5" : "bg-white"} ring-1 ${dark ? "ring-white/10" : "ring-gray-200"}`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide">
              Budgets — {thisMonthStr}
            </h2>
            <Link
              to="/accountant/expenses"
              className={`text-xs font-semibold ${dark ? "text-blue-400" : "text-blue-600"}`}
            >
              Manage budgets →
            </Link>
          </div>
          <div className="mt-4 space-y-4">
            {budgetRows.map((b) => (
              <div key={b.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold capitalize">{b.category}</span>
                  <span className={b.over ? "text-red-500" : dark ? "text-gray-400" : "text-gray-500"}>
                    {fmt(b.spent)} / {fmt(b.amount)}
                    {b.over && " · over budget"}
                  </span>
                </div>
                <div
                  className={`mt-1.5 h-2 w-full overflow-hidden rounded-full ${dark ? "bg-white/10" : "bg-gray-100"}`}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      b.over
                        ? "bg-gradient-to-r from-red-500 to-rose-600"
                        : b.pct >= 80
                          ? "bg-gradient-to-r from-amber-500 to-orange-500"
                          : "bg-gradient-to-r from-emerald-500 to-teal-600"
                    }`}
                    style={{ width: `${b.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== Pending payroll list ===== */}
      {can("payroll") && payrollPending.length > 0 && (
        <div
          className={`rounded-2xl p-5 ${dark ? "bg-white/5" : "bg-white"} ring-1 ${dark ? "ring-white/10" : "ring-gray-200"}`}
        >
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
              <ClockIcon className="h-4 w-4 text-indigo-500" /> Pending Payroll —{" "}
              {thisMonthStr}
            </h2>
            <Link
              to="/accountant/payroll"
              className={`text-xs font-semibold ${dark ? "text-indigo-400" : "text-indigo-600"}`}
            >
              Go to payroll →
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr
                  className={`border-b ${dark ? "border-white/10" : "border-gray-100"}`}
                >
                  <th
                    className={`py-2 pr-4 font-medium ${dark ? "text-gray-400" : "text-gray-500"}`}
                  >
                    Staff
                  </th>
                  <th
                    className={`py-2 pr-4 font-medium ${dark ? "text-gray-400" : "text-gray-500"}`}
                  >
                    Role
                  </th>
                  <th
                    className={`py-2 pr-4 text-right font-medium ${dark ? "text-gray-400" : "text-gray-500"}`}
                  >
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {payrollPending.slice(0, 5).map((p) => (
                  <tr
                    key={p.id}
                    className={`border-b last:border-0 ${dark ? "border-white/5" : "border-gray-50"}`}
                  >
                    <td className="py-2.5 pr-4 font-medium">{p.staffName}</td>
                    <td
                      className={`py-2.5 pr-4 capitalize ${dark ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {p.role.toLowerCase()}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-bold">
                      {fmt(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
