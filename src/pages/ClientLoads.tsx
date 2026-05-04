import { AlertCircle, Download, RefreshCw, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  type ClientImportBatchDetail,
  type ClientImportBatchListItem,
  fetchClientImportBatch,
  fetchClientImportBatches,
  importClientsDistributorRows,
} from "../api";
import type { ImportDistributorResult } from "../api";
import AppModal from "../components/AppModal";
import LoadingOverlay from "../components/LoadingOverlay";
import { downloadClientImportTemplateXlsx, isExcelImportFile, parseClientImportExcel } from "../lib/clientImportExcel";

function sourceLabel(s: string) {
  if (s === "excel") return "Excel";
  if (s === "csv") return "CSV";
  return s;
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function ClientLoads() {
  const [rows, setRows] = useState<ClientImportBatchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [errorsModal, setErrorsModal] = useState<{
    id: number;
    loading: boolean;
    detail: ClientImportBatchDetail | null;
    err: string | null;
  } | null>(null);

  const load = useCallback(() => {
    setError(null);
    setLoading(true);
    return fetchClientImportBatches()
      .then(setRows)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "No se pudo cargar el historial"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onImportFile(file: File) {
    setImportError(null);
    setImportSummary(null);
    setImportBusy(true);
    try {
      if (!isExcelImportFile(file)) {
        throw new Error("Solo se admiten archivos Excel (.xlsx o .xls).");
      }
      const matrix = await parseClientImportExcel(file);
      const r: ImportDistributorResult = await importClientsDistributorRows(matrix, file.name);
      const parts = [`${r.created} nuevos`, `${r.updated} actualizados`];
      if (r.errors.length > 0) {
        parts.push(`${r.errors.length} filas con aviso`);
      }
      setImportSummary(parts.join(" · "));
      if (r.errors.length > 0) {
        const detail = r.errors
          .slice(0, 8)
          .map((e) => `Fila ${e.line}: ${e.message}`)
          .join("\n");
        setImportError(detail + (r.errors.length > 8 ? `\n…y ${r.errors.length - 8} más` : ""));
      }
      await load();
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : "No se pudo importar el archivo");
    } finally {
      setImportBusy(false);
    }
  }

  const openErrors = (id: number) => {
    setErrorsModal({ id, loading: true, detail: null, err: null });
    fetchClientImportBatch(id)
      .then((detail) => setErrorsModal({ id, loading: false, detail, err: null }))
      .catch((e: unknown) =>
        setErrorsModal({
          id,
          loading: false,
          detail: null,
          err: e instanceof Error ? e.message : "No se pudo cargar el detalle",
        }),
      );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {importBusy && <LoadingOverlay message="Importando…" />}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink">Carga de clientes</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Descarga la plantilla, sube tu Excel y revisa el historial de cada importación.
          </p>
          <p className="mt-2 text-sm">
            <Link to="/clients" className="font-medium text-brand hover:underline">
              ← Volver a Clientes
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-white px-4 py-2 text-sm font-medium text-ink shadow-sm hover:bg-surface"
            onClick={() => void downloadClientImportTemplateXlsx()}
          >
            <Download className="h-4 w-4" strokeWidth={2} />
            Plantilla Excel
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-white px-4 py-2 text-sm font-medium text-ink shadow-sm hover:bg-surface"
            onClick={() => importInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" strokeWidth={2} />
            Importar archivo
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void onImportFile(f);
            }}
          />
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-white px-4 py-2 text-sm font-medium text-ink shadow-sm hover:bg-surface"
            onClick={() => void load()}
            disabled={loading || importBusy}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} strokeWidth={2} />
            Actualizar historial
          </button>
        </div>
      </div>

      {importSummary && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 whitespace-pre-wrap">
          Importación: {importSummary}
        </div>
      )}
      {importError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 whitespace-pre-wrap">{importError}</div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      )}

      {loading && !rows.length ? (
        <LoadingOverlay message="Cargando historial..." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-surface-border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface/80 text-xs uppercase tracking-wide text-ink-muted">
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Origen</th>
                  <th className="px-4 py-3 font-semibold">Archivo</th>
                  <th className="px-4 py-3 font-semibold text-right">Nuevos</th>
                  <th className="px-4 py-3 font-semibold text-right">Actualizados</th>
                  <th className="px-4 py-3 font-semibold text-right">Errores</th>
                  <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-ink-muted">
                      Aún no hay cargas registradas. Usá «Importar archivo» arriba para cargar tu primera planilla Excel.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="border-b border-surface-border/80 last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 text-ink">{formatWhen(r.created_at)}</td>
                      <td className="px-4 py-3">{sourceLabel(r.source)}</td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-ink-muted" title={r.filename ?? undefined}>
                        {r.filename?.trim() ? r.filename : "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.created_count}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.updated_count}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {r.error_count > 0 ? (
                          <span className="inline-flex items-center justify-end gap-1 font-medium text-amber-700">
                            <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={2} />
                            {r.error_count}
                          </span>
                        ) : (
                          <span className="text-ink-muted">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.error_count > 0 ? (
                          <button
                            type="button"
                            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                            onClick={() => openErrors(r.id)}
                          >
                            Ver errores
                          </button>
                        ) : (
                          <span className="text-xs text-ink-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {errorsModal && (
        <AppModal onBackdropClick={() => (errorsModal.loading ? undefined : setErrorsModal(null))}>
          <div className="w-full max-w-lg rounded-2xl border border-surface-border bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-ink">Errores de la importación</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Filas que no se pudieron procesar (número de fila en el archivo según la plantilla).
            </p>
            {errorsModal.loading ? (
              <p className="mt-6 text-sm text-ink-muted">Cargando…</p>
            ) : errorsModal.err ? (
              <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{errorsModal.err}</p>
            ) : errorsModal.detail ? (
              <ul className="mt-4 max-h-[min(60vh,420px)] space-y-2 overflow-y-auto rounded-xl border border-surface-border bg-surface p-3 text-sm">
                {errorsModal.detail.errors.map((e, i) => (
                  <li key={`${e.line}-${i}`} className="border-b border-surface-border/80 pb-2 last:border-0 last:pb-0">
                    <span className="font-mono text-xs font-semibold text-brand">Fila {e.line}</span>
                    <p className="mt-0.5 text-ink">{e.message}</p>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-surface-border bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-surface"
                onClick={() => setErrorsModal(null)}
                disabled={errorsModal.loading}
              >
                Cerrar
              </button>
            </div>
          </div>
        </AppModal>
      )}
    </div>
  );
}
