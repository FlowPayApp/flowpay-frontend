import { useSyncExternalStore } from "react";

const LEGACY_TOKEN_KEY = "flowpay_token";

export type SessionClaims = {
  uid: number;
  company_id: number;
  email: string;
  role: string;
  exp?: number;
};

let accessToken: string | null = null;
let ready = false;
let refreshInflight: Promise<boolean> | null = null;
let bootstrapInflight: Promise<void> | null = null;

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToken(): string | null {
  return accessToken;
}

export function setToken(token: string | null): void {
  accessToken = token;
  emit();
}

export function isAuthReady(): boolean {
  return ready;
}

export function useAuthToken(): string | null {
  return useSyncExternalStore(subscribe, getToken, getToken);
}

export function useAuthReady(): boolean {
  return useSyncExternalStore(subscribe, isAuthReady, isAuthReady);
}

function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  if (!navigator.locks) return fn();
  return navigator.locks.request("flowpay-refresh", fn);
}

/** Pide un access token nuevo. La cookie de refresh rota en el SSO. */
export function refreshSession(): Promise<boolean> {
  if (!refreshInflight) {
    refreshInflight = withRefreshLock(async () => {
      const res = await fetch("/api/auth/refresh", { method: "POST" });
      if (!res.ok) {
        accessToken = null;
        emit();
        return false;
      }
      const data = (await res.json()) as { access_token?: string };
      if (!data.access_token) {
        accessToken = null;
        emit();
        return false;
      }
      accessToken = data.access_token;
      emit();
      return true;
    }).finally(() => {
      refreshInflight = null;
    });
  }
  return refreshInflight;
}

/** Al recargar no hay token en memoria: se recupera con la cookie, si sigue viva. */
export function bootstrapAuth(): Promise<void> {
  if (!bootstrapInflight) {
    bootstrapInflight = (async () => {
      try {
        localStorage.removeItem(LEGACY_TOKEN_KEY);
      } catch {
        /* almacenamiento no disponible */
      }
      await refreshSession();
      ready = true;
      emit();
    })();
  }
  return bootstrapInflight;
}

export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    /* si la red falla, igual cerramos en este navegador */
  }
  setToken(null);
}

export function getDefaultHomePath(): string {
  const c = getSessionClaims();
  return c?.role === "platform_admin" ? "/platform" : "/";
}

export function getSessionClaims(): SessionClaims | null {
  const token = getToken();
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(payload)
        .split("")
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(""),
    );
    return JSON.parse(json) as SessionClaims;
  } catch {
    return null;
  }
}

/** fetch con Bearer en memoria. Si expiró, renueva una vez y reintenta. */
export async function authorizedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const run = () => {
    const headers = new Headers(init.headers);
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    else headers.delete("Authorization");
    return fetch(input, { ...init, headers });
  };
  const res = await run();
  if (res.status !== 401) return res;
  const ok = await refreshSession();
  if (!ok) return res;
  return run();
}
