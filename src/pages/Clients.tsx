import { Eye, Filter, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createClient, fetchClients, listCompanyUsers } from "../api";
import { chargeCounterpartyLabel } from "../lib/chargeCounterpartyLabel";
import type { ClientDTO, CompanyUserDTO } from "../api";
import AppModal from "../components/AppModal";
import { RiskBadge } from "../components/Badge";
import LoadingIndicator from "../components/LoadingIndicator";
import { isCompanyAdmin } from "../lib/roles";

function dash(v: string | null | undefined) {
  const s = (v ?? "").trim();
  return s.length > 0 ? s : "—";
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export default function Clients() {
  const nav = useNavigate();
  const admin = isCompanyAdmin();
  const [rows, setRows] = useState<ClientDTO[]>([]);
  const [sellers, setSellers] = useState<CompanyUserDTO[]>([]);
  const [loading, setLoading] = useState(true);
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
      setLoading(true);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo crear");
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
  const rowStart = totalFiltered === 0 ? 0 : (pageClamped - 1) * pageSize + 1;
  const rowEnd = Math.min(pageClamped * pageSize, totalFiltered);

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
    if (hasNoCharges(c)) return "bg-slate-50 text-slate-600 border-slate-200";
    if (c.overdue_count > 0) return "bg-rose-50 text-rose-700 border-rose-200";
    if (c.total_owed > 0) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  };

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      {error && !open && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 whitespace-pre-wrap">{error}</div>
      )}
      <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-soft">
        <div className="border-b border-surface-border px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-ink">Clientes registrados</h2>
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
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
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
                  placeholder="Código, sucursal, dirección…"
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] table-fixed text-xs sm:text-sm">
            <thead className="bg-surface/80 text-left text-[10px] font-semibold uppercase tracking-wide text-ink-muted sm:text-xs">
              <tr>
                <th className="min-w-[96px] whitespace-nowrap px-3 py-3 text-center">Código</th>
                <th className="min-w-[140px] whitespace-nowrap px-3 py-3">Sucursal</th>
                {admin ? <th className="min-w-[140px] whitespace-nowrap px-3 py-3">Vendedor</th> : null}
                <th className="min-w-[180px] px-3 py-3">Dirección</th>
                <th className="min-w-[88px] whitespace-nowrap px-3 py-3">Riesgo</th>
                <th className="min-w-[176px] whitespace-nowrap px-3 py-3 pr-5">Cobros</th>
                <th className="min-w-[140px] whitespace-nowrap border-l border-surface-border px-3 py-3 pl-6 text-center">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border bg-surface-card">
              {loading ? (
                <tr>
                  <td colSpan={admin ? 7 : 6} className="px-4 py-10">
                    <div className="flex justify-center">
                      <LoadingIndicator />
                    </div>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={admin ? 7 : 6} className="px-4 py-10 text-center text-ink-muted">
                    No hay clientes para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((c) => (
                  <tr key={c.id} className={`hover:bg-surface/40 ${!isClientActive(c) ? "opacity-75" : ""}`}>
                    <td className="whitespace-nowrap px-3 py-3 text-center font-mono text-[11px] text-ink">
                      {dash(c.client_code)}
                    </td>
                    <td className="truncate px-3 py-3 font-medium text-ink" title={c.branch_name ?? ""}>
                      {dash(c.branch_name)}
                    </td>
                    {admin ? (
                      <td className="truncate px-3 py-3 text-ink-muted" title={c.seller_name ?? ""}>
                        {dash(c.seller_name)}
                      </td>
                    ) : null}
                    <td className="truncate px-3 py-3 text-ink-muted" title={c.address ?? ""}>
                      {dash(c.address)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <RiskBadge level={c.risk_level} />
                    </td>
                    <td className="min-w-[176px] whitespace-nowrap px-3 py-3 pr-5 align-middle">
                      <button
                        type="button"
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold transition hover:brightness-95 ${clientStatusTone(c)}`}
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
                    <td className="min-w-[140px] whitespace-nowrap border-l border-surface-border px-3 py-3 pl-6 align-middle">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <Link
                          to={`/clients/${c.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-surface-border px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:bg-surface hover:text-ink"
                        >
                          <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                          Abrir
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && totalFiltered > 0 && (
          <div className="flex flex-col gap-3 border-t border-surface-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-muted">
              Mostrando{" "}
              <span className="font-medium text-ink">
                {rowStart}–{rowEnd}
              </span>{" "}
              de <span className="font-medium text-ink">{totalFiltered}</span>
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-ink-muted">
                Filas por página
                <select
                  className="rounded-lg border border-surface-border bg-surface-card px-2 py-1.5 text-sm text-ink"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value) as PageSize)}
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded-lg border border-surface-border px-3 py-1.5 text-sm font-medium text-ink-muted hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={pageClamped <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </button>
                <span className="px-2 text-sm text-ink-muted">
                  Página {pageClamped} / {totalPages}
                </span>
                <button
                  type="button"
                  className="rounded-lg border border-surface-border px-3 py-1.5 text-sm font-medium text-ink-muted hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={pageClamped >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
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
                NOMBRE <span className="text-rose-600">*</span>
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
                <input
                  className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
                  value={form.payment_terms}
                  onChange={(e) => setForm((f) => ({ ...f, payment_terms: e.target.value }))}
                  placeholder="Ej. CONTADO"
                />
              </label>
              {admin ? (
                <label className="block text-sm font-medium text-ink sm:col-span-2">
                  Vendedor
                  <select
                    className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm text-ink"
                    value={form.assigned_to}
                    onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
                  >
                    <option value="">Sin asignar</option>
                    {sellers.map((s) => (
                      <option key={s.user_id} value={s.user_id}>
                        {s.name} ({s.email})
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {error && <p className="sm:col-span-2 text-sm text-rose-600">{error}</p>}
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
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </AppModal>
      )}
    </div>
  );
}
