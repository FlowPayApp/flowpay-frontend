import LoadingIndicator from "./LoadingIndicator";

/** Estado de carga al abrir una pantalla (mismo aspecto que el overlay de ruta, sin velo). */
export default function PageLoading({ message, className }: { message?: string; className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] top-[calc(3.5rem+env(safe-area-inset-top))] flex items-center justify-center lg:inset-y-0 ${className ?? ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <LoadingIndicator message={message} />
    </div>
  );
}
