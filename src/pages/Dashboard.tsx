import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchClients, fetchDashboard } from "../api";
import type { ChargeDTO, ClientDTO, DashboardResponse } from "../api";
import { AttentionTag, RiskBadge, StatusBadge } from "../components/Badge";
import PageLoading from "../components/PageLoading";
import { chargeCounterpartyLabel } from "../lib/chargeCounterpartyLabel";
import { formatDate, formatMoney } from "../lib/format";
import { isCompanyMember } from "../lib/roles";

function attentionKind(row: ChargeDTO): "due_soon" | "overdue" | "auto" {
  if (row.status === "overdue") return "overdue";
  if (row.status === "pending") return "due_soon";
  return "auto";
}

function pct(part: number, total: number) {
  if (total <= 0 || !Number.isFinite(part)) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}

const STATUS_COLORS = {
  pending: "rgb(122 84 32)",
  overdue: "rgb(142 58 46)",
  paid: "rgb(15 110 107)",
} as const;

function StatusDonut({ parts }: { parts: { value: number; color: string }[] }) {
  const r = 46;
  const circ = 2 * Math.PI * r;
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  let cursor = 0;
  const gaps = parts.filter((part) => part.value > 0).length > 1 ? 3 : 0;

  return (
    <svg viewBox="0 0 120 120" className="h-36 w-36 shrink-0" role="img" aria-label="Distribución de montos por estado">
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgb(var(--color-surface-border))" strokeWidth="12" />
      {total > 0 &&
        parts.map((part) => {
          const len = (part.value / total) * circ;
          const dash = Math.max(len - gaps, 0);
          const node = (
            <circle
              key={part.color}
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={part.color}
              strokeWidth="12"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-cursor}
              transform="rotate(-90 60 60)"
            />
          );
          cursor += len;
          return node;
        })}
    </svg>
  );
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
      <div className="rounded-2xl border border-danger/30 bg-surface-card p-6 text-danger shadow-soft">
        {err}. ¿Está corriendo el API en <code className="font-mono">:8080</code>?
      </div>
    );
  }
  if (!data) {
    return <PageLoading />;
  }

  const { totals } = data;
  const attentionRows = Array.isArray(data.charges_needing_attention) ? data.charges_needing_attention : [];
  const totalVolume = totals.pending_amount + totals.overdue_amount + totals.paid_amount;
  const statusSlices = [
    {
      key: "pending",
      label: "Por cobrar",
      amount: totals.pending_amount,
      count: totals.pending_count,
      color: STATUS_COLORS.pending,
      to: "/cobros?status=pending",
    },
    {
      key: "overdue",
      label: "Vencido",
      amount: totals.overdue_amount,
      count: totals.overdue_count,
      color: STATUS_COLORS.overdue,
      to: "/cobros?status=overdue",
    },
    {
      key: "paid",
      label: "Cobrado",
      amount: totals.paid_amount,
      count: totals.paid_count,
      color: STATUS_COLORS.paid,
      to: "/cobros?status=paid",
    },
  ];
  const maxCount = Math.max(...statusSlices.map((slice) => slice.count), 1);

  return (
    <div className="mx-auto max-w-6xl space-y-8 sm:space-y-10">
      {/* Hero */}
      <section className="rounded-2xl border border-surface-border bg-surface-card p-5 sm:p-8">
        <p className="text-sm font-semibold capitalize text-brand">{todayLabel}</p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          {isCompanyMember() ? "Resumen de tu cartera" : "Resumen de cobranza"}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-muted">{data.tagline}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/cobros"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            Ver cobros
          </Link>
          <Link
            to="/clients"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-surface-border bg-surface px-5 text-sm font-semibold text-ink hover:bg-surface-card"
          >
            Clientes
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {statusSlices.map((slice) => (
          <Link
            key={slice.key}
            to={slice.to}
            className="rounded-2xl border border-[rgb(var(--color-surface-border))] bg-surface-card p-6 transition hover:bg-surface"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: slice.color }}>
                  {slice.label}
                </div>
                <div className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-ink">
                  {formatMoney(slice.amount)}
                </div>
                <div className="mt-2 text-sm text-ink-muted">
                  {slice.count} {slice.count === 1 ? "cobro" : "cobros"}
                </div>
              </div>
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: slice.color }}
              >
                {slice.key === "pending" && <IconWallet className="h-6 w-6" />}
                {slice.key === "overdue" && <IconAlert className="h-6 w-6" />}
                {slice.key === "paid" && <IconCheck className="h-6 w-6" />}
              </div>
            </div>
          </Link>
        ))}
      </section>

      {/* Distribución visual + clientes riesgo */}
      <section className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-soft lg:col-span-2">
          <h2 className="text-sm font-semibold text-ink">Composición</h2>
          <p className="mt-1 text-xs text-ink-muted">Participación del monto y cantidad de cobros. Cada barra abre el listado.</p>
          {totalVolume <= 0 ? (
            <p className="mt-6 text-sm text-ink-muted">Aún no hay montos registrados.</p>
          ) : (
            <>
              <div className="mt-5 flex items-center gap-4">
                <StatusDonut parts={statusSlices.map((slice) => ({ value: slice.amount, color: slice.color }))} />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Total</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-ink">{formatMoney(totalVolume)}</p>
                  <ul className="mt-3 space-y-1.5">
                    {statusSlices.map((slice) => (
                      <li key={slice.key} className="flex items-center gap-2 text-xs text-ink-muted">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
                        <span className="truncate">{slice.label}</span>
                        <span className="ml-auto tabular-nums text-ink">{pct(slice.amount, totalVolume)}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <ul className="mt-6 space-y-3">
                {statusSlices.map((slice) => (
                  <li key={`${slice.key}-bar`}>
                    <Link to={slice.to} className="block rounded-lg px-1 py-1 hover:bg-surface">
                      <div className="flex items-baseline justify-between gap-3 text-xs">
                        <span className="font-medium text-ink">{slice.label}</span>
                        <span className="tabular-nums text-ink-muted">
                          {slice.count} · {formatMoney(slice.amount)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(slice.count > 0 ? 4 : 0, (slice.count / maxCount) * 100)}%`,
                            backgroundColor: slice.color,
                          }}
                        />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
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
                <li key={c.id}>
                  <Link
                    to={`/clients/${c.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[rgb(var(--color-surface-border))] bg-surface/40 px-4 py-3 transition hover:bg-surface"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-ink">{chargeCounterpartyLabel(c)}</div>
                      <div className="text-xs text-ink-muted">
                        Adeudado {formatMoney(c.total_owed)}
                        {c.overdue_count > 0 ? ` · ${c.overdue_count} vencida${c.overdue_count === 1 ? "" : "s"}` : ""}
                      </div>
                    </div>
                    <RiskBadge level={c.risk_level} />
                  </Link>
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
        <ul className="divide-y divide-surface-border lg:hidden">
          {attentionRows.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-ink-muted">Todo claro por ahora.</li>
          ) : (
            attentionRows.map((row) => (
              <li key={row.id}>
                <Link to={`/cobros/${row.id}`} className="flex items-start justify-between gap-3 px-5 py-4 active:bg-surface">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{row.client_name}</p>
                    <p className="mt-1 text-sm tabular-nums text-ink">{formatMoney(row.amount)}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">{formatDate(row.due_date)}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusBadge status={row.status} />
                      <AttentionTag kind={attentionKind(row)} />
                    </div>
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
        <div className="hidden min-w-0 max-h-[440px] overflow-auto lg:block">
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
                  <tr key={row.id} className="h-[68px] hover:bg-surface">
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
                        className="inline-flex h-8 items-center rounded-lg px-2.5 text-sm font-semibold text-brand hover:bg-brand-soft"
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
