import { api } from "../client";

export interface CompanyWhatsAppNumber {
  id?: number;
  company_id: number;
  phone_number: string;
  twilio_sid?: string;
  status?: string;
  created_at?: string;
}

export async function listPlatformWhatsAppNumbers() {
  const { data } = await api.get<CompanyWhatsAppNumber[]>("/api/platform/whatsapp-numbers");
  return Array.isArray(data) ? data : [];
}

export async function assignCompanyWhatsApp(companyId: number, phoneNumber: string) {
  const { data } = await api.put<CompanyWhatsAppNumber>(`/api/platform/companies/${companyId}/whatsapp`, {
    phone_number: phoneNumber,
  });
  return data;
}
