export interface ReminderTemplateRowDTO {
  id?: number;
  company_id?: number;
  phase: string;
  day_min: number;
  day_max: number;
  sort_order: number;
  email_subject: string;
  body: string;
}

export interface MessagingSettingsDTO {
  transfer_instructions: string;
  payment_url_template: string;
  templates: ReminderTemplateRowDTO[];
}
