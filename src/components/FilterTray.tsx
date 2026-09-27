import type { ReactNode } from "react";

type Props = {
  open: boolean;
  children: ReactNode;
};

/** Bandeja bajo la barra de la lista. Al cerrar no deja un hueco. */
export default function FilterTray({ open, children }: Props) {
  return (
    <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
      <div className="min-h-0 overflow-hidden" aria-hidden={!open}>
        <div className="border-t border-surface-border bg-surface px-4 py-4 sm:px-5">{children}</div>
      </div>
    </div>
  );
}
