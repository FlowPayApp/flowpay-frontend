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
      ? "border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
      : variant === "accent"
        ? "border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800"
        : "border-surface-border text-ink-muted hover:bg-surface hover:text-ink";

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${styles}`}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}
