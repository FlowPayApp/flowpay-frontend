import { ChevronLeft, ChevronRight } from "lucide-react";
import AppSelect from "./AppSelect";

const DEFAULT_PAGE_SIZES = [10, 20, 50, 100];

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
};

export default function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
}: Props) {
  if (total <= 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, total);

  const single = totalPages === 1;
  const navButton =
    "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border text-sm font-medium text-ink hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-3";

  return (
    <div className="flex items-center justify-between gap-3 border-t border-surface-border px-4 py-3">
      <p className="text-sm text-ink-muted">
        {single && (
          <span className="sm:hidden">
            <span className="font-medium tabular-nums text-ink">{total}</span> {total === 1 ? "resultado" : "resultados"}
          </span>
        )}
        <span className={single ? "hidden sm:inline" : ""}>
          <span className="font-medium tabular-nums text-ink">
            {start}–{end}
          </span>{" "}
          de <span className="font-medium tabular-nums text-ink">{total}</span>
        </span>
      </p>
      <div className="flex items-center gap-4">
        <label className="hidden items-center gap-2 text-sm text-ink-muted sm:flex">
          Filas
          <AppSelect
            compact
            className="w-[4.75rem]"
            value={String(pageSize)}
            onChange={(next) => onPageSizeChange(Number(next))}
            options={pageSizeOptions.map((n) => ({ value: String(n), label: String(n) }))}
          />
        </label>
        <div className={`items-center gap-1.5 sm:flex sm:gap-2 ${single ? "hidden" : "flex"}`}>
          <button
            type="button"
            aria-label="Página anterior"
            className={navButton}
            disabled={current <= 1}
            onClick={() => onPageChange(current - 1)}
          >
            <ChevronLeft className="h-4 w-4 sm:hidden" strokeWidth={2} />
            <span className="hidden sm:inline">Anterior</span>
          </button>
          <span className="min-w-[3rem] shrink-0 text-center text-sm tabular-nums text-ink-muted">
            {current} / {totalPages}
          </span>
          <button
            type="button"
            aria-label="Página siguiente"
            className={navButton}
            disabled={current >= totalPages}
            onClick={() => onPageChange(current + 1)}
          >
            <ChevronRight className="h-4 w-4 sm:hidden" strokeWidth={2} />
            <span className="hidden sm:inline">Siguiente</span>
          </button>
        </div>
      </div>
    </div>
  );
}
