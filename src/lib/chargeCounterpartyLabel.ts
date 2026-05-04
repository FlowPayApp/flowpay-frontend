/**
 * Etiqueta del deudor en cobros: solo sucursal (alineado al backend).
 */
export function chargeCounterpartyLabel(c: { branch_name?: string | null }): string {
  const bn = (c.branch_name ?? "").trim();
  return bn || "Sin sucursal";
}
