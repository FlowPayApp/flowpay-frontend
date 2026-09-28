import { fetchCharges, fetchClients, fetchDashboard, fetchPlatformOverview } from "../api";
import type { ChargeDTO, ClientDTO, DashboardResponse, PlatformOverviewResponse } from "../api";

export type DashboardHome = { data: DashboardResponse; clients: ClientDTO[]; charges: ChargeDTO[] };

const MAX_AGE_MS = 15_000;

let dashboardCache: { value: DashboardHome; at: number } | null = null;
let platformCache: { value: PlatformOverviewResponse; at: number } | null = null;

function fresh<T>(entry: { value: T; at: number } | null): T | null {
  return entry && Date.now() - entry.at < MAX_AGE_MS ? entry.value : null;
}

export async function loadDashboardHome(): Promise<DashboardHome> {
  const [data, clients, charges] = await Promise.all([
    fetchDashboard(),
    fetchClients(),
    fetchCharges().catch(() => [] as ChargeDTO[]),
  ]);
  return {
    data,
    clients: Array.isArray(clients) ? clients : [],
    charges: Array.isArray(charges) ? charges : [],
  };
}

/** Deja lista la pantalla de inicio antes de navegar; si falla, la pantalla carga sola. */
export async function prefetchHome(path: string): Promise<void> {
  try {
    if (path === "/platform") {
      platformCache = { value: await fetchPlatformOverview(), at: Date.now() };
    } else {
      dashboardCache = { value: await loadDashboardHome(), at: Date.now() };
    }
  } catch {
    // La pantalla de inicio mostrará su propio estado de carga o error.
  }
}

export function peekDashboardHome(): DashboardHome | null {
  return fresh(dashboardCache);
}

export function peekPlatformOverview(): PlatformOverviewResponse | null {
  return fresh(platformCache);
}

export function clearHomePrefetch() {
  dashboardCache = null;
  platformCache = null;
}
