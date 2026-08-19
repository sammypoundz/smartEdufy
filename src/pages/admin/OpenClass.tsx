import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

// Mock data for a class's students
interface Student {
  id: number;
  name: string;
  gender: 'male' | 'female';
  present: boolean;
}

const mockStudents: Student[] = [
  { id: 1, name: 'John Doe', gender: 'male', present: true },
  { id: 2, name: 'Jane Smith', gender: 'female', present: false },
  { id: 3, name: 'Samuel Johnson', gender: 'male', present: true },
  { id: 4, name: 'Emily Davis', gender: 'female', present: true },
  { id: 5, name: 'Michael Brown', gender: 'male', present: false },
];

export default function OpenClass() {
  const { theme } = useTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [classData, setClassData] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    // Simulate fetching class details and students
    // In a real app, you'd fetch from an API using the id
    const mockClass = {
      id: Number(id),
      name: 'Primary 3',
      teacher: 'Mrs. Okafor',
      arms: ['A', 'B'],
      students: 32,
    };
    setClassData(mockClass);
    setStudents(mockStudents);
  }, [id]);

  if (!classData) {
    return <div>Loading...</div>;
  }

  // Calculate stats
  const totalStudents = students.length;
  const presentCount = students.filter(s => s.present).length;
  const absentCount = totalStudents - presentCount;
  const maleCount = students.filter(s => s.gender === 'male').length;
  const femaleCount = students.filter(s => s.gender === 'female').length;

  return (
    <div
      className={`min-h-screen px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-300 ${
        theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
      }`}
    >
      {/* Dark mode grid background */}
      {theme === 'dark' && (
        <div className="fixed inset-0 z-0">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(-1)}
          className={`mb-6 inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            theme === 'dark'
              ? 'text-gray-300 hover:text-white hover:bg-white/10'
              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200/50'
          }`}
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Classes
        </motion.button>

        {/* Class header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1
            className={`text-3xl font-bold ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent'
                : 'bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent'
            }`}
          >
            {classData.name} {classData.arms.join(', ')}
          </h1>
          <p className={`mt-2 text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Class Teacher: {classData.teacher}
          </p>
        </motion.div>

        {/* Counter cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
        >
          <div className={`p-4 rounded-xl shadow-md ${theme === 'dark' ? 'bg-white/5 backdrop-blur-sm border border-white/10' : 'bg-white/50 backdrop-blur-sm border border-gray-200'}`}>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Students</p>
            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{totalStudents}</p>
          </div>
          <div className={`p-4 rounded-xl shadow-md ${theme === 'dark' ? 'bg-white/5 backdrop-blur-sm border border-white/10' : 'bg-white/50 backdrop-blur-sm border border-gray-200'}`}>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Present</p>
            <p className={`text-2xl font-bold text-green-600`}>{presentCount}</p>
          </div>
          <div className={`p-4 rounded-xl shadow-md ${theme === 'dark' ? 'bg-white/5 backdrop-blur-sm border border-white/10' : 'bg-white/50 backdrop-blur-sm border border-gray-200'}`}>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Absent</p>
            <p className={`text-2xl font-bold text-red-600`}>{absentCount}</p>
          </div>
          <div className={`p-4 rounded-xl shadow-md ${theme === 'dark' ? 'bg-white/5 backdrop-blur-sm border border-white/10' : 'bg-white/50 backdrop-blur-sm border border-gray-200'}`}>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Male / Female</p>
            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{maleCount} / {femaleCount}</p>
          </div>
        </motion.div>

        {/* Student list and results broadsheet placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student list */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={`lg:col-span-2 p-6 rounded-2xl shadow-xl ${
              theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/30 backdrop-blur-md border border-white/20'
            }`}
          >
            <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Student List</h2>
            <div className="space-y-2">
              {students.map((student) => (
                <div
                  key={student.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    theme === 'dark' ? 'bg-white/10 hover:bg-white/15' : 'bg-white/50 hover:bg-white/70'
                  } transition-colors`}
                >
                  <div className="flex items-center space-x-3">
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                      {student.name}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      student.gender === 'male'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300'
                    }`}>
                      {student.gender}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    student.present
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  }`}>
                    {student.present ? 'Present' : 'Absent'}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Results broadsheet placeholder */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className={`p-6 rounded-2xl shadow-xl ${
              theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/30 backdrop-blur-md border border-white/20'
            }`}
          >
            <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Results Broadsheet</h2>
            <div className="text-center py-12 text-gray-500">
              <p>Term results will appear here.</p>
              <p className="text-sm mt-2">(Placeholder – integrate your actual results component)</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}