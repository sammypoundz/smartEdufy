import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { api } from '../../utils/api';
import { getMyAssignments, type ArmAssignment } from '../../services/armApi';
import {
  AcademicCapIcon,
  UserGroupIcon,
  BookOpenIcon,
  ClipboardDocumentCheckIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface TimetableEntry {
  id?: string;
  dayOfWeek?: string;
  day?: string;
  startTime?: string;
  endTime?: string;
  subject?: { id?: string; name?: string } | string;
  arm?: { id?: string; letter?: string; alias?: string; class?: { name?: string } };
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();

  const [assignments, setAssignments] = useState<ArmAssignment[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<
    { label: string; armId: string; present: number; total: number; recorded: boolean }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Assigned classes & subjects (single source of truth for access)
        const myAssignments = await getMyAssignments().catch(() => []);
        if (cancelled) return;
        setAssignments(myAssignments);

        // 2. Teacher's own timetable (subjects they teach)
        const teacherId = user?.id;
        if (teacherId) {
          const ttRes = await api.get(`/timetable/teacher/${teacherId}`);
          if (!cancelled && ttRes.ok) {
            const data = await ttRes.json();
            setTimetable(Array.isArray(data) ? data : []);
          }
        }

        // 3. Today's attendance snapshot for each form class they own
        const today = new Date().toISOString().slice(0, 10);
        const formArms = myAssignments.filter((a) => a.isFormTeacher);
        const summaries = await Promise.all(
          formArms.map(async (a) => {
            try {
              const res = await api.get(`/attendance/arm/${a.armId}?startDate=${today}&endDate=${today}`);
              if (!res.ok) return { label: `${a.className} ${a.armName}`, armId: a.armId, present: 0, total: 0, recorded: false };
              const records = await res.json();
              const list = Array.isArray(records) ? records : [];
              if (list.length === 0) {
                return { label: `${a.className} ${a.armName}`, armId: a.armId, present: 0, total: 0, recorded: false };
              }
              const present = list.filter((r: any) => r.present).length;
              const total = new Set(list.map((r: any) => r.studentId)).size;
              return { label: `${a.className} ${a.armName}`, armId: a.armId, present, total, recorded: true };
            } catch {
              return { label: `${a.className} ${a.armName}`, armId: a.armId, present: 0, total: 0, recorded: false };
            }
          })
        );
        if (!cancelled) setAttendanceSummary(summaries);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
        if (!cancelled) setError('Could not load your dashboard data. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // ---------- Derived values ----------
  const totalClasses = new Set(assignments.map((a) => a.armId)).size;
  const formClasses = assignments.filter((a) => a.isFormTeacher);
  const allSubjects = Array.from(new Set(assignments.flatMap((a) => a.subjectNames)));
  const totalSubjectEntries = assignments.reduce((sum, a) => sum + a.subjectNames.length, 0);

  const dayName = DAYS[(new Date().getDay() + 6) % 7] || '';
  const todaysSchedule = timetable
    .filter((t) => {
      const d = t.dayOfWeek || t.day || '';
      return d.toLowerCase() === dayName.toLowerCase();
    })
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  const totalAttendanceRecorded = attendanceSummary.filter((s) => s.recorded).length;

  const card = `rounded-2xl p-5 shadow-lg border transition-all ${
    theme === 'dark'
      ? 'bg-white/5 backdrop-blur-xl border-white/10'
      : 'bg-white/40 backdrop-blur-md border-white/20'
  }`;
  const statCard = `rounded-2xl p-5 shadow-md border transition-all hover:shadow-lg ${
    theme === 'dark'
      ? 'bg-white/5 backdrop-blur-xl border-white/10'
      : 'bg-white/60 backdrop-blur-md border-white/20'
  }`;
  const chipBtn = `flex flex-col items-center justify-center gap-2 rounded-2xl p-4 border transition-all hover:shadow-md ${
    theme === 'dark'
      ? 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-200'
      : 'bg-white/60 border-white/20 hover:bg-white text-gray-700'
  }`;

  // ---------- Loading / error ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 rounded-xl border border-red-300 bg-red-50 text-red-700 flex items-center gap-3">
        <ExclamationTriangleIcon className="h-6 w-6" />
        <p>{error}</p>
      </div>
    );
  }

  // ---------- Empty state ----------
  if (totalClasses === 0) {
    return (
      <div className={`${card} p-10 text-center`}>
        <AcademicCapIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-bold mb-2">Nothing assigned yet</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          You have not been assigned to any class or subject yet. Once the school administrator
          assigns you classes, your dashboard will show them here.
        </p>
        <Link
          to="/teacher/profile"
          className="inline-flex items-center mt-6 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
        >
          View My Profile <ArrowRightIcon className="h-4 w-4 ml-1" />
        </Link>
      </div>
    );
  }

  // ---------- Quick actions (only pages the admin granted via privileges) ----------
  const allowedPages = user?.allowedPages || [];
  const hasPrivilege = (key: string) => allowedPages.includes(key);

  const shortcuts = [
    hasPrivilege('classes') && { name: 'My Classes', to: '/teacher/classes', icon: AcademicCapIcon },
    hasPrivilege('subjects') && { name: 'My Subjects', to: '/teacher/subjects', icon: BookOpenIcon },
    hasPrivilege('students') && { name: 'Students', to: '/teacher/students', icon: UserGroupIcon },
    hasPrivilege('results') && { name: 'Results', to: '/teacher/results', icon: ChartBarIcon },
    formClasses.length > 0 && hasPrivilege('classes') && {
      name: 'Attendance',
      to: `/teacher/class/${formClasses[0]?.classId}/arm/${formClasses[0]?.armId}`,
      icon: ClipboardDocumentCheckIcon,
    },
    hasPrivilege('lesson-plan') && { name: 'Lesson Plan', to: '/teacher/lesson-plan', icon: ClipboardDocumentListIcon },
    hasPrivilege('timetable') && { name: 'Timetable', to: '/teacher/timetable', icon: CalendarDaysIcon },
    hasPrivilege('broadsheet') && { name: 'Broadsheet', to: '/teacher/broadsheet', icon: ClipboardDocumentListIcon },
    hasPrivilege('cbt') && { name: 'CBT', to: '/teacher/cbt', icon: AcademicCapIcon },
  ].filter(Boolean) as { name: string; to: string; icon: any }[];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Welcome back, {user?.name || 'Teacher'} 👋
        </h1>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Here is an overview of your classes and today's activities.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={statCard}>
          <AcademicCapIcon className="h-6 w-6 text-blue-500" />
          <p className={`mt-3 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Classes</p>
          <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{totalClasses}</p>
        </div>
        <div className={statCard}>
          <BookOpenIcon className="h-6 w-6 text-indigo-500" />
          <p className={`mt-3 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Subjects</p>
          <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{allSubjects.length || totalSubjectEntries}</p>
        </div>
        <div className={statCard}>
          <UserGroupIcon className="h-6 w-6 text-emerald-500" />
          <p className={`mt-3 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Form Classes</p>
          <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{formClasses.length}</p>
        </div>
        <div className={statCard}>
          <ClipboardDocumentCheckIcon className="h-6 w-6 text-amber-500" />
          <p className={`mt-3 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Attendance Today</p>
          <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {totalAttendanceRecorded}/{formClasses.length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's schedule */}
        <div className={`${card} lg:col-span-2`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              <ClockIcon className="h-5 w-5 text-blue-500" /> Today's Schedule ({dayName || '—'})
            </h2>
            <Link to="/teacher/timetable" className="text-sm text-blue-500 hover:underline">View full timetable</Link>
          </div>
          {todaysSchedule.length === 0 ? (
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              No lessons scheduled for today.
            </p>
          ) : (
            <ul className="space-y-3">
              {todaysSchedule.map((t, i) => {
                const subjectName = typeof t.subject === 'string' ? t.subject : t.subject?.name || 'Subject';
                const armLabel = t.arm ? `${t.arm.class?.name || ''} ${t.arm.alias || t.arm.letter || ''}`.trim() : '';
                return (
                  <li key={t.id || i} className={`flex items-center justify-between p-3 rounded-xl border ${
                    theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white/50'
                  }`}>
                    <div>
                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{subjectName}</p>
                      {armLabel && <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{armLabel}</p>}
                    </div>
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}>
                      {t.startTime || ''}{t.endTime ? ` – ${t.endTime}` : ''}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Quick shortcuts */}
        <div className={card}>
          <h2 className={`font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Quick Actions</h2>
          {shortcuts.length === 0 ? (
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              No page privileges have been granted to you yet. Please contact the school administrator.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {shortcuts.map((s) => (
                <Link key={s.name} to={s.to} className={chipBtn}>
                  <s.icon className="h-6 w-6 text-blue-500" />
                  <span className="text-xs font-medium text-center">{s.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My classes list */}
        <div className={card}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>My Classes</h2>
            <Link to="/teacher/classes" className="text-sm text-blue-500 hover:underline">View all</Link>
          </div>
          <ul className="space-y-3">
            {assignments.map((a) => (
              <li key={a.armId}>
                <Link
                  to={`/teacher/class/${a.classId}/arm/${a.armId}`}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                    theme === 'dark' ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-gray-200 bg-white/50 hover:bg-white'
                  }`}
                >
                  <div>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {a.className} {a.armName}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {a.subjectNames.length > 0 ? a.subjectNames.join(', ') : 'No subjects assigned'}
                    </p>
                  </div>
                  {a.isFormTeacher && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">Form Teacher</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Attendance today */}
        <div className={card}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Today's Attendance</h2>
            <CheckCircleIcon className={`h-5 w-5 ${totalAttendanceRecorded === formClasses.length && formClasses.length > 0 ? 'text-green-500' : 'text-gray-400'}`} />
          </div>
          {attendanceSummary.length === 0 ? (
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              You are not a form teacher of any class.
            </p>
          ) : (
            <ul className="space-y-3">
              {attendanceSummary.map((s) => (
                <li key={s.armId} className={`flex items-center justify-between p-3 rounded-xl border ${
                  theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white/50'
                }`}>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{s.label}</p>
                  {s.recorded ? (
                    <span className="text-sm font-medium text-green-600">{s.present}/{s.total} present</span>
                  ) : (
                    <Link to={`/teacher/class/${formClasses.find((f) => f.armId === s.armId)?.classId}/arm/${s.armId}`}
                      className="text-sm font-medium text-amber-600 hover:underline">
                      Take attendance →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
