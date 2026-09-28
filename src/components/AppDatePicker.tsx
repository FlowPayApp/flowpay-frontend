import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate } from "../lib/format";

type Props = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
};

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function toISO(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseISO(value: string): { year: number; month: number; day: number } | null {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m - 1, day: d };
}

function todayISO() {
  const now = new Date();
  return toISO(now.getFullYear(), now.getMonth(), now.getDate());
}

function monthCells(year: number, month: number) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array.from({ length: offset }, () => null);
  for (let day = 1; day <= days; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function AppDatePicker({
  value,
  onChange,
  id,
  disabled,
  required,
  placeholder = "Elige una fecha",
  className = "mt-1 w-full",
}: Props) {
  const uid = useId();
  const panelId = `${uid}-calendar`;
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);
  const selected = parseISO(value);
  const today = todayISO();
  const [view, setView] = useState(() => {
    const base = selected ?? parseISO(today)!;
    return { year: base.year, month: base.month };
  });

  function place() {
    const el = buttonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 6;
    const width = 304;
    const height = panelRef.current?.offsetHeight ?? 360;
    const openUp = window.innerHeight - rect.bottom - gap < height && rect.top - gap > height;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const top = openUp ? rect.top - gap - height : rect.bottom + gap;
    setBox((prev) =>
      prev && prev.top === Math.round(top) && prev.left === Math.round(left)
        ? prev
        : { top: Math.round(top), left: Math.round(left) },
    );
  }

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const base = parseISO(value) ?? parseISO(todayISO())!;
    setView({ year: base.year, month: base.month });
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function shiftMonth(delta: number) {
    setView((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  function choose(iso: string) {
    onChange(iso);
    setOpen(false);
    buttonRef.current?.focus();
  }

  const cells = monthCells(view.year, view.month);

  const panel =
    open && box && typeof document !== "undefined"
      ? createPortal(
          <div
            id={panelId}
            ref={panelRef}
            role="dialog"
            aria-label="Elegir fecha"
            style={{ top: box.top, left: box.left }}
            className="fixed z-[280] w-[19rem] rounded-2xl border border-surface-border bg-surface-card p-3 text-ink shadow-[0_16px_40px_rgba(28,25,23,0.16)]"
          >
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2} />
              </button>
              <p className="text-sm font-semibold">
                {MONTHS[view.month]} {view.year}
              </p>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            <div className="mt-2 grid grid-cols-7 text-center text-[11px] font-semibold uppercase text-ink-muted">
              {WEEKDAYS.map((day, index) => (
                <span key={`${day}-${index}`} className="py-1.5">
                  {day}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, index) => {
                if (day === null) return <span key={`empty-${index}`} className="h-9" />;
                const iso = toISO(view.year, view.month, day);
                const isSelected = iso === value.slice(0, 10);
                const isToday = iso === today;
                return (
                  <button
                    key={iso}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={formatDate(iso)}
                    onClick={() => choose(iso)}
                    className={[
                      "inline-flex h-9 items-center justify-center rounded-lg text-sm tabular-nums transition",
                      isSelected
                        ? "bg-[rgb(15_110_107)] font-semibold text-white"
                        : isToday
                          ? "font-semibold text-brand ring-1 ring-inset ring-brand/40 hover:bg-brand-soft"
                          : "text-ink hover:bg-surface",
                    ].join(" ")}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-surface-border pt-2">
              <button
                type="button"
                onClick={() => choose(today)}
                className="h-9 rounded-lg px-2 text-sm font-semibold text-brand hover:bg-brand-soft"
              >
                Hoy
              </button>
              {!required && value && (
                <button
                  type="button"
                  onClick={() => choose("")}
                  className="h-9 rounded-lg px-2 text-sm font-medium text-ink-muted hover:bg-surface hover:text-ink"
                >
                  Borrar
                </button>
              )}
            </div>
          </div>,
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
        aria-controls={panelId}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
        }}
        className={`flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-surface-border bg-[rgb(var(--color-field))] px-3 text-left text-sm outline-none transition hover:border-ink-muted focus-visible:border-brand disabled:cursor-not-allowed disabled:opacity-60 ${
          selected ? "text-ink" : "text-ink-muted"
        }`}
      >
        <span className="min-w-0 truncate">{selected ? formatDate(value) : placeholder}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-ink-muted" strokeWidth={2} />
      </button>
      {panel}
    </div>
  );
}
