// Axios client for the Super Admin platform API (separate auth realm).
import axios from "axios";
import { API_BASE_URL } from "../config/server";

const platformApi = axios.create({
  baseURL: `${API_BASE_URL}/platform`,
  headers: { "Content-Type": "application/json" },
});

platformApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("platformToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

platformApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (
      err.response?.status === 401 &&
      window.location.pathname.startsWith("/platform")
    ) {
      localStorage.removeItem("platformToken");
      localStorage.removeItem("platformUser");
      window.location.href = "/platform/login";
    }
    return Promise.reject(err);
  },
);

export default platformApi;
