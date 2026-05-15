import { ArrowDownRight, ArrowUpRight, Building2, CircleAlert, RefreshCw, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchPlatformOverview, type PlatformOverviewResponse } from "../api";
import PageLoading from "../components/PageLoading";
import { formatMoney } from "../lib/format";

type KpiTone = "default" | "success" | "warning" | "danger";

export default function PlatformOverview() {
  const [data, setData] = useState<PlatformOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
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
    return (
      <div className="mx-auto w-full max-w-6xl px-0">
        <PageLoading />
      </div>
    );
  }

  if (error && !data) {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-0">
      <section className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-600 via-indigo-500 to-cyan-500 px-6 py-6 text-white shadow-soft dark:border-indigo-800/50 dark:from-indigo-950 dark:via-indigo-900 dark:to-slate-900 sm:px-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/20 blur-2xl dark:bg-indigo-400/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-cyan-300/20 blur-2xl dark:bg-cyan-500/10" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Inicio Superadmin</h1>
            <p className="mt-1 text-sm text-indigo-100 dark:text-indigo-200/90">
              Panorama global en tiempo real para priorizar gestión de cobranza por empresa.
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
            className="inline-flex items-center gap-2 rounded-xl border border-white/35 bg-white/10 px-3 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/20"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        </div>
      </section>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

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
            <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
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
                      <div className="tabular-nums text-emerald-700 dark:text-emerald-400">{formatMoney(c.paid_amount)}</div>
                      <div className="mt-0.5 text-[11px] text-emerald-700 dark:text-emerald-400">{paidPct.toFixed(1)}%</div>
                    </td>
                    <td className="px-3 py-3 text-right sm:px-5">
                      <div className="tabular-nums text-amber-700 dark:text-amber-400">{formatMoney(c.pending_amount)}</div>
                      <div className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-400">{pendingPct.toFixed(1)}%</div>
                    </td>
                    <td className="px-3 py-3 text-right sm:px-5">
                      <div className="tabular-nums text-rose-700 dark:text-rose-400">{formatMoney(c.overdue_amount)}</div>
                      <div className="mt-0.5 text-[11px] text-rose-700 dark:text-rose-400">{overduePct.toFixed(1)}%</div>
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
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-[11px] font-medium">
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
    success:
      "border-emerald-100 bg-emerald-50/40 dark:border-emerald-500/30 dark:bg-emerald-950/45",
    warning:
      "border-amber-100 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-950/45",
    danger: "border-rose-100 bg-rose-50/50 dark:border-rose-500/30 dark:bg-rose-950/45",
  };

  return (
    <div className={`rounded-2xl border p-3 shadow-soft sm:p-4 ${toneClasses[tone]}`}>
      <div className="text-[11px] uppercase tracking-wide text-ink-muted">{title}</div>
      <div className="mt-2 flex items-center gap-2">
        <div className="text-xl font-semibold text-ink sm:text-2xl">{value}</div>
        {trend && <span className="text-ink-muted">{trend}</span>}
      </div>
      <div className="mt-1 text-xs text-ink-muted">{hint}</div>
    </div>
  );
}
