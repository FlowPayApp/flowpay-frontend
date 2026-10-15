import { Check, KeyRound } from "lucide-react";
import { useMinLoading } from "../lib/useMinLoading";
import AppModal from "./AppModal";
import LoadingOverlay from "./LoadingOverlay";

export type ResetPasswordModalState =
  | { phase: "confirm"; userId: number; email: string }
  | { phase: "result"; email: string };

type Props = {
  state: ResetPasswordModalState | null;
  loading: boolean;
  onClose: () => void;
  onGenerate: () => void;
};

function EmailLine({ email }: { email: string }) {
  return (
    <p className="mt-4 break-all rounded-xl border border-surface-border bg-surface px-3 py-2.5 text-sm font-medium leading-5 text-ink">
      {email}
    </p>
  );
}

/** Modal en dos pasos: confirmar el envío y avisar que la clave ya salió. */
export default function ResetPasswordModal({ state, loading, onClose, onGenerate }: Props) {
  if (!state) return null;

  const sent = state.phase === "result";
  const waiting = useMinLoading(loading);

  return (
    <AppModal onBackdropClick={waiting ? undefined : onClose}>
      {waiting && <LoadingOverlay above message="Enviando el correo…" />}
      <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-card p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            {sent ? <Check className="h-5 w-5" strokeWidth={2.5} /> : <KeyRound className="h-5 w-5" strokeWidth={2} />}
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 className="text-lg font-semibold leading-6 text-ink">{sent ? "Clave enviada" : "Enviar clave temporal"}</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              {sent ? "Ya está en camino. Al entrar hay que cambiarla." : "Llega por correo. Al entrar hay que cambiarla."}
            </p>
          </div>
        </div>
        <EmailLine email={state.email} />
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {!sent && (
            <button
              type="button"
              className="rounded-xl px-4 py-2 text-sm font-medium text-ink-muted transition hover:bg-surface disabled:opacity-50"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
          )}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover disabled:opacity-60"
            onClick={sent ? onClose : onGenerate}
          >
            {sent ? "Listo" : "Enviar clave"}
          </button>
        </div>
      </div>
    </AppModal>
  );
}
