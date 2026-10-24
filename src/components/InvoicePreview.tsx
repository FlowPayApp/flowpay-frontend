import { invoiceFilename, invoiceIsImage, invoiceIsPdf } from "../lib/invoiceFile";

type Props = {
  token: string;
  ext?: string | null;
};

export default function InvoicePreview({ token, ext }: Props) {
  const url = `/api/public/attachments/${token}`;
  const isImage = invoiceIsImage(ext);
  const isPdf = invoiceIsPdf(ext);

  if (!isImage && !isPdf) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{invoiceFilename(ext)}</p>
          <p className="text-xs text-ink-muted">Este formato se abre descargándolo.</p>
        </div>
        <a href={`${url}?download=1`} download={invoiceFilename(ext)} className="text-sm font-medium text-brand hover:underline">
          Descargar factura
        </a>
      </div>
    );
  }

  return (
    <div>
      {isImage ? (
        <img
          key={token}
          src={url}
          alt="Factura"
          className="max-h-96 w-full rounded-xl border border-surface-border bg-white object-contain"
        />
      ) : (
        <iframe key={token} title="Factura" src={url} className="h-96 w-full rounded-xl border border-surface-border bg-white" />
      )}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex text-sm font-medium text-brand hover:underline"
      >
        Abrir factura
      </a>
    </div>
  );
}
