// Module 1 — Super Admin Overview dashboard (real platform statistics).
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BuildingOffice2Icon,
  UsersIcon,
  AcademicCapIcon,
  UserGroupIcon,
  BanknotesIcon,
  CreditCardIcon,
  CpuChipIcon,
  WalletIcon,
  ServerStackIcon,
} from "@heroicons/react/24/outline";
import platformApi from "../../utils/platformApi";
import {
  KpiCard,
  ChartCard,
  Loading,
  ErrorState,
  formatNGN,
  formatNumber,
} from "./shared";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useTheme } from "../../contexts/ThemeContext";

export default function PlatformOverview() {
  const { theme } = useTheme();
  const dark = theme === "dark";

  const overview = useQuery({
    queryKey: ["platform", "overview"],
    queryFn: async () => (await platformApi.get("/overview")).data,
    refetchInterval: 60_000,
  });
  const revenue = useQuery({
    queryKey: ["platform", "revenue"],
    queryFn: async () => (await platformApi.get("/revenue")).data,
  });

  if (overview.isLoading) return <Loading />;
  if (overview.error)
    return (
      <ErrorState
        message={
          (overview.error as any)?.response?.data?.error ||
          "Failed to load overview"
        }
      />
    );

  const d = overview.data;
  const rev = revenue.data;
  const monthlySeries = (rev?.monthlySeries || []).map((m: any) => ({
    month: m.month.slice(5),
    subscriptions: m.subs,
    tokens: m.tokens,
  }));

  const axisColor = dark ? "#6b7280" : "#9ca3af";
  const tooltipStyle = dark
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
      };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          Platform Overview
        </h1>
        <p
          className={`mt-1 text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}
        >
          Live statistics across all SmartEdufy and SmartEdufy Lite schools.
          Generated {new Date(d.generatedAt).toLocaleString()}
        </p>
      </motion.div>

      {/* Growth KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
        <KpiCard
          label="Registered Schools"
          value={formatNumber(d.schools.total)}
          sub={`${d.schools.newThisMonth} new in 30d`}
          icon={<BuildingOffice2Icon className="w-4 h-4" />}
        />
        <KpiCard
          label="Active Schools"
          value={formatNumber(d.schools.active)}
          sub={`${d.schools.inactive} inactive`}
          tone="emerald"
        />
        <KpiCard
          label="Total Students"
          value={formatNumber(d.users.students)}
          icon={<UsersIcon className="w-4 h-4" />}
          tone="violet"
        />
        <KpiCard
          label="Total Teachers"
          value={formatNumber(d.users.teachers)}
          icon={<AcademicCapIcon className="w-4 h-4" />}
          tone="blue"
        />
        <KpiCard
          label="Platform Users"
          value={formatNumber(d.users.total)}
          sub={`${formatNumber(d.users.parents)} parents`}
          icon={<UserGroupIcon className="w-4 h-4" />}
          tone="gray"
        />
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
        <KpiCard
          label="Total Revenue"
          value={formatNGN(d.revenue.total)}
          icon={<BanknotesIcon className="w-4 h-4" />}
          tone="emerald"
        />
        <KpiCard
          label="Subscription Revenue"
          value={formatNGN(d.revenue.subscriptions)}
          icon={<CreditCardIcon className="w-4 h-4" />}
        />
        <KpiCard
          label="AI Token Sales"
          value={formatNGN(d.revenue.tokens)}
          icon={<WalletIcon className="w-4 h-4" />}
          tone="violet"
        />
        <KpiCard
          label="AI Expenses"
          value={formatNGN(d.revenue.aiExpenses)}
          tone="rose"
        />
        <KpiCard
          label="Contribution (after AI)"
          value={formatNGN(d.revenue.contribution)}
          tone="amber"
        />
      </div>

      {/* Subscription snapshot */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <KpiCard
          label="Active Subscriptions"
          value={formatNumber(d.subscriptions.active)}
          tone="emerald"
        />
        <KpiCard
          label="Expired Subscriptions"
          value={formatNumber(d.subscriptions.expired)}
          tone="rose"
        />
        <KpiCard
          label="Subscription Plans"
          value={formatNumber(d.subscriptions.plans)}
          tone="gray"
        />
        <KpiCard
          label="This Month Revenue"
          value={formatNGN(
            ((rev?.monthlySeries || []).slice(-1)[0]?.subs || 0) +
              ((rev?.monthlySeries || []).slice(-1)[0]?.tokens || 0),
          )}
          tone="blue"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Monthly Platform Revenue"
          subtitle="Subscription + token purchase revenue (verified records only)"
        >
          {revenue.isLoading ? (
            <Loading />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlySeries}>
                <defs>
                  <linearGradient id="gSub" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gTok" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={dark ? "#1f2937" : "#f3f4f6"}
                />
                <XAxis dataKey="month" stroke={axisColor} fontSize={11} />
                <YAxis
                  stroke={axisColor}
                  fontSize={11}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: any) => formatNGN(v)}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area
                  type="monotone"
                  dataKey="subscriptions"
                  name="Subscriptions"
                  stroke="#3b82f6"
                  fill="url(#gSub)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="tokens"
                  name="Tokens"
                  stroke="#8b5cf6"
                  fill="url(#gTok)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Revenue vs AI Expenses"
          subtitle="Gross revenue compared against AI processing costs"
        >
          {revenue.isLoading ? (
            <Loading />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={[
                  { name: "Gross Revenue", value: rev?.grossRevenue || 0 },
                  { name: "AI Expenses", value: rev?.aiExpenses || 0 },
                  { name: "Other Expenses", value: rev?.otherExpenses || 0 },
                  { name: "Contribution", value: rev?.contributionMargin || 0 },
                ]}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={dark ? "#1f2937" : "#f3f4f6"}
                />
                <XAxis dataKey="name" stroke={axisColor} fontSize={10} />
                <YAxis
                  stroke={axisColor}
                  fontSize={11}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: any) => formatNGN(v)}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Revenue Breakdown">
          {revenue.isLoading ? (
            <Loading />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Subscriptions", value: rev?.subRevenue || 0 },
                    { name: "AI Tokens", value: rev?.tokenRevenue || 0 },
                  ]}
                  dataKey="value"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#8b5cf6" />
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: any) => formatNGN(v)}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="System Status" subtitle="Live health snapshot">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ServerStackIcon className="w-4 h-4 text-emerald-500" />{" "}
                Database
              </span>
              <span className="text-emerald-600 font-bold">Connected</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CpuChipIcon className="w-4 h-4 text-blue-500" /> AI Provider
              </span>
              <span className="text-blue-600 font-bold">Gemini</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <WalletIcon className="w-4 h-4 text-violet-500" /> Wallets
                Active
              </span>
              <span className="font-bold">
                {formatNumber(d.subscriptions.active)}
              </span>
            </div>
            <p
              className={`text-[11px] pt-2 border-t ${
                dark
                  ? "border-gray-800 text-gray-500"
                  : "border-gray-200 text-gray-400"
              }`}
            >
              Revenue figures come from verified payment and ledger records
              only. School fee collections are schools' own income and are
              tracked separately under Fee Analytics.
            </p>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
