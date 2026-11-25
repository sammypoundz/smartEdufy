// Library module API client — wraps backend /api/library endpoints.
import { api } from "../utils/api";
import { unwrapRes } from "../hooks/queryHelpers";

export interface LibraryBook {
  id: string;
  title: string;
  author?: string | null;
  isbn?: string | null;
  category?: string | null;
  price: number;
  totalCopies: number;
  availableCopies: number;
}

export interface LibraryLoan {
  id: string;
  bookId: string;
  studentId: string;
  issuedAt: string;
  dueDate: string;
  returnedAt?: string | null;
  status: string;
  notes?: string | null;
  book?: { title: string; author?: string | null; category?: string | null };
  student?: {
    name: string;
    admissionNumber?: string | null;
    studentCode?: string | null;
    classId?: string | null;
    class?: { name: string } | null;
  };
}

export interface LibraryBookFee {
  id: string;
  bookId: string;
  studentId: string;
  amount: number;
  paid: boolean;
  paidAt?: string | null;
  pushedToFeesAt?: string | null;
  book?: { title: string; author?: string | null; price: number };
  student?: {
    name: string;
    admissionNumber?: string | null;
    studentCode?: string | null;
    classId?: string | null;
    class?: { name: string } | null;
  };
}

export interface LibraryStats {
  totalCopies: number;
  onLoan: number;
  overdue: number;
  unpaidFees: number;
  paidFees: number;
  perClass: {
    classId: string;
    className: string;
    students: number;
    issued: number;
    owing: number;
  }[];
}

const qs = (params: Record<string, string | number | boolean | undefined>) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== null) sp.append(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
};

export const libraryService = {
  // ---------- Stats ----------
  getStats: () => unwrapRes<LibraryStats>(api.get(`/library/stats`)),

  // ---------- Books ----------
  getBooks: (
    filters: { search?: string; page?: number; limit?: number } = {},
  ) =>
    unwrapRes<{ data: LibraryBook[]; total: number; totalPages: number }>(
      api.get(`/library/books${qs(filters)}`),
    ),
  createBook: (body: Partial<LibraryBook>) =>
    unwrapRes<LibraryBook>(api.post(`/library/books`, body)),
  updateBook: (id: string, body: Partial<LibraryBook>) =>
    unwrapRes<LibraryBook>(api.put(`/library/books/${id}`, body)),
  deleteBook: (id: string) => unwrapRes<void>(api.del(`/library/books/${id}`)),

  // ---------- Lending ----------
  getLoans: (
    filters: { status?: string; classId?: string; studentId?: string } = {},
  ) => unwrapRes<LibraryLoan[]>(api.get(`/library/loans${qs(filters)}`)),
  issueBook: (body: {
    bookId: string;
    studentId: string;
    dueDate: string;
    notes?: string;
  }) => unwrapRes<LibraryLoan>(api.post(`/library/loans`, body)),
  returnBook: (loanId: string) =>
    unwrapRes<LibraryLoan>(api.put(`/library/loans/${loanId}/return`, {})),

  // ---------- Book fees ----------
  getBookFees: (
    filters: { classId?: string; bookId?: string; paid?: string } = {},
  ) => unwrapRes<LibraryBookFee[]>(api.get(`/library/book-fees${qs(filters)}`)),
  assignBookFeeToClass: (body: {
    bookId: string;
    classId: string;
    amount?: number;
  }) =>
    unwrapRes<{ assigned: number; amount: number }>(
      api.post(`/library/book-fees/assign`, body),
    ),
  setBookFeePaid: (id: string, paid: boolean) =>
    unwrapRes<LibraryBookFee>(api.put(`/library/book-fees/${id}`, { paid })),
  pushBookFeesToSchoolFees: (body: {
    bookId: string;
    feeStructureId: string;
    onlyPaid?: boolean;
  }) =>
    unwrapRes<{ pushed: number; errors?: string[] }>(
      api.post(`/library/book-fees/push-to-school-fees`, body),
    ),
};
