"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Receipt,
  Search,
  TrendingUp,
  Eye,
  Download,
  Banknote,
  QrCode,
  CalendarDays,
  X,
  Printer,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRupiah, type Transaction } from "@/lib/mock-data";
import { authClient } from "@/lib/auth-client";
import { printReceipt } from "@/lib/print-receipt";
import { exportTransactionsToCSV } from "@/lib/export-csv";

// Payment Method Badge
function PaymentBadge({ method }: { method: "CASH" | "QRIS" }) {
  if (method === "QRIS") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700">
        <QrCode className="h-3 w-3" />
        QRIS
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
      <Banknote className="h-3 w-3" />
      Tunai
    </span>
  );
}

function parseUTCDate(createdAt: string): Date {
  return new Date(createdAt.replace(" ", "T") + "Z");
}

function toWIBDateStr(d: Date): string {
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return wib.toISOString().slice(0, 10);
}

function todayWIBStr(): string {
  return toWIBDateStr(new Date());
}

type FilterMethod = "Semua" | "CASH" | "QRIS";
type DatePreset = "Semua" | "Hari ini" | "7 Hari" | "30 Hari" | "Custom";

export default function TransactionsPage() {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState<FilterMethod>("Semua");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Date filter
  const [datePreset, setDatePreset] = useState<DatePreset>("Semua");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      if (res.status === 401) {
        await authClient.signOut().catch(() => {});
        window.location.href = "/login";
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setAllTransactions(data);
      }
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/orders")
      .then(async (res) => {
        if (res.status === 401) {
          await authClient.signOut().catch(() => {});
          window.location.href = "/login";
          return;
        }
        if (res.ok && active) {
          const data = await res.json();
          setAllTransactions(data);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch transactions:", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const activeDateRange = useMemo(() => {
    const today = todayWIBStr();
    if (datePreset === "Hari ini") return { from: today, to: today };
    if (datePreset === "7 Hari") {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return { from: toWIBDateStr(d), to: today };
    }
    if (datePreset === "30 Hari") {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      return { from: toWIBDateStr(d), to: today };
    }
    if (datePreset === "Custom") return { from: dateFrom, to: dateTo };
    return null;
  }, [datePreset, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    return allTransactions.filter((tx) => {
      const matchSearch = tx.id.toLowerCase().includes(search.toLowerCase());
      const matchMethod = filterMethod === "Semua" || tx.paymentMethod === filterMethod;

      let matchDate = true;
      if (activeDateRange && (activeDateRange.from || activeDateRange.to)) {
        const txDate = toWIBDateStr(parseUTCDate(tx.createdAt));
        if (activeDateRange.from && txDate < activeDateRange.from) matchDate = false;
        if (activeDateRange.to && txDate > activeDateRange.to) matchDate = false;
      }

      return matchSearch && matchMethod && matchDate;
    });
  }, [allTransactions, search, filterMethod, activeDateRange]);

  const totalRevenue = filtered.reduce((a, t) => a + t.totalAmount, 0);
  const qrisCount = filtered.filter((t) => t.paymentMethod === "QRIS").length;
  const cashCount = filtered.filter((t) => t.paymentMethod === "CASH").length;

  function formatDateTime(createdAt: string) {
    try {
      const utcDate = parseUTCDate(createdAt);
      const wibDate = new Date(utcDate.getTime() + 7 * 60 * 60 * 1000);
      const date = wibDate.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        timeZone: "UTC",
      });
      const hh = String(wibDate.getUTCHours()).padStart(2, "0");
      const mm = String(wibDate.getUTCMinutes()).padStart(2, "0");
      return { date, time: `${hh}:${mm}` };
    } catch {
      return { date: "-", time: createdAt };
    }
  }

  function handlePreset(p: DatePreset) {
    setDatePreset(p);
    if (p === "Custom") {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      setDateFrom("");
      setDateTo("");
    }
  }

  function clearDateFilter() {
    setDatePreset("Semua");
    setDateFrom("");
    setDateTo("");
    setShowCustom(false);
  }

  const hasDateFilter = datePreset !== "Semua";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-1 border-b border-zinc-200/70">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-zinc-900 sm:text-xl">
            Riwayat Penjualan & Transaksi
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Daftar pesanan terselesaikan, metode pembayaran, dan cetak ulang struk
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-medium shadow-sm"
            onClick={() => fetchTransactions()}
            disabled={loading}
            title="Segarkan Data Transaksi"
          >
            <RotateCcw className={`mr-1.5 h-3.5 w-3.5 text-zinc-500 ${loading ? "animate-spin" : ""}`} />
            Segarkan
          </Button>
          <Button
            variant="outline"
            className="h-9 px-3.5 border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-800 text-xs font-semibold shadow-sm"
            onClick={() => setShowExportDialog(true)}
          >
            <Download className="mr-1.5 h-3.5 w-3.5 text-zinc-600" />
            Export Laporan CSV
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border border-zinc-200/80 bg-white shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Omset Terpilih
              </span>
              <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-50 text-emerald-700">
                <TrendingUp className="h-3 w-3" />
              </div>
            </div>
            <p className="text-base sm:text-lg font-bold font-mono tracking-tight text-zinc-900 tabular-nums mt-1.5 truncate">
              {formatRupiah(totalRevenue)}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200/80 bg-white shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Total Transaksi
              </span>
              <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-100 text-zinc-700">
                <Receipt className="h-3 w-3" />
              </div>
            </div>
            <p className="text-xl font-bold font-mono tracking-tight text-zinc-900 tabular-nums mt-1.5">
              {filtered.length} <span className="text-xs font-normal text-zinc-500">order</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200/80 bg-white shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Tunai (Cash)
              </span>
              <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-50 text-emerald-700">
                <Banknote className="h-3 w-3" />
              </div>
            </div>
            <p className="text-xl font-bold font-mono tracking-tight text-emerald-800 tabular-nums mt-1.5">
              {cashCount} <span className="text-xs font-normal text-zinc-500">order</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200/80 bg-white shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                QRIS Digital
              </span>
              <div className="flex h-6 w-6 items-center justify-center rounded bg-purple-50 text-purple-700">
                <QrCode className="h-3 w-3" />
              </div>
            </div>
            <p className="text-xl font-bold font-mono tracking-tight text-purple-800 tabular-nums mt-1.5">
              {qrisCount} <span className="text-xs font-normal text-zinc-500">order</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Date Filter Bar */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white p-2 rounded-xl border border-zinc-200/80 shadow-sm">
        <div className="flex items-center gap-1.5 px-2 text-zinc-400">
          <CalendarDays className="h-3.5 w-3.5" />
          <span className="text-xs font-medium text-zinc-500">Rentang:</span>
        </div>

        <div className="flex items-center gap-1">
          {(["Semua", "Hari ini", "7 Hari", "30 Hari", "Custom"] as DatePreset[]).map((p) => (
            <button
              key={p}
              onClick={() => handlePreset(p)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                datePreset === p
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "bg-transparent text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {showCustom && (
          <div className="flex items-center gap-1.5 ml-2">
            <input
              type="date"
              value={dateFrom}
              max={dateTo || todayWIBStr()}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-7 rounded-md border border-zinc-300 bg-white px-2 text-xs text-zinc-800"
            />
            <span className="text-xs text-zinc-400">–</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              max={todayWIBStr()}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-7 rounded-md border border-zinc-300 bg-white px-2 text-xs text-zinc-800"
            />
          </div>
        )}

        {hasDateFilter && (
          <button
            onClick={clearDateFilter}
            className="flex items-center gap-1 ml-auto text-xs text-zinc-400 hover:text-zinc-700 px-2 py-1"
          >
            <X className="h-3 w-3" />
            Reset Filter
          </button>
        )}
      </div>

      {/* Table Card */}
      <Card className="border border-zinc-200/80 bg-white shadow-sm">
        <CardHeader className="pb-3 border-b border-zinc-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-zinc-900">
                Log Transaksi Penjualan
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                {filtered.length} dari {allTransactions.length} transaksi
              </CardDescription>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <Input
                  id="tx-search"
                  placeholder="Cari nomor ID transaksi..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-zinc-50 border-zinc-200 w-full sm:w-48"
                />
              </div>

              {/* Status and Method Filters */}
              <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg">
                {(["Semua", "CASH", "QRIS"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setFilterMethod(m)}
                    className={`rounded-md px-2 py-1 text-[11px] font-medium transition-all ${
                      filterMethod === m
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    {m === "CASH" ? "Tunai" : m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-zinc-100 bg-zinc-50/50">
                  <TableHead className="text-xs font-semibold text-zinc-500 h-8">No. Transaksi</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 h-8">Tanggal</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 h-8">Waktu</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 text-right h-8">Jumlah Item</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 text-right h-8">Total Nilai</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 text-center h-8">Metode</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 text-center h-8">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 text-right h-8 pr-4">Detail</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i} className="border-b border-zinc-100">
                      {Array.from({ length: 8 }).map((__, j) => (
                        <TableCell key={j} className="py-2.5">
                          <div className="h-4 rounded bg-zinc-100 animate-pulse w-16" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.map((tx) => {
                  const { date, time } = formatDateTime(tx.createdAt);
                  return (
                    <TableRow
                      key={tx.id}
                      className="border-b border-zinc-100 hover:bg-zinc-50/60 transition-colors cursor-pointer"
                      onClick={() => setSelectedTx(tx)}
                    >
                      <TableCell className="py-2.5">
                        <span className="text-xs font-mono font-medium text-zinc-900">
                          {tx.id}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <span className="text-xs text-zinc-600">{date}</span>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <span className="text-xs text-zinc-500 font-mono">{time}</span>
                      </TableCell>
                      <TableCell className="text-right py-2.5">
                        <span className="text-xs font-mono tabular-nums text-zinc-700">
                          {tx.itemCount} pcs
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-2.5">
                        <span className="text-xs font-bold font-mono tabular-nums text-zinc-900">
                          {formatRupiah(tx.totalAmount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-2.5">
                        <PaymentBadge method={tx.paymentMethod} />
                      </TableCell>
                      <TableCell className="text-center py-2.5">
                        <span className="inline-block rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                          Lunas
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-2.5 pr-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-zinc-400 hover:text-zinc-900"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTx(tx);
                          }}
                          title="Lihat Struk"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-zinc-400 text-xs">
                      <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      Tidak ada data transaksi yang ditemukan
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Struk Modal */}
      <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        <DialogContent className="max-w-sm p-5">
          <DialogHeader className="pb-2 border-b border-zinc-100">
            <DialogTitle className="flex items-center gap-2 text-sm font-bold text-zinc-900">
              <Receipt className="h-4 w-4 text-zinc-700" />
              Detail Struk Penjualan
            </DialogTitle>
          </DialogHeader>

          {selectedTx && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase">ID Transaksi</p>
                  <p className="font-mono font-medium text-zinc-900 mt-0.5">{selectedTx.id}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase">Waktu Bayar</p>
                  <p className="font-medium text-zinc-800 mt-0.5">
                    {formatDateTime(selectedTx.createdAt).date}{" "}
                    {formatDateTime(selectedTx.createdAt).time}
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase">Daftar Barang</p>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 divide-y divide-zinc-200/70 overflow-hidden text-xs">
                  {selectedTx.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between px-3 py-2">
                      <span className="text-zinc-700 truncate pr-2">
                        {item.name} <span className="text-zinc-400 font-mono">×{item.qty}</span>
                      </span>
                      <span className="font-mono font-semibold text-zinc-900 tabular-nums">
                        {formatRupiah(item.price * item.qty)}
                      </span>
                    </div>
                  )) ?? (
                    <div className="px-3 py-2 text-zinc-400">Data rincian tidak tersedia</div>
                  )}
                </div>
              </div>

              {/* Amount Breakdown */}
              <div className="rounded-lg border border-zinc-200 bg-white p-3 space-y-1.5 text-xs">
                <div className="flex justify-between font-bold text-zinc-900">
                  <span>Total Transaksi</span>
                  <span className="font-mono">{formatRupiah(selectedTx.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Metode Pembayaran</span>
                  <PaymentBadge method={selectedTx.paymentMethod} />
                </div>
                {selectedTx.paymentMethod === "CASH" && selectedTx.cashAmount != null && (
                  <>
                    <div className="flex justify-between text-zinc-500">
                      <span>Uang Diterima</span>
                      <span className="font-mono">{formatRupiah(selectedTx.cashAmount)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-800 font-bold pt-1 border-t border-dashed border-zinc-200">
                      <span>Kembalian</span>
                      <span className="font-mono">
                        {formatRupiah(selectedTx.cashAmount - selectedTx.totalAmount)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <Button
                className="w-full h-9 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg"
                onClick={() => {
                  if (selectedTx.items) {
                    const isCash = selectedTx.paymentMethod === "CASH";
                    const cashPaid = selectedTx.cashAmount ?? undefined;
                    const changeAmt =
                      isCash && cashPaid !== undefined
                        ? cashPaid - selectedTx.totalAmount
                        : undefined;
                    printReceipt({
                      id: selectedTx.id,
                      time: formatDateTime(selectedTx.createdAt).time,
                      items: selectedTx.items,
                      total: selectedTx.totalAmount,
                      cash: isCash ? cashPaid : undefined,
                      change: isCash ? changeAmt : undefined,
                      paymentMethod: isCash ? "Tunai" : "QRIS",
                    });
                  }
                }}
              >
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                Cetak Struk Transaksi
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Export CSV Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-md p-5">
          <DialogHeader className="pb-2 border-b border-zinc-100">
            <DialogTitle className="text-sm font-bold text-zinc-900">
              Export Laporan Transaksi
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 mt-0.5">
              Simpan laporan dalam format CSV (Microsoft Excel & Google Sheets)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-500">
                <span>Filter aktif:</span>
                <span className="font-semibold text-zinc-800">{datePreset}</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Total pesanan:</span>
                <span className="font-semibold text-zinc-800">{filtered.length} transaksi</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Total omset:</span>
                <span className="font-bold font-mono text-zinc-900">
                  {formatRupiah(totalRevenue)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                className="w-full h-9 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg"
                onClick={() => {
                  exportTransactionsToCSV(
                    filtered,
                    `laporan-transaksi-${datePreset.toLowerCase().replace(/\s+/g, "-")}`
                  );
                  setShowExportDialog(false);
                }}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download Data Terfilter ({filtered.length} Transaksi)
              </Button>

              {hasDateFilter && (
                <Button
                  variant="outline"
                  className="w-full h-9 text-xs border-zinc-200"
                  onClick={() => {
                    exportTransactionsToCSV(allTransactions, "laporan-transaksi-semua");
                    setShowExportDialog(false);
                  }}
                >
                  Download Seluruh Data ({allTransactions.length} Transaksi)
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
