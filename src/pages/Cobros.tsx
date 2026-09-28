import { useEffect, useMemo, useState } from "react";
import { Eye, Filter, Loader2, Plus, Trash2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { createCharge, deleteCharge, fetchCharges, fetchClients } from "../api";
import type { ChargeDTO, ClientDTO } from "../api";
import AppModal from "../components/AppModal";
import AppSelect from "../components/AppSelect";
import { StatusBadge } from "../components/Badge";
import FilterTray from "../components/FilterTray";
import LoadingIndicator from "../components/LoadingIndicator";
import TablePagination from "../components/TablePagination";
import { chargeCounterpartyLabel } from "../lib/chargeCounterpartyLabel";
import { formatDate, formatMoney } from "../lib/format";
import { isCompanyAdmin } from "../lib/roles";

function normalizeClpInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(Number(digits));
}

function parseClpInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits);
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

function ChargeRowActions({
  charge,
  canDelete,
  onDelete,
}: {
  charge: ChargeDTO;
  canDelete: boolean;
  onDelete: (charge: ChargeDTO) => void;
}) {
  return (
    <div className="flex items-center justify-start gap-2">
      <Link
        to={`/cobros/${charge.id}`}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-surface-border bg-surface-card px-2.5 text-xs font-medium text-ink-muted transition hover:bg-surface hover:text-ink"
      >
        <Eye className="h-3.5 w-3.5" strokeWidth={2} />
        Abrir
      </Link>
      {canDelete && (
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[rgb(142_58_46)] bg-surface-card px-2.5 text-xs font-medium text-[rgb(142_58_46)] transition hover:bg-danger-soft"
          onClick={() => onDelete(charge)}
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
          Eliminar
        </button>
      )}
    </div>
  );
}

export default function Cobros() {
  const admin = isCompanyAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClientID = Number(searchParams.get("client_id") || 0);
  const queryClientName = searchParams.get("client") ?? "";
  const queryStatus = (searchParams.get("status") ?? "all") as "all" | "pending" | "paid" | "overdue";
  const [rows, setRows] = useState<ChargeDTO[]>([]);
  const [clients, setClients] = useState<ClientDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [openFilters, setOpenFilters] = useState(false);
  const [form, setForm] = useState({ client_id: "", amount: "", due_date: "" });
  const [filters, setFilters] = useState<{ client: string; status: "all" | "pending" | "paid" | "overdue" }>({
    client: queryClientName,
    status: queryStatus,
  });
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChargeDTO | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [page, setPage] = useState(1);

  const load = () =>
    fetchCharges()
      .then(setRows)
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    fetchClients().then(setClients);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createCharge({
        client_id: Number(form.client_id),
        amount: parseClpInput(form.amount),
        due_date: form.due_date,
      });
      setOpen(false);
      setForm({ client_id: "", amount: "", due_date: "" });
      setLoading(true);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo crear");
    }
  }

  const filteredRows = useMemo(() => {
    const q = filters.client.trim().toLowerCase();
    return [...rows]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .filter((row) => {
        const byClientID = queryClientID <= 0 || row.client_id === queryClientID;
        const clientOk = q === "" || (row.client_name ?? "").toLowerCase().includes(q);
        const statusOk = filters.status === "all" || row.status === filters.status;
        return byClientID && clientOk && statusOk;
      });
  }, [rows, filters, queryClientID]);

  const totalFiltered = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  useEffect(() => {
    setPage(1);
  }, [filters.client, filters.status, queryClientID]);

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

  const activeClients = useMemo(() => clients.filter((c) => c.is_active !== false), [clients]);

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger whitespace-pre-wrap">{error}</div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Cobros</h1>
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
                onClick={() => setOpen(true)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-hover"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                Crear
              </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-soft">
          <FilterTray open={openFilters}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-ink-muted">
                Sucursal
                <input
                  className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink"
                  placeholder="Buscar por sucursal…"
                  value={filters.client}
                  onChange={(e) => setFilters((f) => ({ ...f, client: e.target.value }))}
                />
              </label>
              <label className="text-sm text-ink-muted">
                Estado
                <AppSelect
                  value={filters.status}
                  onChange={(status) =>
                    setFilters((f) => ({
                      ...f,
                      status: status as "all" | "pending" | "paid" | "overdue",
                    }))
                  }
                  options={[
                    { value: "all", label: "Todos" },
                    { value: "pending", label: "Pendiente" },
                    { value: "overdue", label: "Vencido" },
                    { value: "paid", label: "Pagado" },
                  ]}
                />
              </label>
            </div>
          </FilterTray>
          {queryClientID > 0 && (
            <div className="mx-4 mb-3 mt-3 flex items-center justify-between gap-3 rounded-lg border border-brand/20 bg-brand-soft px-3 py-2 text-xs text-brand sm:mx-5">
              <span>
                Viendo cobros de: <span className="font-semibold">{queryClientName || `#${queryClientID}`}</span>
              </span>
              <button
                type="button"
                className="min-h-9 rounded-md bg-surface-card px-2 py-1 font-medium text-brand hover:bg-surface"
                onClick={() => {
                  setSearchParams({});
                  setFilters((f) => ({ ...f, client: "", status: "all" }));
                }}
              >
                Ver todos
              </button>
            </div>
          )}
        <ul className="divide-y divide-surface-border lg:hidden">
          {loading ? (
            <li className="flex justify-center px-4 py-10">
              <LoadingIndicator />
            </li>
          ) : filteredRows.length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-ink-muted">
              No hay cobros para los filtros seleccionados.
            </li>
          ) : (
            paginatedRows.map((row) => (
              <li key={row.id} className="px-4 py-4">
                <Link to={`/cobros/${row.id}`} className="block active:opacity-80">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 truncate font-semibold text-ink">{row.client_name}</p>
                    <StatusBadge status={row.status} />
                  </div>
                  <p className="mt-2 text-lg font-semibold tabular-nums text-ink">{formatMoney(row.amount)}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    Vence {formatDate(row.due_date)} · #{row.id}
                  </p>
                </Link>
                <div className="mt-3 flex justify-end">
                  <ChargeRowActions
                    charge={row}
                    canDelete={admin}
                    onDelete={(charge) => {
                      setDeleteError(null);
                      setDeleteTarget(charge);
                    }}
                  />
                </div>
              </li>
            ))
          )}
        </ul>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[960px] text-xs sm:text-sm">
            <thead className="bg-surface/80 text-left text-[10px] font-semibold uppercase tracking-wide text-ink-muted sm:text-xs">
              <tr>
                <th className="min-w-[88px] whitespace-nowrap px-3 py-3 text-center">Código</th>
                <th className="min-w-[180px] whitespace-nowrap px-3 py-3">Sucursal</th>
                <th className="min-w-[120px] whitespace-nowrap px-3 py-3">Monto</th>
                <th className="min-w-[120px] whitespace-nowrap px-3 py-3">Vencimiento</th>
                <th className="min-w-[100px] whitespace-nowrap px-3 py-3">Estado</th>
                <th className="w-px whitespace-nowrap px-3 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border bg-surface-card">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10">
                    <div className="flex justify-center">
                      <LoadingIndicator />
                    </div>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-ink-muted">
                    No hay cobros para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-surface/40">
                    <td className="whitespace-nowrap px-3 py-3 text-center font-mono text-[11px] text-ink tabular-nums">
                      {row.id}
                    </td>
                    <td className="truncate px-3 py-3 font-medium text-ink" title={row.client_name ?? ""}>
                      {row.client_name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 tabular-nums">{formatMoney(row.amount)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-ink-muted">{formatDate(row.due_date)}</td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="w-px whitespace-nowrap px-3 py-3 text-center align-middle">
                      <ChargeRowActions
                        charge={row}
                        canDelete={admin}
                        onDelete={(charge) => {
                          setDeleteError(null);
                          setDeleteTarget(charge);
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

      {deleteTarget && (
        <AppModal onBackdropClick={() => !deleting && setDeleteTarget(null)}>
          <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-card p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-ink">¿Eliminar este cobro?</h2>
            <p className="mt-2 text-sm text-ink-muted">
              Se eliminará el cobro <span className="font-semibold text-ink">#{deleteTarget.id}</span> de{" "}
              <span className="font-semibold text-ink">{deleteTarget.client_name || "esta sucursal"}</span>, con sus pagos
              y recordatorios. Esta acción no se puede deshacer.
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
                  void deleteCharge(target.id)
                    .then(() => {
                      setRows((current) => current.filter((row) => row.id !== target.id));
                      setDeleteTarget(null);
                    })
                    .catch((err: unknown) => {
                      setDeleteError(err instanceof Error ? err.message : "No se pudo eliminar el cobro.");
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

      {open && (
        <AppModal>
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-surface-card p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-ink">Nuevo cobro</h2>
            <p className="mt-1 text-sm text-ink-muted">Registra un monto esperado para activar recordatorios.</p>
            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <label className="block text-sm font-medium text-ink">
                Sucursal
                <AppSelect
                  required
                  placeholder="Selecciona…"
                  value={form.client_id}
                  onChange={(client_id) => setForm((f) => ({ ...f, client_id }))}
                  options={[
                    { value: "", label: "Selecciona…" },
                    ...activeClients.map((c) => ({ value: String(c.id), label: chargeCounterpartyLabel(c) })),
                  ]}
                />
                {activeClients.length === 0 && (
                  <span className="mt-1 block text-xs font-normal text-warn">
                    No hay clientes activos para crear cobros.
                  </span>
                )}
              </label>
              <label className="block text-sm font-medium text-ink">
                Monto (CLP)
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
                  value={form.amount}
                  placeholder="$ 0"
                  onChange={(e) => setForm((f) => ({ ...f, amount: normalizeClpInput(e.target.value) }))}
                />
                <span className="mt-1 block text-xs font-normal text-ink-muted">Se registra automáticamente en pesos chilenos.</span>
              </label>
              <label className="block text-sm font-medium text-ink">
                Vencimiento
                <input
                  required
                  type="date"
                  className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
                  value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                />
              </label>
              {error && <p className="text-sm text-danger">{error}</p>}
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
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
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
