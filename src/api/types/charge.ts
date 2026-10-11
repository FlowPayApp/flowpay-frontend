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
  /** Solo en el detalle: de dónde sale la frecuencia de los recordatorios automáticos. */
  reminder_mode?: ReminderMode;
  /** Solo en el detalle: canal de los automáticos; vacío usa el de la sucursal. */
  reminder_channel?: string;
  /** Solo en el detalle: la frecuencia que rige (la propia o la de la empresa). */
  reminder_policy?: ReminderPolicy;
  /** Solo en el detalle: la frecuencia de la empresa. */
  company_reminder_policy?: ReminderPolicy;
}

export type ReminderChannel = "whatsapp" | "email";

/** company = la frecuencia de la empresa; custom = una propia del cobro; off = sin recordatorios automáticos. */
export type ReminderMode = "company" | "custom" | "off";

/** Cuándo salen los recordatorios automáticos. */
export interface ReminderPolicy {
  /** Días antes del vencimiento; 0 es el mismo día. */
  days_before: number[];
  /** Con el cobro vencido, cada cuántos días se insiste. */
  overdue_every: number;
  /** Tope de avisos con el cobro vencido: 0 ninguno, -1 sin tope. */
  overdue_max: number;
}

/** Cambios a los recordatorios automáticos de un cobro. */
export interface ChargeRemindersPayload {
  reminder_mode?: ReminderMode;
  reminder_channel?: string;
  reminder_policy?: ReminderPolicy;
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
