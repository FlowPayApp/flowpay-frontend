/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FLOWPAY_PAYMENT_MOCK?: string;
  readonly VITE_FLOWPAY_PAYMENTS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
