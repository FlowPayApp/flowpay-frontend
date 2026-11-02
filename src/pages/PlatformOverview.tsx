import { Building2, CircleAlert, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPlatformOverview, listCompanies, type CompanyDTO, type PlatformOverviewResponse } from "../api";
import PageLoading from "../components/PageLoading";
import { formatMoney } from "../lib/format";
import { clearHomePrefetch, peekPlatformOverview } from "../lib/homePrefetch";
import { useMinLoading } from "../lib/useMinLoading";

const COLORS = {
  pending: "rgb(122 84 32)",
  overdue: "rgb(142 58 46)",
  paid: "rgb(15 110 107)",
} as const;

function Donut({ parts }: { parts: { value: number; color: string }[] }) {
  const r = 46;
  const circ = 2 * Math.PI * r;
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  const gaps = parts.filter((part) => part.value > 0).length > 1 ? 3 : 0;
  let cursor = 0;

  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" role="img" aria-label="Reparto de lo emitido">
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

function share(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

const compactNumber = new Intl.NumberFormat("es-CL", { notation: "compact", maximumFractionDigits: 1 });

function compactMoney(n: number) {
  return `$${compactNumber.format(n)}`;
}

function waitingActivation(company: CompanyDTO) {
  return company.is_active === false && Boolean(company.requested_plan) && !company.approved;
}

export default function PlatformOverview() {
  const [prefetched] = useState(peekPlatformOverview);
  const [data, setData] = useState<PlatformOverviewResponse | null>(prefetched);
  const [directory, setDirectory] = useState<CompanyDTO[]>([]);
  const [loadingRaw, setLoading] = useState(!prefetched);
  const loading = useMinLoading(loadingRaw);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, companies] = await Promise.all([
        fetchPlatformOverview(),
        listCompanies().catch(() => [] as CompanyDTO[]),
      ]);
      setData(res);
      setDirectory(companies);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar vista global");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (prefetched) {
      clearHomePrefetch();
      void listCompanies()
        .then(setDirectory)
        .catch(() => setDirectory([]));
      return;
    }
    void reload();
  }, []);

  const picture = useMemo(() => {
    const rows = Array.isArray(data?.companies) ? data.companies : [];
    const paid = data?.total_paid ?? 0;
    const pending = data?.total_pending ?? 0;
    const overdue = data?.total_overdue ?? 0;
    const open = pending + overdue;
    const issued = paid + open;
    const withOverdue = rows.filter((row) => row.overdue_amount > 0).sort((a, b) => b.overdue_amount - a.overdue_amount);
    const withOpen = rows.filter((row) => row.pending_amount + row.overdue_amount > 0);
    const idle = rows.filter((row) => row.paid_amount + row.pending_amount + row.overdue_amount === 0);
    return { rows, paid, pending, overdue, open, issued, withOverdue, withOpen, idle };
  }, [data]);

  const pendingSignups = directory.filter(waitingActivation).length;

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("es-CL", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    [],
  );

  if (loading && !data) {
    return <PageLoading />;
  }

  if (error && !data) {
    return <div className="rounded-xl border border-danger/30 bg-danger-soft p-4 text-danger">{error}</div>;
  }

  const overdueShare = share(picture.overdue, picture.open);
  const recoveredShare = share(picture.paid, picture.issued);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 sm:space-y-8">
      <section className="rounded-2xl border border-surface-border bg-surface-card p-5 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold capitalize text-brand">{todayLabel}</p>
            <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">Plataforma</h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-muted">
              {picture.issued <= 0
                ? "Todavía no hay cobros emitidos. Lo que sigue es activar empresas y ver que empiecen a cobrar."
                : picture.overdue <= 0
                  ? "No hay montos vencidos. La cartera abierta sigue al día."
                  : `${picture.withOverdue.length} ${picture.withOverdue.length === 1 ? "empresa concentra" : "empresas concentran"} lo vencido. Eso es lo que conviene mirar primero.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void reload()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        </div>
      </section>

      {error && <div className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{error}</div>}

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Cartera abierta</p>
          <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-ink">{formatMoney(picture.open)}</p>
          <p className="mt-3 text-xs text-ink-muted">
            {picture.withOpen.length === 0
              ? "Ninguna empresa tiene saldo por cobrar."
              : `${picture.withOpen.length} ${picture.withOpen.length === 1 ? "empresa con saldo" : "empresas con saldo"} · por vencer ${formatMoney(picture.pending)}`}
          </p>
        </article>
        <article className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Vencido</p>
          <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-ink">{formatMoney(picture.overdue)}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-danger" style={{ width: `${overdueShare}%` }} />
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            {picture.open <= 0 ? "No hay cartera abierta." : `${overdueShare}% de lo que todavía se puede cobrar.`}
          </p>
        </article>
        <article className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Ya cobrado</p>
          <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-ink">{formatMoney(picture.paid)}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-brand" style={{ width: `${recoveredShare}%` }} />
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            {picture.issued <= 0 ? "Aún no se ha emitido nada." : `${recoveredShare}% de todo lo emitido en la plataforma.`}
          </p>
        </article>
      </section>

      {pendingSignups > 0 && (
        <Link
          to="/platform/companies?vista=pendientes"
          className="flex items-center justify-between gap-3 rounded-2xl border border-warn/30 bg-surface-card px-5 py-4 shadow-soft hover:bg-surface"
        >
          <span className="flex items-center gap-3 text-sm text-ink">
            <Building2 className="h-4 w-4 text-warn" />
            {pendingSignups === 1 ? "1 empresa espera activación." : `${pendingSignups} empresas esperan activación.`}
          </span>
          <span className="text-xs font-semibold text-brand">Revisar</span>
        </Link>
      )}

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-soft lg:col-span-2">
          <h2 className="text-sm font-semibold text-ink">De todo lo emitido</h2>
          <p className="mt-1 text-xs text-ink-muted">Cobrado, por vencer y vencido sobre el mismo total.</p>
          {picture.issued <= 0 ? (
            <p className="mt-6 text-sm text-ink-muted">Aún no hay montos.</p>
          ) : (
            <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row lg:flex-col xl:flex-row">
              <div className="relative h-40 w-40 shrink-0">
                <Donut
                  parts={[
                    { value: picture.paid, color: COLORS.paid },
                    { value: picture.pending, color: COLORS.pending },
                    { value: picture.overdue, color: COLORS.overdue },
                  ]}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Emitido</span>
                  <span className="text-sm font-semibold tabular-nums text-ink">{compactMoney(picture.issued)}</span>
                </div>
              </div>
              <ul className="w-full min-w-0 space-y-2 text-sm">
                <Slice color={COLORS.paid} label="Cobrado" amount={picture.paid} total={picture.issued} />
                <Slice color={COLORS.pending} label="Por vencer" amount={picture.pending} total={picture.issued} />
                <Slice color={COLORS.overdue} label="Vencido" amount={picture.overdue} total={picture.issued} />
              </ul>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-soft lg:col-span-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-ink">Empresas con atraso</h2>
              <p className="mt-1 text-xs text-ink-muted">Ordenadas por monto vencido. La barra es su cartera abierta.</p>
            </div>
            <Link to="/platform/companies" className="shrink-0 text-xs font-semibold text-brand hover:underline">
              Ver empresas
            </Link>
          </div>
          {picture.withOverdue.length === 0 ? (
            <p className="mt-6 text-sm text-ink-muted">Ninguna empresa tiene cobros vencidos.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {picture.withOverdue.slice(0, 6).map((company) => {
                const open = company.pending_amount + company.overdue_amount;
                const late = open > 0 ? (company.overdue_amount / open) * 100 : 0;
                return (
                  <li key={company.company_id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-medium text-ink">{company.company_name}</p>
                      <p className="shrink-0 text-sm font-semibold tabular-nums text-danger">{formatMoney(company.overdue_amount)}</p>
                    </div>
                    <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-surface">
                      <span className="bg-danger" style={{ width: `${late}%` }} />
                      <span className="bg-warn" style={{ width: `${100 - late}%` }} />
                    </div>
                    <p className="mt-1.5 text-xs text-ink-muted">
                      {Math.round(late)}% de su cartera ya venció · por vencer {formatMoney(company.pending_amount)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-surface-border bg-surface-card shadow-soft">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-surface-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-ink">Cartera por empresa</h2>
            <p className="mt-1 text-xs text-ink-muted">
              {picture.idle.length === 0
                ? "Todas tienen al menos un cobro."
                : `${picture.idle.length} ${picture.idle.length === 1 ? "empresa todavía no emite cobros" : "empresas todavía no emiten cobros"}.`}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
            <CircleAlert className="h-3.5 w-3.5" />
            {data?.total_companies ?? 0} en total
          </span>
        </div>
        {picture.rows.length === 0 ? (
          <p className="px-5 py-8 text-sm text-ink-muted">No hay empresas.</p>
        ) : (
        <ul className="divide-y divide-surface-border">
          {[...picture.rows]
            .sort((a, b) => b.overdue_amount - a.overdue_amount || b.pending_amount - a.pending_amount)
            .map((company) => {
              const open = company.pending_amount + company.overdue_amount;
              const late = open > 0 ? (company.overdue_amount / open) * 100 : 0;
              return (
                <li key={company.company_id} className="px-5 py-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium text-ink">{company.company_name}</p>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-ink">{formatMoney(open)}</p>
                  </div>
                  {open <= 0 ? (
                    <p className="mt-1 text-xs text-ink-muted">
                      {company.paid_amount > 0 ? `Sin saldo. Ya cobró ${formatMoney(company.paid_amount)}.` : "Sin cobros."}
                    </p>
                  ) : (
                    <>
                      <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-surface">
                        <span className="bg-danger" style={{ width: `${late}%` }} />
                        <span className="bg-warn" style={{ width: `${100 - late}%` }} />
                      </div>
                      <p className="mt-1.5 text-xs text-ink-muted">
                        Vencido {formatMoney(company.overdue_amount)} · por vencer {formatMoney(company.pending_amount)} · cobrado{" "}
                        {formatMoney(company.paid_amount)}
                      </p>
                    </>
                  )}
                </li>
              );
            })}
        </ul>
        )}
      </section>
    </div>
  );
}

function Slice({ color, label, amount, total }: { color: string; label: string; amount: number; total: number }) {
  return (
    <li className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-ink">{label}</span>
      <span className="ml-auto font-semibold tabular-nums text-ink">{share(amount, total)}%</span>
    </li>
  );
}
