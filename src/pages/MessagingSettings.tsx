import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CalendarCheck,
  CalendarClock,
  ChevronDown,
  CircleAlert,
  Lock,
  Mail,
  MessageCircle,
  Pencil,
  Plus,
  Repeat,
  RotateCcw,
} from "lucide-react";
import { useMinLoading } from "../lib/useMinLoading";
import { fetchCompanyMessaging, saveCompanyMessaging } from "../api";
import type { MessagingPhaseDefaults, MessagingSettingsDTO, ReminderPolicy, ReminderTemplateRowDTO } from "../api";
import LoadingIndicator from "../components/LoadingIndicator";
import ReminderPolicyFields from "../components/ReminderPolicyFields";
import SettingsFrame from "../components/SettingsFrame";
import { useToast } from "../components/Toast";
import { useCompanyChannels } from "../lib/companyChannels";
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

const CHIP_CLASS =
  "mx-0.5 inline-flex items-center rounded-md bg-brand-soft px-1.5 py-0.5 align-baseline text-xs font-semibold text-brand";

function fieldLabel(token: string, fields: { token: string; label: string }[]) {
  return fields.find((field) => field.token === token)?.label ?? "Dato";
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

function ChannelHeading({ icon: Icon, label, aside }: { icon: LucideIcon; label: string; aside?: ReactNode }) {
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
  showEmail,
  showWhatsapp,
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
  showEmail: boolean;
  showWhatsapp: boolean;
  onToggle: () => void;
  onChange: (next: EmailText) => void;
}) {
  const custom = email.custom;
  const status = showEmail
    ? custom
      ? "Correo personalizado"
      : "Correo predeterminado"
    : showWhatsapp
      ? "Plantilla de WhatsApp"
      : "Sin medio de aviso";

  return (
    <li className={`rounded-xl border transition-colors ${open ? "border-brand/30 bg-surface-card" : "border-surface-border bg-surface/40"}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface text-ink-muted">
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{title}</p>
          <p className={`mt-0.5 text-xs ${showEmail && custom ? "font-medium text-brand" : "text-ink-muted"}`}>
            {status}
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2} />
      </button>

      {open && (showWhatsapp || showEmail) && (
        <div className="space-y-6 border-t border-surface-border px-4 py-4">
          {showWhatsapp ? (
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
          ) : null}

          {showEmail ? (
          <div className={showWhatsapp ? "border-t border-surface-border pt-5" : ""}>
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
          ) : null}
        </div>
      )}
    </li>
  );
}

type MessagingFormValue = {
  loading: boolean;
  error: string | null;
  saving: boolean;
  dirty: boolean;
  transfer: string;
  setTransfer: (value: string) => void;
  paymentUrl: string;
  emails: Emails;
  setEmails: Dispatch<SetStateAction<Emails>>;
  defaults: Record<string, MessagingPhaseDefaults>;
  policy: ReminderPolicy;
  setPolicy: (value: ReminderPolicy) => void;
  sendTime: string;
  discard: () => void;
  save: () => void;
  saveTransferInstructions: (value: string) => Promise<void>;
};

const MessagingFormContext = createContext<MessagingFormValue | null>(null);

export function useMessagingForm() {
  const value = useContext(MessagingFormContext);
  if (!value) throw new Error("La configuración no está disponible.");
  return value;
}

export function MessagingFormProvider({ children }: { children: ReactNode }) {
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

  const discard = useCallback(() => {
    if (loaded.current) apply(loaded.current);
  }, [apply]);

  const save = useCallback(() => {
    void (async () => {
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
    })();
  }, [emails, load, paymentUrl, policy, toast, transfer]);

  const saveTransferInstructions = useCallback(async (value: string) => {
    const base = loaded.current;
    if (!base) throw new Error("La configuración no está lista.");
    const next = value.trim();
    await saveCompanyMessaging({
      transfer_instructions: next,
      payment_url_template: base.payment_url_template ?? "",
      templates: (base.templates ?? []).map((row) => ({
        phase: row.phase,
        day_min: row.day_min,
        day_max: row.day_max,
        sort_order: row.sort_order,
        email_subject: row.email_subject ?? "",
        body: row.body ?? "",
        whatsapp_body: row.whatsapp_body ?? "",
      })),
      reminder_policy: base.reminder_policy,
    });
    loaded.current = { ...base, transfer_instructions: next };
    setTransfer(next);
    setBaseline((prev) => {
      if (!prev) return snapshot(next, paymentUrl, policy, emails);
      try {
        const parsed = JSON.parse(prev) as { transfer: string };
        parsed.transfer = next;
        return JSON.stringify(parsed);
      } catch {
        return snapshot(next, paymentUrl, policy, emails);
      }
    });
  }, [emails, paymentUrl, policy]);

  const value = useMemo<MessagingFormValue>(
    () => ({
      loading,
      error,
      saving,
      dirty,
      transfer,
      setTransfer,
      paymentUrl,
      emails,
      setEmails,
      defaults,
      policy,
      setPolicy,
      sendTime,
      discard,
      save,
      saveTransferInstructions,
    }),
    [loading, error, saving, dirty, transfer, paymentUrl, emails, defaults, policy, sendTime, discard, save, saveTransferInstructions],
  );

  return <MessagingFormContext.Provider value={value}>{children}</MessagingFormContext.Provider>;
}

function MessagingGate({ children }: { children: ReactNode }) {
  const { loading, error } = useMessagingForm();
  if (loading) {
    return (
      <div className="flex min-h-48 items-center justify-center" role="status" aria-live="polite">
        <LoadingIndicator />
      </div>
    );
  }
  if (error) {
    return <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</div>;
  }
  return children;
}

export function WhenPanel() {
  const { sendTime } = useMessagingForm();
  return (
    <SettingsFrame
      title="Cuándo avisar"
      hint={sendTime ? `Los recordatorios salen a las ${sendTime}.` : "Frecuencia con la que se avisa al cliente."}
    >
      <MessagingGate>
        <WhenFields />
      </MessagingGate>
    </SettingsFrame>
  );
}

function WhenFields() {
  const { policy, setPolicy } = useMessagingForm();
  return (
    <div>
      <ReminderPolicyFields value={policy} onChange={setPolicy} />
      <p className="mt-5 flex items-start gap-2 rounded-xl bg-surface px-3 py-2.5 text-sm text-ink">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={2} />
        {describeReminderPolicy(policy)}
      </p>
    </div>
  );
}

export function WhatPanel() {
  const channels = useCompanyChannels();
  const hint = channels.email && channels.whatsapp
    ? "WhatsApp usa plantillas aprobadas. El correo lo puedes escribir tú."
    : channels.whatsapp
      ? "WhatsApp usa plantillas aprobadas."
      : channels.email
        ? "El correo lo puedes escribir tú."
        : "Esta empresa todavía no tiene un medio de aviso asignado.";
  return (
    <SettingsFrame title="Qué decir" hint={hint}>
      <MessagingGate>
        <WhatFields />
      </MessagingGate>
    </SettingsFrame>
  );
}

function WhatFields() {
  const { emails, setEmails, defaults, transfer, paymentUrl } = useMessagingForm();
  const channels = useCompanyChannels();
  const [openPhase, setOpenPhase] = useState<Phase | null>(null);
  if (channels.ready && !channels.email && !channels.whatsapp) return null;
  return (
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
          showEmail={channels.email}
          showWhatsapp={channels.whatsapp}
          onToggle={() => setOpenPhase((current) => (current === moment.phase ? null : moment.phase))}
          onChange={(next) => setEmails((all) => ({ ...all, [moment.phase]: next }))}
        />
      ))}
    </ul>
  );
}
