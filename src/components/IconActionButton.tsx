import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "danger" | "accent";
};

/** Botón cuadrado solo icono con título accesible. */
export default function IconActionButton({ icon: Icon, label, onClick, disabled, variant = "default" }: Props) {
  const styles =
    variant === "danger"
      ? "border-danger/30 text-danger hover:bg-danger-soft hover:text-danger"
      : variant === "accent"
        ? "border-brand/30 text-brand hover:bg-brand-soft"
        : "border-surface-border text-ink-muted hover:bg-surface hover:text-ink";

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-surface-border bg-surface-card shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${styles}`}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}
