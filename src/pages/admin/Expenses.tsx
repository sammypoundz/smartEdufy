import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { getErrorMessage, unwrap } from '../../hooks/queryHelpers';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import api from '../../services/api';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  DocumentTextIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

// ---------- Interfaces ----------
interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Budget {
  id: string;
  category: string;
  amount: number;
  monthYear: string;
}

const CATEGORIES = [
  'Administrative',
  'Utilities',
  'Staff Development',
  'Maintenance',
  'Teaching Materials',
  'Technology',
  'Events',
  'Transport',
  'Other',
];

const toYMD = (dateInput: string | Date): string => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

const getCurrentYearMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export default function AdminExpensesAndBudgets() {
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  // ---------- Data Fetching ----------
  const {
    data: expensesData,
    isLoading: expensesLoading,
    error: expensesError,
    refetch: refetchExpenses,
  } = useQuery<Expense[]>({
    queryKey: ['expenses'],
    queryFn: async () => {
      const data = await unwrap<Expense[]>(api.get('/expenses'));
      const list = Array.isArray(data) ? data : [];
      return list.map((exp) => ({
        ...exp,
        date: exp.date ? toYMD(exp.date) : '',
      }));
    },
  });

  const {
    data: budgetsData,
    isLoading: budgetsLoading,
    error: budgetsError,
    refetch: refetchBudgets,
  } = useQuery<Budget[]>({
    queryKey: ['budgets'],
    queryFn: async () => {
      const data = await unwrap<Budget[]>(api.get('/budgets'));
      return Array.isArray(data) ? data : [];
    },
  });

  const expenses = expensesData ?? [];
  const budgets = budgetsData ?? [];
  const loading = expensesLoading || budgetsLoading;
  const error =
    expensesError || budgetsError
      ? getErrorMessage(expensesError ?? budgetsError, 'Failed to load data')
      : null;
  const fetchAll = () => {
    refetchExpenses();
    refetchBudgets();
  };

  const [activeTab, setActiveTab] = useState<'expenses' | 'budgets'>('expenses');

  // Budget modal state
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [budgetForm, setBudgetForm] = useState({
    category: CATEGORIES[0],
    amount: '',
    monthYear: getCurrentYearMonth(),
  });
  const [submittingBudget, setSubmittingBudget] = useState(false);

  // Expense modal state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: CATEGORIES[0],
    date: toYMD(new Date()),
  });
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // View budget expenses modal
  const [showBudgetExpensesModal, setShowBudgetExpensesModal] = useState(false);
  const [selectedBudgetCategory, setSelectedBudgetCategory] = useState('');
  const [selectedBudgetMonth, setSelectedBudgetMonth] = useState('');

  // Filters & pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [budgetMonth, setBudgetMonth] = useState(getCurrentYearMonth());

  // ---------- Add-budget modal ----------
  const openAddBudgetModal = () => {
    setEditingBudget(null);
    setBudgetForm({
      category: CATEGORIES[0],
      amount: '',
      monthYear: budgetMonth,
    });
    setShowBudgetModal(true);
  };

  // ---------- Budget submit mutation ----------
  const budgetSubmitMutation = useMutation({
    mutationFn: async ({ editing, payload }: { editing: Budget | null; payload: Omit<Budget, 'id'> }) => {
      if (editing) return unwrap<Budget>(api.put(`/budgets/${editing.id}`, payload));
      return unwrap<Budget>(api.post('/budgets', payload));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success(variables.editing ? 'Budget updated' : 'Budget added');
      setShowBudgetModal(false);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Operation failed')),
  });

  const handleBudgetSubmit = async () => {
    if (!budgetForm.category || !budgetForm.amount || !budgetForm.monthYear) {
      toast.error('Please fill all fields');
      return;
    }
    const amountNum = parseFloat(budgetForm.amount);
    if (isNaN(amountNum) || amountNum < 0) {
      toast.error('Amount must be a positive number');
      return;
    }

    const isDuplicate = budgets.some(b => {
      if (editingBudget && b.id === editingBudget.id) return false;
      return b.category === budgetForm.category && b.monthYear === budgetForm.monthYear;
    });

    if (isDuplicate) {
      toast.error(`A budget for ${budgetForm.category} in ${budgetForm.monthYear} already exists. Use Edit instead.`);
      return;
    }

    setSubmittingBudget(true);
    try {
      await budgetSubmitMutation.mutateAsync({
        editing: editingBudget,
        payload: {
          category: budgetForm.category,
          amount: amountNum,
          monthYear: budgetForm.monthYear,
        },
      });
    } finally {
      setSubmittingBudget(false);
    }
  };

  // ---------- Delete budget mutation ----------
  const deleteBudgetMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/budgets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Budget deleted');
    },
    onError: () => toast.error('Delete failed'),
  });

  const openEditBudgetModal = (budget: Budget) => {
    setEditingBudget(budget);
    setBudgetForm({
      category: budget.category,
      amount: budget.amount.toString(),
      monthYear: budget.monthYear,
    });
    setShowBudgetModal(true);
  };

  const handleDeleteBudget = async (budget: Budget) => {
    const result = await Swal.fire({
      title: 'Delete Budget',
      text: `Delete budget for ${budget.category} (${budget.monthYear})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete',
    });
    if (result.isConfirmed) {
      deleteBudgetMutation.mutate(budget.id);
    }
  };

  // ---------- View budget expenses ----------
  const openBudgetExpensesModal = (category: string, monthYear: string) => {
    setSelectedBudgetCategory(category);
    setSelectedBudgetMonth(monthYear);
    setShowBudgetExpensesModal(true);
  };

  const budgetExpenses = useMemo(() => {
    if (!selectedBudgetCategory || !selectedBudgetMonth) return [];
    return expenses.filter(
      (exp) =>
        exp.category === selectedBudgetCategory &&
        exp.date.startsWith(selectedBudgetMonth)
    );
  }, [expenses, selectedBudgetCategory, selectedBudgetMonth]);

  const totalBudgetExpenses = budgetExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  // ---------- Expense mutations ----------
  const expenseSubmitMutation = useMutation({
    mutationFn: async ({ editing, payload }: { editing: Expense | null; payload: Omit<Expense, 'id'> }) => {
      if (editing) return unwrap<Expense>(api.put(`/expenses/${editing.id}`, payload));
      return unwrap<Expense>(api.post('/expenses', payload));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success(variables.editing ? 'Expense updated' : 'Expense added');
      setShowExpenseModal(false);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Operation failed')),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense deleted');
    },
    onError: () => toast.error('Delete failed'),
  });

  const openAddExpenseModal = () => {
    setEditingExpense(null);
    setExpenseForm({
      description: '',
      amount: '',
      category: CATEGORIES[0],
      date: toYMD(new Date()),
    });
    setShowExpenseModal(true);
  };

  const openEditExpenseModal = (expense: Expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      date: expense.date,
    });
    setShowExpenseModal(true);
  };

  const handleExpenseSubmit = async () => {
    if (!expenseForm.description || !expenseForm.amount || !expenseForm.date) {
      toast.error('Please fill all required fields');
      return;
    }
    const amountNum = parseFloat(expenseForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Amount must be a positive number');
      return;
    }

    setSubmittingExpense(true);
    try {
      await expenseSubmitMutation.mutateAsync({
        editing: editingExpense,
        payload: {
          description: expenseForm.description,
          amount: amountNum,
          category: expenseForm.category,
          date: expenseForm.date,
        },
      });
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleDeleteExpense = async (expense: Expense) => {
    const result = await Swal.fire({
      title: 'Delete Expense',
      text: `Delete "${expense.description}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete',
    });
    if (result.isConfirmed) {
      deleteExpenseMutation.mutate(expense.id);
    }
  };

  // ---------- Move expense to another category ----------
  const moveExpenseToBudget = async (expense: Expense, newCategory: string) => {
    if (newCategory === expense.category) {
      toast('Expense already belongs to that category');
      return;
    }
    try {
      await unwrap<Expense>(api.put(`/expenses/${expense.id}`, {
        ...expense,
        category: newCategory,
      }));
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success(`Moved "${expense.description}" to ${newCategory}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Move failed'));
    }
  };

  // ---------- Budget overview computations ----------
  const actualSpendingByCategory = useMemo(() => {
    const spending: Record<string, number> = {};
    const monthExpenses = expenses.filter((exp) => exp.date.startsWith(budgetMonth));
    for (const exp of monthExpenses) {
      spending[exp.category] = (spending[exp.category] || 0) + exp.amount;
    }
    return spending;
  }, [expenses, budgetMonth]);

  const budgetsForMonth = useMemo(() => {
    return budgets.filter((b) => b.monthYear === budgetMonth);
  }, [budgets, budgetMonth]);

  const budgetOverview = useMemo(() => {
    const data = budgetsForMonth.map((budget) => {
      const actual = actualSpendingByCategory[budget.category] || 0;
      const remaining = budget.amount - actual;
      const percentage = budget.amount > 0 ? (actual / budget.amount) * 100 : 0;
      return { ...budget, actual, remaining, percentage };
    });
    const categoriesWithExpenses = Object.keys(actualSpendingByCategory);
    for (const cat of categoriesWithExpenses) {
      if (!data.some((d) => d.category === cat)) {
        data.push({
          id: 'temp',
          category: cat,
          amount: 0,
          monthYear: budgetMonth,
          actual: actualSpendingByCategory[cat],
          remaining: -actualSpendingByCategory[cat],
          percentage: 0,
        });
      }
    }
    return data;
  }, [budgetsForMonth, actualSpendingByCategory, budgetMonth]);

  // ---------- Expense filtering & pagination ----------
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const matchesSearch = !searchTerm || exp.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !categoryFilter || exp.category === categoryFilter;
      const matchesDateFrom = !dateFrom || exp.date >= dateFrom;
      const matchesDateTo = !dateTo || exp.date <= dateTo;
      return matchesSearch && matchesCategory && matchesDateFrom && matchesDateTo;
    });
  }, [expenses, searchTerm, categoryFilter, dateFrom, dateTo]);

  const totalPagesExpenses = Math.ceil(filteredExpenses.length / rowsPerPage);
  const paginatedExpenses = filteredExpenses.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const handlePageChange = (newPage: number) => setCurrentPage(Math.max(1, Math.min(newPage, totalPagesExpenses)));
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, dateFrom, dateTo]);

  const totalBudgetAmount = budgetOverview.reduce((sum, b) => sum + b.amount, 0);
  const totalActualAmount = budgetOverview.reduce((sum, b) => sum + b.actual, 0);
  const totalRemaining = totalBudgetAmount - totalActualAmount;

  // ---------- Loading & error states ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-red-600 dark:text-red-400">
          <p>{error}</p>
          <button onClick={fetchAll} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ---------- Render ----------
  return (
    <div
      className={`min-h-screen px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-300 ${
        theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
      }`}
    >
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="sm:flex sm:items-center sm:justify-between mb-8"
        >
          <div>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent' : 'bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent'}`}>
              Expenses & Budgeting
            </h2>
            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Track spending, set monthly budgets, and move expenses between categories.
            </p>
          </div>
          <div className="flex gap-2 mt-4 sm:mt-0">
            {activeTab === 'budgets' && (
              <button
                onClick={openAddBudgetModal}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg hover:from-green-600 hover:to-emerald-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" /> Add Budget
              </button>
            )}
            {activeTab === 'expenses' && (
              <button
                onClick={openAddExpenseModal}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg hover:from-blue-600 hover:to-indigo-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" /> Add Expense
              </button>
            )}
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`py-2 px-4 text-sm font-medium transition-colors ${activeTab === 'expenses' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <DocumentTextIcon className="inline h-5 w-5 mr-1" /> Expenses
          </button>
          <button
            onClick={() => setActiveTab('budgets')}
            className={`py-2 px-4 text-sm font-medium transition-colors ${activeTab === 'budgets' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <CurrencyDollarIcon className="inline h-5 w-5 mr-1" /> Budgets
          </button>
        </div>

        {/* ====================== EXPENSES TAB ====================== */}
        {activeTab === 'expenses' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
              <div className={`rounded-2xl p-6 shadow-xl ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/30 backdrop-blur-md border border-white/20'}`}>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Expenses (Filtered)</p>
                <p className={`text-2xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  ₦ {filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
                </p>
              </div>
              <div className={`rounded-2xl p-6 shadow-xl ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/30 backdrop-blur-md border border-white/20'}`}>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Current Month Spending</p>
                <p className={`text-2xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  ₦ {expenses.filter(e => e.date.startsWith(getCurrentYearMonth())).reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
                </p>
              </div>
              <div className={`rounded-2xl p-6 shadow-xl ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/30 backdrop-blur-md border border-white/20'}`}>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Number of Expenses</p>
                <p className={`text-2xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{filteredExpenses.length}</p>
              </div>
            </div>

            {/* Filters & Expenses Table */}
            <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-xl border focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700 text-white placeholder-gray-400 focus:ring-blue-500' : 'bg-white/50 border-gray-200 text-gray-900 placeholder-gray-500 focus:ring-blue-400'}`}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className={`px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700 text-white' : 'bg-white/50 border-gray-200 text-gray-900'}`}
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map(cat => <option key={cat}>{cat}</option>)}
                </select>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={`px-4 py-2 rounded-xl border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700 text-white' : 'bg-white/50 border-gray-200 text-gray-900'}`} />
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={`px-4 py-2 rounded-xl border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700 text-white' : 'bg-white/50 border-gray-200 text-gray-900'}`} />
                {(categoryFilter || dateFrom || dateTo) && (
                  <button
                    onClick={() => { setCategoryFilter(''); setDateFrom(''); setDateTo(''); }}
                    className={`px-4 py-2 rounded-xl border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700 text-white hover:bg-gray-700' : 'bg-white/50 border-gray-200 text-gray-900 hover:bg-gray-100'}`}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-2xl shadow-xl overflow-hidden">
              <div className={`overflow-x-auto ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/30 backdrop-blur-md border border-white/20'}`}>
                <table className="min-w-full">
                  <thead>
                    <tr className={`border-b ${theme === 'dark' ? 'border-white/10' : 'border-gray-200/50'}`}>
                      <th className="py-4 pl-6 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-300">Description</th>
                      <th className="px-3 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-300">Amount (₦)</th>
                      <th className="px-3 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-300">Category</th>
                      <th className="px-3 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-300">Date</th>
                      <th className="px-3 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-300">Move to Budget</th>
                      <th className="relative py-4 pl-3 pr-6 text-right text-sm font-semibold text-gray-900 dark:text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/10' : 'divide-gray-200/50'}`}>
                    {paginatedExpenses.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">No expenses found.</td></tr>
                    ) : (
                      paginatedExpenses.map((exp) => (
                        <tr key={exp.id} className="transition-colors hover:bg-white/5">
                          <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium text-gray-900 dark:text-white">{exp.description}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700 dark:text-gray-300">₦{exp.amount.toLocaleString()}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700 dark:text-gray-300">{exp.category}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700 dark:text-gray-300">{new Date(exp.date).toLocaleDateString()}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <select
                              value={exp.category}
                              onChange={(e) => moveExpenseToBudget(exp, e.target.value)}
                              className={`px-2 py-1 rounded border text-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                            >
                              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                          </td>
                          <td className="whitespace-nowrap py-4 pl-3 pr-6 text-right">
                            <button onClick={() => openEditExpenseModal(exp)} className="mr-3 p-1 rounded-lg transition-colors text-blue-600 hover:text-blue-800 hover:bg-blue-100/50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-white/10">
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button onClick={() => handleDeleteExpense(exp)} className="p-1 rounded-lg transition-colors text-red-600 hover:text-red-800 hover:bg-red-100/50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-white/10">
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPagesExpenses > 1 && (
              <div className="flex items-center justify-between px-4 py-3 mt-4 rounded-xl bg-white/10 dark:bg-gray-800/50 backdrop-blur border border-white/20 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Page {currentPage} of {totalPagesExpenses}</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="px-2 py-1 text-sm border rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  >
                    {[5,10,20,50].map(n => <option key={n}>{n} per page</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handlePageChange(currentPage-1)} disabled={currentPage===1} className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-600">Previous</button>
                  <button onClick={() => handlePageChange(currentPage+1)} disabled={currentPage===totalPagesExpenses} className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-600">Next</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ====================== BUDGETS TAB ====================== */}
        {activeTab === 'budgets' && (
          <div className="space-y-6">
            {/* Month selector & summary */}
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div className="flex gap-2 items-center">
                <input
                  type="month"
                  value={budgetMonth}
                  onChange={(e) => setBudgetMonth(e.target.value)}
                  className={`px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700 text-white' : 'bg-white/50 border-gray-200 text-gray-900'}`}
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">Select month</span>
              </div>
              <div className="flex gap-3">
                <div className={`rounded-lg px-4 py-2 ${theme === 'dark' ? 'bg-white/5' : 'bg-white/50'}`}>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Total Budget</span>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">₦{totalBudgetAmount.toLocaleString()}</p>
                </div>
                <div className={`rounded-lg px-4 py-2 ${theme === 'dark' ? 'bg-white/5' : 'bg-white/50'}`}>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Actual Spending</span>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">₦{totalActualAmount.toLocaleString()}</p>
                </div>
                <div className={`rounded-lg px-4 py-2 ${theme === 'dark' ? 'bg-white/5' : 'bg-white/50'}`}>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Remaining</span>
                  <p className={`text-xl font-bold ${totalRemaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>₦{totalRemaining.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Budgets table with progress bars */}
            <div className="rounded-2xl shadow-xl overflow-hidden">
              <div className={`overflow-x-auto ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white/30 backdrop-blur-md border border-white/20'}`}>
                <table className="min-w-full">
                  <thead>
                    <tr className={`border-b ${theme === 'dark' ? 'border-white/10' : 'border-gray-200/50'}`}>
                      <th className="py-4 pl-6 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-300">Category</th>
                      <th className="px-3 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-300">Budget (₦)</th>
                      <th className="px-3 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-300">Actual (₦)</th>
                      <th className="px-3 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-300">Remaining (₦)</th>
                      <th className="px-3 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-300">Progress</th>
                      <th className="relative py-4 pl-3 pr-6 text-right text-sm font-semibold text-gray-900 dark:text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/10' : 'divide-gray-200/50'}`}>
                    {budgetOverview.map((item) => {
                      const isOverBudget = item.remaining < 0;
                      const progressColor = isOverBudget ? 'bg-red-500' : (item.percentage >= 90 ? 'bg-yellow-500' : 'bg-blue-500');
                      return (
                        <tr key={item.id} className="transition-colors hover:bg-white/5">
                          <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium text-gray-900 dark:text-white">{item.category}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700 dark:text-gray-300">₦{item.amount.toLocaleString()}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700 dark:text-gray-300">₦{item.actual.toLocaleString()}</td>
                          <td className={`whitespace-nowrap px-3 py-4 text-sm font-medium ${isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>₦{item.remaining.toLocaleString()}</td>
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className={`h-full ${progressColor} transition-all duration-300`} style={{ width: `${Math.min(100, item.percentage)}%` }}></div>
                              </div>
                              <span className="text-xs text-gray-600 dark:text-gray-400">{item.percentage.toFixed(0)}%</span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap py-4 pl-3 pr-6 text-right">
                            {item.id !== 'temp' ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openBudgetExpensesModal(item.category, item.monthYear)}
                                  className="p-1 rounded-lg transition-colors text-gray-600 hover:text-blue-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-white/10"
                                  title="View Expenses"
                                >
                                  <EyeIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => openEditBudgetModal(item as Budget)}
                                  className="p-1 rounded-lg transition-colors text-blue-600 hover:text-blue-800 hover:bg-blue-100/50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-white/10"
                                >
                                  <PencilIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteBudget(item as Budget)}
                                  className="p-1 rounded-lg transition-colors text-red-600 hover:text-red-800 hover:bg-red-100/50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-white/10"
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </button>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                    {budgetOverview.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">No budgets set for this month. Click "Add Budget" to start.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={`mt-4 text-sm text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              <ChartBarIcon className="inline h-5 w-5 mr-1" /> You can move expenses to any budget category from the Expenses tab.
            </div>
          </div>
        )}
      </div>

      {/* ====================== MODALS ====================== */}

      {/* Budget Modal (Add/Edit) */}
      <AnimatePresence>
        {showBudgetModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBudgetModal(false)} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                <div className={`flex justify-between items-center p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{editingBudget ? 'Edit Budget' : 'Add Budget'}</h3>
                  <button onClick={() => setShowBudgetModal(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><XMarkIcon className="h-5 w-5 text-gray-500" /></button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Category *</label>
                    <select name="category" value={budgetForm.category} onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })} className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>
                      {CATEGORIES.map(cat => <option key={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Budget Amount (₦) *</label>
                    <input type="number" name="amount" value={budgetForm.amount} onChange={(e) => setBudgetForm({ ...budgetForm, amount: e.target.value })} className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`} placeholder="0" min="0" step="100" />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Month/Year *</label>
                    <input type="month" name="monthYear" value={budgetForm.monthYear} onChange={(e) => setBudgetForm({ ...budgetForm, monthYear: e.target.value })} className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`} />
                  </div>
                </div>
                <div className={`flex justify-end gap-3 p-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <button onClick={() => setShowBudgetModal(false)} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200">Cancel</button>
                  <button onClick={handleBudgetSubmit} disabled={submittingBudget} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{submittingBudget ? 'Saving...' : (editingBudget ? 'Update' : 'Add')}</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Expense Modal (Add/Edit) */}
      <AnimatePresence>
        {showExpenseModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowExpenseModal(false)} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                <div className={`flex justify-between items-center p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{editingExpense ? 'Edit Expense' : 'Add Expense'}</h3>
                  <button onClick={() => setShowExpenseModal(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><XMarkIcon className="h-5 w-5 text-gray-500" /></button>
                </div>
                <div className="p-6 space-y-4">
                  <div><label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Description *</label><input type="text" name="description" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`} placeholder="e.g., Office Supplies" /></div>
                  <div><label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Amount (₦) *</label><input type="number" name="amount" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`} min="0" step="0.01" /></div>
                  <div><label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Category *</label><select name="category" value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>{CATEGORIES.map(cat => <option key={cat}>{cat}</option>)}</select></div>
                  <div><label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Date *</label><input type="date" name="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`} /></div>
                </div>
                <div className={`flex justify-end gap-3 p-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <button onClick={() => setShowExpenseModal(false)} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200">Cancel</button>
                  <button onClick={handleExpenseSubmit} disabled={submittingExpense} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{submittingExpense ? 'Saving...' : (editingExpense ? 'Update' : 'Add')}</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ====================== BUDGET EXPENSES MODAL ====================== */}
      <AnimatePresence>
        {showBudgetExpensesModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBudgetExpensesModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden transition-all ${
                theme === 'dark'
                  ? 'bg-gradient-to-b from-gray-900 to-gray-800'
                  : 'bg-gradient-to-b from-white to-gray-50'
              }`}>
                <div className={`relative px-6 py-5 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white/50'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Expenses: {selectedBudgetCategory}
                      </h3>
                      <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {selectedBudgetMonth} • {budgetExpenses.length} item(s)
                      </p>
                    </div>
                    <button
                      onClick={() => setShowBudgetExpensesModal(false)}
                      className="p-2 rounded-full transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      <XMarkIcon className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {budgetExpenses.length === 0 ? (
                    <div className="text-center py-12">
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                        <CurrencyDollarIcon className={`h-8 w-8 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                      </div>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        No expenses recorded for this category in the selected month.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                              <th className={`text-left py-3 text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Description
                              </th>
                              <th className={`text-right py-3 text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Amount (₦)
                              </th>
                              <th className={`text-left py-3 text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Date
                              </th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-800' : 'divide-gray-100'}`}>
                            {budgetExpenses.map((exp) => (
                              <tr key={exp.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <td className="py-3 text-sm font-medium text-gray-900 dark:text-white">
                                  {exp.description}
                                </td>
                                <td className="py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                                  ₦{exp.amount.toLocaleString()}
                                </td>
                                <td className="py-3 text-sm text-gray-700 dark:text-gray-400">
                                  {new Date(exp.date).toLocaleDateString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                            <tr>
                              <td className="py-4 text-sm font-semibold text-gray-900 dark:text-white">
                                Total
                              </td>
                              <td className="py-4 text-sm font-semibold text-right text-green-600 dark:text-green-400">
                                ₦{totalBudgetExpenses.toLocaleString()}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      <div className={`mt-6 p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-blue-50'}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total spent on {selectedBudgetCategory}</span>
                          <span className={`text-lg font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                            ₦{totalBudgetExpenses.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className={`flex justify-end px-6 py-4 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-gray-50'}`}>
                  <button
                    onClick={() => setShowBudgetExpensesModal(false)}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}