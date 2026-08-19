import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { BookOpenIcon } from '@heroicons/react/24/outline';

export default function TeacherSubjects() {
  const { token } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await api.get('/teachers/me', token);
        if (res.ok) {
          const data = await res.json();
          setSubjects(data.subjects || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, [token]);

  if (loading) return <div className="p-4">Loading your subjects...</div>;

  if (subjects.length === 0) {
    return <div className="p-4">You are not assigned to any subject.</div>;
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">My Subjects</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((subject) => (
          <Link
            key={subject.id}
            to={`/teacher/subject/${subject.id}`}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <BookOpenIcon className="w-8 h-8 text-purple-500" />
              <div>
                <p className="font-semibold">{subject.name}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}