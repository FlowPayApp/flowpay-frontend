import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export type AppSelectOption = { value: string; label: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: AppSelectOption[];
  id?: string;
  disabled?: boolean;
  required?: boolean;
  /** Guarda en curso: el campo sigue visible y muestra un giro. */
  busy?: boolean;
  placeholder?: string;
  /** Alto de una fila de paginación, no el de un campo de formulario. */
  compact?: boolean;
  className?: string;
};

export default function AppSelect({
  value,
  onChange,
  options,
  id,
  disabled,
  required,
  busy,
  placeholder = "Selecciona",
  compact,
  className = "mt-1 w-full",
}: Props) {
  const uid = useId();
  const listId = `${uid}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [box, setBox] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);

  const selected = options.find((option) => option.value === value);
  const showPlaceholder = !selected || (required && value === "");
  const label = showPlaceholder ? "" : selected.label;

  function place() {
    const el = buttonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 6;
    const menu = listRef.current;
    const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - gap);
    const spaceAbove = Math.max(0, rect.top - gap);
    const contentHeight = menu?.scrollHeight ?? 0;
    const openUp = contentHeight > spaceBelow && spaceAbove > spaceBelow;
    const maxHeight = Math.min(280, Math.max(80, openUp ? spaceAbove : spaceBelow));
    const used = menu ? Math.min(menu.offsetHeight, maxHeight) : 0;
    const width = rect.width;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const top = openUp ? rect.top - gap - used : rect.bottom + gap;
    const next = {
      top: Math.round(top),
      left: Math.round(left),
      width: Math.round(width),
      maxHeight: Math.round(maxHeight),
    };
    setBox((prev) =>
      prev &&
      prev.top === next.top &&
      prev.left === next.left &&
      prev.width === next.width &&
      prev.maxHeight === next.maxHeight
        ? prev
        : next,
    );
  }

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !listRef.current) return;
    place();
  }, [open, box?.maxHeight]);

  useEffect(() => {
    if (!open) return;
    const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
    setActive(selectedIndex);
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if ((target as HTMLElement).closest?.("[data-app-select-menu]")) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    const focusTimer = window.requestAnimationFrame(() => listRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(focusTimer);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onTriggerKey(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  }

  function onMenuKey(event: React.KeyboardEvent<HTMLUListElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(options.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = options[active];
      if (option) choose(option.value);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    }
  }

  const menu =
    open && box && typeof document !== "undefined"
      ? createPortal(
          <ul
            id={listId}
            ref={listRef}
            role="listbox"
            data-app-select-menu
            tabIndex={-1}
            onKeyDown={onMenuKey}
            style={{ top: box.top, left: box.left, width: box.width, maxHeight: box.maxHeight }}
            className="fixed z-[280] overflow-y-auto rounded-xl border border-surface-border bg-surface-card p-1.5 shadow-[0_16px_40px_rgba(28,25,23,0.14)] outline-none"
          >
            {options.length === 0 ? (
              <li className="px-3 py-2 text-sm text-ink-muted">Sin opciones</li>
            ) : (
              options.map((option, index) => {
                const isSelected = option.value === value;
                return (
                  <li key={`${option.value}-${index}`} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                        isSelected || index === active
                          ? "bg-brand-soft font-semibold text-brand"
                          : "text-ink hover:bg-surface"
                      }`}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => choose(option.value)}
                    >
                      <span className="min-w-0 truncate">{option.label}</span>
                      {isSelected ? <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} /> : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {required ? (
        <input
          tabIndex={-1}
          aria-hidden
          required
          value={value}
          onChange={() => undefined}
          className="pointer-events-none absolute h-px w-px opacity-0"
        />
      ) : null}
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-busy={busy || undefined}
        aria-controls={listId}
        aria-haspopup="listbox"
        disabled={disabled || busy}
        onKeyDown={onTriggerKey}
        onClick={() => {
          if (disabled || busy) return;
          setOpen((current) => !current);
        }}
        className={`flex w-full items-center justify-between gap-2 border border-surface-border bg-[rgb(var(--color-field))] text-left text-sm text-ink outline-none transition hover:border-ink-muted focus-visible:border-brand disabled:cursor-not-allowed disabled:opacity-60 ${
          compact ? "h-9 min-h-0 rounded-lg px-2.5" : "h-11 rounded-xl px-3"
        } ${label ? "" : "text-ink-muted"}`}
      >
        <span className="min-w-0 truncate">{label || placeholder}</span>
        {busy ? (
          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand border-t-transparent" aria-hidden />
        ) : (
          <ChevronDown className={`h-4 w-4 shrink-0 text-ink-muted transition ${open ? "rotate-180" : ""}`} strokeWidth={2} />
        )}
      </button>
      {menu}
    </div>
  );
}
