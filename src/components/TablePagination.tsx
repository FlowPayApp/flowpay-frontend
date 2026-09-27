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

  return (
    <div className="flex flex-col gap-3 border-t border-surface-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-ink-muted">
        <span className="font-medium tabular-nums text-ink">
          {start}–{end}
        </span>{" "}
        de <span className="font-medium tabular-nums text-ink">{total}</span>
      </p>
      <div className="flex flex-col gap-2 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between sm:justify-end sm:gap-4">
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          Filas
          <AppSelect
            compact
            className="w-[4.75rem]"
            value={String(pageSize)}
            onChange={(next) => onPageSizeChange(Number(next))}
            options={pageSizeOptions.map((n) => ({ value: String(n), label: String(n) }))}
          />
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-surface-border px-3 text-sm font-medium text-ink hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
            disabled={current <= 1}
            onClick={() => onPageChange(current - 1)}
          >
            Anterior
          </button>
          <span className="shrink-0 px-1 text-center text-sm tabular-nums text-ink-muted">
            {current} / {totalPages}
          </span>
          <button
            type="button"
            className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-surface-border px-3 text-sm font-medium text-ink hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
            disabled={current >= totalPages}
            onClick={() => onPageChange(current + 1)}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
