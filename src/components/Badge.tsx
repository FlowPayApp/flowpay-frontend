const chip = "inline-flex h-6 shrink-0 items-center justify-center rounded-full px-2.5 text-xs font-medium leading-none";
const statusChip =
  "inline-flex h-7 shrink-0 items-center justify-center rounded-full px-3 text-xs font-semibold leading-none text-white";

export function StatusBadge({ status }: { status: "pending" | "paid" | "overdue" | string | undefined }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: "Pendiente", className: "bg-[rgb(122_84_32)]" },
    paid: { label: "Cobrado", className: "bg-[rgb(15_110_107)]" },
    overdue: { label: "Vencido", className: "bg-[rgb(142_58_46)]" },
  };
  const m = status && map[status] ? map[status] : map.pending;
  return <span className={`${statusChip} ${m.className}`}>{m.label}</span>;
}

export function RiskBadge({ level, compact = false }: { level: "low" | "medium" | "high"; compact?: boolean }) {
  const map = {
    low: "bg-surface text-ink-muted",
    medium: "bg-warn-soft text-warn",
    high: "bg-danger-soft text-danger",
  };
  const short = level === "high" ? "Alta" : level === "medium" ? "Media" : "Bajo";
  return (
    <span className={`${chip} ${map[level]}`}>
      {compact ? short : `Riesgo ${short === "Alta" ? "alto" : short.toLowerCase()}`}
    </span>
  );
}

export function AttentionTag({ kind }: { kind: "due_soon" | "overdue" | "auto" }) {
  if (kind === "overdue") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2.5 py-1 text-[11px] font-semibold text-danger">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
        Vencido
      </span>
    );
  }
  if (kind === "due_soon") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2.5 py-1 text-[11px] font-semibold text-warn">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
        Por vencer
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
      Seguimiento
    </span>
  );
}
