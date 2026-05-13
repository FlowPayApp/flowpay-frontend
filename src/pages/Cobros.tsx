import { useEffect, useMemo, useState } from "react";
import { Eye, Filter, Plus } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { createCharge, fetchCharges, fetchClients } from "../api";
import type { ChargeDTO, ClientDTO } from "../api";
import AppModal from "../components/AppModal";
import { StatusBadge } from "../components/Badge";
import { chargeCounterpartyLabel } from "../lib/chargeCounterpartyLabel";
import { formatDate, formatMoney } from "../lib/format";

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

export default function Cobros() {
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
  const rowStart = totalFiltered === 0 ? 0 : (pageClamped - 1) * pageSize + 1;
  const rowEnd = Math.min(pageClamped * pageSize, totalFiltered);

  const paginatedRows = useMemo(() => {
    const start = (pageClamped - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, pageClamped, pageSize]);

  const activeClients = useMemo(() => clients.filter((c) => c.is_active !== false), [clients]);

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 whitespace-pre-wrap">{error}</div>
      )}

      <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-soft">
        <div className="border-b border-surface-border px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-ink">Cobros registrados</h2>
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
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                Crear
              </button>
            </div>
          </div>
          {openFilters && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
                <select
                  className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink"
                  value={filters.status}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      status: e.target.value as "all" | "pending" | "paid" | "overdue",
                    }))
                  }
                >
                  <option value="all">Todos</option>
                  <option value="pending">Pendiente</option>
                  <option value="overdue">Vencido</option>
                  <option value="paid">Pagado</option>
                </select>
              </label>
            </div>
          )}
          {queryClientID > 0 && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs text-indigo-900">
              <span>
                Viendo cobros de: <span className="font-semibold">{queryClientName || `#${queryClientID}`}</span>
              </span>
              <button
                type="button"
                className="rounded-md bg-surface-card px-2 py-1 font-medium text-indigo-700 hover:bg-indigo-100 dark:text-indigo-300 dark:hover:bg-indigo-950/50"
                onClick={() => {
                  setSearchParams({});
                  setFilters((f) => ({ ...f, client: "", status: "all" }));
                }}
              >
                Ver todos
              </button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[896px] table-fixed text-xs sm:text-sm">
            <thead className="bg-surface/80 text-left text-[10px] font-semibold uppercase tracking-wide text-ink-muted sm:text-xs">
              <tr>
                <th className="min-w-[88px] whitespace-nowrap px-3 py-3 text-center">Código</th>
                <th className="min-w-[180px] whitespace-nowrap px-3 py-3">Sucursal</th>
                <th className="min-w-[120px] whitespace-nowrap px-3 py-3">Monto</th>
                <th className="min-w-[120px] whitespace-nowrap px-3 py-3">Vencimiento</th>
                <th className="min-w-[100px] whitespace-nowrap px-3 py-3">Estado</th>
                <th className="min-w-[140px] whitespace-nowrap border-l border-surface-border px-3 py-3 pl-6 text-center">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border bg-surface-card">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-ink-muted">
                    Cargando…
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
                    <td className="min-w-[140px] whitespace-nowrap border-l border-surface-border px-3 py-3 pl-6 align-middle">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <Link
                          to={`/cobros/${row.id}`}
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
        <AppModal>
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-surface-card p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-ink">Nuevo cobro</h2>
            <p className="mt-1 text-sm text-ink-muted">Registra un monto esperado para activar recordatorios.</p>
            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <label className="block text-sm font-medium text-ink">
                Sucursal
                <select
                  required
                  className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
                  value={form.client_id}
                  onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                >
                  <option value="">Selecciona…</option>
                  {activeClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {chargeCounterpartyLabel(c)}
                    </option>
                  ))}
                </select>
                {activeClients.length === 0 && (
                  <span className="mt-1 block text-xs font-normal text-amber-700">
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
    </div>
  );
}
