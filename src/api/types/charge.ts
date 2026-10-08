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
  /** Canal preferido de la sucursal: all, email, whatsapp o none. */
  client_followup_channel?: string;
  attachment_token?: string | null;
  attachment_ext?: string | null;
  /** Si falta en la respuesta, la UI asume pendiente */
  status?: ChargeStatus;
  /** Solo en el detalle: canales en espera y desde cuándo se puede volver a enviar un recordatorio. */
  next_reminder_at?: Partial<Record<ReminderChannel, string>>;
}

export type ReminderChannel = "whatsapp" | "email";

export interface Reminder {
  id: number;
  charge_id: number;
  kind: string;
  channel: string;
  status: string;
  message?: string | null;
  created_at: string;
  sent_at?: string | null;
  /** Solo WhatsApp: entrega informada por Twilio. Vacío en los enviados antes del seguimiento. */
  delivery_status?: string;
  delivery_error?: string;
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
  /** En los enviados: queued, sent, delivered, read, failed o undelivered (avisos de Twilio). */
  status: string;
  delivery_error?: string;
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
