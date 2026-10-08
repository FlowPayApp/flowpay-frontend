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
  /** Fotos, audios o documentos del mensaje. */
  media?: { content_type: string; file_name?: string }[] | null;
  direction: string;
  status: string;
  /** Solo en respuestas del cliente: cuándo alguien de la empresa la vio. */
  read_at?: string | null;
  created_at: string;
}

/** Respuestas sin leer de un cobro. */
export interface UnreadThread {
  charge_id: number;
  client_name: string;
  unread: number;
  last_at: string;
  preview: string;
  has_media: boolean;
}

export interface Inbox {
  total: number;
  threads: UnreadThread[];
}
