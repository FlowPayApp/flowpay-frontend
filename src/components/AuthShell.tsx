import type { ReactNode } from "react";
import BrandLogo from "./BrandLogo";
import ThemeToggle from "./ThemeToggle";

type Props = {
  title: string;
  lede?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Reemplaza el texto de marca del panel izquierdo. */
  aside?: ReactNode;
};

export default function AuthShell({ title, lede, children, footer, aside }: Props) {
  return (
    <div className={`grid h-dvh overflow-hidden ${aside ? "lg:grid-cols-[minmax(0,1.75fr)_minmax(22rem,26rem)]" : "lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,34rem)]"}`}>
      <aside className="auth-brand-panel relative hidden h-dvh flex-col overflow-hidden px-6 py-6 lg:flex xl:px-8 xl:py-8">
        {aside ? (
          <div className="flex h-full min-h-0 flex-col">
            <BrandLogo tone="onDark" className="h-9" />
            <div className="my-auto w-full min-h-0 overflow-y-auto py-4">{aside}</div>
            <p className="shrink-0 text-sm text-[rgb(245_242_234)]/60">Cartera · recordatorios · Webpay</p>
          </div>
        ) : (
          <div className="flex min-h-full flex-col justify-between">
            <BrandLogo tone="onDark" className="h-9" />
            <div className="max-w-md">
              <BrandPitch />
            </div>
            <p className="text-sm text-[rgb(245_242_234)]/60">Cartera · recordatorios · Webpay</p>
          </div>
        )}
      </aside>

      <div className="auth-form-panel relative flex h-dvh flex-col overflow-y-auto px-4 py-5 sm:px-8">
        <div className="flex items-center justify-between lg:justify-end">
          <BrandLogo className="h-8 lg:hidden" />
          <ThemeToggle compact />
        </div>
        <div className="mx-auto my-auto w-full max-w-md py-6">
          <h1 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">{title}</h1>
          {lede ? <p className="mt-3 text-sm leading-relaxed text-ink-muted">{lede}</p> : null}
          <div className="mt-8">{children}</div>
          {footer ? <div className="mt-8 text-sm text-ink-muted">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

function BrandPitch() {
  return (
    <>
      <p className="font-display text-4xl font-medium leading-[1.15] tracking-tight">
        La cobranza, en el escritorio y en el bolsillo.
      </p>
      <p className="mt-5 text-base leading-relaxed text-[rgb(245_242_234)]/80">
        Ves lo vencido, avisas y cobras sin cambiar de herramienta cuando sales de la oficina.
      </p>
    </>
  );
}
