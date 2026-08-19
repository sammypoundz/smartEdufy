import { useState, useEffect } from 'react'; // ✅ removed 'React' import
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Skill {
  id: string;
  name: string;
  description?: string;
  category?: string;
  taughtIn?: string[]; // or maybe an array of subject names/IDs
}

export default function SkillPage() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [skill, setSkill] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSkill = async () => {
      if (!token || !id) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get(`/skills/${id}`, token);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Failed to fetch skill');
        }
        const data = await res.json();
        setSkill(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
        toast.error('Could not load skill details');
      } finally {
        setLoading(false);
      }
    };

    fetchSkill();
  }, [id, token]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Loading skill...</p>
        </div>
      </div>
    );
  }

  if (error || !skill) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
        <div className="text-center">
          <p className={`text-xl mb-4 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
            {error || 'Skill not found'}
          </p>
          <button
            onClick={() => navigate('/admin/skills')} // adjust the route if needed
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
      {theme === 'dark' && (
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `linear-gradient(rgba(59,130,246,0.1) 1px,transparent 1px), linear-gradient(90deg,rgba(59,130,246,0.1) 1px,transparent 1px)`, backgroundSize: '60px 60px' }} />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
        </div>
      )}

      <div className="relative z-10 max-w-4xl mx-auto">
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
          Back
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-2xl shadow-xl ${
            theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/30 backdrop-blur-md border border-white/20'
          }`}
        >
          <h1 className={`text-3xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Skill Details</h1>
          <dl className="space-y-4">
            <div>
              <dt className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Name</dt>
              <dd className={`text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{skill.name}</dd>
            </div>
            {skill.description && (
              <div>
                <dt className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Description</dt>
                <dd className={`text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{skill.description}</dd>
              </div>
            )}
            {skill.category && (
              <div>
                <dt className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Category</dt>
                <dd className={`text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{skill.category}</dd>
              </div>
            )}
            {skill.taughtIn && skill.taughtIn.length > 0 && (
              <div>
                <dt className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Taught In</dt>
                <dd className={`text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{skill.taughtIn.join(', ')}</dd>
              </div>
            )}
          </dl>
        </motion.div>
      </div>
    </div>
  );
}