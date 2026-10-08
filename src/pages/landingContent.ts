export const SITE_URL = "https://www.geldflus.com";
export const CONTACT = "contacto@geldflus.com";

export const SEO_TITLE = "GeldFlus · Cobranza automática para distribuidores por WhatsApp";
export const SEO_DESCRIPTION =
  "GeldFlus le avisa a cada local antes de que venza, por WhatsApp y correo, con un enlace para pagar. Cobranza automática para distribuidores en Chile.";

export const PLANS = [
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

export const FAQ = [
  {
    q: "¿Para quién es?",
    a: "Para quien reparte a almacenes y sucursales y cobra después. Cada local queda con su encargado, su teléfono y su fecha.",
  },
  {
    q: "¿El local tiene que registrarse?",
    a: "No. Le llega el enlace, ve el monto y paga. Tú sigues en tu panel.",
  },
  {
    q: "¿El local puede responder el mensaje?",
    a: "Sí. Su respuesta queda en el mismo cobro, y tú la ves en tu panel.",
  },
  {
    q: "¿Y si paga por transferencia o con cheque?",
    a: "Lo marcas como pagado y deja de recibir avisos. El enlace es para cuando paga con tarjeta.",
  },
  {
    q: "¿Tengo que cargar los locales uno por uno?",
    a: "No. En los planes Crecimiento y Empresa los subes todos desde una planilla.",
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
