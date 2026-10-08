import { Bell, BellRing, Paperclip } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { threadPreview, useInbox } from "./InboxProvider";

function timeAgo(iso: string) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const minutes = Math.round((Date.now() - t) / 60_000);
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return new Date(t).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

type Props = {
  /** Dónde se despliega la lista respecto del botón. */
  align?: "left" | "right";
  className?: string;
};

export default function InboxBell({ align = "left", className = "" }: Props) {
  const { inbox, notifications, enableNotifications } = useInbox();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<CSSProperties>({});
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const count = inbox.total;

  useEffect(() => setOpen(false), [pathname]);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const button = root.current?.getBoundingClientRect();
      if (!button) return;
      const width = Math.min(352, window.innerWidth - 32);
      const preferred = align === "right" ? button.right - width : button.left;
      const left = Math.max(16, Math.min(preferred, window.innerWidth - width - 16));
      setPosition({ top: button.bottom + 8, left, width });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (root.current?.contains(target) || panel.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = count > 0 ? `Respuestas sin leer: ${count}` : "Sin respuestas nuevas";

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className={`relative inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors ${
          open ? "bg-surface text-ink" : "text-ink-muted hover:bg-surface hover:text-ink"
        }`}
      >
        {count > 0 ? <BellRing className="h-5 w-5" strokeWidth={2} /> : <Bell className="h-5 w-5" strokeWidth={2} />}
        {count > 0 && (
          <span className="absolute right-1.5 top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white ring-2 ring-surface-card">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && createPortal(dropdown(), document.body)}
    </div>
  );

  function dropdown() {
    return (
      <div
        ref={panel}
        role="dialog"
        aria-label="Respuestas de clientes"
        style={position}
        className="fixed z-[60] overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-xl"
      >
        <div className="flex items-baseline justify-between gap-3 border-b border-surface-border px-4 py-3">
          <p className="text-sm font-semibold text-ink">Respuestas de clientes</p>
          <p className="text-xs text-ink-muted">{count > 0 ? `${count} sin leer` : "Al día"}</p>
        </div>

        {inbox.threads.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink-muted">Cuando un cliente responda un cobro, lo verás aquí.</p>
        ) : (
          <ul className="max-h-[min(60vh,24rem)] overflow-y-auto py-1">
            {inbox.threads.map((thread) => (
              <li key={thread.charge_id}>
                <Link
                  to={`/cobros/${thread.charge_id}`}
                  className="flex gap-3 px-4 py-3 transition-colors hover:bg-surface"
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-semibold text-ink">{thread.client_name}</span>
                      <span className="shrink-0 text-[11px] text-ink-muted">{timeAgo(thread.last_at)}</span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-muted">
                      {thread.has_media && <Paperclip className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />}
                      <span className="truncate">{threadPreview(thread)}</span>
                    </span>
                    <span className="mt-1 block text-[11px] font-medium text-brand">
                      Cobro #{thread.charge_id}
                      {thread.unread > 1 ? ` · ${thread.unread} mensajes` : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {notifications === "default" && (
          <div className="border-t border-surface-border bg-surface px-4 py-3">
            <p className="text-xs text-ink-muted">Recibe un aviso en este equipo aunque estés en otra pestaña.</p>
            <button
              type="button"
              onClick={() => void enableNotifications()}
              className="mt-2 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover"
            >
              Activar avisos
            </button>
          </div>
        )}
        {notifications === "denied" && (
          <p className="border-t border-surface-border bg-surface px-4 py-3 text-xs text-ink-muted">
            Los avisos están bloqueados en este navegador. Puedes activarlos desde el candado junto a la dirección.
          </p>
        )}
      </div>
    );
  }
}
