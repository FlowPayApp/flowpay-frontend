import axios from "axios";
import { getToken, setToken } from "../lib/auth";

export const api = axios.create({
  baseURL: "",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) {
    config.headers.Authorization = `Bearer ${t}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const path = window.location.pathname;
    const publicAuth =
      path === "/login" || path === "/register" || path.startsWith("/pay");
    if (err.response?.status === 401 && !publicAuth) {
      setToken(null);
      window.location.assign("/login");
    }
    return Promise.reject(err);
  },
);
