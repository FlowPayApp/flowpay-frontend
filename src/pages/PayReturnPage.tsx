import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, Download, Loader2, Printer, XCircle } from "lucide-react";
import { commitPaymentReturn, fetchPaymentPortal, isPaymentMock } from "../lib/publicPayApi";
import type { PaymentCommitResponse, PaymentPortalResponse } from "../lib/publicPayApi";
import ThemeToggle from "../components/ThemeToggle";
import { formatMoney } from "../lib/format";
import {
  downloadPaymentReceipt,
  printPaymentReceipt,
  type PaymentReceiptData,
} from "../lib/paymentReceipt";

type Phase = "committing" | "done" | "error";

export default function PayReturnPage() {
  const { token: rawToken } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const [phase, setPhase] = useState<Phase>("committing");
  const [result, setResult] = useState<PaymentCommitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [portal, setPortal] = useState<PaymentPortalResponse | null>(null);

  const portalToken = decodePortalToken(rawToken);
  const tokenWs = searchParams.get("token_ws")?.trim() ?? "";
  const estadoQuery = searchParams.get("estado")?.trim() ?? "";

  useEffect(() => {
    if (!portalToken) {
      setPhase("error");
      setError("Enlace de retorno inválido.");
      return;
    }

    // El backend ya hizo commit y redirigió aquí (flujo recomendado).
    if (estadoQuery === "authorized") {
      const amountRaw = searchParams.get("amount");
      setResult({
        status: "authorized",
        buy_order: searchParams.get("buy_order") ?? undefined,
        authorization_code: searchParams.get("authorization_code") ?? undefined,
        amount: amountRaw ? Number(amountRaw) : undefined,
        message: searchParams.get("message") ?? "Pago autorizado",
      });
      setPhase("done");
      return;
    }
    if (estadoQuery === "failed") {
      setPhase("error");
      setError(searchParams.get("message") ?? "El pago no fue autorizado.");
      return;
    }

    if (!tokenWs) {
      setPhase("error");
      setError("Transbank no envió el token de confirmación. Vuelve al portal e intenta de nuevo.");
      return;
    }

    let cancelled = false;
    setPhase("committing");
    setError(null);

    commitPaymentReturn(portalToken, tokenWs)
      .then((data) => {
        if (cancelled) return;
        setResult(data);
        if (data.status === "authorized") {
          setPhase("done");
        } else {
          setPhase("error");
          setError(data.message || "El pago no fue autorizado.");
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPhase("error");
        setError(err instanceof Error ? err.message : "No se pudo confirmar el pago");
      });

    return () => {
      cancelled = true;
    };
  }, [portalToken, tokenWs, estadoQuery, searchParams]);

  useEffect(() => {
    if (phase !== "done" || !portalToken) return;
    let cancelled = false;
    fetchPaymentPortal(portalToken)
      .then((data) => {
        if (!cancelled) setPortal(data);
      })
      .catch(() => {
        if (!cancelled) setPortal(null);
      });
    return () => {
      cancelled = true;
    };
  }, [phase, portalToken]);

  const receiptData = useMemo((): PaymentReceiptData | null => {
    if (!result || result.status !== "authorized") return null;
    return {
      companyName: portal?.company.name ?? "Empresa",
      clientLabel: portal?.client.label ?? "Cliente",
      amount: result.amount ?? 0,
      authorizationCode: result.authorization_code,
      buyOrder: result.buy_order,
      paidAt: new Date(),
      paymentMethod: "Webpay Plus (Transbank)",
    };
  }, [result, portal]);

  const portalHref = portalToken ? `/pay/${encodeURIComponent(portalToken)}` : "/";

  return (
    <PayShell>
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">FlowPay</p>
          <h1 className="mt-1 text-2xl font-bold text-ink">Resultado del pago</h1>
        </div>
        <ThemeToggle compact />
      </header>

      {phase === "committing" && (
        <div className="rounded-2xl border border-surface-border bg-surface-card p-10 text-center shadow-soft">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand" aria-hidden />
          <p className="mt-4 text-lg font-semibold text-ink">Confirmando tu pago</p>
          <p className="mt-2 text-sm text-ink-muted">
            Estamos validando la transacción con Webpay. No cierres esta ventana.
          </p>
        </div>
      )}

      {phase === "done" && result && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-8 text-center shadow-soft dark:border-emerald-800/50 dark:bg-emerald-950/35">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600 dark:text-emerald-400" />
            <h1 className="mt-4 text-2xl font-bold text-ink">Pago recibido</h1>
            <p className="mt-2 text-sm text-ink-muted">
              Tu pago fue autorizado correctamente. El comercio verá el cobro actualizado en FlowPay.
            </p>
            {result.amount != null && (
              <p className="mt-6 text-3xl font-bold tabular-nums tracking-tight text-ink">
                {formatMoney(result.amount)}
              </p>
            )}
            <dl className="mx-auto mt-4 max-w-sm space-y-2 text-left text-sm">
              {result.authorization_code && (
                <DetailRow label="Código autorización" value={result.authorization_code} mono />
              )}
              {result.buy_order && <DetailRow label="Orden de compra" value={result.buy_order} mono />}
            </dl>
          </div>

          {receiptData && (
            <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-soft">
              <div className="border-b border-brand/20 bg-gradient-to-r from-brand/5 to-transparent px-6 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand">Comprobante</p>
                <h2 className="mt-1 text-lg font-semibold text-ink">Resumen de transacción</h2>
              </div>
              <div className="space-y-4 px-6 py-5 text-sm">
                <ReceiptLine label="Empresa" value={receiptData.companyName} />
                <ReceiptLine label="Cliente" value={receiptData.clientLabel} />
                <ReceiptLine label="Medio de pago" value={receiptData.paymentMethod ?? "Webpay Plus"} />
                {receiptData.authorizationCode && (
                  <ReceiptLine label="Autorización" value={receiptData.authorizationCode} mono />
                )}
              </div>
              <div className="flex flex-col gap-2 border-t border-surface-border bg-surface/50 px-6 py-4 sm:flex-row">
                <button
                  type="button"
                  onClick={() => downloadPaymentReceipt(receiptData)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  <Download className="h-4 w-4" aria-hidden />
                  Descargar comprobante
                </button>
                <button
                  type="button"
                  onClick={() => printPaymentReceipt(receiptData)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-sm font-semibold text-ink hover:bg-surface"
                >
                  <Printer className="h-4 w-4" aria-hidden />
                  Imprimir
                </button>
              </div>
            </div>
          )}

          <div className="text-center">
            <Link
              to={portalHref}
              className="inline-flex rounded-xl border border-surface-border bg-surface-card px-5 py-3 text-sm font-semibold text-ink hover:bg-surface"
            >
              Volver al portal
            </Link>
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center shadow-soft dark:border-rose-900/50 dark:bg-rose-950/35">
          <XCircle className="mx-auto h-12 w-12 text-rose-600 dark:text-rose-400" />
          <h1 className="mt-4 text-xl font-bold text-rose-900 dark:text-rose-100">No se pudo completar el pago</h1>
          <p className="mt-2 text-sm text-rose-800/90 dark:text-rose-300/95">{error}</p>
          {isPaymentMock() && (
            <p className="mt-3 text-xs text-ink-muted">
              Modo mock: prueba con{" "}
              <code className="rounded bg-surface px-1">?token_ws=mock_failed</code> en la URL de retorno.
            </p>
          )}
          <Link
            to={portalHref}
            className="mt-8 inline-flex rounded-xl border border-surface-border bg-surface-card px-5 py-3 text-sm font-semibold text-ink hover:bg-surface"
          >
            Volver al portal e intentar de nuevo
          </Link>
        </div>
      )}
    </PayShell>
  );
}

function decodePortalToken(raw: string | undefined): string {
  const t = raw?.trim() ?? "";
  if (!t) return "";
  try {
    return decodeURIComponent(t).trim();
  } catch {
    return t;
  }
}

function ReceiptLine({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-ink-muted">{label}</span>
      <span className={`text-right font-medium text-ink ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-surface-border/60 py-2 last:border-0">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={`font-medium text-ink ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

function PayShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-surface to-surface-card px-4 py-10 text-ink dark:to-surface">
      <div className="mx-auto w-full max-w-lg">{children}</div>
    </div>
  );
}
