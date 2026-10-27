import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMinLoading } from "../lib/useMinLoading";
import { useParams } from "react-router-dom";
import { Check, ChevronDown, Copy, CreditCard, Download } from "lucide-react";
import {
  fetchPaymentPortal,
  isPaymentMock,
  startPaymentCheckout,
  type PaymentPortalMethods,
  type PaymentPortalResponse,
  type PortalCharge,
} from "../api";
import BrandLogo from "../components/BrandLogo";
import PageLoading from "../components/PageLoading";
import ThemeToggle from "../components/ThemeToggle";
import { formatDate, formatMoney } from "../lib/format";
import { invoiceFilename } from "../lib/invoiceFile";

type ChargeStatusKey = "pending" | "paid" | "overdue";
type PayMethod = "webpay" | "khipu" | "fintoc" | "transfer";

const METHOD_COPY: Record<PayMethod, { title: string }> = {
  webpay: { title: "Webpay" },
  khipu: { title: "Transferencia por Khipu" },
  fintoc: { title: "Transferencia por Fintoc" },
  transfer: { title: "Transferencia directa" },
};

const MARK_PLATE = "grid h-10 w-[4.75rem] shrink-0 place-items-center overflow-hidden rounded-md bg-white px-1.5";

function BrandMark({ method }: { method: PayMethod }) {
  if (method === "webpay") {
    return (
      <span className={MARK_PLATE}>
        <img src="/brands/webpay.png" alt="" className="max-h-8 w-full object-contain" />
      </span>
    );
  }
  if (method === "khipu") {
    return (
      <span className={MARK_PLATE}>
        <img
          src="https://s3.amazonaws.com/static.khipu.com/buttons/2024/200x75-purple.svg"
          alt=""
          className="max-h-7 w-full object-contain"
        />
      </span>
    );
  }
  if (method === "fintoc") {
    return (
      <span className={MARK_PLATE}>
        <img src="https://assets.fintoc.com/?img_name=logo_dark" alt="" className="h-7 w-auto max-w-full object-contain" />
      </span>
    );
  }
  return (
    <span className={MARK_PLATE}>
      <svg viewBox="0 0 32 32" className="h-8 w-8 text-[#1d1d1f]" aria-hidden>
        <path
          fill="currentColor"
          d="M16 4.5 5 12h3v11h5v-6h6v6h5V12h3L16 4.5Zm-1.5 12.5h-2v4h2v-4Zm5 0h-2v4h2v-4Z"
        />
      </svg>
    </span>
  );
}

function offeredMethods(methods: PaymentPortalMethods | undefined, transferText?: string): PayMethod[] {
  if (!methods) {
    const legacy: PayMethod[] = ["webpay"];
    if (transferText?.trim()) legacy.push("transfer");
    return legacy;
  }
  const out: PayMethod[] = [];
  if (methods.webpay) out.push("webpay");
  if (methods.khipu) out.push("khipu");
  if (methods.fintoc) out.push("fintoc");
  if (methods.transfer) out.push("transfer");
  return out;
}

function statusKey(row: PortalCharge): ChargeStatusKey {
  if (row.status === "paid") return "paid";
  if (row.status === "overdue") return "overdue";
  return "pending";
}

function sortByDueDate(a: PortalCharge, b: PortalCharge) {
  return a.due_date.localeCompare(b.due_date);
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
      className={["relative divide-y divide-surface-border overflow-y-auto", className ?? ""].join(" ")}
      style={maxHeight ? { maxHeight } : undefined}
    >
      {children}
    </ul>
  );
}

function MethodOption({
  id,
  selected,
  onMethod,
  children,
}: {
  id: PayMethod;
  selected: boolean;
  onMethod: (next: PayMethod) => void;
  children?: ReactNode;
}) {
  return (
    <div className="bg-surface-card">
      <label className="relative flex cursor-pointer items-center gap-3 px-4 py-3.5">
        <input
          type="radio"
          name="pay-method"
          className="absolute inset-0 cursor-pointer opacity-0"
          checked={selected}
          onChange={() => onMethod(id)}
        />
        <span
          className={[
            "grid h-4 w-4 shrink-0 place-items-center rounded-full border",
            selected ? "border-brand" : "border-surface-border",
          ].join(" ")}
          aria-hidden
        >
          {selected ? <span className="h-2 w-2 rounded-full bg-brand" /> : null}
        </span>
        <BrandMark method={id} />
        <span className="min-w-0 flex-1 text-sm font-medium text-ink">{METHOD_COPY[id].title}</span>
      </label>
      {selected ? children : null}
    </div>
  );
}

function PayChoice({
  methods,
  method,
  onMethod,
  instructions,
}: {
  methods: PayMethod[];
  method: PayMethod | null;
  onMethod: (next: PayMethod) => void;
  instructions?: string;
}) {
  if (methods.length === 0) {
    return <p className="text-sm text-ink-muted">Esta empresa todavía no tiene un medio de pago en el enlace.</p>;
  }
  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink">Medio de pago</legend>
      <div className="mt-4 divide-y divide-surface-border overflow-hidden rounded-xl border border-surface-border bg-surface-card">
        {methods.map((id) => (
          <MethodOption key={id} id={id} selected={method === id} onMethod={onMethod}>
            <PayMethodBody method={id} instructions={instructions} />
          </MethodOption>
        ))}
      </div>
    </fieldset>
  );
}

function TransferDetails({ instructions }: { instructions: string }) {
  const text = instructions.trim();
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!text) return;
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      ok = document.execCommand("copy");
      area.remove();
    }
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="border-t border-surface-border bg-surface-card px-4 pb-4 pt-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-ink-muted">Datos para transferir</p>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand hover:bg-brand-soft"
        >
          {copied ? <Check className="h-4 w-4" strokeWidth={2} /> : <Copy className="h-4 w-4" strokeWidth={2} />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink">{text}</p>
      <p className="mt-3 text-xs leading-relaxed text-ink-muted">
        La empresa confirma el pago cuando ve la transferencia.
      </p>
    </div>
  );
}

function PayMethodBody({ method, instructions }: { method: PayMethod | null; instructions?: string }) {
  if (method === "transfer" && instructions?.trim()) {
    return <TransferDetails instructions={instructions} />;
  }
  if (method === "khipu") {
    return (
      <p className="px-4 pb-4 text-sm leading-relaxed text-ink-muted">
        Te llevamos a Khipu para transferir. El cobro queda pagado cuando Khipu confirma.
      </p>
    );
  }
  if (method === "fintoc") {
    return (
      <p className="px-4 pb-4 text-sm leading-relaxed text-ink-muted">
        Te llevamos a Fintoc para transferir. El cobro queda pagado cuando Fintoc confirma.
      </p>
    );
  }
  return null;
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
  const [loadingRaw, setLoading] = useState(true);
  const loading = useMinLoading(loadingRaw);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [payableOpen, setPayableOpen] = useState(true);
  const [paidOpen, setPaidOpen] = useState(false);
  const [method, setMethod] = useState<PayMethod | null>(null);

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
    if (list === "payable") setPayableOpen((open) => !open);
    else setPaidOpen((open) => !open);
  }

  function toggleAll() {
    setSelected((prev) => {
      if (payableCharges.every((c) => prev.has(c.ref))) return new Set();
      return new Set(payableCharges.map((c) => c.ref));
    });
  }

  const methods = useMemo(
    () => (data ? offeredMethods(data.methods, data.company.transfer_instructions) : []),
    [data],
  );

  useEffect(() => {
    setMethod((current) => (current && methods.includes(current) ? current : (methods[0] ?? null)));
  }, [methods]);

  async function onPagar() {
    if ((method !== "webpay" && method !== "khipu" && method !== "fintoc") || selectedCharges.length === 0 || paying) return;
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
      const { redirect_url } = await startPaymentCheckout(portalToken, refs, method);
      window.location.assign(redirect_url);
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : "No se pudo iniciar el pago");
      setPaying(false);
    }
  }

  const payLabel =
    paying
      ? "Abriendo el pago…"
      : selectedCharges.length === 0
        ? "Elige un cobro"
        : `Pagar ${formatMoney(selectedTotal)}`;

  return (
    <div className="relative min-h-dvh bg-surface px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] text-ink sm:px-8">
      <div className="fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-20 sm:right-8">
        <ThemeToggle compact />
      </div>
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-8 pr-12">
          <BrandLogo className="h-8" />
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
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.9fr)]">
            <div className="min-w-0">
              <p className="text-sm text-ink-muted">Pagar a {data.company.name || "la empresa"}</p>
              <h1 className="mt-3 text-5xl font-semibold tracking-tight text-ink tabular-nums">
                {payableCharges.length === 0 ? formatMoney(0) : formatMoney(selectedTotal)}
              </h1>
              <p className="mt-3 text-sm text-ink-muted">
                {data.client.label || "Tus cobros"}
                {payableCharges.length === 0 ? " · Estás al día" : ""}
              </p>

              {payableCharges.length === 0 ? (
                <div className="mt-8 rounded-2xl border border-surface-border bg-surface-card px-5 py-10 text-center">
                  <p className="text-base font-semibold text-ink">No hay cobros pendientes</p>
                  <p className="mt-1 text-sm text-ink-muted">Cuando haya uno nuevo, aparecerá aquí.</p>
                </div>
              ) : (
                <section className="mt-10">
                  <div className="flex h-10 items-center gap-3 border-b border-surface-border">
                    <button
                      type="button"
                      aria-expanded={payableOpen}
                      onClick={() => showList("payable")}
                      className="min-w-0 flex-1 truncate text-left text-sm font-medium text-ink"
                    >
                      {payableCharges.length} cobro{payableCharges.length === 1 ? "" : "s"}
                    </button>
                    {payableOpen && payableCharges.length > 1 && !allSelected && (
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
                      aria-expanded={payableOpen}
                      aria-label={payableOpen ? "Cerrar cobros" : "Abrir cobros"}
                      onClick={() => showList("payable")}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center text-ink-muted"
                    >
                      <ChevronDown
                        className={["h-4 w-4 transition", payableOpen ? "rotate-180" : ""].join(" ")}
                      />
                    </button>
                  </div>
                  {payableOpen && (
                  <ChargeList count={payableCharges.length}>
                    {payableCharges.map((row) => {
                      const checked = selected.has(row.ref);
                      const overdue = statusKey(row) === "overdue";
                      return (
                        <li key={row.ref}>
                          <label className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 py-4">
                            <input
                              type="checkbox"
                              className="h-5 w-5 shrink-0 rounded border-surface-border text-brand focus:ring-brand"
                              checked={checked}
                              onChange={() => toggleOne(row.ref)}
                            />
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
                                "ml-auto shrink-0 text-right text-sm",
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
                <section className="mt-8">
                  <button
                    type="button"
                    aria-expanded={paidOpen}
                    onClick={() => showList("paid")}
                    className="flex h-10 w-full items-center gap-3 border-b border-surface-border text-left text-sm font-medium text-ink"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      Pagados · {paidCharges.length} · {formatMoney(data.totals.paid)}
                    </span>
                    <ChevronDown
                      className={["h-4 w-4 shrink-0 text-ink-muted transition", paidOpen ? "rotate-180" : ""].join(" ")}
                    />
                  </button>
                  {paidOpen && (
                  <ChargeList count={paidCharges.length}>
                    {paidCharges.map((row) => (
                      <li key={row.ref} className="flex items-center gap-4 py-4">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-soft text-brand" aria-hidden>
                          <Check className="h-3 w-3" strokeWidth={2.5} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-lg font-semibold tabular-nums text-ink">{formatMoney(row.amount)}</p>
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

            </div>

            {payableCharges.length > 0 && (
              <aside>
                <div className="rounded-2xl border border-surface-border bg-surface-card p-5 sm:p-6">
                  <PayChoice
                    methods={methods}
                    method={method}
                    onMethod={setMethod}
                    instructions={data.company.transfer_instructions}
                  />
                  {payError && <p className="mt-3 text-sm font-medium text-danger">{payError}</p>}
                  {method === "webpay" || method === "khipu" || method === "fintoc" ? (
                    <button
                      type="button"
                      onClick={onPagar}
                      disabled={selectedCharges.length === 0 || paying}
                      className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-white disabled:cursor-not-allowed disabled:bg-surface-border disabled:text-ink-muted"
                    >
                      <CreditCard className="h-4 w-4" />
                      {payLabel}
                    </button>
                  ) : null}
                </div>
              </aside>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
