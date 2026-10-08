import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Mail, Menu, Pause, Play, X } from "lucide-react";
import BrandLogo from "../components/BrandLogo";
import { getToken } from "../lib/auth";

const CONTACT = "contacto@geldflus.com";
const BEAT_MS = 5200;

const NAV = [
  { href: "#recorrido", label: "Cómo funciona" },
  { href: "#planes", label: "Planes" },
  { href: "#preguntas", label: "Preguntas" },
  { href: "#contacto", label: "Contacto" },
] as const;

const STORES = [
  {
    name: "Almacén Los Aromos",
    amount: "$186.000",
    when: "Se pasó hace 5 días",
    tone: "danger" as const,
    status: "Vencido",
    message: "Hola. La cuenta de Almacén Los Aromos, $186.000, ya venció. Puedes pagarla desde este enlace.",
    outcome: "Sigue en la lista hasta que pague o tú lo marques.",
  },
  {
    name: "Minimarket Central",
    amount: "$94.500",
    when: "Vence en 2 días",
    tone: "warn" as const,
    status: "Por vencer",
    message: "Hola. El Minimarket Central tiene $94.500 que vencen en 2 días. El enlace de pago va en este mensaje.",
    outcome: "Si paga ahora, mañana ya no aparece como pendiente.",
  },
  {
    name: "Local Esquina Sur",
    amount: "$210.000",
    when: "Pagó ayer",
    tone: "brand" as const,
    status: "Pagado",
    message: "El local abrió el enlace y pagó con tarjeta. No tuvo que crear una cuenta.",
    outcome: "Quedó pagado. Sales de esa conversación.",
  },
];

const BEATS = [
  {
    id: "lista",
    label: "La lista",
    title: "Al abrir, ves quién debe",
    text: "Cada local tiene su monto y su fecha. La mañana parte por lo que ya se pasó.",
  },
  {
    id: "aviso",
    label: "El aviso",
    title: "El mensaje sale solo",
    text: "WhatsApp y correo, antes de la fecha y si se pasa. El local puede responder.",
  },
  {
    id: "pago",
    label: "El pago",
    title: "Paga desde el teléfono",
    text: "Abre el enlace y paga con tarjeta. Si transfiere o paga con cheque, lo marcas y listo.",
  },
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
  const [beat, setBeat] = useState(0);
  const [store, setStore] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const current = STORES[store];
  const scene = BEATS[beat];
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

  useEffect(() => {
    if (!playing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setBeat((value) => {
        const next = (value + 1) % BEATS.length;
        setStore(next);
        return next;
      });
    }, BEAT_MS);
    return () => window.clearInterval(id);
  }, [playing]);

  function chooseBeat(index: number) {
    setPlaying(false);
    setBeat(index);
    setStore(index);
  }

  function chooseStore(index: number) {
    setPlaying(false);
    setStore(index);
    setBeat(index);
  }

  return (
    <div className="min-h-dvh bg-surface text-ink">
      <header
        className={`fixed inset-x-0 top-0 z-30 transition-colors duration-300 ${
          solidNav ? "border-b border-surface-border bg-surface/90 backdrop-blur" : "border-b border-transparent bg-transparent"
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
        <section className="relative overflow-hidden bg-[#141716] px-4 pb-16 pt-28 text-[rgb(245_242_234)] sm:px-6 sm:pb-20 sm:pt-32">
          <div className="land-orb land-orb-a" aria-hidden />
          <div className="land-orb land-orb-b" aria-hidden />
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
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 text-base font-semibold text-white shadow-[0_12px_40px_-12px_rgb(15_110_107)] hover:bg-brand-hover sm:w-auto"
                >
                  {loggedIn ? "Ir al panel" : "Crear cuenta"}
                  <ArrowRight className="size-4" />
                </Link>
                <a
                  href="#recorrido"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 text-base font-semibold backdrop-blur hover:bg-white/10 sm:w-auto"
                >
                  Ver el recorrido
                </a>
              </div>
            </div>

            <div id="recorrido" className="scroll-mt-24 mx-auto mt-14 max-w-5xl">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(245_242_234)]/50">
                  {playing ? "Se mueve solo" : "Lo estás recorriendo tú"}
                </p>
                <button
                  type="button"
                  onClick={() => setPlaying((value) => !value)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-[rgb(245_242_234)]/80 hover:bg-white/10"
                >
                  {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                  {playing ? "Pausar" : "Reanudar"}
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {BEATS.map((item, index) => {
                  const active = beat === index;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => chooseBeat(index)}
                      className={`relative overflow-hidden rounded-2xl border px-4 py-4 text-left transition ${
                        active ? "border-[#8fd4cf]/50 bg-white/10" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                      }`}
                    >
                      <span className="text-xs font-semibold uppercase tracking-widest text-[#8fd4cf]">0{index + 1}</span>
                      <span className="mt-1 block text-lg font-semibold">{item.label}</span>
                      {active && playing && <span key={beat} className="land-fill" />}
                      {active && !playing && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#8fd4cf]" />}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 grid items-center gap-6 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4 backdrop-blur sm:p-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:p-8">
                <div key={scene.id} className="land-in">
                  <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">{scene.title}</h2>
                  <p className="mt-3 max-w-md text-base leading-relaxed text-[rgb(245_242_234)]/70">{scene.text}</p>
                  <div className="mt-6 space-y-2">
                    {STORES.map((item, index) => {
                      const selected = store === index;
                      return (
                        <button
                          key={item.name}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => chooseStore(index)}
                          className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition ${
                            selected ? "bg-white text-[#141716]" : "hover:bg-white/10"
                          }`}
                        >
                          <span>
                            <span className="block text-sm font-semibold">{item.name}</span>
                            <span className={`text-xs ${selected ? "text-[#141716]/60" : "text-[rgb(245_242_234)]/55"}`}>{item.when}</span>
                          </span>
                          <span className="font-mono text-sm">{item.amount}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Stage beat={scene.id} store={current} />
              </div>
            </div>
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
                      ? "border-brand bg-[#141716] text-[rgb(245_242_234)] shadow-[0_24px_60px_-28px_rgb(15_110_107)] md:-translate-y-3"
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
            <div className="land-orb land-orb-c" aria-hidden />
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
        .land-orb {
          pointer-events: none;
          position: absolute;
          border-radius: 999px;
          filter: blur(40px);
        }
        .land-orb-a {
          width: 28rem;
          height: 28rem;
          left: -8rem;
          top: 4rem;
          background: rgb(15 110 107 / 0.45);
          animation: land-drift 14s ease-in-out infinite;
        }
        .land-orb-b {
          width: 22rem;
          height: 22rem;
          right: -6rem;
          bottom: 2rem;
          background: rgb(143 212 207 / 0.22);
          animation: land-drift 18s ease-in-out infinite reverse;
        }
        .land-orb-c {
          width: 16rem;
          height: 16rem;
          right: -4rem;
          top: -4rem;
          background: rgb(15 110 107 / 0.55);
        }
        .land-in { animation: land-in 0.45s ease; }
        .land-fill {
          position: absolute;
          left: 0;
          bottom: 0;
          height: 2px;
          width: 100%;
          transform-origin: left center;
          background: #8fd4cf;
          animation: land-fill ${BEAT_MS}ms linear;
        }
        .land-pop { animation: land-pop 0.55s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes land-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes land-drift {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(24px, -18px, 0); }
        }
        @keyframes land-fill {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @keyframes land-pop {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .land-in, .land-orb-a, .land-orb-b, .land-fill, .land-pop { animation: none; }
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

function Stage({
  beat,
  store,
}: {
  beat: (typeof BEATS)[number]["id"];
  store: (typeof STORES)[number];
}) {
  return (
    <div className="land-pop relative mx-auto w-full max-w-[22rem]" key={`${beat}-${store.name}`}>
      <div className="absolute -inset-6 -z-10 rounded-full bg-[#0f6e6b]/30 blur-3xl" aria-hidden />
      <div className="rounded-[2rem] border border-white/15 bg-[#0c0f0e] p-3 shadow-[0_30px_80px_-24px_rgb(0_0_0/0.8)]">
        <div className="rounded-[1.5rem] bg-[#101614] px-4 pb-5 pt-4">
          <div className="mb-4 flex items-center justify-between text-[10px] text-white/40">
            <span>9:41</span>
            <span className="rounded-full bg-white/10 px-2 py-0.5">{beat === "pago" ? "Pago" : beat === "aviso" ? "WhatsApp" : "Hoy"}</span>
          </div>
          {beat === "aviso" ? <Message store={store} /> : beat === "pago" ? <Receipt store={store} /> : <DayList active={store.name} />}
        </div>
      </div>
    </div>
  );
}

function DayList({ active }: { active: string }) {
  return (
    <ul className="space-y-2">
      {STORES.map((item) => {
        const on = item.name === active;
        return (
          <li key={item.name} className={`rounded-2xl px-3 py-3 ${on ? "bg-white text-[#141716]" : "bg-white/5 text-white/80"}`}>
            <span className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">{item.name}</span>
              <span className="font-mono text-xs">{item.amount}</span>
            </span>
            <span className={`mt-1 block text-xs ${on ? "text-[#141716]/60" : "text-white/45"}`}>{item.status}</span>
          </li>
        );
      })}
    </ul>
  );
}

function Message({ store }: { store: (typeof STORES)[number] }) {
  return (
    <div className="flex min-h-[18rem] flex-col justify-end">
      <p className="mb-3 text-xs text-white/45">{store.name}</p>
      <div className="max-w-[16rem] rounded-2xl rounded-bl-md bg-[#1f8a62] px-3 py-3 text-sm leading-relaxed text-white">{store.message}</div>
      <p className="mt-4 text-xs leading-relaxed text-white/50">{store.outcome}</p>
    </div>
  );
}

function Receipt({ store }: { store: (typeof STORES)[number] }) {
  const paid = store.tone === "brand";
  return (
    <div className="flex min-h-[18rem] flex-col justify-center rounded-2xl bg-white px-5 py-6 text-[#141716]">
      <p className="text-xs text-[#141716]/55">{store.name}</p>
      <p className="mt-1 font-display text-4xl">{store.amount}</p>
      <p className={`mt-4 inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${paid ? "bg-[#e0f2ef] text-[#0f6e6b]" : "bg-[#f5ecd8] text-[#7a5420]"}`}>
        {paid ? "Pagado" : "Enlace listo"}
      </p>
      <p className="mt-4 text-sm leading-relaxed text-[#141716]/70">
        {paid ? "Entró el pago. El local no creó una cuenta." : "El local abre el enlace y paga con tarjeta. Tú lo ves al momento."}
      </p>
    </div>
  );
}
