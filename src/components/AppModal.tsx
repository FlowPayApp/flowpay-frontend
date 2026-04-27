import { ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  children: ReactNode;
  /** Clic en el fondo oscuro (opcional). */
  onBackdropClick?: () => void;
};

export default function AppModal({ children, onBackdropClick }: Props) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[200]">
      <div
        className="absolute inset-0 bg-black/60"
        role="presentation"
        aria-hidden
        onClick={onBackdropClick}
      />
      <div className="pointer-events-none relative flex min-h-screen items-center justify-center p-4">
        <div className="pointer-events-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
