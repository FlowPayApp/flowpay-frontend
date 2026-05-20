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
