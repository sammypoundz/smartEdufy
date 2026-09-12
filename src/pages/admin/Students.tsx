import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../utils/api";
import { formatArm } from "../../utils/arm";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import {
  UsersIcon,
  UserGroupIcon,
  UserIcon,
  ChartBarIcon,
  PlusIcon,
  ArrowUpTrayIcon,
  EyeIcon,
  AcademicCapIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  StopIcon,
  PlayIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import {
  exportToExcel,
  exportToPDF,
  type ExportColumn,
} from "../../utils/exportData";
import ExportButtons from "../../components/ExportButtons";
import {
  useStudents,
  useClasses,
  useSuspendStudent,
  useDeleteStudent,
  useBulkDeleteStudents,
  useInvalidateStudents,
} from "../../hooks/useStudents";

// Types are now imported from the shared hooks module
import type { Student } from "../../hooks/useStudents";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

const SUMMARY_LIMIT = 5;

export default function Students() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const navigate = useNavigate();
  const { data: queryStudents, isLoading: studentsLoading } = useStudents(token);
  const { data: queryClasses, isLoading: classesLoading } = useClasses(token);
  const suspendMutation = useSuspendStudent(token);
  const deleteMutation = useDeleteStudent(token);
  const bulkDeleteMutation = useBulkDeleteStudents(token);
  const invalidateStudents = useInvalidateStudents();

  const students = queryStudents ?? [];
  const classes = queryClasses ?? [];
  const loading = studentsLoading || classesLoading;

  const studentExportColumns: ExportColumn<Student>[] = [
    { header: "Name", value: (s) => s.name },
    { header: "Admission Number", value: (s) => s.admissionNumber || "" },
    { header: "Gender", value: (s) => s.gender },
    { header: "Class", value: (s) => s.class?.name || "" },
    { header: "Arm", value: (s) => s.arm?.letter || "" },
    { header: "Parent", value: (s) => s.parent?.name || "" },
    { header: "Parent Phone", value: (s) => s.parent?.phone || "" },
    {
      header: "Status",
      value: (s) => (s.isActive === false ? "Inactive" : "Active"),
    },
  ];
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedArmId, setSelectedArmId] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkDrawer, setShowBulkDrawer] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newStudentForm, setNewStudentForm] = useState({
    name: "",
    gender: "male",
    admissionNumber: "",
    classId: "",
    armId: "",
    // When on, the admission number is auto-generated from the admin's
    // ID Generator config (Settings → ID Generator) instead of typed in.
    useDefaultId: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  /*
   * Preview the next auto-generated admission ID from the admin's ID
   * Generator config (Settings → ID Generator). Only fetched while the
   * "use default ID generator" toggle is on in the Add Student modal.
   */
  const [nextAutoId, setNextAutoId] = useState<string | null>(null);
  useEffect(() => {
    if (!showAddModal || !newStudentForm.useDefaultId || !token) return;
    let cancelled = false;
    api
      .get("/users/next-id?role=STUDENT", token)
      .then(async (res) => {
        if (!res.ok || cancelled) return setNextAutoId(null);
        const data = await res.json();
        if (!cancelled) setNextAutoId(data.nextId ?? null);
      })
      .catch(() => {
        if (!cancelled) setNextAutoId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [showAddModal, newStudentForm.useDefaultId, token]);
  const [uploading, setUploading] = useState(false);
  const [bulkClassId, setBulkClassId] = useState<string>("");
  const [bulkArmId, setBulkArmId] = useState<string>("");

  // All students modal states
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Create a map of arm ID to alias from the classes data
  const armAliasMap = useMemo(() => {
    const map = new Map<string, string>();
    classes.forEach((cls) => {
      cls.arms?.forEach((arm) => {
        if (arm.alias) {
          map.set(arm.id, arm.alias);
        }
      });
    });
    return map;
  }, [classes]);

  // Helper function to get arm display name
  const getArmDisplayName = (
    arm: { id: string; letter: string; alias?: string } | undefined,
  ): string => {
    if (!arm) return "-";

    // If the arm already has an alias, use it
    if (arm.alias) {
      return `Arm ${arm.letter} (${arm.alias})`;
    }

    // Look up the alias from the classes data
    const alias = armAliasMap.get(arm.id);
    if (alias) {
      return `Arm ${arm.letter} (${alias})`;
    }

    return `Arm ${arm.letter}`;
  };

  // For dropdowns - shows the arm with its alias when available
  const formatArmDropdown = (arm: {
    id: string;
    letter: string;
    alias?: string;
  }): string => {
    return formatArm(arm, armAliasMap);
  };

  // Keep the modal's snapshot of students in sync with the cached query data
  useEffect(() => {
    if (showAllModal)
      setAllStudents(
        students.filter(
          (s) =>
            (!selectedClassId || s.class?.id === selectedClassId) &&
            (!selectedArmId || s.arm?.id === selectedArmId),
        ),
      );
  }, [students, showAllModal, selectedClassId, selectedArmId]);

  // Compute growth data from student createdAt
  const computeGrowthData = () => {
    const yearMap = new Map<number, number>();
    students.forEach((student) => {
      if (student.createdAt) {
        const year = new Date(student.createdAt).getFullYear();
        yearMap.set(year, (yearMap.get(year) || 0) + 1);
      }
    });
    const years = Array.from(yearMap.keys()).sort();
    let cumulative = 0;
    return years.map((year) => {
      cumulative += yearMap.get(year) || 0;
      return { year: year.toString(), students: cumulative };
    });
  };
  const growthData = computeGrowthData();

  // Filtered students for main table
  const filteredStudents = students.filter((student) => {
    if (selectedClassId && student.class?.id !== selectedClassId) return false;
    if (selectedArmId && student.arm?.id !== selectedArmId) return false;
    return true;
  });

  // Class/arm context used for export file names and PDF titles
  const classNameSuffix =
    classes.find((c) => c.id === selectedClassId)?.name?.replace(/\s+/g, "") ||
    "";
  const armLetterSuffix =
    classes
      .find((c) => c.id === selectedClassId)
      ?.arms?.find((a) => a.id === selectedArmId)?.letter || "";

  // Summary students (first SUMMARY_LIMIT)
  const summaryStudents = filteredStudents.slice(0, SUMMARY_LIMIT);
  const hasMoreStudents = filteredStudents.length > SUMMARY_LIMIT;

  // Statistics
  const totalStudents = filteredStudents.length;
  const maleCount = filteredStudents.filter((s) => s.gender === "male").length;
  const femaleCount = filteredStudents.filter(
    (s) => s.gender === "female",
  ).length;
  const classDistribution = filteredStudents.reduce(
    (acc, student) => {
      const className = student.class?.name || "Unassigned";
      acc[className] = (acc[className] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const classChartData = Object.entries(classDistribution).map(
    ([name, value]) => ({ name, value }),
  );

  // Create student
  const handleCreateStudent = async () => {
    if (!newStudentForm.name.trim()) {
      toast.error("Student name is required");
      return;
    }
    setIsSubmitting(true);
    try {
      const createRes = await api.post(
        "/students",
        {
          name: newStudentForm.name,
          gender: newStudentForm.gender,
          admissionNumber: newStudentForm.useDefaultId
            ? undefined
            : newStudentForm.admissionNumber || undefined,
          useDefaultId: newStudentForm.useDefaultId,
          classId: newStudentForm.classId || undefined,
          armId: newStudentForm.armId || undefined,
        },
        token,
      );
      if (!createRes.ok) {
        const txt = await createRes.text();
        let msg: any = txt || `HTTP ${createRes.status}`;
        try {
          const errData = JSON.parse(txt);
          msg =
            (Array.isArray(errData?.error)
              ? errData.error[0]?.message
              : errData?.error) || txt;
        } catch {
          // not JSON — use raw text
        }
        throw new Error(typeof msg === "string" ? msg : "Failed to create student");
      }
      toast.success("Student created");
      await invalidateStudents();
      setShowAddModal(false);
      setNewStudentForm({
        name: "",
        gender: "male",
        admissionNumber: "",
        classId: "",
        armId: "",
        useDefaultId: true,
      });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download template
  const downloadTemplate = () => {
    if (!bulkClassId) {
      toast.error(
        "Please select a default class before downloading the template",
      );
      return;
    }
    const selectedClass = classes.find((c) => c.id === bulkClassId);
    const selectedArm = classes
      .find((c) => c.id === bulkClassId)
      ?.arms?.find((a) => a.id === bulkArmId);
    const className = selectedClass?.name?.replace(/\s+/g, "") || "Class";
    const armLetter = selectedArm?.letter || "";
    const fileName = armLetter
      ? `${className}_Arm${armLetter}_studentsSheet.xlsx`
      : `${className}_studentsSheet.xlsx`;

    const templateData = [
      { name: "John Doe", gender: "male", admissionNumber: "ADM001" },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students_Template");
    XLSX.writeFile(wb, fileName);
    toast.success(
      `Template downloaded for ${selectedClass?.name || "class"}${armLetter ? ` (Arm ${armLetter})` : ""}. Upload this file as-is — the class and arm are detected from the file name.`,
    );
  };

  // Upload processing
  const processUpload = async (file: File) => {
    setUploading(true);
    try {
      // Resolve class & arm from the file name (e.g. "JSS1_ArmA_studentsSheet.xlsx"
      // or "JSS1_studentsSheet.xlsx") instead of requiring classId/armId columns.
      const baseName = file.name.replace(/\.[^.]+$/, "");
      let fileNameClassId = "";
      let fileNameArmId = "";

      const armMatch = baseName.match(/_Arm([A-Za-z0-9]+)(?:_|$)/i);
      const armLetterFromFile = armMatch?.[1]?.toUpperCase();
      const classPart = baseName
        .replace(/_Arm[A-Za-z0-9]+/i, "")
        .replace(/[_-]?studentsSheet.*/i, "");
      const normalizedClassPart = classPart
        .replace(/[^A-Za-z0-9]/g, "")
        .toLowerCase();

      const matchedClass = classes.find(
        (c) =>
          c.name.replace(/[^A-Za-z0-9]/g, "").toLowerCase() ===
          normalizedClassPart,
      );
      if (matchedClass) {
        fileNameClassId = matchedClass.id;
        const matchedArm = matchedClass.arms?.find(
          (a) => String(a.letter).toUpperCase() === armLetterFromFile,
        );
        if (matchedArm) fileNameArmId = matchedArm.id;
      }

      const resolvedClassId = fileNameClassId || bulkClassId;
      const resolvedArmId = fileNameArmId || bulkArmId;

      if (!resolvedClassId) {
        toast.error(
          `Could not determine the class from the file name "${file.name}". ` +
            `Rename the file like "${classes[0]?.name?.replace(/\s+/g, "") || "ClassName"}_ArmA_studentsSheet.xlsx" or select a default class below.`,
        );
        setUploading(false);
        setDragActive(false);
        return;
      }

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      let successCount = 0;
      let errorCount = 0;
      let firstError = "";
      let processed = 0;
      setUploadProgress(0);
      for (const row of rows) {
        const { name, gender, admissionNumber } = row as any;
        if (!name) {
          errorCount++;
        } else {
          try {
            const res = await api.post(
              "/students",
              {
                name,
                gender: gender || "male",
                admissionNumber,
                classId: resolvedClassId || undefined,
                armId: resolvedArmId || undefined,
              },
              token,
            );
            if (!res.ok) {
              const errData = await res.json().catch(() => null);
              const msg =
                (Array.isArray(errData?.error)
                  ? errData.error[0]?.message
                  : errData?.error) || `HTTP ${res.status}`;
              throw new Error(`${name}: ${msg}`);
            }
            successCount++;
          } catch (err: any) {
            errorCount++;
            if (!firstError) firstError = err.message;
          }
        }
        processed++;
        setUploadProgress(Math.round((processed / rows.length) * 100));
      }
      if (errorCount > 0) {
        toast.error(
          `Uploaded ${successCount} students, ${errorCount} failed. First error: ${firstError}`,
        );
      } else {
        toast.success(
          `Uploaded ${successCount} students, ${errorCount} failed` +
            (fileNameClassId
              ? ` (class detected from file name${fileNameArmId ? " + arm" : ""})`
              : ""),
        );
      }
      await invalidateStudents();
      setShowBulkDrawer(false);
      setBulkClassId("");
      setBulkArmId("");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      setDragActive(false);
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      const result = await Swal.fire({
        title: "Confirm Upload",
        text: `You selected: ${file.name}. Do you want to proceed with the upload?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes, upload",
        cancelButtonText: "Cancel",
        background: theme === "dark" ? "#1f2937" : "#fff",
        color: theme === "dark" ? "#fff" : "#000",
      });
      if (result.isConfirmed) {
        await processUpload(file);
      }
    },
    [theme, bulkClassId, bulkArmId, token],
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
  });

  // Performance view
  const viewPerformance = async (student: Student) => {
    setSelectedStudent(student);
    if (!student.results) {
      try {
        const res = await api.get(`/results/student/${student.id}`, token);
        if (res.ok) {
          const results = await res.json();
          setSelectedStudent({ ...student, results });
        } else {
          setSelectedStudent({ ...student, results: [] });
        }
      } catch (err) {
        console.error(err);
        setSelectedStudent({ ...student, results: [] });
      }
    }
    setShowPerformanceModal(true);
  };

  const performanceData = selectedStudent?.results
    ?.reduce(
      (acc, result) => {
        const term = result.term;
        const existing = acc.find((item) => item.term === term);
        if (existing) {
          existing.totalScore += result.score;
          existing.count++;
          existing.average = existing.totalScore / existing.count;
        } else {
          acc.push({
            term,
            totalScore: result.score,
            count: 1,
            average: result.score,
          });
        }
        return acc;
      },
      [] as {
        term: string;
        totalScore: number;
        count: number;
        average: number;
      }[],
    )
    .map(({ term, average }) => ({ term, average }));

  // All Students Modal handlers
  const handleEditStudent = (student: Student) => {
    navigate(`/admin/student/${student.id}`);
  };

  const handleSuspendStudent = async (student: Student) => {
    setSuspendingId(student.id);
    try {
      await suspendMutation.mutateAsync({
        id: student.id,
        isActive: !student.isActive,
      });
    } finally {
      setSuspendingId(null);
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Delete ${student.name}? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete",
      background: theme === "dark" ? "#1f2937" : "#fff",
      color: theme === "dark" ? "#fff" : "#000",
    });
    if (!result.isConfirmed) return;
    setDeletingId(student.id);
    try {
      await deleteMutation.mutateAsync(student.id);
    } finally {
      setDeletingId(null);
    }
  };

  const openAllModal = () => {
    setAllStudents(filteredStudents);
    setSearchTerm("");
    setCurrentPage(1);
    setSelectedStudentIds(new Set());
    setShowAllModal(true);
  };

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedStudentIds(new Set());

  const handleBulkDeleteStudents = async () => {
    const ids = Array.from(selectedStudentIds);
    if (ids.length === 0) return;
    const result = await Swal.fire({
      title: `Delete ${ids.length} student${ids.length === 1 ? "" : "s"}?`,
      text: "This will permanently delete the selected students along with their results, attendance, fees and login accounts. This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: `Yes, delete ${ids.length}`,
      background: theme === "dark" ? "#1f2937" : "#fff",
      color: theme === "dark" ? "#fff" : "#000",
    });
    if (!result.isConfirmed) return;
    setBulkDeleting(true);
    try {
      await bulkDeleteMutation.mutateAsync(ids);
      toast.success(`${ids.length} student${ids.length === 1 ? "" : "s"} deleted`);
      setSelectedStudentIds(new Set());
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBulkDeleting(false);
    }
  };

  // Filter and paginate allStudents
  const filteredAllStudents = allStudents.filter((student) => {
    const q = searchTerm.toLowerCase();
    const classMatches = classes.filter((c) => c.id === student.class?.id);
    const classArmText = classMatches
      .map((c) => {
        const arm = c.arms?.find((a) => a.id === student.arm?.id);
        return [
          c.name,
          arm ? `arm ${arm.letter}` : "",
          arm?.alias || "",
          c.name + (arm ? ` ${arm.letter}` : ""),
          c.name + (arm?.alias ? ` ${arm.alias}` : ""),
        ].join(" ");
      })
      .join(" ");
    return (
      student.name.toLowerCase().includes(q) ||
      (student.admissionNumber &&
        student.admissionNumber.toLowerCase().includes(q)) ||
      (student.parent?.name && student.parent.name.toLowerCase().includes(q)) ||
      (student.class?.name && student.class.name.toLowerCase().includes(q)) ||
      (student.arm?.letter &&
        `arm ${student.arm.letter}`.toLowerCase().includes(q)) ||
      (student.arm?.alias && student.arm.alias.toLowerCase().includes(q)) ||
      (classArmText && classArmText.toLowerCase().includes(q))
    );
  });
  const totalPages = Math.ceil(filteredAllStudents.length / itemsPerPage);
  const paginatedStudents = filteredAllStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const allPageSelected =
    paginatedStudents.length > 0 &&
    paginatedStudents.every((s) => selectedStudentIds.has(s.id));

  const toggleSelectAllOnPage = () => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        paginatedStudents.forEach((s) => next.delete(s.id));
      } else {
        paginatedStudents.forEach((s) => next.add(s.id));
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${theme === "dark" ? "bg-[#0B1120]" : "bg-gradient-to-br from-blue-50 via-white to-blue-50"}`}
      >
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>
            Loading students...
          </p>
        </div>
      </div>
    );
  }

  // Determine mode classes for CSS targeting
  const lightModeClass = theme === "light" ? "students-light-mode" : "";
  const darkModeClass = theme === "dark" ? "students-dark-mode" : "";

  return (
    <div
      className={`students-container min-h-screen px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-300 ${lightModeClass} ${darkModeClass} ${theme === "dark" ? "bg-[#0B1120]" : "bg-gradient-to-br from-blue-50 via-white to-blue-50"}`}
    >
      {/* CSS that forces black text in light mode and white text in dark mode for table/drawer content (excluding buttons) */}
      <style>{`
        /* Light mode: pure black text for table cells, labels, etc. (but not buttons) */
        .students-light-mode .student-table th,
        .students-light-mode .student-table td,
        .students-light-mode .drawer-content label,
        .students-light-mode .drawer-content p,
        .students-light-mode .drawer-content h4,
        .students-light-mode .drawer-content li,
        .students-light-mode .modal-content label,
        .students-light-mode .modal-content p,
        .students-light-mode .modal-content td,
        .students-light-mode .modal-content th,
        .students-light-mode .student-table .empty-state,
        .students-light-mode .pagination-text {
          color: #000000 !important;
        }
        /* Dark mode: pure white text for those elements */
        .students-dark-mode .student-table th,
        .students-dark-mode .student-table td,
        .students-dark-mode .drawer-content label,
        .students-dark-mode .drawer-content p,
        .students-dark-mode .drawer-content h4,
        .students-dark-mode .drawer-content li,
        .students-dark-mode .modal-content label,
        .students-dark-mode .modal-content p,
        .students-dark-mode .modal-content td,
        .students-dark-mode .modal-content th,
        .students-dark-mode .student-table .empty-state,
        .students-dark-mode .pagination-text {
          color: #ffffff !important;
        }
        /* Force white background for modal table header in light mode */
        .students-light-mode .modal-content thead {
          background-color: #ffffff !important;
        }
        /* Modal table: bold, high-contrast text in light mode */
        .students-light-mode .modal-content th {
          font-weight: 700 !important;
          color: #1f2937 !important;
        }
        .students-light-mode .modal-content td {
          font-weight: 500 !important;
        }
        .students-light-mode .modal-content td span,
        .students-light-mode .modal-content td button {
          font-weight: 600 !important;
        }
        /* Action buttons inside the modal: darker, readable text in light mode */
        .students-light-mode .modal-content td button {
          color: #1e3a8a !important;
        }
        .students-light-mode .modal-content td button.bg-red-50,
        .students-light-mode .modal-content td button.text-red-700 {
          color: #991b1b !important;
        }
        .students-light-mode .modal-content td button.bg-amber-50,
        .students-light-mode .modal-content td button.text-amber-700 {
          color: #92400e !important;
        }
        /* Keep status badges and buttons as they are */
        .students-light-mode .student-table .status-badge,
        .students-dark-mode .student-table .status-badge {
          color: inherit !important;
        }
        /* Override for inputs/selects */
        .students-light-mode input,
        .students-light-mode select {
          color: #000000 !important;
        }
        .students-dark-mode input,
        .students-dark-mode select {
          color: #ffffff !important;
        }
        /* Ensure placeholders remain light in both modes */
        .students-light-mode input::placeholder {
          color: #6b7280 !important;
        }
        .students-dark-mode input::placeholder {
          color: #9ca3af !important;
        }
      `}</style>

      {/* Background grid */}
      {theme === "dark" && (
        <div className="fixed inset-0 z-0">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `linear-gradient(rgba(59,130,246,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.1) 1px,transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="sm:flex sm:items-center sm:justify-between mb-8">
          <div>
            <h2
              className={`text-2xl font-bold ${theme === "dark" ? "bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent" : "bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent"}`}
            >
              Student Management
            </h2>
            <p
              className={`mt-2 text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
            >
              Manage all students, view metrics, and perform bulk operations.
            </p>
          </div>
          {/* App-style action grid on mobile, inline buttons on sm+ */}
          <div className="mt-4 sm:mt-0 grid grid-cols-2 gap-2 sm:flex sm:space-x-3">
            <ExportButtons
              dark={theme === "dark"}
              disabled={filteredStudents.length === 0}
              onExcel={() =>
                exportToExcel(
                  armLetterSuffix
                    ? `students_${classNameSuffix}_Arm${armLetterSuffix}`
                    : classNameSuffix
                      ? `students_${classNameSuffix}`
                      : "students",
                  studentExportColumns,
                  filteredStudents,
                )
              }
              onPDF={() =>
                exportToPDF(
                  armLetterSuffix
                    ? `students_${classNameSuffix}_Arm${armLetterSuffix}`
                    : classNameSuffix
                      ? `students_${classNameSuffix}`
                      : "students",
                  classNameSuffix
                    ? `Student List${armLetterSuffix ? ` — Arm ${armLetterSuffix}` : ""} (${classes.find((c) => c.id === selectedClassId)?.name || ""})`
                    : "Student List",
                  studentExportColumns,
                  filteredStudents,
                )
              }
            />
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium shadow-lg hover:shadow-xl active:scale-[0.97] transition-all"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Student
            </button>
            <button
              onClick={() => setShowBulkDrawer(true)}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-medium shadow-lg hover:shadow-xl active:scale-[0.97] transition-all"
            >
              <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
              Bulk Upload
            </button>
          </div>
        </div>

        {/* Metrics Cards — 2×2 compact app grid on mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
          <div
            className={`p-4 rounded-2xl shadow-md ${theme === "dark" ? "bg-white/5 backdrop-blur-sm border border-white/10" : "bg-white border border-gray-200 shadow-sm"}`}
          >
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center mb-2 ${theme === "dark" ? "bg-blue-500/15" : "bg-blue-50"}`}
            >
              <UsersIcon className="h-5 w-5 text-blue-500" />
            </div>
            <p
              className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
            >
              Total Students
            </p>
            <p
              className={`text-xl sm:text-2xl font-bold mt-0.5 ${theme === "dark" ? "text-white" : "text-black"}`}
            >
              {totalStudents}
            </p>
          </div>
          <div
            className={`p-4 rounded-2xl shadow-md ${theme === "dark" ? "bg-white/5 backdrop-blur-sm border border-white/10" : "bg-white border border-gray-200 shadow-sm"}`}
          >
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center mb-2 ${theme === "dark" ? "bg-blue-500/15" : "bg-blue-50"}`}
            >
              <UserIcon className="h-5 w-5 text-blue-500" />
            </div>
            <p
              className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
            >
              Male
            </p>
            <p
              className={`text-xl sm:text-2xl font-bold mt-0.5 ${theme === "dark" ? "text-white" : "text-black"}`}
            >
              {maleCount}
            </p>
          </div>
          <div
            className={`p-4 rounded-2xl shadow-md ${theme === "dark" ? "bg-white/5 backdrop-blur-sm border border-white/10" : "bg-white border border-gray-200 shadow-sm"}`}
          >
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center mb-2 ${theme === "dark" ? "bg-pink-500/15" : "bg-pink-50"}`}
            >
              <UserGroupIcon className="h-5 w-5 text-pink-500" />
            </div>
            <p
              className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
            >
              Female
            </p>
            <p
              className={`text-xl sm:text-2xl font-bold mt-0.5 ${theme === "dark" ? "text-white" : "text-black"}`}
            >
              {femaleCount}
            </p>
          </div>
          <div
            className={`p-4 rounded-2xl shadow-md ${theme === "dark" ? "bg-white/5 backdrop-blur-sm border border-white/10" : "bg-white border border-gray-200 shadow-sm"}`}
          >
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center mb-2 ${theme === "dark" ? "bg-purple-500/15" : "bg-purple-50"}`}
            >
              <ChartBarIcon className="h-5 w-5 text-purple-500" />
            </div>
            <p
              className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
            >
              Classes
            </p>
            <p
              className={`text-xl sm:text-2xl font-bold mt-0.5 ${theme === "dark" ? "text-white" : "text-black"}`}
            >
              {Object.keys(classDistribution).length}
            </p>
          </div>
        </div>

        {/* Charts — full-width cards on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 mb-8">
          <div
            className={`p-4 sm:p-5 rounded-2xl shadow-xl ${theme === "dark" ? "bg-white/5 backdrop-blur-xl border border-white/10" : "bg-white/80 backdrop-blur-md border border-gray-200/60"}`}
          >
            <h3
              className={`text-base sm:text-lg font-medium mb-4 ${theme === "dark" ? "text-white" : "text-black"}`}
            >
              Student Growth (Year over Year)
            </h3>
            <ResponsiveContainer width="100%" height={220} className="sm:hidden">
              <LineChart data={growthData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={theme === "dark" ? "#374151" : "#e5e7eb"}
                />
                <XAxis
                  dataKey="year"
                  stroke={theme === "dark" ? "#9ca3af" : "#4b5563"}
                />
                <YAxis stroke={theme === "dark" ? "#9ca3af" : "#4b5563"} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "dark" ? "#1f2937" : "#fff",
                    borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="students"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={300} className="hidden sm:block">
              <LineChart data={growthData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={theme === "dark" ? "#374151" : "#e5e7eb"}
                />
                <XAxis
                  dataKey="year"
                  stroke={theme === "dark" ? "#9ca3af" : "#4b5563"}
                />
                <YAxis stroke={theme === "dark" ? "#9ca3af" : "#4b5563"} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "dark" ? "#1f2937" : "#fff",
                    borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="students"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div
            className={`p-4 sm:p-5 rounded-2xl shadow-xl ${theme === "dark" ? "bg-white/5 backdrop-blur-xl border border-white/10" : "bg-white/80 backdrop-blur-md border border-gray-200/60"}`}
          >
            <h3
              className={`text-base sm:text-lg font-medium mb-4 ${theme === "dark" ? "text-white" : "text-black"}`}
            >
              Class Distribution
            </h3>
            <ResponsiveContainer width="100%" height={220} className="sm:hidden">
              <PieChart>
                <Pie
                  data={classChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {classChartData.map((_entry, index) => (
                    <Cell
                      key={`cell-m-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "dark" ? "#1f2937" : "#fff",
                    borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={300} className="hidden sm:block">
              <PieChart>
                <Pie
                  data={classChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {classChartData.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "dark" ? "#1f2937" : "#fff",
                    borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Filters and View All button — app-style */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-6 items-stretch sm:items-center sm:justify-between">
          <div className="flex gap-2 sm:flex-wrap sm:gap-4 overflow-x-auto no-scrollbar -mx-1 px-1 sm:mx-0 sm:px-0">
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedArmId("");
              }}
              className={`shrink-0 px-4 py-2.5 rounded-full border focus:outline-none focus:ring-2 text-sm font-medium ${theme === "dark" ? "bg-gray-800 border-gray-700 text-white focus:ring-blue-500" : "bg-white border-gray-300 text-black focus:ring-blue-400"}`}
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
            {selectedClassId && (
              <select
                value={selectedArmId}
                onChange={(e) => setSelectedArmId(e.target.value)}
                className={`shrink-0 px-4 py-2.5 rounded-full border focus:outline-none focus:ring-2 text-sm font-medium ${theme === "dark" ? "bg-gray-800 border-gray-700 text-white focus:ring-blue-500" : "bg-white border-gray-300 text-black focus:ring-blue-400"}`}
              >
                <option value="">All Arms</option>
                {classes
                  .find((c) => c.id === selectedClassId)
                  ?.arms?.map((arm) => (
                    <option key={arm.id} value={arm.id}>
                      {formatArmDropdown(arm)}
                    </option>
                  ))}
              </select>
            )}
          </div>
          <button
            onClick={openAllModal}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 active:scale-[0.97] transition shadow-lg shadow-purple-600/20"
          >
            <UsersIcon className="h-4 w-4 mr-2" />
            View All Students
          </button>
        </div>

        {/* Main Student Table – Summary view */}
        {/* Mobile: app-style cards (hidden on md+) */}
        <div className="md:hidden space-y-2.5 mb-6">
          {summaryStudents.map((student) => {
            const isSuspended = student.isActive === false;
            return (
              <div
                key={student.id}
                onClick={() => navigate(`/admin/student/${student.id}`)}
                className={`rounded-2xl border p-3.5 active:scale-[0.985] transition-transform cursor-pointer ${
                  isSuspended
                    ? theme === "dark"
                      ? "bg-red-900/20 border-red-500/30"
                      : "bg-red-50/70 border-red-200"
                    : theme === "dark"
                      ? "bg-gray-900/80 backdrop-blur-sm border border-white/10"
                      : "bg-white border border-gray-200 shadow-sm"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div
                    className={`h-11 w-11 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${
                      student.gender === "female"
                        ? theme === "dark"
                          ? "bg-pink-500/20 text-pink-300"
                          : "bg-pink-100 text-pink-600"
                        : theme === "dark"
                          ? "bg-blue-500/20 text-blue-300"
                          : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    {student.name.slice(0, 2).toUpperCase()}
                  </div>
                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold truncate text-[15px] ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        {student.name}
                      </p>
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${
                          isSuspended
                            ? "bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-800"
                            : "bg-green-50 text-green-700 ring-green-200 dark:bg-green-900/40 dark:text-green-300 dark:ring-green-800"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${isSuspended ? "bg-red-500" : "bg-green-500"}`} />
                        {isSuspended ? "Suspended" : "Active"}
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 font-mono ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                      {student.admissionNumber || "No admission no."}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${theme === "dark" ? "bg-white/10 text-gray-300" : "bg-gray-100 text-gray-600"}`}
                      >
                        {student.class?.name || "No class"}
                        {student.arm?.letter ? ` · ${student.arm.letter}` : ""}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium truncate max-w-[45%] ${theme === "dark" ? "bg-white/10 text-gray-300" : "bg-gray-100 text-gray-600"}`}
                      >
                        {student.parent?.name || "No parent"}
                      </span>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        viewPerformance(student);
                      }}
                      className={`p-1.5 rounded-lg active:scale-90 transition-transform ${theme === "dark" ? "text-green-400 bg-white/5" : "text-green-600 bg-green-50"}`}
                      title="View Performance"
                    >
                      <AcademicCapIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredStudents.length === 0 && (
            <div className={`rounded-2xl border p-6 text-center text-sm empty-state ${theme === "dark" ? "bg-gray-900/80 border-white/10 text-gray-400" : "bg-white border-gray-200 text-gray-500"}`}>
              No students found. Try adjusting filters or add a student.
            </div>
          )}
          {hasMoreStudents && (
            <button
              onClick={openAllModal}
              className={`w-full py-3 rounded-2xl text-sm font-semibold active:scale-[0.98] transition-all ${
                theme === "dark"
                  ? "text-blue-300 bg-blue-500/10 border border-blue-500/20"
                  : "text-blue-700 bg-blue-50 border border-blue-100"
              }`}
            >
              + View all {filteredStudents.length} students
            </button>
          )}
        </div>
        <div
          className={`hidden md:block overflow-x-auto rounded-2xl shadow-xl student-table ${theme === "dark" ? "bg-gray-900/80 backdrop-blur-sm border border-white/10" : "bg-white border border-gray-200"}`}
        >
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead
              className={theme === "dark" ? "bg-gray-800/50" : "bg-gray-50"}
            >
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900 dark:text-gray-300">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900 dark:text-gray-300">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900 dark:text-gray-300">
                  Admission No.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900 dark:text-gray-300">
                  Class
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900 dark:text-gray-300">
                  Arm
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900 dark:text-gray-300">
                  Parent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900 dark:text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {summaryStudents.map((student) => {
                const isSuspended = student.isActive === false;
                return (
                  <tr
                    key={student.id}
                    className={`transition-colors ${
                      isSuspended
                        ? theme === "dark"
                          ? "bg-red-900/20 hover:bg-red-900/30"
                          : "bg-red-50/50 hover:bg-red-100/70"
                        : theme === "dark"
                          ? "hover:bg-white/5"
                          : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative group">
                        {isSuspended ? (
                          <>
                            <ExclamationCircleIcon className="h-5 w-5 text-red-500 dark:text-red-400" />
                            <div className="absolute left-0 top-full mt-1 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                              Suspended
                            </div>
                          </>
                        ) : (
                          <>
                            <CheckCircleIcon className="h-5 w-5 text-green-500 dark:text-green-400" />
                            <div className="absolute left-0 top-full mt-1 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                              Active
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {student.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {student.admissionNumber || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {student.class?.name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {getArmDisplayName(student.arm)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {student.parent?.name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => navigate(`/admin/student/${student.id}`)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        title="View Bio"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => viewPerformance(student)}
                        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                        title="View Performance"
                      >
                        <AcademicCapIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-gray-900 dark:text-gray-400 empty-state"
                  >
                    No students found. Try adjusting filters or add a student.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {hasMoreStudents && (
            <div className="p-4 text-center border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={openAllModal}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
              >
                + View all {filteredStudents.length} students
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals and Drawer */}
      <AnimatePresence>
        {showAddModal && (
          <CenteredModal
            onClose={() => setShowAddModal(false)}
            title="Add New Student"
            theme={theme}
            className="modal-content"
          >
            <div className="space-y-4">
              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`}
                >
                  Full Name *
                </label>
                <input
                  type="text"
                  value={newStudentForm.name}
                  onChange={(e) =>
                    setNewStudentForm({
                      ...newStudentForm,
                      name: e.target.value,
                    })
                  }
                  className={`w-full px-4 py-2.5 sm:py-2 text-base sm:text-sm rounded-lg border ${theme === "dark" ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400" : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"}`}
                  placeholder="e.g., John Doe"
                />
              </div>
              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`}
                >
                  Gender
                </label>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer py-1">
                    <input
                      type="radio"
                      value="male"
                      checked={newStudentForm.gender === "male"}
                      onChange={(e) =>
                        setNewStudentForm({
                          ...newStudentForm,
                          gender: e.target.value,
                        })
                      }
                    />
                    <span
                      className={
                        theme === "dark" ? "text-gray-200" : "text-gray-900"
                      }
                    >
                      Male
                    </span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer py-1">
                    <input
                      type="radio"
                      value="female"
                      checked={newStudentForm.gender === "female"}
                      onChange={(e) =>
                        setNewStudentForm({
                          ...newStudentForm,
                          gender: e.target.value,
                        })
                      }
                    />
                    <span
                      className={
                        theme === "dark" ? "text-gray-200" : "text-gray-900"
                      }
                    >
                      Female
                    </span>
                  </label>
                </div>
              </div>
              <div>
                <label
                  className={`flex items-center justify-between text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`}
                >
                  <span>Use default ID generator</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={newStudentForm.useDefaultId}
                    onClick={() =>
                      setNewStudentForm({
                        ...newStudentForm,
                        useDefaultId: !newStudentForm.useDefaultId,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      newStudentForm.useDefaultId
                        ? "bg-blue-600"
                        : theme === "dark"
                        ? "bg-gray-700"
                        : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        newStudentForm.useDefaultId ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </label>
                {newStudentForm.useDefaultId ? (
                  <div
                    className={`mt-1 px-4 py-3 rounded-lg border text-sm flex flex-col sm:flex-row sm:items-center gap-2 ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-700 text-gray-200"
                        : "bg-blue-50 border-blue-200 text-gray-900"
                    }`}
                  >
                    <CheckCircleIcon className="h-5 w-5 text-blue-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium">
                        Admission ID: {nextAutoId ? (
                          <span className="font-mono text-blue-500">{nextAutoId}</span>
                        ) : (
                          "auto-generated"
                        )}
                      </p>
                      <p
                        className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                      >
                        Uses the format configured in Settings → ID Generator (STUDENT role). The exact ID is claimed when you save.
                      </p>
                    </div>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={newStudentForm.admissionNumber}
                    onChange={(e) =>
                      setNewStudentForm({
                        ...newStudentForm,
                        admissionNumber: e.target.value,
                      })
                    }
                    className={`w-full mt-1 px-4 py-2.5 sm:py-2 text-base sm:text-sm rounded-lg border ${theme === "dark" ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400" : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"}`}
                    placeholder="e.g., ADM2024001"
                  />
                )}
              </div>
              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`}
                >
                  Class (optional)
                </label>
                <select
                  value={newStudentForm.classId}
                  onChange={(e) =>
                    setNewStudentForm({
                      ...newStudentForm,
                      classId: e.target.value,
                      armId: "",
                    })
                  }
                  className={`w-full px-4 py-2.5 sm:py-2 text-base sm:text-sm rounded-lg border ${theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
              {newStudentForm.classId && (
                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`}
                  >
                    Arm (optional)
                  </label>
                  <select
                    value={newStudentForm.armId}
                    onChange={(e) =>
                      setNewStudentForm({
                        ...newStudentForm,
                        armId: e.target.value,
                      })
                    }
                    className={`w-full px-4 py-2.5 sm:py-2 text-base sm:text-sm rounded-lg border ${theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  >
                    <option value="">Select Arm</option>
                    {classes
                      .find((c) => c.id === newStudentForm.classId)
                      ?.arms?.map((arm) => (
                        <option key={arm.id} value={arm.id}>
                          {formatArmDropdown(arm)}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              <div className="pt-4">
                <button
                  onClick={handleCreateStudent}
                  disabled={isSubmitting || !newStudentForm.name.trim()}
                  className="w-full px-4 py-2.5 sm:py-2 text-base sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create Student"}
                </button>
              </div>
            </div>
          </CenteredModal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBulkDrawer && (
          <Drawer
            onClose={() => setShowBulkDrawer(false)}
            title="Bulk Upload Students"
            theme={theme}
            className="drawer-content"
          >
            <div className="space-y-6">
              <div className="rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <AcademicCapIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    Default Class & Arm (Optional)
                  </h4>
                </div>
                <p className="text-sm text-gray-900 dark:text-gray-300 mb-4">
                  The class and arm are detected automatically from the uploaded
                  file's name (e.g. "JSS1_ArmA_studentsSheet.xlsx" → class JSS1,
                  Arm A). Select values below only as a fallback if the file
                  name doesn't match any class.
                </p>
                <div className="space-y-3">
                  <div>
                    <label
                      className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`}
                    >
                      Default Class *
                    </label>
                    <select
                      value={bulkClassId}
                      onChange={(e) => {
                        setBulkClassId(e.target.value);
                        setBulkArmId("");
                      }}
                      className={`w-full px-4 py-2 rounded-lg border ${theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                    >
                      <option value="">-- Select a class --</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {bulkClassId && (
                    <div>
                      <label
                        className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`}
                      >
                        Default Arm (optional)
                      </label>
                      <select
                        value={bulkArmId}
                        onChange={(e) => setBulkArmId(e.target.value)}
                        className={`w-full px-4 py-2 rounded-lg border ${theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                      >
                        <option value="">-- No default arm --</option>
                        {classes
                          .find((c) => c.id === bulkClassId)
                          ?.arms?.map((arm) => (
                            <option key={arm.id} value={arm.id}>
                              {formatArmDropdown(arm)}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <DocumentTextIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    Step 1: Download Template
                  </h4>
                </div>
                <p className="text-sm text-gray-900 dark:text-gray-300 mb-4">
                  Get the Excel template with the correct columns: name, gender,
                  admissionNumber, classId, armId.
                </p>
                <button
                  onClick={downloadTemplate}
                  disabled={!bulkClassId}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-gray-700 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <DocumentArrowDownIcon className="h-5 w-5 mr-2 text-green-600" />
                  Download Excel Template
                </button>
                {!bulkClassId && (
                  <p className="text-xs text-amber-600 mt-2">
                    Please select a default class first to generate the
                    template.
                  </p>
                )}
              </div>

              <div className="rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <CloudArrowUpIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    Step 2: Upload Your File
                  </h4>
                </div>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    dragActive
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 scale-[1.02]"
                      : "border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500"
                  }`}
                  onDragEnter={() => setDragActive(true)}
                  onDragLeave={() => setDragActive(false)}
                >
                  <input {...getInputProps()} />
                  <ArrowUpTrayIcon
                    className={`h-12 w-12 mx-auto mb-4 ${dragActive ? "text-blue-500" : "text-gray-400"}`}
                  />
                  <p className="text-gray-900 dark:text-gray-300 font-medium">
                    {dragActive
                      ? "Drop the file here"
                      : "Drag & drop an Excel file here"}
                  </p>
                  <p className="text-sm text-gray-900 dark:text-gray-300 mt-2">
                    or click to browse
                  </p>
                  <p className="text-xs text-gray-900 dark:text-gray-300 mt-3">
                    Supports .xlsx, .xls files
                  </p>
                </div>
                {uploading && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-900 dark:text-gray-300">
                        Uploading and processing...
                      </span>
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        {uploadProgress}%
                      </span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-center">
                      {uploadProgress}% complete
                    </p>
                  </div>
                )}
              </div>

              <div className="text-xs text-gray-900 dark:text-gray-300 bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3">
                <p className="font-medium mb-1">📌 Important notes:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>
                    Only <strong>.xlsx</strong> or <strong>.xls</strong> files
                    accepted
                  </li>
                  <li>
                    Required column: <strong>name</strong> (others optional)
                  </li>
                  <li>Gender: "male" or "female" (defaults to male)</li>
                  <li>
                    Leave classId/armId empty to use the default values selected
                    above
                  </li>
                  <li>
                    If default class/arm are set, they will be applied to rows
                    without those fields
                  </li>
                </ul>
              </div>
            </div>
          </Drawer>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPerformanceModal && selectedStudent && (
          <CenteredModal
            onClose={() => setShowPerformanceModal(false)}
            title={`Performance - ${selectedStudent.name}`}
            theme={theme}
            size="lg"
            className="modal-content"
          >
            {performanceData && performanceData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={theme === "dark" ? "#374151" : "#e5e7eb"}
                    />
                    <XAxis
                      dataKey="term"
                      stroke={theme === "dark" ? "#9ca3af" : "#4b5563"}
                    />
                    <YAxis
                      domain={[0, 100]}
                      stroke={theme === "dark" ? "#9ca3af" : "#4b5563"}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme === "dark" ? "#1f2937" : "#fff",
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="average"
                      fill="#3b82f6"
                      name="Average Score"
                    />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="text-left py-2 text-gray-900 dark:text-gray-300">
                          Term
                        </th>
                        <th className="text-left py-2 text-gray-900 dark:text-gray-300">
                          Subject
                        </th>
                        <th className="text-left py-2 text-gray-900 dark:text-gray-300">
                          Score
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStudent.results?.map((result, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-gray-100 dark:border-gray-800"
                        >
                          <td className="py-2 text-gray-900 dark:text-gray-100">
                            {result.term}
                          </td>
                          <td className="py-2 text-gray-900 dark:text-gray-100">
                            {result.subject.name}
                          </td>
                          <td className="py-2 text-gray-900 dark:text-gray-100">
                            {result.score}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-center py-8 text-gray-900 dark:text-gray-400">
                No results found for this student.
              </p>
            )}
          </CenteredModal>
        )}
      </AnimatePresence>

      {/* View All Students Modal - FULLSCREEN */}
      <AnimatePresence>
        {showAllModal && (
          <CenteredModal
            onClose={() => setShowAllModal(false)}
            title="All Students"
            theme={theme}
            size="fullscreen"
            className="modal-content"
          >
            <div className="flex flex-col h-full space-y-4">
              {/* Toolbar: search + result count */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, admission number, parent, class, or class & arm..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 ${theme === "dark" ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"}`}
                  />
                </div>
                <div
                  className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${theme === "dark" ? "bg-gray-800 text-gray-200" : "bg-blue-50 text-blue-700"}`}
                >
                  <UserGroupIcon className="h-5 w-5" />
                  {filteredAllStudents.length} student
                  {filteredAllStudents.length === 1 ? "" : "s"}
                </div>
              </div>

              {/* Mobile: app-style card list (hidden on md+) */}
              <div className="md:hidden flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-2">
                {paginatedStudents.map((student) => {
                  const isSelected = selectedStudentIds.has(student.id);
                  const isSuspended = student.isActive === false;
                  return (
                    <div
                      key={student.id}
                      className={`rounded-2xl border p-3.5 transition-colors ${
                        isSelected
                          ? theme === "dark"
                            ? "bg-red-900/20 border-red-500/40"
                            : "bg-red-50/80 border-red-300"
                          : theme === "dark"
                            ? "bg-gray-900/60 border border-white/10"
                            : "bg-white border border-gray-200 shadow-sm"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleStudentSelection(student.id)}
                          className="h-5 w-5 shrink-0 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                        />
                        <div
                          className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${student.gender === "female" ? "bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300" : "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300"}`}
                        >
                          {student.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1" onClick={() => toggleStudentSelection(student.id)}>
                          <div className="flex items-center gap-2">
                            <p className={`font-semibold truncate text-[15px] ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                              {student.name}
                            </p>
                            <span
                              className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${
                                isSuspended
                                  ? "bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-800"
                                  : "bg-green-50 text-green-700 ring-green-200 dark:bg-green-900/40 dark:text-green-300 dark:ring-green-800"
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${isSuspended ? "bg-red-500" : "bg-green-500"}`} />
                              {isSuspended ? "Suspended" : "Active"}
                            </span>
                          </div>
                          <p className={`text-xs mt-0.5 font-mono ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                            {student.admissionNumber || "No admission no."}
                          </p>
                          <p className={`text-xs mt-0.5 truncate ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                            {student.class?.name || "No class"}
                            {student.arm?.letter ? ` · ${student.arm.letter}` : ""}
                            {student.parent?.name ? ` · Parent: ${student.parent.name}` : ""}
                          </p>
                        </div>
                      </div>
                      {/* Quick actions — tappable chips */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <button
                          onClick={() => navigate(`/admin/student/${student.id}`)}
                          className="flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 active:scale-95 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-800 transition-transform"
                        >
                          <EyeIcon className="h-3.5 w-3.5" /> Profile
                        </button>
                        <button
                          onClick={() => handleEditStudent(student)}
                          className="flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-200 active:scale-95 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800 transition-transform"
                        >
                          <PencilIcon className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleSuspendStudent(student)}
                          disabled={suspendingId === student.id}
                          className={`flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium ring-1 active:scale-95 transition-transform disabled:opacity-50 ${
                            isSuspended
                              ? "bg-green-50 text-green-700 ring-green-200 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-800"
                              : "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800"
                          }`}
                        >
                          {suspendingId === student.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : isSuspended ? (
                            <PlayIcon className="h-3.5 w-3.5" />
                          ) : (
                            <StopIcon className="h-3.5 w-3.5" />
                          )}
                          {isSuspended ? "Activate" : "Suspend"}
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student)}
                          disabled={deletingId === student.id}
                          className="flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium bg-red-50 text-red-700 ring-1 ring-red-200 active:scale-95 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800 transition-transform disabled:opacity-50"
                        >
                          {deletingId === student.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <TrashIcon className="h-3.5 w-3.5" />
                          )}
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
                {paginatedStudents.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-12">
                    <UserGroupIcon className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No students found.</p>
                  </div>
                )}
              </div>

              {/* Table (desktop) */}
              <div className="hidden md:flex flex-1 min-h-0 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/95 backdrop-blur border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={allPageSelected}
                          onChange={toggleSelectAllOnPage}
                          className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                          title="Select all on this page"
                        />
                      </th>
                      {[
                        "Name",
                        "Admission No.",
                        "Class/Arm",
                        "Parent",
                        "Status",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody
                    className={
                      theme === "dark"
                        ? "divide-y divide-gray-800"
                        : "divide-y divide-gray-100"
                    }
                  >
                    {paginatedStudents.map((student) => {
                      const isSelected = selectedStudentIds.has(student.id);
                      return (
                        <tr
                          key={student.id}
                          className={`transition-colors ${isSelected ? "bg-red-50/70 dark:bg-red-900/20" : theme === "dark" ? "hover:bg-gray-800/60" : "hover:bg-blue-50/50"}`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleStudentSelection(student.id)}
                              className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                              title={`Select ${student.name}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div
                                style={
                                  theme === "dark"
                                    ? undefined
                                    : { color: "#000000", fontWeight: 700 }
                                }
                                className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${student.gender === "female" ? "bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300" : "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300"}`}
                              >
                                {student.name.slice(0, 2).toUpperCase()}
                              </div>
                              <span
                                style={
                                  theme === "dark"
                                    ? { color: "#ffffff", fontWeight: 700 }
                                    : { color: "#000000", fontWeight: 600 }
                                }
                              >
                                {student.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-md font-mono text-xs ${theme === "dark" ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600"}`}
                            >
                              {student.admissionNumber || "-"}
                            </span>
                          </td>
                          <td
                            className={`px-4 py-3 ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`}
                          >
                            {student.class?.name || "-"}{" "}
                            {student.arm
                              ? `(${getArmDisplayName(student.arm)})`
                              : ""}
                          </td>
                          <td
                            className={`px-4 py-3 ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`}
                          >
                            {student.parent?.name || "-"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              style={
                                theme === "dark"
                                  ? undefined
                                  : {
                                      color:
                                        student.isActive !== false
                                          ? "#166534"
                                          : "#991b1b",
                                      fontWeight: 700,
                                    }
                              }
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${
                                student.isActive !== false
                                  ? "bg-green-50 text-green-700 ring-green-200 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-800"
                                  : "bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${student.isActive !== false ? "bg-green-500" : "bg-red-500"}`}
                              />
                              {student.isActive !== false
                                ? "Active"
                                : "Suspended"}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() =>
                                  navigate(`/admin/student/${student.id}`)
                                }
                                style={
                                  theme === "dark"
                                    ? undefined
                                    : { color: "#3730a3", fontWeight: 700 }
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-800 dark:hover:bg-indigo-900/50 transition"
                                title="View Profile"
                              >
                                <EyeIcon className="h-3.5 w-3.5" /> Profile
                              </button>
                              <button
                                onClick={() => handleEditStudent(student)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800 dark:hover:bg-blue-900/50 transition"
                                title="Edit Student"
                              >
                                <PencilIcon className="h-3.5 w-3.5" /> Edit
                              </button>
                              <button
                                onClick={() => handleSuspendStudent(student)}
                                disabled={suspendingId === student.id}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium ring-1 transition disabled:opacity-50 ${
                                  student.isActive !== false
                                    ? "bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800 dark:hover:bg-amber-900/50"
                                    : "bg-green-50 text-green-700 ring-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-800 dark:hover:bg-green-900/50"
                                }`}
                                title={
                                  student.isActive !== false
                                    ? "Suspend Student"
                                    : "Activate Student"
                                }
                              >
                                {suspendingId === student.id ? (
                                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : student.isActive !== false ? (
                                  <StopIcon className="h-3.5 w-3.5" />
                                ) : (
                                  <PlayIcon className="h-3.5 w-3.5" />
                                )}
                                {student.isActive !== false
                                  ? "Suspend"
                                  : "Activate"}
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(student)}
                                disabled={deletingId === student.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800 dark:hover:bg-red-900/50 transition disabled:opacity-50"
                                title="Delete Student"
                              >
                                {deletingId === student.id ? (
                                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <TrashIcon className="h-3.5 w-3.5" />
                                )}{" "}
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {paginatedStudents.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <UserGroupIcon className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                            <p className="text-gray-500 dark:text-gray-400">
                              No students found.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bulk actions bar — sticky app-style bottom bar on mobile */}
              {selectedStudentIds.size > 0 && (
                <div
                  className={`shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border ${
                    theme === "dark"
                      ? "bg-red-900/20 border-red-800/50 text-gray-200"
                      : "bg-red-50 border-red-200 text-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CheckCircleIcon className="h-5 w-5 text-red-500" />
                    {selectedStudentIds.size} student
                    {selectedStudentIds.size === 1 ? "" : "s"} selected
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={clearSelection}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 active:scale-95 transition-transform"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleBulkDeleteStudents}
                      disabled={bulkDeleting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 active:scale-95 transition-transform disabled:opacity-50"
                    >
                      {bulkDeleting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <TrashIcon className="h-4 w-4" />
                      )}
                      Delete selected
                    </button>
                  </div>
                </div>
              )}

              {/* Pagination — compact on mobile */}
              {filteredAllStudents.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"} pagination-text`}
                    >
                      Page {currentPage} of {totalPages}
                    </span>
                    <label
                      className={`hidden sm:flex items-center text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                    >
                      Per page:
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className={`ml-2 px-2 py-1 rounded-lg text-sm border transition focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"}`}
                      >
                        {[10, 25, 50, 100].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3.5 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 ring-1 ring-gray-200 hover:bg-gray-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-700 transition"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3.5 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </CenteredModal>
        )}
      </AnimatePresence>
    </div>
  );
}

// Centered Modal Component - UPDATED to support fullscreen
function CenteredModal({
  children,
  onClose,
  title,
  theme,
  size = "md",
  className = "",
}: any) {
  const isFullscreen = size === "fullscreen";
  const maxWidth =
    size === "lg" ? "max-w-5xl" : isFullscreen ? "max-w-full" : "max-w-md";
  const maxHeight = isFullscreen ? "h-full max-h-full" : "max-h-[90vh]";
  const rounding = isFullscreen ? "rounded-none" : "rounded-2xl";
  const padding = isFullscreen ? "p-4 sm:p-6 md:p-8" : "p-4 sm:p-6";

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
      />

      {/* Perfectly centered modal */}
      <div
        className={`fixed inset-0 z-50 grid place-items-center ${isFullscreen ? "" : "p-4"} overflow-y-auto`}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className={`relative ${isFullscreen ? "" : "my-4"} w-full max-w-[calc(100vw-1.5rem)] sm:max-w-[none] ${maxWidth} ${maxHeight} flex flex-col ${rounding} shadow-2xl overflow-hidden ${
            theme === "dark" ? "bg-gray-900" : "bg-white"
          } ${className}`}
        >
          {/* Header — expanded, no background */}
          <div className="shrink-0">
            <div className="flex items-center gap-3 sm:gap-6 px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
              {/* Icon chip */}
              <div
                className={`h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center ${
                  theme === "dark"
                    ? "bg-blue-500/15 text-blue-300"
                    : "bg-blue-100 text-blue-600"
                }`}
              >
                <UserGroupIcon className="h-6 w-6" />
              </div>
              {/* Title */}
              <div className="flex-1 min-w-0">
                <h3
                  className={`text-lg sm:text-xl font-bold tracking-tight truncate ${
                    theme === "dark"
                      ? "bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent"
                      : "bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent"
                  }`}
                >
                  {title}
                </h3>
              </div>
              {/* Close — circular icon button */}
              <button
                onClick={onClose}
                title="Close"
                aria-label="Close"
                className={`group h-10 w-10 shrink-0 rounded-full flex items-center justify-center ring-1 active:scale-90 transition-all ${
                  theme === "dark"
                    ? "bg-gray-800/80 text-gray-300 ring-gray-700 hover:bg-red-900/40 hover:text-red-300 hover:ring-red-800"
                    : "bg-white text-gray-500 ring-gray-200 shadow-sm hover:bg-red-50 hover:text-red-600 hover:ring-red-200"
                }`}
              >
                <XMarkIcon className="h-5 w-5 transition-transform group-active:rotate-90" />
              </button>
            </div>
            {/* Divider */}
            <div className={`h-px w-full ${theme === "dark" ? "bg-gray-700/60" : "bg-gray-200"}`} />
          </div>

          {/* Body */}
          <div className={`flex-1 overflow-y-auto ${padding}`}>{children}</div>
        </motion.div>
      </div>
    </>
  );
}

// Drawer Component (Offcanvas)
function Drawer({ children, onClose, title, theme, className = "" }: any) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "tween", duration: 0.3 }}
        className={`fixed right-0 top-0 h-full w-full sm:w-[600px] shadow-2xl z-50 overflow-y-auto ${theme === "dark" ? "bg-gray-900" : "bg-white"} ${className}`}
      >
        <div className="sticky top-0 flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 bg-inherit">
          <h3
            className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </>
  );
}
