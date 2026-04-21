"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Receipt,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  TrendingUp,
  Eye,
  Download,
  Banknote,
  QrCode,
  CalendarDays,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { formatRupiah, type Transaction } from "@/lib/mock-data";
import { printReceipt } from "@/lib/print-receipt";

// ─── helpers ───────────────────────────────────────────────
function PaymentBadge({ method }: { method: "CASH" | "QRIS" }) {
  if (method === "QRIS") {
    return (
      <Badge className="bg-violet-500/15 text-violet-700 dark:text-violet-400 hover:bg-violet-500/20 border-0 text-xs px-2 py-0.5 gap-1">
        <QrCode className="h-3 w-3" />
        QRIS
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-0 text-xs px-2 py-0.5 gap-1">
      <Banknote className="h-3 w-3" />
      Tunai
    </Badge>
  );
}

// Parse "YYYY-MM-DD HH:MM:SS" as LOCAL date (no UTC shift)
function parseLocalDate(createdAt: string): Date {
  const s = createdAt.replace(" ", "T");
  // If no timezone info, treat as local
  return new Date(s.includes("Z") || s.includes("+") ? s : s);
}

function toLocalDateStr(d: Date) {
  return d.toLocaleDateString("sv-SE"); // "YYYY-MM-DD"
}

function todayStr() {
  return toLocalDateStr(new Date());
}

type FilterMethod = "Semua" | "CASH" | "QRIS";
type FilterStatus = "Semua" | "PAID" | "PENDING";
type DatePreset = "Semua" | "Hari ini" | "7 Hari" | "30 Hari" | "Custom";

export default function TransactionsPage() {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("Semua");
  const [filterMethod, setFilterMethod] = useState<FilterMethod>("Semua");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Date filter
  const [datePreset, setDatePreset] = useState<DatePreset>("Semua");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) setAllTransactions(await res.json());
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  // Compute date range from preset
  const activeDateRange = useMemo(() => {
    const today = todayStr();
    if (datePreset === "Hari ini") return { from: today, to: today };
    if (datePreset === "7 Hari") {
      const d = new Date(); d.setDate(d.getDate() - 6);
      return { from: toLocalDateStr(d), to: today };
    }
    if (datePreset === "30 Hari") {
      const d = new Date(); d.setDate(d.getDate() - 29);
      return { from: toLocalDateStr(d), to: today };
    }
    if (datePreset === "Custom") return { from: dateFrom, to: dateTo };
    return null; // "Semua"
  }, [datePreset, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    return allTransactions.filter((tx) => {
      const matchSearch = tx.id.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "Semua" || tx.status === filterStatus;
      const matchMethod = filterMethod === "Semua" || tx.paymentMethod === filterMethod;

      let matchDate = true;
      if (activeDateRange && (activeDateRange.from || activeDateRange.to)) {
        const txDate = toLocalDateStr(parseLocalDate(tx.createdAt));
        if (activeDateRange.from && txDate < activeDateRange.from) matchDate = false;
        if (activeDateRange.to   && txDate > activeDateRange.to)   matchDate = false;
      }

      return matchSearch && matchStatus && matchMethod && matchDate;
    });
  }, [allTransactions, search, filterStatus, filterMethod, activeDateRange]);

  const totalRevenue = filtered.reduce((a, t) => a + t.totalAmount, 0);
  const qrisCount   = filtered.filter((t) => t.paymentMethod === "QRIS").length;
  const cashCount   = filtered.filter((t) => t.paymentMethod === "CASH").length;

  function formatDateTime(createdAt: string) {
    try {
      const d = parseLocalDate(createdAt);
      const date = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
      const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      return { date, time };
    } catch {
      return { date: "-", time: createdAt };
    }
  }

  function formatTime(createdAt: string) {
    return formatDateTime(createdAt).time;
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
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Riwayat Transaksi</h1>
          <p className="mt-1 text-sm text-muted-foreground">Catatan semua penjualan dan status pembayaran</p>
        </div>
        <Button
          variant="outline"
          className="border-border/60 hover:bg-muted"
          onClick={() => alert("Fitur ekspor akan segera hadir")}
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Stats — 4 cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 flex-none">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Pendapatan</p>
              {loading
                ? <div className="h-5 w-24 rounded bg-muted animate-pulse mt-1" />
                : <p className="text-lg font-bold">{formatRupiah(totalRevenue)}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 flex-none">
              <Receipt className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Transaksi</p>
              {loading
                ? <div className="h-5 w-8 rounded bg-muted animate-pulse mt-1" />
                : <p className="text-lg font-bold">{filtered.length}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 flex-none">
              <Banknote className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Via Tunai</p>
              {loading
                ? <div className="h-5 w-16 rounded bg-muted animate-pulse mt-1" />
                : <p className="text-lg font-bold">{cashCount} transaksi</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 flex-none">
              <QrCode className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Via QRIS</p>
              {loading
                ? <div className="h-5 w-16 rounded bg-muted animate-pulse mt-1" />
                : <p className="text-lg font-bold">{qrisCount} transaksi</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground flex-none" />
        {(["Semua", "Hari ini", "7 Hari", "30 Hari", "Custom"] as DatePreset[]).map((p) => (
          <button
            key={p}
            onClick={() => handlePreset(p)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              datePreset === p
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {p}
          </button>
        ))}

        {/* Custom date inputs */}
        {showCustom && (
          <div className="flex items-center gap-2 ml-1">
            <input
              type="date"
              value={dateFrom}
              max={dateTo || todayStr()}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-7 rounded-lg border border-border/60 bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <span className="text-xs text-muted-foreground">–</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              max={todayStr()}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-7 rounded-lg border border-border/60 bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        )}

        {hasDateFilter && (
          <button
            onClick={clearDateFilter}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>

      {/* Table Card */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Semua Transaksi</CardTitle>
              <CardDescription className="text-sm">
                {loading ? "Memuat data..." : `${filtered.length} dari ${allTransactions.length} transaksi`}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="tx-search"
                  placeholder="Cari ID transaksi..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-8 text-sm bg-background/60 w-full sm:w-48"
                />
              </div>
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                  {(["Semua", "PAID", "PENDING"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200 ${
                        filterStatus === s
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      {s === "PAID" ? "Lunas" : s === "PENDING" ? "Pending" : s}
                    </button>
                  ))}
                </div>
                <div className="h-4 w-px bg-border/50" />
                <div className="flex items-center gap-1">
                  {(["Semua", "CASH", "QRIS"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setFilterMethod(m)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200 ${
                        filterMethod === m
                          ? m === "QRIS"
                            ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      {m === "CASH" ? "Tunai" : m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-sm font-medium h-9">ID Transaksi</TableHead>
                  <TableHead className="text-sm font-medium h-9">Tanggal</TableHead>
                  <TableHead className="text-sm font-medium h-9">Waktu</TableHead>
                  <TableHead className="text-sm font-medium text-right h-9">Item</TableHead>
                  <TableHead className="text-sm font-medium text-right h-9">Total</TableHead>
                  <TableHead className="text-sm font-medium text-center h-9">Metode</TableHead>
                  <TableHead className="text-sm font-medium text-center h-9">Status</TableHead>
                  <TableHead className="text-sm font-medium text-right h-9">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-border/30">
                      {Array.from({ length: 8 }).map((__, j) => (
                        <TableCell key={j} className="py-3">
                          <div className="h-4 rounded-md bg-muted animate-pulse"
                            style={{ width: j === 0 ? "120px" : j === 4 || j === 7 ? "70px" : "50px" }} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.map((tx) => {
                  const { date, time } = formatDateTime(tx.createdAt);
                  return (
                    <TableRow
                      key={tx.id}
                      className="border-border/30 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedTx(tx)}
                    >
                      <TableCell className="py-3">
                        <span className="text-sm font-mono font-semibold">{tx.id}</span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-sm text-muted-foreground">{date}</span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-sm text-muted-foreground">{time}</span>
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <span className="text-sm tabular-nums">{tx.itemCount} item</span>
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <span className="text-sm font-bold tabular-nums">{formatRupiah(tx.totalAmount)}</span>
                      </TableCell>
                      <TableCell className="text-center py-3">
                        <PaymentBadge method={tx.paymentMethod} />
                      </TableCell>
                      <TableCell className="text-center py-3">
                        {tx.status === "PAID" ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-0 text-xs px-2 py-0.5">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Lunas
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border-0 text-xs px-2 py-0.5">
                            <Clock className="mr-1 h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={(e) => { e.stopPropagation(); setSelectedTx(tx); }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                      <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      Tidak ada transaksi ditemukan
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-500" />
              Detail Transaksi
            </DialogTitle>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">ID Transaksi</p>
                  <p className="font-mono font-semibold">{selectedTx.id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Waktu</p>
                  <p className="font-medium">
                    {formatDateTime(selectedTx.createdAt).date}{" "}
                    {formatDateTime(selectedTx.createdAt).time}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Metode</p>
                  <PaymentBadge method={selectedTx.paymentMethod} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  {selectedTx.status === "PAID" ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-xs px-2 py-0.5">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Lunas
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-xs px-2 py-0.5">
                      Pending
                    </Badge>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Item yang dibeli</p>
                <div className="rounded-xl border border-border/50 divide-y divide-border/30 overflow-hidden">
                  {selectedTx.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between px-3 py-2.5 text-sm">
                      <span className="text-muted-foreground">
                        {item.name}{" "}
                        <span className="text-foreground font-medium">×{item.qty}</span>
                      </span>
                      <span className="font-medium tabular-nums">{formatRupiah(item.price * item.qty)}</span>
                    </div>
                  )) ?? (
                    <div className="px-3 py-2.5 text-sm text-muted-foreground">Detail item tidak tersedia</div>
                  )}
                </div>
              </div>

              {/* Total + cash breakdown */}
              <div className="rounded-xl bg-muted/40 border border-border/40 px-4 py-3 space-y-1.5 text-sm">
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{formatRupiah(selectedTx.totalAmount)}</span>
                </div>
                {selectedTx.paymentMethod === "CASH" && selectedTx.cashAmount != null && (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tunai</span>
                      <span>{formatRupiah(selectedTx.cashAmount)}</span>
                    </div>
                    <Separator className="my-1" />
                    <div className="flex justify-between font-semibold text-emerald-600 dark:text-emerald-400">
                      <span>Kembalian</span>
                      <span>{formatRupiah(selectedTx.cashAmount - selectedTx.totalAmount)}</span>
                    </div>
                  </>
                )}
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  if (selectedTx.items) {
                    const isCash = selectedTx.paymentMethod === "CASH";
                    const cashPaid = selectedTx.cashAmount ?? undefined;
                    const changeAmt = isCash && cashPaid !== undefined
                      ? cashPaid - selectedTx.totalAmount
                      : undefined;
                    printReceipt({
                      id: selectedTx.id,
                      time: formatTime(selectedTx.createdAt),
                      items: selectedTx.items,
                      total: selectedTx.totalAmount,
                      cash: isCash ? cashPaid : undefined,
                      change: isCash ? changeAmt : undefined,
                      paymentMethod: isCash ? "Tunai" : "QRIS",
                    });
                  }
                }}
              >
                <Receipt className="mr-2 h-4 w-4" />
                Cetak Ulang Struk
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
