// Module 2 — School directory, redesigned: stat header, card grid with
// quick actions, slide-over profile drawer, and register modal.
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import platformApi from "../../utils/platformApi";
import {
  KpiCard,
  Badge,
  Loading,
  ErrorState,
  formatNGN,
  formatNumber,
} from "./shared";
import {
  BuildingOffice2Icon,
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowRightStartOnRectangleIcon,
  XMarkIcon,
  UserGroupIcon,
  AcademicCapIcon,
  BanknotesIcon,
  BoltIcon,
  Squares2X2Icon,
  ListBulletIcon,
} from "@heroicons/react/24/outline";

type ViewMode = "grid" | "list";

export default function SchoolsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [plan] = useState("");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<ViewMode>("grid");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);

  const schools = useQuery({
    queryKey: ["platform", "schools", q, status, plan, page],
    queryFn: async () =>
      (
        await platformApi.get(
          `/schools?q=${encodeURIComponent(
            q,
          )}&status=${status}&page=${page}&pageSize=24`,
        )
      ).data,
  });

  const profile = useQuery({
    queryKey: ["platform", "school", selectedId],
    enabled: !!selectedId,
    queryFn: async () => (await platformApi.get(`/schools/${selectedId}`)).data,
  });

  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["platform"] });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      platformApi.patch(`/schools/${id}/status`, { isActive }),
    onSuccess: (_d, vars) => {
      toast.success(vars.isActive ? "School activated" : "School suspended");
      invalidate();
      if (selectedId) profile.refetch();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Action failed"),
  });

  // Login-as: impersonate the school's admin — opens the school panel in a
  // NEW tab pre-seeded with a real school JWT (platform session untouched).
  const impersonate = useMutation({
    mutationFn: async (id: string) =>
      (await platformApi.post(`/schools/${id}/impersonate`, {})).data,
    onSuccess: (data: any) => {
      const w = window.open("", "_blank");
      if (!w) {
        toast.error("Allow pop-ups to open the school panel in a new tab");
        return;
      }
      const doc = w.document;
      doc.open();
      doc.write(`<!doctype html><meta charset="utf-8"><title>Opening ${
        data.school.name
      }…</title><script>
        localStorage.setItem("token", ${JSON.stringify(data.token)});
        localStorage.setItem("user", ${JSON.stringify(
          JSON.stringify(data.user),
        )});
        localStorage.setItem("tenantId", ${JSON.stringify(data.user.schoolId)});
        location.replace("/admin");
      <\/script>`);
      doc.close();
      toast.success(`Opening ${data.school.name} as ${data.user.name}…`);
    },
    onError: (e: any) =>
      toast.error(
        e?.response?.data?.error || "Could not log in to this school",
      ),
  });

  const registerSchool = useMutation({
    mutationFn: async (payload: any) => platformApi.post("/schools", payload),
    onSuccess: () => {
      toast.success("School registered");
      setShowRegister(false);
      invalidate();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Registration failed"),
  });

  // Assign / remove the self-onboarding wizard for a school.
  const setOnboarding = useMutation({
    mutationFn: async ({ id, required }: { id: string; required: boolean }) =>
      platformApi.patch(`/schools/${id}/onboarding-required`, { required }),
    onSuccess: (_d, vars) => {
      toast.success(
        vars.required
          ? "Onboarding wizard assigned"
          : "Onboarding wizard removed",
      );
      invalidate();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Action failed"),
  });

  const rows: any[] = schools.data?.schools || [];
  const total: number = schools.data?.total || 0;
  const pageSize: number = schools.data?.pageSize || 24;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Lightweight summary chips from the current page.
  const activeCount = rows.filter((r) => r.isActive).length;
  const onboardCount = rows.filter((r) => r.onboardingRequired).length;
  const totalStudents = rows.reduce((a, r) => a + (r.students || 0), 0);

  return (
    <div className="space-y-6">
      {/* ====== Header ====== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Schools
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage every school on the platform — log in, monitor, act.
          </p>
        </div>
        <button
          onClick={() => setShowRegister(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg"
        >
          <PlusIcon className="w-4 h-4" /> Register School
        </button>
      </div>

      {/* ====== Summary chips ====== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Schools (this page)"
          value={formatNumber(rows.length)}
          tone="blue"
        />
        <KpiCard
          label="Active"
          value={formatNumber(activeCount)}
          tone="emerald"
        />
        <KpiCard
          label="Onboarding pending"
          value={formatNumber(onboardCount)}
          tone="amber"
        />
        <KpiCard
          label="Students (this page)"
          value={formatNumber(totalStudents)}
          tone="violet"
        />
      </div>

      {/* ====== Filters + view toggle ====== */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or subdomain…"
            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-900 pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-900 px-4 py-2.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>

        <div className="flex rounded-xl border border-gray-300 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => setView("grid")}
            title="Card view"
            className={`px-3 py-2.5 ${
              view === "grid"
                ? "bg-blue-600 text-white"
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <Squares2X2Icon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView("list")}
            title="Table view"
            className={`px-3 py-2.5 ${
              view === "list"
                ? "bg-blue-600 text-white"
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <ListBulletIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ====== Content ====== */}
      {schools.isLoading ? (
        <Loading />
      ) : schools.error ? (
        <ErrorState
          message={
            (schools.error as any)?.response?.data?.error ||
            "Failed to load schools"
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : view === "grid" ? (
        <SchoolCardGrid
          rows={rows}
          onOpen={setSelectedId}
          onImpersonate={(id) => impersonate.mutate(id)}
          impersonating={impersonate.isPending}
        />
      ) : (
        <SchoolTable
          rows={rows}
          onOpen={setSelectedId}
          onImpersonate={(id) => impersonate.mutate(id)}
          impersonating={impersonate.isPending}
          onToggleStatus={(id, isActive) =>
            toggleStatus.mutate({ id, isActive })
          }
          onToggleOnboarding={(id, required) =>
            setOnboarding.mutate({ id, required })
          }
        />
      )}

      {/* ====== Pagination ====== */}
      {total > pageSize && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Page {page} of {totalPages} · {formatNumber(total)} schools
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ====== School profile drawer ====== */}
      {selectedId && (
        <ProfileDrawer
          profile={profile}
          onClose={() => setSelectedId(null)}
          onImpersonate={(id) => impersonate.mutate(id)}
          impersonating={impersonate.isPending}
          onToggleOnboarding={(id, required) =>
            setOnboarding.mutate({ id, required })
          }
          onboardingPending={setOnboarding.isPending}
        />
      )}

      {/* ====== Register school modal ====== */}
      {showRegister && (
        <RegisterSchoolModal
          onClose={() => setShowRegister(false)}
          onSubmit={(p: any) => registerSchool.mutate(p)}
          loading={registerSchool.isPending}
        />
      )}
    </div>
  );
}

// ============================ Card Grid ============================
function SchoolCardGrid({
  rows,
  onOpen,
  onImpersonate,
  impersonating,
}: {
  rows: any[];
  onOpen: (id: string) => void;
  onImpersonate: (id: string) => void;
  impersonating: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((r) => (
        <div
          key={r.id}
          className="group relative rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          {/* Status ribbon */}
          <div className="absolute top-4 right-4 flex items-center gap-1.5">
            {r.onboardingRequired && (
              <span className="rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold uppercase">
                Onboarding
              </span>
            )}
            <Badge status={r.isActive ? "ACTIVE" : "SUSPENDED"} />
          </div>

          <button
            onClick={() => onOpen(r.id)}
            className="text-left w-full pr-24"
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
                <BuildingOffice2Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold truncate group-hover:text-blue-600 transition-colors">
                  {r.name}
                </h3>
                <p className="text-[11px] text-gray-400 truncate">
                  {r.subdomain ? `${r.subdomain}.smartedufy.com` : "—"}
                </p>
              </div>
            </div>
          </button>

          {/* Stats row */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat
              icon={UserGroupIcon}
              label="Students"
              value={formatNumber(r.students)}
            />
            <Stat
              icon={AcademicCapIcon}
              label="Teachers"
              value={formatNumber(r.teachers)}
            />
            <Stat
              icon={BoltIcon}
              label="Tokens"
              value={formatNumber(r.wallet?.balance ?? 0)}
            />
          </div>

          {/* Plan + subscription */}
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-700 dark:text-gray-300 truncate">
              {r.subscription ? r.subscription.plan : "No plan"}
            </span>
            {r.subscription ? (
              <Badge status={r.subscription.status} />
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => onImpersonate(r.id)}
              disabled={impersonating}
              title="Log in to this school's admin panel"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-xs font-bold text-white shadow hover:opacity-90 disabled:opacity-50"
            >
              <ArrowRightStartOnRectangleIcon className="w-3.5 h-3.5" />
              Login as Admin
            </button>
            <button
              onClick={() => onOpen(r.id)}
              className="rounded-xl border border-gray-300 dark:border-gray-700 px-3 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Details
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 px-2 py-2">
      <Icon className="w-4 h-4 mx-auto text-gray-400" />
      <p className="text-sm font-extrabold mt-0.5">{value}</p>
      <p className="text-[10px] text-gray-400 uppercase tracking-wide">
        {label}
      </p>
    </div>
  );
}

// ============================ Table View ============================
function SchoolTable({
  rows,
  onOpen,
  onImpersonate,
  impersonating,
  onToggleStatus,
  onToggleOnboarding,
}: {
  rows: any[];
  onOpen: (id: string) => void;
  onImpersonate: (id: string) => void;
  impersonating: boolean;
  onToggleStatus: (id: string, isActive: boolean) => void;
  onToggleOnboarding: (id: string, required: boolean) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-[11px] uppercase tracking-wider text-gray-400">
            <th className="px-4 py-3">School</th>
            <th className="px-4 py-3">Students</th>
            <th className="px-4 py-3">Teachers</th>
            <th className="px-4 py-3">Plan</th>
            <th className="px-4 py-3">Tokens</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className="border-b last:border-0 border-gray-100 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800/40"
            >
              <td className="px-4 py-3">
                <button onClick={() => onOpen(r.id)} className="text-left">
                  <span className="font-semibold text-blue-600 hover:underline">
                    {r.name}
                  </span>
                  <span className="block text-[10px] text-gray-400">
                    {r.subdomain || "—"}
                  </span>
                </button>
              </td>
              <td className="px-4 py-3">{formatNumber(r.students)}</td>
              <td className="px-4 py-3">{formatNumber(r.teachers)}</td>
              <td className="px-4 py-3">
                {r.subscription ? (
                  <span>
                    {r.subscription.plan}{" "}
                    <Badge status={r.subscription.status} />
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                {formatNumber(r.wallet?.balance ?? 0)}
              </td>
              <td className="px-4 py-3">
                <Badge status={r.isActive ? "ACTIVE" : "SUSPENDED"} />
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => onImpersonate(r.id)}
                    disabled={impersonating}
                    className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 disabled:opacity-50"
                  >
                    <ArrowRightStartOnRectangleIcon className="w-3.5 h-3.5" />
                    Login as Admin
                  </button>
                  <button
                    onClick={() =>
                      onToggleOnboarding(r.id, !r.onboardingRequired)
                    }
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
                      r.onboardingRequired
                        ? "text-amber-600 hover:bg-amber-50"
                        : "text-blue-600 hover:bg-blue-50"
                    }`}
                  >
                    {r.onboardingRequired
                      ? "Remove Onboarding"
                      : "Assign Onboarding"}
                  </button>
                  <button
                    onClick={() => onToggleStatus(r.id, !r.isActive)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
                      r.isActive
                        ? "text-rose-600 hover:bg-rose-50"
                        : "text-emerald-600 hover:bg-emerald-50"
                    }`}
                  >
                    {r.isActive ? "Suspend" : "Activate"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================ Empty ============================
function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
      <BuildingOffice2Icon className="w-10 h-10 mx-auto text-gray-300" />
      <p className="mt-3 font-bold">No schools match your filters</p>
      <p className="text-sm text-gray-500">
        Try a different search or register a new school.
      </p>
    </div>
  );
}

// ============================ Profile Drawer ============================
function ProfileDrawer({
  profile,
  onClose,
  onImpersonate,
  impersonating,
  onToggleOnboarding,
  onboardingPending,
}: {
  profile: any;
  onClose: () => void;
  onImpersonate: (id: string) => void;
  impersonating: boolean;
  onToggleOnboarding: (id: string, required: boolean) => void;
  onboardingPending: boolean;
}) {
  const d = profile.data;
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl h-full overflow-y-auto bg-white dark:bg-gray-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white sticky top-0 z-10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur">
                <BuildingOffice2Icon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold">
                  {profile.isLoading ? "…" : d?.name}
                </h2>
                {d && (
                  <p className="text-xs text-white/80 mt-0.5">
                    Registered {new Date(d.createdAt).toLocaleDateString()}
                    {d.activeAcademicYear
                      ? ` · ${d.activeAcademicYear}`
                      : " · no active session"}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl leading-none"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          {d && (
            <button
              onClick={() => onImpersonate(d.id)}
              disabled={impersonating}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white text-blue-700 px-4 py-2 text-sm font-bold shadow hover:bg-blue-50 disabled:opacity-60"
            >
              <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
              {impersonating ? "Opening…" : "Login as Admin"}
            </button>
          )}
        </div>

        <div className="p-6 space-y-6">
          {profile.isLoading ? (
            <Loading />
          ) : !d ? (
            <ErrorState message="School profile not found" />
          ) : (
            <>
              {/* Population */}
              <Section title="Population" icon={UserGroupIcon}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <KpiCard
                    label="Students"
                    value={formatNumber(d.students)}
                    tone="violet"
                  />
                  <KpiCard
                    label="Teachers"
                    value={formatNumber(d.teachers)}
                    tone="blue"
                  />
                  <KpiCard
                    label="Classes"
                    value={formatNumber(d.classes)}
                    tone="gray"
                  />
                  <KpiCard
                    label="Parents"
                    value={formatNumber(d.parents)}
                    tone="emerald"
                  />
                </div>
              </Section>

              {/* Financial */}
              <Section title="Financial Snapshot" icon={BanknotesIcon}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <KpiCard
                    label="Platform Revenue"
                    value={formatNGN(d.financial.platformRevenue)}
                    sub="Subs + tokens"
                    tone="emerald"
                  />
                  <KpiCard
                    label="Subscription Rev."
                    value={formatNGN(d.financial.subscriptionRevenue)}
                    tone="blue"
                  />
                  <KpiCard
                    label="Token Revenue"
                    value={formatNGN(d.financial.tokenRevenue)}
                    tone="violet"
                  />
                  <KpiCard
                    label="AI Expenses"
                    value={formatNGN(d.financial.aiExpenses)}
                    tone="rose"
                  />
                  <KpiCard
                    label="Fees Billed"
                    value={formatNGN(d.financial.feeBilled)}
                    tone="amber"
                  />
                  <KpiCard
                    label="Fees Collected"
                    value={formatNGN(d.financial.feeCollected)}
                    tone="gray"
                  />
                </div>
              </Section>

              {/* Wallet */}
              {d.wallet && (
                <Section title="Edufy Wallet" icon={BoltIcon}>
                  <div className="grid grid-cols-3 gap-3">
                    <KpiCard
                      label="Balance"
                      value={formatNumber(d.wallet.balance)}
                      tone="blue"
                    />
                    <KpiCard
                      label="Reserved"
                      value={formatNumber(d.wallet.reserved)}
                      tone="amber"
                    />
                    <KpiCard
                      label="Lifetime Used"
                      value={formatNumber(d.wallet.lifetimeConsumed)}
                      tone="gray"
                    />
                  </div>
                </Section>
              )}

              {/* Subscription */}
              <Section title="Subscription" icon={BanknotesIcon}>
                {d.subscription ? (
                  <p className="text-sm">
                    <Badge status={d.subscription.status} />{" "}
                    <b>{d.subscription.plan.name}</b>
                    {d.subscription.endDate && (
                      <span className="text-gray-500">
                        {" "}
                        · renews{" "}
                        {new Date(d.subscription.endDate).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">
                    No subscription plan assigned.
                  </p>
                )}
              </Section>

              {/* Onboarding */}
              <Section title="Onboarding Wizard" icon={AcademicCapIcon}>
                <div>
                  {d.onboardingRequired ? (
                    <button
                      onClick={() => onToggleOnboarding(d.id, false)}
                      disabled={onboardingPending}
                      className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-bold text-amber-600 hover:bg-amber-50"
                    >
                      Remove Onboarding Wizard
                    </button>
                  ) : (
                    <button
                      onClick={() => onToggleOnboarding(d.id, true)}
                      disabled={onboardingPending}
                      className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-bold text-white"
                    >
                      Assign Onboarding Wizard
                    </button>
                  )}
                  {d.onboarding && (
                    <p className="mt-2 text-xs text-gray-500">
                      Progress: {d.onboarding.completedStages.length}/8 stages ·
                      currently on <b>{d.onboarding.currentStage}</b>
                      {d.onboarding.completedAt
                        ? ` · completed ${new Date(
                            d.onboarding.completedAt,
                          ).toLocaleDateString()}`
                        : ""}
                    </p>
                  )}
                </div>
              </Section>

              {/* Staff */}
              <Section title="Recent Admins & Staff" icon={UserGroupIcon}>
                <div className="space-y-2">
                  {d.operations.activeUsers.map((u: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm border-b border-gray-100 dark:border-gray-800 pb-2"
                    >
                      <span>{u.name || u.email}</span>
                      <span className="text-gray-400 text-xs">{u.role}</span>
                    </div>
                  ))}
                </div>
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="font-bold mb-2 flex items-center gap-2">
        <Icon className="w-4 h-4 text-blue-500" /> {title}
      </h3>
      {children}
    </div>
  );
}

// ============================ Register Modal ============================
function RegisterSchoolModal({
  onClose,
  onSubmit,
  loading,
}: {
  onClose: () => void;
  onSubmit: (p: any) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    schoolName: "",
    adminName: "",
    email: "",
    phone: "",
    password: "",
  });
  const set = (k: string) => (e: any) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-extrabold mb-4">Register New School</h2>
        <div className="space-y-3 text-sm">
          {[
            ["schoolName", "School Name", "text"],
            ["adminName", "Admin Name", "text"],
            ["email", "Admin Email", "email"],
            ["phone", "Phone (optional)", "text"],
            ["password", "Temporary Password (min 8 chars)", "password"],
          ].map(([key, label, type]) => (
            <div key={key}>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {label}
              </label>
              <input
                type={type}
                value={(form as any)[key]}
                onChange={set(key)}
                className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
        <div className="mt-5 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(form)}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold disabled:opacity-50"
          >
            {loading ? "Registering…" : "Register School"}
          </button>
        </div>
      </div>
    </div>
  );
}
