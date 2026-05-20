import { api } from "../client";
import type { MessagingSettingsDTO } from "../types";

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
