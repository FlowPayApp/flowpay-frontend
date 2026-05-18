/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FLOWPAY_PAYMENT_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
