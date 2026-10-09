import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDown,
  ArrowUp,
  BellRing,
  CalendarClock,
  ChevronDown,
  Landmark,
  Mail,
  MessageCircle,
  MessageSquareText,
  Plus,
  Trash2,
} from "lucide-react";
import { useMinLoading } from "../lib/useMinLoading";
import { fetchCompanyMessaging, saveCompanyMessaging } from "../api";
import type { MessagingSettingsDTO, ReminderPolicy, ReminderTemplateRowDTO } from "../api";
import PageLoading from "../components/PageLoading";
import ReminderPolicyFields from "../components/ReminderPolicyFields";
import { useToast } from "../components/Toast";
import { DEFAULT_REMINDER_POLICY, describeReminderPolicy } from "../lib/reminderPolicy";

type EditableTemplate = {
  key: string;
  phase: string;
  day_min: number;
  day_max: number;
  email_subject: string;
  body: string;
  whatsapp_body: string;
};

type Channel = "whatsapp" | "email";

const PHASE_OPTIONS: { value: string; label: string }[] = [
  { value: "approaching", label: "Antes de vencer" },
  { value: "due_today", label: "Día que vence" },
  { value: "overdue_first", label: "Recién vencido" },
  { value: "overdue_followup", label: "Seguimiento vencido" },
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

function newRow(): EditableTemplate {
  return {
    key: `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    phase: "approaching",
    day_min: 1,
    day_max: 3,
    email_subject: "",
    body: "",
    whatsapp_body: "",
  };
}

function dtoToEditable(t: ReminderTemplateRowDTO): EditableTemplate {
  return {
    key: `e-${t.id ?? Math.random().toString(36).slice(2, 9)}`,
    phase: t.phase,
    day_min: t.day_min,
    day_max: t.day_max,
    email_subject: t.email_subject ?? "",
    body: t.body ?? "",
    whatsapp_body: t.whatsapp_body ?? "",
  };
}

function whenLabel(row: EditableTemplate) {
  if (row.phase === "approaching") {
    const lo = Math.min(row.day_min, row.day_max);
    const hi = Math.max(row.day_min, row.day_max);
    if (lo === hi) return lo === 1 ? "1 día antes de vencer" : `${lo} días antes de vencer`;
    return `Entre ${lo} y ${hi} días antes de vencer`;
  }
  if (row.phase === "due_today") return "El día que vence";
  if (row.phase === "overdue_first") return "Primer aviso después de vencer";
  return "Seguimiento de cobro vencido";
}

function snapshot(transfer: string, paymentUrl: string, policy: ReminderPolicy, rows: EditableTemplate[]) {
  return JSON.stringify({
    transfer,
    paymentUrl,
    policy: { ...policy, days_before: [...policy.days_before].sort((a, b) => a - b) },
    rows: rows.map(({ key: _key, ...row }) => row),
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
  aside,
  children,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  aside?: React.ReactNode;
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
        {aside}
      </header>
      <div className="px-4 py-5 sm:px-6">{children}</div>
    </section>
  );
}

function ChannelTag({ icon: Icon, label, filled }: { icon: LucideIcon; label: string; filled: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        filled ? "border border-transparent bg-brand-soft text-brand" : "border border-dashed border-surface-border text-ink-muted"
      }`}
    >
      <Icon className="h-3 w-3" strokeWidth={2} />
      {label}
    </span>
  );
}

function ChannelHeading({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted sm:hidden">
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      {label}
    </p>
  );
}

function PreviewBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-xl bg-surface p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Así lo verá tu cliente</p>
      {children}
    </div>
  );
}

function TemplateCard({
  row,
  index,
  total,
  open,
  transfer,
  paymentUrl,
  onToggle,
  onChange,
  onMove,
  onRemove,
}: {
  row: EditableTemplate;
  index: number;
  total: number;
  open: boolean;
  transfer: string;
  paymentUrl: string;
  onToggle: () => void;
  onChange: (patch: Partial<EditableTemplate>) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}) {
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const hasWa = row.whatsapp_body.trim() !== "";
  const hasMail = row.body.trim() !== "";

  return (
    <li className={`rounded-xl border transition-colors ${open ? "border-brand/30 bg-surface-card" : "border-surface-border bg-surface/40"}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface text-xs font-semibold tabular-nums text-ink-muted">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{whenLabel(row)}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <ChannelTag icon={MessageCircle} label="WhatsApp" filled={hasWa} />
            <ChannelTag icon={Mail} label="Correo" filled={hasMail} />
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2} />
      </button>

      {open && (
        <div className="space-y-5 border-t border-surface-border px-4 py-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Cuándo</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Cuándo">
              {PHASE_OPTIONS.map((option) => {
                const on = row.phase === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() =>
                      onChange({
                        phase: option.value,
                        day_min: option.value === "approaching" ? (row.phase === "approaching" ? row.day_min : 1) : 0,
                        day_max: option.value === "approaching" ? (row.phase === "approaching" ? row.day_max : 3) : 999,
                      })
                    }
                    className={`flex h-11 items-center gap-2 rounded-xl border px-3 text-left text-sm font-medium transition-colors ${
                      on ? "border-brand bg-brand-soft text-brand" : "border-surface-border bg-surface-card text-ink hover:bg-surface"
                    }`}
                  >
                    <span
                      className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                        on ? "border-brand" : "border-ink-muted/40"
                      }`}
                      aria-hidden
                    >
                      {on && <span className="h-2 w-2 rounded-full bg-brand" />}
                    </span>
                    <span className="leading-tight">{option.label}</span>
                  </button>
                );
              })}
            </div>
            {row.phase === "approaching" && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink">
                Entre
                <input
                  type="number"
                  min={0}
                  aria-label="Desde"
                  className="h-9 w-16 rounded-lg border border-surface-border bg-[rgb(var(--color-field))] px-2 text-center text-sm tabular-nums"
                  value={row.day_min}
                  onChange={(e) => onChange({ day_min: Math.max(0, Number(e.target.value) || 0) })}
                />
                y
                <input
                  type="number"
                  min={0}
                  aria-label="Hasta"
                  className="h-9 w-16 rounded-lg border border-surface-border bg-[rgb(var(--color-field))] px-2 text-center text-sm tabular-nums"
                  value={row.day_max}
                  onChange={(e) => onChange({ day_max: Math.max(0, Number(e.target.value) || 0) })}
                />
                días antes
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 hidden rounded-lg border border-surface-border bg-surface p-0.5 sm:inline-flex">
              {(
                [
                  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, filled: hasWa },
                  { id: "email", label: "Correo", icon: Mail, filled: hasMail },
                ] as const
              ).map((tab) => {
                const on = channel === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setChannel(tab.id)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors ${
                      on ? "bg-surface-card text-ink shadow-sm" : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                    {tab.label}
                    {tab.filled && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}
                  </button>
                );
              })}
            </div>

            <div className="space-y-6 sm:space-y-0">
              <div className={channel === "whatsapp" ? "" : "sm:hidden"}>
                <ChannelHeading icon={MessageCircle} label="WhatsApp" />
                <MessageEditor
                  value={row.whatsapp_body}
                  placeholder="Hola, te recordamos tu pago de…"
                  onChange={(whatsapp_body) => onChange({ whatsapp_body })}
                />
                {hasWa && (
                  <PreviewBox>
                    <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm bg-surface-card px-3 py-2 text-sm text-ink shadow-sm">
                      {preview(row.whatsapp_body, transfer, paymentUrl)}
                    </div>
                  </PreviewBox>
                )}
              </div>

              <div className={`border-t border-surface-border pt-5 sm:border-0 sm:pt-0 ${channel === "email" ? "" : "sm:hidden"}`}>
                <ChannelHeading icon={Mail} label="Correo" />
                <div className="space-y-2">
                  <MessageEditor
                    value={row.email_subject}
                    multiline={false}
                    withInserts={false}
                    placeholder="Asunto del correo"
                    onChange={(email_subject) => onChange({ email_subject })}
                  />
                  <MessageEditor
                    value={row.body}
                    placeholder="Hola, te recordamos tu pago de…"
                    onChange={(body) => onChange({ body })}
                  />
                </div>
                {hasMail && (
                  <PreviewBox>
                    <div className="rounded-lg bg-surface-card px-3 py-2.5 text-sm text-ink shadow-sm">
                      {row.email_subject.trim() ? (
                        <p className="mb-1.5 border-b border-surface-border pb-1.5 font-semibold">
                          {preview(row.email_subject, transfer, paymentUrl)}
                        </p>
                      ) : null}
                      <p className="whitespace-pre-wrap break-words">{preview(row.body, transfer, paymentUrl)}</p>
                    </div>
                  </PreviewBox>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-surface-border pt-3">
            <div className="flex gap-1">
              <button
                type="button"
                aria-label="Subir"
                title="Subir (tiene prioridad si coincide con otro)"
                disabled={index === 0}
                onClick={() => onMove(-1)}
                className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                aria-label="Bajar"
                title="Bajar"
                disabled={index === total - 1}
                onClick={() => onMove(1)}
                className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-danger hover:bg-danger-soft"
            >
              <Trash2 className="h-4 w-4" strokeWidth={2} />
              Eliminar
            </button>
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
  const [rows, setRows] = useState<EditableTemplate[]>([]);
  const [policy, setPolicy] = useState<ReminderPolicy>(DEFAULT_REMINDER_POLICY);
  const [sendTime, setSendTime] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<string | null>(null);

  const loaded = useRef<MessagingSettingsDTO | null>(null);

  const apply = useCallback((data: MessagingSettingsDTO) => {
    const nextTransfer = data.transfer_instructions ?? "";
    const nextUrl = data.payment_url_template ?? "";
    const nextPolicy = data.reminder_policy ?? DEFAULT_REMINDER_POLICY;
    const nextRows = [...(data.templates ?? [])].sort((a, b) => a.sort_order - b.sort_order).map(dtoToEditable);
    setTransfer(nextTransfer);
    setPaymentUrl(nextUrl);
    setPolicy(nextPolicy);
    setSendTime(data.send_time ?? "");
    setRows(nextRows);
    setOpenKey(null);
    setBaseline(snapshot(nextTransfer, nextUrl, nextPolicy, nextRows));
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
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    void load();
  }, [load]);

  const current = useMemo(() => snapshot(transfer, paymentUrl, policy, rows), [transfer, paymentUrl, policy, rows]);
  const dirty = baseline !== null && current !== baseline;

  const patchRow = (key: string, patch: Partial<EditableTemplate>) =>
    setRows((list) => list.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const moveRow = (index: number, delta: -1 | 1) =>
    setRows((list) => {
      const target = index + delta;
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const addRow = () => {
    const row = newRow();
    setRows((list) => [...list, row]);
    setOpenKey(row.key);
  };

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      await saveCompanyMessaging({
        transfer_instructions: transfer,
        payment_url_template: paymentUrl,
        templates: rows
          .map((r, index) => ({ r, index }))
          .filter(({ r }) => r.body.trim() !== "" || r.whatsapp_body.trim() !== "")
          .map(({ r, index }) => ({
            phase: r.phase,
            day_min: r.phase === "approaching" ? Math.min(r.day_min, r.day_max) : 0,
            day_max: r.phase === "approaching" ? Math.max(r.day_min, r.day_max) : 999,
            sort_order: index,
            email_subject: r.email_subject,
            body: r.body,
            whatsapp_body: r.whatsapp_body,
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

      <Section
        icon={MessageSquareText}
        title="Qué decir"
        hint="Lo que recibe tu cliente en cada aviso"
        aside={
          rows.length > 0 ? (
            <button
              type="button"
              onClick={addRow}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-surface-border bg-surface-card px-3 text-sm font-semibold text-ink hover:bg-surface"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              <span className="hidden sm:inline">Nuevo mensaje</span>
              <span className="sm:hidden">Nuevo</span>
            </button>
          ) : null
        }
      >
        {rows.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-surface-border px-4 py-8 text-center">
            <MessageSquareText className="h-8 w-8 text-ink-muted" strokeWidth={1.5} />
            <p className="mt-3 text-sm font-medium text-ink">Usando los mensajes predeterminados</p>
            <button
              type="button"
              onClick={addRow}
              className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Escribir mi mensaje
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((row, index) => (
              <TemplateCard
                key={row.key}
                row={row}
                index={index}
                total={rows.length}
                open={openKey === row.key}
                transfer={transfer}
                paymentUrl={paymentUrl}
                onToggle={() => setOpenKey((k) => (k === row.key ? null : row.key))}
                onChange={(patch) => patchRow(row.key, patch)}
                onMove={(delta) => moveRow(index, delta)}
                onRemove={() => setRows((list) => list.filter((x) => x.key !== row.key))}
              />
            ))}
          </ul>
        )}
      </Section>

      <Section icon={Landmark} title="Cómo te pagan" hint="Se insertan en tus mensajes">
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
