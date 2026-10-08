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
  const [beat, setBeat] = useState(0);
  const [store, setStore] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const current = STORES[store];
  const scene = BEATS[beat];

  useEffect(() => {
    const prev = document.title;
    document.title = "GeldFlus — cobra a tus locales";
    return () => {
      document.title = prev;
    };
  }, []);

  function chooseBeat(index: number) {
    setBeat(index);
    if (index === 2) setStore(2);
    if (index === 1 && store === 2) setStore(1);
  }

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
            <AccountLinks loggedIn={loggedIn} />
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
        <section className="px-4 pb-8 pt-14 sm:px-6 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold text-brand">Para distribuidores</p>
            <h1 className="mt-3 font-display text-4xl font-medium tracking-tight text-balance sm:text-6xl">
              Cobra a tus locales sin perseguirlos
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ink-muted">
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
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-surface-border bg-surface-card px-6 text-base font-semibold sm:w-auto"
              >
                Ver cómo funciona
              </a>
            </div>
          </div>
        </section>

        <section id="recorrido" className="scroll-mt-24 px-4 py-10 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-2 sm:grid-cols-3">
              {BEATS.map((item, index) => {
                const active = beat === index;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => chooseBeat(index)}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      active
                        ? "border-brand bg-brand text-white"
                        : "border-surface-border bg-surface-card hover:border-brand/40"
                    }`}
                  >
                    <span className={`text-xs font-semibold uppercase tracking-widest ${active ? "text-white/70" : "text-brand"}`}>
                      0{index + 1}
                    </span>
                    <span className="mt-1 block text-lg font-semibold">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid overflow-hidden rounded-2xl border border-surface-border bg-surface-card lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
              <div className="border-b border-surface-border p-6 sm:p-8 lg:border-b-0 lg:border-r">
                <p key={scene.id} className="land-in">
                  <span className="font-display text-3xl font-medium tracking-tight">{scene.title}</span>
                  <span className="mt-3 block text-base leading-relaxed text-ink-muted">{scene.text}</span>
                </p>
                <p className="mt-8 text-xs font-semibold uppercase tracking-widest text-ink-muted">Elige un local</p>
                <div className="mt-3 space-y-2">
                  {STORES.map((item, index) => {
                    const selected = store === index;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setStore(index)}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition ${
                          selected ? "border-brand bg-brand-soft" : "border-transparent hover:bg-surface"
                        }`}
                      >
                        <span>
                          <span className="block font-semibold">{item.name}</span>
                          <span className="text-sm text-ink-muted">{item.when}</span>
                        </span>
                        <span className="shrink-0 font-mono text-sm">{item.amount}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-surface p-6 sm:p-8">
                <Preview beat={scene.id} store={current} />
              </div>
            </div>
          </div>
        </section>

        <section id="planes" className="scroll-mt-24 px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Tres tamaños. El mismo producto.</h2>
            <p className="mt-3 max-w-lg text-ink-muted">Eliges uno al crear la cuenta. La activamos y te enviamos la contraseña.</p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {PLANS.map((plan) => (
                <article
                  key={plan.name}
                  className={`flex h-full flex-col rounded-2xl border p-6 ${
                    plan.highlight ? "border-brand bg-brand-soft" : "border-surface-border bg-surface-card"
                  }`}
                >
                  {plan.highlight && <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand">El más usado</p>}
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

        <section id="preguntas" className="scroll-mt-24 px-4 pb-8 sm:px-6">
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

        <section id="contacto" className="scroll-mt-24 px-4 py-16 text-center sm:px-6">
          <div className="mx-auto max-w-xl rounded-3xl bg-ink px-6 py-12 text-[rgb(245_242_234)]">
            <h2 className="font-display text-3xl font-medium tracking-tight">Cuéntanos de tu red</h2>
            <p className="mt-3 text-[rgb(245_242_234)]/75">Locales, montos y fechas. Te respondemos a la brevedad.</p>
            <a
              href={mailHref()}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-ink"
            >
              <Mail className="size-4" />
              {CONTACT}
            </a>
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
        .land-in { animation: land-in 0.35s ease; }
        @keyframes land-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .land-in { animation: none; }
        }
      `}</style>
    </div>
  );
}

function AccountLinks({ loggedIn, stacked = false }: { loggedIn: boolean; stacked?: boolean }) {
  if (loggedIn) {
    return (
      <Link to="/" className={`rounded-xl bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-hover ${stacked ? "mt-2" : ""}`}>
        Ir al panel
      </Link>
    );
  }
  return (
    <div className={stacked ? "mt-2 flex flex-col gap-2" : "flex items-center gap-2"}>
      <Link to="/login" className={`rounded-xl px-4 py-2.5 text-center text-sm font-semibold text-ink hover:bg-brand-soft ${stacked ? "border border-surface-border" : ""}`}>
        Entrar
      </Link>
      <Link to="/register" className="rounded-xl bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-hover">
        Crear cuenta
      </Link>
    </div>
  );
}

function Preview({
  beat,
  store,
}: {
  beat: (typeof BEATS)[number]["id"];
  store: (typeof STORES)[number];
}) {
  const badge =
    store.tone === "danger" ? "bg-danger-soft text-danger" : store.tone === "warn" ? "bg-warn-soft text-warn" : "bg-brand-soft text-brand";

  if (beat === "aviso") {
    return (
      <div key={`${beat}-${store.name}`} className="land-in flex h-full min-h-72 flex-col justify-end">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-muted">WhatsApp · {store.name}</p>
        <div className="max-w-sm rounded-2xl rounded-bl-md bg-surface-card px-4 py-3 text-sm leading-relaxed shadow-soft ring-1 ring-surface-border">
          {store.message}
        </div>
        <p className="mt-4 text-sm text-ink-muted">{store.outcome}</p>
      </div>
    );
  }

  if (beat === "pago") {
    const paid = store.tone === "brand";
    return (
      <div key={`${beat}-${store.name}`} className="land-in flex h-full min-h-72 flex-col justify-center">
        <div className="rounded-2xl bg-surface-card p-6 ring-1 ring-surface-border">
          <p className="text-sm text-ink-muted">{store.name}</p>
          <p className="mt-1 font-display text-4xl">{store.amount}</p>
          <p className={`mt-4 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${badge}`}>{paid ? "Pagado" : "Enlace listo"}</p>
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">{paid ? store.message : "El local abre el enlace, paga con tarjeta y tú lo ves al momento."}</p>
        </div>
      </div>
    );
  }

  return (
    <div key={`${beat}-${store.name}`} className="land-in">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Hoy</p>
      <ul className="mt-4 space-y-3">
        {STORES.map((item) => {
          const on = item.name === store.name;
          const pill =
            item.tone === "danger" ? "bg-danger-soft text-danger" : item.tone === "warn" ? "bg-warn-soft text-warn" : "bg-brand-soft text-brand";
          return (
            <li
              key={item.name}
              className={`flex items-center justify-between gap-3 rounded-xl px-3 py-3 ${on ? "bg-surface-card ring-1 ring-brand" : ""}`}
            >
              <span>
                <span className="block font-semibold">{item.name}</span>
                <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${pill}`}>{item.status}</span>
              </span>
              <span className="font-mono text-sm">{item.amount}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
