type Props = {
  token: string;
  ext?: string | null;
};

export default function InvoicePreview({ token, ext }: Props) {
  const url = `/api/public/attachments/${token}`;
  const kind = (ext ?? "").toLowerCase();
  const isImage = kind === "png" || kind === "jpg" || kind === "jpeg";

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
