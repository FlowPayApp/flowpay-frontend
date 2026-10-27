import type { ChargeStatus } from "../types";
import { isPaymentMock, paymentsApiUrl } from "./config";

export interface PaymentPortalCompany {
  name: string;
  transfer_instructions?: string;
}

export interface PaymentPortalMethods {
  webpay: boolean;
  khipu: boolean;
  fintoc: boolean;
  transfer: boolean;
}

export interface PaymentPortalClient {
  label: string;
}

export interface PaymentPortalTotals {
  pending: number;
  overdue: number;
  paid: number;
}

export interface PortalCharge {
  ref: string;
  amount: number;
  due_date: string;
  status?: ChargeStatus;
  attachment_token?: string | null;
  attachment_ext?: string | null;
}

export interface PaymentPortalResponse {
  token_status: string;
  issued_at: string;
  company: PaymentPortalCompany;
  methods?: PaymentPortalMethods;
  client: PaymentPortalClient;
  charges: PortalCharge[];
  totals: PaymentPortalTotals;
}

export interface PaymentCheckoutResponse {
  /** URL de Webpay (Transbank); el front redirige aquí. */
  redirect_url: string;
  buy_order?: string;
}

export interface PaymentCommitResponse {
  status: "authorized" | "failed" | "pending";
  buy_order?: string;
  authorization_code?: string;
  amount?: number;
  message?: string;
  method?: string;
}

async function parseError(res: Response, fallback: string): Promise<Error> {
  const text = await res.text();
  if (!text) return new Error(fallback);
  try {
    const j = JSON.parse(text) as { error?: string; message?: string };
    return new Error(j.error || j.message || text);
  } catch {
    return new Error(text);
  }
}

export async function fetchPaymentPortal(token: string): Promise<PaymentPortalResponse> {
  if (isPaymentMock()) {
    await delay(400);
    return mockPortal(token);
  }
  const res = await fetch(paymentsApiUrl(`/api/public/pay/${encodeURIComponent(token)}`));
  if (res.status === 404) {
    throw new Error("Token de pago no encontrado o expirado");
  }
  if (!res.ok) {
    throw await parseError(res, "No se pudo cargar la página de pago");
  }
  return res.json() as Promise<PaymentPortalResponse>;
}

/** Inicia el checkout del medio elegido. Webpay y Khipu devuelven redirect_url. */
export async function startPaymentCheckout(
  portalToken: string,
  chargeRefs: string[],
  method: "webpay" | "khipu" | "fintoc" = "webpay",
): Promise<PaymentCheckoutResponse> {
  if (chargeRefs.length === 0) {
    throw new Error("Selecciona al menos un cobro");
  }
  if (isPaymentMock()) {
    await delay(600);
    const base = window.location.origin;
    const returnPath = `/pay/${encodeURIComponent(portalToken)}/return`;
    return {
      redirect_url: `${base}${returnPath}?token_ws=mock_authorized&buy_order=MOCK-${Date.now()}`,
      buy_order: "MOCK-DEMO",
    };
  }
  const res = await fetch(paymentsApiUrl(`/api/public/pay/${encodeURIComponent(portalToken)}/checkout`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ charge_refs: chargeRefs, method }),
  });
  if (!res.ok) {
    throw await parseError(
      res,
      method === "khipu" ? "No se pudo iniciar el pago con Khipu" : method === "fintoc" ? "No se pudo iniciar el pago con Fintoc" : "No se pudo iniciar el pago con Webpay",
    );
  }
  return res.json() as Promise<PaymentCheckoutResponse>;
}

/** Consulta si Khipu ya concilió la transferencia. */
export async function fetchKhipuStatus(portalToken: string, buyOrder: string): Promise<PaymentCommitResponse> {
  return fetchTransferStatus(portalToken, buyOrder, "khipu");
}

/** Lee el estado que dejó el webhook de Fintoc. No marca el cobro. */
export async function fetchFintocStatus(portalToken: string, buyOrder: string): Promise<PaymentCommitResponse> {
  return fetchTransferStatus(portalToken, buyOrder, "fintoc");
}

async function fetchTransferStatus(
  portalToken: string,
  buyOrder: string,
  method: "khipu" | "fintoc",
): Promise<PaymentCommitResponse> {
  const orden = buyOrder.trim();
  if (!orden) {
    throw new Error("Falta la orden de la transferencia");
  }
  const res = await fetch(
    paymentsApiUrl(`/api/public/pay/${encodeURIComponent(portalToken)}/${method}/status?orden=${encodeURIComponent(orden)}`),
  );
  if (!res.ok) {
    throw await parseError(res, "No se pudo consultar la transferencia");
  }
  return res.json() as Promise<PaymentCommitResponse>;
}

/** Confirma el pago tras el retorno de Transbank (token_ws en query). */
export async function commitPaymentReturn(
  portalToken: string,
  tokenWs: string,
): Promise<PaymentCommitResponse> {
  const trimmed = tokenWs.trim();
  if (!trimmed) {
    throw new Error("Falta el token de retorno de Webpay");
  }
  if (isPaymentMock()) {
    await delay(800);
    if (trimmed === "mock_failed") {
      return {
        status: "failed",
        message: "Pago rechazado (simulación)",
        buy_order: "MOCK-DEMO",
      };
    }
    return {
      status: "authorized",
      buy_order: "MOCK-DEMO",
      authorization_code: "MOCK1234",
      amount: 125000,
      message: "Pago autorizado (modo simulación)",
    };
  }
  const res = await fetch(paymentsApiUrl(`/api/public/pay/${encodeURIComponent(portalToken)}/commit`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token_ws: trimmed }),
  });
  if (!res.ok) {
    throw await parseError(res, "No se pudo confirmar el pago");
  }
  return res.json() as Promise<PaymentCommitResponse>;
}

/** Ruta de retorno que el backend debe registrar en Transbank como return_url. */
export function paymentReturnPath(portalToken: string): string {
  return `/pay/${encodeURIComponent(portalToken.trim())}/return`;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function mockPortal(token: string): PaymentPortalResponse {
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const past = new Date(today);
  past.setDate(past.getDate() - 12);
  const soon = new Date(today);
  soon.setDate(soon.getDate() + 5);
  return {
    token_status: "viewed",
    issued_at: today.toISOString(),
    company: {
      name: "Distribuidora Demo (mock)",
      transfer_instructions:
        "Transferencia:\nBanco Estado\nCuenta 12345678\nRUT 76.000.000-0",
    },
    methods: { webpay: true, khipu: false, fintoc: false, transfer: true },
    client: { label: "Sucursal Centro — mock" },
    totals: { pending: 85000, overdue: 40000, paid: 120000 },
    charges: [
      {
        ref: `mock-ref-overdue-${token.slice(0, 6)}`,
        amount: 40000,
        due_date: iso(past),
        status: "overdue",
      },
      {
        ref: `mock-ref-pending-${token.slice(0, 6)}`,
        amount: 85000,
        due_date: iso(soon),
        status: "pending",
      },
      {
        ref: `mock-ref-paid-${token.slice(0, 6)}`,
        amount: 120000,
        due_date: iso(past),
        status: "paid",
      },
    ],
  };
}
