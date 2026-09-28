/** Tarjeta de carga (texto + barra indeterminada); reutilizable en pantallas, tablas y overlays. */
export default function LoadingIndicator({ message = "Cargando…" }: { message?: string }) {
  return (
    <div className="w-52 rounded-2xl border border-surface-border bg-surface-card px-4 pb-3.5 pt-3 shadow-soft animate-[auth-fade_180ms_ease-out]">
      <p className="text-center text-sm font-medium text-ink">{message}</p>
      <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-brand/10" aria-hidden>
        <span className="block h-full w-1/3 rounded-full bg-brand [will-change:transform] animate-[auth-bar_1s_cubic-bezier(0.65,0,0.35,1)_infinite]" />
      </div>
    </div>
  );
}
