import { MessageCircle, RefreshCw, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchMessages, sendMessage, type MessageDTO } from "../api";

type MessagesFilters = {
  direction: "all" | "inbound" | "outbound";
  status: "all" | "sent" | "delivered" | "failed" | "received";
  search: string;
};

export default function Messages() {
  const [rows, setRows] = useState<MessageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({ to: "", message: "" });
  const [filters, setFilters] = useState<MessagesFilters>({
    direction: "all",
    status: "all",
    search: "",
  });

  const load = async () => {
    setError(null);
    try {
      const data = await fetchMessages(200, 0);
      setRows(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar mensajes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredRows = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return rows.filter((m) => {
      const directionOk = filters.direction === "all" || m.direction === filters.direction;
      const statusOk = filters.status === "all" || m.status === filters.status;
      const searchOk =
        q === "" ||
        m.from_number.toLowerCase().includes(q) ||
        m.to_number.toLowerCase().includes(q) ||
        m.content.toLowerCase().includes(q);
      return directionOk && statusOk && searchOk;
    });
  }, [rows, filters]);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const to = form.to.trim();
    const message = form.message.trim();
    if (!to || !message) {
      setError("Completa número destino y mensaje.");
      return;
    }
    setSending(true);
    try {
      await sendMessage({ to, message });
      setForm((prev) => ({ ...prev, message: "" }));
      setSuccess("Mensaje enviado.");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo enviar el mensaje");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-0">
      <section className="mb-4 rounded-2xl border border-surface-border bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h1 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <MessageCircle className="h-5 w-5" />
            Mensajes WhatsApp
          </h1>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-white px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface hover:text-ink"
            onClick={() => void load()}
            disabled={loading || sending}
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        </div>
        {error && <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-sm text-rose-700">{error}</div>}
        {success && (
          <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-sm text-emerald-700">{success}</div>
        )}
        <form className="grid gap-3 sm:grid-cols-[1fr,2fr,auto]" onSubmit={(e) => void onSend(e)}>
          <input
            className="rounded-xl border border-surface-border px-3 py-2 text-sm"
            placeholder="+569XXXXXXXX"
            value={form.to}
            onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
            disabled={sending}
            required
          />
          <input
            className="rounded-xl border border-surface-border px-3 py-2 text-sm"
            placeholder="Escribe tu mensaje..."
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            disabled={sending}
            required
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-60"
            disabled={sending}
          >
            <Send className="h-4 w-4" />
            {sending ? "Enviando..." : "Enviar"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-surface-border bg-white shadow-soft">
        <div className="grid gap-3 border-b border-surface-border px-5 py-4 sm:grid-cols-3">
          <input
            className="rounded-lg border border-surface-border px-3 py-2 text-sm"
            placeholder="Buscar por número o texto..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
          <select
            className="rounded-lg border border-surface-border px-3 py-2 text-sm"
            value={filters.direction}
            onChange={(e) => setFilters((f) => ({ ...f, direction: e.target.value as MessagesFilters["direction"] }))}
          >
            <option value="all">Todas direcciones</option>
            <option value="inbound">Entrantes</option>
            <option value="outbound">Salientes</option>
          </select>
          <select
            className="rounded-lg border border-surface-border px-3 py-2 text-sm"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as MessagesFilters["status"] }))}
          >
            <option value="all">Todos estados</option>
            <option value="received">Recibido</option>
            <option value="sent">Enviado</option>
            <option value="delivered">Entregado</option>
            <option value="failed">Fallido</option>
          </select>
        </div>
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead className="bg-surface/60 text-left text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Dirección</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Origen</th>
                <th className="px-4 py-3">Destino</th>
                <th className="px-4 py-3">Contenido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-ink-muted">
                    Cargando mensajes...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-ink-muted">
                    No hay mensajes para los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredRows.map((m) => (
                  <tr key={m.id} className="hover:bg-surface/40">
                    <td className="px-4 py-3 text-ink-muted">{formatDateTime(m.created_at)}</td>
                    <td className="px-4 py-3">{m.direction === "inbound" ? "Entrante" : "Saliente"}</td>
                    <td className="px-4 py-3">
                      <span className={statusClass(m.status)}>{m.status}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{m.from_number}</td>
                    <td className="px-4 py-3 font-mono text-xs">{m.to_number}</td>
                    <td className="px-4 py-3">{m.content}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function formatDateTime(value: string) {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(dt);
}

function statusClass(status: MessageDTO["status"]) {
  if (status === "failed") return "rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700";
  if (status === "received") return "rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700";
  if (status === "delivered") return "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700";
  return "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700";
}
