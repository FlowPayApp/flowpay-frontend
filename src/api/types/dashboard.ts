import type { ChargeDTO } from "./charge";

export interface DashboardTotals {
  pending_amount: number;
  overdue_amount: number;
  paid_amount: number;
  pending_count: number;
  overdue_count: number;
  paid_count: number;
}

export interface DashboardResponse {
  totals: DashboardTotals;
  charges_needing_attention: ChargeDTO[];
  tagline: string;
  product_name: string;
}
