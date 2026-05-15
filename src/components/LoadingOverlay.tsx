import LoadingIndicator from "./LoadingIndicator";

export default function LoadingOverlay({
  message = "Cargando…",
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
        <LoadingIndicator message={message} />
      </div>
    </div>
  );
}
