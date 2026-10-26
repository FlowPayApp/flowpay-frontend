/** Coincide con el backend: cabeceras permitidas y obligatorias. */
export const FIXED_DISTRIBUTOR_HEADERS = [
  "CODIGO",
  "SUCURSAL",
  "NOMBRE",
  "DIRECCION",
  "TELEFONO",
] as const;

/** Opcional en cabecera (planillas viejas sin EMAIL siguen válidas). */
export const OPTIONAL_DISTRIBUTOR_HEADERS = ["EMAIL"] as const;

/** Columna de método de pago en plantilla nueva; CPAGO es alias admitido en archivos antiguos. */
export const PAYMENT_HEADER_PRIMARY = "MPAGO";

const PAYMENT_ALIASES = ["MPAGO", "CPAGO"] as const;

const ALLOWED = new Set<string>([
  ...FIXED_DISTRIBUTOR_HEADERS,
  ...OPTIONAL_DISTRIBUTOR_HEADERS,
  ...PAYMENT_ALIASES,
]);

const MAX_DATA_ROWS = 10000;

function normHeader(s: string): string {
  return s.trim().replace(/\s+/g, " ").toUpperCase();
}

function cellToString(v: unknown): string {
  if (v == null || v === "") return "";
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return "";
    const day = String(v.getDate()).padStart(2, "0");
    const month = String(v.getMonth() + 1).padStart(2, "0");
    return `${day}-${month}-${v.getFullYear()}`;
  }
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  return String(v).trim();
}

/** Valida la primera fila como cabecera (mismas reglas que el API). */
export function validateDistributorHeaderRow(headerCells: unknown[]): void {
  const idx = new Map<string, number>();
  let nonEmpty = 0;
  for (let i = 0; i < headerCells.length; i++) {
    const raw = headerCells[i];
    const key = normHeader(cellToString(raw));
    if (!key) continue;
    nonEmpty++;
    if (!ALLOWED.has(key)) {
      throw new Error(
        `Columna no permitida "${cellToString(raw)}". Solo se admiten: CODIGO, SUCURSAL, NOMBRE, DIRECCION, TELEFONO, EMAIL (opcional), MPAGO o CPAGO en archivos antiguos.`,
      );
    }
    if (idx.has(key)) {
      throw new Error(`La columna "${key}" está repetida en la cabecera.`);
    }
    idx.set(key, i);
  }
  const maxCols = 7;
  if (nonEmpty > maxCols) {
    throw new Error(`Demasiadas columnas en la cabecera (máximo ${maxCols}).`);
  }
  for (const need of FIXED_DISTRIBUTOR_HEADERS) {
    if (!idx.has(need)) {
      throw new Error(`Falta la columna obligatoria "${need}" en la primera fila.`);
    }
  }
  const hasMP = idx.has("MPAGO");
  const hasCP = idx.has("CPAGO");
  if (!hasMP && !hasCP) {
    throw new Error('Falta la columna MPAGO (método de pago); en archivos antiguos puede llamarse CPAGO.');
  }
  if (hasMP && hasCP) {
    throw new Error("No puede haber columnas MPAGO y CPAGO a la vez; deja solo MPAGO.");
  }
}

/**
 * Lee solo la primera hoja del libro, filas como texto.
 * Valida cabecera y número máximo de filas de datos.
 * No usa SheetJS: esa librería tiene avisos altos sin parche.
 */
export async function parseClientImportExcel(file: File): Promise<string[][]> {
  if (!isExcelImportFile(file)) {
    throw new Error(EXCEL_IMPORT_ERROR);
  }
  const { readSheet } = await import("read-excel-file/browser");
  let matrix: unknown[][];
  try {
    matrix = (await readSheet(file)) as unknown[][];
  } catch {
    throw new Error("No se pudo leer el archivo Excel.");
  }

  const rows = matrix
    .map((row) => (Array.isArray(row) ? row.map((cell) => cellToString(cell)) : []))
    .filter((row) => row.some((cell) => cell !== ""));

  if (rows.length === 0) {
    throw new Error("La primera hoja está vacía.");
  }

  validateDistributorHeaderRow(rows[0]);

  const dataRows = rows.length - 1;
  if (dataRows > MAX_DATA_ROWS) {
    throw new Error(`Demasiadas filas de datos (máximo ${MAX_DATA_ROWS}).`);
  }

  return rows;
}

/** Primera fila de la plantilla descargada (una columna por campo). */
export function distributorTemplateHeaderRow(): string[] {
  return [...FIXED_DISTRIBUTOR_HEADERS, "EMAIL", PAYMENT_HEADER_PRIMARY];
}

export const EXCEL_IMPORT_ERROR =
  "Solo se admiten archivos .xlsx. Si tienes un .xls, ábrelo y guárdalo como Libro de Excel (.xlsx).";

/** Descarga plantilla .xlsx con la primera hoja "Clientes" y una fila de ejemplo. */
export async function downloadClientImportTemplateXlsx(): Promise<void> {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const headerRow = distributorTemplateHeaderRow();
  const example = [
    "06185041",
    "CM",
    "IRIS CATALINA DEL CARMEN GARRIDO HERRERA",
    "CALLE 1 N°2300 VILLA LOS HUERTOS, RAUQUEN",
    "",
    "",
    "CONTADO",
  ];
  const asText = (value: string) => ({ type: String, value });
  const book = await writeXlsxFile([headerRow.map(asText), example.map(asText)], {
    sheet: "Clientes",
  });
  await book.toFile("geldflus-clientes-plantilla.xlsx");
}

export function isExcelImportFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".xlsx");
}
