/** Misma tarjeta + spinner que en overlays; reutilizable en pantallas y tablas. */
export default function LoadingIndicator({ message = "Cargando…" }: { message?: string }) {
  return (
    <div className="rounded-xl bg-surface-card/95 px-4 py-3 shadow-xl">
      <div className="flex items-center gap-3">
        <span
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand border-t-transparent"
          aria-hidden
        />
        <span className="text-sm font-medium text-ink">{message}</span>
      </div>
    </div>
  );
}
