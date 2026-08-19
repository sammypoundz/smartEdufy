import { useState, useEffect } from 'react';
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
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
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
const Greeting = ({ name, school, theme }: { name: string; school: string; theme: string }) => {
  const hour = new Date().getHours();
  let greeting = 'Good morning';
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  else if (hour >= 17) greeting = 'Good evening';

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
      <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        {greeting}, {name} 👋
      </h1>
      <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
        {school} — {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </motion.div>
  );
};

const ActivityFeed = ({ activities, theme, navigate }: { activities: Activity[]; theme: string; navigate: any }) => {
  if (activities.length === 0) return null;

  const getIcon = (type: Activity['type']) => {
    switch (type) {
      case 'registration': return <UserPlusIcon className="w-4 h-4 text-green-500" />;
      case 'payment': return <CurrencyDollarIcon className="w-4 h-4 text-blue-500" />;
      case 'payroll': return <WalletIcon className="w-4 h-4 text-purple-500" />;
      case 'result': return <DocumentTextIcon className="w-4 h-4 text-yellow-500" />;
      default: return <DocumentTextIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <motion.div variants={item} className={`rounded-2xl p-6 shadow-lg ${
      theme === 'dark'
        ? 'bg-white/5 border border-white/10'
        : 'bg-white/80 backdrop-blur-md border border-gray-200/60 shadow-gray-200/50'
    }`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Recent Activity</h3>
        <button
          onClick={() => navigate('/admin/activity')}
          className={`text-sm flex items-center gap-1 ${
            theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
          }`}
        >
          See All <ArrowRightIcon className="w-4 h-4" />
        </button>
      </div>
      <ul className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {activities.map((activity) => (
          <li
            key={activity.id}
            onClick={() => activity.path && navigate(activity.path)}
            className={`flex items-start gap-3 text-sm p-2 rounded-lg cursor-pointer transition-colors ${
              theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-100/50'
            }`}
          >
            <span className="mt-0.5">{getIcon(activity.type)}</span>
            <span className={`flex-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              {activity.description}
            </span>
            <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              {new Date(activity.time).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
};

// ---------- Main Component ----------
export default function AdminOverview() {
  const { theme } = useTheme();
  const { token, logout, user } = useAuth();
  const navigate = useNavigate();
  const [schoolName, setSchoolName] = useState('Loading...');
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    averagePerformance: 0,
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // ---------- Fetch real data ----------
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // 1. School name
        const meRes = await api.get('/auth/me');
        if (meRes.ok) {
          const me = await meRes.json();
          if (me.school?.name) {
            setSchoolName(me.school.name);
          }
        }

        // 2. Stats: students, teachers, classes
        const [studentsRes, teachersRes, classesRes] = await Promise.all([
          api.get('/students'),
          api.get('/teachers'),
          api.get('/classes'),
        ]);

        const students = studentsRes.ok ? await studentsRes.json() : [];
        const teachers = teachersRes.ok ? await teachersRes.json() : [];
        const classes = classesRes.ok ? await classesRes.json() : [];

        setStats({
          totalStudents: Array.isArray(students) ? students.length : 0,
          totalTeachers: Array.isArray(teachers) ? teachers.length : 0,
          totalClasses: Array.isArray(classes) ? classes.length : 0,
          averagePerformance: 0, // not available from simple endpoints
        });

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
            const data = await feeRes.json();
            payments = Array.isArray(data) ? data : data.data || [];
          }
        } catch {}

        // 5. Recent payroll
        let payrolls: any[] = [];
        try {
          const payrollRes = await api.get('/payroll?limit=5');
          if (payrollRes.ok) {
            const data = await payrollRes.json();
            payrolls = Array.isArray(data) ? data : data.data || [];
          }
        } catch {}

        // 6. Build activity feed
        const activitiesList: Activity[] = [
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

        setActivities(activitiesList);
      } catch (error) {
        console.error('Failed to load dashboard data', error);
        toast.error('Could not load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [token, logout]);

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
    <div className={`min-h-screen px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-300 ${
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
        <Greeting name={user?.name || 'Administrator'} school={schoolName} theme={theme} />

        {/* Stats */}
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-6">
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
          className={`mt-6 rounded-2xl p-6 shadow-lg ${
            theme === 'dark'
              ? 'bg-white/5 backdrop-blur-xl border border-white/10'
              : 'bg-white/80 backdrop-blur-md border border-gray-200/60 shadow-gray-200/50'
          }`}
        >
          <h3 className={`text-lg font-medium mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => navigate('/admin/students')} className={`px-4 py-2 rounded-lg transition-all duration-200 text-sm ${
              theme === 'dark'
                ? 'bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 hover:text-white'
                : 'bg-white/40 hover:bg-white/60 border border-white/20 text-gray-700 hover:text-gray-900'
            }`}>+ Add Student</button>
            <button onClick={() => navigate('/admin/classes')} className={`px-4 py-2 rounded-lg transition-all duration-200 text-sm ${
              theme === 'dark'
                ? 'bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 hover:text-white'
                : 'bg-white/40 hover:bg-white/60 border border-white/20 text-gray-700 hover:text-gray-900'
            }`}>+ Create Class</button>
            <button onClick={() => navigate('/admin/results')} className={`px-4 py-2 rounded-lg transition-all duration-200 text-sm ${
              theme === 'dark'
                ? 'bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 hover:text-white'
                : 'bg-white/40 hover:bg-white/60 border border-white/20 text-gray-700 hover:text-gray-900'
            }`}>+ Compile Results</button>
            <button onClick={() => navigate('/admin/fees')} className={`px-4 py-2 rounded-lg transition-all duration-200 text-sm ${
              theme === 'dark'
                ? 'bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 hover:text-white'
                : 'bg-white/40 hover:bg-white/60 border border-white/20 text-gray-700 hover:text-gray-900'
            }`}>+ Record Fee</button>
            <button onClick={() => navigate('/admin/payroll')} className={`px-4 py-2 rounded-lg transition-all duration-200 text-sm ${
              theme === 'dark'
                ? 'bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 hover:text-white'
                : 'bg-white/40 hover:bg-white/60 border border-white/20 text-gray-700 hover:text-gray-900'
            }`}>+ Process Payroll</button>
            <button onClick={() => navigate('/admin/timetable')} className={`px-4 py-2 rounded-lg transition-all duration-200 text-sm ${
              theme === 'dark'
                ? 'bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 hover:text-white'
                : 'bg-white/40 hover:bg-white/60 border border-white/20 text-gray-700 hover:text-gray-900'
            }`}>+ Timetable</button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}