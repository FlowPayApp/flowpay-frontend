export const SITE_URL = "https://www.geldflus.com";
export const CONTACT = "contacto@geldflus.com";

export const SEO_TITLE = "GeldFlus · Cobranza automática para distribuidores";
export const SEO_DESCRIPTION =
  "Registre los cobros de cada local, envíe recordatorios por WhatsApp y correo, y cobre con un enlace de pago. Plataforma de cobranza para distribuidores en Chile.";

export const PLANS = [
  {
    name: "Esencial",
    detail: "Para operaciones que hoy cobran de forma manual.",
    price: "$39.000",
    features: ["Hasta 25 locales", "Recordatorios por WhatsApp y correo", "Enlace de pago con Webpay", "1 administrador"],
    highlight: false,
  },
  {
    name: "Crecimiento",
    detail: "Para una red con equipo de cobranza.",
    price: "$89.000",
    features: ["Hasta 120 locales", "Todo lo de Esencial", "Equipo de cobradores", "Importación desde planilla"],
    highlight: true,
  },
  {
    name: "Empresa",
    detail: "Para redes de mayor escala.",
    price: "$169.000",
    features: ["Locales sin límite", "Todo lo de Crecimiento", "Varios administradores", "Acompañamiento en la implementación"],
    highlight: false,
  },
] as const;

export const FAQ = [
  {
    q: "¿A quién está dirigido?",
    a: "A empresas que distribuyen a almacenes y sucursales y cobran a plazo. Cada local queda asociado a un encargado, un teléfono y sus fechas de vencimiento.",
  },
  {
    q: "¿El local debe crear una cuenta?",
    a: "No. Recibe el enlace, consulta el monto y paga. El seguimiento continúa en el panel de la empresa.",
  },
  {
    q: "¿El local puede responder el mensaje?",
    a: "Sí. La respuesta queda asociada al mismo cobro y se visualiza en el panel.",
  },
  {
    q: "¿Qué ocurre si el pago es por transferencia o cheque?",
    a: "El cobro se registra como pagado y se detienen los recordatorios. El enlace de pago aplica cuando el local paga con tarjeta.",
  },
  {
    q: "¿Los locales se cargan uno por uno?",
    a: "En los planes Crecimiento y Empresa puede importarlos desde una planilla.",
  },
] as const;

export function structuredData() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "GeldFlus",
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/brand/logo.png`,
      email: CONTACT,
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "GeldFlus",
      url: `${SITE_URL}/`,
      description: SEO_DESCRIPTION,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: "es-CL",
      offers: PLANS.map((plan) => ({
        "@type": "Offer",
        name: plan.name,
        price: plan.price.replace(/\D/g, ""),
        priceCurrency: "CLP",
        description: plan.features.join(". "),
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ];
}
