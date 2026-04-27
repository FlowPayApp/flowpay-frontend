import { useEffect, useState } from "react";
import { Filter, Plus } from "lucide-react";
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createCharge, fetchCharges, fetchClients } from "../api";
import type { ChargeDTO, ClientDTO } from "../api";
import AppModal from "../components/AppModal";
import { StatusBadge } from "../components/Badge";
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
    return rows.filter((row) => {
      const byClientID = queryClientID <= 0 || row.client_id === queryClientID;
      const clientOk = q === "" || (row.client_name ?? "").toLowerCase().includes(q);
      const statusOk = filters.status === "all" || row.status === filters.status;
      return byClientID && clientOk && statusOk;
    });
  }, [rows, filters, queryClientID]);

  const activeClients = useMemo(() => clients.filter((c) => c.is_active !== false), [clients]);

  return (
    <div className="max-w-6xl space-y-6">
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <div className="overflow-hidden rounded-2xl border border-surface-border bg-white shadow-soft">
        <div className="border-b border-surface-border px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-ink">Cobros registrados</h2>
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
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-ink-muted">
                Cliente
                <input
                  className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink"
                  placeholder="Buscar por cliente..."
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
                Viendo cobros del cliente: <span className="font-semibold">{queryClientName || `#${queryClientID}`}</span>
              </span>
              <button
                type="button"
                className="rounded-md bg-white px-2 py-1 font-medium text-indigo-700 hover:bg-indigo-100"
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
        <table className="w-full min-w-[760px] table-fixed text-xs sm:text-sm">
          <colgroup>
            <col className="w-[32%]" />
            <col className="w-[19%]" />
            <col className="w-[20%]" />
            <col className="w-[17%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead className="bg-surface/80 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-6 py-3">Cliente</th>
              <th className="px-6 py-3">Monto</th>
              <th className="px-6 py-3">Vencimiento</th>
              <th className="px-6 py-3">Estado</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-ink-muted">
                  Cargando…
                </td>
              </tr>
            ) : (
              (filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-ink-muted">
                    No hay cobros para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-surface/40">
                    <td className="px-6 py-4 font-medium">{row.client_name}</td>
                    <td className="px-6 py-4">{formatMoney(row.amount)}</td>
                    <td className="px-6 py-4 text-ink-muted">{formatDate(row.due_date)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link className="text-sm font-medium text-brand hover:underline" to={`/cobros/${row.id}`}>
                        Abrir
                      </Link>
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
            <h2 className="text-lg font-semibold text-ink">Nuevo cobro</h2>
            <p className="mt-1 text-sm text-ink-muted">Registra un monto esperado para activar recordatorios.</p>
            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <label className="block text-sm font-medium text-ink">
                Cliente
                <select
                  required
                  className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
                  value={form.client_id}
                  onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                >
                  <option value="">Selecciona…</option>
                  {activeClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
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
