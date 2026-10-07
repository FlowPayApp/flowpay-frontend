import { Check, Filter, KeyRound, Pencil, Plus, Trash2, UserCog, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createAdminForCompany,
  deleteCompanyAdmin,
  listCompanies,
  listCompanyAdmins,
  resetCompanyAdminPassword,
  updateCompanyAdmin,
  type CompanyAdminDTO,
  type CompanyDTO,
} from "../api";
import AppModal from "../components/AppModal";
import AppSelect from "../components/AppSelect";
import FilterTray from "../components/FilterTray";
import IconActionButton from "../components/IconActionButton";
import ResetPasswordModal, { type ResetPasswordModalState } from "../components/ResetPasswordModal";
import PageLoading from "../components/PageLoading";
import ToggleSwitch from "../components/ToggleSwitch";
import { useToast } from "../components/Toast";
import { useMinLoading } from "../lib/useMinLoading";

function isAdminActive(a: CompanyAdminDTO): boolean {
  return a.is_active !== false;
}

type EditModalState = {
  user_id: number;
  company_id: number;
  company_name: string;
  email: string;
  name: string;
};

export default function PlatformAdmins() {
  const [admins, setAdmins] = useState<CompanyAdminDTO[]>([]);
  const [companies, setCompanies] = useState<CompanyDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const [loadingRaw, setLoadingRaw] = useState(true);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openFilters, setOpenFilters] = useState(false);
  const [editModal, setEditModal] = useState<EditModalState | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [form, setForm] = useState({ company_id: 0, email: "", name: "" });
  const [filters, setFilters] = useState<{
    company: string;
    email: string;
    name: string;
    status: "all" | "active" | "inactive";
  }>({
    company: "",
    email: "",
    name: "",
    status: "all",
  });
  const [tempCred, setTempCred] = useState<{ email: string; temporary_password: string } | null>(null);
  const [resetPwdModal, setResetPwdModal] = useState<ResetPasswordModalState | null>(null);
  const [resetBusy, setResetBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CompanyAdminDTO | null>(null);
  const [deleting, setDeleting] = useState(false);
  const loading = useMinLoading(loadingRaw);
  const [actionBusy, setActionBusy] = useState(false);

  const load = async () => {
    const [a, c] = await Promise.all([listCompanyAdmins(), listCompanies()]);
    const safeAdmins = Array.isArray(a) ? a : [];
    const safeCompanies = Array.isArray(c) ? c : [];
    setAdmins(safeAdmins);
    setCompanies(safeCompanies);
    if (safeCompanies.length > 0 && form.company_id === 0) {
      setForm((f) => ({ ...f, company_id: safeCompanies[0].id }));
    }
  };

  useEffect(() => {
    let cancelled = false;
    load()
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      })
      .finally(() => {
        if (!cancelled) setLoadingRaw(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onCreate(e: React.FormEvent): Promise<boolean> {
    e.preventDefault();
    setError(null);
    setTempCred(null);
    setActionBusy(true);
    const emailUsed = form.email;
    try {
      const created = await createAdminForCompany(form);
      setForm((f) => ({ ...f, email: "", name: "" }));
      setTempCred({ email: emailUsed, temporary_password: created.temporary_password });
      await load();
      toast.success("Admin creado.");
      return true;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo crear el admin.");
      return false;
    } finally {
      setActionBusy(false);
    }
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editModal) return;
    setEditBusy(true);
    setError(null);
    try {
      await updateCompanyAdmin(editModal.user_id, {
        email: editModal.email.trim(),
        name: editModal.name.trim(),
      });
      setEditModal(null);
      await load();
      toast.success("Admin guardado.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar el admin.");
    } finally {
      setEditBusy(false);
    }
  }

  async function onToggleActive(userId: number, active: boolean) {
    setError(null);
    setActionBusy(true);
    try {
      await updateCompanyAdmin(userId, { is_active: active });
      await load();
      toast.success(active ? "Admin activado." : "Admin desactivado.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar el estado.");
    } finally {
      setActionBusy(false);
    }
  }

  async function runResetPassword() {
    if (!resetPwdModal || resetPwdModal.phase !== "confirm") return;
    setResetBusy(true);
    setError(null);
    try {
      const res = await resetCompanyAdminPassword(resetPwdModal.userId);
      setResetPwdModal({
        phase: "result",
        email: resetPwdModal.email,
        temporary_password: res.temporary_password,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo resetear la contraseña");
      setResetPwdModal(null);
    } finally {
      setResetBusy(false);
    }
  }

  const tableBusy = actionBusy || resetBusy || editBusy || deleting;
  const filteredAdmins = useMemo(() => {
    const qCompany = filters.company.trim().toLowerCase();
    const qEmail = filters.email.trim().toLowerCase();
    const qName = filters.name.trim().toLowerCase();
    return admins.filter((a) => {
      const companyOk = qCompany === "" || a.company_name.toLowerCase().includes(qCompany);
      const emailOk = qEmail === "" || a.email.toLowerCase().includes(qEmail);
      const nameOk = qName === "" || a.name.toLowerCase().includes(qName);
      const active = isAdminActive(a);
      const statusOk =
        filters.status === "all" ||
        (filters.status === "active" && active) ||
        (filters.status === "inactive" && !active);
      return companyOk && emailOk && nameOk && statusOk;
    });
  }, [admins, filters]);

  const stats = useMemo(() => {
    const total = admins.length;
    const active = admins.filter((a) => isAdminActive(a)).length;
    const inactive = total - active;
    const companiesCovered = new Set(admins.map((a) => a.company_id)).size;
    return { total, active, inactive, companiesCovered };
  }, [admins]);

  return (
    <div className="mx-auto w-full max-w-6xl px-0">
      {loading && <PageLoading />}
      {error && <div className="mb-4 rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{error}</div>}
      {tempCred && (
        <div className="mb-4 rounded-xl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">
          Contraseña temporal: <span className="font-semibold">{tempCred.email}</span> /{" "}
          <code className="font-mono">{tempCred.temporary_password}</code>. Envíala por correo; el usuario deberá cambiarla al ingresar.
        </div>
      )}

      <section className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniKpi icon={<UserCog className="h-4 w-4" />} label="Admins" value={String(stats.total)} />
        <MiniKpi icon={<Check className="h-4 w-4" />} label="Activos" value={String(stats.active)} tone="success" />
        <MiniKpi icon={<X className="h-4 w-4" />} label="Inactivos" value={String(stats.inactive)} tone="danger" />
        <MiniKpi icon={<Users className="h-4 w-4" />} label="Empresas" value={String(stats.companiesCovered)} />
      </section>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Admins</h1>
        <div className="flex items-center gap-2">
              <button
                type="button"
                aria-expanded={openFilters}
                className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-medium ${
                  openFilters
                    ? "border-brand/40 bg-brand-soft text-brand"
                    : "border-surface-border bg-surface-card text-ink-muted hover:bg-surface hover:text-ink"
                }`}
                onClick={() => setOpenFilters((v) => !v)}
              >
                <Filter className="h-4 w-4" />
                Filtros
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover"
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
      <section className="rounded-2xl border border-surface-border bg-surface-card shadow-soft">
          <FilterTray open={openFilters}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm text-ink-muted">
                Nombre
                <input
                  className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink"
                  placeholder="Nombre admin..."
                  value={filters.name}
                  onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label className="text-sm text-ink-muted">
                Correo
                <input
                  className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink"
                  placeholder="correo@empresa.com"
                  value={filters.email}
                  onChange={(e) => setFilters((f) => ({ ...f, email: e.target.value }))}
                />
              </label>
              <label className="text-sm text-ink-muted">
                Empresa
                <input
                  className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink"
                  placeholder="Nombre empresa..."
                  value={filters.company}
                  onChange={(e) => setFilters((f) => ({ ...f, company: e.target.value }))}
                />
              </label>
              <label className="text-sm text-ink-muted">
                Estado
                <AppSelect
                  value={filters.status}
                  onChange={(status) =>
                    setFilters((f) => ({
                      ...f,
                      status: status as "all" | "active" | "inactive",
                    }))
                  }
                  options={[
                    { value: "all", label: "Todos" },
                    { value: "active", label: "Activos" },
                    { value: "inactive", label: "Inactivos" },
                  ]}
                />
              </label>
            </div>
          </FilterTray>
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[640px] table-fixed border-collapse text-xs sm:text-sm">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[28%]" />
              <col className="w-[18%]" />
              <col className="w-[32%]" />
            </colgroup>
            <thead className="bg-surface/70 text-left text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-3 py-3 sm:px-5">Nombre</th>
                <th className="px-3 py-3 sm:px-5">Correo</th>
                <th className="px-4 py-3 sm:px-6">Empresa</th>
                <th className="px-4 py-3 text-center sm:px-6">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-ink-muted">
                    No hay admins para los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((a) => (
                  <tr key={a.user_id} className={`hover:bg-surface/40 ${!isAdminActive(a) ? "opacity-75" : ""}`}>
                    <td className="max-w-0 px-3 py-3 sm:px-5">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">
                          {a.name.trim().slice(0, 1).toUpperCase() || "A"}
                        </span>
                        <span className="line-clamp-2 break-words">{a.name}</span>
                      </div>
                    </td>
                    <td className="max-w-0 px-3 py-3 sm:px-5">
                      <span className="line-clamp-2 break-all">{a.email}</span>
                    </td>
                    <td className="max-w-0 px-4 py-3 sm:px-6">
                      <span className="line-clamp-2 break-words">{a.company_name}</span>
                    </td>
                    <td className="px-4 py-2 text-center sm:px-6">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <ToggleSwitch
                          checked={isAdminActive(a)}
                          onCheckedChange={(next) => {
                            if (next !== isAdminActive(a)) void onToggleActive(a.user_id, next);
                          }}
                          disabled={tableBusy}
                          aria-label={isAdminActive(a) ? "Usuario activo" : "Usuario inactivo"}
                        />
                        <IconActionButton
                          icon={KeyRound}
                          label="Nueva contraseña temporal"
                          variant="accent"
                          disabled={tableBusy}
                          onClick={() =>
                            setResetPwdModal({ phase: "confirm", userId: a.user_id, email: a.email })
                          }
                        />
                        <IconActionButton
                          icon={Pencil}
                          label="Editar nombre y email"
                          disabled={tableBusy}
                          onClick={() =>
                            setEditModal({
                              user_id: a.user_id,
                              company_id: a.company_id,
                              company_name: a.company_name,
                              email: a.email,
                              name: a.name,
                            })
                          }
                        />
                        <IconActionButton
                          icon={Trash2}
                          label="Borrar admin"
                          variant="danger"
                          disabled={tableBusy}
                          onClick={() => setDeleteTarget(a)}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {deleteTarget && (
        <AppModal onBackdropClick={() => !deleting && setDeleteTarget(null)}>
          <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-card p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-ink">¿Borrar este admin?</h2>
            <p className="mt-2 text-sm text-ink-muted">
              Se borra la cuenta de <span className="font-semibold text-ink">{deleteTarget.name}</span> ({deleteTarget.email}). La empresa {deleteTarget.company_name} se mantiene. No se puede deshacer.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                onClick={() => {
                  const target = deleteTarget;
                  setDeleting(true);
                  void deleteCompanyAdmin(target.user_id)
                    .then(async () => {
                      setDeleteTarget(null);
                      setEditModal((current) => (current?.user_id === target.user_id ? null : current));
                      await load();
                      toast.success("Admin borrado.");
                    })
                    .catch((err: unknown) => {
                      toast.error(err instanceof Error ? err.message : "No se pudo borrar el admin.");
                    })
                    .finally(() => setDeleting(false));
                }}
              >
                {deleting ? "Borrando…" : "Borrar"}
              </button>
            </div>
          </div>
        </AppModal>
      )}

      <ResetPasswordModal
        state={resetPwdModal}
        loading={resetBusy}
        onClose={() => setResetPwdModal(null)}
        onGenerate={() => void runResetPassword()}
      />

      {editModal && (
        <AppModal onBackdropClick={editBusy ? undefined : () => setEditModal(null)}>
          <div className="w-full max-w-xl rounded-2xl border border-surface-border bg-surface-card p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-ink-muted">
                <Pencil className="h-5 w-5" strokeWidth={2} />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-ink">Editar admin</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Empresa:{" "}
                  <span className="font-medium text-ink">
                    #{editModal.company_id} — {editModal.company_name}
                  </span>
                </p>
              </div>
            </div>
            <form className="mt-5 space-y-4" onSubmit={(e) => void onSaveEdit(e)}>
              <Input
                label="Nombre"
                value={editModal.name}
                onChange={(v) => setEditModal((m) => (m ? { ...m, name: v } : m))}
              />
              <Input
                label="Email"
                type="email"
                value={editModal.email}
                onChange={(v) => setEditModal((m) => (m ? { ...m, email: v } : m))}
              />
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-xl px-4 py-2 text-sm font-medium text-ink-muted transition hover:bg-surface disabled:opacity-50"
                  onClick={() => setEditModal(null)}
                  disabled={editBusy}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover disabled:opacity-60"
                  disabled={editBusy}
                >
                  {editBusy ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </AppModal>
      )}

      {openCreateModal && (
        <AppModal>
            <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-surface-card p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-ink">Crear admin</h2>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              Se genera una contraseña temporal automática y se obliga cambio en primer ingreso.
            </p>
            <form className="mt-4 space-y-3" onSubmit={async (e) => {
              const ok = await onCreate(e);
              if (ok) setOpenCreateModal(false);
            }}>
              <label className="block text-sm font-medium text-ink">
                Empresa
                <AppSelect
                  value={String(form.company_id)}
                  onChange={(company_id) => setForm((f) => ({ ...f, company_id: Number(company_id) }))}
                  options={companies.map((c) => ({
                    value: String(c.id),
                    label: `${c.name}${c.is_active === false ? " (inactiva)" : ""}`,
                  }))}
                />
              </label>
              <Input label="Nombre" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
              <Input label="Email" type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="rounded-xl px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface" onClick={() => setOpenCreateModal(false)}>
                  Cancelar
                </button>
                <button className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover" type="submit">
                  <Plus className="h-4 w-4" />
                  Crear admin
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
      ? "border-brand/20 bg-brand-soft text-brand"
      : tone === "danger"
        ? "border-danger/20 bg-danger-soft text-danger"
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
