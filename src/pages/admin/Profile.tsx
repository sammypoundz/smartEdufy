import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { UserCircleIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function Profile() {
  const { theme } = useTheme();
  const { user } = useAuth();

  // Local state for form fields
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState(user?.role || 'admin');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    // In a real app, call API to update profile
    toast.success('Profile updated successfully!');
    setIsEditing(false);
  };

  const handleCancel = () => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setRole(user?.role || 'admin');
    setIsEditing(false);
  };

  return (
    <div className={`min-h-screen px-4 sm:px-6 lg:px-8 py-8 ${
      theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
    }`}>
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative overflow-hidden rounded-3xl shadow-2xl border ${
            theme === 'dark'
              ? 'bg-gray-900/80 backdrop-blur-md border-white/10'
              : 'bg-white border-gray-200/80'
          }`}
        >
          <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500`} />

          <div className="px-8 pt-8 pb-6 flex items-center gap-4 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-md`}>
              <UserCircleIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                My Profile
              </h2>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Manage your personal information
              </p>
            </div>
          </div>

          <div className="p-8">
            <div className="space-y-6">
              <div>
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditing}
                  className={`mt-1 w-full rounded-2xl border-0 px-5 py-3.5 shadow-sm ring-1 transition-all ${
                    isEditing
                      ? theme === 'dark'
                        ? 'bg-gray-800/80 text-white ring-gray-700 focus:ring-2 focus:ring-blue-500'
                        : 'bg-white text-gray-900 ring-gray-200 focus:ring-2 focus:ring-blue-500'
                      : theme === 'dark'
                        ? 'bg-gray-700/50 text-gray-300 ring-gray-700 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-600 ring-gray-200 cursor-not-allowed'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isEditing}
                  className={`mt-1 w-full rounded-2xl border-0 px-5 py-3.5 shadow-sm ring-1 transition-all ${
                    isEditing
                      ? theme === 'dark'
                        ? 'bg-gray-800/80 text-white ring-gray-700 focus:ring-2 focus:ring-blue-500'
                        : 'bg-white text-gray-900 ring-gray-200 focus:ring-2 focus:ring-blue-500'
                      : theme === 'dark'
                        ? 'bg-gray-700/50 text-gray-300 ring-gray-700 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-600 ring-gray-200 cursor-not-allowed'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Role
                </label>
                <input
                  type="text"
                  value={role}
                  disabled
                  className={`mt-1 w-full rounded-2xl border-0 px-5 py-3.5 shadow-sm ring-1 ${
                    theme === 'dark'
                      ? 'bg-gray-700/50 text-gray-300 ring-gray-700 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-600 ring-gray-200 cursor-not-allowed'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleCancel}
                      className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-medium transition ${
                        theme === 'dark'
                          ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <XMarkIcon className="h-4 w-4" />
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-md hover:shadow-lg transition"
                    >
                      <CheckIcon className="h-4 w-4" />
                      Save
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-md hover:shadow-lg transition"
                  >
                    <PencilIcon className="h-4 w-4" />
                    Edit Profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}