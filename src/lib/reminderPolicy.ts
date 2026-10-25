import type { ReminderMode, ReminderPolicy } from "../api";

export const OVERDUE_UNLIMITED = -1;

export const DEFAULT_REMINDER_POLICY: ReminderPolicy = { days_before: [3, 1, 0], overdue_every: 3, overdue_max: 5 };

function dayLabel(d: number) {
  if (d === 0) return "el día que vence";
  return d === 1 ? "1 día antes" : `${d} días antes`;
}

function joinList(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

/** Resumen en una frase, p. ej. "3 días antes, 1 día antes y el día que vence. Vencido: cada 3 días, hasta 5 avisos." */
export function describeReminderPolicy(p: ReminderPolicy) {
  const days = [...new Set(p.days_before)].sort((a, b) => b - a);
  const before = days.length > 0 ? joinList(days.map(dayLabel)) : "Nada antes del vencimiento";
  const every = p.overdue_every === 1 ? "cada día" : `cada ${p.overdue_every} días`;
  const after =
    p.overdue_max === 0
      ? "Vencido: sin avisos."
      : p.overdue_max === OVERDUE_UNLIMITED
        ? `Vencido: ${every} hasta que pague.`
        : `Vencido: ${every}, hasta ${p.overdue_max} ${p.overdue_max === 1 ? "aviso" : "avisos"}.`;
  return `${before.charAt(0).toUpperCase()}${before.slice(1)}. ${after}`;
}

export const REMINDER_MODE_OPTIONS: { value: ReminderMode; label: string }[] = [
  { value: "company", label: "Frecuencia de la empresa" },
  { value: "custom", label: "Solo este cobro" },
  { value: "off", label: "Sin avisos automáticos" },
];

const CHANNEL_LABELS: Record<string, string> = {
  all: "WhatsApp y correo",
  whatsapp: "Solo WhatsApp",
  email: "Solo correo",
  none: "Sin avisos",
};

function lowerFirst(text: string) {
  if (!text) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function mediumPhrase(channel: string) {
  switch (channel) {
    case "whatsapp":
      return "WhatsApp";
    case "email":
      return "correo";
    case "none":
      return "ningún medio";
    default:
      return "WhatsApp y correo";
  }
}

/** Cuándo se avisan los cobros, en una frase que se entiende sin conocer la configuración. */
export function describeChargeReminders(mode: ReminderMode, policy: ReminderPolicy) {
  if (mode === "off") {
    return "No se envían avisos solos. Puedes mandar uno a mano desde el cobro.";
  }
  const when = lowerFirst(describeReminderPolicy(policy));
  if (mode === "company") {
    return `Usa la frecuencia de la empresa, la misma del resto de los cobros: ${when}`;
  }
  return `Solo este cobro, distinto al resto: ${when}`;
}

export type EnabledChannels = { email: boolean; whatsapp: boolean };

/** Deja solo los medios que la empresa tiene asignados. El vacío sigue significando “el de la sucursal”. */
function narrowChannel(channel: string, enabled: EnabledChannels) {
  const value = channel.trim().toLowerCase();
  if (value === "") return "";
  if (value === "none") return "none";
  if (value === "email") return enabled.email ? "email" : "none";
  if (value === "whatsapp") return enabled.whatsapp ? "whatsapp" : "none";
  if (enabled.email && enabled.whatsapp) return "all";
  if (enabled.whatsapp) return "whatsapp";
  if (enabled.email) return "email";
  return "none";
}

/** Por dónde sale el aviso. El canal vacío hereda el de la sucursal. */
export function describeChargeChannel(channel: string, clientChannel?: string, clientName?: string, enabled?: EnabledChannels) {
  const allow = enabled ?? { email: true, whatsapp: true };
  const chosen = narrowChannel(channel, allow);
  if (!chosen) {
    const key = narrowChannel(clientChannel?.trim() ? clientChannel : "all", allow);
    if (!clientName) {
      return "Se avisa por el medio que tenga guardada la sucursal. Elige una arriba para ver cuál es.";
    }
    if (key === "none") {
      return `${clientName} tiene los avisos automáticos apagados.`;
    }
    return `Se avisa a ${clientName} por ${mediumPhrase(key || "all")}, que es lo que tiene guardado.`;
  }
  return `Se avisa por ${mediumPhrase(chosen)}.`;
}

/** Opciones de medio de los avisos de un cobro; la vacía usa el configurado en la sucursal. */
export function reminderChannelOptions(clientChannel?: string, enabled?: EnabledChannels) {
  const allow = enabled ?? { email: true, whatsapp: true };
  const key = narrowChannel(clientChannel?.trim() ? clientChannel : "all", allow);
  const own = CHANNEL_LABELS[key];
  const options: { value: string; label: string }[] = [];
  if (key && key !== "none") {
    options.push({ value: "", label: own ? `Preferencia de la sucursal: ${own}` : "Preferencia de la sucursal" });
  }
  if (allow.email && allow.whatsapp) options.push({ value: "all", label: CHANNEL_LABELS.all });
  if (allow.whatsapp) options.push({ value: "whatsapp", label: allow.email ? CHANNEL_LABELS.whatsapp : "WhatsApp" });
  if (allow.email) options.push({ value: "email", label: allow.whatsapp ? CHANNEL_LABELS.email : "Correo" });
  return options;
}
