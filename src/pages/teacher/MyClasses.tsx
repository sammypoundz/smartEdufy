import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getMyAssignments } from '../../services/armApi';
import { getErrorMessage } from '../../hooks/queryHelpers';
import { useTheme } from '../../contexts/ThemeContext';
import {
  AcademicCapIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

export default function MyClasses() {
  const { theme } = useTheme();
  const { data: assignments = [], isLoading: loading, error } = useQuery({
    queryKey: ['my-assignments'],
    queryFn: getMyAssignments,
  });
  const errText = error ? 'Failed to load your class assignments.' : null;

  const cardCls = `p-5 rounded-2xl shadow-lg border transition-all hover:shadow-xl ${
    theme === 'dark'
      ? 'bg-white/5 backdrop-blur-xl border-white/10'
      : 'bg-white/40 backdrop-blur-md border-white/20'
  }`;
  const btnCls = `inline-flex items-center px-3 py-1.5 text-sm rounded-lg border transition-colors ${
    theme === 'dark'
      ? 'border-white/20 text-gray-200 hover:bg-white/10'
      : 'border-gray-300 text-gray-700 hover:bg-gray-100'
  }`;

  if (loading) {
    return <p className="text-gray-500">Loading your classes…</p>;
  }

  if (errText) {
    return (
      <div className="p-5 rounded-xl border border-red-300 bg-red-50 text-red-700 flex items-center gap-3">
        <ExclamationTriangleIcon className="h-6 w-6" />
        <p>{getErrorMessage(error, 'Failed to load your class assignments.')}</p>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="p-5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700">
        <p className="font-semibold">No classes assigned</p>
        <p className="text-sm mt-1">
          You have not been assigned to any class yet. Please contact the school administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Classes</h1>
        <p className="text-sm text-gray-500">
          Preview and manage the classes you are assigned to.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {assignments.map((a) => (
          <div key={a.armId} className={cardCls}>
            <div>
              <div className="flex items-center gap-2">
                <AcademicCapIcon className="h-5 w-5 text-blue-500" />
                <h2 className="text-lg font-semibold">
                  {a.className} {a.armName}
                </h2>
              </div>
              {a.isFormTeacher && (
                <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
                  Form Teacher
                </span>
              )}
            </div>

            {a.subjectNames.length > 0 && (
              <div className="text-sm text-gray-500">
                <ClipboardDocumentListIcon className="inline h-4 w-4 mr-1" />
                Subjects: {a.subjectNames.join(', ')}
              </div>
            )}

            <div className="mt-auto flex flex-wrap gap-2">
              <Link to={`/teacher/class/${a.classId}/arm/${a.armId}`} className={btnCls}>
                <UsersIcon className="h-4 w-4 mr-1" /> Open Class
              </Link>
              <Link to={`/teacher/class/${a.armId}/results`} className={btnCls}>
                Results
              </Link>
              <Link to={`/teacher/class/${a.armId}/broadsheet`} className={btnCls}>
                Broadsheet
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
