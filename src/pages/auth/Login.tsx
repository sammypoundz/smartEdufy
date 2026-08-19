import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success && result.user) {
      toast.success('Login successful! Redirecting...');
      setTimeout(() => {
        navigate(`/${result.user!.role!.toLowerCase()}`);
      }, 1000);
    } else {
      toast.error(result.error || 'Login failed');
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 transition-colors duration-300 ${
        theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
      }`}
    >
      {/* Background grid and gradients (matching dashboard) */}
      {theme === 'dark' ? (
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
      ) : (
        <div className="fixed inset-0 z-0">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-200/20 via-transparent to-purple-200/20" />
        </div>
      )}

      {/* Card container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`relative z-10 w-full max-w-md rounded-2xl p-8 shadow-xl backdrop-blur-xl transition-all duration-300 ${
          theme === 'dark'
            ? 'bg-white/5 border border-white/10'
            : 'bg-white/30 border border-white/20'
        }`}
      >
        <div className="text-center mb-8">
          <h2
            className={`text-3xl font-bold ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent'
                : 'bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent'
            }`}
          >
            SmartEdufy
          </h2>
          <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Sign in to your account
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="email"
              className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2 ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-400'
              }`}
              placeholder="admin@school.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2 ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-400'
              }`}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Demo credentials:
          </div>
          <div className={`text-xs mt-1 space-y-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            <p>admin@school.com / admin123</p>
            <p>teacher@school.com / teacher123</p>
            <p>parent@school.com / parent123</p>
            <p>student@school.com / student123</p>
          </div>
        </div>

        {/* Decorative glow */}
        <div
          className={`absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl transition-all ${
            theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-200/30'
          }`}
        />
        <div
          className={`absolute -bottom-20 -left-20 w-64 h-64 rounded-full blur-3xl transition-all ${
            theme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-200/30'
          }`}
        />
      </motion.div>
    </div>
  );
}