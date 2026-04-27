import { Check, Filter, KeyRound, Pencil, Plus, UserCog, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createAdminForCompany,
  listCompanies,
  listCompanyAdmins,
  resetCompanyAdminPassword,
  updateCompanyAdmin,
  type CompanyAdminDTO,
  type CompanyDTO,
} from "../api";
import AppModal from "../components/AppModal";
import IconActionButton from "../components/IconActionButton";
import ResetPasswordModal, { type ResetPasswordModalState } from "../components/ResetPasswordModal";
import LoadingOverlay from "../components/LoadingOverlay";
import ToggleSwitch from "../components/ToggleSwitch";

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
  const MIN_LOADING_MS = 420;
  const [admins, setAdmins] = useState<CompanyAdminDTO[]>([]);
  const [companies, setCompanies] = useState<CompanyDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
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
    setTempCred(null);
    const startedAt = Date.now();
    setActionLoading(true);
    const emailUsed = form.email;
    try {
      const created = await createAdminForCompany(form);
      setForm((f) => ({ ...f, email: "", name: "" }));
      setTempCred({ email: emailUsed, temporary_password: created.temporary_password });
      await load();
      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo crear admin");
      return false;
    } finally {
      await ensureLoadingTime(startedAt);
      setActionLoading(false);
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo editar admin");
    } finally {
      setEditBusy(false);
    }
  }

  async function onToggleActive(userId: number, active: boolean) {
    setError(null);
    const startedAt = Date.now();
    setActionLoading(true);
    try {
      await updateCompanyAdmin(userId, { is_active: active });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar el estado");
    } finally {
      await ensureLoadingTime(startedAt);
      setActionLoading(false);
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

  const tableBusy = actionLoading || resetBusy || editBusy;
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
      {actionLoading && !resetPwdModal && !editModal && <LoadingOverlay message="Guardando cambios..." />}
      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {tempCred && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
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

      <section className="rounded-2xl border border-surface-border bg-white shadow-soft">
        <div className="border-b border-surface-border px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-ink">Admins registrados</h2>
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
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600"
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
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-semibold text-indigo-700">
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
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ResetPasswordModal
        state={resetPwdModal}
        loading={resetBusy}
        onClose={() => setResetPwdModal(null)}
        onGenerate={() => void runResetPassword()}
      />

      {editModal && (
        <AppModal onBackdropClick={editBusy ? undefined : () => setEditModal(null)}>
          <div className="w-full max-w-xl rounded-2xl border border-surface-border bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
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
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-600 disabled:opacity-60"
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
            <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
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
                <select
                  className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
                  value={form.company_id}
                  onChange={(e) => setForm((f) => ({ ...f, company_id: Number(e.target.value) }))}
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.is_active === false ? " (inactiva)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <Input label="Nombre" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
              <Input label="Email" type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="rounded-xl px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface" onClick={() => setOpenCreateModal(false)}>
                  Cancelar
                </button>
                <button className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600" type="submit">
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
      ? "border-emerald-100 bg-emerald-50/50 text-emerald-700"
      : tone === "danger"
        ? "border-rose-100 bg-rose-50/50 text-rose-700"
        : "border-surface-border bg-white text-ink-muted";

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
