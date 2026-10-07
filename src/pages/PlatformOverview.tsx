import { ArrowDownRight, ArrowUpRight, Building2, CircleAlert, RefreshCw, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchPlatformOverview, type PlatformOverviewResponse } from "../api";
import PageLoading from "../components/PageLoading";
import { formatMoney } from "../lib/format";
import { clearHomePrefetch, peekPlatformOverview } from "../lib/homePrefetch";
import { useMinLoading } from "../lib/useMinLoading";

type KpiTone = "default" | "success" | "warning" | "danger";

export default function PlatformOverview() {
  const [prefetched] = useState(peekPlatformOverview);
  const [data, setData] = useState<PlatformOverviewResponse | null>(prefetched);
  const [loadingRaw, setLoading] = useState(!prefetched);
  const loading = useMinLoading(loadingRaw);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPlatformOverview();
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar vista global");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (prefetched) {
      clearHomePrefetch();
      return;
    }
    void reload();
  }, []);

  const companies = useMemo(() => {
    if (!data) return [];
    const rows = Array.isArray(data.companies) ? data.companies : [];
    return [...rows].sort((a, b) => b.owed_amount - a.owed_amount);
  }, [data]);

  const totals = useMemo(() => {
    const totalOwed = data?.total_owed ?? 0;
    const totalPaid = data?.total_paid ?? 0;
    const totalPending = data?.total_pending ?? 0;
    const totalOverdue = data?.total_overdue ?? 0;

    const collectionRate = totalOwed > 0 ? (totalPaid / totalOwed) * 100 : 0;
    const overdueRate = totalOwed > 0 ? (totalOverdue / totalOwed) * 100 : 0;
    const pendingRate = totalOwed > 0 ? (totalPending / totalOwed) * 100 : 0;

    return {
      totalOwed,
      totalPaid,
      totalPending,
      totalOverdue,
      collectionRate,
      overdueRate,
      pendingRate,
    };
  }, [data]);

  if (loading) {
    return <PageLoading />;
  }

  if (error && !data) {
    return <div className="rounded-xl border border-danger/30 bg-danger-soft p-4 text-danger">{error}</div>;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-0">
      <section className="rounded-2xl border border-surface-border bg-surface-card px-5 py-5 sm:px-8 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-medium tracking-tight text-ink">Inicio</h1>
            <p className="mt-2 text-sm text-ink-muted">
              Panorama global para priorizar la cobranza de cada empresa.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <Pill label={`${data?.total_companies ?? 0} empresas`} icon={<Building2 className="h-3.5 w-3.5" />} />
              <Pill label={`Recuperación ${totals.collectionRate.toFixed(1)}%`} icon={<Wallet className="h-3.5 w-3.5" />} />
              <Pill label={`Vencido ${totals.overdueRate.toFixed(1)}%`} icon={<CircleAlert className="h-3.5 w-3.5" />} />
            </div>
          </div>

          <button
            type="button"
            onClick={() => void reload()}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        </div>
      </section>

      {error && <div className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{error}</div>}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi title="Empresas" value={String(data?.total_companies ?? 0)} hint="Activas + inactivas" />
        <Kpi title="Deuda total" value={formatMoney(totals.totalOwed)} hint="Base total de cobro" />
        <Kpi
          title="Total cobrado"
          value={formatMoney(totals.totalPaid)}
          hint={`${totals.collectionRate.toFixed(1)}% del total`}
          tone="success"
          trend={<ArrowUpRight className="h-4 w-4" />}
        />
        <Kpi
          title="Pendiente"
          value={formatMoney(totals.totalPending)}
          hint={`${totals.pendingRate.toFixed(1)}% del total`}
          tone="warning"
        />
        <Kpi
          title="Vencido"
          value={formatMoney(totals.totalOverdue)}
          hint={`${totals.overdueRate.toFixed(1)}% del total`}
          tone="danger"
          trend={<ArrowDownRight className="h-4 w-4" />}
        />
      </section>

      <section className="rounded-2xl border border-surface-border bg-surface-card shadow-soft">
        <div className="border-b border-surface-border px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-ink">Comparativa por empresa</h2>
            <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-ink-muted">
              Ordenado por mayor deuda total
            </span>
          </div>
        </div>
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[760px] table-fixed border-collapse text-xs sm:text-sm">
            <colgroup>
              <col className="w-[30%]" />
              <col className="w-[17%]" />
              <col className="w-[17%]" />
              <col className="w-[18%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead className="bg-surface/70 text-left text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 sm:px-6">Empresa</th>
                <th className="px-3 py-3 text-right sm:px-5">Deuda total</th>
                <th className="px-3 py-3 text-right sm:px-5">Cobrado</th>
                <th className="px-3 py-3 text-right sm:px-5">Pendiente</th>
                <th className="px-3 py-3 text-right sm:px-5">Vencido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {companies.map((c) => {
                const base = c.owed_amount > 0 ? c.owed_amount : 0;
                const paidPct = base > 0 ? Math.max(0, Math.min(100, (c.paid_amount / base) * 100)) : 0;
                const pendingPct = base > 0 ? Math.max(0, Math.min(100, (c.pending_amount / base) * 100)) : 0;
                const overduePct = base > 0 ? Math.max(0, Math.min(100, (c.overdue_amount / base) * 100)) : 0;
                return (
                  <tr key={c.company_id} className="hover:bg-surface/40">
                    <td className="max-w-0 px-4 py-3 font-medium text-ink sm:px-6">
                      <span className="line-clamp-2 break-words">{c.company_name}</span>
                    </td>
                    <td className="px-3 py-3 text-right sm:px-5">
                      <div className="tabular-nums">{formatMoney(c.owed_amount)}</div>
                      <div className="mt-0.5 text-[11px] text-ink-muted">100%</div>
                    </td>
                    <td className="px-3 py-3 text-right sm:px-5">
                      <div className="tabular-nums text-brand">{formatMoney(c.paid_amount)}</div>
                      <div className="mt-0.5 text-[11px] text-brand">{paidPct.toFixed(1)}%</div>
                    </td>
                    <td className="px-3 py-3 text-right sm:px-5">
                      <div className="tabular-nums text-warn">{formatMoney(c.pending_amount)}</div>
                      <div className="mt-0.5 text-[11px] text-warn">{pendingPct.toFixed(1)}%</div>
                    </td>
                    <td className="px-3 py-3 text-right sm:px-5">
                      <div className="tabular-nums text-danger">{formatMoney(c.overdue_amount)}</div>
                      <div className="mt-0.5 text-[11px] text-danger">{overduePct.toFixed(1)}%</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Pill({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-surface px-2.5 py-1 text-[11px] font-medium text-ink">
      {icon}
      {label}
    </span>
  );
}

function Kpi({
  title,
  value,
  hint,
  tone = "default",
  trend,
}: {
  title: string;
  value: string;
  hint: string;
  tone?: KpiTone;
  trend?: React.ReactNode;
}) {
  const toneClasses: Record<KpiTone, string> = {
    default: "border-surface-border bg-surface-card",
    success: "border-surface-border bg-surface-card",
    warning: "border-surface-border bg-surface-card",
    danger: "border-surface-border bg-surface-card",
  };

  return (
    <div className={`rounded-2xl border p-3 shadow-soft sm:p-4 ${toneClasses[tone]}`}>
      <div className="text-[11px] uppercase tracking-wide text-ink-muted">{title}</div>
      <div className="mt-2 flex items-center gap-2">
        <div className={`text-xl font-semibold sm:text-2xl ${tone === "success" ? "text-brand" : tone === "warning" ? "text-warn" : tone === "danger" ? "text-danger" : "text-ink"}`}>{value}</div>
        {trend && <span className="text-ink-muted">{trend}</span>}
      </div>
      <div className="mt-1 text-xs text-ink-muted">{hint}</div>
    </div>
  );
}
