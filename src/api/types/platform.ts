export interface PlatformCompanyOverview {
  company_id: number;
  company_name: string;
  paid_amount: number;
  pending_amount: number;
  overdue_amount: number;
  owed_amount: number;
}

export interface PlatformOverviewResponse {
  companies: PlatformCompanyOverview[];
  total_companies: number;
  total_paid: number;
  total_pending: number;
  total_overdue: number;
  total_owed: number;
}

export interface CompanyDTO {
  id: number;
  name: string;
  /** Si falta (API antigua), se asume activa. */
  is_active?: boolean;
  /** Cantidad de clientes asociados a la empresa. */
  client_count?: number;
  /** Cantidad de admins asociados a la empresa. */
  admin_count?: number;
  contact_phone?: string;
  requested_plan?: string;
  contact_name?: string;
  contact_email?: string;
  /** True después de la primera activación. Si está apagada y approved, ya no es una solicitud pendiente. */
  approved?: boolean;
  /** Precio mensual propio. Null usa el del plan. */
  price_clp_override?: number | null;
  /** Comisión propia, en porcentaje. Null usa la del plan. */
  commission_percent_override?: number | null;
}

export interface SignupPlan {
  id: string;
  label: string;
  detail: string;
  price: string;
  period: string;
  features: string[];
  highlight?: boolean;
  price_clp?: number;
  commission_percent?: number;
}

export interface CompanyAdminDTO {
  user_id: number;
  company_id: number;
  company_name: string;
  email: string;
  name: string;
  role: string;
  /** Si falta (API antigua), se asume activo. */
  is_active?: boolean;
}
