import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  CreditCard,
  FileSpreadsheet,
  LineChart,
  Mail,
  Menu,
  MessageCircle,
  Store,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import BrandLogo from "../components/BrandLogo";
import { getToken } from "../lib/auth";

const CONTACT = "contacto@geldflus.com";

const NAV = [
  { href: "#producto", label: "Producto" },
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#planes", label: "Planes" },
  { href: "#faq", label: "Preguntas" },
  { href: "#contacto", label: "Contacto" },
] as const;

const FEATURES: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: LineChart,
    title: "Panel de cobranza",
    desc: "Por cobrar, vencido y cobrado, más la lista del día: lo que vence esta semana y lo que ya se pasó.",
  },
  {
    icon: Store,
    title: "Sucursales",
    desc: "Código, local, encargado, dirección, teléfono, correo y método de pago: contado, crédito, cheque o transferencia.",
  },
  {
    icon: FileSpreadsheet,
    title: "Carga desde Excel",
    desc: "La misma planilla de la red: CODIGO, SUCURSAL, NOMBRE, DIRECCION, TELEFONO, EMAIL y MPAGO.",
  },
  {
    icon: MessageCircle,
    title: "Avisos por correo y WhatsApp",
    desc: "Salen solos antes del vencimiento, el día y si hay mora. Si el local responde, el hilo queda en ese cobro.",
  },
  {
    icon: CreditCard,
    title: "Pago con Webpay",
    desc: "Cada cobro tiene un enlace. El local paga con tarjeta vía Transbank y no necesita cuenta.",
  },
  {
    icon: Users,
    title: "Equipo",
    desc: "El administrador ve toda la red. Cada cobrador ve sus locales. Transferencia o cheque se marcan a mano.",
  },
];

const PLANS = [
  {
    name: "Esencial",
    detail: "Para una operación chica que hoy cobra a mano.",
    price: "$39.000",
    features: ["Hasta 25 sucursales", "Recordatorios por correo y WhatsApp", "Enlace de pago con Webpay", "1 administrador"],
    highlight: false,
  },
  {
    name: "Crecimiento",
    detail: "Para quien ya recorre varias sucursales y necesita equipo.",
    price: "$89.000",
    features: ["Hasta 120 sucursales", "Todo lo de Esencial", "Cobradores en el equipo", "Carga de sucursales desde Excel"],
    highlight: true,
  },
  {
    name: "Empresa",
    detail: "Para una red grande, con puesta en marcha acompañada.",
    price: "$169.000",
    features: ["Sucursales sin tope", "Todo lo de Crecimiento", "Varios administradores", "Acompañamiento en la carga inicial"],
    highlight: false,
  },
] as const;

const FAQ = [
  {
    q: "¿Para quién es GeldFlus?",
    a: "Para un distribuidor que cobra a locales. El deudor en el sistema es la sucursal, con su código, encargado, teléfono y correo.",
  },
  {
    q: "¿El local tiene que crear una cuenta?",
    a: "No. Recibe el enlace del cobro y paga con Webpay. Tú sigues en el panel.",
  },
  {
    q: "¿Qué pasa si paga por transferencia o cheque?",
    a: "El cobrador lo marca como pagado y el cobro sale de la lista de pendientes.",
  },
  {
    q: "¿Cuánto cuesta?",
    a: "Esencial $39.000, Crecimiento $89.000 y Empresa $169.000 al mes. Al registrarte eliges uno; activamos la cuenta y te enviamos la contraseña.",
  },
] as const;

function mailHref() {
  const subject = "Consulta GeldFlus";
  const body = "Hola,\n\nQuiero conocer GeldFlus para cobrar a mis sucursales.\n\nEmpresa:\nCantidad aproximada de locales:\n\nGracias.";
  return `mailto:${CONTACT}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function Landing() {
  const loggedIn = !!getToken();
  const [menu, setMenu] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const prev = document.title;
    document.title = "GeldFlus — cobra a tus sucursales";
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <div className="min-h-dvh bg-surface text-ink">
      <header className="sticky top-0 z-20 border-b border-surface-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/landing" aria-label="GeldFlus">
            <BrandLogo className="h-8" />
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-ink-muted md:flex">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="hover:text-ink">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-2 sm:flex">
            {loggedIn ? (
              <Link to="/" className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">
                Ir al panel
              </Link>
            ) : (
              <>
                <Link to="/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-ink hover:bg-brand-soft">
                  Entrar
                </Link>
                <Link to="/register" className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">
                  Crear cuenta
                </Link>
              </>
            )}
          </div>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-xl text-ink md:hidden"
            aria-label={menu ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMenu((v) => !v)}
          >
            {menu ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {menu && (
          <div className="border-t border-surface-border px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3 text-sm font-medium">
              {NAV.map((item) => (
                <a key={item.href} href={item.href} onClick={() => setMenu(false)} className="text-ink-muted">
                  {item.label}
                </a>
              ))}
              {loggedIn ? (
                <Link to="/" className="rounded-xl bg-brand px-4 py-3 text-center font-semibold text-white">
                  Ir al panel
                </Link>
              ) : (
                <>
                  <Link to="/login" className="rounded-xl border border-surface-border px-4 py-3 text-center font-semibold">
                    Entrar
                  </Link>
                  <Link to="/register" className="rounded-xl bg-brand px-4 py-3 text-center font-semibold text-white">
                    Crear cuenta
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="px-4 pb-16 pt-14 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 inline-block rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-brand">
              Para distribuidores · geldflus.com/landing
            </p>
            <h1 className="font-display text-4xl font-medium tracking-tight text-balance sm:text-6xl">
              Cobra a tus sucursales sin perseguir cada pago
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink-muted">
              Cargas locales y cobros. GeldFlus avisa por correo y WhatsApp antes del vencimiento, el día y si se
              pasa. El local paga con Webpay desde el enlace, sin crear una cuenta.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to={loggedIn ? "/" : "/register"}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 text-base font-semibold text-white hover:bg-brand-hover sm:w-auto"
              >
                {loggedIn ? "Ir al panel" : "Crear cuenta"}
                <ArrowRight className="size-4" />
              </Link>
              {!loggedIn && (
                <Link
                  to="/login"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-surface-border bg-surface-card px-6 text-base font-semibold sm:w-auto"
                >
                  Entrar
                </Link>
              )}
            </div>
          </div>

          <div id="producto" className="mx-auto mt-14 max-w-5xl scroll-mt-24">
            <p className="mb-3 text-center text-xs font-medium text-ink-muted">
              Vista de ejemplo — sucursales ficticias, no clientes reales
            </p>
            <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card p-4 shadow-soft sm:p-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <Kpi label="Por cobrar" value="$4.820.000" />
                <Kpi label="Vencido" value="$1.140.000" tone="danger" />
                <Kpi label="Cobrado" value="$6.350.000" tone="brand" />
              </div>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[32rem] text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      <th className="pb-3 font-semibold">Sucursal</th>
                      <th className="pb-3 font-semibold">Estado</th>
                      <th className="pb-3 text-right font-semibold">Monto</th>
                      <th className="pb-3 text-right font-semibold">Vencimiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    <Row name="Almacén Los Aromos" status="Vencido" amount="$186.000" date="2 oct 2026" tone="danger" />
                    <Row name="Minimarket Central" status="Pendiente" amount="$94.500" date="9 oct 2026" tone="warn" />
                    <Row name="Local Esquina Sur" status="Pagado" amount="$210.000" date="28 sep 2026" tone="brand" />
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-surface-border bg-surface-card/60 px-4 py-8 text-center sm:px-6">
          <p className="mx-auto max-w-3xl text-sm leading-relaxed text-ink-muted">
            El aviso va por correo y WhatsApp. El pago en línea es Webpay (Transbank). GeldFlus no retiene el dinero.
          </p>
        </section>

        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand">Producto</p>
            <h2 className="mt-2 max-w-xl font-display text-3xl font-medium tracking-tight sm:text-4xl">
              Una sucursal, un monto, una fecha
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <article key={feature.title} className="rounded-2xl border border-surface-border bg-surface-card p-6">
                  <feature.icon className="size-5 text-brand" />
                  <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{feature.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="scroll-mt-24 bg-ink px-4 py-16 text-[rgb(245_242_234)] sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center font-display text-3xl font-medium tracking-tight sm:text-4xl">Cómo funciona</h2>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              <Step n="01" title="Cargas la red">
                Das de alta cada sucursal en el panel o la importas desde Excel. Después creas el cobro: local, monto y fecha.
              </Step>
              <Step n="02" title="El aviso sale solo">
                Correo y WhatsApp antes del vencimiento, el día y si se pasa. El mensaje lleva el enlace de pago.
              </Step>
              <Step n="03" title="El local paga">
                Abre el enlace y paga con Webpay, o el cobrador registra transferencia o cheque.
              </Step>
            </div>
          </div>
        </section>

        <section id="planes" className="scroll-mt-24 px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand">Planes</p>
            <h2 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
              El mismo producto. Cambia el tamaño de la red.
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {PLANS.map((plan) => (
                <article
                  key={plan.name}
                  className={`flex h-full flex-col rounded-2xl border p-6 ${
                    plan.highlight ? "border-brand bg-brand-soft" : "border-surface-border bg-surface-card"
                  }`}
                >
                  {plan.highlight && (
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand">Para una red con cobradores</p>
                  )}
                  <h3 className="text-2xl font-semibold">{plan.name}</h3>
                  <p className="mt-2 text-sm text-ink-muted">{plan.detail}</p>
                  <p className="mt-5 font-display text-4xl">
                    {plan.price}
                    <span className="ml-1 font-sans text-base text-ink-muted">/ mes</span>
                  </p>
                  <ul className="mt-5 space-y-2 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/register"
                    className={`mt-6 inline-flex justify-center rounded-xl px-4 py-3 text-sm font-semibold ${
                      plan.highlight ? "bg-brand text-white hover:bg-brand-hover" : "border border-surface-border hover:bg-surface"
                    }`}
                  >
                    Pedir este plan
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 px-4 pb-16 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-center font-display text-3xl font-medium tracking-tight">Preguntas frecuentes</h2>
            <div className="mt-8 divide-y divide-surface-border border-y border-surface-border">
              {FAQ.map((item, index) => {
                const open = openFaq === index;
                return (
                  <div key={item.q}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-4 py-4 text-left text-base font-semibold"
                      aria-expanded={open}
                      onClick={() => setOpenFaq(open ? null : index)}
                    >
                      {item.q}
                      <span className="text-ink-muted">{open ? "–" : "+"}</span>
                    </button>
                    {open && <p className="pb-4 text-sm leading-relaxed text-ink-muted">{item.a}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="contacto" className="scroll-mt-24 border-t border-surface-border px-4 py-16 text-center sm:px-6">
          <h2 className="font-display text-3xl font-medium tracking-tight">Contacto</h2>
          <p className="mx-auto mt-3 max-w-lg text-ink-muted">
            Si quieres partir con una red real — sucursales, montos y fechas — escríbenos.
          </p>
          <a
            href={mailHref()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-soft px-5 py-3 font-semibold text-brand"
          >
            <Mail className="size-4" />
            {CONTACT}
          </a>
        </section>
      </main>

      <footer className="border-t border-surface-border px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-center sm:text-left">
            <BrandLogo className="mx-auto h-7 sm:mx-0" />
            <p className="mt-2 text-xs text-ink-muted">© {new Date().getFullYear()} GeldFlus · geldflus.com/landing</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-ink-muted">
            <a href="#producto" className="hover:text-ink">
              Producto
            </a>
            <a href="#planes" className="hover:text-ink">
              Planes
            </a>
            <a href="#contacto" className="hover:text-ink">
              Contacto
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "danger" | "brand" }) {
  const color = tone === "danger" ? "text-danger" : tone === "brand" ? "text-brand" : "text-ink";
  return (
    <div className="rounded-xl bg-surface px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function Row({
  name,
  status,
  amount,
  date,
  tone,
}: {
  name: string;
  status: string;
  amount: string;
  date: string;
  tone: "danger" | "warn" | "brand";
}) {
  const badge =
    tone === "danger" ? "bg-danger-soft text-danger" : tone === "warn" ? "bg-warn-soft text-warn" : "bg-brand-soft text-brand";
  return (
    <tr className="border-b border-surface-border last:border-0">
      <td className="py-3 font-medium">{name}</td>
      <td className="py-3">
        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${badge}`}>{status}</span>
      </td>
      <td className="py-3 text-right font-mono">{amount}</td>
      <td className="py-3 text-right text-ink-muted">{date}</td>
    </tr>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: string }) {
  return (
    <div>
      <p className="font-mono text-sm text-[rgb(245_242_234)]/50">{n}</p>
      <h3 className="mt-2 text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[rgb(245_242_234)]/75">{children}</p>
    </div>
  );
}
