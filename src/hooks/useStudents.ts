import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../utils/api";

export interface Student {
  id: string;
  name: string;
  gender: string;
  admissionNumber?: string;
  createdAt?: string;
  isActive?: boolean;
  class?: { id: string; name: string };
  arm?: { id: string; letter: string; alias?: string };
  parent?: { name: string; phone?: string; email?: string };
  results?: { term: string; score: number; subject: { name: string } }[];
}

export interface ClassOption {
  id: string;
  name: string;
  arms?: { id: string; letter: string; alias?: string }[];
}

async function fetchJson<T>(resOrPromise: Response | Promise<Response>): Promise<T> {
  const res = await resOrPromise;
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

/** Cached students list — dedupes concurrent calls, caches for 1 min */
export function useStudents(token: string | null) {
  return useQuery<Student[]>({
    queryKey: ["students"],
    queryFn: () => fetchJson<Student[]>(api.get("/students", token)),
    enabled: !!token,
    placeholderData: keepPreviousData, // keep old list visible while refetching
  });
}

/** Cached classes list */
export function useClasses(token: string | null) {
  return useQuery<ClassOption[]>({
    queryKey: ["classes"],
    queryFn: () => fetchJson<ClassOption[]>(api.get("/classes", token)),
    enabled: !!token,
    staleTime: 10 * 60 * 1000, // classes rarely change
  });
}

/** Invalidate cached students so every mounted query refetches once */
export function useInvalidateStudents() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["students"] });
}

export function useCreateStudent(token: string | null) {
  const invalidate = useInvalidateStudents();
  return useMutation({
    mutationFn: (body: Record<string, string>) =>
      fetchJson(api.post("/students", body, token)),
    onSuccess: () => {
      toast.success("Student created");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSuspendStudent(token: string | null) {
  const invalidate = useInvalidateStudents();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetchJson(api.patch(`/students/${id}`, { isActive }, token)),
    onSuccess: (_data, vars) => {
      toast.success(
        `Student ${vars.isActive ? "activated" : "suspended"} successfully`,
      );
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteStudent(token: string | null) {
  const invalidate = useInvalidateStudents();
  return useMutation({
    mutationFn: (id: string) => fetchJson(api.del(`/students/${id}`, token)),
    onSuccess: () => {
      toast.success("Student deleted");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useBulkDeleteStudents(token: string | null) {
  const invalidate = useInvalidateStudents();
  return useMutation({
    mutationFn: (ids: string[]) =>
      fetchJson(api.post("/students/bulk-delete", { ids }, token)),
    onSuccess: () => {
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
