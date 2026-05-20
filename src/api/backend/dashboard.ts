import { api } from "../client";
import type { DashboardResponse, PlatformOverviewResponse } from "../types";

export async function fetchDashboard() {
  const { data } = await api.get<DashboardResponse>("/api/dashboard");
  return data;
}

export async function fetchPlatformOverview() {
  const { data } = await api.get<PlatformOverviewResponse>("/api/platform/overview");
  return data;
}
