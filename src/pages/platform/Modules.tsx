// Platform console pages: People (M3), Subscriptions (M4), Revenue (M5),
// Fees (M6), Wallets (M7), AI Usage (M8), Forecast (M10), System Health (M11),
// Notifications (M12), Audit Logs (M14).
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import platformApi from "../../utils/platformApi";
import {
  KpiCard,
  DataTable,
  Badge,
  Loading,
  ErrorState,
  formatNGN,
  formatNumber,
} from "./shared";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { useTheme } from "../../contexts/ThemeContext";

const useChartColors = () => {
  const { theme } = useTheme();
  const dark = theme === "dark";
  return {
    dark,
    grid: dark ? "#1f2937" : "#f3f4f6",
    axis: dark ? "#6b7280" : "#9ca3af",
    tooltip: dark
      ? {
          background: "#111827",
          border: "1px solid #374151",
          borderRadius: 12,
          color: "#e5e7eb",
        }
      : {
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          color: "#111827",
        },
  };
};

// ============================================================
// MODULE 3 — Students & Staff analytics
// ============================================================
export function PeoplePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["platform", "people"],
    queryFn: async () =>
      (await platformApi.get("/analytics/students-staff")).data,
  });
  const c = useChartColors();

  if (isLoading) return <Loading />;
  if (error)
    return (
      <ErrorState
        message={
          (error as any)?.response?.data?.error || "Failed to load analytics"
        }
      />
    );

  const series = (data.registrationSeries || []).map((r: any) => ({
    date: r.date.slice(5),
    students: r.count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          Students & Staff Analytics
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Platform-wide people intelligence. Sensitive student records are not
          exposed here.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard
          label="Total Students"
          value={formatNumber(data.totals.students)}
          tone="violet"
        />
        <KpiCard
          label="Active"
          value={formatNumber(data.totals.activeStudents)}
          tone="emerald"
        />
        <KpiCard
          label="Archived"
          value={formatNumber(data.totals.inactiveStudents)}
          tone="gray"
        />
        <KpiCard
          label="Teachers"
          value={formatNumber(data.totals.teachers)}
          tone="blue"
        />
        <KpiCard
          label="Parents"
          value={formatNumber(data.totals.parents)}
          tone="amber"
        />
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
        <h3 className="font-bold mb-3">
          Student Registration Growth (30 days)
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
            <XAxis dataKey="date" stroke={c.axis} fontSize={11} />
            <YAxis stroke={c.axis} fontSize={11} />
            <Tooltip contentStyle={c.tooltip} />
            <Line
              type="monotone"
              dataKey="students"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <h3 className="font-bold">Students per School</h3>
      <DataTable
        rows={data.perSchool}
        empty="No schools registered yet."
        columns={[
          {
            key: "name",
            label: "School",
            render: (r) => <span className="font-semibold">{r.name}</span>,
          },
          {
            key: "students",
            label: "Students",
            render: (r) => formatNumber(r.students),
          },
          {
            key: "teachers",
            label: "Teachers",
            render: (r) => formatNumber(r.teachers),
          },
          {
            key: "parents",
            label: "Parents",
            render: (r) => formatNumber(r.parents),
          },
          {
            key: "staff",
            label: "All Users",
            render: (r) => formatNumber(r.staff),
          },
          {
            key: "status",
            label: "Status",
            render: (r) => (
              <Badge status={r.isActive ? "ACTIVE" : "SUSPENDED"} />
            ),
          },
        ]}
      />
    </div>
  );
}

// ============================================================
// MODULE 4 — Subscriptions & billing
// ============================================================
export function SubscriptionsPage() {
  const [showPlan, setShowPlan] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const qc = useQueryClient();
  const subs = useQuery({
    queryKey: ["platform", "subscriptions"],
    queryFn: async () => (await platformApi.get("/subscriptions")).data,
  });
  const plans = useQuery({
    queryKey: ["platform", "plans"],
    queryFn: async () => (await platformApi.get("/plans")).data,
  });

  const createPlan = useMutation({
    mutationFn: async (p: any) => platformApi.post("/plans", p),
    onSuccess: () => {
      toast.success("Plan created");
      setShowPlan(false);
      qc.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Failed to create plan"),
  });

  const assign = useMutation({
    mutationFn: async (p: any) => platformApi.post("/subscriptions", p),
    onSuccess: () => {
      toast.success("Subscription assigned");
      setShowAssign(false);
      qc.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Failed to assign subscription"),
  });

  const d = subs.data;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Subscriptions & Billing
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Plans, school subscriptions and payment history. Payments are only
            recorded when verified.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAssign(true)}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md"
          >
            Assign Plan
          </button>
          <button
            onClick={() => setShowPlan(true)}
            className="rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm font-bold"
          >
            New Plan
          </button>
        </div>
      </div>

      {subs.isLoading ? (
        <Loading />
      ) : d ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              label="Active"
              value={formatNumber(d.summary.active)}
              tone="emerald"
            />
            <KpiCard
              label="Expired"
              value={formatNumber(d.summary.expired)}
              tone="rose"
            />
            <KpiCard
              label="Trial"
              value={d.subscriptions.filter((s: any) => s.trial).length}
              tone="amber"
            />
            <KpiCard
              label="Pending Renewal"
              value={
                d.subscriptions.filter(
                  (s: any) => s.status === "PENDING_RENEWAL",
                ).length
              }
              tone="gray"
            />
          </div>

          <DataTable
            rows={d.subscriptions}
            empty="No subscriptions yet. Assign a plan to a school."
            columns={[
              {
                key: "schoolId",
                label: "School ID",
                render: (r) => (
                  <span className="text-xs font-mono">
                    {r.schoolId.slice(-8)}
                  </span>
                ),
              },
              {
                key: "plan",
                label: "Plan",
                render: (r) => r.plan?.name || "—",
              },
              {
                key: "status",
                label: "Status",
                render: (r) => <Badge status={r.status} />,
              },
              { key: "billingCycle", label: "Cycle" },
              {
                key: "endDate",
                label: "Expires",
                render: (r) => new Date(r.endDate).toLocaleDateString(),
              },
              {
                key: "totalPaid",
                label: "Paid (verified)",
                render: (r) => formatNGN(r.totalPaid || 0),
              },
            ]}
          />

          <h3 className="font-bold">Available Plans</h3>
          <DataTable
            rows={plans.data || []}
            empty="No plans configured yet."
            columns={[
              {
                key: "name",
                label: "Plan",
                render: (r) => <span className="font-semibold">{r.name}</span>,
              },
              {
                key: "monthlyPrice",
                label: "Price/month",
                render: (r) => formatNGN(r.monthlyPrice),
              },
              {
                key: "maxStudents",
                label: "Max Students",
                render: (r) =>
                  r.maxStudents ? formatNumber(r.maxStudents) : "Unlimited",
              },
              {
                key: "isActive",
                label: "Status",
                render: (r) => (
                  <Badge status={r.isActive ? "ACTIVE" : "SUSPENDED"} />
                ),
              },
            ]}
          />
        </>
      ) : null}

      {showPlan && (
        <Modal
          title="Create Subscription Plan"
          onClose={() => setShowPlan(false)}
        >
          <PlanForm
            onSubmit={(p: any) => createPlan.mutate(p)}
            loading={createPlan.isPending}
          />
        </Modal>
      )}
      {showAssign && (
        <Modal
          title="Assign Subscription to School"
          onClose={() => setShowAssign(false)}
        >
          <AssignForm
            plans={plans.data || []}
            onSubmit={(p: any) => assign.mutate(p)}
            loading={assign.isPending}
          />
        </Modal>
      )}
    </div>
  );
}

function AssignForm({ plans, onSubmit, loading }: any) {
  const [form, setForm] = useState({ schoolId: "", planId: "", months: 1 });
  const set = (k: string) => (e: any) =>
    setForm((f: any) => ({ ...f, [k]: e.target.value }));
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
          School ID
        </label>
        <input
          value={form.schoolId}
          onChange={set("schoolId")}
          className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-4 py-2.5 text-sm"
          placeholder="Mongo ObjectId of the school"
        />
      </div>
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Plan
        </label>
        <select
          value={form.planId}
          onChange={set("planId")}
          className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-4 py-2.5 text-sm"
        >
          <option value="">Select a plan…</option>
          {plans.map((p: any) => (
            <option key={p.id} value={p.id}>
              {p.name} — {formatNGN(p.monthlyPrice)}/mo
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Duration (months)
        </label>
        <input
          type="number"
          min={1}
          value={form.months}
          onChange={set("months")}
          className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-4 py-2.5 text-sm"
        />
      </div>
      <button
        onClick={() => onSubmit(form)}
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
      >
        {loading ? "Assigning…" : "Assign Subscription"}
      </button>
    </div>
  );
}

function PlanForm({ onSubmit, loading }: any) {
  const [form, setForm] = useState({
    name: "",
    monthlyPrice: 10000,
    maxStudents: "",
  });
  const set = (k: string) => (e: any) =>
    setForm((f: any) => ({ ...f, [k]: e.target.value }));
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Plan Name
        </label>
        <input
          value={form.name}
          onChange={set("name")}
          className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-4 py-2.5 text-sm"
          placeholder="e.g. Basic, Pro, Enterprise"
        />
      </div>
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Monthly Price (₦)
        </label>
        <input
          type="number"
          value={form.monthlyPrice}
          onChange={set("monthlyPrice")}
          className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-4 py-2.5 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Max Students (optional)
        </label>
        <input
          type="number"
          value={form.maxStudents}
          onChange={set("maxStudents")}
          className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-4 py-2.5 text-sm"
        />
      </div>
      <button
        onClick={() =>
          onSubmit({
            name: form.name,
            monthlyPrice: Number(form.monthlyPrice),
            maxStudents: form.maxStudents
              ? Number(form.maxStudents)
              : undefined,
          })
        }
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create Plan"}
      </button>
    </div>
  );
}

// ============================================================
// MODULE 5 — Revenue & finance
// ============================================================
export function RevenuePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["platform", "revenue"],
    queryFn: async () => (await platformApi.get("/revenue")).data,
  });
  const c = useChartColors();

  if (isLoading) return <Loading />;
  if (error)
    return (
      <ErrorState
        message={
          (error as any)?.response?.data?.error || "Failed to load revenue"
        }
      />
    );

  const monthly = (data.monthlySeries || []).map((m: any) => ({
    month: m.month.slice(5),
    subscriptions: m.subs,
    tokens: m.tokens,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          Revenue & Finance
        </h1>
        <p className="text-sm text-gray-500 mt-1">{data.note}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard
          label="Gross Revenue"
          value={formatNGN(data.grossRevenue)}
          tone="emerald"
        />
        <KpiCard
          label="Subscriptions"
          value={formatNGN(data.subRevenue)}
          tone="blue"
        />
        <KpiCard
          label="Token Sales"
          value={formatNGN(data.tokenRevenue)}
          tone="violet"
        />
        <KpiCard
          label="AI Expenses"
          value={formatNGN(data.aiExpenses)}
          tone="rose"
        />
        <KpiCard
          label="Other Expenses"
          value={formatNGN(data.otherExpenses)}
          tone="amber"
        />
        <KpiCard
          label="Contribution Margin"
          value={formatNGN(data.contributionMargin)}
          tone="emerald"
        />
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
        <h3 className="font-bold mb-3">Monthly Revenue (last 12 months)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
            <XAxis dataKey="month" stroke={c.axis} fontSize={11} />
            <YAxis
              stroke={c.axis}
              fontSize={11}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={c.tooltip}
              formatter={(v: any) => formatNGN(v)}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="subscriptions"
              name="Subscriptions"
              stroke="#3b82f6"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="tokens"
              name="Token Sales"
              stroke="#8b5cf6"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ============================================================
// MODULE 6 — School fee analytics
// ============================================================
export function FeeAnalyticsPage() {
  const [schoolId] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["platform", "fees", schoolId],
    queryFn: async () =>
      (await platformApi.get(`/fees${schoolId ? `?schoolId=${schoolId}` : ""}`))
        .data,
  });

  if (isLoading) return <Loading />;
  if (error)
    return (
      <ErrorState
        message={
          (error as any)?.response?.data?.error ||
          "Failed to load fee analytics"
        }
      />
    );

  const totals = (data.rows || []).reduce(
    (a: any, r: any) => ({
      billed: a.billed + r.billed,
      collected: a.collected + r.collected,
      outstanding: a.outstanding + r.outstanding,
    }),
    { billed: 0, collected: 0, outstanding: 0 },
  );
  const avgRate =
    totals.billed > 0
      ? Math.round((totals.collected / totals.billed) * 1000) / 10
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          School Fee Analytics
        </h1>
        <p className="text-sm text-gray-500 mt-1">{data.accountingNote}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard
          label="Total Billed"
          value={formatNGN(totals.billed)}
          tone="blue"
        />
        <KpiCard
          label="Collected"
          value={formatNGN(totals.collected)}
          tone="emerald"
        />
        <KpiCard
          label="Outstanding"
          value={formatNGN(totals.outstanding)}
          tone="rose"
        />
        <KpiCard label="Collection Rate" value={`${avgRate}%`} tone="amber" />
        <KpiCard
          label="Schools Reporting"
          value={formatNumber((data.rows || []).length)}
          tone="gray"
        />
      </div>

      <DataTable
        rows={data.rows || []}
        empty="No fee records yet across schools."
        columns={[
          {
            key: "schoolName",
            label: "School",
            render: (r) => (
              <span className="font-semibold">{r.schoolName}</span>
            ),
          },
          {
            key: "billed",
            label: "Billed",
            render: (r) => formatNGN(r.billed),
          },
          {
            key: "collected",
            label: "Collected",
            render: (r) => formatNGN(r.collected),
          },
          {
            key: "outstanding",
            label: "Outstanding",
            render: (r) => formatNGN(r.outstanding),
          },
          {
            key: "collectionRate",
            label: "Rate",
            render: (r) => `${r.collectionRate}%`,
          },
        ]}
      />
    </div>
  );
}

// ============================================================
// MODULE 7 — Edufy wallet & token management
// ============================================================
export function WalletsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adjust, setAdjust] = useState<{ tokens: string; reason: string }>({
    tokens: "",
    reason: "",
  });
  const [tokenPrice, setTokenPrice] = useState("");
  const qc = useQueryClient();

  const wallets = useQuery({
    queryKey: ["platform", "wallets"],
    queryFn: async () => (await platformApi.get("/wallets")).data,
  });
  const price = useQuery({
    queryKey: ["platform", "tokenPrice"],
    queryFn: async () => (await platformApi.get("/settings/token-price")).data,
  });
  const walletDetail = useQuery({
    queryKey: ["platform", "wallet", selectedId],
    enabled: !!selectedId,
    queryFn: async () => (await platformApi.get(`/wallets/${selectedId}`)).data,
  });

  const adjustMutation = useMutation({
    mutationFn: async ({ schoolId, tokens, reason }: any) =>
      platformApi.post(`/wallets/${schoolId}/adjust`, {
        tokens: Number(tokens),
        reason,
      }),
    onSuccess: () => {
      toast.success("Wallet adjusted");
      setAdjust({ tokens: "", reason: "" });
      qc.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Adjustment failed"),
  });

  const updatePrice = useMutation({
    mutationFn: async (p: number) =>
      platformApi.put("/settings/token-price", { tokenPrice: p }),
    onSuccess: () => {
      toast.success("Token price updated");
      qc.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Failed to update price"),
  });

  if (wallets.isLoading || price.isLoading) return <Loading />;
  const w = wallets.data;
  const pr = price.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Edufy Wallet & Tokens
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Token purchases, consumption and school wallets across SmartEdufy
            Lite.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={tokenPrice}
            onChange={(e) => setTokenPrice(e.target.value)}
            placeholder={`Current: ₦${pr?.tokenPrice}`}
            className="rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-900 px-4 py-2.5 text-sm w-40"
          />
          <button
            onClick={() => tokenPrice && updatePrice.mutate(Number(tokenPrice))}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white"
          >
            Update Price
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard
          label="Tokens Sold"
          value={formatNumber(w.totals.sold)}
          tone="blue"
        />
        <KpiCard
          label="Tokens Consumed"
          value={formatNumber(w.totals.consumed)}
          tone="violet"
        />
        <KpiCard
          label="Unused Balances"
          value={formatNumber(
            w.wallets.reduce((s: any, x: any) => s + x.balance, 0),
          )}
          tone="amber"
        />
        <KpiCard
          label="Token Sales Revenue"
          value={formatNGN(w.totals.salesRevenue)}
          tone="emerald"
        />
        <KpiCard label="Token Price" value={`₦${w.tokenPrice}`} tone="gray" />
      </div>

      <DataTable
        rows={w.wallets}
        empty="No school wallets yet. Wallets are created on first token purchase or AI scan."
        columns={[
          {
            key: "schoolName",
            label: "School",
            render: (r) => (
              <button
                onClick={() => setSelectedId(r.schoolId)}
                className="font-semibold text-blue-600 hover:underline"
              >
                {r.schoolName}
              </button>
            ),
          },
          {
            key: "balance",
            label: "Balance",
            render: (r) => formatNumber(r.balance),
          },
          {
            key: "reserved",
            label: "Reserved",
            render: (r) => formatNumber(r.reserved),
          },
          {
            key: "lifetimePurchased",
            label: "Purchased",
            render: (r) => formatNumber(r.lifetimePurchased),
          },
          {
            key: "lifetimeConsumed",
            label: "Consumed",
            render: (r) => formatNumber(r.lifetimeConsumed),
          },
          {
            key: "value",
            label: "Balance Value",
            render: (r) => formatNGN(r.balance * w.tokenPrice),
          },
        ]}
      />

      {selectedId && walletDetail.data && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/50"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="w-full max-w-xl h-full overflow-y-auto bg-white dark:bg-gray-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-extrabold">
                {walletDetail.data.school} — Wallet
              </h2>
              <button
                onClick={() => setSelectedId(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <KpiCard
                label="Balance"
                value={formatNumber(walletDetail.data.wallet.balance)}
                tone="blue"
              />
              <KpiCard
                label="Reserved"
                value={formatNumber(walletDetail.data.wallet.reserved)}
                tone="amber"
              />
              <KpiCard
                label="Consumed"
                value={formatNumber(walletDetail.data.wallet.lifetimeConsumed)}
                tone="gray"
              />
            </div>

            <h3 className="font-bold mb-2">Wallet Adjustment</h3>
            <div className="flex gap-2 mb-6">
              <input
                type="number"
                value={adjust.tokens}
                placeholder="Tokens (±)"
                onChange={(e) =>
                  setAdjust((a) => ({ ...a, tokens: e.target.value }))
                }
                className="flex-1 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-4 py-2.5 text-sm"
              />
              <input
                value={adjust.reason}
                placeholder="Reason (required)"
                onChange={(e) =>
                  setAdjust((a) => ({ ...a, reason: e.target.value }))
                }
                className="flex-1 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-4 py-2.5 text-sm"
              />
              <button
                onClick={() =>
                  adjustMutation.mutate({ schoolId: selectedId, ...adjust })
                }
                disabled={adjustMutation.isPending || !adjust.reason}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                Adjust
              </button>
            </div>

            <h3 className="font-bold mb-2">Ledger (last 100)</h3>
            <div className="space-y-1 text-sm max-h-96 overflow-y-auto">
              {walletDetail.data.ledger.map((l: any) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 py-2"
                >
                  <div>
                    <Badge status={l.type} />
                    <span className="ml-2 text-gray-500 text-xs">
                      {l.reference || "—"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-bold ${
                        l.amount > 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {l.amount > 0 ? "+" : ""}
                      {formatNumber(l.amount)}
                    </span>
                    <span className="block text-[10px] text-gray-400">
                      {new Date(l.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MODULE 8 — AI usage & profitability
// ============================================================
export function AiUsagePage() {
  const [schoolId, setSchoolId] = useState("");
  const [operation, setOperation] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["platform", "ai", schoolId, operation],
    queryFn: async () =>
      (
        await platformApi.get(
          `/ai/usage?schoolId=${schoolId}&operation=${operation}`,
        )
      ).data,
  });
  const c = useChartColors();

  if (isLoading) return <Loading />;
  if (error)
    return (
      <ErrorState
        message={
          (error as any)?.response?.data?.error || "Failed to load AI analytics"
        }
      />
    );

  const d = data;
  const byOperation = (d.byOperation || []).map((o: any) => ({
    name: o.operation,
    cost: o._sum.costNgn || 0,
    scans: o._count.id,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            AI Usage & Costs
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Every AI operation, its model cost and its revenue contribution.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            placeholder="School ID filter"
            className="rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-900 px-4 py-2.5 text-sm"
          />
          <select
            value={operation}
            onChange={(e) => setOperation(e.target.value)}
            className="rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-900 px-4 py-2.5 text-sm"
          >
            <option value="">All operations</option>
            <option value="RESULT_SCAN">Result Scan</option>
            <option value="ONBOARDING_EXTRACT">Onboarding Extract</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
        <KpiCard
          label="Total AI Requests"
          value={formatNumber(d.totals.requests)}
          tone="blue"
        />
        <KpiCard
          label="Successful"
          value={formatNumber(d.totals.success)}
          tone="emerald"
        />
        <KpiCard
          label="Failed"
          value={formatNumber(d.totals.failed)}
          tone="rose"
        />
        <KpiCard
          label="AI Cost"
          value={formatNGN(d.totals.aiCost)}
          tone="rose"
        />
        <KpiCard
          label="Scan Revenue"
          value={formatNGN(d.totals.revenue)}
          tone="emerald"
        />
        <KpiCard
          label="Contribution"
          value={formatNGN(d.totals.revenue - d.totals.aiCost)}
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <h3 className="font-bold mb-3">Cost per Operation</h3>
          {byOperation.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={byOperation}>
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                <XAxis dataKey="name" stroke={c.axis} fontSize={10} />
                <YAxis stroke={c.axis} fontSize={11} />
                <Tooltip
                  contentStyle={c.tooltip}
                  formatter={(v: any) => formatNGN(v)}
                />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke="#f59e0b"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500 text-center py-10">
              No AI operations recorded yet.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <h3 className="font-bold mb-3">Cost per School</h3>
          <DataTable
            rows={(d.bySchool || []).map((b: any) => ({
              id: b.schoolId || "platform",
              name: b.schoolId
                ? d.schoolNames?.[b.schoolId] || b.schoolId.slice(-8)
                : "Platform (internal)",
              cost: b._sum.costNgn || 0,
              requests: b._count.id,
            }))}
            empty="No AI usage recorded per school yet."
            columns={[
              {
                key: "name",
                label: "School",
                render: (r) => <span className="font-semibold">{r.name}</span>,
              },
              { key: "requests", label: "Requests" },
              { key: "cost", label: "Cost", render: (r) => formatNGN(r.cost) },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODULE 10 — Forecasting & growth roadmap
// ============================================================
export function ForecastPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["platform", "forecast"],
    queryFn: async () => (await platformApi.get("/forecast")).data,
  });
  const c = useChartColors();
  const [studentsPerSchool, setStudents] = useState(500);
  const [adoption, setAdoption] = useState(70);
  const [tokensPerStudent, setTokens] = useState(1.2);
  const [aiCostPerScan, setAiCost] = useState(15);

  if (isLoading) return <Loading />;
  if (error)
    return (
      <ErrorState
        message={
          (error as any)?.response?.data?.error || "Failed to load forecast"
        }
      />
    );

  const milestones = [10, 25, 50, 100, 200, 300, 500, 750, 1000];
  const scenario = (schools: number, factor: number) => {
    const paying = schools * (adoption / 100);
    const students = paying * studentsPerSchool;
    const tokensYear = students * tokensPerStudent * 3; // 3 terms/year
    const gross = tokensYear * (data?.tokenPrice || 100) * factor;
    const aiCost = tokensYear * (aiCostPerScan / 1) * 0.15; // illustrative per-token cost
    return { schools, gross, aiCost, after: gross - aiCost };
  };
  const rows = milestones.map((s) => scenario(s, 1));
  const optimistic = milestones.map((s) => scenario(s, 1.25));
  const conservative = milestones.map((s) => scenario(s, 0.75));
  const chartData = milestones.map((s, i) => ({
    schools: s,
    conservative: conservative[i].after,
    expected: rows[i].after,
    optimistic: optimistic[i].after,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          Revenue Forecast & Growth Roadmap
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Scenario projections — clearly labeled as forecasts, not actual
          financial results. All assumptions are editable.
        </p>
      </div>

      {/* Assumption editor */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Students / School
          </label>
          <input
            type="number"
            value={studentsPerSchool}
            onChange={(e) => setStudents(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Paying Adoption %
          </label>
          <input
            type="number"
            value={adoption}
            onChange={(e) => setAdoption(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Tokens / Student / Term
          </label>
          <input
            type="number"
            step="0.1"
            value={tokensPerStudent}
            onChange={(e) => setTokens(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
            AI Cost per Scan (₦)
          </label>
          <input
            type="number"
            value={aiCostPerScan}
            onChange={(e) => setAiCost(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
        <h3 className="font-bold mb-3">
          After-AI-Cost Revenue by School Count (3 scenarios)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
            <XAxis dataKey="schools" stroke={c.axis} fontSize={11} />
            <YAxis
              stroke={c.axis}
              fontSize={11}
              tickFormatter={(v) => `₦${(v / 1_000_000).toFixed(1)}M`}
            />
            <Tooltip
              contentStyle={c.tooltip}
              formatter={(v: any) => formatNGN(v)}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="conservative"
              name="Conservative"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="4 4"
            />
            <Line
              type="monotone"
              dataKey="expected"
              name="Expected"
              stroke="#3b82f6"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="optimistic"
              name="Optimistic"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="4 4"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <h3 className="font-bold">Growth Milestones</h3>
      <DataTable
        rows={rows}
        empty="No milestone data."
        columns={[
          {
            key: "schools",
            label: "Schools",
            render: (r) => (
              <span className="font-bold">{formatNumber(r.schools)}</span>
            ),
          },
          {
            key: "gross",
            label: "Annual Gross Token Revenue",
            render: (r) => formatNGN(r.gross),
          },
          {
            key: "aiCost",
            label: "Annual AI Costs",
            render: (r) => formatNGN(r.aiCost),
          },
          {
            key: "after",
            label: "After AI Costs",
            render: (r) => (
              <span className="font-bold text-emerald-600">
                {formatNGN(r.after)}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}

// ============================================================
// Module 11 — System health
// ============================================================
export function SystemHealthPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["platform", "health"],
    queryFn: async () => (await platformApi.get("/system/health")).data,
    refetchInterval: 30_000,
  });

  if (isLoading) return <Loading />;
  if (error)
    return (
      <ErrorState
        message={
          (error as any)?.response?.data?.error ||
          "Failed to load system health"
        }
      />
    );

  const d = data;
  const services = [
    { name: "API", status: d.api === "UP" ? "UP" : "DOWN" },
    {
      name: "Database (MongoDB Atlas)",
      status: d.database === "UP" ? "UP" : "DOWN",
    },
    {
      name: "AI Provider (Gemini)",
      status: d.aiProvider === "UP" ? "UP" : "DEGRADED",
    },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          System Health
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Live infrastructure status. Refreshes every 30 seconds.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {services.map((s) => (
          <div
            key={s.name}
            className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">{s.name}</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                  s.status === "UP"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                    : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    s.status === "UP"
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-rose-500"
                  }`}
                />
                {s.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          label="Failed Syncs (7d)"
          value={formatNumber(d.failedSyncs)}
          tone="rose"
        />
        <KpiCard label="Schools" value={formatNumber(d.schools)} tone="blue" />
        <KpiCard
          label="Lite Offline Sync"
          value={d.schools > 0 ? "Active" : "No data"}
          tone="gray"
        />
      </div>
    </div>
  );
}

// ============================================================
// Module 12 — Notifications
// ============================================================
export function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["platform", "notifications", unreadOnly],
    queryFn: async () =>
      (await platformApi.get(`/notifications?unread=${unreadOnly}`)).data,
  });
  const markRead = useMutation({
    mutationFn: async (id: string) =>
      platformApi.patch(`/notifications/${id}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform"] }),
  });
  const markAll = useMutation({
    mutationFn: async () => platformApi.patch("/notifications/read-all", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform"] }),
  });

  if (isLoading) return <Loading />;
  if (error)
    return (
      <ErrorState
        message={
          (error as any)?.response?.data?.error ||
          "Failed to load notifications"
        }
      />
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Notifications
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {data.unreadCount} unread
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold ${
              unreadOnly
                ? "bg-blue-600 text-white"
                : "border border-gray-300 dark:border-gray-700"
            }`}
          >
            {unreadOnly ? "Showing unread" : "Show unread only"}
          </button>
          <button
            onClick={() => markAll.mutate()}
            className="rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm font-bold"
          >
            Mark all read
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {(data.notifications || []).length === 0 && (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-10 text-center text-sm text-gray-500">
            No notifications yet.
          </div>
        )}
        {(data.notifications || []).map((n: any) => (
          <button
            key={n.id}
            onClick={() => !n.isRead && markRead.mutate(n.id)}
            className={`w-full text-left rounded-2xl border p-4 transition ${
              n.isRead
                ? "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                : "border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-500/10"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-sm">{n.title}</span>
              <div className="flex items-center gap-2">
                <Badge status={n.type} />
                <Badge status={n.severity} />
                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-500">{n.message}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Module 14 — Audit logs
// ============================================================
export function AuditLogsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["platform", "audit"],
    queryFn: async () => (await platformApi.get("/audit-logs")).data,
  });
  if (isLoading) return <Loading />;
  if (error)
    return (
      <ErrorState
        message={
          (error as any)?.response?.data?.error || "Failed to load audit logs"
        }
      />
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          Audit Logs
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Every sensitive platform action is recorded here.
        </p>
      </div>
      <DataTable
        rows={data.logs || []}
        empty="No audit entries yet."
        columns={[
          {
            key: "createdAt",
            label: "When",
            render: (r) => new Date(r.createdAt).toLocaleString(),
          },
          {
            key: "actorName",
            label: "Actor",
            render: (r) => (
              <span className="font-semibold">{r.actorName || "Unknown"}</span>
            ),
          },
          {
            key: "action",
            label: "Action",
            render: (r) => <Badge status={r.action} />,
          },
          { key: "description", label: "Description" },
          {
            key: "ip",
            label: "IP",
            render: (r) => (
              <span className="text-xs text-gray-400">
                {r.ipAddress || "—"}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}

// Shared modal
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-extrabold text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
