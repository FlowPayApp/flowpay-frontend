import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import AuthShell from "../components/AuthShell";
import AuthLoadingOverlay from "../components/AuthLoadingOverlay";
import { useToast } from "../components/Toast";
import { useMinLoading } from "../lib/useMinLoading";

type SignupPlan = {
  id: string;
  label: string;
  detail: string;
  price: string;
  period: string;
  features: string[];
  highlight?: boolean;
  commission_percent?: number;
};

const FALLBACK_PLANS: SignupPlan[] = [
  {
    id: "esencial",
    label: "Esencial",
    detail: "Para una operación chica que hoy cobra a mano.",
    price: "$39.000",
    period: "mes",
    features: ["Hasta 25 sucursales", "Recordatorios por correo y WhatsApp", "Enlace de pago con Webpay", "1 administrador"],
  },
  {
    id: "crecimiento",
    label: "Crecimiento",
    detail: "Para quien ya recorre varias sucursales y necesita equipo.",
    price: "$89.000",
    period: "mes",
    highlight: true,
    features: ["Hasta 120 sucursales", "Todo lo de Esencial", "Cobradores en el equipo", "Carga de sucursales desde Excel"],
  },
  {
    id: "empresa",
    label: "Empresa",
    detail: "Para una red grande, con puesta en marcha acompañada.",
    price: "$169.000",
    period: "mes",
    features: ["Sucursales sin tope", "Todo lo de Crecimiento", "Varios administradores", "Acompañamiento en la carga inicial"],
  },
];

export default function Register() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState("");
  const [plans, setPlans] = useState<SignupPlan[]>(FALLBACK_PLANS);
  const [done, setDone] = useState<string | null>(null);
  const [loadingRaw, setLoading] = useState(false);
  const loading = useMinLoading(loadingRaw);

  useEffect(() => {
    fetch("/auth/plans")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SignupPlan[] | null) => {
        if (Array.isArray(data) && data.length > 0 && data.every((item) => item.price && item.features?.length)) {
          setPlans(data);
        }
      })
      .catch(() => undefined);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!plan) {
      toast.error("Elige un plan.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          company_name: companyName,
          phone,
          plan,
        }),
      });
      const data = (await res.json()) as { pending?: boolean; message?: string; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo registrar");
        return;
      }
      setDone(data.message ?? "Recibimos tu solicitud. La revisamos y, cuando la empresa quede lista, te escribimos con la contraseña para entrar.");
    } catch {
      toast.error("Error de red. ¿Está flowpay-sso en marcha?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Crear cuenta"
      aside={done ? undefined : <PlanList plans={plans} selected={plan} onSelect={setPlan} columns />}
      lede={done ? "Tu solicitud quedó registrada." : "Cuéntanos de tu empresa. El plan se elige a la izquierda. La contraseña te la entregamos cuando la cuenta quede activa."}
      footer={
        <p className="text-center sm:text-left">
          <Link to="/login" className="font-semibold text-brand hover:underline">
            Ya tengo cuenta
          </Link>
        </p>
      }
    >
      {loading && <AuthLoadingOverlay message="Enviando tu solicitud…" />}
      {done ? (
        <div className="space-y-4">
          <p className="text-sm text-ink">{done}</p>
          <p className="text-sm text-ink-muted">Puedes cerrar esta página tranquilo. Te avisamos apenas puedas ingresar.</p>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit}>
        {plan ? (
          <p className="hidden text-sm text-ink-muted lg:block">
            Plan elegido: {plans.find((item) => item.id === plan)?.label} · {plans.find((item) => item.id === plan)?.price} / mes
          </p>
        ) : (
          <p className="hidden text-sm text-ink-muted lg:block">Elige un plan en el panel de la izquierda.</p>
        )}
        <div className="lg:hidden">
          <p className="mb-2 text-sm font-medium text-ink">Plan</p>
          <PlanList plans={plans} selected={plan} onSelect={setPlan} />
        </div>
        <label className="block text-sm font-medium text-ink">
          Nombre del negocio
          <input
            required
            className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium text-ink">
          Tu nombre
          <input
            required
            className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium text-ink">
          Teléfono
          <input
            required
            className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+56 9 1234 5678"
          />
        </label>
        <label className="block text-sm font-medium text-ink">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="min-h-12 w-full rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {loading ? "Enviando…" : "Enviar solicitud"}
        </button>
      </form>
      )}
    </AuthShell>
  );
}

function PlanList({
  plans,
  selected,
  onSelect,
  columns = false,
}: {
  plans: SignupPlan[];
  selected: string;
  onSelect: (id: string) => void;
  columns?: boolean;
}) {
  return (
    <div className={columns ? "mx-auto w-full max-w-4xl" : undefined}>
      <p className={`font-display font-medium tracking-tight ${columns ? "text-2xl text-[rgb(245_242_234)]" : "text-xl text-ink"}`}>Elige tu plan</p>
      <p className={`mt-1 text-sm ${columns ? "text-[rgb(245_242_234)]/65" : "text-ink-muted"}`}>Precios de referencia. No se cobran al enviar la solicitud.</p>
      <div className={columns ? "mt-4 grid w-full grid-cols-3 gap-3" : "mt-3 grid grid-cols-1 gap-2.5"}>
        {plans.map((item) => {
          const active = selected === item.id;
          const pop = Boolean(item.highlight);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`flex h-full flex-col rounded-2xl border text-left transition-colors duration-200 ${
                columns ? "min-h-[26rem] justify-between px-4 py-6" : "px-4 py-4"
              } ${
                columns
                  ? active
                    ? "border-teal-200/70 bg-teal-400/10"
                    : pop
                      ? "border-[rgb(245_242_234)]/25 bg-[rgb(245_242_234)]/[0.07] hover:border-[rgb(245_242_234)]/40"
                      : "border-[rgb(245_242_234)]/15 bg-[rgb(245_242_234)]/[0.04] hover:border-[rgb(245_242_234)]/30"
                  : active
                    ? "border-brand bg-brand-soft"
                    : pop
                      ? "border-brand/40 bg-brand-soft/60"
                      : "border-surface-border bg-surface-card hover:border-brand/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${columns ? "text-teal-200/90" : "text-brand"}`}>{item.label}</p>
                <span className="flex items-center gap-1.5">
                  {pop ? (
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${columns ? "border-teal-200/25 text-teal-100/90" : "border-brand/30 text-brand"}`}>
                      Recomendado
                    </span>
                  ) : null}
                  {active ? (
                    <span className={`grid h-5 w-5 place-items-center rounded-full ${columns ? "bg-teal-200/90 text-stone-900" : "bg-brand text-white"}`}>
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  ) : null}
                </span>
              </div>
              <p className={`mt-2 leading-snug ${columns ? "text-sm text-[rgb(245_242_234)]/65" : "text-xs text-ink-muted"}`}>{item.detail}</p>
              <p className={`mt-3 font-display font-medium leading-none tracking-tight ${columns ? "text-3xl text-[rgb(245_242_234)]" : "text-2xl text-ink"}`}>
                {item.price}
                <span className={`ml-1 text-xs font-normal ${columns ? "text-[rgb(245_242_234)]/55" : "text-ink-muted"}`}>/ {item.period}</span>
              </p>
              {item.commission_percent ? (
                <p className={`mt-2 text-xs ${columns ? "text-[rgb(245_242_234)]/70" : "text-ink-muted"}`}>
                  Comisión {new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(item.commission_percent)}% por pago cobrado
                </p>
              ) : null}
              <ul className="mt-6 space-y-1.5">
                {item.features.map((feature) => (
                  <li key={feature} className={`flex items-start gap-1.5 leading-snug ${columns ? "text-sm text-[rgb(245_242_234)]/80" : "text-xs text-ink-muted"}`}>
                    <Check className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${columns ? "text-teal-200/80" : "text-brand"}`} strokeWidth={3} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
    </div>
  );
}
