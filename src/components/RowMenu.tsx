import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, type LucideIcon } from "lucide-react";

export type RowMenuItem = {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
};

const MENU_WIDTH = 176;

/** Botón "⋯" de las filas en móvil; abre las acciones en un menú flotante. */
export default function RowMenu({ label, items }: { label: string; items: RowMenuItem[] }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);

  function place() {
    const el = buttonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 4;
    const height = menuRef.current?.offsetHeight ?? 0;
    const openUp = rect.bottom + gap + height > window.innerHeight - 8 && rect.top - gap - height > 8;
    setBox({
      top: Math.round(openUp ? rect.top - gap - height : rect.bottom + gap),
      left: Math.round(Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8))),
    });
  }

  useLayoutEffect(() => {
    if (open) place();
  }, [open, box === null]);

  useEffect(() => {
    if (!open) return;
    function close() {
      setOpen(false);
      setBox(null);
    }
    function onPointer(event: PointerEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      close();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{ top: box?.top ?? -9999, left: box?.left ?? -9999, width: MENU_WIDTH }}
          className="fixed z-[280] rounded-xl border border-surface-border bg-surface-card p-1.5 shadow-[0_16px_40px_rgba(28,25,23,0.14)]"
        >
          {items.map(({ label: itemLabel, icon: Icon, onSelect, danger }) => (
            <button
              key={itemLabel}
              type="button"
              role="menuitem"
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium ${
                danger ? "text-danger hover:bg-danger-soft" : "text-ink hover:bg-surface"
              }`}
              onClick={() => {
                setOpen(false);
                setBox(null);
                onSelect();
              }}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
              {itemLabel}
            </button>
          ))}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setBox(null);
          setOpen((current) => !current);
        }}
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-ink ${
          open ? "bg-surface text-ink" : ""
        }`}
      >
        <MoreVertical className="h-[18px] w-[18px]" strokeWidth={2} />
      </button>
      {menu}
    </>
  );
}
