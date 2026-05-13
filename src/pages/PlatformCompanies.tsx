import { Building2, Check, Filter, Pencil, Plus, UserCog, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createCompany, listCompanies, updateCompany, type CompanyDTO } from "../api";
import AppModal from "../components/AppModal";
import IconActionButton from "../components/IconActionButton";
import LoadingOverlay from "../components/LoadingOverlay";
import ToggleSwitch from "../components/ToggleSwitch";

function isCompanyActive(c: CompanyDTO): boolean {
  return c.is_active !== false;
}

export default function PlatformCompanies() {
  const MIN_LOADING_MS = 420;
  const [rows, setRows] = useState<CompanyDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openFilters, setOpenFilters] = useState(false);
  const [form, setForm] = useState({ name: "" });
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [filters, setFilters] = useState<{ name: string; status: "all" | "active" | "inactive" }>({
    name: "",
    status: "all",
  });
  

  const load = async () => {
    const data = await listCompanies();
    setRows(Array.isArray(data) ? data : []);
  };

  const ensureLoadingTime = async (startedAt: number) => {
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
    if (remaining > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, remaining));
    }
  };

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, []);

  async function onCreate(e: React.FormEvent): Promise<boolean> {
    e.preventDefault();
    setError(null);
    const startedAt = Date.now();
    setActionLoading(true);
    try {
      await createCompany(form);
      setForm({ name: "" });
      await load();
      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo crear empresa");
      return false;
    } finally {
      await ensureLoadingTime(startedAt);
      setActionLoading(false);
    }
  }

  async function onSaveEdit() {
    if (!editing) return;
    setError(null);
    const startedAt = Date.now();
    setActionLoading(true);
    try {
      await updateCompany(editing.id, { name: editing.name });
      setEditing(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo editar empresa");
    } finally {
      await ensureLoadingTime(startedAt);
      setActionLoading(false);
    }
  }

  async function onSetActive(id: number, active: boolean) {
    setError(null);
    const startedAt = Date.now();
    setActionLoading(true);
    try {
      await updateCompany(id, { is_active: active });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar el estado");
    } finally {
      await ensureLoadingTime(startedAt);
      setActionLoading(false);
    }
  }

  const filteredRows = useMemo(() => {
    const q = filters.name.trim().toLowerCase();
    return rows.filter((c) => {
      const nameOk = q === "" || c.name.toLowerCase().includes(q);
      const active = isCompanyActive(c);
      const statusOk =
        filters.status === "all" ||
        (filters.status === "active" && active) ||
        (filters.status === "inactive" && !active);
      return nameOk && statusOk;
    });
  }, [rows, filters]);

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((c) => isCompanyActive(c)).length;
    const inactive = total - active;
    const clients = rows.reduce((acc, c) => acc + (c.client_count ?? 0), 0);
    const admins = rows.reduce((acc, c) => acc + (c.admin_count ?? 0), 0);
    return { total, active, inactive, clients, admins };
  }, [rows]);

  return (
    <div className="mx-auto w-full max-w-6xl px-0">
      {actionLoading && <LoadingOverlay message="Guardando cambios..." />}
      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <section className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MiniKpi icon={<Building2 className="h-4 w-4" />} label="Empresas" value={String(stats.total)} />
        <MiniKpi icon={<Check className="h-4 w-4" />} label="Activas" value={String(stats.active)} tone="success" />
        <MiniKpi icon={<X className="h-4 w-4" />} label="Inactivas" value={String(stats.inactive)} tone="danger" />
        <MiniKpi icon={<Users className="h-4 w-4" />} label="Clientes" value={String(stats.clients)} />
        <MiniKpi icon={<UserCog className="h-4 w-4" />} label="Admins" value={String(stats.admins)} />
      </section>

      <section className="rounded-2xl border border-surface-border bg-surface-card shadow-soft">
        <div className="border-b border-surface-border px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-ink">Empresas registradas</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface hover:text-ink"
                onClick={() => setOpenFilters((v) => !v)}
              >
                <Filter className="h-4 w-4" />
                Filtros
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                onClick={() => {
                  setError(null);
                  setOpenCreateModal(true);
                }}
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                Crear
              </button>
            </div>
          </div>
          {openFilters && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-ink-muted">
                Empresa
                <input
                  className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink"
                  placeholder="Buscar por nombre..."
                  value={filters.name}
                  onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
                />
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
                  <option value="active">Activas</option>
                  <option value="inactive">Inactivas</option>
                </select>
              </label>
            </div>
          )}
        </div>
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[640px] table-fixed border-collapse text-xs sm:text-sm">
            <colgroup>
              <col className="w-[10%]" />
              <col className="w-[38%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[24%]" />
            </colgroup>
            <thead className="bg-surface/70 text-left text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 sm:px-6">ID</th>
                <th className="px-3 py-3 sm:px-5">Nombre</th>
                <th className="px-3 py-3 text-center sm:px-5">Clientes</th>
                <th className="px-3 py-3 text-center sm:px-5">Admins</th>
                <th className="px-4 py-3 text-center sm:px-6">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-ink-muted">
                    No hay empresas para los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredRows.map((c) => (
                  <tr key={c.id} className={`hover:bg-surface/40 ${!isCompanyActive(c) ? "opacity-75" : ""}`}>
                    <td className="px-4 py-3 tabular-nums sm:px-6">{c.id}</td>
                    <td className="max-w-0 px-3 py-3 sm:px-5">
                      {editing?.id === c.id ? (
                        <input
                          className="w-full min-w-0 rounded-lg border border-surface-border px-2 py-1.5 text-sm"
                          value={editing.name}
                          onChange={(e) => setEditing({ id: c.id, name: e.target.value })}
                          autoFocus
                        />
                      ) : (
                        <span className="line-clamp-2 break-words">{c.name}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums sm:px-5">{c.client_count ?? 0}</td>
                    <td className="px-3 py-3 text-center tabular-nums sm:px-5">{c.admin_count ?? 0}</td>
                    <td className="px-4 py-2 text-center sm:px-6">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <ToggleSwitch
                          checked={isCompanyActive(c)}
                          onCheckedChange={(next) => {
                            if (next !== isCompanyActive(c)) void onSetActive(c.id, next);
                          }}
                          disabled={actionLoading}
                          aria-label={isCompanyActive(c) ? "Empresa activa" : "Empresa inactiva"}
                        />
                        {editing?.id === c.id ? (
                          <>
                            <IconActionButton
                              icon={Check}
                              label="Guardar nombre"
                              variant="accent"
                              disabled={actionLoading}
                              onClick={() => void onSaveEdit()}
                            />
                            <IconActionButton
                              icon={X}
                              label="Cancelar edición"
                              disabled={actionLoading}
                              onClick={() => setEditing(null)}
                            />
                          </>
                        ) : (
                          <IconActionButton
                            icon={Pencil}
                            label="Editar nombre"
                            disabled={actionLoading}
                            onClick={() => setEditing({ id: c.id, name: c.name })}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {openCreateModal && (
        <AppModal>
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-surface-card p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-ink">Crear empresa</h2>
            </div>
            <form
              className="mt-4 space-y-3"
              onSubmit={async (e) => {
                const ok = await onCreate(e);
                if (ok) setOpenCreateModal(false);
              }}
            >
              <Input label="Nombre de empresa" value={form.name} onChange={(v) => setForm({ name: v })} />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="rounded-xl px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface" onClick={() => setOpenCreateModal(false)}>
                  Cancelar
                </button>
                <button className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700" type="submit">
                  <Plus className="h-4 w-4" />
                  Crear empresa
                </button>
              </div>
            </form>
          </div>
        </AppModal>
      )}
    </div>
  );
}

function Input(props: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block text-sm font-medium text-ink">
      {props.label}
      <input
        className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        required
      />
    </label>
  );
}

function MiniKpi({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-100 bg-emerald-50/50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/45 dark:text-emerald-300"
      : tone === "danger"
        ? "border-rose-100 bg-rose-50/50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/45 dark:text-rose-300"
        : "border-surface-border bg-surface-card text-ink-muted";

  return (
    <div className={`rounded-2xl border px-3 py-3 shadow-soft sm:px-4 ${toneClass}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="mt-1 text-xl font-semibold text-ink">{value}</div>
    </div>
  );
}
