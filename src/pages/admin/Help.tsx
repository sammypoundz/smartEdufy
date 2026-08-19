import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { QuestionMarkCircleIcon, BookOpenIcon, ChatBubbleLeftIcon} from '@heroicons/react/24/outline';

// Note: Need to import UsersIcon, ChartBarIcon, BanknotesIcon at the top
import { UsersIcon, ChartBarIcon, BanknotesIcon } from '@heroicons/react/24/outline';

const helpTopics = [
  { title: 'Getting Started', description: 'Learn the basics of SmartEdufy', icon: BookOpenIcon },
  { title: 'User Management', description: 'How to add and manage users', icon: UsersIcon },
  { title: 'Result Compilation', description: 'Step-by-step guide to compiling results', icon: ChartBarIcon },
  { title: 'Fees & Payments', description: 'Manage fees and track payments', icon: BanknotesIcon },
  { title: 'FAQs', description: 'Frequently asked questions', icon: QuestionMarkCircleIcon },
  { title: 'Contact Support', description: 'Get help from our team', icon: ChatBubbleLeftIcon },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 },
};

export default function AdminHelp() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
    }`}>
      {theme === 'dark' && (
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `linear-gradient(rgba(59,130,246,0.1) 1px,transparent 1px), linear-gradient(90deg,rgba(59,130,246,0.1) 1px,transparent 1px)`, backgroundSize: '60px 60px' }} />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
        </div>
      )}
      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h2 className={`text-2xl font-bold ${
            theme === 'dark' ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent' : 'bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent'
          }`}>Help & Documentation</h2>
          <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Find answers and get support.</p>
        </motion.div>

        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {helpTopics.map((topic) => (
            <motion.div key={topic.title} variants={item} className={`group relative overflow-hidden rounded-2xl p-6 shadow-xl cursor-pointer transition-all duration-300 ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10' : 'bg-white/30 backdrop-blur-md border border-white/20 hover:bg-white/40'}`}>
              <topic.icon className={`h-8 w-8 mb-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
              <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{topic.title}</h3>
              <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{topic.description}</p>
              <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl transition-all group-hover:scale-110 ${theme === 'dark' ? 'bg-blue-500/20 group-hover:bg-blue-500/30' : 'bg-blue-200/30 group-hover:bg-blue-300/40'}`} />
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={item} initial="hidden" animate="show" className="mt-8">
          <div className={`rounded-2xl p-6 shadow-xl ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/30 backdrop-blur-md border border-white/20'}`}>
            <h3 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Need more help?</h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Contact our support team at support@smartedufy.com or call +234 800 123 4567.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
