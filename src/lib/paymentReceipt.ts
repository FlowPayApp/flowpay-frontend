import { formatMoney } from "./format";

export type PaymentReceiptData = {
  companyName: string;
  clientLabel: string;
  amount: number;
  authorizationCode?: string;
  buyOrder?: string;
  paidAt: Date;
  paymentMethod?: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatReceiptDateTime(d: Date): string {
  return d.toLocaleString("es-CL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** HTML autocontenido para imprimir o guardar como comprobante. */
export function buildPaymentReceiptHtml(data: PaymentReceiptData): string {
  const company = escapeHtml(data.companyName || "Empresa");
  const client = escapeHtml(data.clientLabel || "Cliente");
  const amount = escapeHtml(formatMoney(data.amount));
  const when = escapeHtml(formatReceiptDateTime(data.paidAt));
  const method = escapeHtml(data.paymentMethod ?? "Webpay Plus (Transbank)");
  const auth = data.authorizationCode ? escapeHtml(data.authorizationCode) : "";
  const order = data.buyOrder ? escapeHtml(data.buyOrder) : "";
  const receiptId = order || auth || "—";

  const detailRows = [
    ["Fecha y hora", when],
    ["Empresa", company],
    ["Sucursal / cliente", client],
    ["Medio de pago", method],
    ...(auth ? [["Código de autorización", auth] as const] : []),
    ...(order ? [["Orden de compra", order] as const] : []),
  ]
    .map(
      ([label, value]) => `
        <tr>
          <th>${label}</th>
          <td>${value}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Comprobante de pago — ${receiptId}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 48px 40px;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      line-height: 1.5;
    }
    .sheet {
      max-width: 520px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
    }
    .head {
      padding: 28px 32px 20px;
      border-bottom: 3px solid #4f46e5;
      background: linear-gradient(180deg, #fafbff 0%, #fff 100%);
    }
    .brand {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #6366f1;
    }
    h1 {
      margin: 8px 0 0;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .subtitle {
      margin: 6px 0 0;
      font-size: 13px;
      color: #64748b;
    }
    .amount-block {
      padding: 28px 32px;
      text-align: center;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }
    .amount-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #64748b;
    }
    .amount {
      margin-top: 8px;
      font-size: 36px;
      font-weight: 700;
      letter-spacing: -0.03em;
      color: #0f172a;
    }
    .status {
      display: inline-block;
      margin-top: 12px;
      padding: 4px 12px;
      font-size: 12px;
      font-weight: 600;
      color: #047857;
      background: #ecfdf5;
      border-radius: 999px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th, td {
      padding: 12px 32px;
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid #f1f5f9;
    }
    th {
      width: 42%;
      font-weight: 600;
      color: #64748b;
    }
    td {
      font-weight: 500;
      color: #0f172a;
      word-break: break-word;
    }
    tr:last-child th, tr:last-child td { border-bottom: none; }
    .foot {
      padding: 20px 32px 28px;
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.6;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { box-shadow: none; border: none; max-width: none; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <div class="brand">FlowPay</div>
      <h1>Comprobante de pago</h1>
      <p class="subtitle">Documento de respaldo de transacción electrónica</p>
    </div>
    <div class="amount-block">
      <p class="amount-label">Monto pagado</p>
      <p class="amount">${amount}</p>
      <span class="status">Pago autorizado</span>
    </div>
    <table>
      <tbody>${detailRows}</tbody>
    </table>
    <div class="foot">
      Este comprobante acredita que la transacción fue autorizada por el procesador de pagos.
      Para consultas sobre el detalle de cobros, contacte directamente a la empresa indicada.
      Documento generado electrónicamente — no requiere firma.
    </div>
  </div>
</body>
</html>`;
}

export function downloadPaymentReceipt(data: PaymentReceiptData): void {
  const html = buildPaymentReceiptHtml(data);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const slug = (data.buyOrder ?? data.authorizationCode ?? "pago").replace(/[^\w.-]+/g, "_");
  const a = document.createElement("a");
  a.href = url;
  a.download = `comprobante-pago-${slug}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printPaymentReceipt(data: PaymentReceiptData): void {
  const html = buildPaymentReceiptHtml(data);
  const win = window.open("", "_blank", "noopener,noreferrer,width=640,height=800");
  if (!win) {
    downloadPaymentReceipt(data);
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  win.onload = () => {
    win.print();
  };
}
