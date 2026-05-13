export function StatusBadge({ status }: { status: "pending" | "paid" | "overdue" | string | undefined }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: {
      label: "Pendiente",
      className:
        "bg-amber-50 text-amber-800 ring-1 ring-amber-200/70 dark:bg-amber-950/45 dark:text-amber-200 dark:ring-amber-500/25",
    },
    paid: {
      label: "Cobrado",
      className:
        "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/70 dark:bg-emerald-950/45 dark:text-emerald-200 dark:ring-emerald-500/25",
    },
    overdue: {
      label: "Vencido",
      className:
        "bg-rose-50 text-rose-800 ring-1 ring-rose-200/70 dark:bg-rose-950/45 dark:text-rose-200 dark:ring-rose-500/25",
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
    low: "bg-slate-100 text-slate-700 ring-slate-200/80 dark:bg-slate-800/75 dark:text-slate-200 dark:ring-slate-500/35",
    medium:
      "bg-amber-50 text-amber-900 ring-amber-200/80 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-500/30",
    high: "bg-rose-50 text-rose-900 ring-rose-200/80 dark:bg-rose-950/50 dark:text-rose-200 dark:ring-rose-500/30",
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
      <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/45 dark:text-rose-200 dark:ring-rose-500/30">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500 dark:bg-rose-400" />
        Vencido — acción necesaria
      </span>
    );
  }
  if (kind === "due_soon") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-800 ring-1 ring-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-200 dark:ring-indigo-500/30">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500 dark:bg-indigo-400" />
        Recordatorio automático activo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800/70 dark:text-slate-200 dark:ring-slate-500/35">
      Seguimiento automático
    </span>
  );
}
