import { useEffect, useState } from "react";
import axios from "axios";
import { fetchCompanyPaymentPortal, saveCompanyPaymentPortal, type PaymentPortalSettings } from "../api";
import LoadingIndicator from "../components/LoadingIndicator";
import SettingsFrame from "../components/SettingsFrame";
import { useToast } from "../components/Toast";
import { useMinLoading } from "../lib/useMinLoading";

const INPUT =
  "w-full rounded-xl border border-surface-border bg-[rgb(var(--color-field))] px-3 py-2.5 text-sm text-ink outline-none focus:border-brand/50";

const SHORTENERS = new Set([
  "bit.ly",
  "bitly.com",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "buff.ly",
  "rebrand.ly",
  "cutt.ly",
  "shorturl.at",
  "tiny.cc",
  "rb.gy",
  "s.id",
  "acortar.link",
  "lnkd.in",
]);

type Mode = "flowpay" | "external";

type Draft = { mode: Mode; url: string };

function apiMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const text = err.response?.data?.error;
    if (typeof text === "string" && text.trim()) return text;
  }
  return fallback;
}

function draftFrom(status: PaymentPortalSettings): Draft {
  const pending = status.pending_url.trim();
  return {
    mode: pending || status.mode === "external" ? "external" : "flowpay",
    url: pending || status.url || "",
  };
}

function portalURLError(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "Pega la dirección del portal.";
  if (value.includes("{{") || value.includes("}}")) return "Pega solo la dirección del portal, sin datos del cobro.";
  if (value.length > 500) return "La dirección es demasiado larga.";
  if (/[\s\\]/.test(value)) return "Esa dirección no es válida.";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "El portal tiene que usar https.";
  }
  if (url.protocol !== "https:") return "El portal tiene que usar https.";
  if (url.username || url.password) return "La dirección no puede incluir usuario ni contraseña.";
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".localhost") || host.endsWith(".internal")) {
    return "El portal tiene que ser un dominio público.";
  }
  if (host.includes(":") || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return "El portal tiene que ser un dominio, no una IP.";
  if (!host.includes(".")) return "El portal tiene que ser un dominio público.";
  const bare = host.startsWith("www.") ? host.slice(4) : host;
  if (SHORTENERS.has(bare)) return "Usa la dirección completa del portal, sin acortadores.";
  return null;
}

function Choice({
  selected,
  title,
  detail,
  onSelect,
}: {
  selected: boolean;
  title: string;
  detail: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={[
        "w-full rounded-2xl border px-4 py-3 text-left transition-colors",
        selected ? "border-brand bg-brand-soft" : "border-surface-border bg-[rgb(var(--color-field))] hover:border-brand/40",
      ].join(" ")}
    >
      <span className="block text-sm font-semibold text-ink">{title}</span>
      <span className="mt-1 block text-sm leading-relaxed text-ink-muted">{detail}</span>
    </button>
  );
}

export default function PaymentPortalSettings() {
  return (
    <SettingsFrame
      title="Enlace de pago"
      hint="El enlace que acompaña al recordatorio. El portal de Geldflus se aplica al guardar. Si pegas el de tu empresa, queda pendiente hasta que lo aprobemos."
    >
      <PaymentPortalForm />
    </SettingsFrame>
  );
}

function PaymentPortalForm() {
  const toast = useToast();
  const [status, setStatus] = useState<PaymentPortalSettings | null>(null);
  const [draft, setDraft] = useState<Draft>({ mode: "flowpay", url: "" });
  const [loadingRaw, setLoadingRaw] = useState(true);
  const loading = useMinLoading(loadingRaw);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCompanyPaymentPortal()
      .then((data) => {
        if (cancelled) return;
        setStatus(data);
        setDraft(draftFrom(data));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(apiMessage(err, "No se pudo leer el enlace de pago."));
      })
      .finally(() => {
        if (!cancelled) setLoadingRaw(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-48 items-center justify-center" role="status" aria-live="polite">
        <LoadingIndicator />
      </div>
    );
  }
  if (error || !status) {
    return <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">{error || "No se pudo leer el enlace de pago."}</div>;
  }

  const saved = draftFrom(status);
  const dirty = draft.mode !== saved.mode || (draft.mode === "external" && draft.url.trim() !== saved.url.trim());
  const proposesNew = draft.mode === "external" && draft.url.trim() !== status.url.trim();
  const inUse = status.mode === "external" && status.url ? status.url : "";

  async function onSave() {
    if (!status) return;
    setFormError(null);
    if (draft.mode === "external") {
      const problem = portalURLError(draft.url);
      const sameApproved = draft.url.trim() !== "" && draft.url.trim() === status.url.trim();
      if (problem && !sameApproved) {
        setFormError(problem);
        return;
      }
    }
    setSaving(true);
    try {
      const next = await saveCompanyPaymentPortal(
        draft.mode === "flowpay" ? { mode: "flowpay" } : { mode: "external", url: draft.url.trim() },
      );
      setStatus(next);
      setDraft(draftFrom(next));
      if (next.pending_url) {
        toast.success("Quedó pendiente de aprobación. Los recordatorios siguen como están.");
      } else if (next.mode === "external") {
        toast.success("Los recordatorios ya usan tu portal.");
      } else {
        toast.success("Los recordatorios usan el portal de Geldflus.");
      }
    } catch (err: unknown) {
      setFormError(apiMessage(err, "No se pudo guardar el enlace de pago."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      {status.rejection ? (
        <p className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
          No aprobamos la última dirección: {status.rejection}
        </p>
      ) : null}
      {status.pending_url ? (
        <p className="rounded-xl bg-warn-soft px-3 py-2.5 text-sm leading-relaxed text-warn">
          Esta dirección está pendiente de aprobación. Los recordatorios siguen{" "}
          {inUse ? (
            <>
              usando <span className="break-all font-medium">{inUse}</span>.
            </>
          ) : (
            "con el enlace de Geldflus."
          )}
        </p>
      ) : status.mode === "external" && status.url ? (
        <p className="rounded-xl bg-brand-soft px-3 py-2.5 text-sm text-brand">Los recordatorios usan esta dirección.</p>
      ) : null}

      <div className="space-y-2" role="group" aria-label="Portal del recordatorio">
        <Choice
          selected={draft.mode === "flowpay"}
          title="Portal Geldflus"
          detail="El enlace de cada cobro, en geldflus.com."
          onSelect={() => {
            setFormError(null);
            setDraft((current) => ({ ...current, mode: "flowpay" }));
          }}
        />
        <Choice
          selected={draft.mode === "external"}
          title="Portal propio"
          detail="La misma dirección en todos los recordatorios. El monto y la sucursal siguen en el mensaje."
          onSelect={() => {
            setFormError(null);
            setDraft((current) => ({
              ...current,
              mode: "external",
              url: current.url || status.url || "",
            }));
          }}
        />
      </div>

      {draft.mode === "external" ? (
        <label className="block text-sm font-medium text-ink">
          Dirección del portal
          <input
            className={`${INPUT} mt-1.5`}
            type="url"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            placeholder="https://pagos.tuempresa.cl"
            value={draft.url}
            onChange={(event) => {
              setFormError(null);
              setDraft((current) => ({ ...current, url: event.target.value }));
            }}
          />
          <span className="mt-1.5 block text-sm font-normal leading-relaxed text-ink-muted">
            Tiene que empezar con https. No hace falta el monto ni el cliente.
          </span>
        </label>
      ) : null}

      {draft.mode === "external" && proposesNew && draft.url.trim() ? (
        <p className="text-sm leading-relaxed text-ink-muted">
          Al guardar queda pendiente. El enlace de los recordatorios no cambia hasta que la aprobemos.
        </p>
      ) : null}
      {draft.mode === "external" && status.url && draft.url.trim() === status.url.trim() && status.mode !== "external" ? (
        <p className="text-sm leading-relaxed text-ink-muted">Esta dirección ya está aprobada. Al guardar, los recordatorios pasan a usarla.</p>
      ) : null}

      {formError ? <p className="text-sm text-danger">{formError}</p> : null}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={() => void onSave()}
          className="h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {saving ? "Guardando…" : dirty && proposesNew ? "Enviar a revisión" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
