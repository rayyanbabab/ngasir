"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Package,
  ArrowRight,
  AlertTriangle,
  Clock,
  Banknote,
  QrCode,
  Loader2,
  Receipt,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  formatRupiah,
  formatCompact,
  type DashboardStats,
  type HourlySales,
  type DailyTrend,
  type Product,
  type Transaction,
} from "@/lib/mock-data";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

// Custom tooltip for charts
function CustomBarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-md">
        <p className="text-[11px] font-medium text-zinc-500">{label}</p>
        <p className="text-xs font-bold text-zinc-900 tabular-nums">
          {formatRupiah(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
}

function CustomAreaTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-md">
        <p className="text-[11px] font-medium text-zinc-500">{label}</p>
        <p className="text-xs font-bold text-zinc-900 tabular-nums">
          {formatRupiah(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
}

// Payment Method Badge
function PaymentBadge({ method }: { method: "CASH" | "QRIS" }) {
  if (method === "QRIS") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700">
        <QrCode className="h-3 w-3" />
        QRIS
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
      <Banknote className="h-3 w-3" />
      Tunai
    </span>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  change,
  icon: Icon,
}: {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
}) {
  const isPositive = change > 0;
  const isZero = change === 0;

  return (
    <Card className="border border-zinc-200/80 bg-white shadow-sm transition-all hover:border-zinc-300">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            {title}
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>

        <p className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 tabular-nums mb-2.5">
          {value}
        </p>

        <div className="flex items-center gap-1.5">
          {isZero ? (
            <span className="inline-flex items-center rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
              0%
            </span>
          ) : isPositive ? (
            <span className="inline-flex items-center gap-0.5 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
              <TrendingUp className="h-2.5 w-2.5" />
              +{change}%
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
              <TrendingDown className="h-2.5 w-2.5" />
              {change}%
            </span>
          )}
          <span className="text-[11px] text-zinc-400">vs hari kemarin</span>
        </div>
      </CardContent>
    </Card>
  );
}

interface DashboardData {
  stats: DashboardStats;
  hourlySalesData: HourlySales[];
  monthlyTrendData: DailyTrend[];
  lowStockProducts: Product[];
  recentTransactions: Transaction[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const fetchDashboard = useCallback(async (isMounted = true) => {
    setLoading(true);
    setError(null);
    try {
      const threshold = (() => {
        try {
          const raw = localStorage.getItem("ngasir_settings");
          return raw ? (JSON.parse(raw).lowStockThreshold ?? "10") : "10";
        } catch {
          return "10";
        }
      })();
      const res = await fetch(`/api/dashboard?lowStockThreshold=${threshold}`);
      if (res.status === 401) {
        await authClient.signOut().catch(() => {});
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const message = errJson.error || "Gagal memuat data dashboard";
        if (isMounted) {
          setError(message);
        }
        return;
      }
      const json = await res.json();
      if (isMounted) {
        setData(json);
      }
    } catch (err) {
      if (isMounted) {
        setError(
          err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data"
        );
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchDashboard(active);
    return () => {
      active = false;
    };
  }, [fetchDashboard]);

  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? "Selamat Pagi"
      : now.getHours() < 17
        ? "Selamat Siang"
        : "Selamat Malam";

  const todayDate = now.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold text-zinc-900">
            {error || "Gagal memuat data dashboard"}
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Silakan coba muat ulang halaman
          </p>
        </div>
        <Button
          onClick={() => fetchDashboard()}
          className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs h-8 px-3"
          size="sm"
        >
          Coba Lagi
        </Button>
      </div>
    );
  }

  const {
    stats,
    hourlySalesData,
    monthlyTrendData,
    lowStockProducts,
    recentTransactions,
  } = data;

  function formatTime(createdAt: string) {
    if (/^\d{2}:\d{2}$/.test(createdAt)) return createdAt;
    try {
      const d = new Date(createdAt.replace(" ", "T") + "Z");
      return d.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return createdAt;
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-1 border-b border-zinc-200/70">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-zinc-900 sm:text-xl">
              {greeting}
            </h1>
            <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded font-medium border border-zinc-200">
              Terminal POS
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">{todayDate}</p>
        </div>

        <Link href="/pos">
          <Button className="h-9 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors">
            <ShoppingBag className="mr-1.5 h-3.5 w-3.5" />
            Buka Kasir Transaksi
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Penjualan Hari Ini"
          value={formatRupiah(stats.todaySales)}
          change={stats.todaySalesChange}
          icon={Banknote}
        />
        <StatCard
          title="Total Transaksi"
          value={`${stats.todayTransactions} order`}
          change={stats.todayTransactionsChange}
          icon={Receipt}
        />
        <StatCard
          title="Rata-rata Order"
          value={formatRupiah(stats.averageOrderValue)}
          change={stats.averageOrderChange}
          icon={TrendingUp}
        />
        <StatCard
          title="Produk Terjual"
          value={`${stats.productsSold} unit`}
          change={stats.productsSoldChange}
          icon={Package}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Hourly Sales Bar Chart */}
        <Card className="border border-zinc-200/80 bg-white shadow-sm">
          <CardHeader className="pb-3 border-b border-zinc-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-zinc-900">
                  Arus Penjualan Hari Ini
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  Distribusi omset per jam operasional
                </CardDescription>
              </div>
              <span className="flex items-center gap-1.5 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Live Feed
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[230px] w-full overflow-hidden">
              {!mounted ? null : hourlySalesData.some((d) => d.sales > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlySalesData} barCategoryGap="20%">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="hour"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      tickFormatter={(v) => formatCompact(v)}
                    />
                    <Tooltip
                      content={<CustomBarTooltip />}
                      cursor={{ fill: "rgba(0,0,0,0.03)", radius: 4 }}
                    />
                    <Bar
                      dataKey="sales"
                      fill="#047857"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={36}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center text-zinc-400">
                  <Receipt className="h-8 w-8 mb-1.5 opacity-30" />
                  <p className="text-xs font-medium text-zinc-600">
                    Belum ada transaksi tercatat hari ini
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Transaksi dari menu kasir akan muncul di sini secara real-time
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trend Area Chart */}
        <Card className="border border-zinc-200/80 bg-white shadow-sm">
          <CardHeader className="pb-3 border-b border-zinc-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-zinc-900">
                  Tren Penjualan 30 Hari
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  Pergerakan omset harian toko
                </CardDescription>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-medium text-zinc-500">
                  Total Periode:
                </span>
                <span className="text-xs font-bold text-zinc-900 ml-1 tabular-nums">
                  {formatRupiah(monthlyTrendData.reduce((acc, d) => acc + d.sales, 0))}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[230px] w-full overflow-hidden">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrendData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      interval={5}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      tickFormatter={(v) => formatCompact(v)}
                    />
                    <Tooltip content={<CustomAreaTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="#0f766e"
                      strokeWidth={2}
                      fillOpacity={0.12}
                      fill="#0f766e"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Low Stock Alert & Recent Transactions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Low Stock Alert */}
        <Card className="border border-zinc-200/80 bg-white shadow-sm flex flex-col">
          <CardHeader className="pb-3 border-b border-zinc-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-50 text-amber-700 border border-amber-200/60">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-zinc-900">
                    Peringatan Stok Produk
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500">
                    Stok di bawah batas minimum
                  </CardDescription>
                </div>
              </div>

              <Link href="/inventory">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-zinc-500 hover:text-zinc-900"
                >
                  Kelola Stok
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>

          <CardContent className="p-0 flex-1">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-zinc-100 bg-zinc-50/50">
                  <TableHead className="text-xs font-semibold text-zinc-500 h-8">
                    Nama Produk
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 text-right h-8">
                    Sisa Stok
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 text-right h-8">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockProducts.map((product) => (
                  <TableRow
                    key={product.id}
                    className="border-b border-zinc-100 hover:bg-zinc-50/60"
                  >
                    <TableCell className="py-2.5">
                      <div>
                        <p className="text-xs font-medium text-zinc-900 leading-tight">
                          {product.name}
                        </p>
                        <p className="text-[11px] text-zinc-400">
                          {product.category}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-2.5">
                      <span className="text-xs font-bold text-zinc-900 tabular-nums font-mono">
                        {product.stock}
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-2.5">
                      {product.stock <= 3 ? (
                        <span className="inline-block rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                          Kritis
                        </span>
                      ) : (
                        <span className="inline-block rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          Rendah
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}

                {lowStockProducts.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center py-8 text-zinc-400 text-xs"
                    >
                      Semua stok produk saat ini dalam batas aman.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="border border-zinc-200/80 bg-white shadow-sm flex flex-col">
          <CardHeader className="pb-3 border-b border-zinc-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-zinc-900">
                    Transaksi Terakhir
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500">
                    Pesanan yang baru diselesaikan
                  </CardDescription>
                </div>
              </div>

              <Link href="/transactions">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-zinc-500 hover:text-zinc-900"
                >
                  Semua Riwayat
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>

          <CardContent className="p-0 flex-1">
            <div className="divide-y divide-zinc-100">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 hover:bg-zinc-50/60 transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-medium text-zinc-900 truncate">
                        {tx.id}
                      </span>
                      <PaymentBadge method={tx.paymentMethod} />
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {formatTime(tx.createdAt)} · {tx.itemCount} barang
                    </p>
                  </div>

                  <div className="text-right flex-none">
                    <p className="text-xs font-bold text-zinc-900 tabular-nums font-mono">
                      {formatRupiah(tx.totalAmount)}
                    </p>
                    <span className="text-[10px] text-emerald-700 font-medium">
                      Lunas
                    </span>
                  </div>
                </div>
              ))}

              {recentTransactions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center text-zinc-400">
                  <Receipt className="h-8 w-8 mb-1.5 opacity-30" />
                  <p className="text-xs font-medium text-zinc-600">
                    Belum ada riwayat transaksi
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Transaksi yang selesai akan tercatat otomatis
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
