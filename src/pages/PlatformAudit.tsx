import { useEffect, useState } from "react";
import { listAudit, type AuditDomain, type AuditEvent } from "../api";
import PageLoading from "../components/PageLoading";
import { formatDateTime } from "../lib/format";
import { useMinLoading } from "../lib/useMinLoading";

const OUTCOMES = [
  { id: "", label: "Todos" },
  { id: "success", label: "Correctos" },
  { id: "failure", label: "Fallidos" },
  { id: "denied", label: "Rechazados" },
];

function outcomeLabel(outcome: string) {
  return OUTCOMES.find((item) => item.id === outcome)?.label ?? outcome;
}

export default function PlatformAudit() {
  const [domains, setDomains] = useState<AuditDomain[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [domain, setDomain] = useState("");
  const [outcome, setOutcome] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [loadingRaw, setLoadingRaw] = useState(true);
  const loading = useMinLoading(loadingRaw);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingRaw(true);
    listAudit({ domain, outcome, companyId })
      .then((data) => {
        if (cancelled) return;
        setDomains(Array.isArray(data.domains) ? data.domains : []);
        setEvents(Array.isArray(data.events) ? data.events : []);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "No se pudo leer la auditoría.");
      })
      .finally(() => {
        if (!cancelled) setLoadingRaw(false);
      });
    return () => {
      cancelled = true;
    };
  }, [domain, outcome, companyId]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <section className="rounded-2xl border border-surface-border bg-surface-card px-5 py-5 sm:px-8 sm:py-6">
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink">Auditoría</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Un solo registro para los tres servicios. Cada cajón es un lugar donde buscar: acceso, empresas, clientes, cobros, pagos, credenciales y avisos.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <FilterButton active={domain === ""} onClick={() => setDomain("")}>
            Todo
          </FilterButton>
          {domains.map((item) => (
            <FilterButton key={item.id} active={domain === item.id} onClick={() => setDomain(item.id)} title={item.hint}>
              {item.label}
            </FilterButton>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="text-sm text-ink-muted">
            Resultado
            <select
              className="mt-1 block rounded-lg border border-surface-border bg-surface px-3 py-2 text-ink"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            >
              {OUTCOMES.map((item) => (
                <option key={item.id || "all"} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-ink-muted">
            Empresa
            <input
              inputMode="numeric"
              placeholder="id"
              className="mt-1 block w-28 rounded-lg border border-surface-border bg-surface px-3 py-2 text-ink"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value.replace(/[^\d]/g, ""))}
            />
          </label>
        </div>
      </section>

      {loading ? <PageLoading /> : null}
      {error ? <div className="rounded-xl border border-danger/30 bg-danger-soft p-4 text-danger">{error}</div> : null}

      {!loading && !error ? (
        <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card">
          {events.length === 0 ? (
            <p className="px-5 py-8 text-sm text-ink-muted">No hay eventos en este cajón.</p>
          ) : (
            <ul className="divide-y divide-surface-border">
              {events.map((event) => (
                <li key={event.id} className="px-5 py-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <p className="text-sm font-medium text-ink">{event.summary}</p>
                    <p className="shrink-0 text-xs text-ink-muted">{formatDateTime(event.occurred_at)}</p>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    {event.domain_label} · {event.service}.{event.action} · {outcomeLabel(event.outcome)}
                    {event.company_id ? ` · empresa ${event.company_id}` : ""}
                    {event.actor_user_id ? ` · usuario ${event.actor_user_id}` : ""}
                    {event.target_type && event.target_id ? ` · ${event.target_type} ${event.target_id}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title?: string;
  children: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm ${
        active ? "border-ink bg-ink text-surface" : "border-surface-border bg-surface text-ink"
      }`}
    >
      {children}
    </button>
  );
}
