import axios, { type InternalAxiosRequestConfig } from "axios";
import { getToken, refreshSession, setToken } from "../lib/auth";

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

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
  async (err) => {
    const config = err.config as RetryConfig | undefined;
    const path = window.location.pathname;
    const publicAuth =
      path === "/login" || path === "/register" || path.startsWith("/pay") || path.startsWith("/confirmar-credencial");
    if (err.response?.status === 401 && config && !config._retry && !publicAuth) {
      config._retry = true;
      const ok = await refreshSession();
      if (ok) {
        config.headers.Authorization = `Bearer ${getToken()}`;
        return api(config);
      }
      setToken(null);
      window.location.assign("/login");
    }
    return Promise.reject(err);
  },
);
