import { ChevronDown, ChevronRight, Filter } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { listAudit, listCompanies, type AuditDomain, type AuditEvent, type CompanyDTO } from "../api";
import AppSelect from "../components/AppSelect";
import FilterTray from "../components/FilterTray";
import PageLoading from "../components/PageLoading";
import { formatDateTime, formatMoney } from "../lib/format";
import { useMinLoading } from "../lib/useMinLoading";

const APIS = [
  { id: "sso", name: "SSO", hint: "Ingresos, empresas, usuarios y clientes" },
  { id: "backend", name: "Backend", hint: "Cobros, avisos, correo y WhatsApp" },
  { id: "payments", name: "Payments", hint: "Enlaces de pago, pasarelas y webhooks" },
];

const OUTCOMES = [
  { id: "", label: "Todos" },
  { id: "success", label: "Correctos" },
  { id: "failure", label: "Fallidos" },
  { id: "denied", label: "Rechazados" },
];

const META_LABELS: Record<string, string> = {
  email: "Correo",
  reason: "Motivo",
  kind: "Tipo",
  channel: "Canal",
  gateway: "Pasarela",
  amount: "Monto",
  status: "Estado",
  buy_order: "Orden",
  from: "Desde",
  to: "Hasta",
  allow_email: "Correo habilitado",
  allow_whatsapp: "WhatsApp habilitado",
  error_code: "Código de error",
  code: "Código",
  response_code: "Código de respuesta",
};

function outcomeLabel(outcome: string) {
  return OUTCOMES.find((item) => item.id === outcome)?.label ?? outcome;
}

function roleLabel(role: string) {
  switch (role.trim().toLowerCase()) {
    case "platform_admin":
      return "Superadmin";
    case "admin":
    case "company_admin":
      return "Administrador";
    case "member":
      return "Vendedor";
    case "system":
      return "Sistema";
    case "webhook":
      return "Pasarela";
    case "payer":
      return "Deudor";
    case "public":
      return "Enlace público";
    default:
      return "";
  }
}

function metaEmail(event: AuditEvent) {
  const value = event.metadata?.email;
  return typeof value === "string" ? value.trim() : "";
}

function browserLabel(ua: string, hint: string) {
  const raw = ua.trim();
  const name = brandFromHint(hint) || (raw ? browserName(raw) : "");
  const os = raw ? osName(raw) : "";
  const readable = [name, os].filter(Boolean).join(" · ");
  return readable || raw.slice(0, 80);
}

function brandFromHint(hint: string) {
  const found: { name: string; version: string }[] = [];
  const pattern = /"([^"]+)";v="(\d+)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(hint)) !== null) {
    found.push({ name: match[1], version: match[2] });
  }
  const real = found.filter((item) => !/not.+brand/i.test(item.name));
  const specific = real.find((item) => !/^(Chromium|Google Chrome)$/i.test(item.name));
  const chosen = specific ?? real.find((item) => /google chrome/i.test(item.name)) ?? real[0];
  if (!chosen) return "";
  const lower = chosen.name.toLowerCase();
  const name = lower === "google chrome" ? "Chrome" : lower === "microsoft edge" ? "Edge" : chosen.name;
  return withVersion(name, chosen.version);
}

function browserName(ua: string) {
  const edge = major(ua, "Edg") || major(ua, "EdgA") || major(ua, "EdgiOS");
  if (edge || ua.includes("Edg/")) return withVersion("Edge", edge);
  const opera = major(ua, "OPR") || major(ua, "Opera");
  if (opera || ua.includes("OPR/")) return withVersion("Opera", opera);
  const samsung = major(ua, "SamsungBrowser");
  if (samsung) return withVersion("Samsung Internet", samsung);
  const chromeIOS = major(ua, "CriOS");
  if (chromeIOS) return withVersion("Chrome", chromeIOS);
  const firefox = major(ua, "FxiOS") || major(ua, "Firefox");
  if (firefox || ua.includes("Firefox/")) return withVersion("Firefox", firefox);
  if (ua.includes("Chrome/")) return withVersion("Chrome", major(ua, "Chrome"));
  if (ua.includes("Safari/")) return withVersion("Safari", major(ua, "Version"));
  const product = ua.match(/^([A-Za-z][\w.+-]{0,40})\/(\d+)/);
  if (product) return withVersion(product[1], product[2]);
  return "";
}

function osName(ua: string) {
  if (ua.includes("iPhone")) return "iPhone";
  if (ua.includes("iPad")) return "iPad";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac OS X")) return "macOS";
  if (ua.includes("CrOS")) return "ChromeOS";
  if (ua.includes("Linux")) return "Linux";
  return "";
}

function major(ua: string, token: string) {
  const match = ua.match(new RegExp(`${token}/(\\d+)`));
  return match?.[1] ?? "";
}

function withVersion(name: string, version: string) {
  return version ? `${name} ${version}` : name;
}

function person(event: AuditEvent) {
  const role = roleLabel(event.actor_role ?? "");
  const name = event.actor_name?.trim() ?? "";
  const email = event.actor_email?.trim() ?? "";
  if (name) return { title: name, detail: [role, email].filter(Boolean).join(" · ") };
  if (email) return { title: email, detail: role };
  const masked = metaEmail(event);
  if (masked) return { title: masked, detail: role };
  if (event.actor_user_id && event.actor_name !== undefined) return { title: "Usuario dado de baja", detail: role };
  if (role) return { title: role, detail: "" };
  return { title: "", detail: "" };
}

function about(event: AuditEvent) {
  const label = event.target_label?.trim() ?? "";
  if (!label) return "";
  if (event.target_type === "user" && label === event.actor_name?.trim()) return "";
  if (event.target_type === "company" && label === event.company_name?.trim()) return "";
  if (event.target_type === "client") return `Cliente ${label}`;
  if (event.target_type === "charge") return `Cobro de ${label}`;
  if (event.target_type === "user") return `Sobre ${label}`;
  return label;
}

function metaRows(event: AuditEvent) {
  const meta = event.metadata ?? {};
  return Object.entries(meta)
    .filter(([key, value]) => key !== "email" && value !== null && value !== "" && value !== undefined)
    .map(([key, value]) => ({
      label: META_LABELS[key] ?? key,
      value: formatMeta(key, value),
    }));
}

function formatMeta(key: string, value: unknown): string {
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "number" && (key === "amount" || key.endsWith("_clp"))) return formatMoney(value);
  if (typeof value === "string" || typeof value === "number") return String(value);
  return JSON.stringify(value);
}

export default function PlatformAudit() {
  const [service, setService] = useState("");
  const [domains, setDomains] = useState<AuditDomain[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [companies, setCompanies] = useState<CompanyDTO[]>([]);
  const [domain, setDomain] = useState("");
  const [outcome, setOutcome] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [openFilters, setOpenFilters] = useState(false);
  const [loadingRaw, setLoadingRaw] = useState(false);
  const loading = useMinLoading(loadingRaw);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listCompanies()
      .then((rows) => {
        if (!cancelled) setCompanies(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setCompanies([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!service) return;
    let cancelled = false;
    setLoadingRaw(true);
    setOpenId(null);
    listAudit({ service, domain, outcome, companyId })
      .then((data) => {
        if (cancelled) return;
        setDomains(Array.isArray(data.domains) ? data.domains : []);
        const rows = Array.isArray(data.events) ? data.events : [];
        setEvents(rows.filter((event) => event.service === service));
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
  }, [service, domain, outcome, companyId]);

  const api = APIS.find((item) => item.id === service);
  const serviceDomains = domains.filter((item) => item.service === service);
  const companyOptions = useMemo(
    () => [
      { value: "", label: "Todas las empresas" },
      ...[...companies]
        .sort((a, b) => a.name.localeCompare(b.name, "es"))
        .map((company) => ({ value: String(company.id), label: company.name })),
    ],
    [companies],
  );

  function openApi(id: string) {
    setService(id);
    setDomain("");
    setOutcome("");
    setCompanyId("");
    setError(null);
  }

  if (!api) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-5">
          <h1 className="font-display text-3xl font-medium tracking-tight text-ink">Auditoría</h1>
          <p className="mt-2 max-w-xl text-sm text-ink-muted">Elige un servicio para ver quién actuó, desde dónde y con qué resultado.</p>
        </div>
        <section className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-soft">
          <ul className="divide-y divide-surface-border">
            {APIS.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => openApi(item.id)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-surface">
                  <span>
                    <span className="block text-sm font-semibold text-ink">{item.name}</span>
                    <span className="mt-1 block text-sm text-ink-muted">{item.hint}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button type="button" onClick={() => setService("")} className="inline-flex text-sm font-medium text-brand hover:underline">
            ← Volver a servicios
          </button>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-ink">{api.name}</h1>
          <p className="mt-2 text-sm text-ink-muted">{api.hint}</p>
        </div>
        <button
          type="button"
          aria-expanded={openFilters}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium ${
            openFilters
              ? "border-brand/40 bg-brand-soft text-brand"
              : "border-surface-border bg-surface-card text-ink-muted hover:bg-surface hover:text-ink"
          }`}
          onClick={() => setOpenFilters((open) => !open)}
        >
          <Filter className="h-4 w-4" />
          Filtros
        </button>
      </div>

      {error ? <div className="mb-4 rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{error}</div> : null}

      <section className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-soft">
        <FilterTray open={openFilters}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {serviceDomains.length > 1 ? (
              <label className="text-sm text-ink-muted">
                Cajón
                <AppSelect
                  value={domain}
                  onChange={setDomain}
                  options={[{ value: "", label: "Todo" }, ...serviceDomains.map((item) => ({ value: item.id, label: item.label }))]}
                />
              </label>
            ) : null}
            <label className="text-sm text-ink-muted">
              Resultado
              <AppSelect value={outcome} onChange={setOutcome} options={OUTCOMES.map((item) => ({ value: item.id, label: item.label }))} />
            </label>
            <label className="text-sm text-ink-muted">
              Empresa
              <AppSelect value={companyId} onChange={setCompanyId} options={companyOptions} placeholder="Todas las empresas" />
            </label>
          </div>
        </FilterTray>
        {loading ? <PageLoading /> : null}
        {!loading && !error && events.length === 0 ? <p className="px-5 py-10 text-center text-sm text-ink-muted">No hay registros para estos filtros.</p> : null}
        {!loading && !error && events.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="bg-surface/80 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3">Cuándo</th>
                  <th className="px-4 py-3">Registro</th>
                  <th className="px-4 py-3">Quién</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="whitespace-nowrap px-4 py-3">IP</th>
                  <th className="px-4 py-3">Navegador</th>
                  <th className="px-4 py-3">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {events.map((event) => (
                  <LogRow key={event.id} event={event} open={openId === event.id} onToggle={() => setOpenId(openId === event.id ? null : event.id)} />
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function LogRow({ event, open, onToggle }: { event: AuditEvent; open: boolean; onToggle: () => void }) {
  const who = person(event);
  const subject = about(event);
  const namedCompany = event.company_name?.trim() ?? "";
  const company = namedCompany ? namedCompany : event.company_id && event.company_name !== undefined ? "Empresa eliminada" : "";
  const extra = metaRows(event);
  const browser = browserLabel(event.user_agent ?? "", event.client_hint ?? "");
  const tone = event.outcome === "success" ? "text-brand" : event.outcome === "failure" ? "text-danger" : event.outcome === "denied" ? "text-warn" : "text-ink-muted";

  return (
    <>
      <tr
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle();
          }
        }}
        tabIndex={0}
        className="cursor-pointer hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand"
        aria-expanded={open}
      >
        <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
          <span className="inline-flex items-center gap-2">
            <ChevronDown className={`h-4 w-4 transition ${open ? "" : "-rotate-90"}`} />
            {formatDateTime(event.occurred_at)}
          </span>
        </td>
        <td className="px-4 py-3 font-medium text-ink">{event.summary}</td>
        <td className="px-4 py-3 text-ink">{who.title || "—"}</td>
        <td className="px-4 py-3 text-ink-muted">{company || "—"}</td>
        <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{event.ip || "—"}</td>
        <td className="px-4 py-3 text-ink-muted">{browser || "—"}</td>
        <td className={`whitespace-nowrap px-4 py-3 font-semibold ${tone}`}>{outcomeLabel(event.outcome)}</td>
      </tr>
      {open ? (
        <tr className="bg-surface/70">
          <td colSpan={7} className="px-4 py-4">
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Detail label="Resultado" value={outcomeLabel(event.outcome)} />
              {who.title ? <Detail label="Quién" value={who.detail ? `${who.title} · ${who.detail}` : who.title} /> : null}
              {company ? <Detail label="Empresa" value={company} /> : null}
              {subject ? <Detail label="Sobre" value={subject} /> : null}
              {event.domain_label ? <Detail label="Cajón" value={event.domain_label} /> : null}
              {event.ip ? <Detail label="IP" value={event.ip} /> : null}
              {browser ? <Detail label="Navegador" value={browser} /> : null}
              {extra.map((row) => (
                <Detail key={row.label} label={row.label} value={row.value} />
              ))}
              {event.user_agent?.trim() ? (
                <div className="min-w-0 sm:col-span-2 lg:col-span-3">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Agente</dt>
                  <dd className="mt-1 break-all text-sm text-ink">{event.user_agent.trim()}</dd>
                </div>
              ) : null}
            </dl>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-ink">{value}</dd>
    </div>
  );
}

