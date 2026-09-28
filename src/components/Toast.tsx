import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Check, Info, X } from "lucide-react";

export type ToastTone = "success" | "error" | "info";

export type ToastNotice = {
  text: string;
  tone: ToastTone;
};

const TONE = {
  success: {
    label: "Listo",
    bar: "bg-[rgb(15_110_107)]",
    icon: "bg-[rgb(15_110_107)] text-white",
    Icon: Check,
  },
  error: {
    label: "No se pudo",
    bar: "bg-[rgb(142_58_46)]",
    icon: "bg-[rgb(142_58_46)] text-white",
    Icon: AlertCircle,
  },
  info: {
    label: "Aviso",
    bar: "bg-[rgb(122_84_32)]",
    icon: "bg-[rgb(122_84_32)] text-white",
    Icon: Info,
  },
} as const;

const DURATION_MS = 4500;

export default function Toast({ notice, onClose }: { notice: ToastNotice; onClose: () => void }) {
  const tone = TONE[notice.tone];
  const [paused, setPaused] = useState(false);
  const onCloseRef = useRef(onClose);
  const remaining = useRef(DURATION_MS);
  const started = useRef(0);
  onCloseRef.current = onClose;

  useEffect(() => {
    remaining.current = DURATION_MS;
  }, [notice.text, notice.tone]);

  useEffect(() => {
    if (paused) return;
    started.current = Date.now();
    const timer = window.setTimeout(() => onCloseRef.current(), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - started.current));
    };
  }, [paused, notice.text, notice.tone]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-[260] w-[min(24rem,calc(100vw-2rem))]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card text-ink shadow-[0_16px_40px_rgb(28_25_23/0.16)]"
        style={{ animation: "toast-in 180ms ease-out" }}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3 px-4 py-3.5">
          <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone.icon}`}>
            <tone.Icon className="h-4 w-4" strokeWidth={2.4} />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{tone.label}</p>
            <p className="mt-0.5 text-sm leading-5 text-ink">{notice.text}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink"
            aria-label="Cerrar aviso"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <div className="h-1.5 bg-surface">
          <div
            className={`h-full origin-left ${tone.bar}`}
            style={{
              animation: `toast-shrink ${DURATION_MS}ms linear forwards`,
              animationPlayState: paused ? "paused" : "running",
            }}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

type ToastApi = {
  show: (notice: ToastNotice) => void;
  success: (text: string) => void;
  error: (text: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<(ToastNotice & { id: number }) | null>(null);
  const seq = useRef(0);

  const show = useCallback((notice: ToastNotice) => {
    seq.current += 1;
    setCurrent({ ...notice, id: seq.current });
  }, []);
  const success = useCallback((text: string) => show({ text, tone: "success" }), [show]);
  const error = useCallback((text: string) => show({ text, tone: "error" }), [show]);
  const close = useCallback(() => setCurrent(null), []);

  return (
    <ToastContext.Provider value={{ show, success, error }}>
      {children}
      {current && <Toast key={current.id} notice={current} onClose={close} />}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast requiere ToastProvider");
  return api;
}
