import { ArrowDownRight, ArrowUpRight, CalendarClock, Clock3, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { ChargeDTO, ClientDTO, DashboardResponse } from "../api";
import { RiskBadge } from "../components/Badge";
import OpenLink from "../components/OpenLink";
import PageLoading from "../components/PageLoading";
import { chargeCounterpartyLabel } from "../lib/chargeCounterpartyLabel";
import { formatDate, formatMoney } from "../lib/format";
import { clearHomePrefetch, loadDashboardHome, peekDashboardHome } from "../lib/homePrefetch";
import { useMinLoading } from "../lib/useMinLoading";
import { isCompanyMember } from "../lib/roles";

const STATUS_COLORS = {
  pending: "rgb(122 84 32)",
  overdue: "rgb(142 58 46)",
  paid: "rgb(15 110 107)",
} as const;

const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
const MONTHS_LONG = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function StatusDonut({ parts }: { parts: { value: number; color: string }[] }) {
  const r = 46;
  const circ = 2 * Math.PI * r;
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  const gaps = parts.filter((part) => part.value > 0).length > 1 ? 3 : 0;
  let cursor = 0;

  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" role="img" aria-label="Distribución de montos por estado">
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

function pct(part: number, total: number) {
  if (total <= 0 || !Number.isFinite(part)) return 0;
  return Math.round((part / total) * 100);
}

const compactNumber = new Intl.NumberFormat("es-CL", { notation: "compact", maximumFractionDigits: 1 });

function formatCompactMoney(n: number) {
  return `$${compactNumber.format(n)}`;
}

function localDay(iso: string): Date {
  if (iso.length === 10) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const t = new Date(iso);
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

type Insights = {
  paidThisMonth: number;
  paidThisMonthCount: number;
  paidPrevMonth: number;
  dueWeekAmount: number;
  dueWeekCount: number;
  onTimePct: number | null;
  avgDelayDays: number | null;
  paidSample: number;
  monthly: { label: string; amount: number; current: boolean }[];
};

function buildInsights(charges: ChargeDTO[]): Insights {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);

  let paidThisMonth = 0;
  let paidThisMonthCount = 0;
  let paidPrevMonth = 0;
  let dueWeekAmount = 0;
  let dueWeekCount = 0;
  let onTime = 0;
  let late = 0;
  let lateDays = 0;

  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { key: d.getFullYear() * 12 + d.getMonth(), label: MONTHS_SHORT[d.getMonth()], amount: 0, current: i === 5 };
  });

  for (const c of charges) {
    if (c.paid_at) {
      const paid = localDay(c.paid_at);
      if (paid >= monthStart) {
        paidThisMonth += c.amount;
        paidThisMonthCount += 1;
      } else if (paid >= prevStart) {
        paidPrevMonth += c.amount;
      }
      const bucket = monthly.find((m) => m.key === paid.getFullYear() * 12 + paid.getMonth());
      if (bucket) bucket.amount += c.amount;
      if (paid >= windowStart) {
        const delay = Math.round((paid.getTime() - localDay(c.due_date.slice(0, 10)).getTime()) / 86_400_000);
        if (delay <= 0) onTime += 1;
        else {
          late += 1;
          lateDays += delay;
        }
      }
    } else {
      const days = daysUntil(c.due_date);
      if (days >= 0 && days <= 7) {
        dueWeekAmount += c.amount;
        dueWeekCount += 1;
      }
    }
  }

  const paidSample = onTime + late;
  return {
    paidThisMonth,
    paidThisMonthCount,
    paidPrevMonth,
    dueWeekAmount,
    dueWeekCount,
    onTimePct: paidSample > 0 ? Math.round((onTime / paidSample) * 100) : null,
    avgDelayDays: late > 0 ? Math.round(lateDays / late) : null,
    paidSample,
    monthly: monthly.map(({ label, amount, current }) => ({ label, amount, current })),
  };
}

export default function Dashboard() {
  const [prefetched] = useState(peekDashboardHome);
  const [data, setData] = useState<DashboardResponse | null>(prefetched?.data ?? null);
  const [clients, setClients] = useState<ClientDTO[]>(prefetched?.clients ?? []);
  const [charges, setCharges] = useState<ChargeDTO[]>(prefetched?.charges ?? []);
  const [err, setErr] = useState<string | null>(null);
  const loading = useMinLoading(!data && !err);

  useEffect(() => {
    if (prefetched) {
      clearHomePrefetch();
      return;
    }
    let cancelled = false;
    loadDashboardHome()
      .then((home) => {
        if (!cancelled) {
          setData(home.data);
          setClients(home.clients);
          setCharges(home.charges);
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
      .sort((a, b) => order[a.risk_level] - order[b.risk_level] || b.total_owed - a.total_owed)
      .slice(0, 5);
  }, [clients]);

  const insights = useMemo(() => buildInsights(charges), [charges]);

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
  if (!data || loading) {
    return <PageLoading />;
  }

  const member = isCompanyMember();
  const { totals } = data;
  const attentionRows = Array.isArray(data.charges_needing_attention) ? data.charges_needing_attention : [];
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

  const now = new Date();
  const monthName = MONTHS_LONG[now.getMonth()];
  const prevMonthName = MONTHS_LONG[(now.getMonth() + 11) % 12];
  const delta =
    insights.paidPrevMonth > 0
      ? Math.round(((insights.paidThisMonth - insights.paidPrevMonth) / insights.paidPrevMonth) * 100)
      : null;
  const totalVolume = totals.pending_amount + totals.overdue_amount + totals.paid_amount;
  const maxMonthly = Math.max(...insights.monthly.map((m) => m.amount), 1);

  return (
    <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
      <section className="rounded-2xl border border-surface-border bg-surface-card p-5 sm:p-8">
        <p className="text-sm font-semibold capitalize text-brand">{todayLabel}</p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          {member ? "Resumen de tu cartera" : "Resumen de cobranza"}
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

      <section className="grid gap-4 md:grid-cols-3">
        <PulseCard icon={<TrendingUp className="h-4 w-4" />} label={`Cobrado en ${monthName}`}>
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-ink">{formatMoney(insights.paidThisMonth)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {delta === null ? (
              <span className="text-ink-muted">Sin pagos en {prevMonthName} para comparar</span>
            ) : (
              <>
                <span
                  className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold ${
                    delta >= 0 ? "bg-brand-soft text-brand" : "bg-danger-soft text-danger"
                  }`}
                >
                  {delta >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  {Math.abs(delta)}%
                </span>
                <span className="text-ink-muted">vs {prevMonthName}</span>
              </>
            )}
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            {insights.paidThisMonthCount} {insights.paidThisMonthCount === 1 ? "pago recibido" : "pagos recibidos"}
          </p>
        </PulseCard>

        <PulseCard
          icon={<CalendarClock className="h-4 w-4" />}
          label="Vence en los próximos 7 días"
          to="/cobros?status=pending"
        >
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-ink">{formatMoney(insights.dueWeekAmount)}</p>
          <p className="mt-3 text-xs text-ink-muted">
            {insights.dueWeekCount === 0
              ? "Nada vence esta semana."
              : `${insights.dueWeekCount} ${insights.dueWeekCount === 1 ? "cobro" : "cobros"} · buen momento para recordar`}
          </p>
          <p className="mt-2 text-xs font-semibold text-brand">Ver pendientes →</p>
        </PulseCard>

        <PulseCard icon={<Clock3 className="h-4 w-4" />} label="Pagos a tiempo · últimos 90 días">
          {insights.onTimePct === null ? (
            <>
              <p className="text-3xl font-semibold tracking-tight text-ink-muted">—</p>
              <p className="mt-3 text-xs text-ink-muted">Aún no hay pagos recientes para medir.</p>
            </>
          ) : (
            <>
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-ink">{insights.onTimePct}%</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-danger-soft">
                <div className="h-full rounded-full bg-brand" style={{ width: `${insights.onTimePct}%` }} />
              </div>
              <p className="mt-2 text-xs text-ink-muted">
                {insights.avgDelayDays === null
                  ? `${insights.paidSample} pagos, todos antes del vencimiento`
                  : `Los atrasados pagan ${insights.avgDelayDays} ${insights.avgDelayDays === 1 ? "día" : "días"} tarde en promedio`}
              </p>
            </>
          )}
        </PulseCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-soft lg:col-span-2">
          <h2 className="text-sm font-semibold text-ink">Composición</h2>
          <p className="mt-1 text-xs text-ink-muted">Cómo se reparte el monto total entre estados.</p>
          {totalVolume <= 0 ? (
            <p className="mt-6 text-sm text-ink-muted">Aún no hay montos registrados.</p>
          ) : (
            <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row lg:flex-col xl:flex-row">
              <div className="relative h-40 w-40 shrink-0">
                <StatusDonut parts={statusSlices.map((slice) => ({ value: slice.amount, color: slice.color }))} />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Total</span>
                  <span className="text-sm font-semibold tabular-nums text-ink">{formatCompactMoney(totalVolume)}</span>
                </div>
              </div>
              <ul className="w-full min-w-0 space-y-2">
                {statusSlices.map((slice) => (
                  <li key={slice.key}>
                    <Link to={slice.to} className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
                      <span className="truncate text-ink">{slice.label}</span>
                      <span className="ml-auto font-semibold tabular-nums text-ink">{pct(slice.amount, totalVolume)}%</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-soft lg:col-span-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-ink">Cobrado por mes</h2>
              <p className="mt-1 text-xs text-ink-muted">Pagos recibidos en los últimos 6 meses.</p>
            </div>
            <Link to="/cobros?status=paid" className="shrink-0 text-xs font-semibold text-brand hover:underline">
              Ver cobrados
            </Link>
          </div>
          <div className="mt-6 flex h-48 items-end gap-2 sm:gap-4">
            {insights.monthly.map((m) => (
              <div key={m.label} className="flex h-full min-w-0 flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 flex-col items-center justify-end">
                  <span className={`mb-1.5 text-[11px] tabular-nums ${m.current ? "font-semibold text-ink" : "text-ink-muted"}`}>
                    {m.amount > 0 ? formatCompactMoney(m.amount) : ""}
                  </span>
                  <div
                    className={`w-full max-w-12 rounded-t-lg ${m.current ? "bg-[rgb(15_110_107)]" : "bg-brand/25"}`}
                    style={{ height: `${Math.max(m.amount > 0 ? 4 : 1.5, (m.amount / maxMonthly) * 82)}%` }}
                    title={`${m.label}: ${formatMoney(m.amount)}`}
                  />
                </div>
                <span className={`text-xs capitalize ${m.current ? "font-semibold text-ink" : "text-ink-muted"}`}>
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid items-start gap-6 lg:grid-cols-5">
        <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-soft lg:col-span-2">
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
            <ul className="mt-4 space-y-1">
              {riskClients.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/clients/${c.id}`}
                    className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition hover:bg-surface"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-ink">{chargeCounterpartyLabel(c)}</div>
                      <div className="text-xs text-ink-muted">
                        {formatMoney(c.total_owed)}
                        {c.overdue_count > 0 ? ` · ${c.overdue_count} vencido${c.overdue_count === 1 ? "" : "s"}` : ""}
                      </div>
                    </div>
                    <RiskBadge level={c.risk_level} compact />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <FocusCharges rows={attentionRows} className="lg:col-span-3" />
      </section>
    </div>
  );
}

function PulseCard({ icon, label, to, children }: { icon: ReactNode; label: string; to?: string; children: ReactNode }) {
  const body = (
    <>
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand">{icon}</span>
        {label}
      </p>
      <div className="mt-4">{children}</div>
    </>
  );
  const className = "block rounded-2xl border border-surface-border bg-surface-card p-5 shadow-soft";
  return to ? (
    <Link to={to} className={`${className} transition hover:bg-surface`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function daysUntil(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((new Date(y, m - 1, d).getTime() - today.getTime()) / 86_400_000);
}

function timingLabel(days: number): string {
  if (days < 0) return `${-days} ${days === -1 ? "día" : "días"} de atraso`;
  if (days === 0) return "Vence hoy";
  if (days === 1) return "Vence mañana";
  return `Vence en ${days} días`;
}

const FOCUS_GROUPS = {
  overdue: {
    label: "Vencidos",
    bar: "bg-[rgb(142_58_46)]",
    title: "text-[rgb(142_58_46)] dark:text-danger",
    pill: "bg-danger-soft text-danger",
  },
  soon: {
    label: "Por vencer",
    bar: "bg-[rgb(122_84_32)]",
    title: "text-[rgb(122_84_32)] dark:text-warn",
    pill: "bg-warn-soft text-warn",
  },
} as const;

type FocusRow = { row: ChargeDTO; days: number };

function FocusCharges({ rows, className = "" }: { rows: ChargeDTO[]; className?: string }) {
  const groups = useMemo(() => {
    const withDays = rows.map((row) => ({ row, days: daysUntil(row.due_date) }));
    const byDays = (a: FocusRow, b: FocusRow) => a.days - b.days;
    const isOverdue = (r: FocusRow) => r.row.status === "overdue" || r.days < 0;
    return [
      { key: "overdue" as const, items: withDays.filter(isOverdue).sort(byDays) },
      { key: "soon" as const, items: withDays.filter((r) => !isOverdue(r)).sort(byDays) },
    ].filter((g) => g.items.length > 0);
  }, [rows]);

  return (
    <section className={`min-w-0 overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-soft ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-3 px-5 pb-4 pt-5 sm:px-6">
        <div>
          <h2 className="text-lg font-semibold text-ink">Cobros que necesitan foco</h2>
          <p className="mt-1 text-sm text-ink-muted">Primero lo más atrasado. Abre un cobro para recordar o registrar el pago.</p>
        </div>
        <Link to="/cobros" className="shrink-0 text-xs font-semibold text-brand hover:underline">
          Ver todos los cobros
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="border-t border-surface-border px-6 py-12 text-center">
          <p className="text-base font-medium text-ink">Todo al día</p>
          <p className="mt-1 text-sm text-ink-muted">Cuando haya cobros vencidos o por vencer, aparecerán aquí.</p>
        </div>
      ) : (
        <div className="max-h-[560px] overflow-y-auto border-t border-surface-border">
          {groups.map((group) => {
            const tone = FOCUS_GROUPS[group.key];
            const total = group.items.reduce((sum, item) => sum + item.row.amount, 0);
            return (
              <div key={group.key}>
                <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-surface-border bg-surface px-5 py-2.5 sm:px-6">
                  <p className={`text-xs font-semibold uppercase tracking-wider ${tone.title}`}>
                    {tone.label} · {group.items.length}
                  </p>
                  <p className="text-xs font-semibold tabular-nums text-ink">{formatMoney(total)}</p>
                </div>
                <ul className="divide-y divide-surface-border">
                  {group.items.map(({ row, days }) => (
                    <li
                      key={row.id}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-4 transition hover:bg-surface/60 sm:px-6 md:grid-cols-[auto_minmax(0,1fr)_9.5rem_7.5rem_auto]"
                    >
                      <span className={`row-span-2 h-full min-h-10 w-1 rounded-full md:row-span-1 md:h-10 ${tone.bar}`} aria-hidden />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{row.client_name}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          #{row.id} · {days < 0 ? "Venció" : "Vence"} el {formatDate(row.due_date)}
                        </p>
                      </div>
                      <p className="text-right text-base font-semibold tabular-nums text-ink md:order-last md:hidden">
                        {formatMoney(row.amount)}
                      </p>
                      <div className="col-start-2 md:col-start-auto">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tone.pill}`}>
                          {timingLabel(days)}
                        </span>
                      </div>
                      <p className="hidden text-right text-base font-semibold tabular-nums text-ink md:block">
                        {formatMoney(row.amount)}
                      </p>
                      <div className="col-start-3 row-start-2 flex justify-end md:col-start-auto md:row-start-auto">
                        <OpenLink to={`/cobros/${row.id}`} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
