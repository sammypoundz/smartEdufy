import { motion } from 'framer-motion';

interface Objective {
  number: number;
  weight: string;
  avg: string;
  label: string;
}

const objectives: Objective[] = [
  { number: 5, weight: '20%', avg: '23%', label: 'of class grade avg' },
  { number: 10, weight: '40%', avg: '50%', label: 'of class grade avg' },
  { number: 5, weight: '20%', avg: '15%', label: 'of class grade avg' },
];

export default function LearningObjectives() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Learning Objectives</h3>
        <span className="text-sm px-3 py-1 bg-gray-100 text-gray-600 rounded-full">All Strands</span>
      </div>

      <div className="space-y-4">
        {objectives.map((obj, idx) => (
          <motion.div
            key={idx}
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center font-bold">
              {obj.number}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                {obj.weight} {obj.label}
              </p>
              <p className="text-xs text-gray-500">Class avg: <span className="font-semibold text-gray-800">{obj.avg}</span></p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}