import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMinLoading } from "../lib/useMinLoading";
import { fetchCompanyMessaging, saveCompanyMessaging } from "../api";
import type { MessagingSettingsDTO, ReminderTemplateRowDTO } from "../api";
import PageLoading from "../components/PageLoading";
import AppSelect from "../components/AppSelect";
import { useToast } from "../components/Toast";

type EditableTemplate = {
  key: string;
  phase: string;
  day_min: number;
  day_max: number;
  sort_order: number;
  email_subject: string;
  body: string;
  whatsapp_body: string;
};

const PHASE_OPTIONS: { value: string; label: string }[] = [
  { value: "approaching", label: "Antes del vencimiento" },
  { value: "due_today", label: "Día del vencimiento" },
  { value: "overdue_first", label: "Primera mora" },
  { value: "overdue_followup", label: "Seguimiento" },
];

const MESSAGE_FIELDS: { token: string; label: string }[] = [
  { token: "{{monto}}", label: "Monto" },
  { token: "{{fecha_vencimiento}}", label: "Fecha de vencimiento" },
  { token: "{{nombre_sucursal}}", label: "Sucursal" },
  { token: "{{empresa}}", label: "Empresa" },
  { token: "{{datos_transferencia}}", label: "Datos de transferencia" },
  { token: "{{url_pago}}", label: "Enlace de pago" },
];

const URL_FIELDS: { token: string; label: string }[] = [
  { token: "{{charge_id}}", label: "número del cobro" },
  { token: "{{monto_entero}}", label: "monto" },
  { token: "{{client_id}}", label: "cliente" },
];

const FIELD_MARK = "\u2060";
const CHIP_CLASS =
  "mx-0.5 inline-flex items-center rounded-md bg-brand-soft px-1.5 py-0.5 align-baseline text-xs font-semibold text-brand";

function fieldLabel(token: string, fields: { token: string; label: string }[]) {
  return fields.find((field) => field.token === token)?.label ?? "Dato";
}

function markedLabel(label: string) {
  return `${FIELD_MARK}${label}${FIELD_MARK}`;
}

function tokensToVisible(value: string, fields: { token: string; label: string }[]) {
  return fields.reduce((text, field) => text.replaceAll(field.token, markedLabel(field.label)), value);
}

function visibleToTokens(value: string, fields: { token: string; label: string }[]) {
  return fields.reduce((text, field) => text.replaceAll(markedLabel(field.label), field.token), value);
}

function fillEditor(el: HTMLElement, stored: string) {
  el.replaceChildren();
  const re = /\{\{[a-z0-9_]+\}\}/g;
  let last = 0;
  const appendText = (text: string) => {
    const parts = text.split("\n");
    parts.forEach((part, index) => {
      if (part) el.appendChild(document.createTextNode(part));
      if (index < parts.length - 1) el.appendChild(document.createElement("br"));
    });
  };
  for (const match of stored.matchAll(re)) {
    const index = match.index ?? 0;
    appendText(stored.slice(last, index));
    const span = document.createElement("span");
    span.dataset.token = match[0];
    span.contentEditable = "false";
    span.className = CHIP_CLASS;
    span.textContent = fieldLabel(match[0], MESSAGE_FIELDS);
    el.appendChild(span);
    last = index + match[0].length;
  }
  appendText(stored.slice(last));
}

function readEditor(el: HTMLElement) {
  let out = "";
  const walk = (node: Node, isRoot: boolean) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? "";
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as HTMLElement;
    if (element.dataset.token) {
      out += element.dataset.token;
      return;
    }
    if (element.tagName === "BR") {
      out += "\n";
      return;
    }
    const block = !isRoot && (element.tagName === "DIV" || element.tagName === "P");
    if (block && out.length > 0 && !out.endsWith("\n")) out += "\n";
    element.childNodes.forEach((child) => walk(child, false));
  };
  el.childNodes.forEach((child) => walk(child, true));
  return out.replace(/\u00a0/g, " ").replace(/\n+$/, "");
}

function MessageEditor({
  value,
  onChange,
  placeholder,
  multiline = true,
  withInserts = true,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  multiline?: boolean;
  withInserts?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || lastEmitted.current === value) return;
    fillEditor(el, value);
    lastEmitted.current = value;
  }, [value]);

  function emit() {
    const el = ref.current;
    if (!el) return;
    const next = readEditor(el);
    lastEmitted.current = next;
    onChange(next);
  }

  function insert(token: string) {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const span = document.createElement("span");
    span.dataset.token = token;
    span.contentEditable = "false";
    span.className = CHIP_CLASS;
    span.textContent = fieldLabel(token, MESSAGE_FIELDS);
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && el.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(span);
      range.setStartAfter(span);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      el.appendChild(span);
    }
    emit();
  }

  return (
    <div className="mt-1">
      {withInserts && (
        <div className="mb-2 flex flex-wrap gap-2">
          {MESSAGE_FIELDS.map((field) => (
            <button
              key={field.token}
              type="button"
              className="h-9 rounded-full border border-surface-border bg-surface-card px-3 text-xs font-semibold text-ink hover:bg-surface"
              onMouseDown={(event) => {
                event.preventDefault();
                insert(field.token);
              }}
            >
              {field.label}
            </button>
          ))}
        </div>
      )}
      <div className="relative">
        {value.trim() === "" && (
          <span className="pointer-events-none absolute left-3 top-2 text-sm text-ink-muted">{placeholder}</span>
        )}
        <div
          ref={ref}
          role="textbox"
          aria-multiline={multiline}
          contentEditable
          suppressContentEditableWarning
          className={[
            "w-full whitespace-pre-wrap rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            multiline ? "min-h-[6rem]" : "min-h-11",
          ].join(" ")}
          onInput={emit}
          onKeyDown={(event) => {
            if (!multiline && event.key === "Enter") event.preventDefault();
          }}
          onPaste={(event) => {
            event.preventDefault();
            const text = event.clipboardData.getData("text/plain");
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const node = document.createTextNode(text);
            range.insertNode(node);
            range.setStartAfter(node);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            emit();
          }}
        />
      </div>
    </div>
  );
}

function PaymentLinkField({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const visible = tokensToVisible(value, URL_FIELDS);

  function insertChargeNumber() {
    const input = ref.current;
    const label = markedLabel("número del cobro");
    if (!input) {
      onChange(visibleToTokens(visible + label, URL_FIELDS));
      return;
    }
    const start = input.selectionStart ?? visible.length;
    const end = input.selectionEnd ?? start;
    const next = visible.slice(0, start) + label + visible.slice(end);
    onChange(visibleToTokens(next, URL_FIELDS));
    requestAnimationFrame(() => {
      const caret = start + label.length;
      input.focus();
      input.setSelectionRange(caret, caret);
    });
  }

  return (
    <div className="mt-1">
      <input
        ref={ref}
        type="text"
        className="w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
        value={visible}
        onChange={(event) => onChange(visibleToTokens(event.target.value, URL_FIELDS))}
        placeholder="https://pago.ejemplo/cobro/123"
      />
      <button
        type="button"
        className="mt-2 h-9 rounded-full border border-surface-border bg-surface-card px-3 text-xs font-semibold text-ink hover:bg-surface"
        onClick={insertChargeNumber}
      >
        Número del cobro
      </button>
    </div>
  );
}

function newRow(): EditableTemplate {
  return {
    key: `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    phase: "approaching",
    day_min: 1,
    day_max: 30,
    sort_order: 0,
    email_subject: "",
    body: "",
    whatsapp_body: "",
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
    whatsapp_body: t.whatsapp_body ?? "",
  };
}

export default function MessagingSettings() {
  const [loadingRaw, setLoading] = useState(true);
  const loading = useMinLoading(loadingRaw);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
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
    try {
      await saveCompanyMessaging({
        transfer_instructions: transfer,
        payment_url_template: paymentUrl,
        templates: rows
          .filter((r) => r.body.trim() !== "" || r.whatsapp_body.trim() !== "")
          .map((r) => ({
            phase: r.phase,
            day_min: r.phase === "approaching" ? r.day_min : 0,
            day_max: r.phase === "approaching" ? r.day_max : 999,
            sort_order: r.sort_order,
            email_subject: r.email_subject,
            body: r.body,
            whatsapp_body: r.whatsapp_body,
          })),
      });
      toast.success("Mensajes guardados.");
      await load();
    } catch {
      toast.error("No se pudieron guardar los mensajes. Revisa los datos e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <PageLoading />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Configuración</h1>
        <p className="mt-1 text-sm text-ink-muted">Mensajes de recordatorio de cobro.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</div>
      )}
      <section className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-soft sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Pago</h2>
        <div className="mt-4 space-y-4">
          <label className="block text-sm font-medium text-ink">
            Transferencia
            <textarea
              className="mt-1 min-h-[5rem] w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
              value={transfer}
              onChange={(e) => setTransfer(e.target.value)}
              placeholder="Banco, cuenta, RUT"
            />
          </label>
          <div className="block text-sm font-medium text-ink">
            Enlace de pago
            <PaymentLinkField value={paymentUrl} onChange={setPaymentUrl} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">Mensajes</h2>
          <button
            type="button"
            onClick={() => setRows((r) => [...r, newRow()])}
            className="rounded-xl border border-surface-border bg-surface-card px-4 py-2 text-sm font-semibold text-ink hover:bg-surface"
          >
            Agregar
          </button>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          El correo y WhatsApp se escriben por separado. El momento del envío es el mismo.
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          Orden: si dos mensajes aplican a la vez, se envía el de número más bajo.
        </p>

        <div className="mt-6 space-y-6">
          {rows.length === 0 ? (
            <p className="text-sm text-ink-muted">Sin mensajes propios. Se usan los del sistema.</p>
          ) : (
            rows.map((row, idx) => (
              <div key={row.key} className="rounded-xl border border-surface-border bg-surface/40 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">Mensaje {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))}
                    className="text-xs font-semibold text-danger hover:underline"
                  >
                    Quitar
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-12">
                  <label className="block text-sm font-medium text-ink sm:col-span-6">
                    Cuándo se envía
                    <AppSelect
                      value={row.phase}
                      onChange={(v) => {
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
                      options={PHASE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                    />
                  </label>
                  <label className="block text-sm font-medium text-ink sm:col-span-2">
                    Orden
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
                        Desde (días)
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
                        Hasta (días)
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
                      <p className="text-xs text-ink-muted sm:col-span-12">
                        Se envía cuando faltan entre estos días para el vencimiento.
                      </p>
                    </>
                  ) : null}
                  <div className="space-y-3 rounded-xl border border-surface-border bg-surface-card p-4 sm:col-span-12">
                    <p className="text-sm font-semibold text-ink">Correo</p>
                    <div className="block text-sm font-medium text-ink">
                      Asunto
                      <MessageEditor
                        value={row.email_subject}
                        multiline={false}
                        withInserts={false}
                        placeholder="Opcional"
                        onChange={(email_subject) =>
                          setRows((current) => current.map((item) => (item.key === row.key ? { ...item, email_subject } : item)))
                        }
                      />
                    </div>
                    <div className="block text-sm font-medium text-ink">
                      Texto
                      <MessageEditor
                        value={row.body}
                        placeholder="Escribe el correo"
                        onChange={(body) =>
                          setRows((current) => current.map((item) => (item.key === row.key ? { ...item, body } : item)))
                        }
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border border-surface-border bg-surface-card p-4 sm:col-span-12">
                    <p className="text-sm font-semibold text-ink">WhatsApp</p>
                    <div className="block text-sm font-medium text-ink">
                      Texto
                      <MessageEditor
                        value={row.whatsapp_body}
                        placeholder="Escribe el WhatsApp"
                        onChange={(whatsapp_body) =>
                          setRows((current) =>
                            current.map((item) => (item.key === row.key ? { ...item, whatsapp_body } : item)),
                          )
                        }
                      />
                    </div>
                  </div>
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
          className="rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar"}
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
