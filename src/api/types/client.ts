export interface ClientDTO {
  id: number;
  company_id: number;
  /** Encargado del local (columna NOMBRE en import). */
  name: string;
  email?: string | null;
  phone?: string | null;
  /** Clave única de import (sucursal|CODIGO). */
  external_code?: string | null;
  address?: string | null;
  /** CODIGO en planilla. */
  client_code?: string | null;
  /** Nombre de la sucursal (SUCURSAL). */
  branch_name?: string | null;
  /** Método de pago (columna MPAGO en plantilla). */
  payment_terms?: string | null;
  /** Si falta (API antigua), se asume activo. */
  is_active?: boolean;
  /** Preferencia de seguimiento automático: all|email|whatsapp|none. */
  followup_channel?: "all" | "email" | "whatsapp" | "none";
  created_at: string;
  risk_level: "low" | "medium" | "high";
  total_owed: number;
  overdue_count: number;
  /** Cantidad de cobros asociados al cliente (0 = aún sin cobros). */
  charge_count?: number;
}

export type UpdateClientPayload = {
  is_active?: boolean;
  followup_channel?: "all" | "email" | "whatsapp" | "none";
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  client_code?: string;
  branch_name?: string;
  payment_terms?: string;
};

export interface ImportDistributorResult {
  created: number;
  updated: number;
  errors: { line: number; message: string }[];
}

export interface ClientImportBatchListItem {
  id: number;
  created_at: string;
  source: string;
  filename?: string | null;
  created_count: number;
  updated_count: number;
  error_count: number;
}

export interface ClientImportBatchDetail extends ClientImportBatchListItem {
  errors: { line: number; message: string }[];
}
