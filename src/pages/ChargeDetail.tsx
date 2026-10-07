import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useMinLoading } from "../lib/useMinLoading";
import { Link, useParams } from "react-router-dom";
import {
  fetchCharge,
  fetchChargeInboundWhatsApp,
  fetchClients,
  fetchReminders,
  patchCharge,
  recordPayment,
  sendReminderNow,
  uploadChargeAttachment,
} from "../api";
import type { ChargeDTO, ChargeInboundWhatsApp, ClientDTO, Reminder } from "../api";
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
  return new Date(t).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
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

function reminderBody(r: Reminder) {
  const text = r.message?.trim();
  if (text) return text;
  if (r.status === "scheduled") return "Recordatorio programado. Aún no se envía.";
  return "Mensaje sin texto.";
}

function MessageThread({ items }: { items: TimelineItem[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const ordered = [...items].sort((a, b) => {
    const ta = new Date(a.at).getTime();
    const tb = new Date(b.at).getTime();
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  });
  const lastId = ordered[ordered.length - 1]?.id ?? "";

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [ordered.length, lastId]);

  let previousDay = "";

  return (
    <div
      ref={scroller}
      role="log"
      aria-label="Mensajes del cobro"
      className="mt-5 max-h-[min(55vh,26rem)] min-h-[16rem] w-full min-w-0 overflow-y-auto rounded-2xl bg-[#efeae2] px-3 py-4 [scrollbar-width:thin] [scrollbar-color:rgba(15,23,42,0.35)_transparent] dark:bg-[#0b141a] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-black/20"
    >
      {ordered.length === 0 ? (
        <p className="px-2 py-8 text-center text-sm text-ink-muted">Aún no hay mensajes en este cobro.</p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {ordered.map((item) => {
            const day = chatDayLabel(item.at);
            const showDay = day !== previousDay;
            previousDay = day;
            const outgoing = item.kind === "reminder";
            const email = outgoing && item.reminder.channel === "email";
            const scheduled = outgoing && item.reminder.status === "scheduled";
            const text = item.kind === "reply" ? item.reply.content?.trim() || "Mensaje sin texto." : reminderBody(item.reminder);
            const clock = chatClock(item.at);
            return (
              <li key={item.id} className="min-w-0">
                {showDay && day ? (
                  <div className="my-2 flex justify-center">
                    <span className="rounded-lg bg-white/80 px-2.5 py-1 text-[11px] font-medium text-ink-muted shadow-sm dark:bg-[#182229] dark:text-white/70">
                      {day}
                    </span>
                  </div>
                ) : null}
                {scheduled ? (
                  <div className="flex justify-center px-6 py-1">
                    <p className="max-w-[90%] rounded-lg bg-white/70 px-3 py-1.5 text-center text-xs text-ink-muted dark:bg-[#182229] dark:text-white/70">
                      {item.reminder.channel === "email" ? "Email programado" : "WhatsApp programado"}
                      {clock ? ` · ${clock}` : ""}
                    </p>
                  </div>
                ) : (
                  <div className={outgoing ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className={
                        outgoing
                          ? email
                            ? "max-w-[85%] rounded-2xl rounded-br-md bg-white px-3 py-1.5 text-ink shadow-sm dark:bg-[#202c33] dark:text-white"
                            : "max-w-[85%] rounded-2xl rounded-br-md bg-[#d9fdd3] px-3 py-1.5 text-[#111b21] shadow-sm dark:bg-[#005c4b] dark:text-white"
                          : "max-w-[85%] rounded-2xl rounded-bl-md bg-white px-3 py-1.5 text-[#111b21] shadow-sm dark:bg-[#202c33] dark:text-white"
                      }
                    >
                      <p className="mb-0.5 text-[11px] font-semibold text-[#027eb5] dark:text-[#53bdeb]">
                        {item.kind === "reply" ? "Cliente" : email ? "Email" : "WhatsApp"}
                      </p>
                      <p className="whitespace-pre-wrap break-words text-sm leading-snug">{text}</p>
                      {clock ? (
                        <p className="mt-1 text-right text-[10px] text-black/45 dark:text-white/50">{clock}</p>
                      ) : null}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
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
    fetchClients()
      .then(setClients)
      .catch(() => setClients([]));
  }, []);

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
  const timelineItems: TimelineItem[] = [
    ...reminderList.map((r) => ({
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
          <section className="min-h-[220px] rounded-2xl border border-surface-border bg-gradient-to-br from-surface-card to-surface p-4 shadow-soft sm:p-6">
            <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
              <div className="space-y-4 lg:col-span-12">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Cobro #{ch.id}</h1>
                  <StatusBadge status={ch.status} />
                </div>
                <p className="text-sm sm:text-base">
                  <span className="block font-medium text-ink">{ch.client_name}</span>
                  <span className="mt-0.5 block text-ink-muted">Vence el {formatDate(ch.due_date)}</span>
                </p>
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

          <section className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-soft sm:p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Estado del cobro</h3>
            <div className="mt-3 space-y-2.5 text-sm">
              <div className="flex items-center justify-between rounded-xl border border-surface-border px-3 py-2">
                <span className="text-ink-muted">Situación</span>
                <span className="font-semibold text-ink">{dueLabel}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-surface-border px-3 py-2">
                <span className="text-ink-muted">Monto actual</span>
                <span className="font-semibold text-ink">{formatMoney(ch.amount)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-surface-border px-3 py-2">
                <span className="text-ink-muted">Vencimiento</span>
                <span className="font-semibold text-ink">{formatDate(ch.due_date)}</span>
              </div>
            </div>
            {isOverdue && (
              <p className="mt-4 rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
                Vencido: prioriza contacto y seguimiento para evitar mayor atraso.
              </p>
            )}
          </section>
        </div>

        <section className="w-full min-w-0 rounded-2xl border border-surface-border bg-surface-card p-4 shadow-soft sm:p-6 xl:col-span-5 xl:min-w-[min(100%,20rem)]">
          <h2 className="text-lg font-semibold text-ink">Línea de tiempo</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Los mensajes que enviaste quedan a la derecha. Las respuestas del cliente por WhatsApp, a la izquierda.
          </p>
          <MessageThread items={timelineItems} />

          <div className="mt-6 border-t border-surface-border pt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Acciones rápidas</h3>
            <p className="mt-2 text-sm text-ink-muted">Gestiona este cobro desde aquí.</p>
            {!isPaid ? (
              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={() => void onRemind()}
                  disabled={timelineBusy}
                  className="inline-flex w-full items-center justify-center gap-2 bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {reminding ? <ActionSpinner /> : null}
                  {reminding ? "Enviando…" : "Enviar recordatorio ahora"}
                </button>
                <button
                  type="button"
                  onClick={() => void onPay()}
                  disabled={timelineBusy}
                  className="inline-flex w-full items-center justify-center gap-2 border border-surface-border bg-surface-card px-4 text-sm font-semibold text-ink hover:bg-surface disabled:opacity-60"
                >
                  {paying ? <ActionSpinner /> : null}
                  {paying ? "Registrando…" : "Registrar pago"}
                </button>
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-brand/30 bg-brand-soft px-3 py-2 text-sm text-brand">
                Este cobro ya está marcado como cobrado.
              </p>
            )}
          </div>
        </section>
      </div>

    </div>
  );
}
