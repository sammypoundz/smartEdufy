// Module 2 — School directory + profile drawer.
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
  BuildingOffice2Icon,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

export default function SchoolsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);

  const schools = useQuery({
    queryKey: ["platform", "schools", q, status, page],
    queryFn: async () =>
      (
        await platformApi.get(
          `/schools?q=${encodeURIComponent(
            q,
          )}&status=${status}&page=${page}&pageSize=25`,
        )
      ).data,
  });

  const profile = useQuery({
    queryKey: ["platform", "school", selectedId],
    enabled: !!selectedId,
    queryFn: async () => (await platformApi.get(`/schools/${selectedId}`)).data,
  });

  const qc = useQueryClient();
  const toggleStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      platformApi.patch(`/schools/${id}/status`, { isActive }),
    onSuccess: (_d, vars) => {
      toast.success(vars.isActive ? "School activated" : "School suspended");
      qc.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Action failed"),
  });

  const registerSchool = useMutation({
    mutationFn: async (payload: any) => platformApi.post("/schools", payload),
    onSuccess: () => {
      toast.success("School registered");
      setShowRegister(false);
      qc.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Registration failed"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Schools
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Directory of all registered schools.
          </p>
        </div>
        <button
          onClick={() => setShowRegister(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg"
        >
          <PlusIcon className="w-4 h-4" /> Register School
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
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
      </div>

      {schools.isLoading ? (
        <Loading />
      ) : schools.error ? (
        <ErrorState
          message={
            (schools.error as any)?.response?.data?.error ||
            "Failed to load schools"
          }
        />
      ) : (
        <>
          <DataTable
            rows={schools.data.schools}
            empty="No schools match your filters."
            columns={[
              {
                key: "name",
                label: "School",
                render: (r) => (
                  <button
                    onClick={() => setSelectedId(r.id)}
                    className="text-left font-semibold text-blue-600 hover:underline"
                  >
                    {r.name}
                    <span className="block text-[10px] text-gray-400 font-normal">
                      {r.subdomain || "—"}
                    </span>
                  </button>
                ),
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
                key: "subscription",
                label: "Plan",
                render: (r) =>
                  r.subscription ? (
                    r.subscription.plan
                  ) : (
                    <span className="text-gray-400">—</span>
                  ),
              },
              {
                key: "subscriptionStatus",
                label: "Subscription",
                render: (r) =>
                  r.subscription ? (
                    <Badge status={r.subscription.status} />
                  ) : (
                    <span className="text-gray-400">No plan</span>
                  ),
              },
              {
                key: "wallet",
                label: "Tokens",
                render: (r) =>
                  `${formatNumber(r.wallet.balance)} (${formatNumber(
                    r.wallet.reserved,
                  )} held)`,
              },
              {
                key: "isActive",
                label: "Status",
                render: (r) => (
                  <Badge status={r.isActive ? "ACTIVE" : "SUSPENDED"} />
                ),
              },
              {
                key: "actions",
                label: "Actions",
                render: (r) => (
                  <button
                    onClick={() =>
                      toggleStatus.mutate({ id: r.id, isActive: !r.isActive })
                    }
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
                      r.isActive
                        ? "text-rose-600 hover:bg-rose-50"
                        : "text-emerald-600 hover:bg-emerald-50"
                    }`}
                  >
                    {r.isActive ? "Suspend" : "Activate"}
                  </button>
                ),
              },
            ]}
          />
          {/* Pagination */}
          {schools.data.total > schools.data.pageSize && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                Page {page} of{" "}
                {Math.ceil(schools.data.total / schools.data.pageSize)}
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
                  disabled={
                    page >=
                    Math.ceil(schools.data.total / schools.data.pageSize)
                  }
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* School profile drawer */}
      {selectedId && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/50"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="w-full max-w-2xl h-full overflow-y-auto bg-white dark:bg-gray-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {profile.isLoading ? (
              <Loading />
            ) : profile.data ? (
              <>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-extrabold flex items-center gap-2">
                      <BuildingOffice2Icon className="w-6 h-6 text-blue-500" />{" "}
                      {profile.data.name}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Registered{" "}
                      {new Date(profile.data.createdAt).toLocaleDateString()} ·
                      {profile.data.activeAcademicYear
                        ? ` ${profile.data.activeAcademicYear}`
                        : " no active session"}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <KpiCard
                    label="Students"
                    value={formatNumber(profile.data.students)}
                    tone="violet"
                  />
                  <KpiCard
                    label="Teachers"
                    value={formatNumber(profile.data.teachers)}
                    tone="blue"
                  />
                  <KpiCard
                    label="Classes"
                    value={formatNumber(profile.data.classes)}
                    tone="gray"
                  />
                  <KpiCard
                    label="Parents"
                    value={formatNumber(profile.data.parents)}
                    tone="emerald"
                  />
                </div>

                <h3 className="font-bold mb-2">Financial Snapshot</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                  <KpiCard
                    label="Platform Revenue"
                    value={formatNGN(profile.data.financial.platformRevenue)}
                    sub="Subs + tokens"
                    tone="emerald"
                  />
                  <KpiCard
                    label="Subscription Rev."
                    value={formatNGN(
                      profile.data.financial.subscriptionRevenue,
                    )}
                    tone="blue"
                  />
                  <KpiCard
                    label="Token Revenue"
                    value={formatNGN(profile.data.financial.tokenRevenue)}
                    tone="violet"
                  />
                  <KpiCard
                    label="AI Expenses"
                    value={formatNGN(profile.data.financial.aiExpenses)}
                    tone="rose"
                  />
                  <KpiCard
                    label="Fees Billed (school)"
                    value={formatNGN(profile.data.financial.feeBilled)}
                    tone="amber"
                  />
                  <KpiCard
                    label="Fees Collected"
                    value={formatNGN(profile.data.financial.feeCollected)}
                    tone="gray"
                  />
                </div>

                {profile.data.wallet && (
                  <>
                    <h3 className="font-bold mb-2">Edufy Wallet</h3>
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <KpiCard
                        label="Balance"
                        value={formatNumber(profile.data.wallet.balance)}
                        tone="blue"
                      />
                      <KpiCard
                        label="Reserved"
                        value={formatNumber(profile.data.wallet.reserved)}
                        tone="amber"
                      />
                      <KpiCard
                        label="Lifetime Consumed"
                        value={formatNumber(
                          profile.data.wallet.lifetimeConsumed,
                        )}
                        tone="gray"
                      />
                    </div>
                  </>
                )}

                <h3 className="font-bold mb-2">Subscription</h3>
                {profile.data.subscription ? (
                  <p className="text-sm mb-6">
                    <Badge status={profile.data.subscription.status} />{" "}
                    {profile.data.subscription.plan.name}
                    {profile.data.subscription.endDate && (
                      <span className="text-gray-500">
                        {" "}
                        · renews{" "}
                        {new Date(
                          profile.data.subscription.endDate,
                        ).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 mb-6">
                    No subscription plan assigned.
                  </p>
                )}

                <h3 className="font-bold mb-2">Recent Admins & Staff</h3>
                <div className="space-y-2 mb-6">
                  {profile.data.operations.activeUsers.map(
                    (u: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-sm border-b border-gray-100 dark:border-gray-800 pb-2"
                      >
                        <span>{u.name || u.email}</span>
                        <span className="text-gray-400 text-xs">{u.role}</span>
                      </div>
                    ),
                  )}
                </div>
              </>
            ) : (
              <ErrorState message="School profile not found" />
            )}
          </div>
        </div>
      )}

      {/* Register school modal */}
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
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
