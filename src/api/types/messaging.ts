import type { ReminderPolicy } from "./charge";

export interface ReminderTemplateRowDTO {
  id?: number;
  company_id?: number;
  phase: string;
  day_min: number;
  day_max: number;
  sort_order: number;
  email_subject: string;
  body: string;
  whatsapp_body: string;
}

export interface MessagingSettingsDTO {
  transfer_instructions: string;
  payment_url_template: string;
  templates: ReminderTemplateRowDTO[];
  reminder_policy: ReminderPolicy;
  /** Hora diaria (HH:MM) del envío automático. */
  send_time: string;
  /** Por fase, con un cobro de ejemplo: plantilla de WhatsApp aprobada y correo del sistema. */
  defaults?: Record<string, MessagingPhaseDefaults>;
}

export interface MessagingPhaseDefaults {
  whatsapp: string;
  email_subject: string;
  email_body: string;
}
