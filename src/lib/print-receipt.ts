import { formatRupiah } from "./mock-data";

const SETTINGS_KEY = "ngasir_settings";

function getStoreName(): string {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return "Toko Pak Ahmad";
    const parsed = JSON.parse(raw);
    return parsed.storeName || "Toko Pak Ahmad";
  } catch {
    return "Toko Pak Ahmad";
  }
}

function getOwnerName(): string {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return parsed.ownerName || "";
  } catch {
    return "";
  }
}

export interface ReceiptData {
  id: string;
  time: string;
  date?: string; // optional; defaults to today
  items: Array<{ name: string; qty: number; price: number }>;
  total: number;
  cash?: number;   // only available from POS live flow
  change?: number; // only available from POS live flow
  paymentMethod?: string;
}

export function printReceipt(data: ReceiptData) {
  const now = new Date();
  const dateStr =
    data.date ??
    now.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td class="item-name">${item.name}</td>
        <td class="item-total">${formatRupiah(item.price * item.qty)}</td>
      </tr>
      <tr>
        <td class="item-sub">${item.qty} &times; ${formatRupiah(item.price)}</td>
        <td></td>
      </tr>`
    )
    .join("");

  const cashRows =
    data.cash !== undefined && data.change !== undefined
      ? `
      <tr class="summary-row">
        <td>Tunai</td>
        <td class="r">${formatRupiah(data.cash)}</td>
      </tr>
      <tr class="change-row">
        <td>Kembalian</td>
        <td class="r">${formatRupiah(data.change)}</td>
      </tr>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Struk ${data.id}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      width: 302px;
      margin: 0 auto;
      padding: 18px 14px 24px;
      color: #111;
      background: #fff;
    }

    /* Header */
    .header { text-align: center; margin-bottom: 10px; }
    .store-name { font-size: 18px; font-weight: bold; letter-spacing: 1.5px; }
    .store-sub  { font-size: 12px; color: #444; margin-top: 3px; }
    .store-date { font-size: 11px; color: #666; margin-top: 2px; }

    /* Transaction ID block */
    .tx-block { text-align: center; margin: 8px 0 10px; }
    .tx-lbl { font-size: 11px; color: #888; }
    .tx-val { font-size: 14px; font-weight: bold; letter-spacing: 0.5px; }

    /* Dividers */
    .dash  { border: none; border-top: 1px dashed #bbb; margin: 8px 0; }
    .solid { border: none; border-top: 2px solid #111; margin: 8px 0; }

    /* Items table */
    table { width: 100%; border-collapse: collapse; }
    .item-name {
      font-weight: 700;
      font-size: 13px;
      padding: 5px 0 1px;
      width: 65%;
    }
    .item-sub {
      font-size: 11px;
      color: #666;
      padding: 0 0 5px;
    }
    .item-total {
      font-weight: 600;
      font-size: 13px;
      text-align: right;
      vertical-align: top;
      padding: 5px 0 1px;
      width: 35%;
      white-space: nowrap;
    }

    /* Summary table */
    .total-row td {
      font-size: 15px;
      font-weight: bold;
      padding: 7px 0 5px;
    }
    .r { text-align: right; white-space: nowrap; }
    .summary-row td {
      font-size: 12px;
      color: #555;
      padding: 2px 0;
    }
    .change-row td {
      font-size: 13px;
      font-weight: bold;
      color: #1a7a4a;
      padding: 4px 0 2px;
    }

    /* Footer */
    .footer {
      text-align: center;
      margin-top: 14px;
    }
    .footer .method  { font-size: 11px; color: #888; margin-bottom: 5px; }
    .footer .thanks  { font-size: 12px; font-weight: bold; }
    .footer .powered { font-size: 10px; color: #bbb; margin-top: 5px; }

    @media print {
      body { padding: 8px; width: 80mm; }
      @page { margin: 0; size: 80mm auto; }
    }
  </style>
</head>
<body>

  <div class="header">
    <div class="store-name">NGASIR POS</div>
    <div class="store-sub">${getStoreName()}</div>
    ${getOwnerName() ? `<div class="store-sub" style="margin-top:1px">${getOwnerName()}</div>` : ""}
    <div class="store-date">${dateStr} &middot; ${data.time}</div>
  </div>

  <hr class="dash" />

  <div class="tx-block">
    <div class="tx-lbl">No. Transaksi</div>
    <div class="tx-val">${data.id}</div>
  </div>

  <hr class="dash" />

  <table>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <hr class="solid" />

  <table>
    <tbody>
      <tr class="total-row">
        <td>TOTAL</td>
        <td class="r">${formatRupiah(data.total)}</td>
      </tr>
      ${cashRows}
    </tbody>
  </table>

  <hr class="dash" />

  <div class="footer">
    <div class="method">Metode: ${data.paymentMethod ?? "Tunai"}</div>
    <div class="thanks">Terima kasih telah berbelanja! 🙏</div>
    <div class="powered">Powered by Ngasir POS</div>
  </div>

</body>
</html>`;

  const popup = window.open("", "_blank", "width=380,height=650,scrollbars=yes");
  if (!popup) {
    alert("Popup diblokir. Izinkan popup di browser Anda untuk mencetak struk.");
    return;
  }
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  setTimeout(() => popup.print(), 300);
}
