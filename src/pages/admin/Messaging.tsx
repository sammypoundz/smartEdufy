import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { unwrap, getErrorMessage } from '../../hooks/queryHelpers';
import toast from 'react-hot-toast';
import api from '../../services/api';
import {
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  UsersIcon,
  UserGroupIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  CheckCircleIcon,
  UserIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  ShieldCheckIcon,
  CalendarIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

// ---------- Constants ----------
const USER_GROUPS = [
  { id: 'all', label: 'All Users', icon: UsersIcon },
  { id: 'admin', label: 'Admins', icon: ShieldCheckIcon },
  { id: 'teacher', label: 'Teachers', icon: AcademicCapIcon },
  { id: 'parent', label: 'Parents', icon: UserGroupIcon },
  { id: 'student', label: 'Students', icon: UserIcon },
  { id: 'staff', label: 'All Staff', icon: BriefcaseIcon },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 },
};

// ---------- Types ----------
interface Message {
  id: string;
  sender: { id: string; name: string; email: string };
  subject: string | null;
  content: string;
  type: 'email' | 'sms';
  recipients: { type: 'group' | 'user'; id: string; name?: string }[];
  sentAt: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  phone?: string | null;
}

export default function AdminMessaging() {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'drafts'>('inbox');

  // Server state via TanStack Query
  const [page, setPage] = useState(1);

  // Compose state
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [usersQueryEnabled, setUsersQueryEnabled] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [deliveryMethod, setDeliveryMethod] = useState<'email' | 'sms'>('email');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Message detail state
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // ---------- Messages query ----------
  const messagesQuery = useQuery({
    queryKey: ['messages', activeTab, page, search],
    queryFn: async () => {
      const data = await unwrap<{
        data?: Message[];
        totalPages?: number;
      }>(
        api.get('/messages', {
          params: {
            type: activeTab === 'drafts' ? 'inbox' : activeTab,
            page,
            limit: 20,
            search: search || undefined,
          },
        }),
      );
      return { messages: data.data || [], totalPages: data.totalPages || 1 };
    },
  });

  const messages = messagesQuery.data?.messages ?? [];
  const totalPages = messagesQuery.data?.totalPages ?? 1;
  const loading = messagesQuery.isLoading;
  const error = messagesQuery.isError ? getErrorMessage(messagesQuery.error, 'Failed to load messages') : null;

  // ---------- Users query (fetched lazily when compose opens) ----------
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users');
      const raw = response.data;
      const users: any[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
          ? raw.data
          : [];
      // Normalize to User interface
      return users.map(
        (u: any): User => ({
          id: u.id || u._id,
          name: u.name || u.fullName || null,
          email: u.email,
          role: u.role || 'USER',
          phone: u.phone || null,
        }),
      );
    },
    enabled: usersQueryEnabled,
    staleTime: 5 * 60 * 1000,
  });

  const allUsers = usersQuery.data ?? [];
  const loadingUsers = usersQuery.isFetching;

  // ---------- Send broadcast mutation ----------
  const broadcastMutation = useMutation({
    mutationFn: (payload: {
      groups: string[];
      userIds: string[];
      type: 'email' | 'sms';
      subject: string;
      message: string;
    }) => unwrap<{ totalRecipients: number }>(api.post('/messages/broadcast', payload)),
    onSuccess: (result) => {
      toast.success(
        `Message sent via ${deliveryMethod.toUpperCase()} to ${result.totalRecipients} recipient(s)`,
      );
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setIsComposeOpen(false);
      // Reset form
      setSelectedGroups([]);
      setSelectedUsers([]);
      setSubject('');
      setMessage('');
      setUserSearch('');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to send message')),
  });

  const handleSend = () => {
    if (!subject.trim() || !message.trim()) {
      toast.error('Please fill in subject and message');
      return;
    }
    if (selectedGroups.length === 0 && selectedUsers.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }
    broadcastMutation.mutate({
      groups: selectedGroups,
      userIds: selectedUsers,
      type: deliveryMethod,
      subject: subject.trim(),
      message: message.trim(),
    });
  };

  const sending = broadcastMutation.isPending;

  // ---------- View message detail ----------
  const openMessageDetail = async (msg: Message) => {
    setSelectedMessage(msg);
    setShowDetailModal(true);
  };

  // ---------- Helpers for badges ----------
  const getTypeBadgeClasses = (type: 'email' | 'sms') => {
    const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium';
    if (theme === 'dark') {
      return type === 'email'
        ? `${base} bg-blue-900/40 text-blue-300`
        : `${base} bg-green-900/40 text-green-300`;
    }
    return type === 'email'
      ? `${base} bg-blue-600 text-white`
      : `${base} bg-green-600 text-white`;
  };

  const getDeliveryButtonClasses = (method: 'email' | 'sms') => {
    const isSelected = deliveryMethod === method;
    const base = 'flex items-center gap-2 px-4 py-2 rounded-lg border transition-all';
    if (theme === 'dark') {
      if (isSelected) {
        return `${base} border-blue-500 bg-blue-900/30 text-blue-300 dark:border-blue-700`;
      }
      return `${base} border-gray-700 text-gray-400 hover:border-gray-600`;
    }
    if (isSelected) {
      return method === 'email'
        ? `${base} border-blue-700 bg-blue-600 text-white`
        : `${base} border-green-700 bg-green-600 text-white`;
    }
    return `${base} border-gray-300 bg-gray-200 text-gray-700 hover:bg-gray-300`;
  };

  // ---------- Filter users ----------
  const filteredUsers = useMemo(() => {
    if (!userSearch) return allUsers;
    const s = userSearch.toLowerCase();
    return allUsers.filter(
      user =>
        user.name?.toLowerCase().includes(s) ||
        user.email.toLowerCase().includes(s)
    );
  }, [allUsers, userSearch]);

  // ---------- Toggle group/user selection ----------
  const toggleGroup = (groupId: string) => {
    if (groupId === 'all') {
      if (selectedGroups.includes('all')) {
        setSelectedGroups([]);
      } else {
        setSelectedGroups(USER_GROUPS.map(g => g.id));
      }
      return;
    }
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const totalRecipients = selectedGroups.length + selectedUsers.length;

  // ---------- Render ----------
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
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="sm:flex sm:items-center sm:justify-between mb-8">
          <div>
            <h2 className={`text-2xl font-bold ${
              theme === 'dark' ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent' : 'bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent'
            }`}>Messaging</h2>
            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Send and receive messages.</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setUsersQueryEnabled(true);
              setIsComposeOpen(true);
            }}
            className="mt-4 sm:mt-0 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg hover:from-blue-600 hover:to-indigo-700"
          >
            <PaperAirplaneIcon className="h-5 w-5 mr-2" /> Compose
          </motion.button>
        </motion.div>

        {/* Tabs & Search */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
            {['inbox', 'sent', 'drafts'].map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab as any); setPage(1); }}
                className={`py-2 px-4 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className={`relative flex-1 min-w-[200px] rounded-xl shadow-xl ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/30 backdrop-blur-md border border-white/20'}`}>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <MagnifyingGlassIcon className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className={`block w-full rounded-xl border-0 bg-transparent pl-12 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
              placeholder="Search messages..."
            />
          </div>
        </div>

        {/* Message list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className={`text-center py-12 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
            {error}
            <button
              onClick={() => messagesQuery.refetch()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
            >
              Retry
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            No messages found.
          </div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                variants={item}
                onClick={() => openMessageDetail(msg)}
                className={`group relative overflow-hidden rounded-2xl p-6 shadow-xl transition-all duration-300 cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10'
                    : 'bg-white/30 backdrop-blur-md border border-white/20 hover:bg-white/40'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {msg.subject || '(No subject)'}
                      </h3>
                      <span className={getTypeBadgeClasses(msg.type)}>
                        {msg.type === 'email' ? <EnvelopeIcon className="h-3 w-3" /> : <DevicePhoneMobileIcon className="h-3 w-3" />}
                        {msg.type.toUpperCase()}
                      </span>
                    </div>
                    <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      From: {msg.sender?.name || msg.sender?.email || 'Unknown'} • {new Date(msg.sentAt).toLocaleDateString()}
                    </p>
                    <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {msg.content.length > 100 ? msg.content.substring(0, 100) + '...' : msg.content}
                    </p>
                  </div>
                  <EyeIcon className={`h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
                </div>
                <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl transition-all group-hover:scale-110 ${
                  theme === 'dark' ? 'bg-blue-500/20 group-hover:bg-blue-500/30' : 'bg-blue-200/30 group-hover:bg-blue-300/40'
                }`} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={`flex justify-center mt-6 gap-2`}>
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className={`px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 ${
                theme === 'dark'
                  ? 'bg-white/5 text-gray-300 hover:bg-white/10 disabled:bg-white/5'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:bg-gray-100'
              }`}
            >
              Previous
            </button>
            <span className={`px-4 py-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className={`px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 ${
                theme === 'dark'
                  ? 'bg-white/5 text-gray-300 hover:bg-white/10 disabled:bg-white/5'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:bg-gray-100'
              }`}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      <AnimatePresence>
        {isComposeOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsComposeOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col ${
                theme === 'dark' ? 'bg-gray-900 border border-white/10' : 'bg-white/90 backdrop-blur-xl border border-gray-200/60'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`flex justify-between items-center p-6 border-b ${
                theme === 'dark' ? 'border-white/10' : 'border-gray-200'
              }`}>
                <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Compose Message</h3>
                <button
                  onClick={() => setIsComposeOpen(false)}
                  className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {/* Recipients */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Recipients
                  </label>

                  {/* Groups */}
                  <div className="mb-4">
                    <p className={`text-xs uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      Groups
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {USER_GROUPS.map((group) => {
                        const isSelected = selectedGroups.includes(group.id);
                        const Icon = group.icon;
                        return (
                          <button
                            key={group.id}
                            onClick={() => toggleGroup(group.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-md'
                                : theme === 'dark'
                                ? 'bg-white/10 text-gray-300 hover:bg-white/20'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {group.label}
                            {isSelected && <CheckCircleIcon className="h-3.5 w-3.5 ml-0.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Individual Users */}
                  <div>
                    <p className={`text-xs uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      Individual Users
                    </p>
                    <div className={`relative rounded-lg shadow-sm mb-3 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-300'}`}>
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <MagnifyingGlassIcon className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                      </div>
                      <input
                        type="text"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className={`block w-full rounded-lg border-0 bg-transparent pl-9 pr-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 ${
                          theme === 'dark' ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
                        }`}
                        placeholder="Search users..."
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                      {loadingUsers ? (
                        <div className="text-xs text-gray-400">Loading users...</div>
                      ) : filteredUsers.length === 0 ? (
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>No users found</p>
                      ) : (
                        filteredUsers.map((user) => {
                          const isSelected = selectedUsers.includes(user.id);
                          return (
                            <button
                              key={user.id}
                              onClick={() => toggleUser(user.id)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                isSelected
                                  ? 'bg-blue-600 text-white shadow-md'
                                  : theme === 'dark'
                                  ? 'bg-white/10 text-gray-300 hover:bg-white/20'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              <UserIcon className="h-3.5 w-3.5" />
                              {user.name || user.email}
                              {isSelected && <CheckCircleIcon className="h-3.5 w-3.5 ml-0.5" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {totalRecipients > 0 && (
                    <p className={`mt-3 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {totalRecipients} recipient{totalRecipients > 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>

                {/* Delivery Method */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Delivery Method
                  </label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setDeliveryMethod('email')}
                      className={getDeliveryButtonClasses('email')}
                    >
                      <EnvelopeIcon className="h-5 w-5" />
                      Email
                    </button>
                    <button
                      onClick={() => setDeliveryMethod('sms')}
                      className={getDeliveryButtonClasses('sms')}
                    >
                      <DevicePhoneMobileIcon className="h-5 w-5" />
                      SMS
                    </button>
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className={`w-full rounded-lg border-0 px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 ${
                      theme === 'dark'
                        ? 'bg-gray-800 text-white border border-gray-700'
                        : 'bg-white text-gray-900 border border-gray-300'
                    }`}
                    placeholder="Message subject"
                  />
                </div>

                {/* Message Body */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Message *
                  </label>
                  <textarea
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className={`w-full rounded-lg border-0 px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 ${
                      theme === 'dark'
                        ? 'bg-gray-800 text-white border border-gray-700'
                        : 'bg-white text-gray-900 border border-gray-300'
                    }`}
                    placeholder="Write your message here..."
                  />
                </div>
              </div>

              {/* Footer */}
              <div className={`px-6 py-4 border-t flex justify-end gap-3 ${
                theme === 'dark' ? 'border-white/10' : 'border-gray-200'
              }`}>
                <button
                  onClick={() => setIsComposeOpen(false)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {sending ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <PaperAirplaneIcon className="h-4 w-4" />
                  )}
                  {sending ? 'Sending...' : `Send via ${deliveryMethod.toUpperCase()}`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col ${
                theme === 'dark' ? 'bg-gray-900 border border-white/10' : 'bg-white/90 backdrop-blur-xl border border-gray-200/60'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`flex justify-between items-center p-6 border-b ${
                theme === 'dark' ? 'border-white/10' : 'border-gray-200'
              }`}>
                <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {selectedMessage.subject || '(No subject)'}
                </h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className={`flex items-center gap-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    <UserIcon className="h-4 w-4" />
                    <span>From: <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {selectedMessage.sender?.name || selectedMessage.sender?.email || 'Unknown'}
                    </span></span>
                  </div>
                  <div className={`flex items-center gap-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    <CalendarIcon className="h-4 w-4" />
                    <span>{new Date(selectedMessage.sentAt).toLocaleString()}</span>
                  </div>
                  <span className={getTypeBadgeClasses(selectedMessage.type)}>
                    {selectedMessage.type === 'email' ? <EnvelopeIcon className="h-3 w-3" /> : <DevicePhoneMobileIcon className="h-3 w-3" />}
                    {selectedMessage.type.toUpperCase()}
                  </span>
                </div>

                {/* Recipients */}
                <div>
                  <p className={`text-xs uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                    Delivered To
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedMessage.recipients.map((recipient, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                          theme === 'dark'
                            ? 'bg-white/10 text-gray-300'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        <UsersIcon className="h-3.5 w-3.5" />
                        {recipient.name || recipient.id}
                      </span>
                    ))}
                  </div>
                </div>

                <div className={`mt-4 p-4 rounded-lg ${
                  theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'
                }`}>
                  <p className={`whitespace-pre-wrap text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                    {selectedMessage.content}
                  </p>
                </div>
              </div>

              <div className={`px-6 py-4 border-t flex justify-end ${
                theme === 'dark' ? 'border-white/10' : 'border-gray-200'
              }`}>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}