import { api } from "../client";

export type PaymentCredentialStatus = {
  khipu: boolean;
  webpay: boolean;
  oneclick: boolean;
  fintoc: boolean;
};

export type PaymentCredentialUpdate = {
  khipu_api_key?: string;
  webpay_commerce_code?: string;
  webpay_api_key?: string;
  oneclick_mall_code?: string;
  oneclick_store_code?: string;
  oneclick_api_key?: string;
  fintoc_secret_key?: string;
};

export async function fetchPaymentCredentials() {
  const { data } = await api.get<PaymentCredentialStatus>("/api/company/payment-credentials");
  return data;
}

export async function savePaymentCredentials(payload: PaymentCredentialUpdate) {
  await api.put("/api/company/payment-credentials", payload);
}
