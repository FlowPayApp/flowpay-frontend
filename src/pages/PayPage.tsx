import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { CreditCard, ShieldCheck } from "lucide-react";
import { fetchPaymentPortal } from "../api";
import type { ChargeDTO, PaymentPortalResponse } from "../api";
import { StatusBadge } from "../components/Badge";
import { formatDate, formatMoney } from "../lib/format";

type ChargeStatusKey = "pending" | "paid" | "overdue";

function statusKey(row: ChargeDTO): ChargeStatusKey {
  if (row.status === "paid") return "paid";
  if (row.status === "overdue") return "overdue";
  return "pending";
}

export default function PayPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PaymentPortalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

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
        const initial = new Set<number>(d.charges.filter((c) => statusKey(c) !== "paid").map((c) => c.id));
        setSelected(initial);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "No se pudo cargar la página de pago");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const sortedCharges = useMemo(() => {
    if (!data?.charges) return [];
    const rank: Record<string, number> = { overdue: 0, pending: 1, paid: 2 };
    return [...data.charges].sort((a, b) => {
      const ra = rank[statusKey(a)];
      const rb = rank[statusKey(b)];
      if (ra !== rb) return ra - rb;
      return a.due_date.localeCompare(b.due_date);
    });
  }, [data]);

  const payableCharges = useMemo(
    () => sortedCharges.filter((c) => statusKey(c) !== "paid"),
    [sortedCharges],
  );

  const selectedCharges = useMemo(
    () => payableCharges.filter((c) => selected.has(c.id)),
    [payableCharges, selected],
  );

  const selectedTotal = useMemo(
    () => selectedCharges.reduce((acc, c) => acc + (c.amount ?? 0), 0),
    [selectedCharges],
  );

  const allSelected =
    payableCharges.length > 0 && payableCharges.every((c) => selected.has(c.id));
  const someSelected = selectedCharges.length > 0 && !allSelected;

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (payableCharges.every((c) => prev.has(c.id))) return new Set();
      return new Set(payableCharges.map((c) => c.id));
    });
  }

  function onPagar() {
    if (selectedCharges.length === 0) return;
    const ids = selectedCharges.map((c) => c.id).join(", ");
    window.alert(
      `Aún no conectamos la pasarela.\n\nVas a pagar ${selectedCharges.length} cobro(s) por ${formatMoney(
        selectedTotal,
      )}.\nIDs: ${ids}`,
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-10 pb-32">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">FlowPay</p>
            <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">Portal de pago</h1>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Acceso seguro
          </span>
        </header>

        {loading && (
          <div className="rounded-2xl border border-surface-border bg-white p-10 text-center text-ink-muted shadow-soft">
            Cargando…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center shadow-soft">
            <p className="text-base font-semibold text-rose-900">No pudimos cargar tu cartola</p>
            <p className="mt-2 text-sm text-rose-800/90">{error}</p>
            <p className="mt-4 text-xs text-rose-800/70">
              Si recibiste este link de tu proveedor, pídele que te genere uno nuevo.
            </p>
          </div>
        )}

        {!loading && !error && data && (
          <div className="space-y-6">
            <section className="rounded-2xl border border-surface-border bg-white p-6 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Empresa que cobra</p>
              <h2 className="mt-1 text-xl font-semibold text-ink">
                {data.company.name || `Empresa #${data.company.id}`}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Sucursal</p>
                  <p className="mt-1 text-sm font-medium text-ink">
                    {data.client.label || `Cliente #${data.client.id}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Total por pagar</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-ink">
                    {formatMoney(data.totals.pending + data.totals.overdue)}
                  </p>
                </div>
              </div>
              {data.company.transfer_instructions && (
                <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-900 whitespace-pre-wrap">
                  {data.company.transfer_instructions}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-surface-border bg-white shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border px-5 py-4">
                <div>
                  <h3 className="text-base font-semibold text-ink">Cobros asociados</h3>
                  <p className="text-xs text-ink-muted">
                    {payableCharges.length === 0
                      ? "Sin cobros pendientes"
                      : `${payableCharges.length} por pagar · ${sortedCharges.length} en total`}
                  </p>
                </div>
                {payableCharges.length > 0 && (
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-surface-border text-brand focus:ring-brand"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={toggleAll}
                    />
                    Seleccionar todos
                  </label>
                )}
              </div>

              {sortedCharges.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-ink-muted">
                  No hay cobros registrados todavía.
                </div>
              ) : (
                <ul className="divide-y divide-surface-border">
                  {sortedCharges.map((row) => {
                    const paid = statusKey(row) === "paid";
                    const checked = selected.has(row.id);
                    return (
                      <li
                        key={row.id}
                        className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 ${
                          checked ? "bg-indigo-50/40" : ""
                        }`}
                      >
                        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                          <input
                            type="checkbox"
                            className="h-4 w-4 shrink-0 rounded border-surface-border text-brand focus:ring-brand disabled:cursor-not-allowed disabled:opacity-40"
                            checked={checked}
                            disabled={paid}
                            onChange={() => toggleOne(row.id)}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-[11px] text-ink-muted">Cobro #{row.id}</p>
                            <p className="mt-0.5 text-sm font-medium text-ink">{formatMoney(row.amount)}</p>
                            <p className="mt-0.5 text-xs text-ink-muted">Vence: {formatDate(row.due_date)}</p>
                          </div>
                        </label>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={row.status} />
                          {row.attachment_token && (
                            <a
                              href={`/api/public/attachments/${row.attachment_token}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-medium text-brand hover:underline"
                            >
                              Ver adjunto
                            </a>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="grid gap-3 border-t border-surface-border px-5 py-4 sm:grid-cols-3">
                <SummaryItem label="Pendiente" value={formatMoney(data.totals.pending)} tone="amber" />
                <SummaryItem label="Vencido" value={formatMoney(data.totals.overdue)} tone="rose" />
                <SummaryItem label="Pagado" value={formatMoney(data.totals.paid)} tone="emerald" />
              </div>
            </section>

            <p className="text-center text-xs text-ink-muted">
              Este enlace fue generado para tu empresa. Si tienes dudas sobre los montos, contacta a tu proveedor.
            </p>
          </div>
        )}
      </div>

      {!loading && !error && data && payableCharges.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-surface-border bg-white/95 px-4 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">A pagar ahora</p>
              <p className="text-lg font-semibold tabular-nums text-ink">{formatMoney(selectedTotal)}</p>
              <p className="text-xs text-ink-muted">
                {selectedCharges.length === 0
                  ? "Selecciona al menos un cobro"
                  : `${selectedCharges.length} cobro${selectedCharges.length === 1 ? "" : "s"} seleccionado${
                      selectedCharges.length === 1 ? "" : "s"
                    }`}
              </p>
            </div>
            <button
              type="button"
              onClick={onPagar}
              disabled={selectedCharges.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-surface-border disabled:text-ink-muted"
            >
              <CreditCard className="h-4 w-4" />
              Pagar {selectedCharges.length > 0 ? formatMoney(selectedTotal) : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type Tone = "amber" | "rose" | "emerald";

function SummaryItem({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  const toneClass: Record<Tone, string> = {
    amber: "bg-amber-50 text-amber-900 ring-amber-200/70",
    rose: "bg-rose-50 text-rose-900 ring-rose-200/70",
    emerald: "bg-emerald-50 text-emerald-900 ring-emerald-200/70",
  };
  return (
    <div className={`rounded-xl px-4 py-3 ring-1 ${toneClass[tone]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider">{label}</p>
      <p className="mt-0.5 text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}
