import { Check, Filter, KeyRound, Pencil, Plus, Trash2, UserCog, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createAdminForCompany,
  createPlatformAdmin,
  deleteCompanyAdmin,
  deletePlatformAdmin,
  listCompanies,
  listCompanyAdmins,
  listPlatformAdmins,
  resetCompanyAdminPassword,
  updateCompanyAdmin,
  updatePlatformAdmin,
  type CompanyAdminDTO,
  type CompanyDTO,
  type PlatformAdminDTO,
} from "../api";
import AppModal from "../components/AppModal";
import AppSelect from "../components/AppSelect";
import FilterTray from "../components/FilterTray";
import IconActionButton from "../components/IconActionButton";
import LoadingOverlay from "../components/LoadingOverlay";
import ResetPasswordModal, { type ResetPasswordModalState } from "../components/ResetPasswordModal";
import PageLoading from "../components/PageLoading";
import RowMenu from "../components/RowMenu";
import ToggleSwitch from "../components/ToggleSwitch";
import { useToast } from "../components/Toast";
import { getSessionClaims, logout } from "../lib/auth";
import { initials } from "../lib/initials";
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
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<CompanyAdminDTO[]>([]);
  const [platformAdmins, setPlatformAdmins] = useState<PlatformAdminDTO[]>([]);
  const [platformError, setPlatformError] = useState<string | null>(null);
  const [view, setView] = useState<"company" | "platform">("company");
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
  const [tempCred, setTempCred] = useState<{ email: string } | null>(null);
  const [resetPwdModal, setResetPwdModal] = useState<ResetPasswordModalState | null>(null);
  const [resetBusy, setResetBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CompanyAdminDTO | null>(null);
  const [platformDelete, setPlatformDelete] = useState<PlatformAdminDTO | null>(null);
  const [deleting, setDeleting] = useState(false);
  const loading = useMinLoading(loadingRaw);
  const [actionBusy, setActionBusy] = useState(false);

  const load = async () => {
    const [a, c, platformResult] = await Promise.all([
      listCompanyAdmins(),
      listCompanies(),
      listPlatformAdmins()
        .then((rows) => ({ rows: Array.isArray(rows) ? rows : [], error: null as string | null }))
        .catch((e: unknown) => ({
          rows: [] as PlatformAdminDTO[],
          error: e instanceof Error ? e.message : "No se pudieron cargar los superadmins",
        })),
    ]);
    const safeAdmins = Array.isArray(a) ? a : [];
    const safeCompanies = Array.isArray(c) ? c : [];
    setAdmins(safeAdmins);
    setPlatformAdmins(platformResult.rows);
    setPlatformError(platformResult.error);
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
      await createAdminForCompany(form);
      setForm((f) => ({ ...f, email: "", name: "" }));
      setTempCred({ email: emailUsed });
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

  async function leaveIfSignedOut(signedOut: boolean | undefined) {
    if (!signedOut) return false;
    await logout();
    navigate("/login", { replace: true });
    return true;
  }

  async function onCreatePlatform(e: React.FormEvent): Promise<boolean> {
    e.preventDefault();
    setError(null);
    setTempCred(null);
    setActionBusy(true);
    const emailUsed = form.email;
    try {
      await createPlatformAdmin({ email: form.email, name: form.name });
      setForm((f) => ({ ...f, email: "", name: "" }));
      setTempCred({ email: emailUsed });
      await load();
      toast.success("Superadmin creado.");
      return true;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo crear el superadmin.");
      return false;
    } finally {
      setActionBusy(false);
    }
  }

  async function onTogglePlatform(userId: number, active: boolean) {
    setError(null);
    setActionBusy(true);
    try {
      const res = await updatePlatformAdmin(userId, { is_active: active });
      if (await leaveIfSignedOut(res.signed_out)) return;
      await load();
      toast.success(active ? "Superadmin activado." : "Superadmin desactivado.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar el estado.");
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
      await resetCompanyAdminPassword(resetPwdModal.userId);
      setResetPwdModal({
        phase: "result",
        email: resetPwdModal.email,
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

  const meEmail = (getSessionClaims()?.email ?? "").trim().toLowerCase();

  const filteredPlatformAdmins = useMemo(() => {
    const qEmail = filters.email.trim().toLowerCase();
    const qName = filters.name.trim().toLowerCase();
    return platformAdmins.filter((a) => {
      const emailOk = qEmail === "" || a.email.toLowerCase().includes(qEmail);
      const nameOk = qName === "" || a.name.toLowerCase().includes(qName);
      const statusOk =
        filters.status === "all" ||
        (filters.status === "active" && a.is_active) ||
        (filters.status === "inactive" && !a.is_active);
      return emailOk && nameOk && statusOk;
    });
  }, [platformAdmins, filters]);

  const stats = useMemo(() => {
    if (view === "platform") {
      const total = platformAdmins.length;
      const active = platformAdmins.filter((a) => a.is_active).length;
      return { total, active, inactive: total - active, companiesCovered: 0 };
    }
    const total = admins.length;
    const active = admins.filter((a) => isAdminActive(a)).length;
    const inactive = total - active;
    const companiesCovered = new Set(admins.map((a) => a.company_id)).size;
    return { total, active, inactive, companiesCovered };
  }, [admins, platformAdmins, view]);

  return (
    <div className="mx-auto w-full max-w-6xl px-0">
      {loading && <PageLoading />}
      {error && <div className="mb-4 rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{error}</div>}
      {tempCred && (
        <div className="mb-4 rounded-xl border border-surface-border bg-surface-card p-4">
          <p className="text-sm font-semibold text-ink">Clave enviada</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">Ya está en camino. Al entrar hay que cambiarla.</p>
          <p className="mt-3 break-all rounded-xl border border-surface-border bg-surface px-3 py-2.5 text-sm font-medium leading-5 text-ink">
            {tempCred.email}
          </p>
        </div>
      )}

      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium tracking-tight text-ink">Admins</h1>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">
            {view === "company"
              ? "Quienes administran cada empresa."
              : "Cuentas de la plataforma. Puedes crear, desactivar o borrar, y siempre queda una activa."}
          </p>
        </div>
        <div className="inline-flex w-full rounded-xl bg-surface p-1 ring-1 ring-surface-border sm:w-auto" role="tablist" aria-label="Tipo de cuenta">
          <ViewTab
            selected={view === "company"}
            label="Admins"
            count={admins.length}
            onSelect={() => setView("company")}
          />
          <ViewTab
            selected={view === "platform"}
            label="Superadmins"
            count={platformAdmins.length}
            onSelect={() => setView("platform")}
          />
        </div>
      </div>

      <section className={`mb-4 grid gap-3 sm:grid-cols-2 ${view === "company" ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        <MiniKpi icon={<UserCog className="h-4 w-4" />} label={view === "company" ? "Admins" : "Superadmins"} value={String(stats.total)} />
        <MiniKpi icon={<Check className="h-4 w-4" />} label="Activos" value={String(stats.active)} tone="success" />
        <MiniKpi icon={<X className="h-4 w-4" />} label="Inactivos" value={String(stats.inactive)} tone="danger" />
        {view === "company" && <MiniKpi icon={<Users className="h-4 w-4" />} label="Empresas" value={String(stats.companiesCovered)} />}
      </section>

      <div className="mb-4 flex items-center justify-end gap-2">
        <div className="flex w-full items-center gap-2 sm:w-auto">
              <button
                type="button"
                aria-expanded={openFilters}
                className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium sm:flex-none ${
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
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-brand px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover sm:flex-none"
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
            <div className={`grid gap-3 sm:grid-cols-2 ${view === "company" ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
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
              {view === "company" && (
                <label className="text-sm text-ink-muted">
                  Empresa
                  <input
                    className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink"
                    placeholder="Nombre empresa..."
                    value={filters.company}
                    onChange={(e) => setFilters((f) => ({ ...f, company: e.target.value }))}
                  />
                </label>
              )}
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
        {view === "platform" ? (
          <PlatformAdminList
            rows={filteredPlatformAdmins}
            error={platformError}
            meEmail={meEmail}
            busy={tableBusy}
            activeCount={platformAdmins.filter((a) => a.is_active).length}
            onToggle={(userId, next) => void onTogglePlatform(userId, next)}
            onDelete={setPlatformDelete}
          />
        ) : (
          <>
        <ul className="divide-y divide-surface-border lg:hidden">
          {filteredAdmins.length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-ink-muted">No hay admins para los filtros aplicados.</li>
          ) : (
            filteredAdmins.map((a) => (
              <li key={a.user_id} className={`flex items-center gap-3 py-3.5 pl-4 pr-2 ${!isAdminActive(a) ? "opacity-75" : ""}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
                  {initials(a.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-ink">{a.name}</p>
                  <p className="mt-0.5 truncate text-xs text-ink-muted">{a.email}</p>
                  <p className="mt-0.5 truncate text-xs font-medium text-ink">{a.company_name}</p>
                </div>
                <ToggleSwitch
                  checked={isAdminActive(a)}
                  onCheckedChange={(next) => {
                    if (next !== isAdminActive(a)) void onToggleActive(a.user_id, next);
                  }}
                  disabled={tableBusy}
                  aria-label={isAdminActive(a) ? "Usuario activo" : "Usuario inactivo"}
                />
                <RowMenu
                  label={`Acciones de ${a.name}`}
                  items={[
                    {
                      label: "Nueva contraseña",
                      icon: KeyRound,
                      onSelect: () => setResetPwdModal({ phase: "confirm", userId: a.user_id, email: a.email }),
                    },
                    {
                      label: "Editar",
                      icon: Pencil,
                      onSelect: () =>
                        setEditModal({
                          user_id: a.user_id,
                          company_id: a.company_id,
                          company_name: a.company_name,
                          email: a.email,
                          name: a.name,
                        }),
                    },
                    { label: "Borrar", icon: Trash2, danger: true, onSelect: () => setDeleteTarget(a) },
                  ]}
                />
              </li>
            ))
          )}
        </ul>
        <div className="hidden min-w-0 overflow-x-auto lg:block">
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
          </>
        )}
      </section>

      {platformDelete && (
        <AppModal onBackdropClick={() => !deleting && setPlatformDelete(null)}>
          <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-card p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-ink">¿Borrar este superadmin?</h2>
            <p className="mt-2 text-sm text-ink-muted">
              Se borra la cuenta de <span className="font-semibold text-ink">{platformDelete.name || platformDelete.email}</span> ({platformDelete.email}).
              {platformDelete.email.trim().toLowerCase() === meEmail
                ? " Se cierra esta sesión."
                : " No se puede deshacer."}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface"
                disabled={deleting}
                onClick={() => setPlatformDelete(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                onClick={() => {
                  const target = platformDelete;
                  setDeleting(true);
                  void deletePlatformAdmin(target.user_id)
                    .then(async (res) => {
                      setPlatformDelete(null);
                      if (await leaveIfSignedOut(res.signed_out)) return;
                      await load();
                      toast.success("Superadmin borrado.");
                    })
                    .catch((err: unknown) => {
                      toast.error(err instanceof Error ? err.message : "No se pudo borrar el superadmin.");
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
              <h2 className="text-lg font-semibold text-ink">{view === "platform" ? "Crear superadmin" : "Crear admin"}</h2>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              {view === "platform"
                ? "La clave temporal llega por correo. Al entrar hay que cambiarla y activar el código de verificación."
                : "La clave temporal llega por correo. Al entrar hay que cambiarla."}
            </p>
            {actionBusy && <LoadingOverlay above message="Enviando el correo…" />}
            <form className="mt-4 space-y-3" onSubmit={async (e) => {
              const ok = view === "platform" ? await onCreatePlatform(e) : await onCreate(e);
              if (ok) setOpenCreateModal(false);
            }}>
              {view === "company" && (
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
              )}
              <Input label="Nombre" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
              <Input label="Email" type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="rounded-xl px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface" onClick={() => setOpenCreateModal(false)}>
                  Cancelar
                </button>
                <button className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover" type="submit">
                  <Plus className="h-4 w-4" />
                  {view === "platform" ? "Crear superadmin" : "Crear admin"}
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

function ViewTab({
  selected,
  label,
  count,
  onSelect,
}: {
  selected: boolean;
  label: string;
  count: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition sm:min-w-[9.5rem] sm:flex-none sm:px-4 ${
        selected ? "bg-surface-card text-ink shadow-sm" : "text-ink-muted hover:text-ink"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
          selected ? "bg-brand-soft text-brand" : "text-ink-muted"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function PlatformAdminList({
  rows,
  error,
  meEmail,
  busy,
  activeCount,
  onToggle,
  onDelete,
}: {
  rows: PlatformAdminDTO[];
  error: string | null;
  meEmail: string;
  busy: boolean;
  activeCount: number;
  onToggle: (userId: number, next: boolean) => void;
  onDelete: (row: PlatformAdminDTO) => void;
}) {
  if (error) {
    return <p className="px-5 py-10 text-center text-sm text-danger">{error}</p>;
  }
  if (rows.length === 0) {
    return <p className="px-5 py-10 text-center text-sm text-ink-muted">No hay superadmins para los filtros aplicados.</p>;
  }
  return (
    <>
      <ul className="divide-y divide-surface-border lg:hidden">
        {rows.map((a) => {
          const mine = meEmail !== "" && a.email.trim().toLowerCase() === meEmail;
          const lastActive = a.is_active && activeCount <= 1;
          return (
            <li key={a.user_id} className={`flex items-center gap-3 py-3.5 pl-4 pr-2 ${a.is_active ? "" : "opacity-75"}`}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
                {initials(a.name || a.email)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-[15px] font-semibold text-ink">{a.name || a.email}</span>
                  {mine && <YouMark />}
                </p>
                <p className="mt-0.5 truncate text-xs text-ink-muted">{a.email}</p>
              </div>
              <ToggleSwitch
                checked={a.is_active}
                disabled={busy || lastActive}
                aria-label={lastActive ? "Último superadmin activo" : a.is_active ? "Superadmin activo" : "Superadmin inactivo"}
                onCheckedChange={(next) => {
                  if (next !== a.is_active) onToggle(a.user_id, next);
                }}
              />
              {!lastActive && (
                <RowMenu
                  label={`Acciones de ${a.name || a.email}`}
                  items={[{ label: "Borrar", icon: Trash2, danger: true, onSelect: () => onDelete(a) }]}
                />
              )}
            </li>
          );
        })}
      </ul>
      <div className="hidden min-w-0 overflow-x-auto lg:block">
        <table className="w-full min-w-[640px] table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[40%]" />
            <col className="w-[32%]" />
          </colgroup>
          <thead className="bg-surface/70 text-left text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-5 py-3">Nombre</th>
              <th className="px-5 py-3">Correo</th>
              <th className="px-6 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {rows.map((a) => {
              const mine = meEmail !== "" && a.email.trim().toLowerCase() === meEmail;
              const lastActive = a.is_active && activeCount <= 1;
              return (
                <tr key={a.user_id} className={`hover:bg-surface/40 ${a.is_active ? "" : "opacity-75"}`}>
                  <td className="max-w-0 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">
                        {initials(a.name || a.email)}
                      </span>
                      <span className="line-clamp-2 break-words">{a.name || a.email}</span>
                      {mine && <YouMark />}
                    </div>
                  </td>
                  <td className="max-w-0 px-5 py-3">
                    <span className="line-clamp-2 break-all">{a.email}</span>
                  </td>
                  <td className="px-6 py-2 text-center">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <ToggleSwitch
                        checked={a.is_active}
                        disabled={busy || lastActive}
                        aria-label={lastActive ? "Último superadmin activo" : a.is_active ? "Superadmin activo" : "Superadmin inactivo"}
                        onCheckedChange={(next) => {
                          if (next !== a.is_active) onToggle(a.user_id, next);
                        }}
                      />
                      <IconActionButton
                        icon={Trash2}
                        label={lastActive ? "Tiene que quedar al menos un superadmin activo" : "Borrar superadmin"}
                        variant="danger"
                        disabled={busy || lastActive}
                        onClick={() => onDelete(a)}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function YouMark() {
  return (
    <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">Tú</span>
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
