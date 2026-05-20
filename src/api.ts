import axios from "axios";
import { getToken, setToken } from "./lib/auth";
import { paymentsApiUrl } from "./lib/paymentsApiBase";

const api = axios.create({
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
  /** En cobros: texto mostrado como deudor (solo sucursal). */
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
  /** Encargado del local (columna NOMBRE en import). */
  name: string;
  email?: string | null;
  phone?: string | null;
  /** Clave única de import (sucursal|CODIGO). */
  external_code?: string | null;
  address?: string | null;
  /** CODIGO en planilla. */
  client_code?: string | null;
  /** Nombre de la sucursal (SUCURSAL). */
  branch_name?: string | null;
  /** Método de pago (columna MPAGO en plantilla). */
  payment_terms?: string | null;
  /** Si falta (API antigua), se asume activo. */
  is_active?: boolean;
  /** Preferencia de seguimiento automático: all|email|whatsapp|none. */
  followup_channel?: "all" | "email" | "whatsapp" | "none";
  created_at: string;
  risk_level: "low" | "medium" | "high";
  total_owed: number;
  overdue_count: number;
  /** Cantidad de cobros asociados al cliente (0 = aún sin cobros). */
  charge_count?: number;
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

/** Mensaje WhatsApp entrante asociado al cobro (respuesta del cliente). */
export interface ChargeInboundWhatsApp {
  id: number;
  company_id: number;
  charge_id?: number | null;
  from_number: string;
  to_number: string;
  content: string;
  direction: string;
  status: string;
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

export async function deleteCharge(id: number) {
  await api.delete(`/api/charges/${id}`);
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

export async function fetchClient(id: number) {
  const { data } = await api.get<ClientDTO>(`/api/clients/${id}`);
  return data;
}

export async function deleteClient(id: number) {
  await api.delete(`/api/clients/${id}`);
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
  email?: string;
  phone?: string;
  address?: string;
  client_code?: string;
  branch_name?: string;
  payment_terms?: string;
}) {
  const { data } = await api.post<{ id: number }>("/api/clients", payload);
  return data;
}

export type UpdateClientPayload = {
  is_active?: boolean;
  followup_channel?: "all" | "email" | "whatsapp" | "none";
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  client_code?: string;
  branch_name?: string;
  payment_terms?: string;
};

export async function updateClient(clientId: number, payload: UpdateClientPayload) {
  await api.patch(`/api/clients/${clientId}`, payload);
}

export interface ImportDistributorResult {
  created: number;
  updated: number;
  errors: { line: number; message: string }[];
}

export async function importClientsDistributorRows(rows: string[][], filename?: string) {
  const { data } = await api.post<ImportDistributorResult>("/api/clients/import-distributor-rows", {
    rows,
    ...(filename ? { filename } : {}),
  });
  return data;
}

export interface ClientImportBatchListItem {
  id: number;
  created_at: string;
  source: string;
  filename?: string | null;
  created_count: number;
  updated_count: number;
  error_count: number;
}

export interface ClientImportBatchDetail extends ClientImportBatchListItem {
  errors: { line: number; message: string }[];
}

export async function fetchClientImportBatches() {
  const { data } = await api.get<ClientImportBatchListItem[]>("/api/clients/import-batches");
  return data;
}

export async function fetchClientImportBatch(id: number) {
  const { data } = await api.get<ClientImportBatchDetail>(`/api/clients/import-batches/${id}`);
  return data;
}

export async function fetchReminders(chargeId: number) {
  const { data } = await api.get<Reminder[] | null>(`/api/charges/${chargeId}/reminders`);
  return data ?? [];
}

export async function fetchChargeInboundWhatsApp(chargeId: number) {
  try {
    const { data } = await api.get<ChargeInboundWhatsApp[]>(`/api/charges/${chargeId}/inbound-whatsapp`);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** Demo: inserta un WhatsApp entrante vinculado al cobro (misma línea de tiempo que Twilio real). */
export async function simulateChargeInboundWhatsApp(chargeId: number, text?: string) {
  const { data } = await api.post<ChargeInboundWhatsApp>(`/api/charges/${chargeId}/inbound-whatsapp/simulate`, {
    ...(text != null && text.trim() !== "" ? { text: text.trim() } : {}),
  });
  return data;
}

export interface ReminderTemplateRowDTO {
  id?: number;
  company_id?: number;
  phase: string;
  day_min: number;
  day_max: number;
  sort_order: number;
  email_subject: string;
  body: string;
}

export interface MessagingSettingsDTO {
  transfer_instructions: string;
  payment_url_template: string;
  templates: ReminderTemplateRowDTO[];
}

export async function fetchCompanyMessaging() {
  const { data } = await api.get<MessagingSettingsDTO>("/api/company/messaging");
  return data;
}

export async function saveCompanyMessaging(payload: {
  transfer_instructions: string;
  payment_url_template: string;
  templates: {
    phase: string;
    day_min: number;
    day_max: number;
    sort_order: number;
    email_subject: string;
    body: string;
  }[];
}) {
  await api.put("/api/company/messaging", payload);
}

export async function sendReminderNow(chargeId: number) {
  await api.post(`/api/charges/${chargeId}/reminders`);
}

export async function recordPayment(chargeId: number, amount: number) {
  await api.post(paymentsApiUrl("/api/payments"), { charge_id: chargeId, amount });
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

export type {
  PaymentPortalCompany,
  PaymentPortalClient,
  PaymentPortalTotals,
  PortalCharge,
  PaymentPortalResponse,
  PaymentCheckoutResponse,
  PaymentCommitResponse,
} from "./lib/publicPayApi";

export { fetchPaymentPortal, startPaymentCheckout, commitPaymentReturn, isPaymentMock } from "./lib/publicPayApi";
