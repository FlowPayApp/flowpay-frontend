import LoadingIndicator from "./LoadingIndicator";

/** Estado de carga al abrir una pantalla (mismo aspecto que el overlay de ruta, sin velo). */
export default function PageLoading({ message, className }: { message?: string; className?: string }) {
  return (
    <div
      className={`flex min-h-[40vh] w-full items-center justify-center ${className ?? ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <LoadingIndicator message={message} />
    </div>
  );
}
