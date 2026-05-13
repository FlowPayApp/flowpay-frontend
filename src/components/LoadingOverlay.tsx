export default function LoadingOverlay({
  message = "Cargando...",
  fixed = true,
}: {
  message?: string;
  fixed?: boolean;
}) {
  const positionClass = fixed ? "fixed inset-0 z-[130]" : "absolute inset-0 z-20";
  return (
    <div className={positionClass} role="status" aria-live="polite" aria-busy="true">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px]" />
      <div className="relative flex h-full w-full items-center justify-center">
        <div className="rounded-xl bg-surface-card/95 px-4 py-3 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            <span className="text-sm font-medium text-ink">{message}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
