import { api } from "../client";

export type PaymentCredentialStatus = {
  khipu: boolean;
  webpay: boolean;
  oneclick: boolean;
  fintoc: boolean;
  transfer_gateway?: "khipu" | "fintoc" | "";
  pending?: PaymentCredentialPending[];
};

export type PaymentCredentialPending = {
  provider: string;
  action: "create" | "edit" | "remove";
  sent_to: string;
  expires_at: string;
};

export type PaymentCredentialChangeResult = {
  pending: boolean;
  action: "create" | "edit" | "remove";
  provider: string;
  sent_to: string;
};

export type PaymentCredentialPreview = {
  company: string;
  provider: string;
  provider_label: string;
  action: "create" | "edit" | "remove";
  action_label: string;
  action_verb: string;
  expires_at?: string;
};

export type PaymentCredentialUpdate = {
  khipu_api_key?: string;
  webpay_commerce_code?: string;
  webpay_api_key?: string;
  oneclick_mall_code?: string;
  oneclick_store_code?: string;
  oneclick_api_key?: string;
  fintoc_secret_key?: string;
  fintoc_webhook_secret?: string;
  transfer_gateway?: "khipu" | "fintoc";
};

export async function fetchPaymentCredentials() {
  const { data } = await api.get<PaymentCredentialStatus>("/api/company/payment-credentials");
  return data;
}

export async function savePaymentCredentials(payload: PaymentCredentialUpdate) {
  const { data } = await api.put<PaymentCredentialChangeResult>("/api/company/payment-credentials", payload);
  return data;
}

export async function fetchCredentialConfirmation(token: string) {
  const { data } = await api.get<PaymentCredentialPreview>(`/api/public/credential-confirm/${encodeURIComponent(token)}`);
  return data;
}

export async function confirmCredentialChange(token: string) {
  const { data } = await api.post<PaymentCredentialPreview>(`/api/public/credential-confirm/${encodeURIComponent(token)}`);
  return data;
}
