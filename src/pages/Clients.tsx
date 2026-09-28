import { Filter, Loader2, Plus, Trash2, Upload } from "lucide-react";
import OpenLink from "../components/OpenLink";
import { useMinLoading } from "../lib/useMinLoading";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createClient, deleteClient, fetchClients, listCompanyUsers } from "../api";
import { chargeCounterpartyLabel } from "../lib/chargeCounterpartyLabel";
import type { ClientDTO, CompanyUserDTO } from "../api";
import AppModal from "../components/AppModal";
import AppSelect from "../components/AppSelect";
import { RiskBadge } from "../components/Badge";
import FilterTray from "../components/FilterTray";
import PageLoading from "../components/PageLoading";
import TablePagination from "../components/TablePagination";
import { useToast } from "../components/Toast";
import { isCompanyAdmin } from "../lib/roles";
import { PAYMENT_METHODS } from "../lib/paymentMethods";

function dash(v: string | null | undefined) {
  const s = (v ?? "").trim();
  return s.length > 0 ? s : "—";
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

function ClientRowActions({ client, canDelete, onDelete }: { client: ClientDTO; canDelete: boolean; onDelete: (client: ClientDTO) => void }) {
  return (
    <div className="flex items-center justify-start gap-2">
      <OpenLink to={`/clients/${client.id}`} />
      {canDelete && (
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[rgb(142_58_46)] bg-surface-card px-2.5 text-xs font-medium text-[rgb(142_58_46)] transition hover:bg-danger-soft"
          onClick={() => onDelete(client)}
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
          Eliminar
        </button>
      )}
    </div>
  );
}

export default function Clients() {
  const nav = useNavigate();
  const admin = isCompanyAdmin();
  const [rows, setRows] = useState<ClientDTO[]>([]);
  const [sellers, setSellers] = useState<CompanyUserDTO[]>([]);
  const [loadingRaw, setLoading] = useState(true);
  const loading = useMinLoading(loadingRaw);
  const [open, setOpen] = useState(false);
  const [openFilters, setOpenFilters] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    client_code: "",
    branch_name: "",
    payment_terms: "",
    assigned_to: "",
  });
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
  const toast = useToast();
  const [deleteTarget, setDeleteTarget] = useState<ClientDTO | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [page, setPage] = useState(1);

  const load = () =>
    Promise.all([
      fetchClients(),
      admin ? listCompanyUsers().catch(() => [] as CompanyUserDTO[]) : Promise.resolve([] as CompanyUserDTO[]),
    ])
      .then(([clients, users]) => {
        setRows(clients);
        setSellers(users.filter((u) => u.role === "member" && u.is_active !== false));
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const isClientActive = (c: ClientDTO) => c.is_active !== false;

  const emptyForm = () => ({
    name: "",
    email: "",
    phone: "",
    address: "",
    client_code: "",
    branch_name: "",
    payment_terms: "",
    assigned_to: "",
  });

  function openCreateModal() {
    setForm(emptyForm());
    setError(null);
    setOpen(true);
  }

  function closeClientModal() {
    setOpen(false);
    setForm(emptyForm());
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createClient({
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        client_code: form.client_code.trim() || undefined,
        branch_name: form.branch_name.trim() || undefined,
        payment_terms: form.payment_terms.trim() || undefined,
        assigned_to: admin && form.assigned_to ? Number(form.assigned_to) : undefined,
      });
      closeClientModal();
      toast.success("Cliente creado.");
      setLoading(true);
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear el cliente.");
    }
  }

  const filteredRows = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return [...rows]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .filter((c) => {
        const searchFields = [
          c.name,
          c.email,
          c.phone,
          c.address,
          c.external_code,
          c.client_code,
          c.branch_name,
          c.payment_terms,
          c.seller_name,
        ];
        const textOk = q === "" || searchFields.some((x) => (x ?? "").toLowerCase().includes(q));
        const riskOk = filters.risk === "all" || c.risk_level === filters.risk;
        const active = isClientActive(c);
        const statusOk =
          filters.status === "all" ||
          (filters.status === "active" && active) ||
          (filters.status === "inactive" && !active);
        return textOk && riskOk && statusOk;
      });
  }, [rows, filters]);

  const totalFiltered = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.risk, filters.status]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const pageClamped = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (pageClamped - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, pageClamped, pageSize]);

  const hasNoCharges = (c: ClientDTO) => typeof c.charge_count === "number" && c.charge_count === 0;

  const clientStatusLabel = (c: ClientDTO) => {
    if (hasNoCharges(c)) return "Sin cobros";
    if (c.overdue_count > 0) return "Cobros vencidos";
    if (c.total_owed > 0) return "Cobros pendientes";
    return "Cobros realizados";
  };

  /** Filtro al abrir Cobros desde la fila del cliente */
  const clientStatusFilter = (c: ClientDTO): "overdue" | "pending" | "paid" | "all" => {
    if (hasNoCharges(c)) return "all";
    if (c.overdue_count > 0) return "overdue";
    if (c.total_owed > 0) return "pending";
    return "paid";
  };

  const clientStatusTone = (c: ClientDTO) => {
    if (hasNoCharges(c)) return "border border-surface-border bg-surface text-ink-muted";
    if (c.overdue_count > 0) return "border border-transparent bg-[rgb(142_58_46)] text-white";
    if (c.total_owed > 0) return "border border-transparent bg-[rgb(122_84_32)] text-white";
    return "border border-transparent bg-[rgb(15_110_107)] text-white";
  };

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      {error && !open && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger whitespace-pre-wrap">{error}</div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Clientes</h1>
        <div className="flex flex-wrap gap-2 sm:justify-end">
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
          {admin && (
            <Link
              to="/clients/cargas"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-surface-border bg-surface-card px-3 text-sm font-medium text-ink-muted hover:bg-surface hover:text-ink sm:flex-none"
            >
              <Upload className="h-4 w-4" strokeWidth={2} />
              Cargar
            </Link>
          )}
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-hover sm:flex-none"
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
                  placeholder="Código, sucursal, dirección…"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                />
              </label>
              <label className="text-sm text-ink-muted">
                Riesgo
                <AppSelect
                  value={filters.risk}
                  onChange={(risk) =>
                    setFilters((f) => ({
                      ...f,
                      risk: risk as "all" | "high" | "medium" | "low",
                    }))
                  }
                  options={[
                    { value: "all", label: "Todos" },
                    { value: "high", label: "Alto" },
                    { value: "medium", label: "Medio" },
                    { value: "low", label: "Bajo" },
                  ]}
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
        <ul className="divide-y divide-surface-border lg:hidden">
          {loading ? null : filteredRows.length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-ink-muted">
              No hay clientes para los filtros seleccionados.
            </li>
          ) : (
            paginatedRows.map((c) => (
              <li key={c.id} className={`px-4 py-4 ${!isClientActive(c) ? "opacity-75" : ""}`}>
                <Link to={`/clients/${c.id}`} className="block min-w-0 active:opacity-80">
                  <p className="truncate text-base font-semibold text-ink">{dash(c.branch_name)}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {dash(c.client_code)}
                    {admin ? ` · ${dash(c.seller_name)}` : ""}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-ink">{dash(c.address)}</p>
                </Link>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold ${clientStatusTone(c)}`}
                    onClick={() => {
                      const params = new URLSearchParams();
                      params.set("client_id", String(c.id));
                      params.set("client", chargeCounterpartyLabel(c));
                      params.set("status", clientStatusFilter(c));
                      nav(`/cobros?${params.toString()}`);
                    }}
                  >
                    {clientStatusLabel(c)}
                  </button>
                  <RiskBadge level={c.risk_level} compact />
                </div>
                <div className="mt-3 flex justify-end">
                  <ClientRowActions
                    client={c}
                    canDelete={admin}
                    onDelete={(row) => {
                      setDeleteError(null);
                      setDeleteTarget(row);
                    }}
                  />
                </div>
              </li>
            ))
          )}
        </ul>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="bg-surface/80 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 text-center">Código</th>
                <th className="whitespace-nowrap px-4 py-3">Sucursal</th>
                {admin ? <th className="whitespace-nowrap px-4 py-3">Vendedor</th> : null}
                <th className="px-4 py-3">Dirección</th>
                <th className="whitespace-nowrap px-4 py-3">Riesgo</th>
                <th className="whitespace-nowrap px-4 py-3">Cobros</th>
                <th className="w-px whitespace-nowrap px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border bg-surface-card">
              {loading ? null : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={admin ? 7 : 6} className="px-4 py-10 text-center text-ink-muted">
                    No hay clientes para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((c) => (
                  <tr key={c.id} className={`hover:bg-surface/40 ${!isClientActive(c) ? "opacity-75" : ""}`}>
                    <td className="whitespace-nowrap px-4 py-3 text-center font-mono text-xs text-ink">
                      {dash(c.client_code)}
                    </td>
                    <td className="max-w-[16rem] truncate px-4 py-3 font-medium text-ink" title={c.branch_name ?? ""}>
                      {dash(c.branch_name)}
                    </td>
                    {admin ? (
                      <td className="max-w-[14rem] truncate px-4 py-3 text-ink-muted" title={c.seller_name ?? ""}>
                        {dash(c.seller_name)}
                      </td>
                    ) : null}
                    <td className="max-w-[20rem] truncate px-4 py-3 text-ink-muted" title={c.address ?? ""}>
                      {dash(c.address)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <RiskBadge level={c.risk_level} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-middle">
                      <button
                        type="button"
                        className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold transition hover:brightness-95 ${clientStatusTone(c)}`}
                        onClick={() => {
                          const params = new URLSearchParams();
                          params.set("client_id", String(c.id));
                          params.set("client", chargeCounterpartyLabel(c));
                          params.set("status", clientStatusFilter(c));
                          nav(`/cobros?${params.toString()}`);
                        }}
                      >
                        {clientStatusLabel(c)}
                      </button>
                    </td>
                    <td className="w-px whitespace-nowrap px-4 py-3 text-center align-middle">
                      <ClientRowActions
                        client={c}
                        canDelete={admin}
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
        <AppModal onBackdropClick={closeClientModal}>
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-surface-card p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-ink">Nuevo cliente</h2>
            <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
              <label className="block text-sm font-medium text-ink">
                CODIGO
                <input
                  className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
                  value={form.client_code}
                  onChange={(e) => setForm((f) => ({ ...f, client_code: e.target.value }))}
                />
              </label>
              <label className="block text-sm font-medium text-ink">
                SUCURSAL
                <input
                  className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
                  value={form.branch_name}
                  onChange={(e) => setForm((f) => ({ ...f, branch_name: e.target.value }))}
                />
              </label>
              <label className="block text-sm font-medium text-ink sm:col-span-2">
                NOMBRE <span className="text-danger">*</span>
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
              <label className="block text-sm font-medium text-ink">
                MPAGO · Método de pago
                <AppSelect
                  required
                  placeholder="Selecciona"
                  value={form.payment_terms}
                  onChange={(payment_terms) => setForm((f) => ({ ...f, payment_terms }))}
                  options={PAYMENT_METHODS.map((method) => ({ value: method.value, label: method.label }))}
                />
              </label>
              {admin ? (
                <label className="block text-sm font-medium text-ink sm:col-span-2">
                  Vendedor
                  <AppSelect
                    placeholder="Sin asignar"
                    value={form.assigned_to}
                    onChange={(assigned_to) => setForm((f) => ({ ...f, assigned_to }))}
                    options={[
                      { value: "", label: "Sin asignar" },
                      ...sellers.map((s) => ({ value: String(s.user_id), label: `${s.name} (${s.email})` })),
                    ]}
                  />
                </label>
              ) : null}
              {error && <p className="sm:col-span-2 text-sm text-danger">{error}</p>}
              <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
                <button
                  type="button"
                  className="rounded-xl px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface"
                  onClick={closeClientModal}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-11 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </AppModal>
      )}

      {deleteTarget && (
        <AppModal onBackdropClick={() => !deleting && setDeleteTarget(null)}>
          <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-card p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-ink">¿Eliminar este cliente?</h2>
            <p className="mt-2 text-sm text-ink-muted">
              Se eliminará <span className="font-semibold text-ink">{chargeCounterpartyLabel(deleteTarget)}</span> y{" "}
              <span className="font-semibold text-ink">todos los cobros</span> asociados. Esta acción no se puede deshacer.
            </p>
            {deleteError && <p className="mt-3 text-sm text-danger">{deleteError}</p>}
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
                className="inline-flex items-center gap-2 bg-danger text-sm font-semibold text-white disabled:opacity-60"
                onClick={() => {
                  const target = deleteTarget;
                  setDeleting(true);
                  setDeleteError(null);
                  void deleteClient(target.id)
                    .then(() => {
                      setRows((current) => current.filter((row) => row.id !== target.id));
                      setDeleteTarget(null);
                      toast.success("Cliente eliminado.");
                    })
                    .catch((err: unknown) => {
                      toast.error(err instanceof Error ? err.message : "No se pudo eliminar el cliente.");
                    })
                    .finally(() => setDeleting(false));
                }}
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Eliminar definitivamente
              </button>
            </div>
          </div>
        </AppModal>
      )}
      {loading && <PageLoading />}
    </div>
  );
}
