import { motion } from 'framer-motion';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const numbers: number[] = [45, 8, 35, 19, 14, 45];

export default function NeedingAttention() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
    >
      <div className="flex items-center gap-2 mb-4">
        <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
        <h3 className="text-lg font-semibold text-gray-800">Needing Attention</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {numbers.map((num, idx) => (
          <motion.div
            key={idx}
            whileHover={{ scale: 1.05, backgroundColor: '#fef3c7' }}
            className="bg-amber-50 p-4 rounded-xl text-center cursor-pointer transition-colors"
          >
            <span className="text-2xl font-bold text-amber-700">{num}</span>
          </motion.div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center">Click any tile to see details</p>
    </motion.div>
  );
}