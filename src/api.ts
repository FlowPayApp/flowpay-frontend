import axios from "axios";
import { getToken, setToken } from "./lib/auth";

const api = axios.create({
  baseURL: "",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) {
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const path = window.location.pathname;
    const publicAuth = path === "/login" || path === "/register";
    if (err.response?.status === 401 && !publicAuth) {
      setToken(null);
      window.location.assign("/login");
    }
    return Promise.reject(err);
  },
);

/** Estado del cobro en la app (no confundir con boleta/factura electrónica). */
export type ChargeStatus = "pending" | "paid" | "overdue";

/** Cobro = monto que te deben; la boleta/factura legal es aparte. */
export interface ChargeDTO {
  id: number;
  company_id: number;
  client_id: number;
  amount: number;
  due_date: string;
  paid_at?: string | null;
  created_at: string;
  client_name?: string;
  client_email?: string | null;
  client_phone?: string | null;
  attachment_token?: string | null;
  attachment_ext?: string | null;
  /** Si falta en la respuesta, la UI asume pendiente */
  status?: ChargeStatus;
}

export interface ClientDTO {
  id: number;
  company_id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  /** Si falta (API antigua), se asume activo. */
  is_active?: boolean;
  /** Preferencia de seguimiento automático: all|email|whatsapp|none. */
  followup_channel?: "all" | "email" | "whatsapp" | "none";
  created_at: string;
  risk_level: "low" | "medium" | "high";
  total_owed: number;
  overdue_count: number;
}

export interface DashboardTotals {
  pending_amount: number;
  overdue_amount: number;
  paid_amount: number;
  pending_count: number;
  overdue_count: number;
  paid_count: number;
}

export interface DashboardResponse {
  totals: DashboardTotals;
  charges_needing_attention: ChargeDTO[];
  tagline: string;
  product_name: string;
}

export interface PlatformCompanyOverview {
  company_id: number;
  company_name: string;
  paid_amount: number;
  pending_amount: number;
  overdue_amount: number;
  owed_amount: number;
}

export interface PlatformOverviewResponse {
  companies: PlatformCompanyOverview[];
  total_companies: number;
  total_paid: number;
  total_pending: number;
  total_overdue: number;
  total_owed: number;
}

export interface CompanyDTO {
  id: number;
  name: string;
  /** Si falta (API antigua), se asume activa. */
  is_active?: boolean;
  /** Cantidad de clientes asociados a la empresa. */
  client_count?: number;
  /** Cantidad de admins asociados a la empresa. */
  admin_count?: number;
}

export interface CompanyAdminDTO {
  user_id: number;
  company_id: number;
  company_name: string;
  email: string;
  name: string;
  role: string;
  /** Si falta (API antigua), se asume activo. */
  is_active?: boolean;
}

export interface Reminder {
  id: number;
  charge_id: number;
  kind: string;
  channel: string;
  status: string;
  message?: string | null;
  created_at: string;
  sent_at?: string | null;
}

export interface MessageDTO {
  id: number;
  company_id: number;
  from_number: string;
  to_number: string;
  content: string;
  direction: "inbound" | "outbound";
  status: "sent" | "delivered" | "failed" | "received";
  created_at: string;
}

export interface MyProfileDTO {
  user_id: number;
  email: string;
  name: string;
  role: string;
  company_id: number;
  is_active: boolean;
}

export async function fetchDashboard() {
  const { data } = await api.get<DashboardResponse>("/api/dashboard");
  return data;
}

export async function fetchPlatformOverview() {
  const { data } = await api.get<PlatformOverviewResponse>("/api/platform/overview");
  return data;
}

export async function fetchCharges() {
  const { data } = await api.get<ChargeDTO[]>("/api/charges");
  return data;
}

export async function fetchCharge(id: number) {
  const { data } = await api.get<ChargeDTO>(`/api/charges/${id}`);
  return data;
}

export async function patchCharge(
  id: number,
  body: {
    client_id?: number;
    due_date?: string;
    amount?: number;
    set_paid?: boolean;
  },
) {
  const { data } = await api.patch<ChargeDTO>(`/api/charges/${id}`, body);
  return data;
}

export async function fetchClients() {
  const { data } = await api.get<ClientDTO[]>("/api/clients");
  return data;
}

export async function createCharge(payload: {
  client_id: number;
  amount: number;
  due_date: string;
}) {
  const { data } = await api.post<{ id: number }>("/api/charges", payload);
  return data;
}

export async function createClient(payload: {
  name: string;
  email: string;
  phone: string;
}) {
  const { data } = await api.post<{ id: number }>("/api/clients", payload);
  return data;
}

export async function updateClient(
  clientId: number,
  payload: { is_active?: boolean; followup_channel?: "all" | "email" | "whatsapp" | "none" },
) {
  await api.patch(`/api/clients/${clientId}`, payload);
}

export async function fetchReminders(chargeId: number) {
  const { data } = await api.get<Reminder[] | null>(`/api/charges/${chargeId}/reminders`);
  return data ?? [];
}

export async function sendReminderNow(chargeId: number) {
  await api.post(`/api/charges/${chargeId}/reminders`);
}

export async function fetchMessages(limit = 50, offset = 0, phone?: string) {
  const { data } = await api.get<MessageDTO[]>("/api/messages", {
    params: { limit, offset, ...(phone ? { phone } : {}) },
  });
  return data;
}

export async function sendMessage(payload: { to: string; message: string }) {
  await api.post("/api/messages/send", payload);
}

export async function recordPayment(chargeId: number, amount: number) {
  await api.post("/api/payments", { charge_id: chargeId, amount });
}

/** PDF o imagen (máx. 8 MB). Se adjunta al WhatsApp de recordatorio si defines FLOWPAY_PUBLIC_BASE_URL en el API. */
export async function uploadChargeAttachment(chargeId: number, file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const headers: HeadersInit = {};
  const t = getToken();
  if (t) {
    headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(`/api/charges/${chargeId}/attachment`, {
    method: "POST",
    headers,
    body: fd,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Error al subir");
  }
}

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
