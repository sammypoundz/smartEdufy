import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { BellIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { sampleNotifications, type Notification } from '../../data/notifications';

export type { Notification };

export default function Notifications() {
  const { theme } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>(sampleNotifications);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className={`min-h-screen px-4 sm:px-6 lg:px-8 py-8 ${
      theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
    }`}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <BellIcon className={`h-8 w-8 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            <h1 className={`text-2xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Notifications
              {unreadCount > 0 && (
                <span className={`ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full ${
                  theme === 'dark'
                    ? 'bg-blue-500 text-white'
                    : 'bg-blue-600 text-white'
                }`}>
                  {unreadCount} new
                </span>
              )}
            </h1>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className={`inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium transition ${
                theme === 'dark'
                  ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-800/40'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              <CheckCircleIcon className="h-4 w-4" />
              Mark all as read
            </button>
          )}
        </div>

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className={`text-center py-12 rounded-2xl ${
              theme === 'dark' ? 'bg-white/5' : 'bg-white/30'
            } backdrop-blur-md`}>
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                No notifications yet.
              </p>
            </div>
          ) : (
            notifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`group relative rounded-2xl p-5 transition-all duration-200 ${
                  notification.read
                    ? theme === 'dark'
                      ? 'bg-white/5 border border-white/5'
                      : 'bg-white/40 border border-white/20'
                    : theme === 'dark'
                      ? 'bg-white/10 border border-blue-500/20 shadow-lg shadow-blue-500/5'
                      : 'bg-white/60 border border-blue-200/50 shadow-lg shadow-blue-500/5'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className={`text-sm font-semibold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <span className={`inline-block w-2 h-2 rounded-full ${
                          theme === 'dark' ? 'bg-blue-400' : 'bg-blue-600'
                        }`} />
                      )}
                    </div>
                    <p className={`mt-1 text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {notification.message}
                    </p>
                    <p className={`mt-2 text-xs ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      {new Date(notification.date).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className={`p-1 rounded-lg transition ${
                          theme === 'dark'
                            ? 'text-blue-400 hover:bg-white/10'
                            : 'text-blue-600 hover:bg-blue-50'
                        }`}
                        title="Mark as read"
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className={`p-1 rounded-lg transition ${
                        theme === 'dark'
                          ? 'text-gray-500 hover:bg-white/10 hover:text-gray-300'
                          : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                      }`}
                      title="Delete"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}