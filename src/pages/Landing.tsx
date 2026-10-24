import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Mail, Menu, Moon, Sun, X } from "lucide-react";
import BrandLogo from "../components/BrandLogo";
import { useTheme } from "../theme";
import { CONTACT, FAQ, PLANS, SEO_TITLE } from "./landingContent";

const STEP_MS = 10000;

const NAV = [
  { href: "#recorrido", label: "Cómo funciona" },
  { href: "#planes", label: "Planes" },
  { href: "#preguntas", label: "Preguntas" },
  { href: "#contacto", label: "Contacto" },
] as const;

function mailHref() {
  const subject = "Consulta sobre GeldFlus";
  const body = "Estimados,\n\nDeseo conocer GeldFlus para la cobranza de mis locales.\n\nEmpresa:\nCantidad aproximada de locales:\n\nSaludos cordiales.";
  return `mailto:${CONTACT}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function Landing() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [step, setStep] = useState(0);
  const [motion, setMotion] = useState(
    () => typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches && document.visibilityState === "visible",
  );
  const [hold, setHold] = useState(false);
  const [pinned, setPinned] = useState(false);
  const solidNav = scrolled || menu;

  function chooseStep(index: number) {
    if (index === step) {
      setPinned((value) => !value);
      return;
    }
    setStep(index);
    setPinned(true);
  }

  useEffect(() => {
    const prev = document.title;
    document.title = SEO_TITLE;
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

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotion(!media.matches && document.visibilityState === "visible");
    sync();
    media.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      media.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return (
    <div className="min-h-dvh bg-surface text-ink">
      <header
        className={`fixed inset-x-0 top-0 z-30 transition-colors duration-300 ${
          solidNav ? "border-b border-surface-border bg-surface" : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="GeldFlus">
            <BrandLogo tone={solidNav ? "auto" : "onDark"} className="h-8" />
          </Link>
          <nav className={`hidden items-center gap-6 text-sm font-medium md:flex ${solidNav ? "text-ink-muted" : "text-[#f5f2ea]/75"}`}>
            <a
              href="#empezar"
              className={`-mx-1 rounded-full px-3 py-1.5 font-semibold transition-colors ${
                solidNav
                  ? "bg-brand-soft text-brand hover:bg-brand hover:text-white dark:text-[#8fd4cf]"
                  : "bg-[#8fd4cf]/15 text-[#8fd4cf] hover:bg-[#8fd4cf] hover:text-[#141716]"
              }`}
            >
              Comenzar
            </a>
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className={solidNav ? "hover:text-ink" : "hover:text-white"}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2 md:ml-6">
            <Link
              to="/login"
              className={`hidden px-2 text-sm font-medium transition-colors md:inline ${
                solidNav ? "text-ink-muted hover:text-ink" : "text-[#f5f2ea]/75 hover:text-white"
              }`}
            >
              Entrar
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              title={isDark ? "Modo claro" : "Modo oscuro"}
              aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
              className={`grid size-9 place-items-center rounded-lg border transition-colors ${
                solidNav
                  ? "border-surface-border bg-surface-card text-ink-muted hover:text-ink"
                  : "border-white/15 bg-white/5 text-[#f5f2ea]/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <button
              type="button"
              className={`grid size-10 place-items-center rounded-xl md:hidden ${solidNav ? "text-ink" : "text-white"}`}
              aria-label={menu ? "Cerrar menú" : "Abrir menú"}
              onClick={() => setMenu((v) => !v)}
            >
              {menu ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        {menu && (
          <div className="border-t border-surface-border bg-surface px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3 text-sm font-medium">
              <a
                href="#empezar"
                onClick={() => setMenu(false)}
                className="-ml-3 w-fit rounded-full bg-brand-soft px-3 py-1.5 font-semibold text-brand dark:text-[#8fd4cf]"
              >
                Comenzar
              </a>
              {NAV.map((item) => (
                <a key={item.href} href={item.href} onClick={() => setMenu(false)} className="py-1 text-ink-muted">
                  {item.label}
                </a>
              ))}
              <Link to="/login" className="mt-1 border-t border-surface-border pt-4 text-ink">
                Entrar
              </Link>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="land-hero relative overflow-hidden px-4 pb-16 pt-28 text-[rgb(245_242_234)] sm:px-6 sm:pb-20 sm:pt-32">
          <div className="relative mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-semibold tracking-wide text-[#8fd4cf]">Cobranza automática para distribuidores</p>
              <h1 className="mt-4 font-display text-5xl font-medium leading-[1.05] tracking-tight text-balance sm:text-7xl">
                <span className="block">Cobranza de cada local,</span>
                <span className="block text-[#8fd4cf]">con aviso y pago</span>
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-[#f5f2ea]/75">
                Registre el monto y la fecha de vencimiento. GeldFlus envía el recordatorio por WhatsApp y correo, con un enlace de pago. El estado del cobro queda en su panel.
              </p>
              <div className="mt-8 flex justify-center">
                <a
                  href="#recorrido"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 text-base font-semibold text-white hover:bg-brand-hover sm:w-auto"
                >
                  Cómo funciona
                  <ArrowRight className="size-4" />
                </a>
              </div>
            </div>

          </div>
        </section>

        <section id="recorrido" className="scroll-mt-4 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm font-semibold text-brand dark:text-[#8fd4cf]">Cómo funciona</p>
            <h2 className="mt-2 max-w-xl font-display text-3xl font-medium tracking-tight sm:text-4xl">
              Un cobro, del registro al pago
            </h2>
            <p className="mt-3 max-w-xl text-ink-muted">Ejemplo ilustrativo. El mismo cobro, en tres etapas. Seleccione la que desea revisar.</p>
            <div className="mt-8 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-surface-border bg-surface-card px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">El local</p>
                <p className="mt-1 font-display text-2xl sm:text-3xl">{EXAMPLE.store}</p>
              </div>
              <div className="sm:text-right">
                <p className="font-display text-2xl sm:text-3xl">{EXAMPLE.amount}</p>
                <p className="text-sm text-ink-muted">Vence el {EXAMPLE.due}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col justify-between gap-2 lg:flex-row lg:items-center">
              <p
                key={step}
                className="land-settle min-h-[4rem] font-display text-2xl font-medium leading-8 tracking-tight sm:min-h-[4.5rem] sm:text-3xl sm:leading-9 lg:min-h-[2.25rem]"
              >
                {STEPS[step].line}
              </p>
              <p className="shrink-0 text-sm text-ink-muted">{pinned ? "En pausa. Seleccione un paso para continuar." : "Avance automático"}</p>
            </div>
            <ol
              className={`mt-6 grid gap-4 md:grid-cols-3 ${hold || pinned ? "land-hold" : ""}`}
              onMouseEnter={() => setHold(true)}
              onMouseLeave={() => setHold(false)}
            >
              {STEPS.map((item, index) => {
                const active = step === index;
                return (
                  <li key={item.kicker} className="relative h-full">
                    <div
                      onClick={() => chooseStep(index)}
                      className={`relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-[1.4rem] border bg-surface-card p-5 text-left transition-[border-color,box-shadow,transform] duration-700 ease-out ${
                        active
                          ? "border-brand shadow-[0_18px_40px_-28px_rgb(15_110_107)] md:-translate-y-1.5"
                          : "border-surface-border hover:border-brand/40"
                      }`}
                    >
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={(event) => {
                          event.stopPropagation();
                          chooseStep(index);
                        }}
                        className="block w-full rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold transition-colors duration-700 ${
                              active ? "bg-brand text-white" : "bg-brand-soft text-brand dark:text-[#8fd4cf]"
                            }`}
                          >
                            {index + 1}
                          </span>
                          <span className="text-xs font-semibold uppercase tracking-widest text-brand dark:text-[#8fd4cf]">{item.kicker}</span>
                        </span>
                        <span className="mt-4 block font-display text-2xl font-medium tracking-tight">{item.title}</span>
                        <span className="mt-2 block text-sm leading-relaxed text-ink-muted">{item.text}</span>
                      </button>
                      <div className="mt-5 flex-1">
                        {item.scene({
                          live: active,
                          playing: active && motion && !pinned && !hold,
                          onUse: () => {
                            setStep(index);
                            setPinned(true);
                          },
                        })}
                      </div>
                      {active && motion && (
                        <span
                          className="land-step"
                          onAnimationEnd={(event) => {
                            if (event.animationName !== "land-step") return;
                            setPinned(false);
                            setStep((value) => (value + 1) % STEPS.length);
                          }}
                        />
                      )}
                    </div>
                    {index < STEPS.length - 1 && (
                      <span className="pointer-events-none absolute -right-5 top-7 z-10 hidden size-6 place-items-center rounded-full border border-surface-border bg-surface text-ink-muted md:grid" aria-hidden>
                        <ArrowRight className="size-3.5" />
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section id="empezar" className="scroll-mt-24 px-4 sm:px-6">
          <div className="land-cta relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] px-6 py-14 text-center text-[rgb(245_242_234)] dark:ring-1 dark:ring-white/10 sm:px-12 sm:py-20">
            <p className="text-sm font-semibold tracking-wide text-[#8fd4cf]">Para comenzar</p>
            <h2 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-medium leading-[1.05] tracking-tight text-balance sm:text-6xl">
              Active la cobranza de <span className="text-[#8fd4cf]">este mes</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-[#f5f2ea]/75">
              Solicite su cuenta. La revisamos, la activamos y enviamos las credenciales de acceso.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/register"
                className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#8fd4cf] px-8 text-base font-semibold text-[#141716] transition-colors hover:bg-white sm:w-auto"
              >
                Solicitar cuenta
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="#planes"
                className="inline-flex min-h-14 w-full items-center justify-center rounded-xl border border-white/20 px-8 text-base font-semibold hover:bg-white/10 sm:w-auto"
              >
                Ver planes
              </a>
            </div>
            <ul className="mx-auto mt-10 flex max-w-2xl flex-col items-center justify-center gap-3 text-sm text-[#f5f2ea]/75 sm:flex-row sm:gap-8">
              {["Acceso desde el navegador", "El local no requiere una cuenta", "Recordatorios por WhatsApp y correo"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-[#8fd4cf]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="planes" className="scroll-mt-4 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Planes según la cantidad de locales</h2>
            <p className="mt-3 max-w-lg text-ink-muted">Todos los planes incluyen recordatorios por WhatsApp y correo, y el enlace de pago.</p>
            <div className="mt-8 grid items-stretch gap-4 md:grid-cols-3">
              {PLANS.map((plan) => (
                <article
                  key={plan.name}
                  className={`flex h-full flex-col rounded-2xl border p-6 ${
                    plan.highlight
                      ? "border-brand bg-[#141716] text-[rgb(245_242_234)] dark:bg-[#0c0f0e] md:-translate-y-2"
                      : "border-surface-border bg-surface-card"
                  }`}
                >
                  {plan.highlight && <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#8fd4cf]">Recomendado</p>}
                  <h3 className="text-2xl font-semibold">{plan.name}</h3>
                  <p className={`mt-2 text-sm ${plan.highlight ? "text-[#f5f2ea]/65" : "text-ink-muted"}`}>{plan.detail}</p>
                  <p className="mt-5 font-display text-4xl">
                    {plan.price}
                    <span className={`ml-1 font-sans text-base ${plan.highlight ? "text-[#f5f2ea]/55" : "text-ink-muted"}`}>/ mes</span>
                  </p>
                  <ul className="mt-5 space-y-2 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <Check className={`mt-0.5 size-4 shrink-0 ${plan.highlight ? "text-[#8fd4cf]" : "text-brand dark:text-[#8fd4cf]"}`} />
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
                    Solicitar este plan
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="preguntas" className="scroll-mt-24 px-4 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-medium tracking-tight">Preguntas frecuentes</h2>
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

        <section id="contacto" className="scroll-mt-4 px-4 py-20 text-center sm:px-6">
          <div className="relative mx-auto max-w-xl overflow-hidden rounded-3xl bg-[#141716] px-6 py-14 text-[rgb(245_242_234)] dark:ring-1 dark:ring-white/10">
            <div className="relative">
              <h2 className="font-display text-3xl font-medium tracking-tight">Consulte antes de solicitar su cuenta</h2>
              <p className="mt-3 text-[#f5f2ea]/75">Indíquenos la cantidad de locales y cómo gestiona la cobranza actualmente. Respondemos por correo.</p>
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
          <p className="text-xs text-ink-muted">© {new Date().getFullYear()} GeldFlus · geldflus.com</p>
        </div>
      </footer>
      <style>{`
        .land-hero {
          background:
            radial-gradient(42rem 24rem at 0% 20%, rgb(15 110 107 / 0.35), transparent 70%),
            #141716;
        }
        html { scroll-behavior: smooth; }
        .land-cta {
          background:
            radial-gradient(38rem 22rem at 100% 0%, rgb(143 212 207 / 0.22), transparent 70%),
            radial-gradient(42rem 26rem at 0% 100%, rgb(15 110 107 / 0.55), transparent 70%),
            #141716;
        }
        .land-settle {
          animation: land-settle 0.9s ease;
        }
        .land-row { animation: land-settle 0.8s ease both; }
        .land-row:nth-child(2) { animation-delay: 0.15s; }
        .land-row:nth-child(3) { animation-delay: 0.3s; }
        .land-step {
          pointer-events: none;
          position: absolute;
          left: 0;
          bottom: 0;
          height: 2px;
          width: 100%;
          transform: scaleX(0);
          transform-origin: left center;
          background: #0f6e6b;
          animation: land-step ${STEP_MS}ms linear forwards;
        }
        .land-hold .land-step {
          animation-play-state: paused;
        }
        @keyframes land-settle {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes land-step {
          to { transform: scaleX(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          .land-settle, .land-step, .land-row { animation: none; }
        }
      `}</style>
    </div>
  );
}

const EXAMPLE = {
  store: "Almacén Los Aromos",
  amount: "$186.000",
  due: "9 de octubre",
};

type SceneProps = { live: boolean; playing: boolean; onUse: () => void };

const STEPS = [
  {
    kicker: "Registro",
    title: "Local, monto y fecha",
    line: "Registre el local, el monto y el vencimiento.",
    text: "El cobro queda en la cartera. Los recordatorios se programan a partir de esa fecha.",
    scene: (props: SceneProps) => <LoadScene {...props} />,
  },
  {
    kicker: "Recordatorio",
    title: "El aviso se envía en la fecha",
    line: "El recordatorio se envía por WhatsApp y por correo.",
    text: "Antes del vencimiento, el día que vence y si la fecha se supera. Seleccione el canal y el momento.",
    scene: (props: SceneProps) => <MessageScene {...props} />,
  },
  {
    kicker: "Pago",
    title: "Enlace de pago",
    line: "El local paga desde el enlace, sin crear una cuenta.",
    text: "Con tarjeta, a través de Webpay. Transferencia y cheque se registran en el panel y detienen los avisos.",
    scene: (props: SceneProps) => <PayScene {...props} />,
  },
];

const CHANNELS = ["WhatsApp", "Correo"] as const;

const MOMENTS = [
  {
    label: "Antes",
    subject: `Su cuenta vence el ${EXAMPLE.due}`,
    text: `Su cuenta de ${EXAMPLE.amount} vence el ${EXAMPLE.due}. Puede pagarla desde este enlace.`,
  },
  {
    label: "El día",
    subject: "Su cuenta vence hoy",
    text: `Hoy vence su cuenta de ${EXAMPLE.amount}. Puede pagarla desde este enlace.`,
  },
  {
    label: "Vencido",
    subject: "Su cuenta se encuentra vencida",
    text: `Su cuenta de ${EXAMPLE.amount} venció el ${EXAMPLE.due}. Puede pagarla desde este enlace.`,
  },
] as const;

function LoadScene({ live }: SceneProps) {
  const rows = [
    ["Local", EXAMPLE.store],
    ["Monto", EXAMPLE.amount],
    ["Vence", EXAMPLE.due],
  ];
  return (
    <div className="rounded-2xl bg-surface p-2.5">
      <ul>
        {rows.map(([label, value]) => (
          <li key={label} className={`mt-1.5 flex items-center justify-between gap-3 rounded-xl bg-surface-card px-3 py-2.5 first:mt-0 ${live ? "land-row" : ""}`}>
            <span>
              <span className="block text-[11px] font-medium uppercase tracking-wider text-ink-muted">{label}</span>
              <span className="text-sm font-semibold">{value}</span>
            </span>
            <span className={`grid size-5 shrink-0 place-items-center rounded-full ${live ? "bg-brand text-white" : "bg-brand-soft text-brand dark:text-[#8fd4cf]"}`}>
              <Check className="size-3" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MessageScene({ live, playing, onUse }: SceneProps) {
  const [channel, setChannel] = useState(0);
  const [moment, setMoment] = useState(0);
  const fromUser = useRef(false);
  const current = MOMENTS[moment];

  useEffect(() => {
    if (live && !fromUser.current) setMoment(0);
    fromUser.current = false;
  }, [live]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setMoment((value) => (value + 1) % MOMENTS.length), STEP_MS / MOMENTS.length);
    return () => window.clearInterval(id);
  }, [playing]);

  function pick(event: MouseEvent, apply: () => void) {
    event.stopPropagation();
    fromUser.current = true;
    onUse();
    apply();
  }

  return (
    <div className="flex h-full flex-col rounded-2xl bg-[#141716] p-4 text-[rgb(245_242_234)] dark:bg-[#0c0f0e] dark:ring-1 dark:ring-white/10">
      <div className="flex w-fit gap-1 rounded-full bg-white/10 p-1" role="group" aria-label="Canal">
        {CHANNELS.map((label, index) => (
          <button
            key={label}
            type="button"
            aria-pressed={channel === index}
            onClick={(event) => pick(event, () => setChannel(index))}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors duration-300 ${
              channel === index ? "bg-white text-[#141716]" : "text-[#f5f2ea]/70 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-4 min-h-[8.5rem]">
        {channel === 0 ? (
          <p key={`w${moment}`} className="land-settle rounded-2xl rounded-bl-md bg-[#0f6e6b] px-3 py-3 text-sm leading-relaxed">
            {current.text}
          </p>
        ) : (
          <div key={`c${moment}`} className="land-settle rounded-xl bg-white px-3 py-3 text-[#141716]">
            <p className="text-[11px] text-[#141716]/55">Asunto</p>
            <p className="text-sm font-semibold">{current.subject}</p>
            <p className="mt-2 text-xs leading-relaxed text-[#141716]/70">{current.text}</p>
          </div>
        )}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5" role="group" aria-label="Momento del aviso">
        {MOMENTS.map((item, index) => (
          <button
            key={item.label}
            type="button"
            aria-pressed={moment === index}
            onClick={(event) => pick(event, () => setMoment(index))}
            className={`rounded-lg px-1 py-1.5 text-[11px] font-semibold transition-colors duration-300 ${
              moment === index ? "bg-[#8fd4cf] text-[#141716]" : "bg-white/10 text-[#f5f2ea]/75 hover:bg-white/15"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PayScene({ live }: SceneProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl bg-brand-soft p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-full bg-brand text-white">
          <Check className="size-4" />
        </span>
        <span>
          <span className="block text-xs font-semibold uppercase tracking-widest text-brand dark:text-[#8fd4cf]">Pagado</span>
          <span className="block text-xs text-ink-muted">Desde el enlace</span>
        </span>
      </div>
      <p className={`mt-4 font-display text-4xl ${live ? "land-settle" : ""}`}>{EXAMPLE.amount}</p>
      <p className="mt-1 text-sm font-semibold">{EXAMPLE.store}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">El local abrió el enlace y completó el pago, sin crear una cuenta.</p>
    </div>
  );
}


