import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchClients, fetchDashboard } from "../api";
import type { ChargeDTO, ClientDTO, DashboardResponse } from "../api";
import { AttentionTag, RiskBadge, StatusBadge } from "../components/Badge";
import { formatDate, formatMoney } from "../lib/format";

function attentionKind(row: ChargeDTO): "due_soon" | "overdue" | "auto" {
  if (row.status === "overdue") return "overdue";
  if (row.status === "pending") return "due_soon";
  return "auto";
}

function pct(part: number, total: number) {
  if (total <= 0 || !Number.isFinite(part)) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}

function IconWallet(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden>
      <path
        d="M4 7a3 3 0 013-3h10a2 2 0 012 2v2H7a2 2 0 00-2 2v10a2 2 0 002 2h12V9a2 2 0 00-2-2h-1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M16 14h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconAlert(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden>
      <path
        d="M12 9v4m0 4h.01M10.3 3.2L2.8 18c-.5 1 .2 2.2 1.4 2.2h15.6c1.2 0 1.9-1.2 1.4-2.2L13.7 3.2a1.5 1.5 0 00-2.6 0z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCheck(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden>
      <path
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [clients, setClients] = useState<ClientDTO[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchDashboard(), fetchClients()])
      .then(([d, c]) => {
        if (!cancelled) {
          setData(d);
          setClients(Array.isArray(c) ? c : []);
        }
      })
      .catch((e) => {
        if (!cancelled) setErr(e?.message ?? "Error al cargar");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const riskClients = useMemo(() => {
    const order = { high: 0, medium: 1, low: 2 } as const;
    return [...clients]
      .filter((c) => c.total_owed > 0 || c.overdue_count > 0)
      .sort((a, b) => order[a.risk_level] - order[b.risk_level])
      .slice(0, 5);
  }, [clients]);

  const todayLabel = useMemo(() => {
    return new Intl.DateTimeFormat("es-CL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  }, []);

  if (err) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-surface-card p-6 text-rose-800 shadow-soft dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-200">
        {err}. ¿Está corriendo el API en <code className="font-mono">:8080</code>?
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-ink-muted">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <span>Cargando tu panel…</span>
        </div>
      </div>
    );
  }

  const { totals } = data;
  const attentionRows = Array.isArray(data.charges_needing_attention) ? data.charges_needing_attention : [];
  const totalVolume = totals.pending_amount + totals.overdue_amount + totals.paid_amount;
  const activeTotal = totals.pending_amount + totals.overdue_amount; // lo que aún deben (no cobrado)
  const pctOfActiveOverdue = pct(totals.overdue_amount, activeTotal); // del saldo por cobrar, cuánto está vencido
  const pctRecovered = pct(totals.paid_amount, totalVolume);

  return (
    <div className="mx-auto max-w-6xl space-y-8 sm:space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-indigo-100/80 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/70 p-5 shadow-[0_20px_60px_-15px_rgba(79,70,229,0.12)] dark:border-indigo-900/40 dark:bg-none dark:bg-slate-900 dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.35)] sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand/5 blur-3xl dark:hidden" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-violet-200/20 blur-2xl dark:hidden" />
        <p className="text-sm font-medium capitalize text-brand dark:text-indigo-300">{todayLabel}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl lg:text-4xl">Resumen de cobranza</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-muted">{data.tagline}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/cobros"
            className="inline-flex items-center justify-center rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:bg-indigo-700"
          >
            Ver cobros
          </Link>
          <Link
            to="/clients"
            className="inline-flex items-center justify-center rounded-xl border border-surface-border bg-surface-card/80 px-5 py-2.5 text-sm font-semibold text-ink backdrop-blur hover:bg-surface-card"
          >
            Clientes
          </Link>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-surface-card p-6 shadow-soft transition hover:shadow-md dark:border-slate-600/80">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Por cobrar</div>
              <div className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-ink">
                {formatMoney(totals.pending_amount)}
              </div>
              <div className="mt-2 text-sm text-ink-muted">{totals.pending_count} cobros pendientes</div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-brand dark:bg-indigo-950/55 dark:text-indigo-300">
              <IconWallet className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 to-orange-50/50 p-6 shadow-soft transition hover:shadow-md dark:border-amber-500/25 dark:from-amber-950/45 dark:to-orange-950/35 dark:shadow-none">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-900/70 dark:text-amber-200/90">
                Vencido
              </div>
              <div className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-amber-950 dark:text-amber-50">
                {formatMoney(totals.overdue_amount)}
              </div>
              <div className="mt-2 text-sm text-amber-900/70 dark:text-amber-200/85">{totals.overdue_count} a recuperar ya</div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100/80 text-amber-700 dark:bg-amber-900/45 dark:text-amber-300">
              <IconAlert className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50 to-teal-50/40 p-6 shadow-soft transition hover:shadow-md dark:border-emerald-500/25 dark:from-emerald-950/45 dark:to-teal-950/35 dark:shadow-none">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-900/70 dark:text-emerald-200/90">
                Cobrado
              </div>
              <div className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-emerald-950 dark:text-emerald-50">
                {formatMoney(totals.paid_amount)}
              </div>
              <div className="mt-2 text-sm text-emerald-900/70 dark:text-emerald-200/85">{totals.paid_count} cerradas</div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/45 dark:text-emerald-300">
              <IconCheck className="h-6 w-6" />
            </div>
          </div>
        </div>
      </section>

      {/* Distribución visual + clientes riesgo */}
      <section className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-soft lg:col-span-2">
          <h2 className="text-sm font-semibold text-ink">Lectura sobre tus números</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            Los montos por estado están arriba; aquí solo indicadores que salen de combinar esos datos (prioridad de
            mora y recuperación vs. volumen).
          </p>
          {totalVolume <= 0 ? (
            <p className="mt-6 text-sm text-ink-muted">Aún no hay montos registrados.</p>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-surface-border pb-4">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Volumen cargado</span>
                <span className="text-lg font-semibold tabular-nums text-ink">{formatMoney(totalVolume)}</span>
                <p className="w-full text-[11px] text-ink-muted">Una sola cifra: todo lo registrado en FlowPay (suma de los tres widgets).</p>
              </div>

              <div className="mt-4 space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-xs leading-relaxed text-ink dark:border-slate-600/70 dark:bg-slate-800/55">
                <p>
                  <span className="font-semibold text-ink">Saldo activo (te deben):</span>{" "}
                  <span className="tabular-nums font-medium">{formatMoney(activeTotal)}</span>
                  <span className="text-ink-muted dark:text-slate-300/95"> — por cobrar + vencido</span>
                </p>
                {activeTotal > 0 && totals.overdue_amount > 0 && (
                  <p className="text-ink-muted dark:text-slate-300/95">
                    Del dinero que aún deben recolectar,{" "}
                    <span className="font-semibold text-amber-900 dark:text-amber-300">{pctOfActiveOverdue}%</span>{" "}
                    está en cobros vencidos (prioriza eso en la cobranza).
                  </p>
                )}
                {totals.paid_amount > 0 && (
                  <p className="text-ink-muted dark:text-slate-300/95">
                    Del volumen total histórico, ya recuperaste{" "}
                    <span className="font-semibold text-emerald-800 dark:text-emerald-300">{pctRecovered}%</span>.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-soft lg:col-span-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-ink">Clientes que mirar hoy</h2>
              <p className="mt-1 text-xs text-ink-muted">Ordenados por riesgo y saldo pendiente.</p>
            </div>
            <Link to="/clients" className="shrink-0 text-xs font-semibold text-brand hover:underline">
              Ver todos
            </Link>
          </div>
          {riskClients.length === 0 ? (
            <p className="mt-6 text-sm text-ink-muted">Sin deuda pendiente o todos al día.</p>
          ) : (
            <ul className="mt-5 space-y-3">
              {riskClients.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-surface-border/80 bg-surface/40 px-4 py-3 transition hover:bg-surface/80"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-ink">{c.name}</div>
                    <div className="text-xs text-ink-muted">
                      Adeudado {formatMoney(c.total_owed)}
                      {c.overdue_count > 0 ? ` · ${c.overdue_count} vencida(s)` : ""}
                    </div>
                  </div>
                  <RiskBadge level={c.risk_level} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Tabla prioridad */}
      <section className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-[0_8px_40px_-12px_rgba(15,23,42,0.08)]">
        <div className="border-b border-surface-border bg-gradient-to-r from-surface to-surface-card px-6 py-4 sm:px-8">
          <h2 className="text-lg font-semibold text-ink">Cobros que necesitan foco</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Vencidos y próximos a vencer — tu lista de acción para cobrar a tiempo.
          </p>
        </div>
        <div className="min-w-0 overflow-auto max-h-[440px]">
          <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[14%]" />
              <col className="w-[15%]" />
              <col className="w-[13%]" />
              <col className="w-[15%]" />
              <col className="w-[15%]" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-surface-card text-left text-xs font-semibold uppercase tracking-wide text-ink-muted shadow-[0_1px_0_0_rgba(226,232,240,0.9)] dark:shadow-[0_1px_0_0_rgba(51,65,85,0.95)]">
              <tr>
                <th className="h-12 px-4 align-middle sm:px-6 lg:px-8">Sucursal</th>
                <th className="h-12 px-4 align-middle sm:px-5">Monto</th>
                <th className="h-12 px-4 align-middle sm:px-5">Vencimiento</th>
                <th className="h-12 px-4 align-middle sm:px-5">Estado</th>
                <th className="h-12 px-4 align-middle sm:px-5">Señal</th>
                <th className="h-12 px-4 align-middle sm:pr-6 lg:pr-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {attentionRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center sm:px-8">
                    <div className="mx-auto max-w-sm text-ink-muted">
                      <p className="text-base font-medium text-ink">Todo claro por ahora</p>
                      <p className="mt-1 text-sm">
                        Cuando tengas cobros por vencer o vencidos, aparecerán aquí primero.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                attentionRows.map((row) => (
                  <tr key={row.id} className="h-[68px] hover:bg-indigo-50/30 dark:hover:bg-indigo-950/25">
                    <td className="max-w-0 px-4 py-3 align-middle font-medium text-ink sm:px-6 lg:px-8">
                      <span className="block truncate">{row.client_name}</span>
                    </td>
                    <td className="px-4 py-3 align-middle tabular-nums sm:px-5">{formatMoney(row.amount)}</td>
                    <td className="px-4 py-3 align-middle text-ink-muted sm:px-5">{formatDate(row.due_date)}</td>
                    <td className="px-4 py-3 align-middle sm:px-5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 align-middle sm:px-5">
                      <AttentionTag kind={attentionKind(row)} />
                    </td>
                    <td className="px-4 py-3 text-right align-middle sm:pr-6 lg:pr-8">
                      <Link
                        to={`/cobros/${row.id}`}
                        className="inline-flex h-8 items-center rounded-lg px-2.5 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft dark:text-indigo-200 dark:hover:bg-indigo-500/25 dark:hover:text-white"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
