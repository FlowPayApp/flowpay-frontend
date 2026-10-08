import axios from "axios";
import { BellRing, Check, CheckCheck, ChevronDown, CircleAlert, CircleCheck, Clock3, FileText, Image as ImageIcon, Mail, Maximize2, Paperclip, SendHorizontal, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMinLoading } from "../lib/useMinLoading";
import { Link, useParams } from "react-router-dom";
import {
  fetchCharge,
  fetchChargeInboundMedia,
  fetchChargeInboundWhatsApp,
  fetchClients,
  fetchReminders,
  markChargeRead,
  patchCharge,
  recordPayment,
  sendChargeWhatsAppFile,
  sendChargeWhatsAppReply,
  sendReminderNow,
  uploadChargeAttachment,
} from "../api";
import type { ChargeDTO, ChargeInboundWhatsApp, ClientDTO, Reminder } from "../api";
import AppModal from "../components/AppModal";
import { notifyInboxChanged } from "../components/InboxProvider";
import { useToast, type ToastNotice } from "../components/Toast";
import InvoicePreview from "../components/InvoicePreview";
import AppDatePicker from "../components/AppDatePicker";
import AppSelect from "../components/AppSelect";
import PageLoading from "../components/PageLoading";
import { StatusBadge } from "../components/Badge";
import { chargeCounterpartyLabel } from "../lib/chargeCounterpartyLabel";
import { formatDate, formatMoney } from "../lib/format";

function normalizeClpInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(Number(digits));
}

function parseClpInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits);
}

function ActionSpinner() {
  return <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />;
}

type TimelineItem =
  | { kind: "reminder"; at: string; id: string; reminder: Reminder }
  | { kind: "reply"; at: string; id: string; reply: ChargeInboundWhatsApp };

function chatClock(iso: string) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

function chatDayLabel(iso: string) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const d = new Date(t);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(new Date()) - start(d)) / 86_400_000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
}

const LIVE_MS = 5000;
const CHAT_FILE_MAX = 5 * 1024 * 1024;
const CHAT_FILE_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const CHAT_FILE_ACCEPT = "image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf";

function fileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/** Devuelve el motivo si el archivo no se puede enviar por WhatsApp. */
function chatFileProblem(file: File) {
  if (!CHAT_FILE_TYPES.includes(file.type)) return "Solo puedes enviar fotos JPG o PNG, o un PDF.";
  if (file.size > CHAT_FILE_MAX) return "El archivo puede pesar hasta 5 MB.";
  return null;
}

function AttachedFile({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImage = file.type.startsWith("image/");
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!isImage) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  return (
    <div className="mb-2 flex items-center gap-3 rounded-xl bg-surface-card px-2.5 py-2 shadow-sm">
      {preview ? (
        <img src={preview} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
      ) : (
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
          {isImage ? <ImageIcon className="h-5 w-5" strokeWidth={2} /> : <FileText className="h-5 w-5" strokeWidth={2} />}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{file.name}</span>
        <span className="block text-xs text-ink-muted">{fileSize(file.size)}</span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Quitar archivo"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-surface hover:text-ink lg:h-9 lg:w-9"
      >
        <X className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}

const COMPOSER_MAX_HEIGHT = 128;

function ReplyComposer({
  id,
  value,
  onChange,
  file,
  onFile,
  onSubmit,
  sending,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  file: File | null;
  onFile: (file: File | null) => void;
  onSubmit: (e: React.FormEvent) => void;
  sending: boolean;
}) {
  const picker = useRef<HTMLInputElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const canSend = !sending && (value.trim() !== "" || !!file);

  useLayoutEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT)}px`;
  }, [value]);

  return (
    <form onSubmit={onSubmit} className="border-t border-surface-border bg-surface-card px-3 py-2.5">
      {file && <AttachedFile file={file} onRemove={() => onFile(null)} />}
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => picker.current?.click()}
          disabled={sending}
          aria-label="Adjuntar foto o PDF"
          title="Adjuntar foto o PDF (hasta 5 MB)"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-60"
        >
          <Paperclip className="h-5 w-5" strokeWidth={2} />
        </button>
        <label className="sr-only" htmlFor={id}>
          Escribe un mensaje
        </label>
        <textarea
          ref={field}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={(e) => {
            const pasted = Array.from(e.clipboardData.files)[0];
            if (pasted) {
              e.preventDefault();
              onFile(pasted);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          rows={1}
          maxLength={1000}
          placeholder={file ? "Agrega un texto (opcional)" : "Escribe un mensaje"}
          className="min-w-0 flex-1 resize-none rounded-[1.375rem] border border-surface-border bg-surface px-4 py-2.5 text-sm leading-5 text-ink outline-none placeholder:text-ink-muted focus:border-brand/50"
        />
        <input
          ref={picker}
          type="file"
          accept={CHAT_FILE_ACCEPT}
          className="hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Enviar"
          title="Enviar"
          className="grid h-11 w-11 shrink-0 place-items-center bg-brand text-white transition-colors hover:bg-brand-hover disabled:bg-surface-border disabled:text-ink-muted !rounded-full !p-0"
        >
          {sending ? <ActionSpinner /> : <SendHorizontal className="h-5 w-5" strokeWidth={2} />}
        </button>
      </div>
    </form>
  );
}

type AttachmentKind = "image" | "audio" | "video" | "pdf" | "file";

function attachmentKind(contentType: string): AttachmentKind {
  const type = contentType.split(";")[0].trim().toLowerCase();
  if (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(type)) return "image";
  if (type.startsWith("audio/")) return "audio";
  if (type.startsWith("video/")) return "video";
  if (type === "application/pdf") return "pdf";
  return "file";
}

function MessageAttachment({
  chargeId,
  messageId,
  index,
  contentType,
  fileName,
}: {
  chargeId: number;
  messageId: number;
  index: number;
  contentType: string;
  fileName?: string;
}) {
  const kind = attachmentKind(contentType);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    let objectUrl = "";
    fetchChargeInboundMedia(chargeId, messageId, index)
      .then((blob) => {
        if (!alive) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [chargeId, messageId, index]);

  if (failed) {
    return <p className="px-1.5 py-1 text-xs text-ink-muted">No se pudo cargar el archivo.</p>;
  }
  if (!url) {
    return (
      <div
        className={`animate-pulse rounded-lg bg-ink/10 ${kind === "image" || kind === "video" ? "h-48 w-64 max-w-full" : "h-14 w-64 max-w-full"}`}
        aria-label="Cargando archivo"
      />
    );
  }
  if (kind === "image") {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block">
        <img src={url} alt="Imagen del mensaje" className="max-h-80 w-full max-w-[18rem] rounded-lg object-cover" />
      </a>
    );
  }
  if (kind === "audio") {
    return <audio controls src={url} className="w-64 max-w-full" />;
  }
  if (kind === "video") {
    return <video controls src={url} className="max-h-80 w-full max-w-[18rem] rounded-lg" />;
  }
  const isPdf = kind === "pdf";
  return (
    <a
      href={url}
      {...(isPdf ? { target: "_blank", rel: "noreferrer" } : { download: fileName || `adjunto-${messageId}-${index + 1}` })}
      className="flex w-64 max-w-full items-center gap-3 rounded-lg bg-ink/5 px-3 py-2.5 transition-colors hover:bg-ink/10"
    >
      <span className="grid h-10 w-9 shrink-0 place-items-center rounded-md bg-danger text-[10px] font-bold text-white">
        {isPdf ? "PDF" : <Paperclip className="h-4 w-4" strokeWidth={2} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{fileName || (isPdf ? "Documento.pdf" : "Archivo adjunto")}</span>
        <span className="block text-xs text-ink-muted">{isPdf ? "Abrir documento" : "Descargar"}</span>
      </span>
    </a>
  );
}

const DELIVERY_ERRORS: Record<string, string> = {
  "63016": "pasaron más de 24 horas desde el último mensaje del cliente",
  "63003": "el número no puede recibir WhatsApp",
  "63024": "el número no puede recibir WhatsApp",
  "63032": "el número no puede recibir WhatsApp",
};

function deliveryFailed(status: string) {
  return status === "failed" || status === "undelivered";
}

function deliveryProblem(code?: string) {
  const reason = code ? DELIVERY_ERRORS[code] : undefined;
  if (reason) return `No se entregó: ${reason}.`;
  return code ? `No se entregó (código ${code}).` : "No se entregó.";
}

/** Vacío o desconocido: se envió antes del seguimiento de entrega; solo se sabe que salió. */
function DeliveryTicks({ status }: { status: string }) {
  const icon = "h-3.5 w-3.5 shrink-0";
  switch (status) {
    case "queued":
    case "accepted":
      return (
        <span title="Enviando" aria-label="Enviando">
          <Clock3 className={`${icon} h-3 w-3`} strokeWidth={2} />
        </span>
      );
    case "delivered":
      return (
        <span title="Entregado" aria-label="Entregado">
          <CheckCheck className={icon} strokeWidth={2} />
        </span>
      );
    case "read":
      return (
        <span title="Leído" aria-label="Leído">
          <CheckCheck className={`${icon} text-sky-500`} strokeWidth={2.25} />
        </span>
      );
    case "failed":
    case "undelivered":
      return (
        <span title="No se entregó" aria-label="No se entregó">
          <CircleAlert className={`${icon} text-danger`} strokeWidth={2} />
        </span>
      );
    default:
      return (
        <span title="Enviado" aria-label="Enviado">
          <Check className={icon} strokeWidth={2} />
        </span>
      );
  }
}

function reminderBody(r: Reminder) {
  const text = r.message?.trim();
  if (text) return text;
  if (r.status === "scheduled") return "Recordatorio programado. Aún no se envía.";
  return "Mensaje sin texto.";
}

function MessageThread({ items, expanded = false }: { items: TimelineItem[]; expanded?: boolean }) {
  const scroller = useRef<HTMLDivElement>(null);
  const ordered = [...items].sort((a, b) => {
    const ta = new Date(a.at).getTime();
    const tb = new Date(b.at).getTime();
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  });
  const lastId = ordered[ordered.length - 1]?.id ?? "";
  const pinned = useRef(true);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    pinned.current = true;
  }, [ordered.length, lastId]);

  const empty = ordered.length === 0;
  useEffect(() => {
    const el = scroller.current;
    const list = el?.firstElementChild;
    if (!el || !list || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (pinned.current) el.scrollTop = el.scrollHeight;
    });
    observer.observe(list);
    return () => observer.disconnect();
  }, [empty]);

  let previousDay = "";

  return (
    <div
      ref={scroller}
      onScroll={(e) => {
        const el = e.currentTarget;
        pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
      }}
      role="log"
      aria-label="Mensajes del cobro"
      className="h-full min-h-0 w-full min-w-0 overflow-y-auto bg-surface px-3 py-4 [overflow-anchor:none] [scrollbar-width:thin] [scrollbar-color:rgba(107,100,92,0.45)_transparent] sm:px-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-surface-border"
    >
      {ordered.length === 0 ? (
        <p className="mx-auto mt-10 w-fit rounded-lg bg-surface-card px-3 py-1.5 text-center text-xs text-ink-muted shadow-sm">
          Aún no hay mensajes en este cobro.
        </p>
      ) : (
        <ol className="flex flex-col gap-1">
          {ordered.map((item, position) => {
            const day = chatDayLabel(item.at);
            const showDay = day !== previousDay;
            previousDay = day;
            const outboundReply = item.kind === "reply" && item.reply.direction === "outbound";
            const outgoing = item.kind === "reminder" || outboundReply;
            const previous = ordered[position - 1];
            const previousOutgoing = previous
              ? previous.kind === "reminder" || (previous.kind === "reply" && previous.reply.direction === "outbound")
              : null;
            const firstInGroup = showDay || previousOutgoing !== outgoing;
            const scheduled = item.kind === "reminder" && item.reminder.status === "scheduled";
            const media = item.kind === "reply" && item.reply.charge_id ? item.reply.media ?? [] : [];
            const text =
              item.kind === "reply"
                ? item.reply.content?.trim() || (media.length > 0 ? "" : "Mensaje sin texto.")
                : reminderBody(item.reminder);
            const clock = chatClock(item.at);
            const delivery = !outgoing
              ? ""
              : item.kind === "reminder"
                ? item.reminder.delivery_status ?? ""
                : item.reply.status;
            const deliveryError = item.kind === "reminder" ? item.reminder.delivery_error : item.kind === "reply" ? item.reply.delivery_error : "";
            const meta = (
              <span className="ml-3 inline-flex translate-y-1 items-center gap-1 whitespace-nowrap align-bottom text-[11px] leading-none text-ink-muted float-right">
                {item.kind === "reminder" ? "Recordatorio · " : ""}
                {clock}
                {outgoing ? <DeliveryTicks status={delivery} /> : null}
              </span>
            );
            return (
              <li key={item.id} className={`min-w-0${firstInGroup ? " mt-2 first:mt-0" : ""}`}>
                {showDay && day ? (
                  <div className="my-2 flex justify-center">
                    <span className="rounded-lg bg-surface-card px-3 py-1 text-xs font-medium text-ink-muted shadow-sm">{day}</span>
                  </div>
                ) : null}
                {scheduled ? (
                  <div className="my-1 flex justify-center">
                    <span className="rounded-lg bg-warn-soft px-3 py-1 text-xs text-warn">
                      WhatsApp programado
                      {clock ? ` · ${clock}` : ""}
                    </span>
                  </div>
                ) : (
                  <div className={`flex ${outgoing ? "justify-end" : "justify-start"}`}>
                    <div
                      className={[
                        "relative min-w-0 rounded-xl shadow-[0_1px_0.5px_rgb(28_25_23/0.13)]",
                        expanded ? "max-w-[min(32rem,75%)]" : "max-w-[85%]",
                        outgoing ? "bg-brand-soft" : "bg-surface-card",
                        firstInGroup ? (outgoing ? "rounded-tr-sm" : "rounded-tl-sm") : "",
                        media.length > 0 ? "p-1" : "px-2.5 py-1.5",
                      ].join(" ")}
                    >
                      {media.length > 0 && item.kind === "reply" ? (
                        <div className="flex flex-col gap-1">
                          {media.map((file, index) => (
                            <MessageAttachment
                              key={index}
                              chargeId={item.reply.charge_id!}
                              messageId={item.reply.id}
                              index={index}
                              contentType={file.content_type}
                              fileName={file.file_name}
                            />
                          ))}
                        </div>
                      ) : null}
                      <p
                        className={`flow-root whitespace-pre-wrap break-words text-sm leading-5 text-ink${
                          media.length > 0 ? " px-1.5 pb-1 pt-1" : ""
                        }`}
                      >
                        {text}
                        {meta}
                      </p>
                    </div>
                  </div>
                )}
                {deliveryFailed(delivery) ? (
                  <p className="mt-0.5 text-right text-[11px] text-danger">{deliveryProblem(deliveryError)}</p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

const EMAIL_KIND_LABEL: Record<string, string> = {
  manual: "Recordatorio manual",
  due_soon: "Aviso antes del vencimiento",
  overdue: "Aviso de cobro vencido",
};

function emailWhen(iso: string) {
  const day = chatDayLabel(iso);
  const clock = chatClock(iso);
  return day && clock ? `${day} · ${clock}` : day || clock;
}

const EMAILS_PREVIEW = 3;

function EmailHistory({ to, emails }: { to?: string | null; emails: Reminder[] }) {
  const [showAll, setShowAll] = useState(false);
  const sorted = [...emails].sort((a, b) => Date.parse(b.sent_at || b.created_at) - Date.parse(a.sent_at || a.created_at));
  const hidden = Math.max(0, sorted.length - EMAILS_PREVIEW);
  const ordered = showAll ? sorted : sorted.slice(0, EMAILS_PREVIEW);
  return (
    <section className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-soft sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface text-ink-muted">
          <Mail className="h-4 w-4" strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-ink">Correos enviados</h3>
          <span className="block truncate text-xs text-ink-muted">{to?.trim() ? `Para ${to}` : "Sin correo registrado"}</span>
        </span>
        {sorted.length > 0 ? (
          <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-ink-muted">{sorted.length}</span>
        ) : null}
      </div>
      {ordered.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">Aún no se envían correos de este cobro.</p>
      ) : (
        <ul
          className={`mt-4 divide-y divide-surface-border${
            showAll ? " max-h-80 overflow-y-auto pr-1 [scrollbar-width:thin]" : ""
          }`}
        >
          {ordered.map((r) => {
            const scheduled = r.status === "scheduled";
            return (
              <li key={r.id} className="py-2 first:pt-0 last:pb-0">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-1 [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">{EMAIL_KIND_LABEL[r.kind] ?? "Recordatorio"}</span>
                      <span className="block text-xs text-ink-muted">{emailWhen(r.sent_at || r.created_at)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          scheduled ? "bg-warn-soft text-warn" : "bg-brand-soft text-brand"
                        }`}
                      >
                        {scheduled ? "Programado" : "Enviado"}
                      </span>
                      <ChevronDown className="h-4 w-4 text-ink-muted transition-transform group-open:rotate-180" strokeWidth={2} />
                    </span>
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-surface px-3 py-2 text-sm text-ink">{reminderBody(r)}</p>
                </details>
              </li>
            );
          })}
        </ul>
      )}
      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 text-sm font-medium text-brand hover:underline"
        >
          {showAll ? "Ver menos" : `Ver ${hidden} ${hidden === 1 ? "correo anterior" : "correos anteriores"}`}
        </button>
      ) : null}
    </section>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function ChatPanel({
  name,
  phone,
  items,
  expanded = false,
  onToggleExpanded,
  composer,
}: {
  name: string;
  phone?: string | null;
  items: TimelineItem[];
  expanded?: boolean;
  onToggleExpanded: () => void;
  composer: React.ReactNode;
}) {
  return (
    <div className={`flex min-h-0 flex-col overflow-hidden ${expanded ? "h-full" : "h-[min(70vh,36rem)]"}`}>
      <div className="flex items-center gap-3 border-b border-surface-border bg-surface-card px-4 py-2.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
          {initials(name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{name}</span>
          <span className="block truncate text-xs text-ink-muted">{phone?.trim() ? `WhatsApp ${phone}` : "Sin teléfono registrado"}</span>
        </span>
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-label={expanded ? "Cerrar conversación ampliada" : "Ampliar conversación"}
          title={expanded ? "Cerrar" : "Ampliar"}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-ink lg:h-9 lg:w-9"
        >
          {expanded ? <X className="h-5 w-5" strokeWidth={2} /> : <Maximize2 className="h-4 w-4" strokeWidth={2} />}
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <MessageThread items={items} expanded={expanded} />
      </div>
      {composer}
    </div>
  );
}

export default function ChargeDetail() {
  const { id } = useParams();
  const chargeId = Number(id);
  const [ch, setCh] = useState<ChargeDTO | null>(null);
  const [rems, setRems] = useState<Reminder[]>([]);
  const [inboundWA, setInboundWA] = useState<ChargeInboundWhatsApp[]>([]);
  const [loadingRaw, setLoading] = useState(true);
  const loading = useMinLoading(loadingRaw);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { show: showToast } = useToast();
  const setToast = (notice: ToastNotice | null) => {
    if (notice) showToast(notice);
  };
  const [clients, setClients] = useState<ClientDTO[]>([]);
  const [formClientId, setFormClientId] = useState("");
  const [formDue, setFormDue] = useState("");
  const [formAmount, setFormAmount] = useState("");
  /** keep = no tocar pagos; paid = marcar cobrado; unpaid = reabrir */
  const [payAction, setPayAction] = useState<"keep" | "paid" | "unpaid">("keep");
  const [savingEdit, setSavingEdit] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [paying, setPaying] = useState(false);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [replying, setReplying] = useState(false);
  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const load = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setLoadError(null);
    }
    try {
      const i = await fetchCharge(chargeId);
      setCh(i);
      try {
        const [r, wa] = await Promise.all([fetchReminders(chargeId), fetchChargeInboundWhatsApp(chargeId)]);
        setRems(Array.isArray(r) ? r : []);
        setInboundWA(Array.isArray(wa) ? wa : []);
      } catch {
        setRems([]);
        setInboundWA([]);
      }
    } catch {
      if (!silent) {
        setCh(null);
        setLoadError("No se pudo cargar el cobro. ¿Está el API en marcha y la base de datos actualizada?");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!Number.isFinite(chargeId) || chargeId <= 0) {
      setLoading(false);
      setLoadError("Enlace de cobro no válido.");
      return;
    }
    void load();
  }, [chargeId]);

  useEffect(() => {
    if (!Number.isFinite(chargeId) || chargeId <= 0) return;
    let busy = false;
    const refreshThread = async () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const [r, wa] = await Promise.all([fetchReminders(chargeId), fetchChargeInboundWhatsApp(chargeId)]);
        setRems(Array.isArray(r) ? r : []);
        setInboundWA(Array.isArray(wa) ? wa : []);
      } catch {
        /* se reintenta en el próximo ciclo */
      } finally {
        busy = false;
      }
    };
    const timer = window.setInterval(() => void refreshThread(), LIVE_MS);
    const onVisible = () => void refreshThread();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [chargeId]);

  const marking = useRef(false);
  const hasUnread = inboundWA.some((m) => m.direction === "inbound" && !m.read_at);
  useEffect(() => {
    if (!hasUnread || marking.current || document.visibilityState !== "visible") return;
    marking.current = true;
    markChargeRead(chargeId)
      .then(() => {
        const now = new Date().toISOString();
        setInboundWA((list) => list.map((m) => (m.direction === "inbound" && !m.read_at ? { ...m, read_at: now } : m)));
        notifyInboxChanged();
      })
      .catch(() => {
        /* queda sin leer; se reintenta con la próxima actualización */
      })
      .finally(() => {
        marking.current = false;
      });
  }, [hasUnread, chargeId, inboundWA]);

  useEffect(() => {
    fetchClients()
      .then(setClients)
      .catch(() => setClients([]));
  }, []);

  useEffect(() => {
    if (!threadOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setThreadOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [threadOpen]);

  useEffect(() => {
    if (!ch) return;
    setFormClientId(String(ch.client_id));
    setFormDue(ch.due_date.slice(0, 10));
    setFormAmount(normalizeClpInput(String(Math.round(ch.amount))));
    setPayAction("keep");
  }, [ch?.id, ch?.client_id, ch?.due_date, ch?.amount, ch?.status]);

  async function onRemind() {
    setReminding(true);
    setToast(null);
    try {
      await sendReminderNow(chargeId);
      setToast({ text: "Listo: enviamos recordatorios por email y WhatsApp.", tone: "success" });
      await load(true);
    } catch (e: unknown) {
      let text = "No se pudo enviar el recordatorio.";
      if (axios.isAxiosError(e)) {
        const data = e.response?.data as { error?: string } | undefined;
        if (data?.error) text = data.error;
      }
      setToast({ text, tone: "error" });
    } finally {
      setReminding(false);
    }
  }

  async function onInvoiceFile(file: File) {
    setUploadingInvoice(true);
    setToast(null);
    try {
      await uploadChargeAttachment(chargeId, file);
      setToast({ text: "Factura adjuntada. El cliente la verá en el portal de pago.", tone: "success" });
      await load(true);
    } catch (err: unknown) {
      setToast({ text: err instanceof Error ? err.message : "No se pudo adjuntar la factura.", tone: "error" });
    } finally {
      setUploadingInvoice(false);
      if (invoiceInputRef.current) invoiceInputRef.current.value = "";
    }
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSavingEdit(true);
    setToast(null);
    try {
      const cid = Number(formClientId);
      const amt = parseClpInput(formAmount);
      if (!Number.isFinite(cid) || cid <= 0) {
        setToast({ text: "Elige un cliente válido.", tone: "error" });
        return;
      }
      if (!formDue) {
        setToast({ text: "Indica la fecha de vencimiento.", tone: "error" });
        return;
      }
      if (!Number.isFinite(amt) || amt <= 0) {
        setToast({ text: "El monto debe ser mayor a 0.", tone: "error" });
        return;
      }
      const body: {
        client_id: number;
        due_date: string;
        amount: number;
        set_paid?: boolean;
      } = {
        client_id: cid,
        due_date: formDue,
        amount: amt,
      };
      if (payAction === "paid") body.set_paid = true;
      if (payAction === "unpaid") body.set_paid = false;
      await patchCharge(chargeId, body);
      setToast({ text: "Cobro guardado.", tone: "success" });
      setPayAction("keep");
      await load(true);
    } catch {
      setToast({ text: "No se pudo guardar el cobro. Revisa los datos e inténtalo de nuevo.", tone: "error" });
    } finally {
      setSavingEdit(false);
    }
  }

  function onReplyFile(file: File | null) {
    if (file) {
      const problem = chatFileProblem(file);
      if (problem) {
        setToast({ text: problem, tone: "error" });
        return;
      }
    }
    setReplyFile(file);
  }

  async function onReply(e: React.FormEvent) {
    e.preventDefault();
    const text = replyText.trim();
    if (!text && !replyFile) return;
    setReplying(true);
    setToast(null);
    try {
      if (replyFile) {
        await sendChargeWhatsAppFile(chargeId, replyFile, text);
      } else {
        await sendChargeWhatsAppReply(chargeId, text);
      }
      setReplyText("");
      setReplyFile(null);
      setToast({ text: replyFile ? "Archivo enviado por WhatsApp." : "Mensaje enviado por WhatsApp.", tone: "success" });
      await load(true);
    } catch (err: unknown) {
      let textErr = replyFile ? "No se pudo enviar el archivo." : "No se pudo enviar el mensaje.";
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { error?: string } | undefined;
        if (data?.error) textErr = data.error;
      } else if (err instanceof Error && err.message) {
        textErr = err.message;
      }
      setToast({ text: textErr, tone: "error" });
    } finally {
      setReplying(false);
    }
  }

  async function onPay() {
    if (!ch) return;
    setPaying(true);
    setToast(null);
    try {
      await recordPayment(ch.id, ch.amount);
      setToast({ text: "Pago registrado. Este cobro quedó como cobrado.", tone: "success" });
      await load(true);
    } catch {
      setToast({ text: "No se pudo registrar el pago.", tone: "error" });
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <PageLoading />
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-danger/30 bg-surface-card p-6 text-danger shadow-soft">
        <p>{loadError}</p>
        <Link to="/cobros" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
          Volver a cobros
        </Link>
      </div>
    );
  }
  if (!ch) {
    return (
      <div className="mx-auto max-w-lg text-center text-ink-muted">
        Sin datos.{" "}
        <Link to="/cobros" className="font-medium text-brand hover:underline">
          Volver
        </Link>
      </div>
    );
  }

  const reminderList = Array.isArray(rems) ? rems : [];
  const waList = Array.isArray(inboundWA) ? inboundWA : [];
  const emailReminders = reminderList.filter((r) => r.channel === "email");
  const chatItems: TimelineItem[] = [
    ...reminderList.filter((r) => r.channel !== "email").map((r) => ({
      kind: "reminder" as const,
      at: r.created_at,
      id: `rem-${r.id}`,
      reminder: r,
    })),
    ...waList.map((m) => ({
      kind: "reply" as const,
      at: m.created_at,
      id: `wa-${m.id}`,
      reply: m,
    })),
  ];
  const scheduled = reminderList.filter((r) => r.status === "scheduled");
  const isOverdue = ch.status === "overdue";
  const isPaid = ch.status === "paid";
  const dueLabel = isPaid ? "Cobrado" : isOverdue ? "Vencido" : "Al día";
  const timelineBusy = reminding || paying;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Link to="/cobros" className="inline-flex text-sm font-medium text-brand hover:underline">
        ← Volver a cobros
      </Link>

      <div className="grid min-w-0 gap-6 xl:grid-cols-12">
        <div className="min-w-0 space-y-6 xl:col-span-7">
          <section className="rounded-2xl border border-surface-border bg-gradient-to-br from-surface-card to-surface p-4 shadow-soft sm:p-6">
            <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
              <div className="space-y-4 lg:col-span-12">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Cobro #{ch.id}</h1>
                      <StatusBadge status={ch.status} />
                    </div>
                    <p className="mt-1 text-sm sm:text-base">
                      <span className="block font-medium text-ink">{ch.client_name}</span>
                      <span className="mt-0.5 block text-ink-muted">Vence el {formatDate(ch.due_date)}</span>
                    </p>
                  </div>
                  {!isPaid ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void onRemind()}
                        disabled={timelineBusy}
                        title="Envía ahora el recordatorio por los canales del cliente"
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-surface-border bg-surface-card px-3 text-sm font-medium text-ink transition-colors hover:bg-surface disabled:opacity-60"
                      >
                        {reminding ? <ActionSpinner /> : <BellRing className="h-4 w-4 text-ink-muted" strokeWidth={2} />}
                        {reminding ? "Enviando…" : "Enviar recordatorio"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void onPay()}
                        disabled={timelineBusy}
                        className="inline-flex h-9 items-center gap-1.5 bg-brand text-sm font-medium text-white transition-colors hover:bg-brand-hover disabled:opacity-60 !min-h-0 !rounded-lg !px-3"
                      >
                        {paying ? <ActionSpinner /> : <CircleCheck className="h-4 w-4" strokeWidth={2} />}
                        {paying ? "Registrando…" : "Registrar pago"}
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-ink-muted">Monto</div>
                    <div className="mt-1 truncate text-xl font-semibold text-ink">{formatMoney(ch.amount)}</div>
                  </div>
                  <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-ink-muted">Estado</div>
                    <div className="mt-1 text-sm font-semibold text-ink">{dueLabel}</div>
                  </div>
                  <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-ink-muted">Recordatorios</div>
                    <div className="mt-1 text-sm font-semibold text-ink">{scheduled.length} en cola</div>
                  </div>
                </div>
                <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-ink-muted">Teléfono cliente</div>
                  <div className="mt-1 text-sm font-semibold text-ink">
                    {ch.client_phone?.trim() ? ch.client_phone : "Sin teléfono registrado"}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-soft sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink">Factura</h2>
                <p className="mt-1 text-sm text-ink-muted">PDF o imagen, hasta 8 MB. El cliente la ve en el portal de pago.</p>
              </div>
              <div>
                <input
                  ref={invoiceInputRef}
                  type="file"
                  accept="application/pdf,.pdf,image/png,image/jpeg,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onInvoiceFile(file);
                  }}
                />
                <button
                  type="button"
                  disabled={uploadingInvoice}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
                  onClick={() => invoiceInputRef.current?.click()}
                >
                  {uploadingInvoice && <ActionSpinner />}
                  {uploadingInvoice ? "Subiendo…" : ch.attachment_token ? "Reemplazar factura" : "Adjuntar factura"}
                </button>
              </div>
            </div>
            {ch.attachment_token ? (
              <div className="mt-4">
                <InvoicePreview token={ch.attachment_token} ext={ch.attachment_ext} />
              </div>
            ) : (
              <p className="mt-4 text-sm text-ink-muted">Este cobro todavía no tiene factura.</p>
            )}
          </section>

          <section className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-soft sm:p-6">
            <h2 className="text-lg font-semibold text-ink">Editar cobro</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Actualiza sucursal o punto de venta, fecha, monto y estado operativo.
            </p>
            <form className="mt-5 grid gap-4 lg:grid-cols-12" onSubmit={onSaveEdit}>
              <label className="block text-sm font-medium text-ink lg:col-span-6">
                Sucursal
                <AppSelect
                  required
                  value={formClientId}
                  onChange={setFormClientId}
                  options={clients.map((c) => ({ value: String(c.id), label: chargeCounterpartyLabel(c) }))}
                />
              </label>
              <div className="block text-sm font-medium text-ink lg:col-span-3">
                Vencimiento
                <AppDatePicker required value={formDue} onChange={setFormDue} />
              </div>
              <label className="block text-sm font-medium text-ink lg:col-span-3">
                Monto (CLP)
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
                  value={formAmount}
                  placeholder="$ 0"
                  onChange={(e) => setFormAmount(normalizeClpInput(e.target.value))}
                />
              </label>
              <label className="block text-sm font-medium text-ink lg:col-span-8">
                Estado de cobro
                <AppSelect
                  value={payAction}
                  onChange={(next) => setPayAction(next as "keep" | "paid" | "unpaid")}
                  options={[
                    { value: "keep", label: "Automático (sin cambios manuales)" },
                    { value: "paid", label: "Marcar como cobrado" },
                    { value: "unpaid", label: "Marcar como pendiente (reabrir)" },
                  ]}
                />
              </label>
              <div className="lg:col-span-4 lg:self-end">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="w-full rounded-xl border border-transparent bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover disabled:opacity-60 dark:shadow-none"
                >
                  {savingEdit ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </form>
          </section>
        </div>

        <div className="w-full min-w-0 space-y-6 xl:col-span-5 xl:min-w-[min(100%,20rem)]">
          <section className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-soft">
            {threadOpen ? (
              <p className="px-4 py-10 text-center text-sm text-ink-muted">La conversación está abierta en grande.</p>
            ) : (
              <ChatPanel
                name={ch.client_name || "Cliente"}
                phone={ch.client_phone}
                items={chatItems}
                onToggleExpanded={() => setThreadOpen(true)}
                composer={
                  <ReplyComposer
                    id="charge-whatsapp-reply"
                    value={replyText}
                    onChange={setReplyText}
                    file={replyFile}
                    onFile={onReplyFile}
                    onSubmit={(e) => void onReply(e)}
                    sending={replying}
                  />
                }
              />
            )}
          </section>

          <EmailHistory to={ch.client_email} emails={emailReminders} />
        </div>
      </div>

      {threadOpen && (
        <AppModal onBackdropClick={() => setThreadOpen(false)}>
          <div className="h-[min(92dvh,48rem)] w-full overflow-hidden bg-surface-card shadow-2xl sm:w-[min(92vw,52rem)] sm:rounded-2xl">
            <ChatPanel
              name={ch.client_name || "Cliente"}
              phone={ch.client_phone}
              items={chatItems}
              expanded
              onToggleExpanded={() => setThreadOpen(false)}
              composer={
                <ReplyComposer
                  id="charge-whatsapp-reply-large"
                  value={replyText}
                  onChange={setReplyText}
                  file={replyFile}
                  onFile={onReplyFile}
                  onSubmit={(e) => void onReply(e)}
                  sending={replying}
                />
              }
            />
          </div>
        </AppModal>
      )}
    </div>
  );
}
