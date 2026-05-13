import { Check, Copy, KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import AppModal from "./AppModal";

export type ResetPasswordModalState =
  | { phase: "confirm"; userId: number; email: string }
  | { phase: "result"; email: string; temporary_password: string };

type Props = {
  state: ResetPasswordModalState | null;
  loading: boolean;
  onClose: () => void;
  onGenerate: () => void;
};

/** Modal en dos pasos: confirmar generación y mostrar contraseña temporal para copiar. */
export default function ResetPasswordModal({ state, loading, onClose, onGenerate }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [state]);

  if (!state) return null;

  async function copyPassword(pwd: string) {
    try {
      await navigator.clipboard.writeText(pwd);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <AppModal onBackdropClick={loading ? undefined : onClose}>
      <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-card p-6 shadow-2xl">
        {state.phase === "confirm" ? (
          <>
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <KeyRound className="h-5 w-5" strokeWidth={2} />
              </span>
              <h2 className="text-lg font-semibold text-ink">Nueva contraseña temporal</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              Se generará una contraseña de un solo uso para{" "}
              <span className="font-medium text-ink">{state.email}</span>. El usuario deberá cambiarla al iniciar sesión.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-sm font-medium text-ink-muted transition hover:bg-surface disabled:opacity-50"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-600 disabled:opacity-60"
                onClick={onGenerate}
                disabled={loading}
              >
                {loading ? "Generando…" : "Generar clave"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Check className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <h2 className="text-lg font-semibold text-ink">Contraseña generada</h2>
            </div>
            <p className="mt-3 text-sm text-ink-muted">
              Copia la clave y envíala por correo a <span className="font-medium text-ink">{state.email}</span>.
            </p>
            <div className="mt-4 rounded-xl border border-surface-border bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Contraseña temporal</p>
              <code className="mt-2 block break-all font-mono text-base font-semibold text-ink">{state.temporary_password}</code>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-card px-4 py-2 text-sm font-medium text-ink shadow-sm transition hover:bg-surface"
                onClick={() => void copyPassword(state.temporary_password)}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar
                  </>
                )}
              </button>
              <button
                type="button"
                className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-600"
                onClick={onClose}
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    </AppModal>
  );
}
