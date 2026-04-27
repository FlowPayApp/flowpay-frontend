export function StatusBadge({ status }: { status: "pending" | "paid" | "overdue" | string | undefined }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: {
      label: "Pendiente",
      className: "bg-amber-50 text-amber-800 ring-1 ring-amber-200/70",
    },
    paid: {
      label: "Cobrado",
      className: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/70",
    },
    overdue: {
      label: "Vencido",
      className: "bg-rose-50 text-rose-800 ring-1 ring-rose-200/70",
    },
  };
  const m = status && map[status] ? map[status] : map.pending;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${m.className}`}>
      {m.label}
    </span>
  );
}

export function RiskBadge({ level }: { level: "low" | "medium" | "high" }) {
  const map = {
    low: "bg-slate-100 text-slate-700 ring-slate-200/80",
    medium: "bg-amber-50 text-amber-900 ring-amber-200/80",
    high: "bg-rose-50 text-rose-900 ring-rose-200/80",
  };
  const label =
    level === "high" ? "Alta prioridad" : level === "medium" ? "Media" : "Baja";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${map[level]}`}
    >
      Riesgo: {label}
    </span>
  );
}

export function AttentionTag({ kind }: { kind: "due_soon" | "overdue" | "auto" }) {
  if (kind === "overdue") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-rose-800 ring-1 ring-rose-200">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        Vencido — acción necesaria
      </span>
    );
  }
  if (kind === "due_soon") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-800 ring-1 ring-indigo-200">
        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
        Recordatorio automático activo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200">
      Seguimiento automático
    </span>
  );
}
