import { useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { BellRing, ChevronRight, KeyRound, MessageSquareText } from "lucide-react";
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import PaymentCredentialsSection from "../components/PaymentCredentialsSection";
import SettingsFrame from "../components/SettingsFrame";
import { useCompanyChannels } from "../lib/companyChannels";
import { MessagingFormProvider, useMessagingForm } from "./MessagingSettings";

const GROUPS: { label: string; items: { to: string; label: string; hint: string; icon: LucideIcon }[] }[] = [
  {
    label: "Cobros",
    items: [
      { to: "/configuracion/medios", label: "Medios de pago", hint: "Credenciales y transferencia directa", icon: KeyRound },
    ],
  },
  {
    label: "Recordatorios",
    items: [
      { to: "/configuracion/avisos", label: "Cuándo avisar", hint: "Frecuencia de los avisos", icon: BellRing },
      { to: "/configuracion/mensajes", label: "Qué decir", hint: "Correo y WhatsApp", icon: MessageSquareText },
    ],
  },
];

export function PaymentMethodsPanel() {
  return (
    <SettingsFrame
      title="Medios de pago"
      hint="El cliente solo ve los medios que dejes cargados. Cada llave se cifra y no se vuelve a mostrar."
    >
      <PaymentCredentialsSection bare />
    </SettingsFrame>
  );
}

export default function Settings() {
  return (
    <MessagingFormProvider>
      <SettingsShell />
    </MessagingFormProvider>
  );
}

function SettingsShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { dirty, saving, discard, save } = useMessagingForm();
  const channels = useCompanyChannels();
  const messagesHint = !channels.ready
    ? "Avisos al cliente"
    : channels.email && channels.whatsapp
      ? "Correo y WhatsApp"
      : channels.whatsapp
        ? "WhatsApp"
        : channels.email
          ? "Correo"
          : "Avisos al cliente";
  const atIndex = location.pathname === "/configuracion";

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const openFirstSection = () => {
      if (media.matches && location.pathname === "/configuracion") {
        navigate("/configuracion/medios", { replace: true });
      }
    };
    media.addEventListener("change", openFirstSection);
    return () => media.removeEventListener("change", openFirstSection);
  }, [location.pathname, navigate]);

  if (atIndex && window.matchMedia("(min-width: 1024px)").matches) {
    return <Navigate to="/configuracion/medios" replace />;
  }

  return (
    <div className={`mx-auto w-full max-w-6xl ${dirty ? "pb-16 lg:pb-0" : ""}`}>
      {atIndex ? (
        <div className="mb-6 lg:hidden">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Configuración</h1>
          <p className="mt-1 text-sm text-ink-muted">Ajustes de la empresa.</p>
        </div>
      ) : null}

      <div className="lg:overflow-hidden lg:rounded-3xl lg:border lg:border-surface-border lg:bg-surface-card lg:shadow-soft">
        <header className="hidden border-b border-surface-border px-8 py-5 lg:block">
          <h1 className="text-xl font-semibold tracking-tight text-ink">Configuración</h1>
          <p className="mt-1 text-sm text-ink-muted">Ajustes de la empresa.</p>
        </header>

        <div className="lg:grid lg:min-h-[32rem] lg:grid-cols-[16.5rem_minmax(0,1fr)]">
          <nav
            aria-label="Secciones de configuración"
            className={[
              atIndex ? "block" : "hidden lg:block",
              "lg:border-r lg:border-surface-border lg:bg-surface/50 lg:px-3 lg:py-5",
            ].join(" ")}
          >
            <div className="space-y-5">
              {GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{group.label}</p>
                  <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-soft lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end
                        className={({ isActive }) =>
                          [
                            "flex min-h-12 items-center gap-2.5 px-3 py-2 text-sm transition-colors lg:rounded-xl",
                            "border-t border-surface-border first:border-t-0 lg:border-0",
                            isActive ? "bg-brand-soft font-semibold text-brand" : "font-medium text-ink hover:bg-surface lg:text-ink-muted lg:hover:text-ink",
                          ].join(" ")
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-brand" : "text-ink-muted"}`} strokeWidth={2} />
                            <span className="min-w-0 flex-1">
                              <span className="block">{item.label}</span>
                              <span className={`mt-0.5 block text-xs font-normal lg:hidden ${isActive ? "text-brand/80" : "text-ink-muted"}`}>
                                {item.to === "/configuracion/mensajes" ? messagesHint : item.hint}
                              </span>
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted lg:hidden" strokeWidth={2} />
                          </>
                        )}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </nav>

          <div className={atIndex ? "hidden" : "min-w-0 lg:px-8 lg:py-7"}>
            <Outlet />
          </div>
        </div>
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 lg:sticky lg:inset-x-auto lg:bottom-6">
          <div className="flex items-center justify-between gap-3 border-t border-surface-border bg-surface-card px-4 py-2.5 shadow-[0_-8px_24px_rgba(28,25,23,0.08)] lg:rounded-2xl lg:border lg:py-3 lg:shadow-[0_16px_40px_rgba(28,25,23,0.16)]">
            <p className="text-sm font-medium text-ink">Cambios sin guardar</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={discard}
                className="h-10 rounded-lg px-3 text-sm font-medium text-ink-muted hover:bg-surface hover:text-ink disabled:opacity-60"
              >
                Descartar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={save}
                className="h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
