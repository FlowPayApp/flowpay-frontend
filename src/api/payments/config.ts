export function paymentsApiUrl(path: string): string {
  const base = (import.meta.env.VITE_FLOWPAY_PAYMENTS_URL ?? "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

export function isPaymentMock(): boolean {
  return import.meta.env.VITE_FLOWPAY_PAYMENT_MOCK === "true";
}
