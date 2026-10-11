import { getToken } from "../../lib/auth";
import { api } from "../client";
import type { ChargeDTO, ChargeInboundWhatsApp, ChargeRemindersPayload, Inbox, Reminder, ReminderChannel } from "../types";

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
  } & ChargeRemindersPayload,
) {
  const { data } = await api.patch<ChargeDTO>(`/api/charges/${id}`, body);
  return data;
}

export async function createCharge(
  payload: {
    client_id: number;
    amount: number;
    due_date: string;
  } & ChargeRemindersPayload,
) {
  const { data } = await api.post<{ id: number }>("/api/charges", payload);
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

export async function fetchChargeInboundMedia(chargeId: number, messageId: number, index: number) {
  const { data } = await api.get<Blob>(`/api/charges/${chargeId}/inbound-whatsapp/${messageId}/media/${index}`, {
    responseType: "blob",
  });
  return data;
}

/** Demo: inserta un WhatsApp entrante vinculado al cobro (misma línea de tiempo que Twilio real). */
export async function simulateChargeInboundWhatsApp(chargeId: number, text?: string) {
  const { data } = await api.post<ChargeInboundWhatsApp>(`/api/charges/${chargeId}/inbound-whatsapp/simulate`, {
    ...(text != null && text.trim() !== "" ? { text: text.trim() } : {}),
  });
  return data;
}

export async function sendReminderNow(chargeId: number, channels: ReminderChannel[]) {
  await api.post(`/api/charges/${chargeId}/reminders`, { channels });
}

export async function sendChargeWhatsAppReply(chargeId: number, text: string) {
  const { data } = await api.post<ChargeInboundWhatsApp>(`/api/charges/${chargeId}/whatsapp`, { text });
  return data;
}

/** Foto JPG/PNG o PDF de hasta 5 MB, con texto opcional como pie. */
export async function sendChargeWhatsAppFile(chargeId: number, file: File, text: string) {
  const fd = new FormData();
  fd.append("file", file);
  if (text.trim()) fd.append("text", text.trim());
  const headers: HeadersInit = {};
  const t = getToken();
  if (t) {
    headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(`/api/charges/${chargeId}/whatsapp/file`, { method: "POST", headers, body: fd });
  const body = await res.text();
  if (!res.ok) {
    let message = "No se pudo enviar el archivo.";
    try {
      const data = JSON.parse(body) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* el cuerpo no es JSON */
    }
    throw new Error(message);
  }
  return JSON.parse(body) as ChargeInboundWhatsApp;
}

export async function markChargeRead(chargeId: number) {
  await api.post(`/api/charges/${chargeId}/read`);
}

export async function fetchInbox() {
  const { data } = await api.get<Inbox>("/api/inbox");
  return data;
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
    let message = text || "No se pudo adjuntar la factura.";
    try {
      const data = JSON.parse(text) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* el cuerpo no es JSON */
    }
    throw new Error(message);
  }
}
