import { api } from "../client";
import type {
  ClientDTO,
  ClientImportBatchDetail,
  ClientImportBatchListItem,
  ImportDistributorResult,
  UpdateClientPayload,
} from "../types";

export async function fetchClients() {
  const { data } = await api.get<ClientDTO[]>("/api/clients");
  return data;
}

export async function fetchClient(id: number) {
  const { data } = await api.get<ClientDTO>(`/api/clients/${id}`);
  return data;
}

export async function deleteClient(id: number) {
  await api.delete(`/api/clients/${id}`);
}

export async function createClient(payload: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  client_code?: string;
  branch_name?: string;
  payment_terms?: string;
}) {
  const { data } = await api.post<{ id: number }>("/api/clients", payload);
  return data;
}

export async function updateClient(clientId: number, payload: UpdateClientPayload) {
  await api.patch(`/api/clients/${clientId}`, payload);
}

export async function importClientsDistributorRows(rows: string[][], filename?: string) {
  const { data } = await api.post<ImportDistributorResult>("/api/clients/import-distributor-rows", {
    rows,
    ...(filename ? { filename } : {}),
  });
  return data;
}

export async function fetchClientImportBatches() {
  const { data } = await api.get<ClientImportBatchListItem[]>("/api/clients/import-batches");
  return data;
}

export async function fetchClientImportBatch(id: number) {
  const { data } = await api.get<ClientImportBatchDetail>(`/api/clients/import-batches/${id}`);
  return data;
}
