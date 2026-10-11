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

  return (
    <div className="mx-auto w-full max-w-6xl">
      {loading && <PageLoading />}
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Planes</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        El precio mensual y la comisión de cada pago cobrado. Quien se registra ve estas tarjetas. Si una empresa necesita otra condición, se ajusta en Empresas.
      </p>
      {error && <div className="mt-4 rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{error}</div>}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
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
