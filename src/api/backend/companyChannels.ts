import { api } from "../client";

export type CompanyChannelsDTO = {
  email: boolean;
  whatsapp: boolean;
};

export async function fetchCompanyChannels() {
  const { data } = await api.get<CompanyChannelsDTO>("/api/company/channels");
  return data;
}
