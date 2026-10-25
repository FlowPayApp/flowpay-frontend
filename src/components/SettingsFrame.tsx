import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function SettingsFrame({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Link
        to="/configuracion"
        className="mb-4 inline-flex h-9 items-center gap-1 rounded-lg pr-2 text-sm font-semibold text-ink-muted hover:text-ink lg:hidden"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        Configuración
      </Link>
      <div className="max-lg:rounded-2xl max-lg:border max-lg:border-surface-border max-lg:bg-surface-card max-lg:p-5 max-lg:shadow-soft">
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        {hint ? <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-ink-muted">{hint}</p> : null}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
