// src/utils/upload.ts
import { API_BASE_URL } from "../config/server";

/**
 * Upload a FormData body over XHR so we can report real upload progress.
 *
 * @param endpoint  API endpoint, e.g. "/lesson-plans" or "/questions/upload"
 *                  (a leading "/api" is added automatically, like the `api` helper)
 * @param formData  The FormData to POST
 * @param token     Optional bearer token (defaults to localStorage)
 * @param onProgress Called with 0–100 as bytes are uploaded
 * @param method    HTTP method, defaults to POST
 * @returns The parsed JSON response
 */
export function uploadWithProgress<T = any>(
  endpoint: string,
  formData: FormData,
  token?: string | null,
  onProgress?: (percent: number) => void,
  method: "POST" | "PUT" = "POST",
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);

    // Auth headers (same convention as utils/api.ts)
    const authToken =
      token !== undefined ? token : localStorage.getItem("token");
    if (authToken) xhr.setRequestHeader("Authorization", `Bearer ${authToken}`);
    const tenantId = localStorage.getItem("tenantId");
    if (tenantId) xhr.setRequestHeader("X-Tenant-ID", tenantId);

    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as T);
        } catch {
          resolve(xhr.responseText as unknown as T);
        }
      } else {
        reject(new Error(xhr.responseText || `Upload failed (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.ontimeout = () => reject(new Error("Upload timed out"));

    xhr.send(formData);
  });
}
