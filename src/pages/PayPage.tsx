import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { ChevronDown, CreditCard, Download } from "lucide-react";
import {
  fetchPaymentPortal,
  isPaymentMock,
  startPaymentCheckout,
  type PaymentPortalResponse,
  type PortalCharge,
} from "../api";
import PageLoading from "../components/PageLoading";
import ThemeToggle from "../components/ThemeToggle";
import { formatDate, formatMoney } from "../lib/format";

type ChargeStatusKey = "pending" | "paid" | "overdue";

function statusKey(row: PortalCharge): ChargeStatusKey {
  if (row.status === "paid") return "paid";
  if (row.status === "overdue") return "overdue";
  return "pending";
}

function sortByDueDate(a: PortalCharge, b: PortalCharge) {
  return a.due_date.localeCompare(b.due_date);
}

function invoiceFilename(ext?: string | null) {
  const kind = (ext ?? "").toLowerCase();
  if (kind === "png") return "factura.png";
  if (kind === "jpg" || kind === "jpeg") return "factura.jpg";
  return "factura.pdf";
}

const VISIBLE_CHARGES = 10;

function ChargeList({ count, className, children }: { count: number; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const list = ref.current;
    if (!list || count <= VISIBLE_CHARGES) {
      setMaxHeight(undefined);
      return;
    }
    const item = list.children[VISIBLE_CHARGES - 1] as HTMLElement | undefined;
    if (!item) {
      setMaxHeight(undefined);
      return;
    }
    const listTop = list.getBoundingClientRect().top;
    const itemBottom = item.getBoundingClientRect().bottom;
    setMaxHeight(Math.ceil(itemBottom - listTop));
  }, [count]);

  return (
    <ul
      ref={ref}
      className={["relative divide-y divide-surface-border overflow-y-auto overscroll-contain", className ?? ""].join(" ")}
      style={maxHeight ? { maxHeight } : undefined}
    >
      {children}
    </ul>
  );
}

function ChargeInvoice({ token, ext }: { token?: string | null; ext?: string | null }) {
  if (!token) return null;
  return (
    <a
      href={`/api/public/attachments/${token}?download=1`}
      download={invoiceFilename(ext)}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
      onClick={(event) => event.stopPropagation()}
    >
      <Download className="h-4 w-4" strokeWidth={2} />
      Descargar factura
    </a>
  );
}

export default function PayPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PaymentPortalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [openList, setOpenList] = useState<"payable" | "paid" | null>("payable");

  useEffect(() => {
    const raw = token?.trim() ?? "";
    if (!raw) {
      setError("Enlace de pago inválido.");
      setLoading(false);
      return;
    }
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      decoded = raw;
    }
    const clean = decoded.trim();
    setLoading(true);
    fetchPaymentPortal(clean)
      .then((d) => {
        setData(d);
        setError(null);
        setSelected(
          new Set(
            (d.charges ?? [])
              .filter((row) => statusKey(row) !== "paid")
              .map((row) => row.ref),
          ),
        );
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "No se pudo cargar la página de pago");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const payableCharges = useMemo(() => {
    if (!data?.charges) return [];
    const rank: Record<"overdue" | "pending", number> = { overdue: 0, pending: 1 };
    return data.charges
      .filter((c) => statusKey(c) !== "paid")
      .sort((a, b) => {
        const ra = rank[statusKey(a) === "overdue" ? "overdue" : "pending"];
        const rb = rank[statusKey(b) === "overdue" ? "overdue" : "pending"];
        if (ra !== rb) return ra - rb;
        return sortByDueDate(a, b);
      });
  }, [data]);

  const paidCharges = useMemo(() => {
    if (!data?.charges) return [];
    return data.charges.filter((c) => statusKey(c) === "paid").sort(sortByDueDate);
  }, [data]);

  const selectedCharges = useMemo(
    () => payableCharges.filter((c) => selected.has(c.ref)),
    [payableCharges, selected],
  );

  const selectedTotal = useMemo(
    () => selectedCharges.reduce((acc, c) => acc + (c.amount ?? 0), 0),
    [selectedCharges],
  );

  const allSelected =
    payableCharges.length > 0 && payableCharges.every((c) => selected.has(c.ref));

  function toggleOne(ref: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref);
      else next.add(ref);
      return next;
    });
  }

  function showList(list: "payable" | "paid") {
    setOpenList((current) => (current === list ? null : list));
  }

  function toggleAll() {
    setSelected((prev) => {
      if (payableCharges.every((c) => prev.has(c.ref))) return new Set();
      return new Set(payableCharges.map((c) => c.ref));
    });
  }

  async function onPagar() {
    if (selectedCharges.length === 0 || paying) return;
    const raw = token?.trim() ?? "";
    let portalToken = raw;
    try {
      portalToken = decodeURIComponent(raw).trim();
    } catch {
      portalToken = raw.trim();
    }
    if (!portalToken) return;

    setPaying(true);
    setPayError(null);
    try {
      const refs = selectedCharges.map((c) => c.ref);
      const { redirect_url } = await startPaymentCheckout(portalToken, refs);
      window.location.assign(redirect_url);
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : "No se pudo iniciar el pago");
      setPaying(false);
    }
  }

  const amountDue = (data?.totals.pending ?? 0) + (data?.totals.overdue ?? 0);
  const singlePayable = payableCharges.length === 1;

  const payLabel =
    paying
      ? "Abriendo el pago…"
      : selectedCharges.length === 0
        ? "Elige un cobro"
        : `Pagar ${formatMoney(selectedTotal)}`;

  return (
    <div className="relative min-h-dvh bg-surface px-4 pb-36 pt-[max(1.25rem,env(safe-area-inset-top))] text-ink sm:px-8 lg:pb-16">
      <div className="fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-20 sm:right-8">
        <ThemeToggle compact />
      </div>
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-8 pr-12">
          <p className="font-display text-xl font-medium tracking-tight text-ink">FlowPay</p>
        </header>

        {isPaymentMock() && (
          <div className="mb-6 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
            Modo demostración Webpay (sin Transbank). Los datos son de ejemplo; al pagar simulas el flujo completo.
          </div>
        )}

        {loading && <PageLoading />}

        {!loading && error && (
          <div className="rounded-2xl border border-danger/30 bg-danger-soft p-6 text-center shadow-soft dark:shadow-none">
            <p className="text-base font-semibold text-danger">No pudimos cargar tu cartola</p>
            <p className="mt-2 text-sm text-danger">{error}</p>
            <p className="mt-4 text-xs text-danger">
              Si recibiste este link de tu proveedor, pídele que te genere uno nuevo.
            </p>
          </div>
        )}

        {!loading && !error && data && (
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0">
              <p className="text-sm text-ink-muted">{data.company.name || "Empresa"}</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
                {data.client.label || "Tus cobros"}
              </h1>
              <p className="mt-2 text-sm text-ink-muted">
                {payableCharges.length === 0 ? "Estás al día." : `${formatMoney(amountDue)} por pagar`}
              </p>

              {payableCharges.length === 0 ? (
                <div className="mt-8 rounded-2xl border border-surface-border bg-surface-card px-5 py-10 text-center">
                  <p className="text-base font-semibold text-ink">No hay cobros pendientes</p>
                  <p className="mt-1 text-sm text-ink-muted">Cuando haya uno nuevo, aparecerá aquí.</p>
                </div>
              ) : (
                <section className="mt-8 overflow-hidden rounded-2xl border border-surface-border bg-surface-card">
                  <div className={["flex h-14 items-center gap-3 px-5", openList === "payable" ? "border-b border-surface-border" : ""].join(" ")}>
                    <button
                      type="button"
                      aria-expanded={openList === "payable"}
                      onClick={() => showList("payable")}
                      className="min-w-0 flex-1 truncate text-left text-sm font-medium text-ink"
                    >
                      {payableCharges.length} cobro{payableCharges.length === 1 ? "" : "s"}
                    </button>
                    {openList === "payable" && !singlePayable && !allSelected && (
                      <button
                        type="button"
                        onClick={toggleAll}
                        className="h-9 shrink-0 text-sm font-semibold text-brand hover:underline"
                      >
                        Marcar todos
                      </button>
                    )}
                    <button
                      type="button"
                      aria-expanded={openList === "payable"}
                      aria-label={openList === "payable" ? "Cerrar cobros" : "Abrir cobros"}
                      onClick={() => showList("payable")}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center text-ink-muted"
                    >
                      <ChevronDown
                        className={["h-4 w-4 transition", openList === "payable" ? "rotate-180" : ""].join(" ")}
                      />
                    </button>
                  </div>
                  {openList === "payable" && (
                  <ChargeList count={payableCharges.length}>
                    {payableCharges.map((row) => {
                      const checked = selected.has(row.ref);
                      const overdue = statusKey(row) === "overdue";
                      return (
                        <li key={row.ref} className={checked || singlePayable ? "" : "opacity-45"}>
                          <label className="flex cursor-pointer items-center gap-4 px-5 py-4 hover:bg-surface/70">
                            {!singlePayable && (
                              <input
                                type="checkbox"
                                className="h-5 w-5 shrink-0 rounded border-surface-border text-brand focus:ring-brand"
                                checked={checked}
                                onChange={() => toggleOne(row.ref)}
                              />
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block text-lg font-semibold tabular-nums text-ink">
                                {formatMoney(row.amount)}
                              </span>
                              {row.attachment_token && (
                                <span className="mt-1 block">
                                  <ChargeInvoice token={row.attachment_token} ext={row.attachment_ext} />
                                </span>
                              )}
                            </span>
                            <span
                              className={[
                                "shrink-0 text-right text-sm",
                                overdue ? "font-medium text-[rgb(142_58_46)]" : "text-ink-muted",
                              ].join(" ")}
                            >
                              {overdue ? "Venció" : "Vence"} el {formatDate(row.due_date)}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ChargeList>
                  )}
                </section>
              )}

              {paidCharges.length > 0 && (
                <section className="mt-4 overflow-hidden rounded-2xl border border-surface-border bg-surface-card">
                  <button
                    type="button"
                    aria-expanded={openList === "paid"}
                    onClick={() => showList("paid")}
                    className="flex h-14 w-full items-center justify-between gap-3 px-5 text-left text-sm font-medium text-ink"
                  >
                    <span className="min-w-0 truncate">
                      Ya pagados · {paidCharges.length} · {formatMoney(data.totals.paid)}
                    </span>
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center text-ink-muted">
                      <ChevronDown
                        className={["h-4 w-4 transition", openList === "paid" ? "rotate-180" : ""].join(" ")}
                      />
                    </span>
                  </button>
                  {openList === "paid" && (
                  <ChargeList count={paidCharges.length} className="border-t border-surface-border">
                    {paidCharges.map((row) => (
                      <li key={row.ref} className="flex items-center justify-between gap-4 px-5 py-3">
                        <div>
                          <p className="text-sm font-semibold tabular-nums text-ink">{formatMoney(row.amount)}</p>
                          <ChargeInvoice token={row.attachment_token} ext={row.attachment_ext} />
                        </div>
                        <p className="shrink-0 text-right text-sm text-ink-muted">
                          Pagado · {formatDate(row.due_date)}
                        </p>
                      </li>
                    ))}
                  </ChargeList>
                  )}
                </section>
              )}

              {data.company.transfer_instructions && (
                <details className="group mt-2">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-1 py-2 text-sm text-ink-muted [&::-webkit-details-marker]:hidden">
                    <span>Pagar por transferencia</span>
                    <ChevronDown className="h-4 w-4 shrink-0 transition group-open:rotate-180" />
                  </summary>
                  <p className="mt-1 whitespace-pre-wrap rounded-2xl border border-surface-border bg-surface-card px-5 py-4 text-sm text-ink">
                    {data.company.transfer_instructions}
                  </p>
                </details>
              )}
            </div>

            {payableCharges.length > 0 && (
              <aside className="hidden lg:block">
                <div className="pointer-events-none fixed inset-y-0 left-0 right-0 z-10 px-4 sm:px-8">
                  <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-end">
                    <div className="pointer-events-auto w-80 rounded-2xl border border-surface-border bg-surface-card p-6">
                  <p className="text-sm text-ink-muted">Total a pagar</p>
                  <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ink">
                    {formatMoney(selectedTotal)}
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {selectedCharges.length === 0
                      ? "Ningún cobro marcado"
                      : `${selectedCharges.length} de ${payableCharges.length}`}
                  </p>
                  {payError && <p className="mt-3 text-sm font-medium text-danger">{payError}</p>}
                  <button
                    type="button"
                    onClick={onPagar}
                    disabled={selectedCharges.length === 0 || paying}
                    className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 bg-brand text-white disabled:cursor-not-allowed disabled:bg-surface-border disabled:text-ink-muted"
                  >
                    <CreditCard className="h-4 w-4" />
                    {payLabel}
                  </button>
                  <p className="mt-3 text-center text-xs text-ink-muted">Pago con tarjeta en Webpay</p>
                </div>
                  </div>
                </div>
              </aside>
            )}
          </div>
        )}
      </div>

      {!loading && !error && data && payableCharges.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-surface-border bg-surface-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 lg:hidden">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold tabular-nums text-ink">{formatMoney(selectedTotal)}</p>
              {payError && <p className="text-xs font-medium text-danger">{payError}</p>}
            </div>
            <button
              type="button"
              onClick={onPagar}
              disabled={selectedCharges.length === 0 || paying}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 bg-brand px-5 text-white disabled:cursor-not-allowed disabled:bg-surface-border disabled:text-ink-muted"
            >
              <CreditCard className="h-4 w-4" />
              {payLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
