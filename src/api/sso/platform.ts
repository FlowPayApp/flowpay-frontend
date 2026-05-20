import { getToken } from "../../lib/auth";
import type { CompanyAdminDTO, CompanyDTO } from "../types";

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

export async function updateCompany(
  companyId: number,
  payload: { name?: string; is_active?: boolean },
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
