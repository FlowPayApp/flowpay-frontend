import { useEffect, useState } from "react";
import axios from "axios";
import { approvePaymentPortal, listPendingPaymentPortals, rejectPaymentPortal, type PendingPaymentPortal } from "../api";
import AppModal from "./AppModal";
import { useToast } from "./Toast";

function apiMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const text = err.response?.data?.error;
    if (typeof text === "string" && text.trim()) return text;
  }
  return fallback;
}

function when(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function PaymentPortalReviews() {
  const toast = useToast();
  const [rows, setRows] = useState<PendingPaymentPortal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<PendingPaymentPortal | null>(null);
  const [reason, setReason] = useState("");

  async function load() {
    const data = await listPendingPaymentPortals();
    setRows(data);
  }

  useEffect(() => {
    let cancelled = false;
    listPendingPaymentPortals()
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (axios.isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 403)) return;
        setError(apiMessage(err, "No se pudieron leer los enlaces pendientes."));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onApprove(row: PendingPaymentPortal) {
    setBusyId(row.company_id);
    setError(null);
    try {
      await approvePaymentPortal(row.company_id);
      await load();
      toast.success(`Los recordatorios de ${row.company_name} ya usan su portal.`);
    } catch (err: unknown) {
      setError(apiMessage(err, "No se pudo aprobar el enlace."));
    } finally {
      setBusyId(null);
    }
  }

  async function onReject() {
    if (!rejecting) return;
    const note = reason.trim();
    if (!note) {
      setError("Escribe el motivo del rechazo.");
      return;
    }
    setBusyId(rejecting.company_id);
    setError(null);
    try {
      await rejectPaymentPortal(rejecting.company_id, note);
      setRejecting(null);
      setReason("");
      await load();
      toast.success("La dirección quedó rechazada. Los recordatorios siguen como estaban.");
    } catch (err: unknown) {
      setError(apiMessage(err, "No se pudo rechazar el enlace."));
    } finally {
      setBusyId(null);
    }
  }

  if (error && !rows?.length && !rejecting) {
    return <p className="mb-4 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>;
  }
  if (!rows?.length) return null;

  return (
    <section className="mb-4 rounded-2xl border border-surface-border bg-surface-card p-4 shadow-soft sm:p-5">
      <h2 className="text-base font-semibold text-ink">Enlaces de pago por aprobar</h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-muted">
        Abre la dirección y comprueba que sea el portal de esa empresa. Al aprobar, los recordatorios pasan a usarla.
      </p>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      <ul className="mt-4 divide-y divide-surface-border">
        {rows.map((row) => {
          const sent = when(row.pending_at);
          const busy = busyId === row.company_id;
          return (
            <li key={row.company_id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{row.company_name}</p>
                <a
                  href={row.pending_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 block break-all text-sm text-brand hover:underline"
                >
                  {row.pending_url}
                </a>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                  {row.mode === "external" && row.url
                    ? `Hoy los recordatorios usan ${row.url}.`
                    : "Hoy los recordatorios usan el enlace de Geldflus."}{" "}
                  {sent ? `Enviada el ${sent}.` : null}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setError(null);
                    setReason("");
                    setRejecting(row);
                  }}
                  className="h-10 rounded-lg px-3 text-sm font-medium text-ink-muted hover:bg-surface hover:text-ink disabled:opacity-60"
                >
                  Rechazar
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onApprove(row)}
                  className="h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
                >
                  {busy ? "Aprobando…" : "Aprobar"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {rejecting ? (
        <AppModal
          onBackdropClick={() => {
            if (busyId == null) setRejecting(null);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-surface-border bg-surface-card p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-ink">{rejecting.company_name}</h2>
            <p className="mt-1 break-all text-sm text-ink-muted">{rejecting.pending_url}</p>
            <label className="mt-4 block text-sm font-medium text-ink">
              Motivo
              <textarea
                className="mt-1.5 min-h-24 w-full rounded-xl border border-surface-border bg-[rgb(var(--color-field))] px-3 py-2.5 text-sm text-ink outline-none focus:border-brand/50"
                placeholder="El enlace no abre el portal de pagos."
                value={reason}
                maxLength={240}
                onChange={(event) => setReason(event.target.value)}
                autoFocus
              />
            </label>
            <p className="mt-1.5 text-sm text-ink-muted">La empresa lo ve en Configuración. El enlace en uso no cambia.</p>
            {error && rejecting ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={busyId != null}
                onClick={() => setRejecting(null)}
                className="h-10 rounded-lg px-3 text-sm font-medium text-ink-muted hover:bg-surface hover:text-ink disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busyId != null}
                onClick={() => void onReject()}
                className="h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
              >
                {busyId != null ? "Rechazando…" : "Rechazar"}
              </button>
            </div>
          </div>
        </AppModal>
      ) : null}
    </section>
  );
}
