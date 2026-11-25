// Admin Library page — books, lending, per-class book fees and pushing
// charges into the school fees system. Requires the 'library' privilege.
import { useMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { api } from "../../utils/api";
import { unwrapRes } from "../../hooks/queryHelpers";
import { getErrorMessage } from "../../hooks/queryHelpers";
import { libraryService } from "../../services/libraryService";
import type {
  LibraryBook,
  LibraryBookFee,
  LibraryLoan,
  LibraryStats,
} from "../../services/libraryService";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  BookOpenIcon,
  ArrowDownTrayIcon,
  ArrowUturnRightIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

interface ClassRow {
  id: string;
  name: string;
}
interface FeeStructureRow {
  id: string;
  className: string;
  term: string;
  totalAmount: number;
}
interface StudentRow {
  id: string;
  name: string;
  classId?: string | null;
}

type Tab = "books" | "loans" | "fees";

const fmtN = (n: number) => `₦${Number(n || 0).toLocaleString()}`;
const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString() : "—";

export default function AdminLibrary() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("books");

  // ---------- shared reference data ----------
  const classesQuery = useQuery({
    queryKey: ["library-classes"],
    queryFn: () =>
      unwrapRes<{ data: ClassRow[] } | ClassRow[]>(api.get("/classes")),
  });
  const feeStructuresQuery = useQuery({
    queryKey: ["library-fee-structures"],
    queryFn: () => unwrapRes<FeeStructureRow[]>(api.get("/fees/structures")),
  });
  const classes: ClassRow[] = useMemo(() => {
    const raw = classesQuery.data as any;
    return Array.isArray(raw) ? raw : raw?.data || [];
  }, [classesQuery.data]);
  const feeStructures: FeeStructureRow[] = feeStructuresQuery.data || [];

  // ================= BOOKS TAB =================
  const [bookSearch, setBookSearch] = useState("");
  const [bookPage, setBookPage] = useState(1);
  const [bookModal, setBookModal] = useState(false);
  const [editingBook, setEditingBook] = useState<LibraryBook | null>(null);
  const [bookForm, setBookForm] = useState({
    title: "",
    author: "",
    isbn: "",
    category: "",
    price: 0,
    totalCopies: 0,
  });

  const booksQuery = useQuery({
    queryKey: ["library-books", bookPage, bookSearch],
    queryFn: () =>
      libraryService.getBooks({
        search: bookSearch || undefined,
        page: bookPage,
        limit: 20,
      }),
    placeholderData: keepPreviousData,
  });
  const books: LibraryBook[] = booksQuery.data?.data || [];

  const saveBook = useMutation({
    mutationFn: async () => {
      if (editingBook)
        return libraryService.updateBook(editingBook.id, bookForm);
      return libraryService.createBook(bookForm);
    },
    onSuccess: () => {
      toast.success(editingBook ? "Book updated" : "Book added");
      setBookModal(false);
      queryClient.invalidateQueries({ queryKey: ["library-books"] });
      queryClient.invalidateQueries({ queryKey: ["library-stats"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const deleteBook = useMutation({
    mutationFn: (id: string) => libraryService.deleteBook(id),
    onSuccess: () => {
      toast.success("Book deleted");
      queryClient.invalidateQueries({ queryKey: ["library-books"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const openBookModal = (book?: LibraryBook) => {
    setEditingBook(book || null);
    setBookForm(
      book
        ? {
            title: book.title,
            author: book.author || "",
            isbn: book.isbn || "",
            category: book.category || "",
            price: book.price,
            totalCopies: book.totalCopies,
          }
        : {
            title: "",
            author: "",
            isbn: "",
            category: "",
            price: 0,
            totalCopies: 0,
          },
    );
    setBookModal(true);
  };

  // ================= LOANS TAB =================
  const [loanStatus, setLoanStatus] = useState("");
  const [loanClass, setLoanClass] = useState("");
  const [issueModal, setIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({
    bookId: "",
    studentId: "",
    dueDate: "",
  });

  const loansQuery = useQuery({
    queryKey: ["library-loans", loanStatus, loanClass],
    queryFn: () =>
      libraryService.getLoans({
        status: loanStatus || undefined,
        classId: loanClass || undefined,
      }),
    enabled: tab === "loans",
  });
  const loans: LibraryLoan[] = loansQuery.data || [];

  const issueStudentsQuery = useQuery({
    queryKey: ["library-issue-students", loanClass],
    queryFn: () =>
      unwrapRes<{ data: StudentRow[] } | StudentRow[]>(
        api.get(`/students${qsCls(loanClass)}`),
      ),
    enabled: issueModal,
  });
  const issueStudents: StudentRow[] = useMemo(() => {
    const raw = issueStudentsQuery.data as any;
    return Array.isArray(raw) ? raw : raw?.data || [];
  }, [issueStudentsQuery.data]);

  const issueBook = useMutation({
    mutationFn: () =>
      libraryService.issueBook({
        bookId: issueForm.bookId,
        studentId: issueForm.studentId,
        dueDate: issueForm.dueDate,
      }),
    onSuccess: () => {
      toast.success("Book issued");
      setIssueModal(false);
      queryClient.invalidateQueries({ queryKey: ["library-loans"] });
      queryClient.invalidateQueries({ queryKey: ["library-books"] });
      queryClient.invalidateQueries({ queryKey: ["library-stats"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const returnBook = useMutation({
    mutationFn: (loanId: string) => libraryService.returnBook(loanId),
    onSuccess: () => {
      toast.success("Book returned");
      queryClient.invalidateQueries({ queryKey: ["library-loans"] });
      queryClient.invalidateQueries({ queryKey: ["library-books"] });
      queryClient.invalidateQueries({ queryKey: ["library-stats"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // ================= FEES TAB =================
  const [feeClass, setFeeClass] = useState("");
  const [feePaid, setFeePaid] = useState("");
  const [assignModal, setAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    bookId: "",
    classId: "",
    amount: "",
  });
  const [pushModal, setPushModal] = useState(false);
  const [pushForm, setPushForm] = useState({
    bookId: "",
    feeStructureId: "",
    onlyPaid: true,
  });

  const feesQuery = useQuery({
    queryKey: ["library-book-fees", feeClass, feePaid],
    queryFn: () =>
      libraryService.getBookFees({
        classId: feeClass || undefined,
        paid: feePaid || undefined,
      }),
    enabled: tab === "fees",
  });
  const fees: LibraryBookFee[] = feesQuery.data || [];

  const assignFee = useMutation({
    mutationFn: () =>
      libraryService.assignBookFeeToClass({
        bookId: assignForm.bookId,
        classId: assignForm.classId,
        ...(assignForm.amount ? { amount: Number(assignForm.amount) } : {}),
      }),
    onSuccess: (r) => {
      toast.success(`Charged ${r.assigned} student(s)`);
      setAssignModal(false);
      queryClient.invalidateQueries({ queryKey: ["library-book-fees"] });
      queryClient.invalidateQueries({ queryKey: ["library-stats"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const togglePaid = useMutation({
    mutationFn: ({ id, paid }: { id: string; paid: boolean }) =>
      libraryService.setBookFeePaid(id, paid),
    onSuccess: (_r, vars) => {
      toast.success(vars.paid ? "Book fee marked as paid" : "Book fee marked as unpaid");
      queryClient.invalidateQueries({ queryKey: ["library-book-fees"] });
      queryClient.invalidateQueries({ queryKey: ["library-stats"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const pushToFees = useMutation({
    mutationFn: () =>
      libraryService.pushBookFeesToSchoolFees({
        bookId: pushForm.bookId,
        feeStructureId: pushForm.feeStructureId,
        onlyPaid: pushForm.onlyPaid,
      }),
    onSuccess: (r: any) => {
      if (r.pushed > 0) {
        toast.success(`Pushed ${r.pushed} charge(s) to school fees`);
      } else {
        toast(r.message || "No unpushed charges match the filter", {
          icon: "ℹ️",
        });
      }
      if (r.errors?.length) {
        toast.error(`${r.errors.length} charge(s) failed — first: ${r.errors[0]}`);
      }
      setPushModal(false);
      queryClient.invalidateQueries({ queryKey: ["library-book-fees"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const statsQuery = useQuery({
    queryKey: ["library-stats"],
    queryFn: () => libraryService.getStats(),
  });
  const stats: LibraryStats | undefined = statsQuery.data;

  // Classes that actually have book-fee charges for the selected book, so the
  // push modal can only target fee structures for those classes. A charge
  // pushed to a fee structure for a different class would never show up on
  // the student's fee breakdown on the Fees page.
  const pushFeeStructures = useMemo(() => {
    if (!pushForm.bookId) return feeStructures;
    const classNames = new Set(
      fees
        .filter((f) => f.bookId === pushForm.bookId)
        .map((f) => f.student?.class?.name)
        .filter(Boolean) as string[],
    );
    return feeStructures.filter((f) => classNames.has(f.className));
  }, [pushForm.bookId, fees, feeStructures]);

  const confirmDelete = (id: string, name: string) => {
    Swal.fire({
      title: "Delete book?",
      text: `"${name}" and all its loan/fee records will be removed.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    }).then((r) => {
      if (r.isConfirmed) deleteBook.mutate(id);
    });
  };

  const inputCls =
    "w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500";
  const labelCls =
    "block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1";

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <BookOpenIcon className="w-7 h-7 text-indigo-500" /> Library
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Books, lending, book fees &amp; who is owing
          </p>
        </div>
        <div className="flex gap-2">
          {tab === "books" && (
            <button
              onClick={() => openBookModal()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <PlusIcon className="w-4 h-4" /> Add Book
            </button>
          )}
          {tab === "loans" && (
            <button
              onClick={() => setIssueModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <PlusIcon className="w-4 h-4" /> Issue Book
            </button>
          )}
          {tab === "fees" && (
            <>
              <button
                onClick={() => setAssignModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <PlusIcon className="w-4 h-4" /> Charge Class
              </button>
              <button
                onClick={() => setPushModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <BanknotesIcon className="w-4 h-4" /> Push to School Fees
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          {
            label: "Total Copies",
            value: stats?.totalCopies ?? "—",
            icon: BookOpenIcon,
            color: "text-indigo-500",
          },
          {
            label: "On Loan",
            value: stats?.onLoan ?? "—",
            icon: ArrowDownTrayIcon,
            color: "text-amber-500",
          },
          {
            label: "Overdue",
            value: stats?.overdue ?? "—",
            icon: ExclamationTriangleIcon,
            color: "text-red-500",
          },
          {
            label: "Paid Book Fees",
            value: stats?.paidFees ?? "—",
            icon: BanknotesIcon,
            color: "text-emerald-500",
          },
          {
            label: "Owing Book Fees",
            value: stats?.unpaidFees ?? "—",
            icon: UsersIcon,
            color: "text-rose-500",
          },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"
          >
            <c.icon className={`w-5 h-5 ${c.color}`} />
            <div className="mt-1 text-2xl font-bold text-slate-800 dark:text-white">
              {c.value}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {c.label}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1 w-fit">
        {(["books", "loans", "fees"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize ${
              tab === t
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {t === "fees" ? "Book Fees" : t}
          </button>
        ))}
      </div>

      {/* ---------- BOOKS ---------- */}
      {tab === "books" && (
        <div className="space-y-3">
          <div className="relative w-72">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={bookSearch}
              onChange={(e) => {
                setBookSearch(e.target.value);
                setBookPage(1);
              }}
              placeholder="Search title, author, ISBN…"
              className={`${inputCls} pl-9`}
            />
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Title</th>
                  <th className="px-4 py-2.5 text-left font-medium">Author</th>
                  <th className="px-4 py-2.5 text-left font-medium">
                    Category
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium">Price</th>
                  <th className="px-4 py-2.5 text-left font-medium">
                    Available / Total
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900">
                {books.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-white">
                      {b.title}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                      {b.author || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                      {b.category || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                      {fmtN(b.price)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          b.availableCopies > 0
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                        }`}
                      >
                        {b.availableCopies}/{b.totalCopies}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right space-x-1">
                      <button
                        onClick={() => openBookModal(b)}
                        className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-500"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => confirmDelete(b.id, b.title)}
                        className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-red-500"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {!books.length && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-slate-400"
                    >
                      No books yet — add your first book.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {booksQuery.data && booksQuery.data.totalPages > 1 && (
            <div className="flex items-center gap-2 justify-end text-sm">
              <button
                disabled={bookPage <= 1}
                onClick={() => setBookPage((p) => p - 1)}
                className="rounded border px-2.5 py-1 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-slate-500">
                Page {bookPage} of {booksQuery.data.totalPages}
              </span>
              <button
                disabled={bookPage >= booksQuery.data.totalPages}
                onClick={() => setBookPage((p) => p + 1)}
                className="rounded border px-2.5 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* ---------- LOANS ---------- */}
      {tab === "loans" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <select
              value={loanStatus}
              onChange={(e) => setLoanStatus(e.target.value)}
              className={`${inputCls} w-44`}
            >
              <option value="">All statuses</option>
              <option value="ON_LOAN">On loan</option>
              <option value="RETURNED">Returned</option>
              <option value="OVERDUE">Overdue</option>
            </select>
            <select
              value={loanClass}
              onChange={(e) => setLoanClass(e.target.value)}
              className={`${inputCls} w-52`}
            >
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Student</th>
                  <th className="px-4 py-2.5 text-left font-medium">Class</th>
                  <th className="px-4 py-2.5 text-left font-medium">Book</th>
                  <th className="px-4 py-2.5 text-left font-medium">Issued</th>
                  <th className="px-4 py-2.5 text-left font-medium">Due</th>
                  <th className="px-4 py-2.5 text-left font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900">
                {loans.map((l) => {
                  const overdue =
                    l.status === "ON_LOAN" && new Date(l.dueDate) < new Date();
                  return (
                    <tr key={l.id}>
                      <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-white">
                        {l.student?.name || l.studentId}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                        {l.student?.class?.name || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                        {l.book?.title || l.bookId}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                        {fmtDate(l.issuedAt)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                        {fmtDate(l.dueDate)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            l.status === "RETURNED"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : overdue
                              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                          }`}
                        >
                          {l.status === "RETURNED"
                            ? "Returned"
                            : overdue
                            ? "Overdue"
                            : "On loan"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {l.status === "ON_LOAN" && (
                          <button
                            onClick={() => returnBook.mutate(l.id)}
                            title="Mark returned"
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                          >
                            <ArrowUturnRightIcon className="w-3.5 h-3.5" />{" "}
                            Return
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!loans.length && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-slate-400"
                    >
                      No loans found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------- BOOK FEES ---------- */}
      {tab === "fees" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <select
              value={feeClass}
              onChange={(e) => setFeeClass(e.target.value)}
              className={`${inputCls} w-52`}
            >
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={feePaid}
              onChange={(e) => setFeePaid(e.target.value)}
              className={`${inputCls} w-44`}
            >
              <option value="">Paid &amp; owing</option>
              <option value="true">Paid only</option>
              <option value="false">Owing only</option>
            </select>
          </div>

          {/* Per-class owing summary */}
          {stats?.perClass?.length ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {stats.perClass.map((c) => (
                <div
                  key={c.classId}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3"
                >
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {c.className}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {c.students} students · {c.issued} copies out · {c.owing}{" "}
                    owing
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Student</th>
                  <th className="px-4 py-2.5 text-left font-medium">Class</th>
                  <th className="px-4 py-2.5 text-left font-medium">Book</th>
                  <th className="px-4 py-2.5 text-left font-medium">Amount</th>
                  <th className="px-4 py-2.5 text-left font-medium">Payment</th>
                  <th className="px-4 py-2.5 text-left font-medium">
                    In School Fees?
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900">
                {fees.map((f) => (
                  <tr key={f.id}>
                    <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-white">
                      {f.student?.name || f.studentId}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                      {f.student?.class?.name || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                      {f.book?.title || f.bookId}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                      {fmtN(f.amount)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          f.paid
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                        }`}
                      >
                        {f.paid ? `Paid ${fmtDate(f.paidAt)}` : "Owing"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                      {f.pushedToFeesAt
                        ? `Pushed ${fmtDate(f.pushedToFeesAt)}`
                        : "Not pushed"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        disabled={
                          togglePaid.isPending &&
                          togglePaid.variables?.id === f.id
                        }
                        onClick={() =>
                          togglePaid.mutate({ id: f.id, paid: !f.paid })
                        }
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-white disabled:opacity-60 ${
                          f.paid
                            ? "bg-slate-500 hover:bg-slate-600"
                            : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                      >
                        {togglePaid.isPending &&
                          togglePaid.variables?.id === f.id && (
                            <svg
                              className="h-3.5 w-3.5 animate-spin"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                              />
                            </svg>
                          )}
                        {togglePaid.isPending &&
                        togglePaid.variables?.id === f.id
                          ? "Saving…"
                          : f.paid
                          ? "Mark unpaid"
                          : "Mark paid"}
                      </button>
                    </td>
                  </tr>
                ))}
                {!fees.length && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-slate-400"
                    >
                      No book fees yet — charge a class to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------- Book modal ---------- */}
      {bookModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setBookModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                {editingBook ? "Edit Book" : "Add Book"}
              </h2>
              <button onClick={() => setBookModal(false)}>
                <XMarkIcon className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Title *</label>
                <input
                  className={inputCls}
                  value={bookForm.title}
                  onChange={(e) =>
                    setBookForm({ ...bookForm, title: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Author</label>
                  <input
                    className={inputCls}
                    value={bookForm.author}
                    onChange={(e) =>
                      setBookForm({ ...bookForm, author: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>ISBN</label>
                  <input
                    className={inputCls}
                    value={bookForm.isbn}
                    onChange={(e) =>
                      setBookForm({ ...bookForm, isbn: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Category</label>
                  <input
                    className={inputCls}
                    value={bookForm.category}
                    onChange={(e) =>
                      setBookForm({ ...bookForm, category: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>Price (₦)</label>
                  <input
                    type="number"
                    min={0}
                    className={inputCls}
                    value={bookForm.price}
                    onChange={(e) =>
                      setBookForm({
                        ...bookForm,
                        price: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>Total copies</label>
                  <input
                    type="number"
                    min={0}
                    className={inputCls}
                    value={bookForm.totalCopies}
                    onChange={(e) =>
                      setBookForm({
                        ...bookForm,
                        totalCopies: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setBookModal(false)}
                className="rounded-lg border px-4 py-2 text-sm text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                disabled={!bookForm.title || saveBook.isPending}
                onClick={() => saveBook.mutate()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saveBook.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Issue modal ---------- */}
      {issueModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIssueModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                Issue Book
              </h2>
              <button onClick={() => setIssueModal(false)}>
                <XMarkIcon className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Book *</label>
                <select
                  className={inputCls}
                  value={issueForm.bookId}
                  onChange={(e) =>
                    setIssueForm({ ...issueForm, bookId: e.target.value })
                  }
                >
                  <option value="">Select a book…</option>
                  {books.map((b) => (
                    <option
                      key={b.id}
                      value={b.id}
                      disabled={b.availableCopies <= 0}
                    >
                      {b.title} ({b.availableCopies} available)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Class</label>
                <select
                  className={inputCls}
                  value={loanClass}
                  onChange={(e) => setLoanClass(e.target.value)}
                >
                  <option value="">All classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Student *</label>
                <select
                  className={inputCls}
                  value={issueForm.studentId}
                  onChange={(e) =>
                    setIssueForm({ ...issueForm, studentId: e.target.value })
                  }
                >
                  <option value="">Select a student…</option>
                  {issueStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Due date *</label>
                <input
                  type="date"
                  className={inputCls}
                  value={issueForm.dueDate}
                  onChange={(e) =>
                    setIssueForm({ ...issueForm, dueDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setIssueModal(false)}
                className="rounded-lg border px-4 py-2 text-sm text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                disabled={
                  !issueForm.bookId ||
                  !issueForm.studentId ||
                  !issueForm.dueDate ||
                  issueBook.isPending
                }
                onClick={() => issueBook.mutate()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {issueBook.isPending ? "Issuing…" : "Issue"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Assign fee modal ---------- */}
      {assignModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setAssignModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                Charge a Class for a Book
              </h2>
              <button onClick={() => setAssignModal(false)}>
                <XMarkIcon className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Book *</label>
                <select
                  className={inputCls}
                  value={assignForm.bookId}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, bookId: e.target.value })
                  }
                >
                  <option value="">Select a book…</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({fmtN(b.price)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Class *</label>
                <select
                  className={inputCls}
                  value={assignForm.classId}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, classId: e.target.value })
                  }
                >
                  <option value="">Select a class…</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>
                  Amount (₦) — leave blank to use the book price
                </label>
                <input
                  type="number"
                  min={0}
                  className={inputCls}
                  value={assignForm.amount}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, amount: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setAssignModal(false)}
                className="rounded-lg border px-4 py-2 text-sm text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                disabled={
                  !assignForm.bookId ||
                  !assignForm.classId ||
                  assignFee.isPending
                }
                onClick={() => assignFee.mutate()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {assignFee.isPending ? "Charging…" : "Charge Class"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Push-to-fees modal ---------- */}
      {pushModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPushModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                Push Book Fees to School Fees
              </h2>
              <button onClick={() => setPushModal(false)}>
                <XMarkIcon className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              Adds each student's book charge onto the selected fee structure on
              their school fee account. Paid charges are recorded as payments;
              unpaid ones appear as pending. Each charge is pushed only once.
            </p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Book *</label>
                <select
                  className={inputCls}
                  value={pushForm.bookId}
                  onChange={(e) =>
                    setPushForm({ ...pushForm, bookId: e.target.value })
                  }
                >
                  <option value="">Select a book…</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Fee structure *</label>
                <select
                  className={inputCls}
                  value={pushForm.feeStructureId}
                  onChange={(e) =>
                    setPushForm({ ...pushForm, feeStructureId: e.target.value })
                  }
                >
                  <option value="">Select a fee structure…</option>
                  {pushFeeStructures.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.className} — {f.term} ({fmtN(f.totalAmount)})
                    </option>
                  ))}
                </select>
                {pushForm.bookId && !pushFeeStructures.length && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    No fee structure matches the classes charged for this book —
                    create one for that class/term on the Fees page first.
                  </p>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={pushForm.onlyPaid}
                  onChange={(e) =>
                    setPushForm({ ...pushForm, onlyPaid: e.target.checked })
                  }
                />
                Only push charges already marked as paid
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPushModal(false)}
                className="rounded-lg border px-4 py-2 text-sm text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                disabled={
                  !pushForm.bookId ||
                  !pushForm.feeStructureId ||
                  pushToFees.isPending
                }
                onClick={() => pushToFees.mutate()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {pushToFees.isPending ? "Pushing…" : "Push"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function qsCls(classId: string) {
  return classId
    ? `?classId=${encodeURIComponent(classId)}&limit=500`
    : "?limit=500";
}
