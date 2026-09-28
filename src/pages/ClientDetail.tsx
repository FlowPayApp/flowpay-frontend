import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Eye } from "lucide-react";
import { fetchClient, listCompanyUsers, updateClient } from "../api";
import type { ClientDTO, CompanyUserDTO } from "../api";
import AppSelect from "../components/AppSelect";
import PageLoading from "../components/PageLoading";
import { RiskBadge } from "../components/Badge";
import ToggleSwitch from "../components/ToggleSwitch";
import { chargeCounterpartyLabel } from "../lib/chargeCounterpartyLabel";
import { formatMoney } from "../lib/format";
import { isCompanyAdmin } from "../lib/roles";
import { PAYMENT_METHODS, paymentMethodLabel } from "../lib/paymentMethods";

function dash(v: string | null | undefined) {
  const s = (v ?? "").trim();
  return s.length > 0 ? s : "—";
}

export default function ClientDetail() {
  const { id } = useParams();
  const clientId = Number(id);
  const [c, setC] = useState<ClientDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toggleBusy, setToggleBusy] = useState(false);
  const [followupSaving, setFollowupSaving] = useState(false);
  const [assignBusy, setAssignBusy] = useState(false);
  const [sellers, setSellers] = useState<CompanyUserDTO[]>([]);
  const admin = isCompanyAdmin();
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
      if (admin) {
        const users = await listCompanyUsers().catch(() => [] as CompanyUserDTO[]);
        setSellers(users.filter((u) => u.role === "member" && u.is_active !== false));
      }
    } catch {
      setC(null);
      setLoadError("No se pudo cargar el cliente. ¿Existe y tienes permisos?");
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
    if (hasNoCharges(row)) return "border border-surface-border bg-surface text-ink-muted";
    if (row.overdue_count > 0) return "border border-transparent bg-[rgb(142_58_46)] text-white";
    if (row.total_owed > 0) return "border border-transparent bg-[rgb(122_84_32)] text-white";
    return "border border-transparent bg-[rgb(15_110_107)] text-white";
  };

  async function onSetActive(active: boolean) {
    if (!c) return;
    const previous = c.is_active;
    setError(null);
    setC({ ...c, is_active: active });
    setToggleBusy(true);
    try {
      await updateClient(c.id, { is_active: active });
    } catch (err: unknown) {
      setC({ ...c, is_active: previous });
      setError(err instanceof Error ? err.message : "No se pudo actualizar el estado");
    } finally {
      setToggleBusy(false);
    }
  }

  async function onFollowupChange(channel: "all" | "email" | "whatsapp" | "none") {
    if (!c) return;
    const previous = c.followup_channel;
    setError(null);
    setC({ ...c, followup_channel: channel });
    setFollowupSaving(true);
    try {
      await updateClient(c.id, { followup_channel: channel });
    } catch (err: unknown) {
      setC({ ...c, followup_channel: previous });
      setError(err instanceof Error ? err.message : "No se pudo actualizar seguimiento");
    } finally {
      setFollowupSaving(false);
    }
  }

  async function onAssignSeller(userId: number) {
    if (!c) return;
    const previousId = c.seller_user_id;
    const previousName = c.seller_name;
    const seller = sellers.find((s) => s.user_id === userId);
    setError(null);
    setC({
      ...c,
      seller_user_id: userId || null,
      seller_name: userId ? (seller?.name ?? c.seller_name) : null,
    });
    setAssignBusy(true);
    try {
      await updateClient(c.id, { assigned_to: userId });
    } catch (err: unknown) {
      setC({ ...c, seller_user_id: previousId, seller_name: previousName });
      setError(err instanceof Error ? err.message : "No se pudo asignar el vendedor");
    } finally {
      setAssignBusy(false);
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
      setC({
        ...c,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        client_code: form.client_code.trim(),
        branch_name: form.branch_name.trim(),
        payment_terms: form.payment_terms.trim(),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <PageLoading />;
  }
  if (loadError || !c) {
    return (
      <div className="max-w-lg rounded-2xl border border-danger/30 bg-surface-card p-6 text-danger shadow-soft">
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
        <div className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger whitespace-pre-wrap">{error}</div>
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
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition hover:brightness-95 sm:px-3 sm:text-xs ${clientStatusTone(c)}`}
            >
              <Eye className="h-3.5 w-3.5" strokeWidth={2} />
              {clientStatusLabel(c)}
            </Link>
            <span className="shrink-0 text-xs text-ink-muted sm:text-sm">
              Pendiente: <span className="font-semibold text-ink">{formatMoney(c.total_owed)}</span>
            </span>
            {!isClientActive(c) && (
              <span className="rounded-full border border-surface-border bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
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
            <div className="text-xs uppercase tracking-wide text-ink-muted">Vendedor</div>
            <div className="mt-1 truncate text-sm font-semibold text-ink" title={c.seller_name ?? ""}>
              {dash(c.seller_name)}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-ink-muted">Dirección</div>
            <div className="mt-1 text-sm text-ink">{dash(c.address)}</div>
          </div>
          <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-ink-muted">Método de pago</div>
            <div className="mt-1 text-sm font-semibold text-ink">{dash(paymentMethodLabel(c.payment_terms))}</div>
          </div>
        </div>

        {admin ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Asignar vendedor</h3>
            <p className="mt-1 text-xs text-ink-muted">El vendedor solo ve y opera este cliente si queda en su cartera.</p>
            <AppSelect
              className="mt-3 w-full"
              busy={assignBusy}
              placeholder="Sin asignar"
              value={c.seller_user_id ? String(c.seller_user_id) : ""}
              onChange={(next) => void onAssignSeller(Number(next) || 0)}
              options={[
                { value: "", label: "Sin asignar" },
                ...(c.seller_user_id && !sellers.some((s) => s.user_id === c.seller_user_id)
                  ? [{ value: String(c.seller_user_id), label: c.seller_name ?? "Vendedor actual" }]
                  : []),
                ...sellers.map((s) => ({ value: String(s.user_id), label: `${s.name} (${s.email})` })),
              ]}
            />
          </div>
          <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Estado del cliente</h3>
            <p className="mt-1 text-xs text-ink-muted">Activa o desactiva el cliente para cobros y recordatorios.</p>
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
              <label htmlFor="client-followup-channel" className="shrink-0 text-sm font-medium text-ink">
                Canal:
              </label>
              <AppSelect
                id="client-followup-channel"
                className="min-w-[10rem] max-w-[15.5rem] flex-1 sm:flex-initial"
                busy={followupSaving}
                value={c.followup_channel ?? "all"}
                onChange={(channel) => void onFollowupChange(channel as "all" | "email" | "whatsapp" | "none")}
                options={[
                  { value: "all", label: "WhatsApp + Correo" },
                  { value: "whatsapp", label: "Solo WhatsApp" },
                  { value: "email", label: "Solo Correo" },
                  { value: "none", label: "Sin seguimiento" },
                ]}
              />
            </div>
          </div>
        </div>
        ) : null}

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
            NOMBRE (encargado) <span className="text-danger">*</span>
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
            <AppSelect
              value={form.payment_terms}
              onChange={(payment_terms) => setForm((f) => ({ ...f, payment_terms }))}
              placeholder="Sin método"
              options={[
                { value: "", label: "Sin método" },
                ...(form.payment_terms && !PAYMENT_METHODS.some((method) => method.value === form.payment_terms)
                  ? [{ value: form.payment_terms, label: form.payment_terms }]
                  : []),
                ...PAYMENT_METHODS.map((method) => ({ value: method.value, label: method.label })),
              ]}
            />
          </label>
          <div className="flex justify-end sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
