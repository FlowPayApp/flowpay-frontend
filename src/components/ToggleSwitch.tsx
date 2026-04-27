type Props = {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
};

/** Interruptor compacto para activar / inactivar filas en tablas de plataforma. */
export default function ToggleSwitch({ checked, onCheckedChange, disabled, "aria-label": ariaLabel }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel ?? (checked ? "Activo: pulsar para inactivar" : "Inactivo: pulsar para activar")}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={[
        "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        checked ? "bg-emerald-500" : "bg-slate-300",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      ].join(" ")}
    >
      <span
        className={[
          "pointer-events-none absolute left-1 top-1 block h-5 w-5 rounded-full bg-white ring-1 ring-black/5 transition-transform duration-300 ease-in-out",
          checked ? "translate-x-5 shadow-md" : "translate-x-0 shadow-sm",
        ].join(" ")}
      />
    </button>
  );
}
