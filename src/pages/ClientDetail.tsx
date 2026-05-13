import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronDown, Eye, Trash2 } from "lucide-react";
import { deleteClient, fetchClient, updateClient } from "../api";
import type { ClientDTO } from "../api";
import AppModal from "../components/AppModal";
import { RiskBadge } from "../components/Badge";
import ToggleSwitch from "../components/ToggleSwitch";
import { chargeCounterpartyLabel } from "../lib/chargeCounterpartyLabel";
import { formatMoney } from "../lib/format";

function dash(v: string | null | undefined) {
  const s = (v ?? "").trim();
  return s.length > 0 ? s : "—";
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const clientId = Number(id);
  const [c, setC] = useState<ClientDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [toggleBusy, setToggleBusy] = useState(false);
  const [followupSaving, setFollowupSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    client_code: "",
    branch_name: "",
    payment_terms: "",
  });

  const load = async () => {
    if (!Number.isFinite(clientId) || clientId <= 0) {
      setLoading(false);
      setLoadError("Enlace de cliente no válido.");
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const row = await fetchClient(clientId);
      setC(row);
    } catch {
      setC(null);
      setLoadError("No se pudo cargar el cliente. ¿Existe y tenés permisos?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [clientId]);

  useEffect(() => {
    if (!c) return;
    setForm({
      name: c.name,
      email: (c.email ?? "").trim(),
      phone: (c.phone ?? "").trim(),
      address: (c.address ?? "").trim(),
      client_code: (c.client_code ?? "").trim(),
      branch_name: (c.branch_name ?? "").trim(),
      payment_terms: (c.payment_terms ?? "").trim(),
    });
  }, [c?.id]);

  const isClientActive = (row: ClientDTO) => row.is_active !== false;

  const hasNoCharges = (row: ClientDTO) => typeof row.charge_count === "number" && row.charge_count === 0;

  const clientStatusLabel = (row: ClientDTO) => {
    if (hasNoCharges(row)) return "Sin cobros";
    if (row.overdue_count > 0) return "Cobros vencidos";
    if (row.total_owed > 0) return "Cobros pendientes";
    return "Cobros realizados";
  };

  const clientStatusFilter = (row: ClientDTO): "overdue" | "pending" | "paid" | "all" => {
    if (hasNoCharges(row)) return "all";
    if (row.overdue_count > 0) return "overdue";
    if (row.total_owed > 0) return "pending";
    return "paid";
  };

  const clientStatusTone = (row: ClientDTO) => {
    if (hasNoCharges(row)) return "bg-slate-50 text-slate-600 border-slate-200";
    if (row.overdue_count > 0) return "bg-rose-50 text-rose-700 border-rose-200";
    if (row.total_owed > 0) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  };

  async function onSetActive(active: boolean) {
    if (!c) return;
    setError(null);
    setToggleBusy(true);
    try {
      await updateClient(c.id, { is_active: active });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el estado");
    } finally {
      setToggleBusy(false);
    }
  }

  async function onFollowupChange(channel: "all" | "email" | "whatsapp" | "none") {
    if (!c) return;
    setError(null);
    setFollowupSaving(true);
    try {
      await updateClient(c.id, { followup_channel: channel });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar seguimiento");
    } finally {
      setFollowupSaving(false);
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!c) return;
    setError(null);
    setSaving(true);
    try {
      await updateClient(c.id, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        client_code: form.client_code.trim(),
        branch_name: form.branch_name.trim(),
        payment_terms: form.payment_terms.trim(),
      });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteClient() {
    if (!c) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteClient(c.id);
      setDeleteModalOpen(false);
      navigate("/clients");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="text-ink-muted">Cargando…</div>;
  }
  if (loadError || !c) {
    return (
      <div className="max-w-lg rounded-2xl border border-rose-200 bg-surface-card p-6 text-rose-900 shadow-soft">
        <p>{loadError ?? "Sin datos."}</p>
        <Link to="/clients" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
          Volver a clientes
        </Link>
      </div>
    );
  }

  const cobrosParams = new URLSearchParams();
  cobrosParams.set("client_id", String(c.id));
  cobrosParams.set("client", chargeCounterpartyLabel(c));
  cobrosParams.set("status", clientStatusFilter(c));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 whitespace-pre-wrap">{error}</div>
      )}

      <Link to="/clients" className="inline-flex text-sm font-medium text-brand hover:underline">
        ← Volver a clientes
      </Link>

      <section className="rounded-2xl border border-surface-border bg-gradient-to-br from-surface-card to-surface p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Cliente</p>
            <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{dash(c.branch_name)}</h1>
            <p className="text-sm text-ink-muted">
              Código <span className="font-mono text-ink">{dash(c.client_code)}</span>
              {c.external_code?.trim() ? (
                <>
                  {" "}
                  · Clave importación{" "}
                  <span className="font-mono text-xs text-ink-muted">{c.external_code}</span>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex max-w-full flex-wrap items-center justify-end gap-x-2 gap-y-2 sm:gap-x-3">
            <RiskBadge level={c.risk_level} />
            <Link
              to={`/cobros?${cobrosParams.toString()}`}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition hover:brightness-95 sm:px-3 sm:text-xs ${clientStatusTone(c)}`}
            >
              <Eye className="h-3.5 w-3.5" strokeWidth={2} />
              {clientStatusLabel(c)}
            </Link>
            <span className="shrink-0 text-xs text-ink-muted sm:text-sm">
              Pendiente: <span className="font-semibold text-ink">{formatMoney(c.total_owed)}</span>
            </span>
            {!isClientActive(c) && (
              <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                Inactivo
              </span>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-ink-muted">Encargado</div>
            <div className="mt-1 truncate text-sm font-semibold text-ink" title={c.name}>
              {c.name}
            </div>
          </div>
          <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-ink-muted">Contacto</div>
            <div className="mt-1 truncate text-sm text-ink" title={c.email ?? ""}>
              {dash(c.email)}
            </div>
            <div className="truncate text-xs text-ink-muted" title={c.phone ?? ""}>
              {dash(c.phone)}
            </div>
          </div>
          <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-ink-muted">Método de pago</div>
            <div className="mt-1 text-sm font-semibold text-ink">{dash(c.payment_terms)}</div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-surface-border bg-surface-card px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-ink-muted">Dirección</div>
          <div className="mt-1 text-sm text-ink">{dash(c.address)}</div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Estado del cliente</h3>
            <p className="mt-1 text-xs text-ink-muted">Activá o desactivá el cliente para cobros y recordatorios.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <ToggleSwitch
                checked={isClientActive(c)}
                onCheckedChange={(v) => void onSetActive(v)}
                disabled={toggleBusy}
                aria-label={isClientActive(c) ? "Cliente activo" : "Cliente inactivo"}
              />
              <span className="text-sm text-ink">{isClientActive(c) ? "Activo" : "Inactivo"}</span>
            </div>
          </div>
          <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Seguimiento automático</h3>
            <p className="mt-1 text-xs text-ink-muted">Canal preferido para recordatorios automáticos.</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2">
              <label
                htmlFor="client-followup-channel"
                className="shrink-0 text-sm font-medium text-ink"
              >
                Canal:
              </label>
              <div className="relative min-w-[10rem] max-w-[15.5rem] flex-1 sm:flex-initial">
                <select
                  id="client-followup-channel"
                  className="w-full cursor-pointer appearance-none rounded-lg border border-surface-border bg-surface-card py-2 pl-2.5 pr-8 text-sm text-ink shadow-sm outline-none transition hover:border-slate-300 focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:border-slate-500"
                  value={c.followup_channel ?? "all"}
                  disabled={followupSaving}
                  onChange={(e) =>
                    void onFollowupChange(e.target.value as "all" | "email" | "whatsapp" | "none")
                  }
                >
                  <option value="all">WhatsApp + Correo</option>
                  <option value="whatsapp">Solo WhatsApp</option>
                  <option value="email">Solo Correo</option>
                  <option value="none">Sin seguimiento</option>
                </select>
                <ChevronDown
                  className={`pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted ${followupSaving ? "opacity-50" : ""}`}
                  strokeWidth={2}
                  aria-hidden
                />
              </div>
            </div>
          </div>
        </div>

      </section>

      <section className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-soft sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Editar datos</h2>
        <p className="mt-1 text-sm text-ink-muted">Los cambios reemplazan la ficha completa del cliente.</p>
        <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={onSave}>
          <label className="block text-sm font-medium text-ink">
            CODIGO
            <input
              required
              className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
              value={form.client_code}
              onChange={(e) => setForm((f) => ({ ...f, client_code: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            SUCURSAL
            <input
              required
              className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
              value={form.branch_name}
              onChange={(e) => setForm((f) => ({ ...f, branch_name: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium text-ink sm:col-span-2">
            NOMBRE (encargado) <span className="text-rose-600">*</span>
            <input
              required
              className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium text-ink sm:col-span-2">
            DIRECCION
            <input
              className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            TELEFONO
            <input
              className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            EMAIL
            <input
              type="email"
              className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium text-ink sm:col-span-2">
            MPAGO · Método de pago
            <input
              className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
              value={form.payment_terms}
              onChange={(e) => setForm((f) => ({ ...f, payment_terms: e.target.value }))}
              placeholder="Ej. CONTADO"
            />
          </label>
          <div className="flex justify-end sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 shadow-soft sm:p-6">
        <h2 className="text-lg font-semibold text-rose-900">Zona de peligro</h2>
        <p className="mt-1 text-sm text-rose-800/90">Eliminar el cliente borra también todos sus cobros asociados.</p>
        <button
          type="button"
          onClick={() => setDeleteModalOpen(true)}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-surface-card px-4 py-2.5 text-sm font-semibold text-rose-800 hover:bg-rose-50"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} />
          Eliminar cliente
        </button>
      </section>

      {deleteModalOpen && c && (
        <AppModal onBackdropClick={deleting ? undefined : () => setDeleteModalOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-card p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-ink">¿Eliminar este cliente?</h2>
            <p className="mt-2 text-sm text-ink-muted">
              Se eliminará <span className="font-semibold text-ink">{chargeCounterpartyLabel(c)}</span>
              {c.name?.trim() ? (
                <>
                  {" "}
                  (<span className="text-ink">{c.name}</span>)
                </>
              ) : null}{" "}
              y <span className="font-semibold text-ink">todos los cobros</span> asociados. Esta acción no se puede
              deshacer.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface disabled:opacity-50"
                disabled={deleting}
                onClick={() => setDeleteModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                disabled={deleting}
                onClick={() => void confirmDeleteClient()}
              >
                <Trash2 className="h-4 w-4" strokeWidth={2} />
                {deleting ? "Eliminando…" : "Eliminar definitivamente"}
              </button>
            </div>
          </div>
        </AppModal>
      )}
    </div>
  );
}
