import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deleteCharge, fetchCharge, fetchClients, fetchReminders, patchCharge, recordPayment, sendReminderNow } from "../api";
import type { ChargeDTO, ClientDTO, Reminder } from "../api";
import AppModal from "../components/AppModal";
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

function timelineLabel(r: Reminder) {
  if (r.status === "scheduled") {
    return "Recordatorio automático programado";
  }
  if (r.status === "sent") {
    return r.channel === "email" ? "Email enviado (simulado)" : "WhatsApp enviado (simulado)";
  }
  return r.kind;
}

type TimelineItem = { kind: "reminder"; at: string; id: string; reminder: Reminder };

type ToastNotice = {
  text: string;
  tone: "success" | "error" | "info";
};

export default function ChargeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const chargeId = Number(id);
  const [ch, setCh] = useState<ChargeDTO | null>(null);
  const [rems, setRems] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastNotice | null>(null);
  const [clients, setClients] = useState<ClientDTO[]>([]);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [formClientId, setFormClientId] = useState("");
  const [formDue, setFormDue] = useState("");
  const [formAmount, setFormAmount] = useState("");
  /** keep = no tocar pagos; paid = marcar cobrado; unpaid = reabrir */
  const [payAction, setPayAction] = useState<"keep" | "paid" | "unpaid">("keep");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const i = await fetchCharge(chargeId);
      setCh(i);
      try {
        const r = await fetchReminders(chargeId);
        setRems(Array.isArray(r) ? r : []);
      } catch {
        setRems([]);
      }
    } catch {
      setCh(null);
      setLoadError("No se pudo cargar el cobro. ¿Está el API en marcha y la base de datos actualizada?");
    } finally {
      setLoading(false);
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
    setToast(null);
    try {
      await sendReminderNow(chargeId);
      setToast({ text: "Listo: enviamos recordatorios por email y WhatsApp.", tone: "success" });
      await load();
    } catch {
      setToast({ text: "No se pudo enviar (¿ya está cobrado?).", tone: "error" });
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
      setToast({ text: "Cambios guardados.", tone: "success" });
      setPayAction("keep");
      await load();
    } catch {
      setToast({ text: "No se pudo guardar. Revisa los datos o el API.", tone: "error" });
    } finally {
      setSavingEdit(false);
    }
  }

  async function onPay() {
    if (!ch) return;
    setToast(null);
    try {
      await recordPayment(ch.id, ch.amount);
      setToast({ text: "Pago registrado. Este cobro quedó como cobrado.", tone: "success" });
      await load();
    } catch {
      setToast({ text: "No se pudo registrar el pago.", tone: "error" });
    }
  }

  async function onDeleteCharge() {
    if (
      !confirm(
        "¿Eliminar este cobro? También se eliminarán pagos y recordatorios asociados. Esta acción no se puede deshacer.",
      )
    ) {
      return;
    }
    setDeleting(true);
    setToast(null);
    try {
      await deleteCharge(chargeId);
      navigate("/cobros");
    } catch {
      setToast({ text: "No se pudo eliminar el cobro.", tone: "error" });
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  if (loading) {
    return <div className="text-ink-muted">Cargando…</div>;
  }
  if (loadError) {
    return (
      <div className="max-w-lg rounded-2xl border border-rose-200 bg-white p-6 text-rose-900 shadow-soft">
        <p>{loadError}</p>
        <Link to="/cobros" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
          Volver a cobros
        </Link>
      </div>
    );
  }
  if (!ch) {
    return (
      <div className="text-ink-muted">
        Sin datos.{" "}
        <Link to="/cobros" className="font-medium text-brand hover:underline">
          Volver
        </Link>
      </div>
    );
  }

  const reminderList = Array.isArray(rems) ? rems : [];
  const timelineItems: TimelineItem[] = reminderList.map((r) => ({
    kind: "reminder" as const,
    at: r.created_at,
    id: `rem-${r.id}`,
    reminder: r,
  }));
  /** Más reciente arriba, más antiguo abajo */
  const timelineOrdered = [...timelineItems].sort((a, b) => {
    const ta = new Date(a.at).getTime();
    const tb = new Date(b.at).getTime();
    if (tb !== ta) return tb - ta;
    return b.id.localeCompare(a.id);
  });
  const scheduled = reminderList.filter((r) => r.status === "scheduled");
  const isOverdue = ch.status === "overdue";
  const isPaid = ch.status === "paid";
  const dueLabel = isPaid ? "Cobrado" : isOverdue ? "Vencido" : "Al día";

  return (
    <div className="max-w-6xl space-y-6">
      {toast && (
        <div
          className={[
            "fixed right-4 top-4 z-50 max-w-[24rem] rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-sm transition-all",
            toast.tone === "success" && "border-emerald-200 bg-emerald-50/95 text-emerald-800",
            toast.tone === "error" && "border-rose-200 bg-rose-50/95 text-rose-800",
            toast.tone === "info" && "border-sky-200 bg-sky-50/95 text-sky-800",
          ]
            .filter(Boolean)
            .join(" ")}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-current opacity-70" />
            <p className="leading-5">{toast.text}</p>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-auto rounded-md px-1.5 py-0.5 text-xs font-semibold opacity-70 hover:bg-black/5 hover:opacity-100"
              aria-label="Cerrar aviso"
            >
              x
            </button>
          </div>
        </div>
      )}
      <Link to="/cobros" className="inline-flex text-sm font-medium text-brand hover:underline">
        ← Volver a cobros
      </Link>

      <div className="grid min-w-0 gap-6 xl:grid-cols-12">
        <div className="min-w-0 space-y-6 xl:col-span-7">
          <section className="min-h-[220px] rounded-2xl border border-surface-border bg-gradient-to-br from-white to-slate-50 p-4 shadow-soft sm:p-6">
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
                  <div className="rounded-xl border border-surface-border bg-white px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-ink-muted">Monto</div>
                    <div className="mt-1 truncate text-xl font-semibold text-ink">{formatMoney(ch.amount)}</div>
                  </div>
                  <div className="rounded-xl border border-surface-border bg-white px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-ink-muted">Estado</div>
                    <div className="mt-1 text-sm font-semibold text-ink">{dueLabel}</div>
                  </div>
                  <div className="rounded-xl border border-surface-border bg-white px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-ink-muted">Recordatorios</div>
                    <div className="mt-1 text-sm font-semibold text-ink">{scheduled.length} en cola</div>
                  </div>
                </div>
                <div className="rounded-xl border border-surface-border bg-white px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-ink-muted">Teléfono cliente</div>
                  <div className="mt-1 text-sm font-semibold text-ink">
                    {ch.client_phone?.trim() ? ch.client_phone : "Sin teléfono registrado"}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-surface-border bg-white p-4 shadow-soft sm:p-6">
            <h2 className="text-lg font-semibold text-ink">Editar cobro</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Actualiza sucursal o punto de venta, fecha, monto y estado operativo.
            </p>
            <form className="mt-5 grid gap-4 lg:grid-cols-12" onSubmit={onSaveEdit}>
              <label className="block text-sm font-medium text-ink lg:col-span-6">
                Sucursal
                <select
                  required
                  className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
                  value={formClientId}
                  onChange={(e) => setFormClientId(e.target.value)}
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {chargeCounterpartyLabel(c)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-ink lg:col-span-3">
                Vencimiento
                <input
                  required
                  type="date"
                  className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
                  value={formDue}
                  onChange={(e) => setFormDue(e.target.value)}
                />
              </label>
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
                <select
                  className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
                  value={payAction}
                  onChange={(e) => setPayAction(e.target.value as "keep" | "paid" | "unpaid")}
                >
                  <option value="keep">Automático (sin cambios manuales)</option>
                  <option value="paid">Marcar como cobrado</option>
                  <option value="unpaid">Marcar como pendiente (reabrir)</option>
                </select>
              </label>
              <div className="lg:col-span-4 lg:self-end">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {savingEdit ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-surface-border bg-white p-4 shadow-soft sm:p-5">
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
              <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                Vencido: prioriza contacto y seguimiento para evitar mayor atraso.
              </p>
            )}
          </section>
        </div>

        <section className="w-full min-w-0 rounded-2xl border border-surface-border bg-white p-4 shadow-soft sm:p-6 xl:col-span-5 xl:min-w-[min(100%,20rem)]">
          <h2 className="text-lg font-semibold text-ink">Línea de tiempo</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Lo más reciente arriba. Aquí ves los recordatorios automáticos asociados a este cobro.
          </p>
          {/* Scroll solo vertical: padding izquierdo para que los puntos (absolute -left) no queden fuera del área de recorte */}
          <div className="mt-6 max-h-[min(55vh,26rem)] min-h-0 w-full min-w-0 overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:rgba(15,23,42,0.35)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/80 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400/90">
            <div className="pl-3 pr-1 sm:pl-4 sm:pr-2">
              <ol className="space-y-6 border-l border-surface-border pl-6 sm:pl-7">
                {timelineOrdered.length === 0 ? (
                  <li className="text-sm text-ink-muted">Aún no hay eventos. Los recordatorios aparecerán aquí.</li>
                ) : (
                  timelineOrdered.map((item) => (
                    <li key={item.id} className="relative min-w-0 max-w-full">
                      <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full bg-white ring-2 ring-brand sm:-left-[33px]" />
                      <div className="break-words text-sm font-medium text-ink">{timelineLabel(item.reminder)}</div>
                      <div className="mt-1 break-words text-xs text-ink-muted">
                        {formatDate(item.reminder.created_at)} · {item.reminder.kind} · {item.reminder.channel}
                      </div>
                      {item.reminder.status === "sent" && (
                        <button
                          type="button"
                          onClick={() => setSelectedReminder(item.reminder)}
                          className="mt-2 max-w-full rounded-lg border border-surface-border bg-white px-3 py-1.5 text-left text-xs font-semibold text-ink hover:bg-surface"
                        >
                          {item.reminder.channel === "email" ? "Ver email enviado" : "Ver WhatsApp enviado"}
                        </button>
                      )}
                    </li>
                  ))
                )}
              </ol>
            </div>
          </div>

          <div className="mt-6 border-t border-surface-border pt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Acciones rápidas</h3>
            <p className="mt-2 text-sm text-ink-muted">Gestiona este cobro desde aquí.</p>
            {!isPaid ? (
              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={onRemind}
                  className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-600"
                >
                  Enviar recordatorio ahora
                </button>
                <button
                  type="button"
                  onClick={onPay}
                  className="w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-surface"
                >
                  Registrar pago
                </button>
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Este cobro ya está marcado como cobrado.
              </p>
            )}
            <div className="mt-6 border-t border-surface-border pt-4">
              <button
                type="button"
                onClick={() => void onDeleteCharge()}
                disabled={deleting}
                className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
              >
                {deleting ? "Eliminando…" : "Eliminar cobro"}
              </button>
            </div>
          </div>
        </section>
      </div>

      {selectedReminder && (
        <AppModal>
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-ink">Mensaje enviado</h3>
              <button
                type="button"
                onClick={() => setSelectedReminder(null)}
                className="rounded-lg px-2 py-1 text-sm font-medium text-ink-muted hover:bg-surface"
              >
                Cerrar
              </button>
            </div>
            <p className="mt-2 text-sm text-ink-muted">
              Canal: <span className="font-medium text-ink">{selectedReminder.channel}</span> · Fecha:{" "}
              <span className="font-medium text-ink">{formatDate(selectedReminder.created_at)}</span>
            </p>
            <div className="mt-4 max-h-[55vh] overflow-y-auto rounded-xl border border-surface-border bg-surface/40 p-4">
              <pre className="whitespace-pre-wrap break-words text-sm text-ink">
                {selectedReminder.message?.trim() || "No hay contenido de mensaje disponible para este evento."}
              </pre>
            </div>
          </div>
        </AppModal>
      )}
    </div>
  );
}
