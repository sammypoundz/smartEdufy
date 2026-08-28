import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { formatArm } from '../../utils/arm';
import { AcademicCapIcon } from '@heroicons/react/24/outline';

export default function TeacherClasses() {
  const { token } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get('/teachers/me', token);
        if (res.ok) {
          const data = await res.json();
          setClasses(data.classArms || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, [token]);

  if (loading) return <div className="p-4">Loading your classes...</div>;

  if (classes.length === 0) {
    return <div className="p-4">You are not assigned to any class.</div>;
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">My Classes</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((arm: any) => (
          <Link
            key={arm.id}
            to={`/teacher/class/${arm.class.id}/arm/${arm.id}`}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <AcademicCapIcon className="w-8 h-8 text-blue-500" />
              <div>
                <p className="font-semibold">{arm.class.name}</p>
                <p className="text-sm text-gray-500">{formatArm(arm)}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}