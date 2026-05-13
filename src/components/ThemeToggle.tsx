import { Moon, Sun } from "lucide-react";
import { useTheme } from "../theme";

type Props = {
  /** Solo icono (sidebar colapsado / barra móvil). */
  compact?: boolean;
  className?: string;
};

export default function ThemeToggle({ compact, className = "" }: Props) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Modo claro" : "Modo oscuro"}
      aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-lg border border-surface-border bg-surface-card text-ink-muted transition hover:bg-surface hover:text-ink",
        compact ? "h-9 w-9 shrink-0 p-0" : "px-3 py-2 text-xs font-semibold",
        className,
      ].join(" ")}
    >
      {isDark ? <Sun className="h-4 w-4 shrink-0" strokeWidth={2} /> : <Moon className="h-4 w-4 shrink-0" strokeWidth={2} />}
      {!compact && <span>{isDark ? "Claro" : "Oscuro"}</span>}
    </button>
  );
}
