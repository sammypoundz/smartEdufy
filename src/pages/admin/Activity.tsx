// src/pages/admin/Activity.tsx
// Full activity feed — same data sources as the Overview page's "Recent
// Activity" widget (user registrations, fee payments, payroll runs) but
// aggregated in full with day grouping, type filters and search. The
// "See All" button on the Overview links here.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../../utils/api";
import { useTheme } from "../../contexts/ThemeContext";
import {
  ArrowPathIcon,
  BoltIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  UserPlusIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";

type ActivityType =
  | "registration"
  | "payment"
  | "payroll"
  | "result"
  | "assignment"
  | "attendance"
  | "other";

interface Activity {
  id: string;
  time: Date;
  description: string;
  type: ActivityType;
  path?: string;
}

const typeIcon = (type: ActivityType) => {
  switch (type) {
    case "registration":
      return <UserPlusIcon className="w-5 h-5 text-green-500" />;
    case "payment":
      return <CurrencyDollarIcon className="w-5 h-5 text-blue-500" />;
    case "payroll":
      return <WalletIcon className="w-5 h-5 text-purple-500" />;
    case "result":
      return <DocumentTextIcon className="w-5 h-5 text-yellow-500" />;
    default:
      return <DocumentTextIcon className="w-5 h-5 text-gray-400" />;
  }
};

const typeDot = (type: ActivityType) => {
  switch (type) {
    case "registration":
      return "bg-green-500";
    case "payment":
      return "bg-blue-500";
    case "payroll":
      return "bg-purple-500";
    case "result":
      return "bg-yellow-500";
    default:
      return "bg-gray-500";
  }
};

const fmtMoney = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount || 0);

const PAGE_SIZE = 30;

export default function ActivityPage() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"" | ActivityType>("");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["activity-feed"],
    async queryFn(): Promise<{
      schoolName: string;
      activities: Activity[];
    }> {
      // 1. School name (for the header)
      let schoolName = "";
      try {
        const meRes = await api.get("/auth/me");
        if (meRes.ok) {
          const me = await meRes.json();
          if (me.school?.name) schoolName = me.school.name;
        }
      } catch {}

      // 2. Recent user registrations
      let registrations: any[] = [];
      try {
        const usersRes = await api.get("/users");
        if (usersRes.ok) {
          const allUsers = await usersRes.json();
          if (Array.isArray(allUsers)) registrations = allUsers;
        }
      } catch {}

      // 3. Recent fee payments
      let payments: any[] = [];
      try {
        const feeRes = await api.get("/fees/payments");
        if (feeRes.ok) {
          const d = await feeRes.json();
          payments = Array.isArray(d) ? d : d.data || [];
        }
      } catch {}

      // 4. Recent payroll runs
      let payrolls: any[] = [];
      try {
        const payrollRes = await api.get("/payroll");
        if (payrollRes.ok) {
          const d = await payrollRes.json();
          payrolls = Array.isArray(d) ? d : d.data || [];
        }
      } catch {}

      // 5. Build the merged feed (same shape as the Overview widget)
      const activities: Activity[] = [
        ...registrations.map((u) => ({
          id: `reg-${u.id}`,
          time: new Date(u.createdAt),
          description: `${u.name || u.email} registered as ${u.role}`,
          type: "registration" as const,
          path: "/admin/users",
        })),
        ...payments.map((p) => ({
          id: `pay-${p.id}`,
          time: new Date(p.paymentDate || p.createdAt || Date.now()),
          description: `${p.student?.name || "Student"} paid ${fmtMoney(p.amountPaid)} fees`,
          type: "payment" as const,
          path: "/admin/fees",
        })),
        ...payrolls.map((p) => ({
          id: `pr-${p.id}`,
          time: new Date(p.paymentDate || p.createdAt || Date.now()),
          description: `${p.staffName || p.staff?.name || "Staff"} payroll processed (${p.month})`,
          type: "payroll" as const,
          path: "/admin/payroll",
        })),
      ].sort((a, b) => b.time.getTime() - a.time.getTime());

      return { schoolName, activities };
    },
  });

  const allActivities = data?.activities ?? [];

  // Apply type filter + search, then paginate client-side
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allActivities.filter((a) => {
      if (filter && a.type !== filter) return false;
      if (q && !a.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allActivities, filter, search]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const visible = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  // Group visible items into day buckets
  const groups: { label: string; items: Activity[] }[] = [];
  {
    const keyOf = (d: Date) => d.toDateString();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    for (const a of visible) {
      const label =
        keyOf(a.time) === keyOf(today)
          ? "Today"
          : keyOf(a.time) === keyOf(yesterday)
            ? "Yesterday"
            : a.time.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              });
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.items.push(a);
      else groups.push({ label, items: [a] });
    }
  }

  const card = dark
    ? "bg-white/5 backdrop-blur-xl border-white/10"
    : "bg-white/80 backdrop-blur-md border-gray-200/60";
  const inputCls = `pl-9 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    dark
      ? "bg-white/10 border-white/20 text-white placeholder-gray-500"
      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
  }`;

  const FILTERS: { value: "" | ActivityType; label: string }[] = [
    { value: "", label: "All" },
    { value: "registration", label: "Registrations" },
    { value: "payment", label: "Payments" },
    { value: "payroll", label: "Payroll" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1
            className={`text-2xl font-bold flex items-center gap-2 ${dark ? "text-white" : "text-gray-900"}`}
          >
            <BoltIcon className="h-7 w-7 text-blue-500" />
            Activity
          </h1>
          <p
            className={`text-sm mt-1 ${dark ? "text-gray-400" : "text-gray-500"}`}
          >
            {isLoading
              ? "Loading…"
              : isError
                ? "Couldn't load activities."
                : `${filtered.length} activit${filtered.length === 1 ? "y" : "ies"}${
                    data?.schoolName ? ` at ${data.schoolName}` : ""
                  }`}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
        >
          <ArrowPathIcon
            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />{" "}
          Refresh
        </button>
      </div>

      {/* Search + type filters */}
      <div
        className={`rounded-xl border p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center ${card}`}
      >
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search activities…"
            className={`w-full ${inputCls}`}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => {
                setFilter(f.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filter === f.value
                  ? "bg-blue-600 border-blue-600 text-white"
                  : dark
                    ? "border-white/20 text-gray-300 hover:bg-white/10"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      {isLoading && allActivities.length === 0 ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`h-16 rounded-xl animate-pulse ${dark ? "bg-white/5" : "bg-gray-100"}`}
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className={`rounded-xl border p-10 text-center ${card}`}>
          <UserGroupIcon
            className={`h-10 w-10 mx-auto mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}
          />
          <p className={dark ? "text-gray-300" : "text-gray-600"}>
            {allActivities.length === 0
              ? "No activity yet. Registrations, fee payments and payroll runs will appear here."
              : "No activities match your search or filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.label}>
              <div
                className={`flex items-center gap-3 mb-3 ${dark ? "text-gray-400" : "text-gray-500"}`}
              >
                <span
                  className={`text-xs font-semibold uppercase tracking-wider ${dark ? "text-gray-300" : "text-gray-500"}`}
                >
                  {group.label}
                </span>
                <div
                  className={`h-px flex-1 ${dark ? "bg-white/10" : "bg-gray-200"}`}
                />
                <span className="text-xs">
                  {group.items.length} event
                  {group.items.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="relative pl-8">
                {/* vertical line */}
                <div
                  className={`absolute left-3.5 top-2 bottom-2 w-px ${dark ? "bg-white/10" : "bg-gray-200"}`}
                />
                {group.items.map((a) => (
                  <div key={a.id} className="relative mb-3">
                    {/* dot on the line */}
                    <span
                      className={`absolute -left-[18px] top-5 h-3 w-3 rounded-full ring-4 ${
                        dark ? "ring-[#0B1120]" : "ring-blue-50"
                      } ${typeDot(a.type)}`}
                    />
                    <div
                      onClick={() => a.path && navigate(a.path)}
                      className={`rounded-xl border p-4 flex items-start gap-3 transition-colors cursor-pointer ${card} ${
                        dark ? "hover:bg-white/10" : "hover:bg-gray-50"
                      }`}
                    >
                      <div
                        className={`h-10 w-10 flex-shrink-0 rounded-lg flex items-center justify-center ${
                          dark ? "bg-white/5" : "bg-gray-50"
                        }`}
                      >
                        {typeIcon(a.type)}
                      </div>
                      <p
                        className={`flex-1 text-sm ${dark ? "text-gray-200" : "text-gray-700"}`}
                      >
                        {a.description}
                      </p>
                      <span
                        className={`text-xs whitespace-nowrap ${dark ? "text-gray-500" : "text-gray-400"}`}
                      >
                        {a.time.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div
          className={`flex items-center justify-between px-4 py-3 rounded-xl border ${card}`}
        >
          <span
            className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}
          >
            Showing {(safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length}
          </span>
          <div className="flex gap-2">
            <button
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={`p-2 rounded-lg disabled:opacity-40 ${dark ? "hover:bg-white/10" : "hover:bg-gray-100"}`}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <button
              disabled={safePage >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className={`p-2 rounded-lg disabled:opacity-40 ${dark ? "hover:bg-white/10" : "hover:bg-gray-100"}`}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
