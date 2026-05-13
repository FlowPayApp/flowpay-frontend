import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCompanyMessaging, saveCompanyMessaging } from "../api";
import type { MessagingSettingsDTO, ReminderTemplateRowDTO } from "../api";

type EditableTemplate = {
  key: string;
  phase: string;
  day_min: number;
  day_max: number;
  sort_order: number;
  email_subject: string;
  body: string;
};

const PHASE_OPTIONS: { value: string; label: string }[] = [
  { value: "approaching", label: "Antes del vencimiento (usa rango día_min–día_max)" },
  { value: "due_today", label: "El día del vencimiento" },
  { value: "overdue_first", label: "Primera alerta de mora" },
  { value: "overdue_followup", label: "Seguimiento de mora" },
];

function newRow(): EditableTemplate {
  return {
    key: `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    phase: "approaching",
    day_min: 1,
    day_max: 30,
    sort_order: 0,
    email_subject: "",
    body: "",
  };
}

function dtoToEditable(t: ReminderTemplateRowDTO): EditableTemplate {
  return {
    key: `e-${t.id}`,
    phase: t.phase,
    day_min: t.day_min,
    day_max: t.day_max,
    sort_order: t.sort_order,
    email_subject: t.email_subject ?? "",
    body: t.body ?? "",
  };
}

export default function MessagingSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [transfer, setTransfer] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [rows, setRows] = useState<EditableTemplate[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: MessagingSettingsDTO = await fetchCompanyMessaging();
      setTransfer(data.transfer_instructions ?? "");
      setPaymentUrl(data.payment_url_template ?? "");
      setRows((data.templates ?? []).map(dtoToEditable));
    } catch {
      setError("No se pudo cargar la configuración.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      await saveCompanyMessaging({
        transfer_instructions: transfer,
        payment_url_template: paymentUrl,
        templates: rows
          .filter((r) => r.body.trim() !== "")
          .map((r) => ({
            phase: r.phase,
            day_min: r.phase === "approaching" ? r.day_min : 0,
            day_max: r.phase === "approaching" ? r.day_max : 999,
            sort_order: r.sort_order,
            email_subject: r.email_subject,
            body: r.body,
          })),
      });
      setOk("Cambios guardados.");
      await load();
    } catch {
      setError("No se pudo guardar. Revisa los datos o el API.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-ink-muted">Cargando…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link to="/" className="inline-flex text-sm font-medium text-brand hover:underline">
        ← Volver al inicio
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Mensajes de recordatorio</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Define textos por fase del cobro. Para &quot;antes del vencimiento&quot; puedes tener varias filas con distintos
          rangos de días hasta la fecha de vencimiento (el sistema elige la primera coincidencia por prioridad y
          especificidad).
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      )}
      {ok && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{ok}</div>
      )}

      <section className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-soft sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Datos comunes</h2>
        <p className="mt-1 text-sm text-ink-muted">
          La URL de pago admite sustitución: <code className="text-xs">{"{{charge_id}}"}</code>,{" "}
          <code className="text-xs">{"{{monto_entero}}"}</code>, <code className="text-xs">{"{{client_id}}"}</code>.
        </p>
        <div className="mt-4 space-y-4">
          <label className="block text-sm font-medium text-ink">
            Datos de transferencia (placeholder <code className="text-xs">{"{{datos_transferencia}}"}</code>)
            <textarea
              className="mt-1 min-h-[6rem] w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
              value={transfer}
              onChange={(e) => setTransfer(e.target.value)}
              placeholder="Banco, tipo cuenta, RUT titular, correo comprobante…"
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Plantilla URL pasarela de pago (placeholder <code className="text-xs">{"{{url_pago}}"}</code> en el mensaje)
            <input
              type="url"
              className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
              value={paymentUrl}
              onChange={(e) => setPaymentUrl(e.target.value)}
              placeholder="https://tu-pasarela.com/pagar?cobro={{charge_id}}"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Plantillas por fase</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Placeholders en el cuerpo o asunto: <code className="text-xs">{"{{monto}}"}</code>,{" "}
              <code className="text-xs">{"{{fecha_vencimiento}}"}</code>, <code className="text-xs">{"{{nombre_sucursal}}"}</code>,{" "}
              <code className="text-xs">{"{{empresa}}"}</code>, <code className="text-xs">{"{{datos_transferencia}}"}</code>,{" "}
              <code className="text-xs">{"{{url_pago}}"}</code>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRows((r) => [...r, newRow()])}
            className="rounded-xl border border-surface-border bg-surface-card px-4 py-2 text-sm font-semibold text-ink hover:bg-surface"
          >
            Agregar plantilla
          </button>
        </div>

        <div className="mt-6 space-y-6">
          {rows.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Sin plantillas personalizadas: se usan los textos predeterminados del sistema. Pulsa &quot;Agregar
              plantilla&quot; para empezar.
            </p>
          ) : (
            rows.map((row, idx) => (
              <div key={row.key} className="rounded-xl border border-surface-border bg-surface/40 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Plantilla {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))}
                    className="text-xs font-semibold text-rose-700 hover:underline"
                  >
                    Quitar
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-12">
                  <label className="block text-sm font-medium text-ink sm:col-span-6">
                    Fase
                    <select
                      className="mt-1 w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm"
                      value={row.phase}
                      onChange={(e) => {
                        const v = e.target.value;
                        setRows((r) =>
                          r.map((x) =>
                            x.key === row.key
                              ? {
                                  ...x,
                                  phase: v,
                                  day_min: v === "approaching" ? x.day_min : 0,
                                  day_max: v === "approaching" ? x.day_max : 999,
                                }
                              : x,
                          ),
                        );
                      }}
                    >
                      {PHASE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-ink sm:col-span-2">
                    Prioridad (sort_order)
                    <input
                      type="number"
                      className="mt-1 w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm"
                      value={row.sort_order}
                      onChange={(e) =>
                        setRows((r) =>
                          r.map((x) => (x.key === row.key ? { ...x, sort_order: Number(e.target.value) || 0 } : x)),
                        )
                      }
                    />
                  </label>
                  {row.phase === "approaching" ? (
                    <>
                      <label className="block text-sm font-medium text-ink sm:col-span-2">
                        Día min
                        <input
                          type="number"
                          min={0}
                          className="mt-1 w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm"
                          value={row.day_min}
                          onChange={(e) =>
                            setRows((r) =>
                              r.map((x) => (x.key === row.key ? { ...x, day_min: Number(e.target.value) || 0 } : x)),
                            )
                          }
                        />
                      </label>
                      <label className="block text-sm font-medium text-ink sm:col-span-2">
                        Día max
                        <input
                          type="number"
                          min={0}
                          className="mt-1 w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm"
                          value={row.day_max}
                          onChange={(e) =>
                            setRows((r) =>
                              r.map((x) => (x.key === row.key ? { ...x, day_max: Number(e.target.value) || 0 } : x)),
                            )
                          }
                        />
                      </label>
                    </>
                  ) : (
                    <p className="text-xs text-ink-muted sm:col-span-4 sm:self-end">
                      Día min/max solo aplican a la fase &quot;antes del vencimiento&quot;.
                    </p>
                  )}
                  <label className="block text-sm font-medium text-ink sm:col-span-12">
                    Asunto email (opcional; si queda vacío se usa el predeterminado del sistema)
                    <input
                      type="text"
                      className="mt-1 w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm"
                      value={row.email_subject}
                      onChange={(e) =>
                        setRows((r) => r.map((x) => (x.key === row.key ? { ...x, email_subject: e.target.value } : x)))
                      }
                    />
                  </label>
                  <label className="block text-sm font-medium text-ink sm:col-span-12">
                    Cuerpo (email y WhatsApp)
                    <textarea
                      className="mt-1 min-h-[10rem] w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm font-mono"
                      value={row.body}
                      onChange={(e) =>
                        setRows((r) => r.map((x) => (x.key === row.key ? { ...x, body: e.target.value } : x)))
                      }
                      placeholder={`Hola 👋\n\nTe recordamos que tienes un cobro próximo a vencer:\n\n💰 Monto: {{monto}}\n📅 Vence el {{fecha_vencimiento}}\n\nPagar aquí: {{url_pago}}\n\n{{datos_transferencia}}\n\n— {{empresa}}`}
                    />
                  </label>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <form onSubmit={onSave} className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar configuración"}
        </button>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl border border-surface-border bg-surface-card px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface"
        >
          Recargar
        </button>
      </form>
    </div>
  );
}
