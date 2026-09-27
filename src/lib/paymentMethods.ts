/** Valores de MPAGO al crear o editar un cliente. El valor guardado coincide con la plantilla de importación. */
export const PAYMENT_METHODS = [
  { value: "CONTADO", label: "Contado" },
  { value: "CREDITO", label: "Crédito" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
] as const;

export function paymentMethodLabel(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  return PAYMENT_METHODS.find((m) => m.value === raw)?.label ?? raw;
}
