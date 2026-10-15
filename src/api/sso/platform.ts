import { authorizedFetch } from "../../lib/auth";
import type { CompanyAdminDTO, CompanyDTO, PlatformAdminDTO, SignupPlan } from "../types";

export async function createCompany(payload: { name: string }) {
  const res = await authorizedFetch("/auth/platform/companies", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readApiError(res, "No se pudo crear la empresa"));
  return res.json() as Promise<{ company_id: number }>;
}

export async function listCompanies() {
  const res = await authorizedFetch("/auth/platform/companies", {
    headers: {},
  });
  if (!res.ok) throw new Error(await readApiError(res, "No se pudieron cargar las empresas"));
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
  const res = await authorizedFetch(`/auth/platform/companies/${companyId}`, {
    method: "DELETE",
    headers: {},
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
  const res = await authorizedFetch(`/auth/platform/plans/${planId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
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
  const res = await authorizedFetch(`/auth/platform/companies/${companyId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readApiError(res, "No se pudo guardar la empresa"));
  return res.json() as Promise<{ ok?: boolean; email?: string; password_sent?: boolean }>;
}

export async function createAdminForCompany(payload: {
  company_id: number;
  email: string;
  name: string;
}) {
  const res = await authorizedFetch("/auth/platform/company-admins", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readApiError(res, "No se pudo crear el admin"));
  return res.json() as Promise<{
    user_id: number;
    company_id: number;
    role: string;
    password_sent: boolean;
    must_change_password: boolean;
  }>;
}

export async function createPlatformAdmin(payload: { email: string; name: string }) {
  const res = await authorizedFetch("/auth/platform/admins", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readApiError(res, "No se pudo crear el superadmin"));
  return res.json() as Promise<{
    user_id: number;
    role: string;
    password_sent: boolean;
    must_change_password: boolean;
  }>;
}

export async function updatePlatformAdmin(userId: number, payload: { is_active: boolean }) {
  const res = await authorizedFetch(`/auth/platform/admins/${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readApiError(res, "No se pudo guardar el superadmin"));
  return res.json() as Promise<{ ok?: boolean; signed_out?: boolean }>;
}

export async function deletePlatformAdmin(userId: number) {
  const res = await authorizedFetch(`/auth/platform/admins/${userId}`, {
    method: "DELETE",
    headers: {},
  });
  if (!res.ok) throw new Error(await readApiError(res, "No se pudo borrar el superadmin"));
  return res.json() as Promise<{ ok?: boolean; signed_out?: boolean }>;
}

export async function listPlatformAdmins() {
  const res = await authorizedFetch("/auth/platform/admins", {
    headers: {},
  });
  if (!res.ok) throw new Error(await readApiError(res, "No se pudieron cargar los superadmins"));
  return res.json() as Promise<PlatformAdminDTO[]>;
}

export async function listCompanyAdmins() {
  const res = await authorizedFetch("/auth/platform/company-admins", {
    headers: {},
  });
  if (!res.ok) throw new Error(await readApiError(res, "No se pudieron cargar los admins"));
  return res.json() as Promise<CompanyAdminDTO[]>;
}

export async function updateCompanyAdmin(
  userId: number,
  payload: { email?: string; name?: string; is_active?: boolean },
) {
  const res = await authorizedFetch(`/auth/platform/company-admins/${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readApiError(res, "No se pudo guardar el admin"));
}

export async function deleteCompanyAdmin(userId: number) {
  const res = await authorizedFetch(`/auth/platform/company-admins/${userId}`, {
    method: "DELETE",
    headers: {},
  });
  if (!res.ok) throw new Error(await readApiError(res, "No se pudo borrar el admin"));
}

export async function resetCompanyAdminPassword(userId: number) {
  const res = await authorizedFetch(`/auth/platform/company-admins/${userId}/reset-password`, {
    method: "POST",
    headers: {},
  });
  if (!res.ok) throw new Error(await readApiError(res, "No se pudo resetear la contraseña"));
  return res.json() as Promise<{
    password_sent: boolean;
    must_change_password: boolean;
  }>;
}
