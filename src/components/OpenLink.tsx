import { Eye } from "lucide-react";
import { Link } from "react-router-dom";

/** Botón "Abrir" de las tablas; mismo aspecto en todas las pantallas. */
export default function OpenLink({ to, label = "Ver Detalles" }: { to: string; label?: string }) {
  return (
    <Link
      to={to}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-surface-border bg-surface-card px-2.5 text-xs font-medium text-ink-muted transition hover:bg-surface hover:text-ink"
    >
      <Eye className="h-3.5 w-3.5" strokeWidth={2} />
      {label}
    </Link>
  );
}
