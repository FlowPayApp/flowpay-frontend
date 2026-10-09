import BrandLogo from "./BrandLogo";

/** Pantalla de espera al entrar o crear cuenta: marca, texto y barra indeterminada. */
export default function AuthLoadingOverlay({ message = "Entrando a tu cuenta…" }: { message?: string }) {
  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-surface/90 px-4 animate-[auth-fade_180ms_ease-out]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex w-full max-w-xs flex-col items-center rounded-3xl border border-surface-border bg-surface-card px-8 py-9 shadow-soft animate-[toast-in_240ms_cubic-bezier(0.22,1,0.36,1)]">
        <BrandLogo className="h-8" />
        <p className="mt-1 text-sm text-ink-muted">{message}</p>
        <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-brand/10" aria-hidden>
          <span className="block h-full w-1/3 rounded-full bg-brand [will-change:transform] animate-[auth-bar_1s_cubic-bezier(0.65,0,0.35,1)_infinite]" />
        </div>
      </div>
    </div>
  );
}
