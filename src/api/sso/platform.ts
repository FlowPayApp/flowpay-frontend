import { getToken } from "../../lib/auth";
import type { CompanyAdminDTO, CompanyDTO, SignupPlan } from "../types";

export async function createCompany(payload: { name: string }) {
  const t = getToken();
  const res = await fetch("/auth/platform/companies", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "No se pudo crear la empresa");
  }
  return res.json() as Promise<{ company_id: number }>;
}

export async function listCompanies() {
  const t = getToken();
  const res = await fetch("/auth/platform/companies", {
    headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<CompanyDTO[]>;
}

async function readApiError(res: Response, fallback: string): Promise<string> {
  const text = await res.text();
  try {
    const data = JSON.parse(text) as { error?: string };
    if (typeof data.error === "string" && data.error.trim()) return data.error;
  } catch {
    /* respuesta en texto */
  }
  return text.trim() || fallback;
}

export async function deleteCompany(companyId: number) {
  const t = getToken();
  const res = await fetch(`/auth/platform/companies/${companyId}`, {
    method: "DELETE",
    headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}) },
  });
  if (!res.ok) throw new Error(await readApiError(res, "No se pudo borrar la empresa"));
}

export async function listSignupPlans() {
  const res = await fetch("/auth/plans");
  if (!res.ok) throw new Error(await readApiError(res, "No se pudieron cargar los planes"));
  return res.json() as Promise<SignupPlan[]>;
}

export async function updateSignupPlan(
  planId: string,
  payload: {
    label: string;
    detail: string;
    price_clp: number;
    features: string[];
    highlight: boolean;
    commission_percent: number;
  },
) {
  const t = getToken();
  const res = await fetch(`/auth/platform/plans/${planId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readApiError(res, "No se pudo guardar el plan"));
  return res.json() as Promise<SignupPlan>;
}

export async function updateCompany(
  companyId: number,
  payload: {
    name?: string;
    is_active?: boolean;
    requested_plan?: string;
    price_clp_override?: number;
    commission_percent_override?: number;
    clear_price_override?: boolean;
    clear_commission_override?: boolean;
  },
) {
  const t = getToken();
  const res = await fetch(`/auth/platform/companies/${companyId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ ok?: boolean; email?: string; temporary_password?: string }>;
}

export async function createAdminForCompany(payload: {
  company_id: number;
  email: string;
  name: string;
}) {
  const t = getToken();
  const res = await fetch("/auth/platform/company-admins", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "No se pudo crear admin");
  }
  return res.json() as Promise<{
    user_id: number;
    company_id: number;
    role: string;
    temporary_password: string;
    must_change_password: boolean;
  }>;
}

export async function listCompanyAdmins() {
  const t = getToken();
  const res = await fetch("/auth/platform/company-admins", {
    headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<CompanyAdminDTO[]>;
}

export async function updateCompanyAdmin(
  userId: number,
  payload: { email?: string; name?: string; is_active?: boolean },
) {
  const t = getToken();
  const res = await fetch(`/auth/platform/company-admins/${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function deleteCompanyAdmin(userId: number) {
  const t = getToken();
  const res = await fetch(`/auth/platform/company-admins/${userId}`, {
    method: "DELETE",
    headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}) },
  });
  if (!res.ok) throw new Error(await readApiError(res, "No se pudo borrar el admin"));
}

export async function resetCompanyAdminPassword(userId: number) {
  const t = getToken();
  const res = await fetch(`/auth/platform/company-admins/${userId}/reset-password`, {
    method: "POST",
    headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "No se pudo resetear contraseña");
  }
  return res.json() as Promise<{
    temporary_password: string;
    must_change_password: boolean;
  }>;
}
