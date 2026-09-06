// Shared helpers for TanStack Query migrations.
// Normalises the two API utilities used across the app:
//  - services/api (axios-like: returns { data })
//  - utils/api    (fetch-like: returns Response)

export interface ApiErrorPayload {
  error?: string;
  message?: string;
}

export function getErrorMessage(
  err: unknown,
  fallback = "Something went wrong",
): string {
  if (err && typeof err === "object") {
    const anyErr = err as {
      response?: { data?: ApiErrorPayload | string };
      message?: string;
    };
    const data = anyErr.response?.data;
    if (typeof data === "string" && data) return data;
    if (data && typeof data === "object") {
      if (data.error) return data.error;
      if (data.message) return data.message;
    }
    if (anyErr.message) return anyErr.message;
  }
  return fallback;
}

/** Unwrap an axios-style response into typed data. */
export async function unwrap<T>(promise: Promise<{ data: T }>): Promise<T> {
  const res = await promise;
  return res.data;
}

/** Unwrap a fetch Response into typed JSON, throwing on HTTP errors. */
export async function unwrapRes<T>(
  promise: Response | Promise<Response>,
): Promise<T> {
  const res = await promise;
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return (await res.json()) as T;
}
