import { Filter, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient, fetchClients, updateClient } from "../api";
import type { ClientDTO } from "../api";
import AppModal from "../components/AppModal";
import { RiskBadge } from "../components/Badge";
import LoadingOverlay from "../components/LoadingOverlay";
import ToggleSwitch from "../components/ToggleSwitch";

export default function Clients() {
  const nav = useNavigate();
  const MIN_LOADING_MS = 380;
  const [rows, setRows] = useState<ClientDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [openFilters, setOpenFilters] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [filters, setFilters] = useState<{
    search: string;
    risk: "all" | "high" | "medium" | "low";
    status: "all" | "active" | "inactive";
  }>({
    search: "",
    risk: "all",
    status: "all",
  });
  const [error, setError] = useState<string | null>(null);
  const [followupModal, setFollowupModal] = useState<{
    id: number;
    clientName: string;
    channel: "all" | "email" | "whatsapp" | "none";
  } | null>(null);
  const [followupSaving, setFollowupSaving] = useState(false);

  const load = () =>
    fetchClients()
      .then(setRows)
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const ensureLoadingTime = async (startedAt: number) => {
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
    if (remaining > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, remaining));
    }
  };

  const isClientActive = (c: ClientDTO) => c.is_active !== false;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createClient(form);
      setOpen(false);
      setForm({ name: "", email: "", phone: "" });
      setLoading(true);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo crear");
    }
  }

  async function onSetActive(id: number, active: boolean) {
    setError(null);
    const startedAt = Date.now();
    setActionLoading(true);
    try {
      await updateClient(id, { is_active: active });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el estado");
    } finally {
      await ensureLoadingTime(startedAt);
      setActionLoading(false);
    }
  }

  async function onSetFollowup(id: number, channel: "all" | "email" | "whatsapp" | "none") {
    setError(null);
    setFollowupSaving(true);
    try {
      await updateClient(id, { followup_channel: channel });
      await load();
      setFollowupModal(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar seguimiento");
    } finally {
      setFollowupSaving(false);
    }
  }

  const filteredRows = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return [...rows]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .filter((c) => {
        const textOk =
          q === "" ||
          c.name.toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q) ||
          (c.phone ?? "").toLowerCase().includes(q);
        const riskOk = filters.risk === "all" || c.risk_level === filters.risk;
        const active = isClientActive(c);
        const statusOk =
          filters.status === "all" ||
          (filters.status === "active" && active) ||
          (filters.status === "inactive" && !active);
        return textOk && riskOk && statusOk;
      });
  }, [rows, filters]);

  const clientStatusLabel = (c: ClientDTO) => {
    if (c.overdue_count > 0) return "Cobros vencidos";
    if (c.total_owed > 0) return "Cobros pendientes";
    return "Cobros realizados";
  };

  const clientStatusFilter = (c: ClientDTO): "overdue" | "pending" | "paid" => {
    if (c.overdue_count > 0) return "overdue";
    if (c.total_owed > 0) return "pending";
    return "paid";
  };

  const clientStatusTone = (c: ClientDTO) => {
    if (c.overdue_count > 0) return "bg-rose-50 text-rose-700 border-rose-200";
    if (c.total_owed > 0) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  };

  return (
    <div className="max-w-6xl space-y-6">
      {actionLoading && <LoadingOverlay message="Actualizando cliente..." />}
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      <div className="overflow-hidden rounded-2xl border border-surface-border bg-white shadow-soft">
        <div className="border-b border-surface-border px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-ink">Clientes registrados</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-white px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface hover:text-ink"
                onClick={() => setOpenFilters((v) => !v)}
              >
                <Filter className="h-4 w-4" />
                Filtros
              </button>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                Crear
              </button>
            </div>
          </div>
          {openFilters && (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="text-sm text-ink-muted">
                Buscar
                <input
                  className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink"
                  placeholder="Nombre, email o teléfono..."
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                />
              </label>
              <label className="text-sm text-ink-muted">
                Riesgo
                <select
                  className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink"
                  value={filters.risk}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      risk: e.target.value as "all" | "high" | "medium" | "low",
                    }))
                  }
                >
                  <option value="all">Todos</option>
                  <option value="high">Alto</option>
                  <option value="medium">Medio</option>
                  <option value="low">Bajo</option>
                </select>
              </label>
              <label className="text-sm text-ink-muted">
                Estado
                <select
                  className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink"
                  value={filters.status}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      status: e.target.value as "all" | "active" | "inactive",
                    }))
                  }
                >
                  <option value="all">Todos</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                </select>
              </label>
            </div>
          )}
        </div>
        <table className="w-full min-w-[940px] table-fixed text-xs sm:text-sm">
          <colgroup>
            <col className="w-[23%]" />
            <col className="w-[26%]" />
            <col className="w-[15%]" />
            <col className="w-[18%]" />
            <col className="w-[18%]" />
          </colgroup>
          <thead className="bg-surface/80 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">Riesgo</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-muted">
                  Cargando…
                </td>
              </tr>
            ) : (
              (filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-ink-muted">
                    No hay clientes para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredRows.map((c) => (
                  <tr key={c.id} className="hover:bg-surface/40">
                    <td className="px-4 py-4 font-medium">{c.name}</td>
                    <td className="px-4 py-4 text-ink-muted">
                      <div>{c.email}</div>
                      <div className="text-xs">{c.phone}</div>
                    </td>
                    <td className="px-4 py-4">
                      <RiskBadge level={c.risk_level} />
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold transition hover:brightness-95 ${clientStatusTone(c)}`}
                        onClick={() => {
                          const params = new URLSearchParams();
                          params.set("client_id", String(c.id));
                          params.set("client", c.name);
                          params.set("status", clientStatusFilter(c));
                          nav(`/cobros?${params.toString()}`);
                        }}
                      >
                        {clientStatusLabel(c)}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <ToggleSwitch
                          checked={isClientActive(c)}
                          onCheckedChange={(value) => void onSetActive(c.id, value)}
                          aria-label={`Cambiar estado de cliente ${c.name}`}
                        />
                        <button
                          type="button"
                          className="rounded-lg border border-surface-border px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface hover:text-ink"
                          onClick={() =>
                            setFollowupModal({
                              id: c.id,
                              clientName: c.name,
                              channel: c.followup_channel ?? "all",
                            })
                          }
                        >
                          Seguimiento
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ))
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <AppModal>
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-ink">Nuevo cliente</h2>
            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <label className="block text-sm font-medium text-ink">
                Nombre
                <input
                  required
                  className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label className="block text-sm font-medium text-ink">
                Email
                <input
                  type="email"
                  className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </label>
              <label className="block text-sm font-medium text-ink">
                Teléfono
                <input
                  className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </label>
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-xl px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </AppModal>
      )}

      {followupModal && (
        <AppModal onBackdropClick={followupSaving ? undefined : () => setFollowupModal(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-ink">Seguimiento automático</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Configura cómo hacer seguimiento a <span className="font-medium text-ink">{followupModal.clientName}</span>.
            </p>

            <label className="mt-4 block text-sm font-medium text-ink">
              Canal automático
              <select
                className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
                value={followupModal.channel}
                disabled={followupSaving}
                onChange={(e) =>
                  setFollowupModal((prev) =>
                    prev
                      ? {
                          ...prev,
                          channel: e.target.value as "all" | "email" | "whatsapp" | "none",
                        }
                      : prev,
                  )
                }
              >
                <option value="all">WhatsApp + Correo</option>
                <option value="whatsapp">Solo WhatsApp</option>
                <option value="email">Solo Correo</option>
                <option value="none">Sin seguimiento</option>
              </select>
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface disabled:opacity-50"
                disabled={followupSaving}
                onClick={() => setFollowupModal(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-60"
                disabled={followupSaving}
                onClick={() => void onSetFollowup(followupModal.id, followupModal.channel)}
              >
                {followupSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </AppModal>
      )}
    </div>
  );
}
