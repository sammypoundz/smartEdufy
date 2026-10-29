import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import StatCard from '../../components/StatCard';
import {
  UsersIcon,
  AcademicCapIcon,
  BookOpenIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  WalletIcon,
  ArrowRightIcon,
  UserPlusIcon,
  DocumentTextIcon,
  CalendarIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { api } from '../../utils/api';

// ---------- Animation variants ----------
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 },
};

// ---------- Helpers ----------
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

// ---------- Types ----------
interface Activity {
  id: string;
  time: Date;
  description: string;
  type: 'registration' | 'payment' | 'payroll' | 'result' | 'assignment' | 'attendance' | 'other';
  path?: string;
}

// ---------- Sub-components ----------

const Greeting = ({ name, role, school, theme }: { name: string; role: string; school: string; theme: string }) => {
  const hour = new Date().getHours();
  let greeting = 'Good morning';
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  else if (hour >= 17) greeting = 'Good evening';

  // Human-friendly role label (handles custom roles too)
  const roleLabel = role
    ? role.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : '';

  const isDark = theme === 'dark';
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="dash-greeting relative mb-5 md:mb-8 overflow-hidden rounded-3xl shadow-lg md:shadow-xl"
    >
      {/* Elegant gradient banner */}
      <div
        className={`relative px-5 py-6 md:px-8 md:py-9 ${
          isDark
            ? 'bg-gradient-to-br from-blue-600/25 via-indigo-700/15 to-transparent border border-white/10'
            : 'bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800'
        }`}
      >
        {/* Decorative orbs */}
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-8 h-40 w-40 rounded-full bg-sky-300/20 blur-2xl" />
        <div className="pointer-events-none absolute right-16 top-6 hidden h-16 w-16 rounded-full bg-white/5 blur-lg md:block" />

        <div className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            {/* Role pill */}
            {roleLabel && (
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white ring-1 ring-white/20 backdrop-blur-sm md:text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                {roleLabel}
              </span>
            )}
            <h1 className="text-2xl font-bold tracking-tight text-white md:text-4xl">
              {greeting}, <span className="font-extrabold">{name}</span> 👋
            </h1>
            <p className="mt-1.5 text-sm font-medium text-blue-100/90 md:text-base">
              {school}
            </p>
          </div>

          {/* Date chip — right aligned on desktop, below on mobile */}
          <div className="flex items-center gap-2 self-start rounded-2xl bg-white/10 px-4 py-2.5 ring-1 ring-white/15 backdrop-blur-sm md:self-auto md:flex-col md:items-end md:gap-0.5 md:rounded-2xl md:px-5 md:py-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200">Today</span>
            <span className="whitespace-nowrap text-xs font-semibold text-white md:text-sm">{today}</span>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

const ActivityFeed = ({ activities, theme, navigate }: { activities: Activity[]; theme: string; navigate: any }) => {
  // On phones show just the latest items; desktop keeps the full feed.
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const visible = isMobile ? activities.slice(0, 4) : activities;
  if (visible.length === 0) return null;

  const getIcon = (type: Activity['type']) => {
    switch (type) {
      case 'registration': return <UserPlusIcon className="w-4 h-4 text-emerald-500" />;
      case 'payment': return <CurrencyDollarIcon className="w-4 h-4 text-blue-500" />;
      case 'payroll': return <WalletIcon className="w-4 h-4 text-purple-500" />;
      case 'result': return <DocumentTextIcon className="w-4 h-4 text-amber-500" />;
      default: return <DocumentTextIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <motion.div variants={item} className={`dash-activity rounded-2xl p-4 md:p-6 shadow-lg ${
      theme === 'dark'
        ? 'bg-white/5 border border-white/10'
        : 'bg-white/80 backdrop-blur-md border border-gray-200/60 shadow-gray-200/50'
    }`}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2.5">
          <span className={`h-8 w-8 flex items-center justify-center rounded-xl ${
            theme === 'dark' ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-100 text-blue-700'
          }`}>
            <ChartBarIcon className="h-4 w-4" />
          </span>
          <div>
            <h3 className={`text-base md:text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Recent Activity</h3>
            <p className={`text-[11px] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {isMobile ? 'Latest updates' : "What's happening in your school"}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/admin/activity')}
          className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            theme === 'dark'
              ? 'bg-blue-500/15 text-blue-300 hover:bg-blue-500/25'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
          }`}
        >
          See All <ArrowRightIcon className="w-3.5 h-3.5" />
        </button>
      </div>
      <ul className="space-y-1 md:space-y-2.5 md:max-h-64 md:overflow-y-auto md:pr-1 no-scrollbar">
        {visible.map((activity, idx) => (
          <li
            key={activity.id}
            onClick={() => activity.path && navigate(activity.path)}
            className={`group flex items-center gap-3 text-sm p-2.5 md:p-3 rounded-xl cursor-pointer transition-all active:scale-[0.99] ${
              theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-100/60'
            } ${idx > 0 ? (theme === 'dark' ? 'border-t border-white/[0.04]' : 'border-t border-gray-100') : ''}`}
          >
            <span className={`h-9 w-9 md:h-8 md:w-8 flex items-center justify-center rounded-xl flex-shrink-0 ${
              theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'
            }`}>
              {getIcon(activity.type)}
            </span>
            <span className={`flex-1 min-w-0 leading-snug ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              {activity.description}
            </span>
            <span className={`text-xs whitespace-nowrap hidden sm:block ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              {new Date(activity.time).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <ChevronRightIcon className={`w-4 h-4 flex-shrink-0 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
          </li>
        ))}
      </ul>
    </motion.div>
  );
};

// ---------- Main Component ----------
export default function AdminOverview() {
  const { theme } = useTheme();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  // ---------- Fetch real data ----------
  const { data, isLoading: loading } = useQuery({
    queryKey: ['admin-dashboard', token],
    enabled: !!token,
    async queryFn() {
      // 1. School name
      let schoolName = 'Loading...';
      try {
        const meRes = await api.get('/auth/me');
        if (meRes.ok) {
          const me = await meRes.json();
          if (me.school?.name) schoolName = me.school.name;
        }
      } catch {}

      // 2. Stats: students, teachers, classes
      const [studentsRes, teachersRes, classesRes] = await Promise.all([
        api.get('/students'),
        api.get('/teachers'),
        api.get('/classes'),
      ]);

      const students = studentsRes.ok ? await studentsRes.json() : [];
      const teachers = teachersRes.ok ? await teachersRes.json() : [];
      const classes = classesRes.ok ? await classesRes.json() : [];

      const stats = {
        totalStudents: Array.isArray(students) ? students.length : 0,
        totalTeachers: Array.isArray(teachers) ? teachers.length : 0,
        totalClasses: Array.isArray(classes) ? classes.length : 0,
        averagePerformance: 0, // not available from simple endpoints
      };

      // 3. Recent registrations (users)
      let registrations: any[] = [];
      try {
        const usersRes = await api.get('/users');
        if (usersRes.ok) {
          const allUsers = await usersRes.json();
          if (Array.isArray(allUsers)) {
            registrations = allUsers
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 5);
          }
        }
      } catch {}

      // 4. Recent fee payments
      let payments: any[] = [];
      try {
        const feeRes = await api.get('/fees/payments?limit=5');
        if (feeRes.ok) {
          const d = await feeRes.json();
          payments = Array.isArray(d) ? d : d.data || [];
        }
      } catch {}

      // 5. Recent payroll
      let payrolls: any[] = [];
      try {
        const payrollRes = await api.get('/payroll?limit=5');
        if (payrollRes.ok) {
          const d = await payrollRes.json();
          payrolls = Array.isArray(d) ? d : d.data || [];
        }
      } catch {}

      // 6. Build activity feed
      const activities: Activity[] = [
        ...registrations.map((u) => ({
          id: `reg-${u.id}`,
          time: new Date(u.createdAt),
          description: `${u.name || u.email} registered as ${u.role}`,
          type: 'registration' as const,
          path: '/admin/users',
        })),
        ...payments.map((p) => ({
          id: `pay-${p.id}`,
          time: new Date(p.paymentDate || Date.now()),
          description: `${p.student?.name || 'Student'} paid ${formatCurrency(p.amountPaid)} fees`,
          type: 'payment' as const,
          path: '/admin/fees',
        })),
        ...payrolls.map((p) => ({
          id: `pr-${p.id}`,
          time: new Date(p.paymentDate || Date.now()),
          description: `${p.staffName || p.staff?.name || 'Staff'} payroll processed (${p.month})`,
          type: 'payroll' as const,
          path: '/admin/payroll',
        })),
      ]
        .sort((a, b) => b.time.getTime() - a.time.getTime())
        .slice(0, 10);

      return { schoolName, stats, activities };
    },
  });

  const schoolName = data?.schoolName ?? 'Loading...';
  const stats = data?.stats ?? { totalStudents: 0, totalTeachers: 0, totalClasses: 0, averagePerformance: 0 };
  const activities = data?.activities ?? [];

  // ---------- Stats cards ----------
  const statsData = [
    { title: 'Total Students', value: stats.totalStudents.toString(), icon: UsersIcon, color: 'blue' as const, trend: undefined },
    { title: 'Total Teachers', value: stats.totalTeachers.toString(), icon: AcademicCapIcon, color: 'green' as const, trend: undefined },
    { title: 'Classes', value: stats.totalClasses.toString(), icon: BookOpenIcon, color: 'purple' as const, trend: undefined },
    { title: 'Avg Performance', value: stats.averagePerformance > 0 ? `${stats.averagePerformance}%` : '—', icon: ChartBarIcon, color: 'blue' as const, trend: undefined },
  ];

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className={`mt-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen px-4 md:px-8 py-5 md:py-8 transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
    }`}>
      {/* Background grid */}
      {theme === 'dark' ? (
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `linear-gradient(rgba(59,130,246,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.1) 1px,transparent 1px)`, backgroundSize: '60px 60px' }} />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
        </div>
      ) : (
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `linear-gradient(rgba(59,130,246,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.1) 1px,transparent 1px)`, backgroundSize: '60px 60px' }} />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-200/20 via-transparent to-purple-200/20" />
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto">
        <Greeting name={user?.name || 'Administrator'} role={user?.role || ''} school={schoolName} theme={theme} />

        {/* Stats */}
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 md:gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-5 md:mb-6">
          {statsData.map((stat) => (
            <motion.div key={stat.title} variants={item}>
              <StatCard
                icon={<stat.icon className="w-6 h-6" />}
                title={stat.title}
                value={stat.value}
                trend={stat.trend}
                color={stat.color}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Activity Feed */}
        <ActivityFeed activities={activities} theme={theme} navigate={navigate} />

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`mt-5 md:mt-6 rounded-2xl p-4 md:p-6 shadow-lg ${
            theme === 'dark'
              ? 'bg-white/5 backdrop-blur-xl border border-white/10'
              : 'bg-white/80 backdrop-blur-md border border-gray-200/60 shadow-gray-200/50'
          }`}
        >
          <h3 className={`text-base md:text-lg font-medium mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Quick Actions</h3>
          {/* App-style icon grid on phones, text chips on desktop */}
          <div className="grid grid-cols-3 gap-2.5 md:flex md:flex-wrap md:gap-3">
            {[
              { label: 'Add Student', href: '/admin/students', icon: UserPlusIcon },
              { label: 'Create Class', href: '/admin/classes', icon: AcademicCapIcon },
              { label: 'Compile Results', href: '/admin/results', icon: ChartBarIcon },
              { label: 'Record Fee', href: '/admin/fees', icon: CurrencyDollarIcon },
              { label: 'Process Payroll', href: '/admin/payroll', icon: WalletIcon },
              { label: 'Timetable', href: '/admin/timetable', icon: CalendarIcon },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.href)}
                className={`flex md:items-center flex-col md:flex-row items-center gap-1.5 md:gap-2 px-2 md:px-4 py-3.5 md:py-2 rounded-2xl md:rounded-lg transition-all duration-200 text-[11px] md:text-sm font-medium text-center active:scale-95 ${
                  theme === 'dark'
                    ? 'bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 hover:text-white'
                    : 'bg-white/60 hover:bg-white/80 border border-white/30 text-gray-700 hover:text-gray-900 shadow-sm'
                }`}
              >
                {(() => {
                  const Icon = action.icon;
                  return (
                    <span className={`h-9 w-9 md:h-5 md:w-5 flex items-center justify-center rounded-xl md:rounded-none md:bg-transparent md:p-0 flex-shrink-0 ${
                      theme === 'dark' ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-100 text-blue-700'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </span>
                  );
                })()}
                <span className="leading-tight md:leading-normal">{action.label}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}