import { createPortal } from "react-dom";
import LoadingIndicator from "./LoadingIndicator";

export default function LoadingOverlay({
  message = "Cargando…",
  fixed = true,
  above = false,
}: {
  message?: string;
  fixed?: boolean;
  /** Por encima de un modal. El aspecto es el mismo. */
  above?: boolean;
}) {
  const positionClass = fixed ? (above ? "fixed inset-0 z-[260]" : "fixed inset-0 z-[130]") : "absolute inset-0 z-20";
  const node = (
    <div className={`${positionClass} animate-[auth-fade_180ms_ease-out]`} role="status" aria-live="polite" aria-busy="true">
      <div className="absolute inset-0 bg-black/35" />
      <div className="relative flex h-full w-full items-center justify-center">
        <LoadingIndicator message={message} />
      </div>
    </div>
  );
  if (fixed && typeof document !== "undefined") return createPortal(node, document.body);
  return node;
}
