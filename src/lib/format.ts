export function formatMoney(n: number | undefined | null, currency = "CLP") {
  if (n == null || Number.isNaN(Number(n))) {
    return "—";
  }
  try {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${n.toFixed(0)}`;
  }
}

export function formatDate(iso: string | undefined | null) {
  if (iso == null || typeof iso !== "string" || iso.length < 8) {
    return "—";
  }
  const day = iso.slice(0, 10);
  const [y, m, d] = day.split("-").map((x) => Number(x));
  if (!y || !m || !d) return "—";
  return new Date(y, m - 1, d).toLocaleDateString("es-CL", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
