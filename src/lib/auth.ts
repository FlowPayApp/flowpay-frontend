const TOKEN_KEY = "flowpay_token";

export type SessionClaims = {
  uid: number;
  company_id: number;
  email: string;
  role: string;
  exp?: number;
};

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function logout(): void {
  setToken(null);
}

/** Ruta inicial tras iniciar sesión: superadmin → panel plataforma; resto → resumen empresa. */
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
