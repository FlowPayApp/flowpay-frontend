/** Factura del cobro: PDF, foto, Excel u otro documento habitual. Máximo 8 MB. */
export const INVOICE_MAX_BYTES = 8 * 1024 * 1024;

const INVOICE_EXTS = ["pdf", "png", "jpg", "jpeg", "webp", "gif", "heic", "heif", "xls", "xlsx", "csv", "doc", "docx"];

export const INVOICE_ACCEPT = [
  ".pdf,.png,.jpg,.jpeg,.webp,.gif,.heic,.heif,.xls,.xlsx,.csv,.doc,.docx",
  "application/pdf,image/png,image/jpeg,image/webp,image/gif,image/heic,image/heif",
  "application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
].join(",");

const IMAGE_EXTS = ["png", "jpg", "jpeg", "webp", "gif"];

export function invoiceExt(nameOrExt?: string | null) {
  const raw = (nameOrExt ?? "").trim().toLowerCase();
  if (!raw) return "";
  const base = raw.split(/[/\\]/).pop() ?? raw;
  const dot = base.lastIndexOf(".");
  return (dot >= 0 ? base.slice(dot + 1) : base).replace(/[^a-z0-9]/g, "");
}

export function invoiceFileProblem(file: File) {
  const ext = invoiceExt(file.name);
  if (!INVOICE_EXTS.includes(ext)) {
    return "Adjunta un PDF, una foto (JPG, PNG o WEBP), un Excel (XLS o XLSX) o un documento Word o CSV.";
  }
  if (file.size > INVOICE_MAX_BYTES) return "El archivo puede pesar hasta 8 MB.";
  return null;
}

export function invoiceIsImage(ext?: string | null) {
  return IMAGE_EXTS.includes(invoiceExt(ext));
}

export function invoiceIsPdf(ext?: string | null) {
  return invoiceExt(ext) === "pdf";
}

export function invoiceFilename(ext?: string | null) {
  const kind = invoiceExt(ext);
  return `factura.${kind && INVOICE_EXTS.includes(kind) ? kind : "pdf"}`;
}

export function invoiceFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
