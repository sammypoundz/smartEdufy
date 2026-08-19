import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useAcademicSession } from '../../contexts/AcademicSessionContext';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import api from '../../services/api';

import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  XMarkIcon,
  EyeIcon,
  EnvelopeIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';

// ============================================================
// Interfaces
// ============================================================

interface FeeStructure {
  id: string;
  className: string;
  term: string;
  breakdown: {
    name: string;
    amount: number;
  }[];
  totalAmount: number;
  deadline: string;
}

interface Student {
  id: string;
  name: string;
  admissionNumber: string;
  className: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
}

interface FeePayment {
  id: string;
  studentId: string;
  feeStructureId: string;
  amountPaid: number;
  paymentDate: string;
  reference: string | null;
  paymentMethod: string;
  breakdownItems: {
    itemName: string;
    amount: number;
  }[];
  status: 'PAID' | 'PARTIAL' | 'PENDING';
}

interface ClassItem {
  id: string;
  name: string;
}

// ============================================================
// Helpers
// ============================================================

const getItemOwedAmounts = (
  student: Student,
  fee: FeeStructure,
  payments: FeePayment[]
) => {
  const studentPayments = payments.filter(
    (p) =>
      p.studentId === student.id &&
      p.feeStructureId === fee.id
  );

  const paidPerItem: Record<string, number> = {};

  for (const payment of studentPayments) {
    for (const item of payment.breakdownItems || []) {
      paidPerItem[item.itemName] =
        (paidPerItem[item.itemName] || 0) + item.amount;
    }
  }

  return fee.breakdown.map((item) => {
    const paid = paidPerItem[item.name] || 0;

    return {
      name: item.name,
      total: item.amount,
      paid,
      owed: Math.max(0, item.amount - paid),
    };
  });
};

const getStudentOwing = (
  student: Student,
  feeStructures: FeeStructure[],
  payments: FeePayment[]
) => {
  const studentFees = feeStructures.filter(
    (f) => f.className === student.className
  );

  let totalOwed = 0;

  for (const fee of studentFees) {
    const itemOwed = getItemOwedAmounts(
      student,
      fee,
      payments
    );

    totalOwed += itemOwed.reduce(
      (sum, item) => sum + item.owed,
      0
    );
  }

  return totalOwed > 0;
};

// ============================================================
// Component
// ============================================================

export default function AdminFees() {
  const { theme } = useTheme();

  const {
    currentYear,
    currentTerm,
    loading: sessionLoading,
  } = useAcademicSession();

  const isDark = theme === 'dark';

  // ============================================================
  // State
  // ============================================================

  const [feeStructures, setFeeStructures] = useState<
    FeeStructure[]
  >([]);

  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [availableClasses, setAvailableClasses] = useState<
    ClassItem[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fee modal
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [editingFee, setEditingFee] =
    useState<FeeStructure | null>(null);

  const [feeForm, setFeeForm] = useState({
    className: '',
    term: '',
    breakdown: [
      {
        name: 'Tuition',
        amount: 0,
      },
    ],
    deadline: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [deletingFeeId, setDeletingFeeId] =
    useState<string | null>(null);

  const [sendingMessage, setSendingMessage] =
    useState(false);

  const [paymentSubmitting, setPaymentSubmitting] =
    useState(false);

  // Tabs / Filters
  const [activeTab, setActiveTab] =
    useState<'fees' | 'payments'>('fees');

  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyOwing, setShowOnlyOwing] =
    useState(false);

  const [selectedClassFilter, setSelectedClassFilter] =
    useState('');

  // Student modal
  const [selectedStudent, setSelectedStudent] =
    useState<Student | null>(null);

  const [
    showPaymentDetailsModal,
    setShowPaymentDetailsModal,
  ] = useState(false);

  // Message modal
  const [showMessageModal, setShowMessageModal] =
    useState(false);

  const [messageText, setMessageText] = useState('');

  const [messageType, setMessageType] =
    useState<'email' | 'sms'>('email');

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] =
    useState(false);

  const [paymentStudent, setPaymentStudent] =
    useState<Student | null>(null);

  const [selectedItems, setSelectedItems] = useState<
    {
      feeId: string;
      itemName: string;
      amount: number;
      maxAmount: number;
    }[]
  >([]);

  const [paymentMethod, setPaymentMethod] =
    useState('cash');

  const [paymentReference, setPaymentReference] =
    useState('');

  // ============================================================
  // Theme classes
  // ============================================================

  const pageBackground = isDark
    ? 'bg-[#0B1120]'
    : 'bg-gradient-to-br from-slate-50 via-white to-blue-50';

  const cardBackground = isDark
    ? 'bg-gray-900/80 border border-white/10 backdrop-blur-xl'
    : 'bg-white border border-gray-200 shadow-sm';

  const glassCard = isDark
    ? 'bg-white/5 backdrop-blur-xl border border-white/10'
    : 'bg-white border border-gray-200 shadow-sm';

  const headingText = isDark
    ? 'text-white'
    : 'text-gray-900';

  const bodyText = isDark
    ? 'text-gray-300'
    : 'text-gray-700';

  const mutedText = isDark
    ? 'text-gray-400'
    : 'text-gray-500';

  const inputClass = isDark
    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500';

  const tableHeaderClass = isDark
    ? 'bg-gray-900/80 text-gray-200'
    : 'bg-gray-50 text-gray-700';

  const tableRowClass = isDark
    ? 'hover:bg-white/5 border-white/10'
    : 'hover:bg-blue-50/50 border-gray-200';

  // ============================================================
  // Data Fetching
  // ============================================================

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [
          feeRes,
          studentRes,
          paymentRes,
          classesRes,
        ] = await Promise.all([
          api.get('/fees/structures'),
          api.get('/students'),
          api.get('/fees/payments'),
          api.get('/classes'),
        ]);

        const feeStructuresData = feeRes.data;
        const studentsData = studentRes.data;

        let paymentsData = paymentRes.data;

        const classesData = classesRes.data;

        if (
          paymentsData &&
          !Array.isArray(paymentsData) &&
          (paymentsData as any).data
        ) {
          paymentsData = (paymentsData as any).data;
        }

        if (!Array.isArray(paymentsData)) {
          paymentsData = [];
        }

        setFeeStructures(feeStructuresData);

        const mappedStudents = studentsData.map(
          (s: any) => ({
            id: s.id,
            name: s.name,
            admissionNumber:
              s.admissionNumber || '',
            className:
              s.class?.name ||
              s.className ||
              '',
            parentName:
              s.parent?.name || '',
            parentEmail:
              s.parent?.email || '',
            parentPhone:
              s.parent?.phone || '',
          })
        );

        setStudents(mappedStudents);
        setPayments(paymentsData);
        setAvailableClasses(classesData);
      } catch (err: any) {
        console.error(err);

        const msg =
          err.response?.data?.error ||
          err.message ||
          'Failed to load data';

        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ============================================================
  // Current Academic Session
  // ============================================================

  const currentTermName =
    currentTerm?.name || '';

  const filteredFeeStructures = useMemo(() => {
    if (!currentTermName) return [];

    return feeStructures.filter(
      (fee) => fee.term === currentTermName
    );
  }, [
    feeStructures,
    currentTermName,
  ]);

  const filteredPayments = useMemo(() => {
    const feeIds = new Set(
      filteredFeeStructures.map(
        (fee) => fee.id
      )
    );

    return payments.filter((payment) =>
      feeIds.has(payment.feeStructureId)
    );
  }, [
    payments,
    filteredFeeStructures,
  ]);

  // ============================================================
  // Student Counts
  // ============================================================

  const studentCountByClass = useMemo(() => {
    const countMap: Record<
      string,
      number
    > = {};

    students.forEach((student) => {
      const cls = student.className;

      if (cls) {
        countMap[cls] =
          (countMap[cls] || 0) + 1;
      }
    });

    return countMap;
  }, [students]);

  // ============================================================
  // Summary
  // ============================================================

  const totalFeesAllStudents = useMemo(() => {
    return filteredFeeStructures.reduce(
      (sum, fee) => {
        const studentCount =
          studentCountByClass[
            fee.className
          ] || 0;

        return (
          sum +
          fee.totalAmount *
            studentCount
        );
      },
      0
    );
  }, [
    filteredFeeStructures,
    studentCountByClass,
  ]);

  const totalCollected = useMemo(() => {
    return filteredPayments.reduce(
      (sum, payment) =>
        sum + payment.amountPaid,
      0
    );
  }, [filteredPayments]);

  const totalOutstanding =
    Math.max(
      0,
      totalFeesAllStudents -
        totalCollected
    );

  const classes = [
    ...new Set(
      filteredFeeStructures.map(
        (fee) => fee.className
      )
    ),
  ];

  // ============================================================
  // Filter Students
  // ============================================================

  const allFilteredStudents =
    students.filter((student) => {
      const search =
        searchTerm.toLowerCase();

      const matchesSearch =
        searchTerm === '' ||
        student.name
          .toLowerCase()
          .includes(search) ||
        student.admissionNumber
          .toLowerCase()
          .includes(search) ||
        student.parentName
          .toLowerCase()
          .includes(search);

      const isOwing =
        showOnlyOwing
          ? getStudentOwing(
              student,
              filteredFeeStructures,
              filteredPayments
            )
          : true;

      const matchesClass =
        selectedClassFilter === '' ||
        student.className ===
          selectedClassFilter;

      return (
        matchesSearch &&
        isOwing &&
        matchesClass
      );
    });

  // ============================================================
  // Pagination
  // ============================================================

  const totalPages = Math.ceil(
    allFilteredStudents.length /
      rowsPerPage
  );

  const paginatedStudents =
    allFilteredStudents.slice(
      (currentPage - 1) *
        rowsPerPage,
      currentPage * rowsPerPage
    );

  const handlePageChange = (
    newPage: number
  ) => {
    setCurrentPage(
      Math.max(
        1,
        Math.min(
          newPage,
          totalPages
        )
      )
    );
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    showOnlyOwing,
    selectedClassFilter,
    rowsPerPage,
  ]);

  // ============================================================
  // Fee Structure Handlers
  // ============================================================

  const openAddFeeModal = () => {
    setEditingFee(null);

    setFeeForm({
      className:
        availableClasses.length > 0
          ? availableClasses[0].name
          : '',
      term:
        currentTermName ||
        'First Term',
      breakdown: [
        {
          name: 'Tuition',
          amount: 0,
        },
      ],
      deadline: '',
    });

    setShowFeeModal(true);
  };

  const openEditFeeModal = (
    fee: FeeStructure
  ) => {
    setEditingFee(fee);

    setFeeForm({
      className: fee.className,
      term: fee.term,
      breakdown: fee.breakdown,
      deadline:
        fee.deadline.split('T')[0],
    });

    setShowFeeModal(true);
  };

  const addBreakdownItem = () => {
    setFeeForm((prev) => ({
      ...prev,
      breakdown: [
        ...prev.breakdown,
        {
          name: '',
          amount: 0,
        },
      ],
    }));
  };

  const removeBreakdownItem = (
    index: number
  ) => {
    setFeeForm((prev) => ({
      ...prev,
      breakdown:
        prev.breakdown.filter(
          (_, i) => i !== index
        ),
    }));
  };

  const updateBreakdown = (
    index: number,
    field: 'name' | 'amount',
    value: string | number
  ) => {
    const newBreakdown = [
      ...feeForm.breakdown,
    ];

    newBreakdown[index] = {
      ...newBreakdown[index],
      [field]: value,
    };

    setFeeForm((prev) => ({
      ...prev,
      breakdown: newBreakdown,
    }));
  };

  const calculateTotal = () => {
    return feeForm.breakdown.reduce(
      (sum, item) =>
        sum + (item.amount || 0),
      0
    );
  };

  const handleSaveFee = async () => {
    if (
      !feeForm.className ||
      !feeForm.deadline ||
      feeForm.breakdown.length === 0
    ) {
      toast.error(
        'Please fill all required fields'
      );
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        className:
          feeForm.className,
        term: feeForm.term,
        breakdown:
          feeForm.breakdown,
        deadline:
          new Date(
            feeForm.deadline
          ).toISOString(),
      };

      if (editingFee) {
        const response =
          await api.put(
            `/fees/structures/${editingFee.id}`,
            payload
          );

        const updated =
          response.data;

        setFeeStructures(
          (prev) =>
            prev.map((fee) =>
              fee.id ===
              editingFee.id
                ? updated
                : fee
            )
        );

        toast.success(
          'Fee structure updated'
        );
      } else {
        const response =
          await api.post(
            '/fees/structures',
            payload
          );

        const created =
          response.data;

        setFeeStructures(
          (prev) => [
            ...prev,
            created,
          ]
        );

        toast.success(
          'Fee structure added'
        );
      }

      setShowFeeModal(false);
    } catch (err: any) {
      console.error(err);

      const msg =
        err.response?.data?.error ||
        err.message ||
        'Operation failed';

      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFee = async (
    fee: FeeStructure
  ) => {
    const result =
      await Swal.fire({
        title:
          'Delete Fee Structure',
        text: `Delete fee for ${fee.className} (${fee.term})?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor:
          '#d33',
        confirmButtonText:
          'Delete',
      });

    if (!result.isConfirmed)
      return;

    setDeletingFeeId(fee.id);

    try {
      await api.delete(
        `/fees/structures/${fee.id}`
      );

      setFeeStructures(
        (prev) =>
          prev.filter(
            (item) =>
              item.id !== fee.id
          )
      );

      toast.success(
        'Fee structure deleted'
      );
    } catch (err) {
      console.error(err);
      toast.error(
        'Delete failed'
      );
    } finally {
      setDeletingFeeId(null);
    }
  };

  // ============================================================
  // Student Fee Details
  // ============================================================

  const getStudentFeeDetails = (
    student: Student
  ) => {
    const studentFees =
      filteredFeeStructures.filter(
        (fee) =>
          fee.className ===
          student.className
      );

    return studentFees.map(
      (fee) => {
        const itemOwed =
          getItemOwedAmounts(
            student,
            fee,
            filteredPayments
          );

        const paid =
          itemOwed.reduce(
            (sum, item) =>
              sum + item.paid,
            0
          );

        const owed =
          itemOwed.reduce(
            (sum, item) =>
              sum + item.owed,
            0
          );

        const status =
          paid >= fee.totalAmount
            ? 'Paid'
            : paid > 0
            ? 'Partial'
            : 'Pending';

        return {
          fee,
          paid,
          owed,
          status,
        };
      }
    );
  };

  const viewPaymentDetails = (
    student: Student
  ) => {
    setSelectedStudent(student);
    setShowPaymentDetailsModal(
      true
    );
  };

  // ============================================================
  // Messaging
  // ============================================================

  const sendMessageToParent = (
    student: Student
  ) => {
    setSelectedStudent(student);

    setMessageText(
      `Dear ${student.parentName},\n\nYour child ${student.name} (${student.admissionNumber}) has outstanding school fees. Please visit the school to complete payment.\n\nThank you.`
    );

    setMessageType('email');
    setShowMessageModal(true);
  };

  const handleSendMessage =
    async () => {
      if (!selectedStudent)
        return;

      setSendingMessage(true);

      try {
        await api.post(
          '/fees/messages',
          {
            studentId:
              selectedStudent.id,
            type: messageType,
            subject:
              messageType ===
              'email'
                ? 'Fee Reminder'
                : undefined,
            message: messageText,
          }
        );

        toast.success(
          `${
            messageType ===
            'email'
              ? 'Email'
              : 'SMS'
          } sent successfully`
        );

        setShowMessageModal(
          false
        );
      } catch (err: any) {
        console.error(err);

        toast.error(
          'Failed to send message'
        );
      } finally {
        setSendingMessage(false);
      }
    };

  // ============================================================
  // Payment Modal
  // ============================================================

  const openPaymentModal = (
    student: Student
  ) => {
    setPaymentStudent(student);

    const studentFees =
      filteredFeeStructures.filter(
        (fee) =>
          fee.className ===
          student.className
      );

    const allItems: {
      feeId: string;
      itemName: string;
      maxAmount: number;
      owed: number;
    }[] = [];

    for (const fee of studentFees) {
      const itemOwed =
        getItemOwedAmounts(
          student,
          fee,
          filteredPayments
        );

      for (const item of itemOwed) {
        if (item.owed > 0) {
          allItems.push({
            feeId: fee.id,
            itemName: item.name,
            maxAmount:
              item.owed,
            owed: item.owed,
          });
        }
      }
    }

    setSelectedItems(
      allItems.map((item) => ({
        ...item,
        amount: item.maxAmount,
      }))
    );

    setPaymentMethod('cash');
    setPaymentReference('');
    setShowPaymentModal(true);
  };

  const updateItemAmount = (
    feeId: string,
    itemName: string,
    amount: number
  ) => {
    setSelectedItems(
      (prev) =>
        prev.map((item) =>
          item.feeId === feeId &&
          item.itemName ===
            itemName
            ? {
                ...item,
                amount: Math.min(
                  Math.max(
                    0,
                    amount
                  ),
                  item.maxAmount
                ),
              }
            : item
        )
    );
  };

  const selectAllItems = () => {
    setSelectedItems(
      (prev) =>
        prev.map((item) => ({
          ...item,
          amount:
            item.maxAmount,
        }))
    );
  };

  const toggleItemSelection = (
    feeId: string,
    itemName: string,
    checked: boolean
  ) => {
    if (checked) {
      const existing =
        selectedItems.find(
          (item) =>
            item.feeId ===
              feeId &&
            item.itemName ===
              itemName
        );

      if (
        !existing &&
        paymentStudent
      ) {
        const studentFees =
          filteredFeeStructures.filter(
            (fee) =>
              fee.className ===
              paymentStudent.className
          );

        const fee =
          studentFees.find(
            (item) =>
              item.id === feeId
          );

        if (fee) {
          const itemOwed =
            getItemOwedAmounts(
              paymentStudent,
              fee,
              filteredPayments
            );

          const item =
            itemOwed.find(
              (i) =>
                i.name ===
                itemName
            );

          if (
            item &&
            item.owed > 0
          ) {
            setSelectedItems(
              (prev) => [
                ...prev,
                {
                  feeId,
                  itemName,
                  amount:
                    item.owed,
                  maxAmount:
                    item.owed,
                },
              ]
            );
          }
        }
      }
    } else {
      setSelectedItems(
        (prev) =>
          prev.filter(
            (item) =>
              !(
                item.feeId ===
                  feeId &&
                item.itemName ===
                  itemName
              )
          )
      );
    }
  };

  const isItemSelected = (
    feeId: string,
    itemName: string
  ) =>
    selectedItems.some(
      (item) =>
        item.feeId === feeId &&
        item.itemName ===
          itemName
    );

  const totalPaymentAmount =
    selectedItems.reduce(
      (sum, item) =>
        sum + item.amount,
      0
    );

  const handleRecordPayment =
    async () => {
      if (!paymentStudent)
        return;

      if (
        totalPaymentAmount <= 0
      ) {
        toast.error(
          'Please select at least one fee item and enter a valid amount'
        );
        return;
      }

      const grouped =
        new Map<
          string,
          {
            itemName: string;
            amount: number;
          }[]
        >();

      for (const item of selectedItems) {
        if (
          !grouped.has(
            item.feeId
          )
        ) {
          grouped.set(
            item.feeId,
            []
          );
        }

        grouped
          .get(item.feeId)!
          .push({
            itemName:
              item.itemName,
            amount:
              item.amount,
          });
      }

      setPaymentSubmitting(
        true
      );

      try {
        for (const [
          feeId,
          breakdownItems,
        ] of grouped.entries()) {
          const amountPaid =
            breakdownItems.reduce(
              (sum, item) =>
                sum +
                item.amount,
              0
            );

          await api.post(
            '/fees/payments',
            {
              studentId:
                paymentStudent.id,
              feeStructureId:
                feeId,
              amountPaid,
              paymentMethod,
              reference:
                paymentReference ||
                undefined,
              breakdownItems,
            }
          );
        }

        const paymentRes =
          await api.get(
            '/fees/payments'
          );

        let updatedPayments =
          paymentRes.data;

        if (
          updatedPayments &&
          !Array.isArray(
            updatedPayments
          ) &&
          (updatedPayments as any)
            .data
        ) {
          updatedPayments =
            (
              updatedPayments as any
            ).data;
        }

        if (
          !Array.isArray(
            updatedPayments
          )
        ) {
          updatedPayments = [];
        }

        setPayments(
          updatedPayments
        );

        toast.success(
          `Payment of ₦${totalPaymentAmount.toLocaleString()} recorded for ${paymentStudent.name}`
        );

        setShowPaymentModal(
          false
        );
      } catch (err: any) {
        console.error(err);

        const msg =
          err.response?.data
            ?.error ||
          err.message ||
          'Payment failed';

        toast.error(msg);
      } finally {
        setPaymentSubmitting(
          false
        );
      }
    };

  // ============================================================
  // Loading State
  // ============================================================

  if (
    sessionLoading ||
    loading
  ) {
    return (
      <div
        className={`flex items-center justify-center h-screen ${pageBackground}`}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />

          <p
            className={`mt-4 ${
              isDark
                ? 'text-gray-400'
                : 'text-gray-600'
            }`}
          >
            Loading fees data...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // Error State
  // ============================================================

  if (error) {
    return (
      <div
        className={`flex items-center justify-center h-screen ${pageBackground}`}
      >
        <div
          className={`text-center ${
            isDark
              ? 'text-red-400'
              : 'text-red-600'
          }`}
        >
          <p>{error}</p>

          <button
            onClick={() =>
              window.location.reload()
            }
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // No Academic Session
  // ============================================================

  if (
    !currentYear ||
    !currentTerm
  ) {
    return (
      <div
        className={`flex items-center justify-center h-screen ${pageBackground}`}
      >
        <div
          className={`text-center ${
            isDark
              ? 'text-yellow-400'
              : 'text-yellow-700'
          }`}
        >
          <p>
            No active academic
            session set. Please go
            to Academic settings
            and set the current
            session.
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <div
      className={`min-h-screen px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-300 ${pageBackground}`}
    >
      {/* ======================================================
          Dark Mode Background
      ====================================================== */}

      {isDark && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                `linear-gradient(rgba(59,130,246,0.1) 1px,transparent 1px), linear-gradient(90deg,rgba(59,130,246,0.1) 1px,transparent 1px)`,
              backgroundSize:
                '60px 60px',
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto">

        {/* ====================================================
            Header
        ==================================================== */}

        <motion.div
          initial={{
            opacity: 0,
            y: -10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="sm:flex sm:items-center sm:justify-between mb-8"
        >
          <div>
            <h2
              className={`text-2xl font-bold ${
                isDark
                  ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent'
                  : 'text-gray-900'
              }`}
            >
              Fees Management
            </h2>

            <p
              className={`mt-2 text-sm ${mutedText}`}
            >
              Manage fee structure,
              track payments, and
              contact debtors.

              <span
                className={`ml-2 font-semibold ${
                  isDark
                    ? 'text-blue-400'
                    : 'text-blue-700'
                }`}
              >
                Active:{' '}
                {currentYear.name} –{' '}
                {currentTerm.name}
              </span>
            </p>
          </div>

          {activeTab === 'fees' && (
            <motion.button
              whileHover={{
                scale: 1.02,
              }}
              whileTap={{
                scale: 0.98,
              }}
              onClick={
                openAddFeeModal
              }
              className="mt-4 sm:mt-0 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:from-blue-700 hover:to-indigo-700 transition"
            >
              <PlusIcon className="h-5 w-5 mr-2" />

              Add Fee Structure
            </motion.button>
          )}
        </motion.div>

        {/* ====================================================
            Tabs
        ==================================================== */}

        <div
          className={`flex space-x-4 mb-6 border-b ${
            isDark
              ? 'border-gray-700'
              : 'border-gray-200'
          }`}
        >
          <button
            onClick={() =>
              setActiveTab('fees')
            }
            className={`py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'fees'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : isDark
                ? 'text-gray-400 hover:text-gray-200'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Fee Structure
          </button>

          <button
            onClick={() =>
              setActiveTab(
                'payments'
              )
            }
            className={`py-3 px-4 text-sm font-medium transition-colors ${
              activeTab ===
              'payments'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : isDark
                ? 'text-gray-400 hover:text-gray-200'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Payments & Debtors
          </button>
        </div>

        {/* ====================================================
            Tab Content
        ==================================================== */}

        <AnimatePresence mode="wait">

          {/* ==================================================
              FEES TAB
          ================================================== */}

          {activeTab === 'fees' ? (
            <motion.div
              key="fees"
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -20,
              }}
              transition={{
                duration: 0.2,
              }}
            >

              {/* Summary Cards */}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">

                {/* Total Fees */}

                <div
                  className={`rounded-2xl p-6 transition-all ${glassCard}`}
                >
                  <p
                    className={`text-sm font-medium ${mutedText}`}
                  >
                    Total Fees (All
                    Students,{' '}
                    {currentTerm.name})
                  </p>

                  <p
                    className={`text-2xl font-bold mt-2 ${headingText}`}
                  >
                    ₦{' '}
                    {totalFeesAllStudents.toLocaleString()}
                  </p>

                  <div
                    className={`mt-3 h-1 rounded-full ${
                      isDark
                        ? 'bg-blue-500/30'
                        : 'bg-blue-100'
                    }`}
                  >
                    <div className="h-1 w-full rounded-full bg-blue-600" />
                  </div>
                </div>

                {/* Collected */}

                <div
                  className={`rounded-2xl p-6 transition-all ${glassCard}`}
                >
                  <p
                    className={`text-sm font-medium ${mutedText}`}
                  >
                    Collected
                  </p>

                  <p
                    className={`text-2xl font-bold mt-2 ${
                      isDark
                        ? 'text-green-400'
                        : 'text-green-700'
                    }`}
                  >
                    ₦{' '}
                    {totalCollected.toLocaleString()}
                  </p>

                  <div
                    className={`mt-3 h-1 rounded-full ${
                      isDark
                        ? 'bg-green-500/20'
                        : 'bg-green-100'
                    }`}
                  >
                    <div
                      className="h-1 rounded-full bg-green-600"
                      style={{
                        width:
                          totalFeesAllStudents >
                          0
                            ? `${Math.min(
                                100,
                                (totalCollected /
                                  totalFeesAllStudents) *
                                  100
                              )}%`
                            : '0%',
                      }}
                    />
                  </div>
                </div>

                {/* Outstanding */}

                <div
                  className={`rounded-2xl p-6 transition-all ${glassCard}`}
                >
                  <p
                    className={`text-sm font-medium ${mutedText}`}
                  >
                    Outstanding
                  </p>

                  <p
                    className={`text-2xl font-bold mt-2 ${
                      isDark
                        ? 'text-red-400'
                        : 'text-red-600'
                    }`}
                  >
                    ₦{' '}
                    {totalOutstanding.toLocaleString()}
                  </p>

                  <div
                    className={`mt-3 h-1 rounded-full ${
                      isDark
                        ? 'bg-red-500/20'
                        : 'bg-red-100'
                    }`}
                  >
                    <div className="h-1 w-full rounded-full bg-red-500" />
                  </div>
                </div>
              </div>

              {/* Fee Table */}

              <div
                className={`rounded-2xl overflow-hidden ${glassCard}`}
              >
                <div className="overflow-x-auto">
                  <table className="min-w-full">

                    <thead>
                      <tr
                        className={`border-b ${tableHeaderClass} ${
                          isDark
                            ? 'border-white/10'
                            : 'border-gray-200'
                        }`}
                      >
                        <th className="py-4 pl-6 pr-3 text-left text-sm font-semibold">
                          Class
                        </th>

                        <th className="px-3 py-4 text-left text-sm font-semibold">
                          Term
                        </th>

                        <th className="px-3 py-4 text-left text-sm font-semibold">
                          Breakdown
                        </th>

                        <th className="px-3 py-4 text-left text-sm font-semibold">
                          Total (₦)
                        </th>

                        <th className="px-3 py-4 text-left text-sm font-semibold">
                          Deadline
                        </th>

                        <th className="relative py-4 pl-3 pr-6 text-right text-sm font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody
                      className={`divide-y ${
                        isDark
                          ? 'divide-white/10'
                          : 'divide-gray-200'
                      }`}
                    >
                      {filteredFeeStructures.length ===
                      0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className={`py-12 text-center ${mutedText}`}
                          >
                            No fee structures
                            found for{' '}
                            {currentTerm.name}.
                          </td>
                        </tr>
                      ) : (
                        filteredFeeStructures.map(
                          (fee) => (
                            <tr
                              key={fee.id}
                              className={`transition-colors ${tableRowClass}`}
                            >
                              <td
                                className={`whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium ${headingText}`}
                              >
                                {fee.className}
                              </td>

                              <td
                                className={`whitespace-nowrap px-3 py-4 text-sm ${bodyText}`}
                              >
                                {fee.term}
                              </td>

                              <td
                                className={`px-3 py-4 text-sm ${bodyText}`}
                              >
                                <div className="space-y-1">
                                  {fee.breakdown.map(
                                    (
                                      item,
                                      idx
                                    ) => (
                                      <div
                                        key={`${fee.id}-breakdown-${idx}`}
                                      >
                                        <span className="font-medium">
                                          {
                                            item.name
                                          }
                                        </span>
                                        : ₦
                                        {item.amount.toLocaleString()}
                                      </div>
                                    )
                                  )}
                                </div>
                              </td>

                              <td
                                className={`whitespace-nowrap px-3 py-4 text-sm font-semibold ${headingText}`}
                              >
                                ₦
                                {fee.totalAmount.toLocaleString()}
                              </td>

                              <td
                                className={`whitespace-nowrap px-3 py-4 text-sm ${bodyText}`}
                              >
                                {new Date(
                                  fee.deadline
                                ).toLocaleDateString()}
                              </td>

                              <td className="whitespace-nowrap py-4 pl-3 pr-6 text-right">
                                <button
                                  onClick={() =>
                                    openEditFeeModal(
                                      fee
                                    )
                                  }
                                  className={`mr-2 p-2 rounded-lg transition-colors ${
                                    isDark
                                      ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10'
                                      : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                                  }`}
                                  title="Edit"
                                >
                                  <PencilIcon className="h-5 w-5" />
                                </button>

                                <button
                                  onClick={() =>
                                    handleDeleteFee(
                                      fee
                                    )
                                  }
                                  disabled={
                                    deletingFeeId ===
                                    fee.id
                                  }
                                  className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                    isDark
                                      ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'
                                      : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                                  }`}
                                  title="Delete"
                                >
                                  {deletingFeeId ===
                                  fee.id ? (
                                    <div className="h-5 w-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <TrashIcon className="h-5 w-5" />
                                  )}
                                </button>
                              </td>
                            </tr>
                          )
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : (

            /* ==================================================
               PAYMENTS TAB
            ================================================== */

            <motion.div
              key="payments"
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -20,
              }}
              transition={{
                duration: 0.2,
              }}
              className="space-y-6"
            >

              {/* Search & Filters */}

              <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">

                <div className="relative flex-1 max-w-xl">
                  <MagnifyingGlassIcon
                    className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${
                      isDark
                        ? 'text-gray-500'
                        : 'text-gray-400'
                    }`}
                  />

                  <input
                    type="text"
                    placeholder="Search by name, admission number, or parent name..."
                    value={searchTerm}
                    onChange={(e) =>
                      setSearchTerm(
                        e.target.value
                      )
                    }
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 transition ${inputClass}`}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">

                  <button
                    onClick={() =>
                      setShowOnlyOwing(
                        !showOnlyOwing
                      )
                    }
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all border ${
                      showOnlyOwing
                        ? 'bg-red-600 border-red-600 text-white hover:bg-red-700'
                        : isDark
                        ? 'bg-white/10 border-white/10 text-gray-300 hover:bg-white/20'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <FunnelIcon className="h-5 w-5" />

                    {showOnlyOwing
                      ? 'Showing Owing Only'
                      : 'Show All'}
                  </button>

                  <select
                    value={
                      selectedClassFilter
                    }
                    onChange={(e) =>
                      setSelectedClassFilter(
                        e.target.value
                      )
                    }
                    className={`px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 transition ${inputClass}`}
                  >
                    <option value="">
                      All Classes
                    </option>

                    {classes.map(
                      (cls) => (
                        <option
                          key={cls}
                          value={cls}
                        >
                          {cls}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              {/* Students Table */}

              <div
                className={`rounded-2xl overflow-hidden ${glassCard}`}
              >
                <div className="overflow-x-auto">
                  <table className="min-w-full">

                    <thead>
                      <tr
                        className={`border-b ${tableHeaderClass} ${
                          isDark
                            ? 'border-white/10'
                            : 'border-gray-200'
                        }`}
                      >
                        <th className="py-4 pl-6 pr-3 text-left text-sm font-semibold">
                          Student
                        </th>

                        <th className="px-3 py-4 text-left text-sm font-semibold">
                          Admission No
                        </th>

                        <th className="px-3 py-4 text-left text-sm font-semibold">
                          Class
                        </th>

                        <th className="px-3 py-4 text-left text-sm font-semibold">
                          Parent
                        </th>

                        <th className="px-3 py-4 text-left text-sm font-semibold">
                          Status
                        </th>

                        <th className="px-3 py-4 text-left text-sm font-semibold">
                          Amount Owed
                        </th>

                        <th className="relative py-4 pl-3 pr-6 text-right text-sm font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody
                      className={`divide-y ${
                        isDark
                          ? 'divide-white/10'
                          : 'divide-gray-200'
                      }`}
                    >
                      {paginatedStudents.length ===
                      0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className={`py-12 text-center ${mutedText}`}
                          >
                            No students
                            found matching
                            your filters.
                          </td>
                        </tr>
                      ) : (
                        paginatedStudents.map(
                          (student) => {
                            const feeDetails =
                              getStudentFeeDetails(
                                student
                              );

                            const totalOwed =
                              feeDetails.reduce(
                                (
                                  sum,
                                  detail
                                ) =>
                                  sum +
                                  detail.owed,
                                0
                              );

                            const isFullyPaid =
                              totalOwed ===
                              0;

                            return (
                              <tr
                                key={
                                  student.id
                                }
                                className={`transition-colors ${tableRowClass}`}
                              >
                                <td
                                  className={`whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium ${headingText}`}
                                >
                                  {student.name}
                                </td>

                                <td
                                  className={`whitespace-nowrap px-3 py-4 text-sm ${bodyText}`}
                                >
                                  {
                                    student.admissionNumber
                                  }
                                </td>

                                <td
                                  className={`whitespace-nowrap px-3 py-4 text-sm ${bodyText}`}
                                >
                                  {
                                    student.className
                                  }
                                </td>

                                <td
                                  className={`whitespace-nowrap px-3 py-4 text-sm ${bodyText}`}
                                >
                                  {
                                    student.parentName
                                  }
                                </td>

                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                  {isFullyPaid ? (
                                    <span className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
                                      <CheckCircleIcon className="h-4 w-4" />
                                      Paid
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium">
                                      <span className="h-2 w-2 rounded-full bg-red-500" />
                                      Owing
                                    </span>
                                  )}
                                </td>

                                <td
                                  className={`whitespace-nowrap px-3 py-4 text-sm font-semibold ${
                                    totalOwed >
                                    0
                                      ? isDark
                                        ? 'text-red-400'
                                        : 'text-red-600'
                                      : headingText
                                  }`}
                                >
                                  ₦
                                  {totalOwed.toLocaleString()}
                                </td>

                                <td className="whitespace-nowrap py-4 pl-3 pr-6 text-right">
                                  <button
                                    onClick={() =>
                                      viewPaymentDetails(
                                        student
                                      )
                                    }
                                    className={`mr-1 p-2 rounded-lg transition-colors ${
                                      isDark
                                        ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10'
                                        : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                                    }`}
                                    title="View Details"
                                  >
                                    <EyeIcon className="h-5 w-5" />
                                  </button>

                                  {!isFullyPaid && (
                                    <>
                                      <button
                                        onClick={() =>
                                          sendMessageToParent(
                                            student
                                          )
                                        }
                                        className={`mr-1 p-2 rounded-lg transition-colors ${
                                          isDark
                                            ? 'text-gray-400 hover:text-green-400 hover:bg-green-500/10'
                                            : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                                        }`}
                                        title="Send Message"
                                      >
                                        <EnvelopeIcon className="h-5 w-5" />
                                      </button>

                                      <button
                                        onClick={() =>
                                          openPaymentModal(
                                            student
                                          )
                                        }
                                        className={`p-2 rounded-lg transition-colors ${
                                          isDark
                                            ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10'
                                            : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                                        }`}
                                        title="Record Payment"
                                      >
                                        <CreditCardIcon className="h-5 w-5" />
                                      </button>
                                    </>
                                  )}
                                </td>
                              </tr>
                            );
                          }
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}

              {totalPages > 1 && (
                <div
                  className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 rounded-xl border ${cardBackground}`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm ${bodyText}`}
                    >
                      Page{' '}
                      {currentPage}{' '}
                      of {totalPages}
                    </span>

                    <select
                      value={
                        rowsPerPage
                      }
                      onChange={(e) => {
                        setRowsPerPage(
                          Number(
                            e.target
                              .value
                          )
                        );
                        setCurrentPage(
                          1
                        );
                      }}
                      className={`px-2.5 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 ${inputClass}`}
                    >
                      <option value={5}>
                        5 per page
                      </option>

                      <option value={10}>
                        10 per page
                      </option>

                      <option value={20}>
                        20 per page
                      </option>

                      <option value={50}>
                        50 per page
                      </option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handlePageChange(
                          currentPage -
                            1
                        )
                      }
                      disabled={
                        currentPage ===
                        1
                      }
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        isDark
                          ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      Previous
                    </button>

                    <button
                      onClick={() =>
                        handlePageChange(
                          currentPage +
                            1
                        )
                      }
                      disabled={
                        currentPage ===
                        totalPages
                      }
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        isDark
                          ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ======================================================
          ADD / EDIT FEE MODAL
      ====================================================== */}

      <AnimatePresence>
        {showFeeModal && (
          <>
            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              onClick={() =>
                setShowFeeModal(
                  false
                )
              }
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />

            <motion.div
              initial={{
                scale: 0.95,
                opacity: 0,
              }}
              animate={{
                scale: 1,
                opacity: 1,
              }}
              exit={{
                scale: 0.95,
                opacity: 0,
              }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div
                className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden ${cardBackground}`}
              >

                {/* Modal Header */}

                <div
                  className={`flex justify-between items-center p-6 border-b ${
                    isDark
                      ? 'border-gray-700'
                      : 'border-gray-200'
                  }`}
                >
                  <div>
                    <h3
                      className={`text-xl font-bold ${headingText}`}
                    >
                      {editingFee
                        ? 'Edit Fee Structure'
                        : 'Add Fee Structure'}
                    </h3>

                    <p
                      className={`text-sm mt-1 ${mutedText}`}
                    >
                      Configure fees for a
                      class and academic
                      term.
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      setShowFeeModal(
                        false
                      )
                    }
                    className={`p-2 rounded-full transition ${
                      isDark
                        ? 'hover:bg-gray-800 text-gray-400'
                        : 'hover:bg-gray-100 text-gray-500'
                    }`}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Modal Body */}

                <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <div>
                      <label
                        className={`block text-sm font-medium mb-1.5 ${bodyText}`}
                      >
                        Class *
                      </label>

                      <select
                        value={
                          feeForm.className
                        }
                        onChange={(e) =>
                          setFeeForm({
                            ...feeForm,
                            className:
                              e.target
                                .value,
                          })
                        }
                        className={`w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 ${inputClass}`}
                      >
                        <option value="">
                          Select a class
                        </option>

                        {availableClasses.map(
                          (cls) => (
                            <option
                              key={
                                cls.id
                              }
                              value={
                                cls.name
                              }
                            >
                              {cls.name}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label
                        className={`block text-sm font-medium mb-1.5 ${bodyText}`}
                      >
                        Term *
                      </label>

                      <select
                        value={
                          feeForm.term
                        }
                        onChange={(e) =>
                          setFeeForm({
                            ...feeForm,
                            term:
                              e.target
                                .value,
                          })
                        }
                        className={`w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 ${inputClass}`}
                      >
                        <option value="First Term">
                          First Term
                        </option>

                        <option value="Second Term">
                          Second Term
                        </option>

                        <option value="Third Term">
                          Third Term
                        </option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium mb-1.5 ${bodyText}`}
                    >
                      Deadline *
                    </label>

                    <input
                      type="date"
                      value={
                        feeForm.deadline
                      }
                      onChange={(e) =>
                        setFeeForm({
                          ...feeForm,
                          deadline:
                            e.target
                              .value,
                        })
                      }
                      className={`w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 ${inputClass}`}
                    />
                  </div>

                  {/* Breakdown */}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label
                        className={`block text-sm font-medium ${bodyText}`}
                      >
                        Cost Breakdown
                      </label>

                      <span
                        className={`text-xs ${mutedText}`}
                      >
                        Add each fee item
                        separately
                      </span>
                    </div>

                    <div className="space-y-2">
                      {feeForm.breakdown.map(
                        (
                          item,
                          idx
                        ) => (
                          <div
                            key={idx}
                            className="flex gap-2"
                          >
                            <input
                              type="text"
                              value={
                                item.name
                              }
                              onChange={(
                                e
                              ) =>
                                updateBreakdown(
                                  idx,
                                  'name',
                                  e.target
                                    .value
                                )
                              }
                              placeholder="Item name"
                              className={`flex-1 px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 ${inputClass}`}
                            />

                            <input
                              type="number"
                              min="0"
                              value={
                                item.amount
                              }
                              onChange={(
                                e
                              ) =>
                                updateBreakdown(
                                  idx,
                                  'amount',
                                  Number(
                                    e.target
                                      .value
                                  )
                                )
                              }
                              placeholder="Amount"
                              className={`w-32 px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 ${inputClass}`}
                            />

                            {feeForm
                              .breakdown
                              .length >
                              1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  removeBreakdownItem(
                                    idx
                                  )
                                }
                                className={`p-2.5 rounded-lg transition ${
                                  isDark
                                    ? 'text-red-400 hover:bg-red-900/30'
                                    : 'text-red-500 hover:bg-red-50'
                                }`}
                                title="Remove item"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        )
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={
                        addBreakdownItem
                      }
                      className={`mt-3 text-sm font-medium ${
                        isDark
                          ? 'text-blue-400 hover:text-blue-300'
                          : 'text-blue-600 hover:text-blue-700'
                      }`}
                    >
                      + Add Item
                    </button>
                  </div>

                  {/* Total */}

                  <div
                    className={`p-4 rounded-xl border ${
                      isDark
                        ? 'bg-blue-500/10 border-blue-500/20'
                        : 'bg-blue-50 border-blue-100'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span
                        className={`text-sm font-medium ${bodyText}`}
                      >
                        Total Amount
                      </span>

                      <span
                        className={`text-xl font-bold ${
                          isDark
                            ? 'text-blue-400'
                            : 'text-blue-700'
                        }`}
                      >
                        ₦
                        {calculateTotal().toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer */}

                <div
                  className={`flex justify-end gap-3 p-6 border-t ${
                    isDark
                      ? 'border-gray-700'
                      : 'border-gray-200'
                  }`}
                >
                  <button
                    onClick={() =>
                      setShowFeeModal(
                        false
                      )
                    }
                    className={`px-4 py-2.5 rounded-lg font-medium transition ${
                      isDark
                        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={
                      handleSaveFee
                    }
                    disabled={
                      submitting
                    }
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium transition"
                  >
                    {submitting && (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}

                    {submitting
                      ? 'Saving...'
                      : editingFee
                      ? 'Update'
                      : 'Add'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ======================================================
          PAYMENT DETAILS MODAL
      ====================================================== */}

      <AnimatePresence>
        {showPaymentDetailsModal &&
          selectedStudent && (
            <>
              <motion.div
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                exit={{
                  opacity: 0,
                }}
                onClick={() =>
                  setShowPaymentDetailsModal(
                    false
                  )
                }
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              />

              <motion.div
                initial={{
                  scale: 0.95,
                  opacity: 0,
                }}
                animate={{
                  scale: 1,
                  opacity: 1,
                }}
                exit={{
                  scale: 0.95,
                  opacity: 0,
                }}
                className="fixed inset-0 flex items-center justify-center z-50 p-4"
              >
                <div
                  className={`w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden ${cardBackground}`}
                >

                  <div
                    className={`flex justify-between items-center p-6 border-b ${
                      isDark
                        ? 'border-gray-700'
                        : 'border-gray-200'
                    }`}
                  >
                    <div>
                      <h3
                        className={`text-xl font-bold ${headingText}`}
                      >
                        Fee Details –{' '}
                        {
                          selectedStudent.name
                        }
                      </h3>

                      <p
                        className={`text-sm mt-1 ${mutedText}`}
                      >
                        Current academic
                        session fee
                        information.
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        setShowPaymentDetailsModal(
                          false
                        )
                      }
                      className={`p-2 rounded-full ${
                        isDark
                          ? 'hover:bg-gray-800 text-gray-400'
                          : 'hover:bg-gray-100 text-gray-500'
                      }`}
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="p-6 max-h-[70vh] overflow-y-auto">

                    <div
                      className={`grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 p-4 rounded-xl ${
                        isDark
                          ? 'bg-white/5'
                          : 'bg-gray-50 border border-gray-100'
                      }`}
                    >
                      <div
                        className={`text-sm ${bodyText}`}
                      >
                        <strong>
                          Admission No:
                        </strong>{' '}
                        {
                          selectedStudent.admissionNumber
                        }
                      </div>

                      <div
                        className={`text-sm ${bodyText}`}
                      >
                        <strong>
                          Class:
                        </strong>{' '}
                        {
                          selectedStudent.className
                        }
                      </div>

                      <div
                        className={`text-sm ${bodyText}`}
                      >
                        <strong>
                          Parent:
                        </strong>{' '}
                        {
                          selectedStudent.parentName
                        }
                      </div>

                      <div
                        className={`text-sm break-all ${bodyText}`}
                      >
                        <strong>
                          Email:
                        </strong>{' '}
                        {
                          selectedStudent.parentEmail
                        }
                      </div>

                      <div
                        className={`text-sm ${bodyText}`}
                      >
                        <strong>
                          Phone:
                        </strong>{' '}
                        {
                          selectedStudent.parentPhone
                        }
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">

                        <thead>
                          <tr
                            className={`border-b ${
                              isDark
                                ? 'border-gray-700'
                                : 'border-gray-200'
                            }`}
                          >
                            <th
                              className={`text-left py-3 font-semibold ${bodyText}`}
                            >
                              Fee Item
                            </th>

                            <th
                              className={`text-left py-3 font-semibold ${bodyText}`}
                            >
                              Term
                            </th>

                            <th
                              className={`text-right py-3 font-semibold ${bodyText}`}
                            >
                              Total
                            </th>

                            <th
                              className={`text-right py-3 font-semibold ${bodyText}`}
                            >
                              Paid
                            </th>

                            <th
                              className={`text-right py-3 font-semibold ${bodyText}`}
                            >
                              Owed
                            </th>

                            <th
                              className={`text-center py-3 font-semibold ${bodyText}`}
                            >
                              Status
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {getStudentFeeDetails(
                            selectedStudent
                          ).map(
                            (
                              detail,
                              idx
                            ) => (
                              <tr
                                key={`${detail.fee.id}-${idx}`}
                                className={`border-b ${
                                  isDark
                                    ? 'border-gray-800'
                                    : 'border-gray-100'
                                }`}
                              >
                                <td
                                  className={`py-3 ${bodyText}`}
                                >
                                  {detail.fee.breakdown
                                    .map(
                                      (
                                        b
                                      ) =>
                                        b.name
                                    )
                                    .join(
                                      ', '
                                    )}
                                </td>

                                <td
                                  className={`py-3 ${bodyText}`}
                                >
                                  {
                                    detail
                                      .fee
                                      .term
                                  }
                                </td>

                                <td
                                  className={`text-right py-3 ${bodyText}`}
                                >
                                  ₦
                                  {detail.fee.totalAmount.toLocaleString()}
                                </td>

                                <td
                                  className={`text-right py-3 ${
                                    isDark
                                      ? 'text-green-400'
                                      : 'text-green-600'
                                  }`}
                                >
                                  ₦
                                  {detail.paid.toLocaleString()}
                                </td>

                                <td
                                  className={`text-right py-3 font-semibold ${
                                    detail.owed >
                                    0
                                      ? isDark
                                        ? 'text-red-400'
                                        : 'text-red-600'
                                      : headingText
                                  }`}
                                >
                                  ₦
                                  {detail.owed.toLocaleString()}
                                </td>

                                <td className="text-center py-3">
                                  <span
                                    className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                                      detail.status ===
                                      'Paid'
                                        ? isDark
                                          ? 'bg-green-500/10 text-green-400'
                                          : 'bg-green-50 text-green-700'
                                        : detail.status ===
                                          'Partial'
                                        ? isDark
                                          ? 'bg-yellow-500/10 text-yellow-400'
                                          : 'bg-yellow-50 text-yellow-700'
                                        : isDark
                                        ? 'bg-red-500/10 text-red-400'
                                        : 'bg-red-50 text-red-700'
                                    }`}
                                  >
                                    {
                                      detail.status
                                    }
                                  </span>
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div
                    className={`flex justify-end p-6 border-t ${
                      isDark
                        ? 'border-gray-700'
                        : 'border-gray-200'
                    }`}
                  >
                    <button
                      onClick={() =>
                        setShowPaymentDetailsModal(
                          false
                        )
                      }
                      className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
      </AnimatePresence>

      {/* ======================================================
          SEND MESSAGE MODAL
      ====================================================== */}

      <AnimatePresence>
        {showMessageModal &&
          selectedStudent && (
            <>
              <motion.div
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                exit={{
                  opacity: 0,
                }}
                onClick={() =>
                  setShowMessageModal(
                    false
                  )
                }
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              />

              <motion.div
                initial={{
                  scale: 0.95,
                  opacity: 0,
                }}
                animate={{
                  scale: 1,
                  opacity: 1,
                }}
                exit={{
                  scale: 0.95,
                  opacity: 0,
                }}
                className="fixed inset-0 flex items-center justify-center z-50 p-4"
              >
                <div
                  className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${cardBackground}`}
                >

                  <div
                    className={`flex justify-between items-center p-6 border-b ${
                      isDark
                        ? 'border-gray-700'
                        : 'border-gray-200'
                    }`}
                  >
                    <h3
                      className={`text-xl font-bold ${headingText}`}
                    >
                      Send Message to
                      Parent
                    </h3>

                    <button
                      onClick={() =>
                        setShowMessageModal(
                          false
                        )
                      }
                      className={`p-2 rounded-full ${
                        isDark
                          ? 'hover:bg-gray-800 text-gray-400'
                          : 'hover:bg-gray-100 text-gray-500'
                      }`}
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="p-6">

                    <div
                      className={`mb-5 p-4 rounded-xl ${
                        isDark
                          ? 'bg-white/5'
                          : 'bg-gray-50 border border-gray-100'
                      }`}
                    >
                      <p
                        className={`text-sm font-medium ${headingText}`}
                      >
                        To:{' '}
                        {
                          selectedStudent.parentName
                        }
                      </p>

                      <p
                        className={`text-xs mt-1 ${mutedText}`}
                      >
                        {messageType ===
                        'email'
                          ? `Email: ${selectedStudent.parentEmail}`
                          : `SMS: ${selectedStudent.parentPhone}`}
                      </p>
                    </div>

                    <div className="mb-5">
                      <label
                        className={`block text-sm font-medium mb-2 ${bodyText}`}
                      >
                        Send via
                      </label>

                      <div className="flex gap-5">

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            value="email"
                            checked={
                              messageType ===
                              'email'
                            }
                            onChange={() =>
                              setMessageType(
                                'email'
                              )
                            }
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />

                          <span
                            className={`text-sm ${bodyText}`}
                          >
                            <EnvelopeIcon className="h-4 w-4 inline mr-1" />
                            Email
                          </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            value="sms"
                            checked={
                              messageType ===
                              'sms'
                            }
                            onChange={() =>
                              setMessageType(
                                'sms'
                              )
                            }
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />

                          <span
                            className={`text-sm ${bodyText}`}
                          >
                            <DevicePhoneMobileIcon className="h-4 w-4 inline mr-1" />
                            SMS
                          </span>
                        </label>
                      </div>
                    </div>

                    <textarea
                      rows={7}
                      value={
                        messageText
                      }
                      onChange={(e) =>
                        setMessageText(
                          e.target
                            .value
                        )
                      }
                      className={`w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 resize-none ${inputClass}`}
                      placeholder="Enter your message..."
                    />
                  </div>

                  <div
                    className={`flex justify-end gap-3 p-6 border-t ${
                      isDark
                        ? 'border-gray-700'
                        : 'border-gray-200'
                    }`}
                  >
                    <button
                      onClick={() =>
                        setShowMessageModal(
                          false
                        )
                      }
                      disabled={
                        sendingMessage
                      }
                      className={`px-4 py-2.5 rounded-lg font-medium ${
                        isDark
                          ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } disabled:opacity-50`}
                    >
                      Cancel
                    </button>

                    <button
                      onClick={
                        handleSendMessage
                      }
                      disabled={
                        sendingMessage
                      }
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"
                    >
                      {sendingMessage && (
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      )}

                      {sendingMessage
                        ? 'Sending...'
                        : 'Send'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
      </AnimatePresence>

      {/* ======================================================
          RECORD PAYMENT MODAL
      ====================================================== */}

      <AnimatePresence>
        {showPaymentModal &&
          paymentStudent && (
            <>
              <motion.div
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                exit={{
                  opacity: 0,
                }}
                onClick={() =>
                  setShowPaymentModal(
                    false
                  )
                }
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              />

              <motion.div
                initial={{
                  scale: 0.95,
                  opacity: 0,
                }}
                animate={{
                  scale: 1,
                  opacity: 1,
                }}
                exit={{
                  scale: 0.95,
                  opacity: 0,
                }}
                className="fixed inset-0 flex items-center justify-center z-50 p-4"
              >
                <div
                  className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden ${cardBackground}`}
                >

                  {/* Header */}

                  <div
                    className={`flex justify-between items-center p-6 border-b ${
                      isDark
                        ? 'border-gray-700'
                        : 'border-gray-200'
                    }`}
                  >
                    <div>
                      <h3
                        className={`text-xl font-bold ${headingText}`}
                      >
                        Record Payment –
                        {` ${paymentStudent.name}`}
                      </h3>

                      <p
                        className={`text-sm mt-1 ${mutedText}`}
                      >
                        Select the outstanding
                        fee items to pay.
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        setShowPaymentModal(
                          false
                        )
                      }
                      className={`p-2 rounded-full ${
                        isDark
                          ? 'hover:bg-gray-800 text-gray-400'
                          : 'hover:bg-gray-100 text-gray-500'
                      }`}
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Body */}

                  <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

                    {/* Student Information */}

                    <div
                      className={`grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl ${
                        isDark
                          ? 'bg-white/5'
                          : 'bg-gray-50 border border-gray-100'
                      }`}
                    >
                      <div
                        className={`text-sm ${bodyText}`}
                      >
                        <strong>
                          Admission No:
                        </strong>{' '}
                        {
                          paymentStudent.admissionNumber
                        }
                      </div>

                      <div
                        className={`text-sm ${bodyText}`}
                      >
                        <strong>
                          Class:
                        </strong>{' '}
                        {
                          paymentStudent.className
                        }
                      </div>

                      <div
                        className={`text-sm ${bodyText}`}
                      >
                        <strong>
                          Parent:
                        </strong>{' '}
                        {
                          paymentStudent.parentName
                        }
                      </div>

                      <div
                        className={`text-sm ${bodyText}`}
                      >
                        <strong>
                          Phone:
                        </strong>{' '}
                        {
                          paymentStudent.parentPhone
                        }
                      </div>
                    </div>

                    {/* Outstanding Items */}

                    <div
                      className={`border-t pt-5 ${
                        isDark
                          ? 'border-gray-700'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <label
                          className={`text-sm font-semibold ${bodyText}`}
                        >
                          Select Fee Items
                          to Pay
                        </label>

                        <button
                          onClick={
                            selectAllItems
                          }
                          className={`text-xs font-medium ${
                            isDark
                              ? 'text-blue-400 hover:text-blue-300'
                              : 'text-blue-600 hover:text-blue-700'
                          }`}
                        >
                          Select All
                          Outstanding
                        </button>
                      </div>

                      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">

                        {(() => {
                          const studentFees =
                            filteredFeeStructures.filter(
                              (
                                fee
                              ) =>
                                fee.className ===
                                paymentStudent.className
                            );

                          const allItems: {
                            feeId: string;
                            itemName: string;
                            owed: number;
                          }[] = [];

                          for (const fee of studentFees) {
                            const itemOwed =
                              getItemOwedAmounts(
                                paymentStudent,
                                fee,
                                filteredPayments
                              );

                            for (const item of itemOwed) {
                              if (
                                item.owed >
                                0
                              ) {
                                allItems.push(
                                  {
                                    feeId:
                                      fee.id,
                                    itemName:
                                      item.name,
                                    owed:
                                      item.owed,
                                  }
                                );
                              }
                            }
                          }

                          if (
                            allItems.length ===
                            0
                          ) {
                            return (
                              <div
                                className={`p-6 text-center rounded-xl ${mutedText} ${
                                  isDark
                                    ? 'bg-white/5'
                                    : 'bg-gray-50'
                                }`}
                              >
                                No outstanding
                                fee items.
                              </div>
                            );
                          }

                          return allItems.map(
                            ({
                              feeId,
                              itemName,
                              owed,
                            }) => (
                              <div
                                key={`${feeId}-${itemName}`}
                                className={`p-4 rounded-xl border ${
                                  isDark
                                    ? 'bg-white/5 border-white/10'
                                    : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                <div className="flex justify-between items-center">

                                  <div>
                                    <span
                                      className={`font-medium ${headingText}`}
                                    >
                                      {
                                        itemName
                                      }
                                    </span>

                                    <div
                                      className={`text-xs mt-1 ${mutedText}`}
                                    >
                                      Owed: ₦
                                      {owed.toLocaleString()}
                                    </div>
                                  </div>

                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <span
                                      className={`text-sm ${bodyText}`}
                                    >
                                      Pay
                                    </span>

                                    <input
                                      type="checkbox"
                                      checked={isItemSelected(
                                        feeId,
                                        itemName
                                      )}
                                      onChange={(
                                        e
                                      ) =>
                                        toggleItemSelection(
                                          feeId,
                                          itemName,
                                          e
                                            .target
                                            .checked
                                        )
                                      }
                                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                  </label>
                                </div>

                                {isItemSelected(
                                  feeId,
                                  itemName
                                ) && (
                                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <label
                                      className={`block text-xs mb-1.5 ${mutedText}`}
                                    >
                                      Amount to Pay
                                      (₦)
                                    </label>

                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        min="0"
                                        max={
                                          owed
                                        }
                                        value={
                                          selectedItems.find(
                                            (
                                              item
                                            ) =>
                                              item.feeId ===
                                                feeId &&
                                              item.itemName ===
                                                itemName
                                          )
                                            ?.amount ??
                                          owed
                                        }
                                        onChange={(
                                          e
                                        ) =>
                                          updateItemAmount(
                                            feeId,
                                            itemName,
                                            Number(
                                              e
                                                .target
                                                .value
                                            )
                                          )
                                        }
                                        className={`w-40 px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 ${inputClass}`}
                                      />

                                      <button
                                        onClick={() =>
                                          updateItemAmount(
                                            feeId,
                                            itemName,
                                            owed
                                          )
                                        }
                                        className={`text-xs font-medium ${
                                          isDark
                                            ? 'text-blue-400'
                                            : 'text-blue-600'
                                        }`}
                                      >
                                        Full
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          );
                        })()}
                      </div>
                    </div>

                    {/* Payment Details */}

                    <div
                      className={`border-t pt-5 ${
                        isDark
                          ? 'border-gray-700'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                        <div>
                          <label
                            className={`block text-sm font-medium mb-1.5 ${bodyText}`}
                          >
                            Payment Method
                          </label>

                          <select
                            value={
                              paymentMethod
                            }
                            onChange={(
                              e
                            ) =>
                              setPaymentMethod(
                                e.target
                                  .value
                              )
                            }
                            className={`w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 ${inputClass}`}
                          >
                            <option value="cash">
                              Cash
                            </option>

                            <option value="bank_transfer">
                              Bank Transfer
                            </option>

                            <option value="card">
                              Card
                            </option>

                            <option value="cheque">
                              Cheque
                            </option>
                          </select>
                        </div>

                        <div>
                          <label
                            className={`block text-sm font-medium mb-1.5 ${bodyText}`}
                          >
                            Reference
                            (Optional)
                          </label>

                          <input
                            type="text"
                            value={
                              paymentReference
                            }
                            onChange={(
                              e
                            ) =>
                              setPaymentReference(
                                e.target
                                  .value
                              )
                            }
                            className={`w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 ${inputClass}`}
                            placeholder="Receipt / Transaction ID"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Total Payment */}

                    <div
                      className={`p-4 rounded-xl border ${
                        isDark
                          ? 'bg-green-500/10 border-green-500/20'
                          : 'bg-green-50 border-green-100'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span
                          className={`text-sm font-medium ${bodyText}`}
                        >
                          Total Payment
                        </span>

                        <span
                          className={`text-xl font-bold ${
                            isDark
                              ? 'text-green-400'
                              : 'text-green-700'
                          }`}
                        >
                          ₦
                          {totalPaymentAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}

                  <div
                    className={`flex justify-end gap-3 p-6 border-t ${
                      isDark
                        ? 'border-gray-700'
                        : 'border-gray-200'
                    }`}
                  >
                    <button
                      onClick={() =>
                        setShowPaymentModal(
                          false
                        )
                      }
                      disabled={
                        paymentSubmitting
                      }
                      className={`px-4 py-2.5 rounded-lg font-medium ${
                        isDark
                          ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } disabled:opacity-50`}
                    >
                      Cancel
                    </button>

                    <button
                      onClick={
                        handleRecordPayment
                      }
                      disabled={
                        paymentSubmitting
                      }
                      className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 font-medium transition"
                    >
                      {paymentSubmitting && (
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      )}

                      {paymentSubmitting
                        ? 'Processing...'
                        : 'Record Payment'}
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