import { FormEvent, useEffect, useMemo, useState } from "react";
import { Eye, Filter, Loader2, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createCompanyUser, deleteCompanyUser, listCompanyUsers, type CompanyUserDTO } from "../api";
import AppModal from "../components/AppModal";
import AppSelect from "../components/AppSelect";
import FilterTray from "../components/FilterTray";
import LoadingIndicator from "../components/LoadingIndicator";
import TablePagination from "../components/TablePagination";
import PasswordInput from "../components/PasswordInput";
import { getSessionClaims } from "../lib/auth";
import { getPasswordPolicyError, PASSWORD_POLICY_HINT } from "../lib/passwordPolicy";
import { roleLabel } from "../lib/roles";

type Role = "admin" | "member";

const ROLE_OPTIONS = [
  { value: "member", label: "Vendedor (member)" },
  { value: "admin", label: "Admin" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

function RowActions({
  user,
  selfId,
  onDelete,
}: {
  user: CompanyUserDTO;
  selfId: number;
  onDelete: (user: CompanyUserDTO) => void;
}) {
  return (
    <div className="flex items-center justify-start gap-2">
      <Link
        to={`/equipo/${user.user_id}`}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-surface-border bg-surface-card px-2.5 text-xs font-medium text-ink-muted transition hover:bg-surface hover:text-ink"
      >
        <Eye className="h-3.5 w-3.5" strokeWidth={2} />
        Abrir
      </Link>
      {user.user_id !== selfId && (
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[rgb(142_58_46)] bg-surface-card px-2.5 text-xs font-medium text-[rgb(142_58_46)] transition hover:bg-danger-soft"
          onClick={() => onDelete(user)}
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
          Eliminar
        </button>
      )}
    </div>
  );
}

export default function Equipo() {
  const selfId = getSessionClaims()?.uid ?? 0;
  const [rows, setRows] = useState<CompanyUserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CompanyUserDTO | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "member" as Role });
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [page, setPage] = useState(1);
  const [openFilters, setOpenFilters] = useState(false);
  const [filters, setFilters] = useState<{
    search: string;
    role: "all" | Role;
    status: "all" | "active" | "inactive";
  }>({ search: "", role: "all", status: "all" });

  const filteredRows = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return rows.filter((user) => {
      const textOk =
        q === "" ||
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q);
      const roleOk = filters.role === "all" || user.role === filters.role;
      const statusOk =
        filters.status === "all" ||
        (filters.status === "active" && user.is_active) ||
        (filters.status === "inactive" && !user.is_active);
      return textOk && roleOk && statusOk;
    });
  }, [rows, filters]);

  const totalFiltered = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.role, filters.status]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const pageClamped = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (pageClamped - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, pageClamped, pageSize]);

  const load = () => {
    setLoading(true);
    setError(null);
    return listCompanyUsers()
      .then(setRows)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "No se pudo cargar el equipo"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void load();
  }, []);

  const closeModal = () => {
    setOpen(false);
    setForm({ email: "", password: "", name: "", role: "member" });
    setError(null);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const pwdErr = getPasswordPolicyError(form.password);
    if (pwdErr) {
      setError(pwdErr);
      return;
    }
    try {
      await createCompanyUser(form);
      closeModal();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el usuario");
    }
  };

  const onConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteCompanyUser(deleteTarget.user_id);
      setRows((current) => current.filter((row) => row.user_id !== deleteTarget.user_id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "No se pudo eliminar el usuario");
    } finally {
      setDeleting(false);
    }
  };

  const emptyLabel = rows.length === 0 ? "Todavía no hay usuarios." : "No hay personas para los filtros seleccionados.";

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      {error && !open && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{error}</div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Equipo</h1>
        <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  type="button"
                  aria-expanded={openFilters}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium ${
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
                  onClick={() => {
                    setError(null);
                    setOpen(true);
                  }}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-hover"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.5} />
                  Crear
                </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-soft">
          <FilterTray open={openFilters}>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm text-ink-muted">
                Buscar
                <input
                  className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink"
                  placeholder="Nombre o email"
                  value={filters.search}
                  onChange={(e) => setFilters((current) => ({ ...current, search: e.target.value }))}
                />
              </label>
              <label className="text-sm text-ink-muted">
                Rol
                <AppSelect
                  value={filters.role}
                  onChange={(role) => setFilters((current) => ({ ...current, role: role as "all" | Role }))}
                  options={[
                    { value: "all", label: "Todos" },
                    { value: "admin", label: "Admin" },
                    { value: "member", label: "Vendedor" },
                  ]}
                />
              </label>
              <label className="text-sm text-ink-muted">
                Estado
                <AppSelect
                  value={filters.status}
                  onChange={(status) =>
                    setFilters((current) => ({
                      ...current,
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
        <div className="divide-y divide-surface-border lg:hidden">
          {loading ? (
            <div className="px-5 py-8">
              <LoadingIndicator message="Cargando equipo…" />
            </div>
          ) : pageRows.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-muted">{emptyLabel}</p>
          ) : (
            pageRows.map((u) => (
              <div key={u.user_id} className="flex items-start justify-between gap-3 px-4 py-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{u.name}</p>
                  <p className="truncate text-sm text-ink-muted">{u.email}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {roleLabel(u.role)} · {u.is_active ? "Activo" : "Inactivo"}
                  </p>
                </div>
                <RowActions
                  user={u}
                  selfId={selfId}
                  onDelete={(row) => {
                    setDeleteError(null);
                    setDeleteTarget(row);
                  }}
                />
              </div>
            ))
          )}
        </div>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-surface/80 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Estado</th>
                <th className="w-px whitespace-nowrap px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8">
                    <LoadingIndicator message="Cargando equipo…" />
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-ink-muted">
                    {emptyLabel}
                  </td>
                </tr>
              ) : (
                pageRows.map((u) => (
                  <tr key={u.user_id} className="hover:bg-surface/40">
                    <td className="px-4 py-3 font-medium text-ink">{u.name}</td>
                    <td className="px-4 py-3 text-ink-muted">{u.email}</td>
                    <td className="px-4 py-3">{roleLabel(u.role)}</td>
                    <td className="px-4 py-3">{u.is_active ? "Activo" : "Inactivo"}</td>
                    <td className="w-px whitespace-nowrap px-4 py-3 text-center">
                      <RowActions
                        user={u}
                        selfId={selfId}
                        onDelete={(row) => {
                          setDeleteError(null);
                          setDeleteTarget(row);
                        }}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && (
          <TablePagination
            page={pageClamped}
            pageSize={pageSize}
            total={totalFiltered}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next as PageSize);
              setPage(1);
            }}
          />
        )}
      </div>

      {open && (
        <AppModal onBackdropClick={closeModal}>
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-surface-card p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-ink">Nuevo usuario</h2>
            <p className="mt-1 text-sm text-ink-muted">
              El rol vendedor corresponde a <span className="font-medium text-ink">member</span> en el sistema.
            </p>
            <form className="mt-5 grid gap-4" onSubmit={onSubmit}>
              <label className="block text-sm font-medium text-ink">
                Nombre <span className="text-danger">*</span>
                <input
                  required
                  className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label className="block text-sm font-medium text-ink">
                Email <span className="text-danger">*</span>
                <input
                  required
                  type="email"
                  className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </label>
              <PasswordInput
                label="Contraseña"
                required
                value={form.password}
                onChange={(password) => setForm((f) => ({ ...f, password }))}
                autoComplete="new-password"
              />
              <p className="text-xs text-ink-muted">{PASSWORD_POLICY_HINT}</p>
              <label className="block text-sm font-medium text-ink">
                Rol
                <AppSelect
                  value={form.role}
                  onChange={(role) => setForm((f) => ({ ...f, role: role as Role }))}
                  options={ROLE_OPTIONS}
                />
              </label>
              {error && <p className="text-sm text-danger">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-xl px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface"
                  onClick={closeModal}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
                >
                  Crear
                </button>
              </div>
            </form>
          </div>
        </AppModal>
      )}

      {deleteTarget && (
        <AppModal onBackdropClick={() => !deleting && setDeleteTarget(null)}>
          <div className="w-full max-w-md rounded-2xl bg-surface-card p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-ink">Eliminar del equipo</h2>
            <p className="mt-2 text-sm text-ink-muted">
              {deleteTarget.name} deja de pertenecer a la empresa. Sus clientes quedan asignados a ti. Esta acción no se puede deshacer.
            </p>
            {deleteError && <p className="mt-3 text-sm text-danger">{deleteError}</p>}
            <div className="mt-5 flex justify-end gap-2">
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
                className="inline-flex items-center gap-2 bg-danger text-sm font-semibold text-white disabled:opacity-60"
                onClick={() => void onConfirmDelete()}
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Eliminar definitivamente
              </button>
            </div>
          </div>
        </AppModal>
      )}
    </div>
  );
}
