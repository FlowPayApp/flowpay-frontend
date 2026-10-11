import type { ReminderPolicy } from "../api";

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

const CHANNEL_LABELS: Record<string, string> = {
  all: "WhatsApp y correo",
  whatsapp: "Solo WhatsApp",
  email: "Solo correo",
  none: "Sin recordatorios",
};

/** Opciones de canal de los automáticos de un cobro; la vacía usa el de la sucursal. */
export function reminderChannelOptions(clientChannel?: string) {
  const own = CHANNEL_LABELS[clientChannel?.trim().toLowerCase() || "all"] ?? CHANNEL_LABELS.all;
  return [
    { value: "", label: `Como la sucursal (${own.toLowerCase()})` },
    { value: "all", label: CHANNEL_LABELS.all },
    { value: "whatsapp", label: CHANNEL_LABELS.whatsapp },
    { value: "email", label: CHANNEL_LABELS.email },
  ];
}
