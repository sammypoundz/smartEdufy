import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import {
  BookOpenIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

export default function TeacherSubjects() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const isDark = theme === 'dark';

  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await api.get('/teachers/me', token);
        if (res.ok) {
          const data = await res.json();
          // The API returns assignments as subjectArms[] (subject + arm per row).
          // Deduplicate by subject id (a teacher may teach the same subject in multiple arms).
          const assignments: any[] = data.subjectArms || [];
          const unique = new Map<string, any>();
          for (const sa of assignments) {
            if (sa.subject && !unique.has(sa.subject.id)) {
              unique.set(sa.subject.id, {
                ...sa.subject,
                arms: assignments
                  .filter((a: any) => a.subject?.id === sa.subject.id && a.arm)
                  .map((a: any) => a.arm),
              });
            }
          }
          setSubjects(Array.from(unique.values()));
        } else {
          setError('Failed to load your subjects. Please try again.');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load your subjects. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, [token]);

  if (loading) {
    return (
      <div className={`min-h-[60vh] flex items-center justify-center transition-colors duration-300 ${
        isDark ? 'text-gray-300' : 'text-gray-700'
      }`}>
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading your subjects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className={`max-w-md mx-auto mt-10 p-5 rounded-xl border text-center ${
          isDark ? 'bg-[#111827]/80 border-gray-800 text-red-400' : 'bg-white border-red-200 text-red-600'
        }`}>
          <ExclamationTriangleIcon className="w-8 h-8 mx-auto mb-2" />
          {error}
        </div>
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="p-6">
        <div className={`max-w-md mx-auto mt-10 p-8 rounded-2xl border text-center ${
          isDark ? 'bg-[#111827]/80 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <BookOpenIcon className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
          <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            You are not assigned to any subject.
          </p>
          <p className={`text-sm mt-1 text-gray-500`}>
            Contact your administrator to get subjects assigned to you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <h2 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        My Subjects
      </h2>
      <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        Subjects assigned to you across all class arms
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((subject, index) => (
          <motion.div
            key={subject.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
          >
            <Link
              to={`/teacher/subject/${subject.id}`}
              state={{ armId: subject.arms?.[0]?.id || null }}
              className={`block p-5 rounded-2xl shadow-xl transition-all duration-300 hover:-translate-y-0.5 ${
                isDark
                  ? 'bg-[#111827]/80 border border-gray-800 backdrop-blur-xl hover:border-blue-800'
                  : 'bg-white border border-gray-200 shadow-blue-100/50 hover:shadow-blue-200/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                  <BookOpenIcon className={`w-7 h-7 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <div className="min-w-0">
                  <p className={`font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {subject.name}
                  </p>
                  {subject.arms?.length > 0 && (
                    <p className={`text-sm flex items-center gap-1 truncate ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      <AcademicCapIcon className="w-4 h-4 shrink-0" />
                      {subject.arms
                        .map((a: any) => `${a.class?.name ?? ''}${a.class?.name ? ' ' : ''}${a.letter}`)
                        .join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
