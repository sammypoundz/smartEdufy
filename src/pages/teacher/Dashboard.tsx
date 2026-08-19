import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { api } from '../../utils/api';

interface TeacherProfile {
  id: string;
  name: string;
  arms?: Array<{ id: string; letter: string; class: { id: string; name: string } }>;
  subjectArms?: Array<{ id: string; subject: { id: string; name: string } }>;
}

interface DashboardStats {
  totalClasses: number;
  totalSubjects: number;
  totalStudents: number;
  totalResults: number;
  totalLessonPlans: number;
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [stats, setStats] = useState<DashboardStats>({
    totalClasses: 0,
    totalSubjects: 0,
    totalStudents: 0,
    totalResults: 0,
    totalLessonPlans: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        const profileRes = await api.get(`/teachers/${user.id}`);
        if (!profileRes.ok) throw new Error('Failed to fetch teacher profile');
        const teacher: TeacherProfile = await profileRes.json();

        let totalStudents = 0;
        if (teacher.arms && teacher.arms.length > 0) {
          const armPromises = teacher.arms.map(async (arm) => {
            const res = await api.get(`/arms/${arm.id}/students`);
            if (res.ok) {
              const students = await res.json();
              return Array.isArray(students) ? students.length : 0;
            }
            return 0;
          });
          const counts = await Promise.all(armPromises);
          totalStudents = counts.reduce((a, b) => a + b, 0);
        }

        // Placeholder: replace with your actual endpoints
        const [resultsRes, lessonPlansRes] = await Promise.all([
          api.get('/teachers/my-results'),
          api.get('/teachers/my-lesson-plans'),
        ]);
        const totalResults = resultsRes.ok ? (await resultsRes.json()).length : 0;
        const totalLessonPlans = lessonPlansRes.ok ? (await lessonPlansRes.json()).length : 0;

        setStats({
          totalClasses: teacher.arms?.length || 0,
          totalSubjects: teacher.subjectArms?.length || 0,
          totalStudents,
          totalResults,
          totalLessonPlans,
        });
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isFormTeacher = stats.totalClasses > 0;
  const isSubjectTeacher = stats.totalSubjects > 0;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Welcome back, {user?.name || 'Teacher'}
        </h1>
        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          {isFormTeacher && isSubjectTeacher
            ? 'You are both a Form Teacher and a Subject Teacher.'
            : isFormTeacher
            ? 'You are a Form Teacher.'
            : isSubjectTeacher
            ? 'You are a Subject Teacher.'
            : 'No classes or subjects assigned yet.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {isFormTeacher && (
          <>
            <div className={`rounded-xl p-6 shadow-md transition-all hover:shadow-lg ${
              theme === 'dark' ? 'bg-white/5 backdrop-blur-sm border border-white/10' : 'bg-white'
            }`}>
              <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                My Classes
              </h3>
              <p className={`mt-2 text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {stats.totalClasses}
              </p>
            </div>

            <div className={`rounded-xl p-6 shadow-md transition-all hover:shadow-lg ${
              theme === 'dark' ? 'bg-white/5 backdrop-blur-sm border border-white/10' : 'bg-white'
            }`}>
              <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                My Students
              </h3>
              <p className={`mt-2 text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {stats.totalStudents}
              </p>
            </div>
          </>
        )}

        {isSubjectTeacher && (
          <div className={`rounded-xl p-6 shadow-md transition-all hover:shadow-lg ${
            theme === 'dark' ? 'bg-white/5 backdrop-blur-sm border border-white/10' : 'bg-white'
          }`}>
            <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              My Subjects
            </h3>
            <p className={`mt-2 text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {stats.totalSubjects}
            </p>
          </div>
        )}

        <div className={`rounded-xl p-6 shadow-md transition-all hover:shadow-lg ${
          theme === 'dark' ? 'bg-white/5 backdrop-blur-sm border border-white/10' : 'bg-white'
        }`}>
          <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Results Entered
          </h3>
          <p className={`mt-2 text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {stats.totalResults}
          </p>
        </div>

        <div className={`rounded-xl p-6 shadow-md transition-all hover:shadow-lg ${
          theme === 'dark' ? 'bg-white/5 backdrop-blur-sm border border-white/10' : 'bg-white'
        }`}>
          <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Lesson Plans
          </h3>
          <p className={`mt-2 text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {stats.totalLessonPlans}
          </p>
        </div>
      </div>
    </div>
  );
}