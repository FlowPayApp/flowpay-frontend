import { api } from "../client";

export interface CompanyMailbox {
  id?: number;
  company_id: number;
  from_name: string;
  from_email: string;
  smtp_host: string;
  smtp_port: string;
  smtp_username: string;
  password_set?: boolean;
  updated_at?: string;
}

export async function listPlatformMailboxes() {
  const { data } = await api.get<CompanyMailbox[]>("/api/platform/mailboxes");
  return Array.isArray(data) ? data : [];
}

export async function assignCompanyMailbox(
  companyId: number,
  body: {
    from_name: string;
    from_email: string;
    smtp_host: string;
    smtp_port: string;
    smtp_username: string;
    smtp_password: string;
  },
) {
  const { data } = await api.put<CompanyMailbox>(`/api/platform/companies/${companyId}/mailbox`, body);
  return data;
}
