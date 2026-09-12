// ============================================================
// SINGLE SOURCE OF TRUTH for the backend server address.
//
// 👉 TO SWITCH SERVERS: edit ONLY the SERVER_URL below.
//
// Examples:
//   Offline/local server on this machine:  https://smartedufybackend.onrender.com
//   Offline server on LAN (another PC):    http://192.168.1.20:5000
//   Cloud (Render):                        https://smartedufybackend.onrender.com
// ============================================================

/** Base server address (NO trailing slash, NO /api suffix) */
export const SERVER_URL = "https://smartedufybackend.onrender.com";

/** Full API base URL used by axios/fetch helpers (with /api) */
export const API_BASE_URL = `${SERVER_URL}/api`;

/**
 * Resolve a backend-relative path (e.g. "/uploads/x.png") against the server.
 * Absolute URLs are returned unchanged.
 */
export const resolveUrl = (url: string): string =>
  url.startsWith("http") ? url : `${SERVER_URL}${url}`;
