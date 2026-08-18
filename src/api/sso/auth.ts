import { getToken } from "../../lib/auth";
import type { CompanyUserDTO, MyProfileDTO } from "../types";

export async function firstPasswordChange(payload: {
  email: string;
  password: string;
  new_password: string;
}) {
  const res = await fetch("/auth/password/first-change", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "No se pudo actualizar contraseña");
  }
}

export async function getMyProfile() {
  const t = getToken();
  const res = await fetch("/auth/me", {
    headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<MyProfileDTO>;
}

export async function updateMyProfile(payload: { email: string; name: string; password?: string }) {
  const t = getToken();
  const res = await fetch("/auth/me", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function listCompanyUsers() {
  const t = getToken();
  const res = await fetch("/auth/company/users", {
    headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}) },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || "No se pudo listar el equipo");
  }
  if (!text) return [];
  return JSON.parse(text) as CompanyUserDTO[];
}

export async function createCompanyUser(payload: {
  email: string;
  password: string;
  name: string;
  role: "admin" | "member";
}) {
  const t = getToken();
  const res = await fetch("/auth/company/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "No se pudo crear el usuario");
  }
}
