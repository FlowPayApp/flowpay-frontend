import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Mail, Menu, X } from "lucide-react";
import BrandLogo from "../components/BrandLogo";
import { getToken } from "../lib/auth";

const CONTACT = "contacto@geldflus.com";

const NAV = [
  { href: "#recorrido", label: "Cómo funciona" },
  { href: "#planes", label: "Planes" },
  { href: "#preguntas", label: "Preguntas" },
  { href: "#contacto", label: "Contacto" },
] as const;

const PLANS = [
  {
    name: "Esencial",
    detail: "Para quien hoy cobra a mano.",
    price: "$39.000",
    features: ["Hasta 25 locales", "Avisos por WhatsApp y correo", "Enlace para pagar", "1 persona a cargo"],
    highlight: false,
  },
  {
    name: "Crecimiento",
    detail: "Para una red con cobradores.",
    price: "$89.000",
    features: ["Hasta 120 locales", "Todo lo de Esencial", "Cobradores en el equipo", "Carga desde una planilla"],
    highlight: true,
  },
  {
    name: "Empresa",
    detail: "Para una red grande.",
    price: "$169.000",
    features: ["Locales sin tope", "Todo lo de Crecimiento", "Varias personas a cargo", "Te acompañamos al partir"],
    highlight: false,
  },
] as const;

const FAQ = [
  {
    q: "¿Para quién es?",
    a: "Para quien reparte a almacenes y sucursales y cobra después. Cada local queda con su encargado, su teléfono y su fecha.",
  },
  {
    q: "¿El local tiene que registrarse?",
    a: "No. Le llega el enlace, ve el monto y paga. Tú sigues en tu panel.",
  },
  {
    q: "¿Y si paga por transferencia?",
    a: "Lo marcas como pagado. El enlace es para cuando paga con tarjeta.",
  },
] as const;

function mailHref() {
  const subject = "Consulta GeldFlus";
  const body = "Hola,\n\nQuiero conocer GeldFlus para cobrar a mis locales.\n\nEmpresa:\nCantidad aproximada de locales:\n\nGracias.";
  return `mailto:${CONTACT}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function Landing() {
  const loggedIn = !!getToken();
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const solidNav = scrolled || menu;

  useEffect(() => {
    const prev = document.title;
    document.title = "GeldFlus — cobra a tus locales";
    return () => {
      document.title = prev;
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-dvh bg-surface text-ink">
      <header
        className={`fixed inset-x-0 top-0 z-30 transition-colors duration-300 ${
          solidNav ? "border-b border-surface-border bg-surface" : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/landing" aria-label="GeldFlus">
            <BrandLogo tone={solidNav ? "auto" : "onDark"} className="h-8" />
          </Link>
          <nav className={`hidden items-center gap-6 text-sm font-medium md:flex ${solidNav ? "text-ink-muted" : "text-[rgb(245_242_234)]/75"}`}>
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className={solidNav ? "hover:text-ink" : "hover:text-white"}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-2 sm:flex">
            <AccountLinks loggedIn={loggedIn} onDark={!solidNav} />
          </div>
          <button
            type="button"
            className={`grid size-10 place-items-center rounded-xl md:hidden ${solidNav ? "text-ink" : "text-white"}`}
            aria-label={menu ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMenu((v) => !v)}
          >
            {menu ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {menu && (
          <div className="border-t border-surface-border bg-surface px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3 text-sm font-medium">
              {NAV.map((item) => (
                <a key={item.href} href={item.href} onClick={() => setMenu(false)} className="py-1 text-ink-muted">
                  {item.label}
                </a>
              ))}
              <AccountLinks loggedIn={loggedIn} stacked />
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="land-hero relative overflow-hidden px-4 pb-16 pt-28 text-[rgb(245_242_234)] sm:px-6 sm:pb-20 sm:pt-32">
          <div className="relative mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-semibold tracking-wide text-[#8fd4cf]">Para distribuidores</p>
              <h1 className="mt-4 font-display text-5xl font-medium leading-[1.05] tracking-tight text-balance sm:text-7xl">
                Cobra a tus locales <span className="text-[#8fd4cf]">sin perseguirlos</span>
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-[rgb(245_242_234)]/72">
                Cargas el local y la fecha. GeldFlus avisa solo. El local paga desde el enlace.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  to={loggedIn ? "/" : "/register"}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 text-base font-semibold text-white hover:bg-brand-hover sm:w-auto"
                >
                  {loggedIn ? "Ir al panel" : "Crear cuenta"}
                  <ArrowRight className="size-4" />
                </Link>
                <a
                  href="#recorrido"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 text-base font-semibold hover:bg-white/10 sm:w-auto"
                >
                  Cómo funciona
                </a>
              </div>
            </div>

          </div>
        </section>

        <section id="recorrido" className="scroll-mt-24 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <p className="text-sm font-semibold text-brand">Cómo funciona</p>
            <h2 className="mt-2 max-w-xl font-display text-3xl font-medium tracking-tight sm:text-4xl">
              Un local, de la fecha al pago
            </h2>
            <p className="mt-3 max-w-xl text-ink-muted">Ejemplo ficticio. Así se ve un cobro de principio a fin.</p>
            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              <li className="flex flex-col rounded-2xl border border-surface-border bg-surface-card p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-brand">1 · Tú cargas</p>
                <h3 className="mt-3 text-xl font-semibold">El local y la fecha</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  Nombre, monto y vencimiento. Si ya están en una planilla, los subes juntos.
                </p>
                <div className="mt-6 rounded-xl bg-surface px-4 py-4">
                  <p className="text-sm font-semibold">Almacén Los Aromos</p>
                  <p className="mt-1 font-display text-3xl">$186.000</p>
                  <p className="mt-1 text-sm text-ink-muted">Vence el 9 de octubre</p>
                </div>
              </li>
              <li className="flex flex-col rounded-2xl border border-surface-border bg-surface-card p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-brand">2 · GeldFlus avisa</p>
                <h3 className="mt-3 text-xl font-semibold">El mensaje sale solo</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  Antes de la fecha, el día y si se pasa. Por WhatsApp y por correo.
                </p>
                <div className="mt-6 rounded-xl bg-[#141716] px-4 py-4 text-[rgb(245_242_234)]">
                  <p className="text-xs text-[rgb(245_242_234)]/55">Mensaje al local</p>
                  <p className="mt-2 text-sm leading-relaxed">
                    Tu cuenta de $186.000 vence el 9 de octubre. Puedes pagarla desde este enlace.
                  </p>
                </div>
              </li>
              <li className="flex flex-col rounded-2xl border border-surface-border bg-surface-card p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-brand">3 · El local paga</p>
                <h3 className="mt-3 text-xl font-semibold">Sin crear una cuenta</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  Abre el enlace y paga con tarjeta. Si transfiere o paga con cheque, lo marcas tú.
                </p>
                <div className="mt-6 rounded-xl bg-brand-soft px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-brand">Pagado</p>
                  <p className="mt-1 font-display text-3xl">$186.000</p>
                  <p className="mt-1 text-sm text-ink-muted">Entró el mismo día</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section id="planes" className="scroll-mt-24 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Tres tamaños. El mismo producto.</h2>
            <p className="mt-3 max-w-lg text-ink-muted">Eliges uno al crear la cuenta. La activamos y te enviamos la contraseña.</p>
            <div className="mt-8 grid items-stretch gap-4 md:grid-cols-3">
              {PLANS.map((plan) => (
                <article
                  key={plan.name}
                  className={`flex h-full flex-col rounded-2xl border p-6 ${
                    plan.highlight
                      ? "border-brand bg-[#141716] text-[rgb(245_242_234)] md:-translate-y-2"
                      : "border-surface-border bg-surface-card"
                  }`}
                >
                  {plan.highlight && <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#8fd4cf]">El más usado</p>}
                  <h3 className="text-2xl font-semibold">{plan.name}</h3>
                  <p className={`mt-2 text-sm ${plan.highlight ? "text-[rgb(245_242_234)]/65" : "text-ink-muted"}`}>{plan.detail}</p>
                  <p className="mt-5 font-display text-4xl">
                    {plan.price}
                    <span className={`ml-1 font-sans text-base ${plan.highlight ? "text-[rgb(245_242_234)]/55" : "text-ink-muted"}`}>/ mes</span>
                  </p>
                  <ul className="mt-5 space-y-2 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <Check className={`mt-0.5 size-4 shrink-0 ${plan.highlight ? "text-[#8fd4cf]" : "text-brand"}`} />
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

        <section id="preguntas" className="scroll-mt-24 px-4 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-medium tracking-tight">Preguntas</h2>
            <div className="mt-6 divide-y divide-surface-border border-y border-surface-border">
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

        <section id="contacto" className="scroll-mt-24 px-4 py-20 text-center sm:px-6">
          <div className="relative mx-auto max-w-xl overflow-hidden rounded-3xl bg-[#141716] px-6 py-14 text-[rgb(245_242_234)]">
            <div className="relative">
              <h2 className="font-display text-3xl font-medium tracking-tight">Cuéntanos de tu red</h2>
              <p className="mt-3 text-[rgb(245_242_234)]/75">Locales, montos y fechas. Te respondemos a la brevedad.</p>
              <a
                href={mailHref()}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-[#141716]"
              >
                <Mail className="size-4" />
                {CONTACT}
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-surface-border px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
          <BrandLogo className="h-7" />
          <p className="text-xs text-ink-muted">© {new Date().getFullYear()} GeldFlus · geldflus.com/landing</p>
        </div>
      </footer>
      <style>{`
        .land-hero {
          background:
            radial-gradient(42rem 24rem at 0% 20%, rgb(15 110 107 / 0.35), transparent 70%),
            #141716;
        }
      `}</style>
    </div>
  );
}

function AccountLinks({ loggedIn, stacked = false, onDark = false }: { loggedIn: boolean; stacked?: boolean; onDark?: boolean }) {
  if (loggedIn) {
    return (
      <Link to="/" className={`rounded-xl bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-hover ${stacked ? "mt-2" : ""}`}>
        Ir al panel
      </Link>
    );
  }
  return (
    <div className={stacked ? "mt-2 flex flex-col gap-2" : "flex items-center gap-2"}>
      <Link
        to="/login"
        className={`rounded-xl px-4 py-2.5 text-center text-sm font-semibold ${
          stacked
            ? "border border-surface-border text-ink"
            : onDark
              ? "text-[rgb(245_242_234)]/80 hover:text-white"
              : "text-ink hover:bg-brand-soft"
        }`}
      >
        Entrar
      </Link>
      <Link to="/register" className="rounded-xl bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-hover">
        Crear cuenta
      </Link>
    </div>
  );
}

