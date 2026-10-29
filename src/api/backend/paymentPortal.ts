import { api } from "../client";

export interface PaymentPortalSettings {
  mode: "flowpay" | "external";
  url: string;
  pending_url: string;
  rejection: string;
}

export interface PendingPaymentPortal {
  company_id: number;
  company_name: string;
  mode: string;
  url: string;
  pending_url: string;
  pending_at?: string | null;
}

export async function fetchCompanyPaymentPortal() {
  const { data } = await api.get<PaymentPortalSettings>("/api/company/payment-portal");
  return data;
}

export async function saveCompanyPaymentPortal(payload: { mode: "flowpay" | "external"; url?: string }) {
  const { data } = await api.put<PaymentPortalSettings>("/api/company/payment-portal", payload);
  return data;
}

export async function listPendingPaymentPortals() {
  const { data } = await api.get<PendingPaymentPortal[]>("/api/platform/payment-portals");
  return Array.isArray(data) ? data : [];
}

export async function approvePaymentPortal(companyId: number) {
  await api.post(`/api/platform/companies/${companyId}/payment-portal/approve`, {});
}

export async function rejectPaymentPortal(companyId: number, reason: string) {
  await api.post(`/api/platform/companies/${companyId}/payment-portal/reject`, { reason });
}
