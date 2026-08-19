import { motion } from 'framer-motion';
import { UserCircleIcon } from '@heroicons/react/24/outline';

interface Student {
  name: string;
  score: number;
  total: number;
  percentage: number;
}

const students: Student[] = [
  { name: 'Sabine Klein', score: 33, total: 36, percentage: 92 },
  { name: 'Dante Podenzana', score: 31, total: 36, percentage: 86 },
  { name: 'Susan Chan', score: 27, total: 36, percentage: 75 },
];

export default function StudentTable() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Students Proficiency</h3>
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View all →</button>
      </div>

      <div className="space-y-3">
        {students.map((student, idx) => (
          <motion.div
            key={student.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + idx * 0.1 }}
            className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <div className="flex items-center gap-3">
              <UserCircleIcon className="w-10 h-10 text-gray-400" />
              <div>
                <p className="font-medium text-gray-800">{student.name}</p>
                <p className="text-sm text-gray-500">
                  {student.score} / {student.total} · {student.percentage}%
                </p>
              </div>
            </div>
            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${student.percentage}%` }}
                transition={{ delay: 0.6 + idx * 0.1, duration: 0.8 }}
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
              />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400 flex justify-between">
        <span>Full Name ▼</span>
        <span>Completion</span>
      </div>
    </motion.div>
  );
}