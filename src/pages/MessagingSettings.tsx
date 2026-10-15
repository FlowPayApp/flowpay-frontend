import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BellRing,
  CalendarCheck,
  CalendarClock,
  ChevronDown,
  CircleAlert,
  Landmark,
  Lock,
  Mail,
  MessageCircle,
  MessageSquareText,
  Pencil,
  Plus,
  Repeat,
  RotateCcw,
} from "lucide-react";
import { useMinLoading } from "../lib/useMinLoading";
import { fetchCompanyMessaging, saveCompanyMessaging } from "../api";
import type { MessagingPhaseDefaults, MessagingSettingsDTO, ReminderPolicy, ReminderTemplateRowDTO } from "../api";
import PageLoading from "../components/PageLoading";
import ReminderPolicyFields from "../components/ReminderPolicyFields";
import { useToast } from "../components/Toast";
import { DEFAULT_REMINDER_POLICY, describeReminderPolicy } from "../lib/reminderPolicy";

type Phase = "approaching" | "due_today" | "overdue_first" | "overdue_followup";

type EmailText = { subject: string; body: string; custom: boolean };

type Emails = Record<Phase, EmailText>;

const MOMENTS: { phase: Phase; title: string; icon: LucideIcon }[] = [
  { phase: "approaching", title: "Antes de vencer", icon: CalendarClock },
  { phase: "due_today", title: "El día que vence", icon: CalendarCheck },
  { phase: "overdue_first", title: "Recién vencido", icon: CircleAlert },
  { phase: "overdue_followup", title: "Seguimiento", icon: Repeat },
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

const URL_SAMPLE: Record<string, string> = {
  "{{charge_id}}": "28",
  "{{monto_entero}}": "150000",
  "{{client_id}}": "12",
};

const FIELD_MARK = "\u2060";
const CHIP_CLASS =
  "mx-0.5 inline-flex items-center rounded-md bg-brand-soft px-1.5 py-0.5 align-baseline text-xs font-semibold text-brand";
const INPUT_CLASS =
  "w-full rounded-xl border border-surface-border bg-[rgb(var(--color-field))] px-3 py-2.5 text-sm text-ink outline-none focus:border-brand/50";

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
    <div>
      <div className="relative">
        {value.trim() === "" && (
          <span className="pointer-events-none absolute left-3 top-2.5 text-sm text-ink-muted">{placeholder}</span>
        )}
        <div
          ref={ref}
          role="textbox"
          aria-multiline={multiline}
          contentEditable
          suppressContentEditableWarning
          className={[
            "w-full whitespace-pre-wrap rounded-xl border border-surface-border bg-[rgb(var(--color-field))] px-3 py-2.5 text-sm leading-6 text-ink outline-none focus:border-brand/50",
            multiline ? "min-h-[7rem]" : "min-h-11",
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
      {withInserts && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {MESSAGE_FIELDS.map((field) => (
            <button
              key={field.token}
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-full border border-dashed border-surface-border px-2.5 text-xs font-medium text-ink-muted transition-colors hover:border-brand/40 hover:bg-brand-soft hover:text-brand"
              onMouseDown={(event) => {
                event.preventDefault();
                insert(field.token);
              }}
            >
              <Plus className="h-3 w-3" strokeWidth={2.5} />
              {field.label}
            </button>
          ))}
        </div>
      )}
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
    <div>
      <input
        ref={ref}
        type="text"
        className={INPUT_CLASS}
        value={visible}
        onChange={(event) => onChange(visibleToTokens(event.target.value, URL_FIELDS))}
        placeholder="https://pago.tuempresa.cl/cobro/"
      />
      <button
        type="button"
        className="mt-2 inline-flex h-8 items-center gap-1 rounded-full border border-dashed border-surface-border px-2.5 text-xs font-medium text-ink-muted transition-colors hover:border-brand/40 hover:bg-brand-soft hover:text-brand"
        onClick={insertChargeNumber}
      >
        <Plus className="h-3 w-3" strokeWidth={2.5} />
        Número del cobro
      </button>
    </div>
  );
}

function emptyEmails(): Emails {
  return {
    approaching: { subject: "", body: "", custom: false },
    due_today: { subject: "", body: "", custom: false },
    overdue_first: { subject: "", body: "", custom: false },
    overdue_followup: { subject: "", body: "", custom: false },
  };
}

/** Un correo por momento: si había varios para la misma fase, gana el de menor orden (el que se enviaba). */
function emailsFromTemplates(templates: ReminderTemplateRowDTO[]): Emails {
  const out = emptyEmails();
  for (const t of [...templates].sort((a, b) => a.sort_order - b.sort_order)) {
    const slot = out[t.phase as Phase];
    if (!slot || slot.custom || !(t.body ?? "").trim()) continue;
    out[t.phase as Phase] = { subject: t.email_subject ?? "", body: t.body, custom: true };
  }
  return out;
}

function snapshot(transfer: string, paymentUrl: string, policy: ReminderPolicy, emails: Emails) {
  return JSON.stringify({
    transfer,
    paymentUrl,
    policy: { ...policy, days_before: [...policy.days_before].sort((a, b) => a - b) },
    emails: MOMENTS.map(({ phase }) =>
      emails[phase].body.trim() ? [emails[phase].subject, emails[phase].body] : null,
    ),
  });
}

function preview(text: string, transfer: string, paymentUrl: string) {
  const link = URL_FIELDS.reduce((url, field) => url.replaceAll(field.token, URL_SAMPLE[field.token]), paymentUrl.trim());
  const sample: Record<string, string> = {
    "{{monto}}": "$150.000",
    "{{fecha_vencimiento}}": "9 oct 2026",
    "{{nombre_sucursal}}": "Sucursal Centro",
    "{{empresa}}": "Tu empresa",
    "{{datos_transferencia}}": transfer.trim() || "[datos de transferencia]",
    "{{url_pago}}": link || "[enlace de pago]",
  };
  return MESSAGE_FIELDS.reduce((out, field) => out.replaceAll(field.token, sample[field.token]), text);
}

function Section({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-soft">
      <header className="flex items-center gap-3 border-b border-surface-border px-4 py-4 sm:px-6">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {hint ? <p className="text-sm leading-snug text-ink-muted">{hint}</p> : null}
        </div>
      </header>
      <div className="px-4 py-5 sm:px-6">{children}</div>
    </section>
  );
}

function ChannelHeading({ icon: Icon, label, aside }: { icon: LucideIcon; label: string; aside?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        {label}
      </p>
      {aside}
    </div>
  );
}

function MomentCard({
  title,
  icon: Icon,
  open,
  email,
  defaults,
  transfer,
  paymentUrl,
  onToggle,
  onChange,
}: {
  title: string;
  icon: LucideIcon;
  open: boolean;
  email: EmailText;
  defaults?: MessagingPhaseDefaults;
  transfer: string;
  paymentUrl: string;
  onToggle: () => void;
  onChange: (next: EmailText) => void;
}) {
  const custom = email.custom;

  return (
    <li className={`rounded-xl border transition-colors ${open ? "border-brand/30 bg-surface-card" : "border-surface-border bg-surface/40"}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface text-ink-muted">
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{title}</p>
          <p className={`mt-0.5 text-xs ${custom ? "font-medium text-brand" : "text-ink-muted"}`}>
            {custom ? "Correo personalizado" : "Correo predeterminado"}
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2} />
      </button>

      {open && (
        <div className="space-y-6 border-t border-surface-border px-4 py-4">
          <div>
            <ChannelHeading
              icon={MessageCircle}
              label="WhatsApp"
              aside={
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-muted">
                  <Lock className="h-3 w-3" strokeWidth={2} />
                  Plantilla aprobada
                </span>
              }
            />
            <div className="rounded-xl bg-surface p-3">
              {defaults?.whatsapp ? (
                <div className="max-w-[90%] whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm bg-surface-card px-3 py-2 text-sm text-ink shadow-sm">
                  {defaults.whatsapp}
                </div>
              ) : (
                <p className="text-sm text-ink-muted">Se envía la plantilla aprobada de este momento.</p>
              )}
            </div>
          </div>

          <div className="border-t border-surface-border pt-5">
            <ChannelHeading
              icon={Mail}
              label="Correo"
              aside={
                custom ? (
                  <button
                    type="button"
                    onClick={() => onChange({ subject: "", body: "", custom: false })}
                    className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-ink-muted hover:bg-surface hover:text-ink"
                  >
                    <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
                    Usar predeterminado
                  </button>
                ) : null
              }
            />

            {custom ? (
              <>
                <div className="space-y-2">
                  <MessageEditor
                    value={email.subject}
                    multiline={false}
                    withInserts={false}
                    placeholder={defaults?.email_subject || "Asunto del correo"}
                    onChange={(subject) => onChange({ ...email, subject })}
                  />
                  <MessageEditor
                    value={email.body}
                    placeholder="Hola, te recordamos tu pago de…"
                    onChange={(body) => onChange({ ...email, body })}
                  />
                </div>
                {email.body.trim() !== "" && (
                  <div className="mt-4 rounded-xl bg-surface p-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Así lo verá tu cliente</p>
                    <div className="rounded-lg bg-surface-card px-3 py-2.5 text-sm text-ink shadow-sm">
                      <p className="mb-1.5 border-b border-surface-border pb-1.5 font-semibold">
                        {email.subject.trim() ? preview(email.subject, transfer, paymentUrl) : defaults?.email_subject}
                      </p>
                      <p className="whitespace-pre-wrap break-words">{preview(email.body, transfer, paymentUrl)}</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="rounded-xl bg-surface p-3">
                  {defaults ? (
                    <div className="rounded-lg bg-surface-card px-3 py-2.5 text-sm text-ink shadow-sm">
                      <p className="mb-1.5 border-b border-surface-border pb-1.5 font-semibold">{defaults.email_subject}</p>
                      <p className="whitespace-pre-wrap break-words">{defaults.email_body}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-ink-muted">Se envía el correo predeterminado.</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ ...email, custom: true })}
                  className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-lg border border-surface-border bg-surface-card px-3 text-sm font-semibold text-ink hover:bg-surface"
                >
                  <Pencil className="h-4 w-4" strokeWidth={2} />
                  Escribir mi correo
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

export default function MessagingSettings() {
  const [loadingRaw, setLoading] = useState(true);
  const loading = useMinLoading(loadingRaw);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const [transfer, setTransfer] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [emails, setEmails] = useState<Emails>(emptyEmails);
  const [defaults, setDefaults] = useState<Record<string, MessagingPhaseDefaults>>({});
  const [policy, setPolicy] = useState<ReminderPolicy>(DEFAULT_REMINDER_POLICY);
  const [sendTime, setSendTime] = useState("");
  const [openPhase, setOpenPhase] = useState<Phase | null>(null);
  const [baseline, setBaseline] = useState<string | null>(null);

  const loaded = useRef<MessagingSettingsDTO | null>(null);

  const apply = useCallback((data: MessagingSettingsDTO) => {
    const nextTransfer = data.transfer_instructions ?? "";
    const nextUrl = data.payment_url_template ?? "";
    const nextPolicy = data.reminder_policy ?? DEFAULT_REMINDER_POLICY;
    const nextEmails = emailsFromTemplates(data.templates ?? []);
    setTransfer(nextTransfer);
    setPaymentUrl(nextUrl);
    setPolicy(nextPolicy);
    setSendTime(data.send_time ?? "");
    setEmails(nextEmails);
    setDefaults(data.defaults ?? {});
    setBaseline(snapshot(nextTransfer, nextUrl, nextPolicy, nextEmails));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCompanyMessaging();
      loaded.current = data;
      apply(data);
    } catch {
      setError("No se pudo cargar la configuración.");
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    void load();
  }, [load]);

  const current = useMemo(() => snapshot(transfer, paymentUrl, policy, emails), [transfer, paymentUrl, policy, emails]);
  const dirty = baseline !== null && current !== baseline;

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      await saveCompanyMessaging({
        transfer_instructions: transfer,
        payment_url_template: paymentUrl,
        templates: MOMENTS.filter(({ phase }) => emails[phase].body.trim() !== "").map(({ phase }) => ({
          phase,
          day_min: 0,
          day_max: 999,
          sort_order: 0,
          email_subject: emails[phase].subject,
          body: emails[phase].body,
          whatsapp_body: "",
        })),
        reminder_policy: policy,
      });
      toast.success("Cambios guardados.");
      await load();
    } catch {
      toast.error("No se pudieron guardar los cambios. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <PageLoading />;
  }

  return (
    <div className={`mx-auto max-w-3xl space-y-6 ${dirty ? "pb-16 lg:pb-0" : ""}`}>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Configuración</h1>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</div>
      )}

      <Section
        icon={BellRing}
        title="Cuándo avisar"
        hint={sendTime ? `Los recordatorios salen a las ${sendTime}` : undefined}
      >
        <ReminderPolicyFields value={policy} onChange={setPolicy} />
        <p className="mt-5 flex items-start gap-2 rounded-xl bg-surface px-3 py-2.5 text-sm text-ink">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={2} />
          {describeReminderPolicy(policy)}
        </p>
      </Section>

      <Section icon={MessageSquareText} title="Qué decir" hint="WhatsApp usa plantillas aprobadas. El correo lo puedes escribir tú.">
        <ul className="space-y-3">
          {MOMENTS.map((moment) => (
            <MomentCard
              key={moment.phase}
              title={moment.title}
              icon={moment.icon}
              open={openPhase === moment.phase}
              email={emails[moment.phase]}
              defaults={defaults[moment.phase]}
              transfer={transfer}
              paymentUrl={paymentUrl}
              onToggle={() => setOpenPhase((p) => (p === moment.phase ? null : moment.phase))}
              onChange={(next) => setEmails((all) => ({ ...all, [moment.phase]: next }))}
            />
          ))}
        </ul>
      </Section>

      <Section icon={Landmark} title="Cómo te pagan" hint="Se pueden insertar en tus correos">
        <div className="space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Datos de transferencia</span>
            <textarea
              className={`${INPUT_CLASS} min-h-[6rem]`}
              value={transfer}
              onChange={(e) => setTransfer(e.target.value)}
              placeholder={"Banco Estado · Cuenta corriente\nN° 123456789 · RUT 76.123.456-7\npagos@tuempresa.cl"}
            />
          </label>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink">Enlace de pago</span>
            <PaymentLinkField value={paymentUrl} onChange={setPaymentUrl} />
          </div>
        </div>
      </Section>

      {dirty && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 lg:sticky lg:inset-x-auto lg:bottom-6">
          <div className="flex items-center justify-between gap-3 border-t border-surface-border bg-surface-card px-4 py-2.5 shadow-[0_-8px_24px_rgba(28,25,23,0.08)] lg:rounded-2xl lg:border lg:py-3 lg:shadow-[0_16px_40px_rgba(28,25,23,0.16)]">
            <p className="text-sm font-medium text-ink">Cambios sin guardar</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => loaded.current && apply(loaded.current)}
                className="h-10 rounded-lg px-3 text-sm font-medium text-ink-muted hover:bg-surface hover:text-ink disabled:opacity-60"
              >
                Descartar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void onSave()}
                className="h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
