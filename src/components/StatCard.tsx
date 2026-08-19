import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface StatCardProps {
  icon: ReactNode;
  title: string;
  value: string;
  trend?: number;
  subtitle?: string;
  color?: 'blue' | 'green' | 'purple';
}

const colorGlow = {
  blue: 'from-blue-400/20 to-blue-600/20 group-hover:from-blue-400/30 group-hover:to-blue-600/30',
  green: 'from-emerald-400/20 to-emerald-600/20 group-hover:from-emerald-400/30 group-hover:to-emerald-600/30',
  purple: 'from-purple-400/20 to-purple-600/20 group-hover:from-purple-400/30 group-hover:to-purple-600/30',
};

export default function StatCard({ icon, title, value, trend, subtitle, color = 'blue' }: StatCardProps) {
  const { theme } = useTheme();

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className={`group relative overflow-hidden rounded-2xl p-6 shadow-xl transition-all duration-300 ${
        theme === 'dark'
          ? 'bg-white/5 backdrop-blur-xl border border-white/10'
          : 'bg-white/30 backdrop-blur-md border border-white/20'
      }`}
    >
      {/* Animated gradient background on hover */}
      {theme === 'dark' ? (
        <div className={`absolute inset-0 bg-gradient-to-br ${colorGlow[color]} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-blue-100/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      )}

      {/* Content */}
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {title}
          </p>
          <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {value}
          </p>
          {subtitle && <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{subtitle}</p>}
          {trend !== undefined && (
            <p className={`text-sm mt-2 ${trend > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last month
            </p>
          )}
        </div>
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
          {icon}
        </div>
      </div>

      {/* Decorative glowing dot */}
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl transition-all group-hover:scale-110 ${
        theme === 'dark' ? 'bg-blue-500/20 group-hover:bg-blue-500/30' : 'bg-blue-200/30 group-hover:bg-blue-300/40'
      }`} />
    </motion.div>
  );
}