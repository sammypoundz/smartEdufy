// Platform console pages: People (M3), Subscriptions (M4), Revenue (M5),
// Fees (M6), Wallets (M7), AI Usage (M8), Forecast (M10), System Health (M11),
// Notifications (M12), Audit Logs (M14).
import { useState, useEffect } from "react";
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
  const schools = useQuery({
    queryKey: ["platform", "schools", "all"],
    queryFn: async () =>
      (await platformApi.get("/schools?pageSize=100")).data.schools,
  });
  const plans = useQuery({
    queryKey: ["platform", "plans"],
    queryFn: async () => (await platformApi.get("/plans")).data,
  });
  const overrides = useQuery({
    queryKey: ["platform", "price-overrides"],
    queryFn: async () => (await platformApi.get("/price-overrides")).data,
  });
  const overview = useQuery({
    queryKey: ["platform", "billing-overview"],
    queryFn: async () => (await platformApi.get("/billing/overview")).data,
  });
  const invoices = useQuery({
    queryKey: ["platform", "invoices"],
    queryFn: async () => (await platformApi.get("/invoices?limit=200")).data,
  });

  // Invoice actions: pay / void / generate
  const payInvoice = useMutation({
    mutationFn: async ({ id, paymentRef }: any) =>
      platformApi.post(`/invoices/${id}/pay`, { paymentRef }),
    onSuccess: () => {
      toast.success("Invoice marked paid — subscription extended");
      qc.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Failed to record payment"),
  });
  const voidInvoice = useMutation({
    mutationFn: async (id: string) =>
      platformApi.post(`/invoices/${id}/void`, {}),
    onSuccess: () => {
      toast.success("Invoice voided");
      qc.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Failed to void invoice"),
  });
  const runCron = useMutation({
    mutationFn: async () => platformApi.post("/billing/cron", {}),
    onSuccess: (r: any) => {
      const d = r.data;
      toast.success(
        `Cron done — ${d.expired} expired, ${d.invoices} invoiced, ${d.allocated} allocations`,
      );
      qc.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Cron failed"),
  });

  // Billing plans are FIXED to the two canonical types — edit-only, no create.
  const updatePlan = useMutation({
    mutationFn: async (p: { id: string; data: any }) =>
      platformApi.put(`/plans/${p.id}`, p.data),
    onSuccess: () => {
      toast.success("Billing plan updated");
      setShowPlan(false);
      qc.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Failed to update plan"),
  });

  const assign = useMutation({
    mutationFn: async (p: any) => {
      // Backend takes one school per call — loop over every selected school.
      const results = await Promise.allSettled(
        (p.schoolIds as string[]).map((schoolId: string) =>
          platformApi.post("/subscriptions", { ...p, schoolId }),
        ),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed)
        throw new Error(
          `${failed} of ${p.schoolIds.length} assignments failed`,
        );
      return results;
    },
    onSuccess: () => {
      toast.success("Subscription assigned");
      setShowAssign(false);
      qc.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || e?.message || "Failed to assign subscription"),
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
            Edit Billing Plans
          </button>
          <button
            onClick={() => runCron.mutate()}
            disabled={runCron.isPending}
            className="rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm font-bold disabled:opacity-50"
            title="Run expiry sweep + auto-invoicing + token allocation now"
          >
            {runCron.isPending ? "Running…" : "Run Billing Cron"}
          </button>
        </div>
      </div>

      {overview.data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            label="Pending Invoices"
            value={formatNGN(overview.data.pendingAmount)}
            tone="amber"
          />
          <KpiCard
            label="Collected"
            value={formatNGN(overview.data.collectedAmount)}
            tone="emerald"
          />
          <KpiCard
            label="Overdue Invoices"
            value={formatNumber(overview.data.overdue)}
            tone="rose"
          />
          <KpiCard
            label="Total Invoices"
            value={formatNumber(overview.data.invoicesCount)}
            tone="blue"
          />
        </div>
      )}

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
                label: "School",
                render: (r) =>
                  r.schoolName || (
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
                key: "pricePerCycle",
                label: "Price/cycle",
                render: (r) =>
                  r.studentSnapshotCount != null
                    ? `${formatNGN(r.pricePerCycle || 0)} (${formatNumber(r.studentSnapshotCount)} students)`
                    : r.pricePerCycle
                      ? formatNGN(r.pricePerCycle)
                      : "—",
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

          <h3 className="font-bold">Available Plans & Tier Pricing</h3>
          <DataTable
            rows={(plans.data || []).filter((p: any) => p.isActive)}
            empty="No plans configured yet."
            columns={[
              {
                key: "name",
                label: "Plan",
                render: (r) => (
                  <span className="font-semibold">{r.name}</span>
                ),
              },
              {
                key: "type",
                label: "Type",
                render: (r) => <Badge status={r.type || "FIXED"} />,
              },
              {
                key: "price",
                label: "Price",
                render: (r) =>
                  r.type === "STUDENT_BASED"
                    ? `${formatNGN(r.perStudentRate || 0)} / student / term`
                    : r.type === "FREE"
                      ? "Free"
                      : `${formatNGN(r.monthlyPrice)} / month`,
              },
              {
                key: "overrides",
                label: "Cycle prices",
                render: (r) => {
                  const rows = (overrides.data || []).filter(
                    (o: any) => o.planId === r.id,
                  );
                  if (!rows.length) return "—";
                  return (
                    <span className="text-xs">
                      {rows
                        .map(
                          (o: any) =>
                            `${o.billingFrequency.slice(0, 4)}: ${formatNGN(o.price)}`,
                        )
                        .join(" · ")}
                    </span>
                  );
                },
              },
              {
                key: "aiTokenAllowance",
                label: "AI tokens / cycle",
                render: (r) => formatNumber(r.aiTokenAllowance ?? 100),
              },
              {
                key: "gracePeriodDays",
                label: "Grace",
                render: (r) => `${r.gracePeriodDays ?? 7} days`,
              },
              {
                key: "maxStudents",
                label: "Max Students",
                render: (r) =>
                  r.maxStudents ? formatNumber(r.maxStudents) : "Unlimited",
              },
              {
                key: "schools",
                label: "Schools",
                render: (r) => {
                  // Schools on each plan come from the subscriptions feed.
                  const onPlan = (d.subscriptions || []).filter(
                    (s: any) => s.plan?.id === r.id && s.status === "ACTIVE",
                  );
                  if (!onPlan.length)
                    return (
                      <span className="text-[11px] text-gray-400">
                        No schools yet
                      </span>
                    );
                  return (
                    <div
                      className="max-w-[220px] truncate text-xs"
                      title={onPlan.map((s: any) => s.schoolName).join(", ")}
                    >
                      {onPlan.map((s: any) => s.schoolName).join(", ")}
                      <span className="ml-1 text-gray-400">
                        ({onPlan.length})
                      </span>
                    </div>
                  );
                },
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

      <h3 className="font-bold">Invoices</h3>
      <DataTable
        rows={invoices.data || []}
        empty="No invoices yet. They are generated automatically each billing cycle, or use Assign → Run Billing Cron."
        columns={[
          {
            key: "invoiceNo",
            label: "Invoice",
            render: (r) => (
              <span className="font-mono text-xs font-semibold">{r.invoiceNo}</span>
            ),
          },
          { key: "schoolName", label: "School" },
          { key: "periodKey", label: "Period" },
          {
            key: "amount",
            label: "Amount",
            render: (r) => formatNGN(r.amount),
          },
          {
            key: "studentSnapshot",
            label: "Students",
            render: (r) =>
              r.studentSnapshot != null ? formatNumber(r.studentSnapshot) : "—",
          },
          {
            key: "status",
            label: "Status",
            render: (r) => <Badge status={r.status} />,
          },
          {
            key: "dueDate",
            label: "Due",
            render: (r) => new Date(r.dueDate).toLocaleDateString(),
          },
          {
            key: "actions",
            label: "Actions",
            render: (r) => (
              <div className="flex gap-1.5">
                {r.status === "PENDING" && (
                  <>
                    <button
                      onClick={() => {
                        const ref = window.prompt(
                          "Payment reference (bank transfer / gateway):",
                          `PAY-${Date.now()}`,
                        );
                        if (ref) payInvoice.mutate({ id: r.id, paymentRef: ref });
                      }}
                      className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white"
                    >
                      Mark Paid
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Void invoice ${r.invoiceNo}?`))
                          voidInvoice.mutate(r.id);
                      }}
                      className="rounded-lg border border-rose-300 px-2.5 py-1 text-[11px] font-bold text-rose-600"
                    >
                      Void
                    </button>
                  </>
                )}
                {r.status !== "PENDING" && (
                  <span className="text-[11px] text-gray-400">
                    {r.paymentRef || "—"}
                  </span>
                )}
              </div>
            ),
          },
        ]}
      />

      <TokenPackagesSection />

      {showPlan && (
        <Modal title="Edit Billing Plans & Pricing" size="full" onClose={() => setShowPlan(false)}>
          <BillingPlanEditor
            plans={(plans.data || []).filter((p: any) => p.isActive)}
            onSubmit={(id: string, data: any) => updatePlan.mutate({ id, data })}
            loading={updatePlan.isPending}
          />
        </Modal>
      )}
      {showAssign && (
        <Modal
          title="Assign Subscription to School"
          size="full"
          onClose={() => setShowAssign(false)}
        >
          <AssignForm
            plans={(plans.data || []).filter((p: any) => p.isActive)}
            schools={schools.data || []}
            onSubmit={(p: any) => assign.mutate(p)}
            loading={assign.isPending}
          />
        </Modal>
      )}
    </div>
  );
}

/** Token packages CRUD + price override editor for fixed tiers. */
function TokenPackagesSection() {
  const qc = useQueryClient();
  const packages = useQuery({
    queryKey: ["platform", "token-packages"],
    queryFn: async () => (await platformApi.get("/token-packages")).data,
  });
  const plans = useQuery({
    queryKey: ["platform", "plans"],
    queryFn: async () => (await platformApi.get("/plans")).data,
  });
  const overrides = useQuery({
    queryKey: ["platform", "price-overrides"],
    queryFn: async () => (await platformApi.get("/price-overrides")).data,
  });
  const [newPkg, setNewPkg] = useState({ name: "", tokens: "", price: "" });
  const FREQUENCIES = [
    "MONTHLY",
    "QUARTERLY",
    "TERMLY",
    "HALF_YEARLY",
    "ANNUAL",
    "BIENNIALLY",
  ];

  const createPkg = useMutation({
    mutationFn: async () =>
      platformApi.post("/token-packages", {
        name: newPkg.name,
        tokens: Number(newPkg.tokens),
        price: Number(newPkg.price),
      }),
    onSuccess: () => {
      toast.success("Package created");
      setNewPkg({ name: "", tokens: "", price: "" });
      qc.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Failed to create package"),
  });
  const updatePkg = useMutation({
    mutationFn: async (p: any) =>
      platformApi.put(`/token-packages/${p.id}`, p.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform"] }),
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Failed to update package"),
  });
  const saveOverride = useMutation({
    mutationFn: async (p: any) =>
      platformApi.put("/price-overrides", p),
    onSuccess: () => {
      toast.success("Price saved");
      qc.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Failed to save price"),
  });

  const fixedPlans = (plans.data || []).filter(
    (p: any) => p.isActive && p.type === "FIXED",
  );

  return (
    <>
      <h3 className="font-bold">AI Token Packages</h3>
      <DataTable
        rows={packages.data || []}
        empty="No token packages configured."
        columns={[
          { key: "name", label: "Package", render: (r) => <span className="font-semibold">{r.name}</span> },
          { key: "tokens", label: "Tokens", render: (r) => formatNumber(r.tokens) },
          { key: "price", label: "Price", render: (r) => formatNGN(r.price) },
          { key: "sortOrder", label: "Order" },
          {
            key: "isActive",
            label: "Status",
            render: (r) => <Badge status={r.isActive ? "ACTIVE" : "SUSPENDED"} />,
          },
          {
            key: "actions",
            label: "Actions",
            render: (r) => (
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    const price = window.prompt(`New price for ${r.name} (₦):`, String(r.price));
                    if (price) updatePkg.mutate({ id: r.id, data: { price: Number(price) } });
                  }}
                  className="rounded-lg border border-gray-300 dark:border-gray-700 px-2.5 py-1 text-[11px] font-bold"
                >
                  Edit Price
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Deactivate ${r.name}?`))
                      updatePkg.mutate({ id: r.id, data: { isActive: !r.isActive } });
                  }}
                  className="rounded-lg border border-gray-300 dark:border-gray-700 px-2.5 py-1 text-[11px] font-bold"
                >
                  {r.isActive ? "Disable" : "Enable"}
                </button>
              </div>
            ),
          },
        ]}
      />
      <div className="flex flex-wrap gap-2 items-end">
        <input
          value={newPkg.name}
          onChange={(e) => setNewPkg((p) => ({ ...p, name: e.target.value }))}
          placeholder="Package name"
          className="rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-900 px-3 py-2 text-sm"
        />
        <input
          type="number"
          value={newPkg.tokens}
          onChange={(e) => setNewPkg((p) => ({ ...p, tokens: e.target.value }))}
          placeholder="Tokens"
          className="rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-900 px-3 py-2 text-sm w-28"
        />
        <input
          type="number"
          value={newPkg.price}
          onChange={(e) => setNewPkg((p) => ({ ...p, price: e.target.value }))}
          placeholder="Price ₦"
          className="rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-900 px-3 py-2 text-sm w-28"
        />
        <button
          onClick={() => createPkg.mutate()}
          disabled={!newPkg.name || !newPkg.tokens || !newPkg.price || createPkg.isPending}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          Add Package
        </button>
      </div>

      <h3 className="font-bold">Tier Price Overrides</h3>
      <p className="text-xs text-gray-500 -mt-2">
        Per-frequency price for each fixed tier — used automatically when
        assigning a plan or generating invoices.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Tier
              </th>
              {FREQUENCIES.map((f) => (
                <th
                  key={f}
                  className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500"
                >
                  {f}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fixedPlans.map((plan: any) => (
              <tr
                key={plan.id}
                className="border-b border-gray-100 last:border-0 dark:border-gray-800/60"
              >
                <td className="px-4 py-3 font-semibold">{plan.name}</td>
                {FREQUENCIES.map((f) => {
                  const existing = (overrides.data || []).find(
                    (o: any) => o.planId === plan.id && o.billingFrequency === f,
                  );
                  return (
                    <td key={f} className="px-2 py-2">
                      <input
                        type="number"
                        defaultValue={existing?.price ?? ""}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (!isNaN(v) && v !== existing?.price) {
                            saveOverride.mutate({
                              planId: plan.id,
                              billingFrequency: f,
                              price: v,
                            });
                          }
                        }}
                        placeholder="₦"
                        className="w-28 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-2 py-1.5 text-xs"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AssignForm({ plans, schools, onSubmit, loading }: any) {
  const [form, setForm] = useState({
    schoolIds: [] as string[],
    schoolQuery: "",
    planId: "",
    months: 1,
    billingCycle: "MONTHLY",
    pricePerCycle: "",
    studentSnapshotCount: "",
    // "" = plan default | number = override (0 = no bundled tokens)
    aiTokenAllowance: "",
  });
  const set = (k: string) => (e: any) =>
    setForm((f: any) => ({ ...f, [k]: e.target.value }));

  const allSchools = schools || [];
  const filteredSchools = allSchools.filter((s: any) =>
    (s.name || "").toLowerCase().includes(form.schoolQuery.toLowerCase()) ||
    (s.subdomain || "").toLowerCase().includes(form.schoolQuery.toLowerCase()),
  );

  const toggleSchool = (id: string) =>
    setForm((f: any) => ({
      ...f,
      schoolIds: f.schoolIds.includes(id)
        ? f.schoolIds.filter((x: string) => x !== id)
        : [...f.schoolIds, id],
    }));

  const selectAll = () =>
    setForm((f: any) => ({ ...f, schoolIds: filteredSchools.map((s: any) => s.id) }));
  const clearAll = () => setForm((f: any) => ({ ...f, schoolIds: [] }));

  const plan = (plans || []).find((p: any) => p.id === form.planId);
  const overridePrice =
    form.pricePerCycle !== "" ? Number(form.pricePerCycle) : undefined;
  const snapshot =
    form.studentSnapshotCount !== ""
      ? Number(form.studentSnapshotCount)
      : undefined;

  // Pricing preview (informational — the server recomputes authoritative totals)
  const effectivePrice =
    plan?.type === "FREE"
      ? 0
      : plan?.type === "STUDENT_BASED"
        ? (snapshot ?? plan?.lastSnapshotCount ?? 0) * (plan?.perStudentRate || 0)
        : (overridePrice ?? plan?.monthlyPrice ?? 0);

  return (
    // Horizontal layout for the fullscreen modal: school picker on the left,
    // plan + pricing options in the middle, preview + submit on the right.
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* ---- Column 1: School multi-select ---- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Schools ({form.schoolIds.length} selected)
          </label>
          <div className="flex gap-2 text-[10px] font-bold">
            <button
              type="button"
              onClick={selectAll}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          </div>
        </div>
        <input
          value={form.schoolQuery}
          onChange={set("schoolQuery")}
          placeholder="Search schools by name…"
          className="w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-4 py-2 text-sm"
        />
        <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
          {allSchools.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-gray-400">
              No schools found.
            </p>
          )}
          {filteredSchools.map((s: any) => {
            const checked = form.schoolIds.includes(s.id);
            return (
              <label
                key={s.id}
                className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm transition ${
                  checked
                    ? "bg-blue-50 dark:bg-blue-500/10"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/60"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSchool(s.id)}
                  className="h-4 w-4 shrink-0 accent-blue-600"
                />
                <span className="min-w-0 flex-1 truncate font-medium text-gray-800 dark:text-gray-200">
                  {s.name}
                </span>
                {s.subscription?.plan && (
                  <span className="shrink-0 text-[10px] font-bold text-gray-400">
                    {s.subscription.plan}
                  </span>
                )}
                <span className="shrink-0 text-[10px] text-gray-400">
                  {s.students} students
                </span>
              </label>
            );
          })}
          {allSchools.length > 0 && filteredSchools.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-gray-400">
              No schools match "{form.schoolQuery}".
            </p>
          )}
        </div>
      </div>

      {/* ---- Column 2: Plan + pricing options ---- */}
      <div className="space-y-3">
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
                {p.name} ({p.type || "FIXED"}) —{" "}
                {p.type === "STUDENT_BASED"
                  ? `${formatNGN(p.perStudentRate || 0)}/student/term`
                  : p.type === "FREE"
                    ? "Free"
                    : `${formatNGN(p.monthlyPrice)}/mo`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Billing cycle
          </label>
          <select
            value={form.billingCycle}
            onChange={set("billingCycle")}
            className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-4 py-2.5 text-sm"
          >
            {["MONTHLY", "QUARTERLY", "TERMLY", "HALF_YEARLY", "ANNUAL"].map(
              (c) => (
                <option key={c} value={c}>
                  {c.replace("_", ".").toLowerCase()}
                </option>
              ),
            )}
          </select>
        </div>

        {plan?.type === "STUDENT_BASED" && (
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Student snapshot count (locked for this cycle)
            </label>
            <input
              type="number"
              min={0}
              value={form.studentSnapshotCount}
              onChange={set("studentSnapshotCount")}
              placeholder="Leave blank to snapshot all active students automatically"
              className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-4 py-2.5 text-sm"
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Rate: {formatNGN(plan.perStudentRate || 0)} per student. New
              enrollments after this snapshot bill next cycle.
            </p>
          </div>
        )}

        {plan && plan.type !== "FREE" && plan.type !== "STUDENT_BASED" && (
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Price per cycle (₦) — optional override
            </label>
            <input
              type="number"
              min={0}
              value={form.pricePerCycle}
              onChange={set("pricePerCycle")}
              placeholder={`Plan default: ${formatNGN(plan.monthlyPrice)}`}
              className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-4 py-2.5 text-sm"
            />
          </div>
        )}
      </div>

      {/* ---- Column 3: Token decision + preview + submit ---- */}
      <div className="space-y-3">
        {plan && plan.type !== "FREE" && (
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Bundled Edufy AI tokens per cycle
            </label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {[
                { id: "default", label: `Plan default (${plan.aiTokenAllowance ?? 100})` },
                { id: "none", label: "No tokens" },
                { id: "custom", label: "Custom" },
              ].map((opt) => {
                const active =
                  (form.aiTokenAllowance === "" && opt.id === "default") ||
                  (form.aiTokenAllowance === "0" && opt.id === "none") ||
                  (form.aiTokenAllowance !== "" &&
                    form.aiTokenAllowance !== "0" &&
                    opt.id === "custom");
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setForm((f: any) => ({
                        ...f,
                        aiTokenAllowance:
                          opt.id === "default"
                            ? ""
                            : opt.id === "none"
                              ? "0"
                              : String(plan.aiTokenAllowance ?? 100),
                      }))
                    }
                    className={`rounded-xl px-2 py-2 text-xs font-bold transition ${
                      active
                        ? "bg-blue-600 text-white shadow"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {form.aiTokenAllowance !== "" && form.aiTokenAllowance !== "0" && (
              <input
                type="number"
                min={1}
                value={form.aiTokenAllowance}
                onChange={set("aiTokenAllowance")}
                className="mt-2 w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-4 py-2.5 text-sm"
                placeholder="Tokens per cycle"
              />
            )}
            <p className="mt-1 text-[11px] text-gray-500">
              {form.aiTokenAllowance === "0"
                ? "No tokens bundled — the school buys (tops up) its own AI tokens."
                : form.aiTokenAllowance === ""
                  ? "Using the plan's default allowance."
                  : "Custom allowance — credited per paid cycle instead of the plan default."}
            </p>
          </div>
        )}

        {plan && (
          <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 p-3 text-xs">
            <p className="font-bold text-blue-900 dark:text-blue-200">
              Pricing preview
            </p>
            <p className="text-blue-700 dark:text-blue-300 mt-0.5">
              {plan.type === "STUDENT_BASED"
                ? `${snapshot ?? "auto"} students × ${formatNGN(plan.perStudentRate || 0)} = ${formatNGN(effectivePrice)}`
                : `${formatNGN(effectivePrice)} per ${form.billingCycle.toLowerCase()} cycle`}
            </p>
            <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
              {plan.aiTokenAllowance ?? 100} AI tokens credited per paid cycle.
            </p>
          </div>
        )}

        <button
          onClick={() =>
            onSubmit({
              schoolIds: form.schoolIds,
              planId: form.planId,
              months: Number(form.months) || 1,
              billingCycle: form.billingCycle,
              ...(overridePrice !== undefined && plan?.type === "FIXED"
                ? { pricePerCycle: overridePrice }
                : {}),
              ...(snapshot !== undefined && plan?.type === "STUDENT_BASED"
                ? { studentSnapshotCount: snapshot }
                : {}),
              // Token decision: "" → plan default; otherwise explicit override
              // (incl. 0 = no bundled tokens)
              ...(plan?.type !== "FREE" && form.aiTokenAllowance !== ""
                ? { aiTokenAllowance: Number(form.aiTokenAllowance) }
                : {}),
            })
          }
          disabled={loading || form.schoolIds.length === 0 || !form.planId}
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {loading
            ? "Assigning…"
            : `Assign to ${form.schoolIds.length || "no"} school${form.schoolIds.length === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}

/**
 * Edit-only editor for the TWO canonical billing plans (Pay Per Student /
 * Subscription). Billing types cannot be created, renamed or re-typed —
 * only their pricing, tokens, capacity and marketing copy can change.
 */
function BillingPlanEditor({
  plans,
  onSubmit,
  loading,
}: {
  plans: any[];
  onSubmit: (id: string, data: any) => void;
  loading: boolean;
}) {
  const [selectedId, setSelectedId] = useState(plans[0]?.id ?? "");
  const plan = plans.find((p) => p.id === selectedId);
  const [draft, setDraft] = useState<any>(null);

  // Seed the draft whenever a different plan is picked.
  useEffect(() => {
    if (!plan) return;
    setDraft({
      ...(plan.perStudentRate != null
        ? { perStudentRate: String(plan.perStudentRate) }
        : {}),
      aiTokenAllowance: String(plan.aiTokenAllowance ?? 100),
      gracePeriodDays: String(plan.gracePeriodDays ?? 7),
      ...(plan.maxStudents != null
        ? { maxStudents: String(plan.maxStudents) }
        : {}),
      ...(plan.monthlyPrice != null
        ? { monthlyPrice: String(plan.monthlyPrice) }
        : {}),
      tagline: plan.tagline || "",
      featuresText: (plan.features || [])
        .map((f: any) => (f.comingSoon ? `soon: ${f.label}` : f.label))
        .join("\n"),
      featured: !!plan.featured,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  if (!plan || !draft) return <p className="text-sm text-gray-500">No billing plans found.</p>;

  const set = (k: string) => (e: any) =>
    setDraft((d: any) => ({ ...d, [k]: e.target.value }));
  const isStudent = plan.type === "STUDENT_BASED";
  const allowance = Number(draft.aiTokenAllowance) || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
      {/* Column 1: pick billing type */}
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Billing type
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">
        {plans.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelectedId(p.id)}
            className={`rounded-xl border px-3 py-2.5 text-left transition ${
              p.id === selectedId
                ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            }`}
          >
            <p className="text-sm font-bold">{p.name}</p>
            <p className="text-[11px] text-gray-500">
              {p.type === "STUDENT_BASED"
                ? "Pay per student — per-student rate per term"
                : "Subscription — flat fee per billing cycle"}
            </p>
          </button>
        ))}
        </div>

        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3 text-xs">
          Billing type: <b>{plan.type === "STUDENT_BASED" ? "Pay Per Student" : "Subscription"}</b>{" "}
          (fixed — cannot be changed)
        </div>
      </div>

      {/* Column 2: pricing */}
      <div className="space-y-3">
        {isStudent ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Pricing
            </p>
            <label className="mt-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
              Per-student rate per term (₦)
            </label>
            <input
              type="number"
              min={1}
              value={draft.perStudentRate ?? ""}
              onChange={set("perStudentRate")}
              className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-4 py-2.5 text-sm"
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Invoice = enrolled-student snapshot × this rate, locked per cycle.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Pricing
            </p>
            <label className="mt-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
              Monthly price (₦)
            </label>
            <input
              type="number"
              min={0}
              value={draft.monthlyPrice ?? ""}
              onChange={set("monthlyPrice")}
              className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-4 py-2.5 text-sm"
            />
          </div>
        )}

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Max students (optional)
          </label>
          <input
            type="number"
            min={1}
            value={draft.maxStudents ?? ""}
            onChange={set("maxStudents")}
            className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-4 py-2.5 text-sm"
            placeholder="Leave blank for no cap"
          />
        </div>
      </div>

      {/* Column 3: limits */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Default AI tokens / cycle
            </label>
            <input
              type="number"
              min={0}
              value={draft.aiTokenAllowance}
              onChange={set("aiTokenAllowance")}
              className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-4 py-2.5 text-sm"
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Set 0 for no bundled tokens. Can still be overridden per-school at
              assign time.
            </p>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Grace period (days)
            </label>
            <input
              type="number"
              min={0}
              max={90}
              value={draft.gracePeriodDays}
              onChange={set("gracePeriodDays")}
              className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-4 py-2.5 text-sm"
            />
          </div>
        </div>

        <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 p-3 text-xs text-blue-700 dark:text-blue-300">
          {allowance === 0
            ? "This billing type carries NO bundled AI tokens — schools top up tokens themselves."
            : `${allowance} AI tokens credited once per successfully activated paid cycle (unless overridden at assignment).`}
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            checked={draft.featured}
            onChange={(e) =>
              setDraft((d: any) => ({ ...d, featured: e.target.checked }))
            }
            className="h-3.5 w-3.5 accent-blue-600"
          />
          <span>
            Show as <b>Recommended</b> on the schools' plan catalogue
          </span>
        </label>
      </div>

      {/* Column 4: marketing copy */}
      <div className="space-y-3">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Tagline (shown to schools)
          </label>
          <input
            value={draft.tagline}
            onChange={set("tagline")}
            maxLength={160}
            className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Feature bullets (one per line)
          </label>
          <textarea
            value={draft.featuresText}
            onChange={set("featuresText")}
            rows={8}
            className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-4 py-2.5 text-sm"
          />
          <p className="mt-1 text-[11px] text-gray-500">
            Prefix a line with "soon:" to mark it as Coming Soon.
          </p>
        </div>

        <button
          onClick={() => {
          const features = draft.featuresText
            .split("\n")
            .map((l: string) => l.trim())
            .filter(Boolean)
            .map((l: string) =>
              l.toLowerCase().startsWith("soon:")
                ? { label: l.slice(5).trim(), comingSoon: true }
                : { label: l },
            );
          onSubmit(plan.id, {
            ...(isStudent
              ? { perStudentRate: Number(draft.perStudentRate) }
              : { monthlyPrice: Number(draft.monthlyPrice) }),
            aiTokenAllowance: allowance,
            gracePeriodDays: Number(draft.gracePeriodDays) || 7,
            ...(draft.maxStudents
              ? { maxStudents: Number(draft.maxStudents) }
              : { maxStudents: null }),
            tagline: draft.tagline.trim() || null,
            features,
            featured: draft.featured,
          });
        }}
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {loading ? "Saving…" : `Save ${plan.name}`}
        </button>
      </div>
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
  size = "md",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: "md" | "full";
}) {
  return (
    <div
      className={
        size === "full"
          ? "fixed inset-0 z-50 flex bg-black/50"
          : "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      }
      onClick={onClose}
    >
      <div
        className={
          size === "full"
            ? "flex h-full w-full flex-col rounded-none bg-white dark:bg-gray-900 shadow-2xl"
            : "w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl"
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex items-start justify-between border-b border-gray-200 dark:border-gray-800 ${
            size === "full" ? "px-6 py-4" : "mb-4"
          }`}
        >
          <h3 className="font-extrabold text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>
        <div
          className={
            size === "full" ? "flex-1 overflow-y-auto p-6" : undefined
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
}
