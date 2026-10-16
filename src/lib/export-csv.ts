import { type Transaction } from "@/lib/mock-data";

/**
 * Exports transaction list to Excel-compatible CSV file.
 * Includes UTF-8 BOM to prevent character distortion in Microsoft Excel.
 */
export function exportTransactionsToCSV(
  transactions: Transaction[],
  filenamePrefix = "laporan-transaksi-ngasir"
) {
  if (!transactions || transactions.length === 0) {
    alert("Tidak ada data transaksi untuk diekspor.");
    return;
  }

  const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

  function formatDateTimeWIB(createdAt: string) {
    try {
      const utcDate = new Date(createdAt.replace(" ", "T") + "Z");
      const wibDate = new Date(utcDate.getTime() + WIB_OFFSET_MS);
      const pad = (n: number) => String(n).padStart(2, "0");
      const d = `${wibDate.getUTCFullYear()}-${pad(wibDate.getUTCMonth() + 1)}-${pad(wibDate.getUTCDate())}`;
      const t = `${pad(wibDate.getUTCHours())}:${pad(wibDate.getUTCMinutes())}:${pad(wibDate.getUTCSeconds())}`;
      return { date: d, time: t };
    } catch {
      return { date: createdAt, time: "" };
    }
  }

  // Header columns
  const headers = [
    "No. Transaksi (ID)",
    "Tanggal (WIB)",
    "Jam (WIB)",
    "Metode Pembayaran",
    "Status",
    "Jumlah Item",
    "Total Belanja (Rp)",
    "Uang Diterima (Rp)",
    "Kembalian (Rp)",
    "Rincian Produk",
  ];

  function escapeCSV(val: string | number | null | undefined): string {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  }

  const rows: string[] = [];
  rows.push(headers.map(escapeCSV).join(","));

  for (const tx of transactions) {
    const { date, time } = formatDateTimeWIB(tx.createdAt);

    let itemsSummary = "";
    if (tx.items && tx.items.length > 0) {
      itemsSummary = tx.items
        .map((it) => `${it.name} (${it.qty}x @Rp ${it.price.toLocaleString("id-ID")})`)
        .join("; ");
    } else {
      itemsSummary = `${tx.itemCount} item`;
    }

    const cashAmount = tx.cashAmount != null ? tx.cashAmount : "";
    const changeAmount =
      tx.cashAmount != null && tx.cashAmount >= tx.totalAmount
        ? tx.cashAmount - tx.totalAmount
        : "";

    const row = [
      escapeCSV(tx.id),
      escapeCSV(date),
      escapeCSV(time),
      escapeCSV(tx.paymentMethod === "CASH" ? "Tunai" : "QRIS"),
      escapeCSV(tx.status),
      escapeCSV(tx.itemCount),
      escapeCSV(tx.totalAmount),
      escapeCSV(cashAmount),
      escapeCSV(changeAmount),
      escapeCSV(itemsSummary),
    ];

    rows.push(row.join(","));
  }

  // Prepend UTF-8 Byte Order Mark (BOM) so Excel opens UTF-8 without garbled characters
  const csvContent = "\uFEFF" + rows.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const fullFilename = `${filenamePrefix}-${dateStr}.csv`;

  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", fullFilename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
