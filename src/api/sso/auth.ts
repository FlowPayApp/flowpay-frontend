import { authorizedFetch } from "../../lib/auth";
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
  const res = await authorizedFetch("/auth/me", {
    headers: {},
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<MyProfileDTO>;
}

export async function updateMyProfile(payload: { email: string; name: string; password?: string }) {
  const res = await authorizedFetch("/auth/me", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function listCompanyUsers() {
  const res = await authorizedFetch("/auth/company/users", {
    headers: {},
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
  const res = await authorizedFetch("/auth/company/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "No se pudo crear el usuario");
  }
}

async function readApiError(res: Response, fallback: string) {
  const text = await res.text();
  if (!text) return fallback;
  try {
    const data = JSON.parse(text) as { error?: string };
    return data.error || fallback;
  } catch {
    return text;
  }
}

export async function updateCompanyUser(
  userId: number,
  payload: { email: string; name: string; role: "admin" | "member"; is_active: boolean },
) {
  const res = await authorizedFetch(`/auth/company/users/${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res, "No se pudo guardar el usuario"));
  }
}

export async function deleteCompanyUser(userId: number) {
  const res = await authorizedFetch(`/auth/company/users/${userId}`, {
    method: "DELETE",
    headers: {},
  });
  if (!res.ok) {
    throw new Error(await readApiError(res, "No se pudo eliminar el usuario"));
  }
}
