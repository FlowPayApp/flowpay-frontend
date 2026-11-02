import { useEffect, useState } from "react";
import { listSignupPlans, updateSignupPlan, type SignupPlan } from "../api";
import PageLoading from "../components/PageLoading";
import { useToast } from "../components/Toast";
import { formatMoney } from "../lib/format";
import { useMinLoading } from "../lib/useMinLoading";

type Draft = {
  label: string;
  detail: string;
  price: string;
  features: string;
  highlight: boolean;
  commission: string;
};

function toDraft(plan: SignupPlan): Draft {
  return {
    label: plan.label,
    detail: plan.detail,
    price: String(plan.price_clp ?? 0),
    features: (plan.features ?? []).join("\n"),
    highlight: Boolean(plan.highlight),
    commission: String(plan.commission_percent ?? 0).replace(".", ","),
  };
}

function formatPercent(n: number): string {
  return `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(n)}%`;
}

function parseAmount(raw: string): number {
  const n = Number(raw.replace(/\./g, "").replace(",", ".").trim());
  return Number.isFinite(n) ? n : NaN;
}

export default function PlatformPlans() {
  const toast = useToast();
  const [plans, setPlans] = useState<SignupPlan[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loadingRaw, setLoadingRaw] = useState(true);
  const loading = useMinLoading(loadingRaw);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await listSignupPlans();
    const list = Array.isArray(data) ? data : [];
    setPlans(list);
    const next: Record<string, Draft> = {};
    for (const plan of list) next[plan.id] = toDraft(plan);
    setDrafts(next);
  }

  useEffect(() => {
    let cancelled = false;
    load()
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "No se pudieron cargar los planes.");
      })
      .finally(() => {
        if (!cancelled) setLoadingRaw(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function patch(id: string, partial: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...partial } }));
  }

  async function onSave(plan: SignupPlan) {
    const draft = drafts[plan.id];
    if (!draft) return;
    const price = parseAmount(draft.price);
    const commission = parseAmount(draft.commission);
    if (!draft.label.trim()) {
      toast.error("El plan necesita un nombre.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error("El precio mensual no es válido.");
      return;
    }
    if (!Number.isFinite(commission) || commission < 0 || commission > 100) {
      toast.error("La comisión va de 0 a 100.");
      return;
    }
    setSaving(plan.id);
    try {
      await updateSignupPlan(plan.id, {
        label: draft.label.trim(),
        detail: draft.detail.trim(),
        price_clp: Math.round(price),
        features: draft.features.split("\n").map((line) => line.trim()).filter(Boolean),
        highlight: draft.highlight,
        commission_percent: commission,
      });
      await load();
      toast.success("Plan guardado.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar el plan.");
    } finally {
      setSaving(null);
    }
  }

  const ladder = plans
    .map((plan) => {
      const draft = drafts[plan.id];
      const price = draft ? parseAmount(draft.price) : (plan.price_clp ?? 0);
      const commission = draft ? parseAmount(draft.commission) : (plan.commission_percent ?? 0);
      return {
        id: plan.id,
        label: draft?.label || plan.label,
        price: Number.isFinite(price) ? price : 0,
        commission: Number.isFinite(commission) ? commission : 0,
        highlight: draft?.highlight ?? Boolean(plan.highlight),
      };
    })
    .sort((a, b) => a.price - b.price);
  const maxPrice = Math.max(...ladder.map((item) => item.price), 1);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {loading && <PageLoading />}
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink">Planes</h1>
      </div>
      {ladder.length > 0 && (
        <section className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-soft sm:p-6">
          <h2 className="text-sm font-semibold text-ink">Cómo se comparan</h2>
          <p className="mt-1 text-xs text-ink-muted">La barra es el precio mensual. La comisión es lo que se queda de cada pago cobrado.</p>
          <ul className="mt-5 space-y-4">
            {ladder.map((item) => (
              <li key={item.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium text-ink">
                    {item.label}
                    {item.highlight ? <span className="ml-2 text-xs font-semibold text-brand">Recomendado</span> : null}
                  </p>
                  <p className="shrink-0 text-sm tabular-nums text-ink">
                    {formatMoney(item.price)}
                    <span className="text-ink-muted"> · {formatPercent(item.commission)}</span>
                  </p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(4, (item.price / maxPrice) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {error && <div className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{error}</div>}
      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const draft = drafts[plan.id];
          if (!draft) return null;
          const busy = saving === plan.id;
          return (
            <form
              key={plan.id}
              className="flex flex-col rounded-2xl border border-surface-border bg-surface-card p-5 shadow-soft"
              onSubmit={(e) => {
                e.preventDefault();
                void onSave(plan);
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">{plan.id}</p>
                {draft.highlight ? (
                  <span className="rounded-full border border-brand/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                    Recomendado
                  </span>
                ) : null}
              </div>
              <label className="mt-4 text-sm text-ink-muted">
                Nombre
                <input
                  className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink"
                  value={draft.label}
                  onChange={(e) => patch(plan.id, { label: e.target.value })}
                />
              </label>
              <label className="mt-3 text-sm text-ink-muted">
                Descripción
                <textarea
                  className="mt-1 min-h-20 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink"
                  value={draft.detail}
                  onChange={(e) => patch(plan.id, { detail: e.target.value })}
                />
              </label>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="text-sm text-ink-muted">
                  Precio mensual
                  <input
                    inputMode="numeric"
                    className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink"
                    value={draft.price}
                    onChange={(e) => patch(plan.id, { price: e.target.value })}
                  />
                  <span className="mt-1 block text-xs">{formatMoney(parseAmount(draft.price))}</span>
                </label>
                <label className="text-sm text-ink-muted">
                  Comisión %
                  <input
                    inputMode="decimal"
                    className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink"
                    value={draft.commission}
                    onChange={(e) => patch(plan.id, { commission: e.target.value })}
                  />
                  <span className="mt-1 block text-xs">de cada pago cobrado</span>
                </label>
              </div>
              <label className="mt-3 text-sm text-ink-muted">
                Incluye, una línea por punto
                <textarea
                  className="mt-1 min-h-28 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink"
                  value={draft.features}
                  onChange={(e) => patch(plan.id, { features: e.target.value })}
                />
              </label>
              <label className="mt-3 flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={draft.highlight}
                  onChange={(e) => patch(plan.id, { highlight: e.target.checked })}
                />
                Mostrar como recomendado
              </label>
              <button
                type="submit"
                disabled={busy}
                className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
              >
                {busy ? "Guardando…" : "Guardar"}
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
