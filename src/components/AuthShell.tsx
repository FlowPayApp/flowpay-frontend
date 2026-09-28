import type { ReactNode } from "react";
import ThemeToggle from "./ThemeToggle";

type Props = {
  title: string;
  lede?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export default function AuthShell({ title, lede, children, footer }: Props) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,34rem)]">
      <aside className="auth-brand-panel relative hidden flex-col justify-between px-12 py-12 lg:flex">
        <p className="font-display text-3xl font-medium tracking-tight">FlowPay</p>
        <div className="max-w-md">
          <p className="font-display text-4xl font-medium leading-[1.15] tracking-tight">
            La cobranza, en el escritorio y en el bolsillo.
          </p>
          <p className="mt-5 text-base leading-relaxed text-[rgb(245_242_234)]/80">
            Ves lo vencido, avisas y cobras sin cambiar de herramienta cuando sales de la oficina.
          </p>
        </div>
        <p className="text-sm text-[rgb(245_242_234)]/60">Cartera · recordatorios · Webpay</p>
      </aside>

      <div className="auth-form-panel relative flex min-h-dvh flex-col px-4 py-5 sm:px-8">
        <div className="flex items-center justify-between lg:justify-end">
          <p className="font-display text-2xl font-medium tracking-tight text-ink lg:hidden">FlowPay</p>
          <ThemeToggle compact />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">
          <h1 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">{title}</h1>
          {lede ? <p className="mt-3 text-sm leading-relaxed text-ink-muted">{lede}</p> : null}
          <div className="mt-8">{children}</div>
          {footer ? <div className="mt-8 text-sm text-ink-muted">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
